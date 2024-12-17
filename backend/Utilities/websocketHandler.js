const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const keypressParser = require('./keypressParser');
const {scanDirectoryVirusTotal} = require("../public/virusTotalScript"); // Utility for keypress parsing
const {postFile, createFileInput} = require("../clusterServiceScripts")

let piClient = null;
let frontendClient = null;
let deviceInfoCache = null;
let piStatus = null;

// Directory where files are uploaded
const UPLOAD_DIR = "/home/ubuntu/box";

function initWebSocket(server) {
    const wss = new WebSocket.Server({ noServer: true });

    wss.on('connection', (ws, req) => {
        ws.isPiConnection = req.headers['x-device-type'] === 'Pi'; // Identify connection source

        if (ws.isPiConnection) {
            handlePiConnection(ws);
        } else {
            handleFrontendConnection(ws);
        }
    });

    server.on('upgrade', (request, socket, head) => {
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
    });
    console.log('WebSocket server initialized.');
}


function handlePiConnection(ws) {
    console.log('Pi connected via WebSocket');
    piClient = ws;
    notifyFrontend({ piConnected: true });

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('Received message from Pi:', data);
            switch (data.type) {
                case 'keypress_data':
                    console.log('Received keypress data:', data.data);
                    keypressParser.processKeypressData(data.data);
                    break;

                case 'device_summary':
                    handleDeviceSummary(data);
                    break;

                case 'status':
                    handleStatus(data, ws);
                    break;

                case 'fileList':
                    handleFileList(data, ws);
                    break;

                default:
                    console.warn('Unhandled message type from Pi:', data.type);
            }
        } catch (error) {
            console.error('Error parsing message from Pi:', error);
        }
    });

    ws.on('close', () => {
        console.log('Pi disconnected');
        piClient = null;
        notifyFrontend({ piConnected: false });
    });
}
function handleStatus(data, ws) {
    console.log("Received Pi status:", data);
    const validStatuses = ["allow", "block"];
    if (validStatuses.includes(data.data)) {
        piStatus = data.data; // Update the backend's internal state
        notifyFrontend({
            type: "status",
            piStatus
        });
        console.log("Notified frontend of updated status:", piStatus);
    } else {
        console.warn("Invalid status received from Pi:", data.data);
    }
}

function handleStatus_old(data, ws) {
    console.log("Received Pi status:", data);
    piStatus = data.data; // Directly store the 'data' field (e.g., "Blocked")

    notifyFrontend({
        type: 'status',
        piStatus: piStatus // Send a simplified status response
    });
}

function handleFrontendConnection(ws) {
    console.log('Frontend client connected');
    frontendClient = ws;

    // Notify frontend of initial connection and status
    ws.send(JSON.stringify({
        type: 'status',
        piStatus: piStatus || 'block', // Default to 'block' if undefined
        piConnected: !!piClient
    }));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('Message received from frontend:', data);

            if (piClient && piClient.readyState === WebSocket.OPEN) {
                forwardCommandToPi(data);
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






function handleDeviceSummary(data) {
    console.log('Received device summary:', data.device_info);
    deviceInfoCache = data.device_info;
    if (data.device_info.drivers && data.device_info.drivers.includes('usb-storage')) {
        console.log('Storage device detected:', data.device_info);

    }
    notifyFrontend({
        type: 'device_summary',
        device_info: data.device_info
    });
}



function handleFileList(data, ws) {
    console.log('Received file list from Pi:', data.files);
    let filePaths = []
    const allFilesValid = data.files.every((file) => {
        const filePath = path.join(UPLOAD_DIR, path.basename(file.path));
        if (!fs.existsSync(filePath)) {
            filePaths.push(filePath)
            console.error(`File not found: ${filePath}`);
            return false;
        }
        return true;
    });

    ws.send(
        JSON.stringify({
            action: 'fileReceived',
            status: allFilesValid ? 'success' : 'failed'
        })
    );

    if (allFilesValid) {
        console.log('All files validated. Running feature extraction and scanning...');
        let files = createFileInput(filePaths)
        console.log(files)

        postFile(files).then((findings) => {
            console.log('files processed:', findings);
        }).catch((error) => {
            console.error('Error processing files:', error);
        });

        //do something with findings


        // Scanning with VirusTotal
        //scanDirectoryVirusTotal('/home/ubuntu/box').then(r => { console.log('Scanning completed successfully.') }).catch(e => { console.error('Error during scanning:', e) });
    }

}


function notifyFrontend(message) {
    if (frontendClient && frontendClient.readyState === WebSocket.OPEN) {
        frontendClient.send(JSON.stringify(message));
    }
}

function forwardCommandToPi(command) {
    console.log(`Forwarding command to Pi: ${command.action}`);
    switch (command.action) {
        case 'allow':
            if (deviceInfoCache) {
                piClient.send(
                    JSON.stringify({
                        action: 'allow',
                        device_info: {
                            vendor_id: deviceInfoCache.vendor_id,
                            product_id: deviceInfoCache.product_id,
                            drivers: deviceInfoCache.drivers
                        }
                    })
                );
            } else {
                console.error('Device info not found in cache.');
            }
            break;

        case 'block':
            piClient.send(JSON.stringify({ action: 'block' }));
            break;

        default:
            console.warn('Unhandled command action:', command.action);
    }
}
module.exports = { initWebSocket, piClient, frontendClient };