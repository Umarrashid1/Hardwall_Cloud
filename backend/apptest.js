import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { spawn } from 'child_process'; // To run Python scripts
import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';
import { postFile, postTestFiles } from './clusterServiceScripts.js'; // Import the functions

// Convert import.meta.url to __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

function runTest() {
    console.log("Running test...");
    postTestFiles();
}

// Check for command-line arguments
const args = process.argv.slice(2);
if (args.includes("test")) {
    runTest();
}