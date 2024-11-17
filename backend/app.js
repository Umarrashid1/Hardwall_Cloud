const express = require('express');
const path = require('path');
const WebSocket = require('ws');
const { spawn } = require('child_process'); // To run Python scripts
const app = express();
const port = 3000;
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');


let deviceInfo = null; // Store the device info temporarily
let showButtons = false;  // Flag to track whether buttons should be shown

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

async function postFile(fileInput) {
    var formData = new FormData();
    fileInput.files.forEach(file => {
        formData.append('file', file.stream, file.data, file.fileName);

    });
    

    try {
        const response = await axios.post('http://0.0.0.0:5000/extract_features', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                ...formData.getHeaders()
            },
            timeout: 60000  // Increase timeout to 60 seconds
        });
        //console.log('Response:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error posting file to Flask:', error);
    }
}
function postFileTest() {
    // File input element
    const testFilePath = fs.realpathSync('test/mspaint.exe');

    const fileData = fs.readFileSync(testFilePath);
    var fileStream = fs.createReadStream(testFilePath);

    const testFilePathTwo = fs.realpathSync('test/SnippingTool.exe');
    const fileDataTwo = fs.readFileSync(testFilePathTwo);
    var fileStreamTwo = fs.createReadStream(testFilePathTwo);
    const fileInput = { 
        files: [{fileName: 'mspaint.exe', path: testFilePath, data: fileData, stream: fileStream },
                {fileName: 'SnippingTool.exe', path: testFilePathTwo, data: fileDataTwo, stream: fileStreamTwo }
        ],
    }
    console.log('sending file');
    response = postFile(fileInput).then((response) => {
        try {
            data = Object.entries(response)
            findings = []
            // ---- keys ----
            // findings = {file_name, missing_features[], results{}}
            // ex: findings[1]['file_name'] = 'mspaint.exe'
            // results = {name, prediction, md5}
            for (item in data) {
                findings.push(data[item][1])
            }
            for (item in findings) {
                findings[item]['results'] = findings[item]['results'][0]
            }
        } catch (error) {
            console.error('Error parsing device info:', error);
        }
        console.log('findings:', findings);
        return findings;
    });
}

postFileTest();

// WebSocket communication with Pi
wss.on('connection', (ws) => {
    console.log('Pi connected via WebSocket');

    // Listen for messages from Pi (e.g., USB device info)
    ws.on('message', (message) => {
        console.log('Received message from Pi:', message);

        const messageString = message.toString();  // Convert buffer to string

        // Attempt to parse the incoming message as JSON
        try {
            const parsedDeviceInfo = JSON.parse(messageString);
            console.log('Device info:', parsedDeviceInfo);

            // Store device info in memory
            deviceInfo = parsedDeviceInfo;
            showButtons = true;
            // Respond with 'allow' for now (can be changed as needed)
            ws.send('allow');

            // After receiving the message, call the Python script to process files
            const directoryPath = './test'; // Adjust this to your actual directory path

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

// HTTP endpoint to show buttons and send device info
app.get('/api/show-buttons', (req, res) => {
    if (showButtons) {
        res.json({
            showButtons: true,
            deviceInfo: deviceInfo,
        });
    } else {
        res.json({ showButtons: false });
    }
});

// Endpoint to handle "block" action
app.post('/api/block', (req, res) => {
    console.log('Device blocked');
    deviceState = 'block';  // Block the device

    // Respond to frontend
    res.json({ message: 'Device blocked successfully' });
});

// Endpoint to handle "allow" action
app.post('/api/allow', (req, res) => {
    console.log('Device allowed');
    deviceState = 'allow';  // Allow the device

    // Respond to frontend
    res.json({ message: 'Device allowed successfully' });
});
