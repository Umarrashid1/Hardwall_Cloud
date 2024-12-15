const WebSocket = require('ws');
const express = require('express');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');
const app = express();
const port = 3000;
const { postTestFiles, postFile, postHardwallConfig } = require('./clusterServiceScripts.js'); 

// Constants for file paths and scripts
const UPLOAD_DIR = "/home/ubuntu/box"; // Directory where files are uploaded
const FEATURE_EXTRACTION_SCRIPT = "../malware_predict/feature_extraction.py";
const KEYPRESS_DETECTION_SCRIPT = "../malware_predict/keypress_AI/predict.py"
const SCANNING_SCRIPT = "../malware_predict/run_scanner.py";
const SCANNING_RESULTS = "../malware_predict/scanning_results.json";


// Global cache for storing device info
let deviceInfoCache = null

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Start the Express server
const server = app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

// WebSocket server setup
const wss = new WebSocket.Server({ noServer: true });
let frontendClient = null;
let piClient = null;

let lastReleaseTimeGlobal = null;

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

    const results = []; // Array to store VK, HT, and FT
    let lastReleaseTime = null; // Tracks the last release timestamp
    let currentlyHeldKey = null; // Tracks the currently held key
    let pressTime = null; // Tracks the timestamp of the current press

    keypressData.forEach((event) => {
        const timestamp = new Date(event.timestamp).getTime(); // Convert timestamp to milliseconds
        const key = event.data[2]; // Key is always in the third position

        if (key !== "0") {
            // Key pressed
            console.log(`Key pressed: ${key}, Timestamp: ${timestamp}`);
            currentlyHeldKey = key;
            pressTime = timestamp; // Record the press timestamp

            // Calculate Flight Time (FT)
            let flightTime = -1;
            if (lastReleaseTime !== null) {
                flightTime = timestamp - lastReleaseTime;
            }
            if (flightTime > 1500) {
                flightTime = -1;
            }

            results.push({
                VK: HID_KEYCODES[key] || `Unknown(${key})`,
                HT: null, // HT will be calculated on release
                FT: flightTime, // FT is time from last release to this press
            });
        } else if (currentlyHeldKey) {
            // Key released
            console.log(`Key released: ${currentlyHeldKey}, Timestamp: ${timestamp}`);

            const pressResult = results[results.length - 1];

            if (pressResult && pressResult.HT === null) {
                // Calculate Hold Time (HT)
                let holdTime = timestamp - pressTime;
                pressResult.HT = holdTime;
            }

            lastReleaseTime = timestamp; // Update last release time
            currentlyHeldKey = null; // Reset the currently held key
        }
    });

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

            // Send predictions to the frontend
            if (frontendClient && frontendClient.readyState === WebSocket.OPEN) {
                frontendClient.send(JSON.stringify({ type: "predictions", predictions }));
            }

            piClient.send(JSON.stringify({
                action: 'block'
            }));

        } catch (parseError) {
            console.error("Error parsing Python script output:", parseError.message);
            console.error("Raw Python script output:", stdout); // Log raw output for debugging
        }






    });
});

}


wss.on('connection', (ws, req) => {
    ws.isPiConnection = req.headers['x-device-type'] === 'Pi'; // Identify if the connection is from a Pi

    if (ws.isPiConnection) {
        console.log('Pi connected via WebSocket');
        piClient = ws;

        // Notify the frontend client that the Pi is connected
        if (frontendClient && frontendClient.readyState === WebSocket.OPEN) {
            frontendClient.send(JSON.stringify({ piConnected: true }));
        }

        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message);
                console.log('Received message from Pi:', data);

                if (data.type === "keypress_data") {
                    console.log("Received keypress data:", data.data);

                    // Process keypress data
                    processKeypressData(data.data);

                }

                if (data.type === 'device_summary') {
                    console.log('Received device summary:', data.device_info);

                    deviceInfoCache = data.device_info;
                    console.log(`Cached device info:`, deviceInfoCache);


                    // Forward LSUSB data to the frontend
                    if (frontendClient && frontendClient.readyState === WebSocket.OPEN) {
                        frontendClient.send(JSON.stringify({
                            type: "device_summary",
                            device_info: data.device_info,
                            event_history: data.event_history
                        }));
                        console.log("Sent device summary to frontend.");
                    }

                    // If the device is not a storage device, stop here
                    const isStorageDevice = data.device_info.includes('usb-storage');
                    if (!isStorageDevice) {
                        console.log("Non-storage device detected. No further processing.");
                        return;
                    }
                }

                // Handle file list for validation and scanning
                if (data.type === 'fileList') {
                    console.log('Received file list from Pi:', data.files);

                    let allFilesValid = true;
                    data.files.forEach(file => {
                        const filePath = path.join(UPLOAD_DIR, path.basename(file.path));
                        if (!fs.existsSync(filePath)) {
                            console.error(`File not found: ${filePath}`);
                            allFilesValid = false;
                        }
                    });

                    // Notify Pi of validation results
                    const response = {
                        action: 'fileReceived',
                        status: allFilesValid ? 'success' : 'failed'
                    };
                    ws.send(JSON.stringify(response));

                    // Trigger scanning if files are valid
                    if (allFilesValid) {
                        console.log("All files validated. Running feature extraction and scanning...");
                        runFeatureExtractionAndScanning().then(() => {
                            console.log("Scanning completed successfully.");
                        }).catch((err) => {
                            console.error("Error during scanning:", err);
                        });
                    }
                }
            } catch (error) {
                console.error('Error parsing message from Pi:', error);
            }
        });

        ws.on('close', () => {
            console.log('Pi disconnected');
            piClient = null;

            // Notify the frontend client of Pi disconnection
            if (frontendClient && frontendClient.readyState === WebSocket.OPEN) {
                frontendClient.send(JSON.stringify({ piConnected: false }));
            }
        });

    } else {
        console.log('Frontend client connected');
        frontendClient = ws;

        // Notify the frontend of Pi connection status
        frontendClient.send(JSON.stringify({ piConnected: !!piClient }));

        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message);
                console.log('Message received from frontend:', data);

                // Handle `checkPiStatus` action
                if (data.action === 'checkPiStatus') {
                    ws.send(JSON.stringify({ piConnected: !!piClient }));
                    console.log('Sent Pi connection status to frontend:', !!piClient);
                }

                // Forward commands to the Pi
                if (piClient && piClient.readyState === WebSocket.OPEN) {
                    if (data.action === 'allow') {
                        console.log('Sending allow command to Pi');

                        // Retrieve the device_info from the cache
                        const deviceInfo = deviceInfoCache;

                        if (deviceInfo) {
                            // Send the allow command with the cached device info
                            piClient.send(JSON.stringify({
                                action: 'allow',
                                device_info: {
                                    vendor_id: deviceInfo.vendor_id,
                                    product_id: deviceInfo.product_id,
                                }
                            }));
                            console.log(`Sent allow command with device info for`);
                        } else {
                            console.error(`Device info not found in cache.`);
                        }
                    } else if (data.action === 'block') {
                        console.log('Sending block command to Pi');
                        piClient.send(JSON.stringify({ action: 'block' }));
                    }
                }
            } catch (error) {
                console.error('Error parsing frontend message:', error);
            }
        });

        ws.on('close', () => {
            console.log('Frontend client disconnected');
            frontendClient = null;
        });
    }
});


// Upgrade HTTP requests to WebSocket connections
server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});
function parseDeviceInfo(deviceInfoString) {
    const regex = /Device Type: (?<device_type>\w+), Path: (?<devpath>[^,]+), Vendor ID: (?<vendor_id>\w+), Product ID: (?<product_id>\w+), Drivers: (?<drivers>.*)/;
    const match = deviceInfoString.match(regex);

    if (match && match.groups) {
        return {
            device_type: match.groups.device_type,
            devpath: match.groups.devpath,
            vendor_id: match.groups.vendor_id,
            product_id: match.groups.product_id,
            drivers: match.groups.drivers
        };
    } else {
        console.error("Failed to parse device_info string:", deviceInfoString);
        return null;
    }
}

// Function to run feature extraction and scanning
function runFeatureExtractionAndScanning() {
    return new Promise((resolve, reject) => {
        // Step 1: Run feature extraction
        exec(`python3 ${FEATURE_EXTRACTION_SCRIPT} ${UPLOAD_DIR}`, (error, stdout, stderr) => {
            if (error) {
                console.error("Error during feature extraction:", stderr);
                reject(stderr);
                return;
            }
            console.log("Feature extraction output:", stdout);

            // Step 2: Run malware scanning
            exec(`python3 ${SCANNING_SCRIPT} ${path.join(UPLOAD_DIR, "extracted_features.csv")}`, (scanError, scanStdout, scanStderr) => {
                if (scanError) {
                    console.error("Error during malware scanning:", scanStderr);
                    reject(scanStderr);
                    return;
                }

                console.log("Scanning output:", scanStdout);

                // Send scanning results to frontend
                const resultsFilePath = path.join(UPLOAD_DIR, "scanning_results.json");
                if (frontendClient && frontendClient.readyState === WebSocket.OPEN) {
                    try {
                        const results = fs.readFileSync(resultsFilePath, "utf-8");
                        frontendClient.send(JSON.stringify({ type: "scanningResults", results: JSON.parse(results) }));
                        console.log("Scanning results sent to frontend.");
                    } catch (err) {
                        console.error("Error reading or sending scanning results:", err);
                    }
                } else {
                    console.warn("No frontend connected. Scanning results not sent.");
                }

                resolve(); // Resolve after sending results
            });
        });
    });
}

app.post('/config-hardwall', async (req, res) => {
    const config = req.body;
    try {
        const response = await postHardwallConfig(config);
        console.log('Hardwall config posted:', response);
        res.json(response);
    } catch (error) {
        res.status(500).json({ error: 'Error posting hardwall config' });
    }
});

app.post('/restart-device', (req, res) => {
    if (piClient && piClient.readyState === WebSocket.OPEN) {
        piClient.send(JSON.stringify({ action: 'restart' }));
        res.json({ status: 'success' });
    } else {
        res.status(500).json({ error: 'No Pi connected to restart' });
    }
});


// Check for command-line arguments
const args = process.argv.slice(2);
if (args.includes("test")) {
    console.log("Running test...");   
    postTestFiles().then((findings) => {
        console.log('Test files processed:', findings);
    }).catch((error) => {
        console.error('Error processing test files:', error);
    });
}

