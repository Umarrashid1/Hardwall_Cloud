const express = require('express');
const path = require('path');
const WebSocket = require('ws');
const { spawn } = require('child_process'); // This will allow us to run Python scripts
const FtpSrv = require('ftp-srv'); // Import the FTP server
const os = require('os'); // To get the machine's IP address
const app = express();
const port = 3000;

// Get the machine's IP address (update this if necessary)
const ipAddress = '130.225.37.50';  // Set your actual IP address

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Define routes (optional)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the Express server
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

            // After receiving the message, call the Python script to process files
            // Define the directory path to pass to the Python script
            const directoryPath = 'model/test'; // Adjust this to your actual directory path

            // Run the Python script using spawn with python3
            const pythonProcess = spawn('python3', ['model/feature_extraction.py', directoryPath]);

            // Handle output from the Python script
            pythonProcess.stdout.on('data', (data) => {
                console.log(`Python script output: ${data}`);
            });

            // Handle any errors from the Python script
            pythonProcess.stderr.on('data', (data) => {
                console.error(`Python script error: ${data}`);
            });

            // Handle the end of the Python script execution
            pythonProcess.on('close', (code) => {
                console.log(`Python script finished with exit code ${code}`);
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

// FTP server setup
const ftpServer = new FtpSrv({
    url: `ftp://${ipAddress}:21`,  // Set FTP server URL to bind to the specific IP
    anonymous: true,  // Allows anonymous login (you can customize this as needed)
    pasv: {
        min: 10000,
        max: 10100
    }
});

// Handle FTP login
ftpServer.on('login', (data, resolve, reject) => {
    console.log('FTP login attempt:', data);
    // Here you can handle login and authenticate users if necessary
    if (data.username === 'anonymous') {
        resolve({ root: '/path/to/ftp/root' }); // Path to the root directory for FTP access
    } else {
        reject(new Error('Invalid username or password'));
    }
});

// Start the FTP server
ftpServer.listen().then(() => {
    console.log(`FTP server running at ftp://${ipAddress}:21`);
}).catch(err => {
    console.error('Error starting FTP server:', err);
});

