const express = require('express');
const path = require('path');
const WebSocket = require('ws');
const { spawn } = require('child_process'); // To spawn a Python process
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

            // Assuming deviceInfo contains the directory path where files need to be processed
            const directoryPath = deviceInfo.directoryPath || '/default/directory'; // Provide default path if not specified

            // Run the Python script to process files in the specified directory
            runPythonScript('./path_to_your_script.py', directoryPath);

            // Respond with 'allow' for now
            ws.send('allow');
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

// Function to run the Python script
function runPythonScript(scriptPath, directoryPath) {
    const pythonProcess = spawn('python', [scriptPath, directoryPath]);

    pythonProcess.stdout.on('data', (data) => {
        console.log(`Python script output: ${data}`);
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`Python script error: ${data}`);
    });

    pythonProcess.on('close', (code) => {
        console.log(`Python script finished with code ${code}`);
    });
}
