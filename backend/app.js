const WebSocket = require('ws');
const express = require('express');
const path = require('path');
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

                // Handle Pi status updates
                if (data.type === 'status') {
                    console.log('Status update from Pi:', data.status);
                }

                // Forward `deviceInfo` to the frontend
                if (data.type === 'deviceInfo') {
                    console.log('Forwarding deviceInfo to frontend:', data);
                    if (frontendClient && frontendClient.readyState === WebSocket.OPEN) {
                        frontendClient.send(JSON.stringify({
                            showButtons: true,
                            deviceInfo: data
                        }));
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

