const fs = require("fs");
const { spawnSync } = require("child_process");
const WebSocket = require("ws");

const KEYPRESS_DETECTION_SCRIPT = "../malware_predict/keypress_AI/predict.py"

const MAX_RESULTS = 10;



function parseKeypressData(keypressData) {
    const HID_KEYCODES = {
        "4": 65,  // A
        "5": 66,  // B
        "6": 67,  // C
        "7": 68,  // D
        "8": 69,  // E
        "9": 70,  // F
        "a": 71, // G
        "b": 72, // H
        "c": 73, // I
        "d": 74, // J
        "e": 75, // K
        "f": 76, // L
        "10": 77, // M
        "11": 78, // N
        "12": 79, // O
        "13": 80, // P
        "14": 81, // Q
        "15": 82, // R
        "16": 83, // S
        "17": 84, // T
        "18": 85, // U
        "19": 86, // V
        "1a": 87, // W
        "1b": 88, // X
        "1c": 89, // Y
        "1d": 90, // Z
        // Numbers
        "1e": 49, // 1
        "1f": 50, // 2
        "20": 51, // 3
        "21": 52, // 4
        "22": 53, // 5
        "23": 54, // 6
        "24": 55, // 7
        "25": 56, // 8
        "26": 57, // 9
        "27": 48, // 0

        // Special Characters
        "28": 13,  // Enter
        "29": 27,  // Escape
        "2a": 8,   // Backspace
        "2b": 9,   // Tab
        "2c": 32,  // Space

        "2d": 45,  // -
        "2e": 61,  // =
        "2f": 91,  // [
        "30": 93,  // ]
        "31": 92,  // \ |

        "33": 59,  // ; ;

        "34": 39,  // '
        "35": 96,  // `
        "36": 44,  // ,
        "37": 46,  // .
        "38": 47,  // /

        // Function Keys
        "3a": 112, // F1
        "3b": 113, // F2
        "3c": 114, // F3
        "3d": 115, // F4
        "3e": 116, // F5
        "3f": 117, // F6
        "40": 118, // F7
        "41": 119, // F8
        "42": 120, // F9
        "43": 121, // F10
        "44": 122, // F11
        "45": 123, // F12
        "e3": 91, // Left Windows
        "e7": 92, // Left Windows/Command


        // Modifier keys (first byte masks)
        "02": 16,  // Left Shift
        "20": 16,  // Right Shift
        "01": 17,  // Left Control
        "10": 17,  // Right Control
        "04": 18,  // Left Alt
        "40": 18,  // Right Alt


    };

    const results = [];
    let lastReleaseTime = null; // Tracks the last release timestamp
    let heldKeys = {}; // Tracks currently held keys with their press timestamps

    keypressData.forEach((event) => {
        const timestamp = new Date(event.timestamp).getTime(); // Convert timestamp to milliseconds
        const keys = event.data.slice(2); // Extract key bytes (bytes 2-7 represent active keys)

        // Handle key presses
        keys.forEach((key) => {
            if (key !== '0' && !heldKeys[key]) {
                let flightTime = lastReleaseTime !== null ? timestamp - lastReleaseTime : -1;
                heldKeys[key] = timestamp; // Record press timestamp

                if (flightTime > 1500) {
                    flightTime = -1
                }

                heldKeys[key] = timestamp
                results.push({
                    VK: HID_KEYCODES[key] || `Unknown(${key})`,
                    HT: null, // HT will be calculated when the key is released
                    FT: flightTime, // FT is time from last release to this press
                });

                // Ensure the results array never exceeds MAX_RESULTS
                if (results.length > MAX_RESULTS) {
                    results.shift(); // Remove the oldest result
                }
            }
        });

        // Handle key releases
        Object.keys(heldKeys).forEach((heldKey) => {
            if (!keys.includes(heldKey)) {
                const pressTime = heldKeys[heldKey];
                const holdTime = timestamp - pressTime;

                // Update HT for the corresponding press result
                const result = results.find(
                    (r) => r.VK === (HID_KEYCODES[heldKey] || `Unknown(${heldKey})`) && r.HT === null
                );
                if (result) {
                    result.HT = holdTime;
                }

                lastReleaseTime = timestamp; // Update the last release time
                delete heldKeys[heldKey]; // Remove the key from heldKeys
            }
        });
    });

    // Assign HT = -1 for any unclosed keys
    Object.keys(heldKeys).forEach((key) => {
        const pressTime = heldKeys[key];
        const flightTime = lastReleaseTime !== null ? pressTime - lastReleaseTime : -1;
        const adjustedFlightTime = flightTime > 1500 ? -1 : flightTime;

        const result = results.find(
            (r) => r.VK === (HID_KEYCODES[key] || `Unknown(${key})`) && r.HT === null
        );
        if (result) {
            result.HT = -1; // Mark as unclosed
            result.FT = adjustedFlightTime;
        }
    });

    console.log("Processed Results:", results);
    return results;


}

function processKeypressData(keypressData, piClient, frontendClient) {
    const results = parseKeypressData(keypressData);
    const csvFilePath = 'keystroke_data.csv';

    console.log("Formatted Keypress Data:", results);

    // Format the output to match the desired style
    let formattedOutput = "VK,HT,FT\n";
    results.forEach(result => {
        const {VK, HT, FT} = result;
        formattedOutput += `${VK},${HT ?? -1},${FT ?? -1}\n`;
    });

    console.log("Formatted Output:", formattedOutput);

    // Clear the file first (truncate) then write
    fs.truncate(csvFilePath, 0, function() {
        console.log('CSV file truncated');

        fs.writeFile(csvFilePath, formattedOutput, 'utf8', (err) => {
            if (err) {
                console.error("Error writing to CSV file:", err);
                return;
            }

            console.log(`Formatted keypress data saved to ${csvFilePath}`);

            // Execute the Python script *synchronously*
            const pythonProcess = spawnSync('python3', [KEYPRESS_DETECTION_SCRIPT]);
            const scriptOutput = pythonProcess.stdout.toString();
            const scriptError = pythonProcess.stderr.toString();
            const code = pythonProcess.status;  // Exit code of the script

            if (code !== 0) {
                // Python script errored out
                console.error(`Python script exited with code ${code}`);
                console.error("Python script error output:", scriptError);
                return;
            }

            console.log("Raw Python script output:", scriptOutput);

            // Parse and log the predictions
            try {
                const lines = scriptOutput.split('\n');
                // Find the first line that looks like valid JSON
                const jsonLine = lines.find(line => line.trim().startsWith('['));
                if (!jsonLine) {
                    throw new Error("No valid JSON output found in Python script output");
                }

                const predictions = JSON.parse(jsonLine);
                console.log("AI Predictions:", predictions);

                // If predictions include "1", send block command
                if (predictions.includes(1)) {
                    console.log('Sending block command to Pi');
                    piClient.send(JSON.stringify({ action: 'block' }));
                }

                // Send predictions to frontend if websocket is open
                if (frontendClient && frontendClient.readyState === WebSocket.OPEN) {
                    frontendClient.send(JSON.stringify({ type: "predictions", predictions }));
                }

            } catch (parseError) {
                console.error("Error parsing Python script output:", parseError.message);
                console.error("Raw Python script output:", scriptOutput);
            }
        });
    });
}
    module.exports = { processKeypressData, parseKeypressData };