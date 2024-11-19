let piConnected = false;

// Connect to the WebSocket server
const socket = new WebSocket('ws://localhost:8080');

socket.addEventListener('open', () => {
    console.log('Connected to WebSocket server');
});

socket.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    console.log('Received data from backend:', data);

    if (data.piConnected !== undefined) {
        piConnected = data.piConnected;
        updateUIBasedOnPiStatus();
    }

    if (data.showButtons) {
        showTopPanel();
        updateDeviceStatus(`Device Info: ${JSON.stringify(data.deviceInfo)}`);
    }
});

socket.addEventListener('close', () => {
    console.log('Disconnected from WebSocket server');
    piConnected = false;
    updateUIBasedOnPiStatus();
});

socket.addEventListener('error', (error) => {
    console.error('WebSocket error:', error);
});

// Update the UI based on the Pi's connection status
function updateUIBasedOnPiStatus() {
    const blockButton = document.getElementById("blockButton");
    const allowButton = document.getElementById("allowButton");

    if (piConnected) {
        blockButton.disabled = false;
        allowButton.disabled = false;
    } else {
        blockButton.disabled = true;
        allowButton.disabled = true;
    }
}

// Event listeners for block and allow buttons
document.getElementById("blockButton").addEventListener("click", () => {
    if (!piConnected) {
        console.warn('Cannot send block command. Pi is not connected.');
        return;
    }
    console.log('Sending block command via WebSocket');
    socket.send(JSON.stringify({ action: 'block' }));
});

document.getElementById("allowButton").addEventListener("click", () => {
    if (!piConnected) {
        console.warn('Cannot send allow command. Pi is not connected.');
        return;
    }
    console.log('Sending allow command via WebSocket');
    socket.send(JSON.stringify({ action: 'allow' }));
});

// Utility functions for UI updates
function updateDeviceStatus(statusText) {
    const statusElement = document.getElementById("deviceStatusText");
    statusElement.textContent = statusText;
}

function showTopPanel() {
    const topPanel = document.getElementById("topPanel");
    topPanel.style.display = "flex"; // Make the top panel visible
}

function hideTopPanel() {
    const topPanel = document.getElementById("topPanel");
    topPanel.style.display = "none"; // Hide the top panel
}
