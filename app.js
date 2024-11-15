const express = require('express');
const path = require('path');
const WebSocket = require('ws');
const { spawn } = require('child_process');
const app = express();
const port = 3000;

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Define routes (optional)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
const server = app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

// Set up WebSocket server to communicate with the Pi
const wss = new WebSocket.Server({ noServer: true });

// WebSocket communication with Pi
wss.on('connection', (ws) => {
    console.log('Pi connected via WebSocket');

    // Listen for messages from Pi (e.g., USB device info)
    ws.on('message', (message) => {
        console.log('Received message from Pi:', message);

        const messageString = message.toString();  // Convert buffer to string

        // Attempt to parse the incoming message as JSON
        try {
            const deviceInfo = JSON.parse(messageString);
            console.log('Device info:', deviceInfo);

            // Respond with 'allow' for now
            ws.send('allow');

            // After sending 'allow', run the Python function
            // Specify the directory containing the files to process
            const directoryPath = '/path/to/your/directory';  // Update with the correct directory path

            // Run the Python script to process files in the directory
            const pythonScriptPath = path.join(__dirname, 'feature_extraction.py');
            const pythonProcess = spawn('python', [pythonScriptPath, directoryPath]);

            pythonProcess.stdout.on('data', (data) => {
                console.log(`stdout: ${data}`);
            });

            pythonProcess.stderr.on('data', (data) => {
                console.error(`stderr: ${data}`);
            });

            pythonProcess.on('close', (code) => {
                if (code === 0) {
                    console.log('Python script completed successfully');
                } else {
                    console.error(`Python script failed with code ${code}`);
                }
            });

        } catch (error) {
            console.error('Error parsing device info:', error);
            ws.send('block');  // If there's an error, block the device
        }
    });

    ws.on('close', () => {
        console.log('Pi disconnected');
    });

});

// Upgrade HTTP server to WebSocket server
server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});
