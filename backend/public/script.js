let piConnected = false;
let usbStatus = "Unknown";
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
        }

        // Handle USB status updates
        if (data.usbStatus !== undefined) {
            console.log('USB status update received:', data.usbStatus);
            usbStatus = data.usbStatus;
            updateUSBStatus();
        }

        // Show buttons and update device info if available
        if (data.showButtons) {
            console.log('`showButtons` is true. Updating UI with device info:', data.deviceInfo);
            showButtonPanel();
            updateDeviceStatus(`Device Info: ${JSON.stringify(data.deviceInfo)}`);
        } else {
            console.warn('`showButtons` is missing or false:', data);
        }
    });

    // Handle connection close
    socket.addEventListener('close', () => {
        console.log('Disconnected from WebSocket server');
        piConnected = false;
        hideButtonPanel();
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
    const configButton = document.getElementById("configButton");
    const restartButton = document.getElementById("restartButton");

    if (piConnected) {
        blockButton.disabled = false;
        allowButton.disabled = false;
        restartButton.disabled = false;
        updateDeviceStatus("Pi connected.");
    } else {
        blockButton.disabled = true;
        allowButton.disabled = true;
        updateDeviceStatus("Awaiting Pi connection...");
    }
}

// Update the USB status display
function updateUSBStatus() {
    const usbStatusElement = document.getElementById("usbStatus");
    if (usbStatusElement) {
        usbStatusElement.textContent = `USB Status: ${usbStatus}`;
    } else {
        console.error("`usbStatus` element not found in the DOM.");
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

document.getElementById("configButton").addEventListener("click", () => {
    window.location.href = "./config_page/configpage.html";
});

// Utility functions for UI updates
function updateDeviceStatus(statusText) {
    const statusElement = document.getElementById("deviceStatusText");
    if (statusElement) {
        statusElement.textContent = statusText;
    } else {
        console.error("`deviceStatusText` element not found in the DOM.");
    }
}

function showButtonPanel() {
    const buttonPanel = document.getElementById("buttonPanel");
    if (buttonPanel) {
        buttonPanel.style.display = "flex"; // Make the top panel visible
    } else {
        console.error("`buttonPanel` element not found in the DOM.");
    }
}

function hideButtonPanel() {
    const buttonPanel = document.getElementById("buttonPanel");
    if (buttonPanel) {
        buttonPanel.style.display = "none"; // Hide the top panel
    } else {
        console.error("`buttonPanel` element not found in the DOM.");
    }
}

// Initialize the WebSocket connection
initializeWebSocket();

