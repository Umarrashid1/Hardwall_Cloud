const WebSocket = require('ws');
const express = require('express');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');
const app = express();
const port = 3000;
const { postTestFiles, postFile, postHardwallConfig } = require('./clusterServiceScripts.js');
const keypressParser = require ('../Utilities/keypressParser')
const {initWebSocket} = require("./Utilities/websocketHandler");

// Constants for file paths and scripts


// Global cache for storing device info
let deviceInfoCache = null

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

initWebSocket(server)

function parseDeviceInfo(deviceInfoString) {
    const regex = /Device Type: (?<device_type>\w+), Path: (?<devpath>[^,]+), Vendor ID: (?<vendor_id>\w+), Product ID: (?<product_id>\w+), Drivers: (?<drivers>.*)/;
    const match = deviceInfoString.match(regex);

    if (match && match.groups) {
        return {
            device_type: match.groups.device_type,
            devpath: match.groups.devpath,
            vendor_id: match.groups.vendor_id,
            product_id: match.groups.product_id,
            drivers: match.groups.drivers
        };
    } else {
        console.error("Failed to parse device_info string:", deviceInfoString);
        return null;
    }
}

// Function to run feature extraction and scanning


app.post('/config-hardwall', async (req, res) => {
    const config = req.body;
    try {
        const response = await postHardwallConfig(config);
        console.log('Hardwall config posted:', response);
        res.json(response);
    } catch (error) {
        res.status(500).json({ error: 'Error posting hardwall config' });
    }
});

app.post('/restart-device', (req, res) => {
    if (piClient && piClient.readyState === WebSocket.OPEN) {
        piClient.send(JSON.stringify({ action: 'restart' }));
        res.json({ status: 'success' });
    } else {
        res.status(500).json({ error: 'No Pi connected to restart' });
    }
});


// Check for command-line arguments
const args = process.argv.slice(2);
if (args.includes("test")) {
    console.log("Running test...");   
    postTestFiles().then((findings) => {
        console.log('Test files processed:', findings);
    }).catch((error) => {
        console.error('Error processing test files:', error);
    });
}

