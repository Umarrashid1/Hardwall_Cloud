let piConnected = false;
let usbStatus = "Unknown";
let deviceInfoReceived = false;
let socket;
import { updateVirusTotalResults } from './virusTotalFrontend.js';

function initializeWebSocket() {
    socket = new WebSocket('ws://130.225.37.50:3000');

    socket.addEventListener('open', () => {
        console.log('Connected to WebSocket server');
        socket.send(JSON.stringify({ action: 'checkPiStatus' }));
    });

    socket.addEventListener('message', (event) => {
        let scanResults;
        let filePath;
        try {
            const data = JSON.parse(event.data);

            if (data.piConnected !== undefined) {
                piConnected = data.piConnected;
                updateUIBasedOnPiStatus();
            }

            if (data.type === "status") {
                usbStatus = data.piStatus;
                updateUSBStatus();
            }

            if (data.type === "virusTotalResult") {
                scanResults = data.scanResult
                filePath = data.filePath
                updateVirusTotalResults(filePath, scanResults)
            }

            if (data.type === "device_summary") {
                displayDeviceSummary(data.device_info);
            }
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    });

    socket.addEventListener('close', () => {
        console.log('Disconnected from WebSocket server');
        piConnected = false;
        hideButtons();
        setTimeout(initializeWebSocket, 5000);
    });

    socket.addEventListener('error', (error) => {
        console.error('WebSocket error:', error);
    });
}

function updateUIBasedOnPiStatus() {
    const deviceStatusText = document.getElementById("deviceStatusText");
    deviceStatusText.textContent = piConnected ? "Pi connected." : "Awaiting Pi connection...";
}

function updateUSBStatus() {
    const usbStatusElement = document.getElementById("usbStatus");
    usbStatusElement.textContent = `USB Status: ${usbStatus}`;
    updateButtonVisibility();
}

function updateButtonVisibility() {
    const allowButton = document.getElementById("allowButton");
    const blockButton = document.getElementById("blockButton");

    if (usbStatus === "block" && deviceInfoReceived) {
        allowButton.disabled = false;
        blockButton.disabled = true;
    } else if (usbStatus === "allow") {
        allowButton.disabled = true;
        blockButton.disabled = false;
    } else {
        allowButton.disabled = true;
        blockButton.disabled = true;
    }
}

function displayDeviceSummary(deviceInfo) {
    const deviceInfoElement = document.getElementById("deviceInfo");
    deviceInfoElement.textContent = `
        Vendor ID: ${deviceInfo.vendor_id || "Unknown"}
        Product ID: ${deviceInfo.product_id || "Unknown"}
        Drivers: ${deviceInfo.drivers?.join(", ") || "None"}
    `;
    deviceInfoReceived = true;
    updateButtonVisibility();
}


document.getElementById("allowButton").addEventListener("click", () => {
    if (piConnected) {
        socket.send(JSON.stringify({ action: "allow" }));
    }
});

document.getElementById("blockButton").addEventListener("click", () => {
    if (piConnected) {
        socket.send(JSON.stringify({ action: "block" }));
    }
});



initializeWebSocket();