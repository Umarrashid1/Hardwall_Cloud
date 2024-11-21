const WebSocket = require('ws');
const express = require('express');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');
const app = express();
const port = 3000;

// Constants for file paths and scripts
const UPLOAD_DIR = "/home/ubuntu/box"; // Directory where files are uploaded
const FEATURE_EXTRACTION_SCRIPT = "feature_extraction.py";
const SCANNING_SCRIPT = "run_scanner.py";
const SCANNING_RESULTS = "scanning_results.json";

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
                    console.log('Starting feature extraction and scanning...');
                    runFeatureExtractionAndScanning()
                        .then(() => {
                            // Send JSON results directly to the frontend
                            if (frontendClient && frontendClient.readyState === WebSocket.OPEN) {
                                fs.readFile(SCANNING_RESULTS, 'utf8', (err, jsonData) => {
                                    if (err) {
                                        console.error('Error reading scanning results:', err);
                                        frontendClient.send(JSON.stringify({
                                            action: 'displayResults',
                                            error: 'Failed to read scanning results.',
                                        }));
                                    } else {
                                        frontendClient.send(JSON.stringify({
                                            action: 'displayResults',
                                            results: JSON.parse(jsonData),
                                        }));
                                    }
                                });
                            }
                        })
                        .catch((err) => {
                            console.error('Error during feature extraction or scanning:', err);

                            // Notify frontend of error
                            if (frontendClient && frontendClient.readyState === WebSocket.OPEN) {
                                frontendClient.send(JSON.stringify({
                                    action: 'displayResults',
                                    error: 'Feature extraction or scanning failed.',
                                }));
                            }
                        });
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
                resolve(); // No need to return anything; results are saved to JSON
            });
        });
    });
}
