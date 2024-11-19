let piConnected = false;
let socket;

// Initialize WebSocket connection and event listeners
function initializeWebSocket() {
    socket = new WebSocket('ws://130.225.37.50:3000');

    // Handle successful connection
    socket.addEventListener('open', () => {
        console.log('Connected to WebSocket server');
        // Optionally request initial Pi status
        socket.send(JSON.stringify({ action: 'checkPiStatus' }));
    });

    // Handle incoming messages
    socket.addEventListener('message', (event) => {
        console.log('Raw message from backend:', event.data); // Debug raw message

        let data;
        try {
            data = JSON.parse(event.data);
            console.log('Parsed data from backend:', data); // Debug parsed data
        } catch (error) {
            console.error('Error parsing WebSocket message:', error, event.data);
            return;
        }

        // Update Pi connection status
        if (data.piConnected !== undefined) {
            piConnected = data.piConnected;
            updateUIBasedOnPiStatus();
        } else {
            console.warn('No `piConnected` field in message:', data);
        }

        // Show buttons and update device info if available
        if (data.showButtons) {
            console.log('`showButtons` is true. Updating UI with device info:', data.deviceInfo);
            showTopPanel();
            updateDeviceStatus(`Device Info: ${JSON.stringify(data.deviceInfo)}`);
        } else {
            console.warn('`showButtons` is missing or false:', data);
        }
    });

    // Handle connection close
    socket.addEventListener('close', () => {
        console.log('Disconnected from WebSocket server');
        piConnected = false;
        hideTopPanel();
        updateUIBasedOnPiStatus();

        // Attempt to reconnect
        setTimeout(() => {
            console.log('Attempting to reconnect...');
            initializeWebSocket();
        }, 5000); // Retry every 5 seconds
    });

    // Handle errors
    socket.addEventListener('error', (error) => {
        console.error('WebSocket error:', error);
    });
}

// Update the UI based on the Pi's connection status
function updateUIBasedOnPiStatus() {
    const blockButton = document.getElementById("blockButton");
    const allowButton = document.getElementById("allowButton");

    if (piConnected) {
        blockButton.disabled = false;
        allowButton.disabled = false;
        updateDeviceStatus("Pi connected.");
    } else {
        blockButton.disabled = true;
        allowButton.disabled = true;
        updateDeviceStatus("Awaiting Pi connection...");
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

// Initialize the WebSocket connection
initializeWebSocket();
