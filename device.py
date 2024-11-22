import os
import subprocess
import pyudev
import asyncio
import websockets
import json
import paramiko
import time
from scp import SCPClient

BACKEND_URI = "ws://130.225.37.50:3000"
HEADERS = {"x-device-type": "Pi"}
MOUNT_POINT = "/mnt/usb"
SERVER_IP = "130.225.37.50"
SSH_PORT = 22
SSH_USERNAME = "ubuntu"
KEY_FILE_PATH = "/home/guest/hardwall_device/cloud.key"
REMOTE_DIR = "/home/ubuntu/box"


def get_device_info(device):
    """Get detailed USB device information."""
    try:
        device_id = f"{device.get('ID_VENDOR_ID')}:{device.get('ID_MODEL_ID')}"
        print(f"Detected device with ID: {device_id}")

        # Run lsusb for detailed information
        result = subprocess.run(['lsusb', '-v', '-d', device_id], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if result.returncode == 0:
            return {
                "type": "deviceInfo",
                "lsusb_output": result.stdout.decode(),
                "is_storage": "Mass Storage" in result.stdout.decode()
            }
        else:
            print(f"lsusb failed for device {device_id}: {result.stderr.decode()}")
            return {
                "type": "deviceInfo",
                "lsusb_output": "Error retrieving lsusb data.",
                "is_storage": False
            }

    except Exception as e:
        print(f"Error processing device {device.device_node}: {e}")
        return None



def get_block_device_from_device_node(device_node):
    """Find and return the block device associated with the given USB device node."""
    context = pyudev.Context()
    try:
        device = pyudev.Devices.from_device_file(context, device_node)
        print(f"Looking for block device related to: {device_node}")
        for _ in range(10):
            for dev in context.list_devices(subsystem='block'):
                if device in dev.ancestors:
                    print(f"Found block device: {dev.device_node}")
                    return dev.device_node
            time.sleep(0.5)
    except Exception as e:
        print(f"Error finding block device: {e}")
    print("No block device found.")
    return None


def mount_usb_device(device_node):
    """Mount the USB device."""
    os.makedirs(MOUNT_POINT, exist_ok=True)
    try:
        block_device = get_block_device_from_device_node(device_node)
        if not block_device:
            return None

        # Check for partitions
        partition = None
        for part in os.listdir('/dev'):
            if part.startswith(os.path.basename(block_device)) and part != os.path.basename(block_device):
                partition = f"/dev/{part}"
                break
        partition = partition or block_device

        subprocess.run(["sudo", "mount", partition, MOUNT_POINT], check=True)
        print(f"Mounted {partition} at {MOUNT_POINT}")
        return MOUNT_POINT
    except subprocess.CalledProcessError as e:
        print(f"Failed to mount device: {e}")
        return None


def gather_files(mount_point):
    """Collect all files in the mounted directory."""
    files = []
    for root, _, filenames in os.walk(mount_point):
        for filename in filenames:
            files.append(os.path.join(root, filename))
    return files


async def transfer_files_with_confirmation(file_list, websocket, event_queue):
    """Transfer files to the backend via SCP and wait for validation."""
    try:
        # Transfer files using SCP
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(SERVER_IP, port=SSH_PORT, username=SSH_USERNAME, key_filename=KEY_FILE_PATH)
        print(f"Connected to {SERVER_IP} via SSH.")
        with SCPClient(ssh.get_transport()) as scp:
            for file in file_list:
                scp.put(file, REMOTE_DIR)
                print(f"Transferred {file} to {REMOTE_DIR}")
        ssh.close()

        # Notify backend about transferred files
        file_list_payload = [{"path": file} for file in file_list]
        await websocket.send(json.dumps({"type": "fileList", "files": file_list_payload}))
        print("Sent file list to backend for validation.")

        # Wait for validation response from the event queue
        try:
            validation_result = await asyncio.wait_for(event_queue.get(), timeout=30)
            if validation_result.get("action") == "fileReceived" and validation_result.get("status") == "success":
                print("File validation successful.")
                return True
            else:
                print("File validation failed.")
                return False
        except asyncio.TimeoutError:
            print("Timeout waiting for backend validation response.")
            return False

    except Exception as e:
        print(f"Error during file transfer or validation: {e}")
        return False


def unmount_device(mount_point):
    """Unmount the USB device."""
    try:
        subprocess.run(["sudo", "umount", mount_point], check=True)
        print(f"Unmounted {mount_point}")
    except subprocess.CalledProcessError as e:
        print(f"Failed to unmount {mount_point}: {e}")


async def monitor_usb_devices(websocket, event_queue):
    """Monitor USB devices asynchronously and send info to the backend."""
    context = pyudev.Context()
    monitor = pyudev.Monitor.from_netlink(context)
    monitor.filter_by('usb')

    print("Monitoring USB devices...")

    def sync_monitor():
        """Synchronous USB monitoring to be run in a separate thread."""
        for device in iter(monitor.poll, None):
            if device.action == 'add':
                return device  # Return the device when added

    while True:
        device = await asyncio.to_thread(sync_monitor)
        if not device:
            continue

        print(f"Device added: {device.device_node}")
        device_info = get_device_info(device)

        if not device_info:
            print(f"Skipping device {device.device_node} due to missing info.")
            continue

        # Send device info to the backend
        try:
            await websocket.send(json.dumps(device_info))
            print(f"Sent device info to backend: {device_info}")
        except websockets.exceptions.ConnectionClosed:
            print("WebSocket connection closed. Cannot send device info.")
            break

        # Mount and process storage devices
        if device_info.get("is_storage"):
            mount_point = mount_usb_device(device.device_node)
            if not mount_point:
                continue

            file_list = gather_files(mount_point)
            success = await transfer_files_with_confirmation(file_list, websocket, event_queue)
            if success:
                print("Files transferred and validated. Proceeding with unmount.")
            else:
                print("File transfer failed.")
            unmount_device(mount_point)



async def reconnect():
    """Handle reconnection to the backend."""
    while True:
        try:
            async with websockets.connect(BACKEND_URI, extra_headers=HEADERS) as websocket:
                print("Connected to backend.")

                # Coroutine to handle backend messages
                async def handle_backend_commands(websocket, event_queue):
                    """Handle backend commands and confirm the USB state."""
                    while True:
                        try:
                            message = await websocket.recv()
                            print(f"Received message from backend: {message}")
                            command = json.loads(message)

                            # Pass validation results to the event queue
                            if command.get("action") == "fileReceived":
                                await event_queue.put(command)
                                continue

                            # Handle other backend commands
                            if command.get("action") == "block":
                                print("Received block command from backend.")
                                status_update = {"type": "usbStatus", "status": "blocked"}
                                await websocket.send(json.dumps(status_update))

                            elif command.get("action") == "allow":
                                print("Received allow command from backend.")
                                status_update = {"type": "usbStatus", "status": "allowed"}
                                await websocket.send(json.dumps(status_update))

                            elif command.get("action") == "rebuild":
                                print("Received restart command from backend.")
                                # do some subprocess stuff
                                # subprocess.run(["sudo", "nixos-rebuild", "switch"], check=True)
                                # Can be done from the cloud through a nixos container(maybe?):
                                # nixos-rebuild --target-host user@example.com --use-remote-sudo switch

                        except websockets.exceptions.ConnectionClosed:
                            print("WebSocket connection closed during command handling.")
                            break
                        except json.JSONDecodeError:
                            print("Received invalid JSON from backend.")

                # Run USB monitoring and backend commands concurrently
                event_queue = asyncio.Queue()
                await asyncio.gather(
                    handle_backend_commands(websocket, event_queue),
                    monitor_usb_devices(websocket, event_queue)
                )
        except (websockets.exceptions.ConnectionClosed, ConnectionRefusedError) as e:
            print(f"Connection to backend lost: {e}. Retrying in 5 seconds...")
            await asyncio.sleep(5)
        except Exception as e:
            print(f"Unexpected error during reconnection: {e}. Retrying in 5 seconds...")
            await asyncio.sleep(5)


if __name__ == "__main__":
    asyncio.run(reconnect())
