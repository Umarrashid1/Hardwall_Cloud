const express = require('express');
const path = require('path');
const { spawn } = require('child_process');
const WebSocket = require('ws');
const app = express();
const port = 3000;

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
    ws.isPiConnection = req.url.includes('/pi');

    if (ws.isPiConnection) {
        console.log('Pi connected via WebSocket');
        piClient = ws;

        ws.on('message', (message) => {
            console.log('Received message from Pi:', message);
            let deviceData;

            try {
                deviceData = JSON.parse(message);
                console.log('Parsed device info:', deviceData);

                // Send data to the paired frontend client
                if (frontendClient && frontendClient.readyState === WebSocket.OPEN) {
                    frontendClient.send(JSON.stringify({
                        showButtons: true,
                        deviceInfo: deviceData
                    }));
                }

                // Execute a Python script
                const directoryPath = 'model/test'; // Adjust as needed
                const pythonProcess = spawn('python3', ['model/feature_extraction.py', directoryPath]);

                pythonProcess.stdout.on('data', (data) => {
                    console.log(`Python script output: ${data}`);
                });

                pythonProcess.stderr.on('data', (data) => {
                    console.error(`Python script error: ${data}`);
                });

                pythonProcess.on('close', (code) => {
                    console.log(`Python script finished with exit code ${code}`);
                });

            } catch (error) {
                console.error('Error parsing device info:', error);
            }
        });

        ws.on('close', () => {
            console.log('Pi disconnected');
            piClient = null;

            // Notify frontend client of Pi disconnection
            if (frontendClient && frontendClient.readyState === WebSocket.OPEN) {
                frontendClient.send(JSON.stringify({ piConnected: false }));
            }
        });

    } else {
        console.log('Frontend client connected');
        frontendClient = ws;

        // Notify frontend client if the Pi is already connected
        if (piClient && piClient.readyState === WebSocket.OPEN) {
            frontendClient.send(JSON.stringify({ piConnected: true }));
        }

        ws.on('message', (message) => {
            if (!piClient || piClient.readyState !== WebSocket.OPEN) {
                console.error('No Pi connected to handle the message.');
                return;
            }

            console.log('Message received from frontend:', message);
            try {
                const command = JSON.parse(message);

                if (command.action === 'block') {
                    console.log('Sending block command to Pi');
                    piClient.send('block');
                } else if (command.action === 'allow') {
                    console.log('Sending allow command to Pi');
                    piClient.send('allow');
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
