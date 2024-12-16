const fs = require("fs");
const { exec } = require("child_process");
const WebSocket = require("ws");

const KEYPRESS_DETECTION_SCRIPT = "../malware_predict/keypress_AI/predict.py"


function parseKeypressData(keypressData) {
    const HID_KEYCODES = {
        "4": 65,  // A
        "5": 66,  // B
        "6": 67,  // C
        "7": 68,  // D
        "8": 69,  // E
        "9": 70,  // F
        "10": 71, // G
        "11": 72, // H
        "12": 73, // I
        "13": 74, // J
        "14": 75, // K
        "15": 76, // L
        "16": 77, // M
        "17": 78, // N
        "18": 79, // O
        "19": 80, // P
        "20": 81, // Q
        "21": 82, // R
        "22": 83, // S
        "23": 84, // T
        "24": 85, // U
        "25": 86, // V
        "26": 87, // W
        "27": 88, // X
        "28": 89, // Y
        "29": 90, // Z

        // Numbers
        "30": 49, // 1
        "31": 50, // 2
        "32": 51, // 3
        "33": 52, // 4
        "34": 53, // 5
        "35": 54, // 6
        "36": 55, // 7
        "37": 56, // 8
        "38": 57, // 9
        "39": 48, // 0

        // Special Characters
        "40": 13,  // Enter
        "41": 27,  // Escape
        "42": 8,   // Backspace
        "43": 9,   // Tab
        "44": 32,  // Space
        "45": 45,  // -
        "46": 61,  // =
        "47": 91,  // [
        "48": 93,  // ]
        "49": 92,  // \
        "50": 59,  // ;
        "51": 39,  // '
        "52": 96,  // `
        "53": 44,  // ,
        "54": 46,  // .
        "55": 47,  // /

        // Function Keys
        "58": 112, // F1
        "59": 113, // F2
        "60": 114, // F3
        "61": 115, // F4
        "62": 116, // F5
        "63": 117, // F6
        "64": 118, // F7
        "65": 119, // F8
        "66": 120, // F9
        "67": 121, // F10
        "68": 122, // F11
        "69": 123, // F12

        // Control Keys
        "224": 17, // Ctrl
        "225": 16, // Shift
        "226": 18, // Alt
        "227": 91, // Left Windows/Command
        "228": 92, // Right Windows/Command
        "229": 93  // Menu
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
                const flightTime = lastReleaseTime !== null ? timestamp - lastReleaseTime : -1;
                heldKeys[key] = timestamp; // Record press timestamp

                results.push({
                    VK: HID_KEYCODES[key] || `Unknown(${key})`,
                    HT: null, // HT will be calculated when the key is released
                    FT: flightTime, // FT is time from last release to this press
                });
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

    // Assign HT=-1 for any unclosed keys
    Object.keys(heldKeys).forEach((key) => {
        const pressTime = heldKeys[key];
        const result = results.find(
            (r) => r.VK === (HID_KEYCODES[key] || `Unknown(${key})`) && r.HT === null
        );
        if (result) {
            result.HT = -1; // Mark as unclosed
            result.FT = lastReleaseTime !== null ? pressTime - lastReleaseTime : -1;
        }
    });

    // Sort results by release time for consistent output
    results.sort((a, b) => (a.HT === -1 ? Infinity : a.HT) - (b.HT === -1 ? Infinity : b.HT));

    console.log("Processed Results:", results);
    return results;
}

function processKeypressData(keypressData) {
    const results = parseKeypressData(keypressData);

    console.log("Formatted Keypress Data:", results);

    // Format the output to match the desired style
    let formattedOutput = "VK,HT,FT\n";

    results.forEach(result => {
        const { VK, HT, FT } = result;
        formattedOutput += `${VK},${HT || -1},${FT || -1}\n`;
    });
    const csvFilePath = ('keystroke_data.csv');


    console.log("Formatted Output:", formattedOutput);
    fs.writeFile(csvFilePath, formattedOutput, 'utf8', (err) => {
        if (err) {
            console.error("Error writing to CSV file:", err);
            return;
        }

        console.log(`Formatted keypress data saved to ${csvFilePath}`);


        // Execute the Python script
        exec(`python3 ${KEYPRESS_DETECTION_SCRIPT}`, (error, stdout, stderr) => {
            if (error) {
                console.error("Error during Python script execution:", error.message);
            }
            if (stderr) {
                console.error("Python script error output:", stderr);
            }

            // Parse and log the predictions
            try {
                console.log("Raw Python script output:", stdout); // Log the raw output for debugging

                // Extract the JSON-like line (skip non-JSON lines)
                const lines = stdout.split('\n'); // Split output into lines
                const jsonLine = lines.find(line => line.trim().startsWith('[')); // Find the line that starts with '['

                if (!jsonLine) {
                    throw new Error("No valid JSON output found in Python script output");
                }

                // Parse the extracted JSON line
                const predictions = JSON.parse(jsonLine);
                console.log("AI Predictions:", predictions);

                if (predictions.includes(1)) {
                    console.log('Sending block command to Pi');
                    piClient.send(JSON.stringify({
                        action: 'block'
                    }));
                }

                // Send predictions to the frontend
                if (frontendClient && frontendClient.readyState === WebSocket.OPEN) {
                    frontendClient.send(JSON.stringify({ type: "predictions", predictions }));
                }



            } catch (parseError) {
                console.error("Error parsing Python script output:", parseError.message);
                console.error("Raw Python script output:", stdout); // Log raw output for debugging
            }

        });
    });
}
module.exports = { processKeypressData, parseKeypressData };