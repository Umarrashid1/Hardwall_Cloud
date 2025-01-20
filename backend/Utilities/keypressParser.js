const fs = require("fs");
const { spawn } = require("child_process");
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
    // 1) Parse the raw data into {VK, HT, FT} objects
    const results = parseKeypressData(keypressData);

    // 2) Spawn Python and pass data via STDIN
    const pythonProcess = spawn("python3", [KEYPRESS_DETECTION_SCRIPT]);

    let scriptOutput = "";
    let scriptError = "";

    // Collect output from Python
    pythonProcess.stdout.on("data", (data) => {
        scriptOutput += data.toString();
    });

    // Collect errors from Python
    pythonProcess.stderr.on("data", (data) => {
        scriptError += data.toString();
    });

    // When Python closes, process the output
    pythonProcess.on("close", (code) => {
        if (code !== 0) {
            console.error(`Python script exited with code ${code}`);
            console.error("Python script error output:", scriptError);
            return;
        }

        console.log("Raw Python script output:", scriptOutput);

        // Parse output (which should be JSON) and handle predictions
        try {
            // The Python script will print something like: [0, 1, 0, ...]
            const predictions = JSON.parse(scriptOutput);
            console.log("AI Predictions:", predictions);

            // Example: if any of them is '1', do block
            if (predictions.includes(1)) {
                console.log("Sending block command to Pi");
                piClient.send(JSON.stringify({ action: "block" }));
            }

            // Also forward predictions to your frontend
            if (frontendClient && frontendClient.readyState === WebSocket.OPEN) {
                frontendClient.send(
                    JSON.stringify({ type: "predictions", predictions })
                );
            }
        } catch (parseError) {
            console.error("Error parsing Python script output:", parseError.message);
            console.error("Raw Python script output:", scriptOutput);
        }
    });

    // 3) Send our keystrokes to Python via STDIN
    pythonProcess.stdin.write(JSON.stringify(results));
    // End the input stream to let Python know we've sent all data
    pythonProcess.stdin.end();
}    module.exports = { processKeypressData, parseKeypressData };