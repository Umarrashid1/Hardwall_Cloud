import subprocess
import json
import websockets
import asyncio
import re
import subprocess
import time

# Function to run udevadm monitor to listen for USB device connections
def monitor_usb_device():
    # Start udevadm process to monitor USB devices
    proc = subprocess.Popen(
        ['udevadm', 'monitor', '--subsystem-match=usb', '--property'],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE
    )

    while True:
        try:
            outs = proc.stdout.readline()
            if outs:
                outstr = outs.decode('utf-8')
                print(outstr)
                # Check if the device is connected
                if 'DRIVER' in outstr:
                    print("USB connected")
                    device_id = extract_device_id(outstr)
                    if device_id:
                        print(f"Device ID: {device_id}")
                        # Get device details and send to backend
                        device_info = get_device_info(device_id)
                        asyncio.run(connect_to_backend(device_info))
                    proc.terminate()  # Stop monitoring once the device is processed
                    print("monitor terminate")
                    break
        except KeyboardInterrupt:
            print('USB monitoring stopped\n', KeyboardInterrupt)
            proc.terminate()
            break

# Extract the device ID (vendor_id:product_id) from udevadm monitor output
def extract_device_id(udevadm_output):
    devid = re.search(r'(?<=PRODUCT=)(\w+/\w+)', udevadm_output)
    if devid:
        id_parts = str(devid.group(0)).split('/')
        vendor_id = id_parts[0].zfill(4)
        product_id = id_parts[1].zfill(4)
        return f"{vendor_id}:{product_id}"
    return None

# Get detailed information of the device using lsusb -v
def get_device_info(device_id):
    lsusb_proc = subprocess.run(['lsusb', '-v', '-d', device_id], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if lsusb_proc.returncode != 0:
        print(f"Error running lsusb -v: {lsusb_proc.stderr.decode()}")
        return None

    lsusb_out = lsusb_proc.stdout.decode()
    device_info = parse_lsusb_info(lsusb_out, device_id)
    return device_info

# Parse lsusb -v output to extract device information
def parse_lsusb_info(lsusb_output, device_id):
    devices = []
    lines = lsusb_output.splitlines()
    device_info = {'device_id': device_id}

    for line in lines:
        if 'ID ' + device_id in line:
            # Extract the device description and other details
            parts = line.split('  ')
            device_info['description'] = parts[1] if len(parts) > 1 else 'Unknown'
            break

    return device_info

# Connect to the backend server to send device information
async def connect_to_backend(device_info):
    uri = "ws://130.225.37.50:3000"
    async with websockets.connect(uri) as websocket:
        print("Connected to backend")

        # Convert the device info to JSON
        device_info_str = json.dumps(device_info)

        # Send device info to the backend for analysis
        await websocket.send(device_info_str)
        print(f"Sent device info: {device_info_str}")

        # Wait for the server's response
        response = await websocket.recv()
        print(f"Server response: {response}")

        # Handle the backend response (allow or block)
        if response == "allow":
            allow_device(device_info)
        else:
            block_device(device_info)

# Block the USB device using USBGuard
def block_device(device_info):
    vendor_id = device_info.get('device_id').split(':')[0]
    product_id = device_info.get('device_id').split(':')[1]
    print(f"Blocking device: Vendor ID = {vendor_id}, Product ID = {product_id}")
    subprocess.run(["usbguard", "block", f"{vendor_id}:{product_id}"])

# Allow the USB device using USBGuard
def allow_device(device_info):
    vendor_id = device_info.get('device_id').split(':')[0]
    product_id = device_info.get('device_id').split(':')[1]
    print(f"Allowing device: Vendor ID = {vendor_id}, Product ID = {product_id}")
    subprocess.run(["usbguard", "allow", f"{vendor_id}:{product_id}"])

# Main function to monitor USB devices
def monitor_usb_devices():
    monitor_usb_device()  # Start monitoring for USB devices

# Start monitoring USB devices
if __name__ == "__main__":
    monitor_usb_devices()