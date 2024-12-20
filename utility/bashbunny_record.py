import csv
import time
from pynput import keyboard

# List to store keystroke data
keystroke_data = []
previous_release_time = None

# Callback function for key press
def on_press(key):
    try:
        vk_code = key.vk
        press_time = time.time()
        keystroke_data.append({'VK': vk_code, 'press_time': press_time, 'release_time': None})
    except AttributeError:
        pass

# Callback function for key release
def on_release(key):
    global previous_release_time

    try:
        vk_code = key.vk
        release_time = time.time()

        # Find the corresponding press event
        for event in reversed(keystroke_data):
            if event['VK'] == vk_code and event['release_time'] is None:
                event['release_time'] = release_time
                break

        if previous_release_time is not None:
            flight_time = (release_time - previous_release_time) * 1000  # Convert to ms
            flight_time = -1 if flight_time > 1500 else flight_time
        else:
            flight_time = -1

        hold_time = (release_time - event['press_time']) * 1000  # Convert to ms

        # Add data to the final list
        keystroke_data.append({'VK': vk_code, 'HT': int(hold_time), 'FT': int(flight_time)})

        previous_release_time = release_time

    except AttributeError:
        pass

# Timer-based stop
STOP_TIME = 300  # Seconds

def stop_listener_after_delay():
    time.sleep(STOP_TIME)
    print(f"Listening stopped after {STOP_TIME} seconds.")

    # Write data to CSV after stopping
    with open('keystroke_data.csv', mode='w', newline='') as file:
        writer = csv.DictWriter(file, fieldnames=['VK', 'HT', 'FT'])
        writer.writeheader()
        for event in keystroke_data:
            if 'HT' in event and 'FT' in event:
                writer.writerow(event)

    print("Keystroke data saved to keystroke_data1.csv.")

# Start listener
import threading
stop_thread = threading.Thread(target=stop_listener_after_delay)
stop_thread.start()

with keyboard.Listener(on_press=on_press, on_release=on_release) as listener:
    try:
        print("Listening for keystrokes. Stopping automatically after timer.")
        listener.join()
    except KeyboardInterrupt:
        listener.stop()