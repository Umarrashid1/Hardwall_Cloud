const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const keypressParser = require('./keypressParser');
const {scanDirectoryVirusTotal} = require("./virusTotalAPI"); // Utility for keypress parsing
const {postFile, createFileInput, postKeystrokes} = require("../clusterServiceScripts")
const {parseKeypressData} = require("./keypressParser");
const { spawn } = require('child_process');


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
                    handleKeypress_data(data.data);
                    break;

                case 'device_summary':
                    handleDeviceSummary(data);
                    break;
                //keypressParser.processKeypressData(data.data);


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
        notifyFrontend({
            type: 'storage device',
        });
    }
    notifyFrontend({
        type: 'device_summary',
        device_info: data.device_info
    });
}



function handleFileList(data, ws) {
    console.log('Received file list from Pi:', data.files);
    const allFilesValid = data.files.every((file) => {
        const filePath = path.join(UPLOAD_DIR, path.basename(file.path));
        if (!fs.existsSync(filePath)) {
            console.error(`File not found: ${filePath}`);
            return false;
        }
        return true;
    });

    ws.send(
        JSON.stringify({
            type: 'fileReceived',
            status: allFilesValid ? 'success' : 'failed'
        })
    );

    if (allFilesValid) {
        console.log('All files validated. Running feature extraction and scanning...');
        // Path to the Python script
        const pythonProcess = spawn('python3', ['/home/ubuntu/hardwall/malware_predict/feature_extraction.py']);

        pythonProcess.stdout.on('data', (data) => {
            console.log(`Output: ${data}`);
        });

        pythonProcess.stderr.on('data', (error) => {
            console.error(`Error: ${error}`);
        });

        pythonProcess.on('close', (code) => {
            console.log(`Python script exited with code ${code}`);
        });



        notifyFrontend({
            type: 'show_button',
        });

        // Scanning with VirusTotal
        //scanDirectoryVirusTotal('/home/ubuntu/box', frontendClient).then(r => { console.log('Scanning completed successfully.') }).catch(e => { console.error('Error during scanning:', e) });
        // Empty upload dir
        emptyBox()
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
function emptyBox() {
    try {
        fs.readdir(UPLOAD_DIR, (err, files) => {
            if (err) {
                console.error(`Failed to read files in ${UPLOAD_DIR}:`, err);
                return;
            }
            files.forEach((file) => {
                const filePath = path.join(UPLOAD_DIR, file);
                fs.unlink(filePath, (err) => {
                    if (err) {
                        console.error(`Failed to delete file ${filePath}:`, err);
                    } else {
                        console.log(`Deleted file: ${filePath}`);
                    }
                });
            });
        });
    } catch (error) {
        console.error('Error emptying the box folder:', error);
    }
}
function handleKeypress_data(data) {
    const parsedKeypressData = parseKeypressData(data);
    console.log("Parsed Keypress Data:", parsedKeypressData);

    if (parsedKeypressData) {
        postKeystrokes(parsedKeypressData).then((response) => {
            console.log('Received response: ', response);
            const predictions = response.predictions
            console.log("AI Predictions:", predictions);

            if (predictions.includes(1)) {
                console.log('Sending block command to Pi');
                piClient.send(JSON.stringify({
                    action: 'block'
                }));
            }
            // Send predictions to the frontend
            if (frontendClient && frontendClient.readyState === WebSocket.OPEN) {
                frontendClient.send(JSON.stringify({ type: "predictions", predictions }));
            }

        }).catch((error) => {
            console.error('Error posting keystrokes:', error);
        });
    } else {
        console.error("Error parsing keypress data");

    }
}
module.exports = { initWebSocket, piClient, frontendClient };