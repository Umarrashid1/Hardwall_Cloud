import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { spawn } from 'child_process'; // To run Python scripts
import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';

// Convert import.meta.url to __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const featureExtractorAddress = 'feature-extraction-service:5000/' //'http://localhost:5000';
const app = express();
const port = 3000;

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
const wss = new WebSocketServer({ noServer: true });

async function postFile(fileInput) {
    var formData = new FormData();
    fileInput.files.forEach(file => {
        formData.append('file', file.stream, file.data, file.fileName);
    });

    try {
        const response = await axios.post(featureExtractorAddress+'extract_features', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                ...formData.getHeaders()
            },
            timeout: 60000  // Increase timeout to 60 seconds
        });
        console.log('Response:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error posting file to Flask:', error);
    }
}

function postFileTest() {
    const testFilePath = fs.realpathSync('test/mspaint.exe');
    const fileData = fs.readFileSync(testFilePath);
    var fileStream = fs.createReadStream(testFilePath);

    const testFilePathTwo = fs.realpathSync('test/SnippingTool.exe');
    const fileDataTwo = fs.readFileSync(testFilePathTwo);
    var fileStreamTwo = fs.createReadStream(testFilePathTwo);

    const fileInput = { 
        files: [
            {fileName: 'mspaint.exe', path: testFilePath, data: fileData, stream: fileStream },
            {fileName: 'SnippingTool.exe', path: testFilePathTwo, data: fileDataTwo, stream: fileStreamTwo }
        ],
    };

    postFile(fileInput).then((response) => {
        try {
            const data = Object.entries(response);
            const findings = [];
            for (const item of data) {
                findings.push(item[1]);
            }
            for (const item of findings) {
                item['results'] = item['results'][0];
            }
            console.log('findings:', findings);
            return findings;
        } catch (error) {
            console.error('Error parsing device info:', error);
        }
    });
}

// WebSocket communication with Pi
wss.on('connection', (ws) => {
    // WebSocket connection logic
});

// Upgrade HTTP server to WebSocket server
server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});

// HTTP endpoint to show buttons and send device info
app.get('/api/show-buttons', (req, res) => {
    res.json({ showButtons, deviceInfo });
});