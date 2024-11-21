const WebSocket = require('ws');
const express = require('express');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');
const app = express();
const port = 3000;

// Constants for file paths and scripts
const UPLOAD_DIR = "/home/ubuntu/box"; // Directory where files are uploaded
const FEATURE_EXTRACTION_SCRIPT = "../malware_predict/feature_extraction.py";
const SCANNING_SCRIPT = "../malware_predict/run_scanner.py";
const SCANNING_RESULTS = "../malware_predict/scanning_results.json";

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

                // Handle device info and trigger feature extraction and scanning
                if (data.type === 'deviceInfo') {
                    console.log('Received USB device info:', data.lsusb_output);
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
                    if (data.action === 'block') {
                        console.log('Sending block command to Pi');
                        piClient.send(JSON.stringify({ action: 'block' }));
                    } else if (data.action === 'allow') {
                        console.log('Sending allow command to Pi');
                        piClient.send(JSON.stringify({ action: 'allow' }));
                    }
                } else {
                    console.error('No Pi connected to handle the command.');
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

function runTest() {
    console.log("Running test...");   
    try {
        postTestFiles().then((findings) => {
            console.log("Findings:", findings);
        });
    } catch (error) {
        console.error('Error parsing device info:', error);
    }
}

// Check for command-line arguments
const args = process.argv.slice(2);
if (args.includes("test")) {
    runTest();
}