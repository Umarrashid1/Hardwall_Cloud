let piConnected = false;
let usbStatus = "Unknown";
let socket;


// Initialize WebSocket connection and event listeners
function initializeWebSocket() {
    // socket = new WebSocket('ws://130.225.37.50:3000');
    socket = new WebSocket('ws://localhost:4000');
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
            usbStatus = data.status
            updateUIBasedOnPiStatus();
            updateUSBStatus();
        }



        if (data.type === "Status") {
            console.log("Received device status:", data);
            usbStatus = data.status;
            updateUSBStatus();
        }

        if (data.type === "deviceInfo") {
            console.log("Received device info:", data.lsusb_output);
            console.log('Updating UI with device info:', data.deviceInfo);
            showButtonPanel();
            updateDeviceStatus(`Device Info: ${JSON.stringify(data.lsusb_output)}`);
        }

        if (data.type === "scanningResults") {
            console.log("Received scanning results:", data.results);
            updateScannerStatus(JSON.stringify(data.results));

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
    console.log("Executing updateUSBStatus...");
    const usbStatusElement = document.getElementById("usbStatus");
    console.log("usbStatusElement found:", usbStatusElement); // Log the element
    console.log("Current usbStatus value:", usbStatus); // Log the status value
    if (usbStatusElement) {
        usbStatusElement.textContent = `USB Status: ${usbStatus}`;
        console.log("Updated USB status in DOM to:", usbStatusElement.textContent); // Confirm update
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
    window.location.href = "./configpage.html";
});
document.getElementById("restartButton").addEventListener("click", () => {
    if (!piConnected) {
        console.warn('Cannot send restart command. Pi is not connected.');
        return;
    }
    console.log('Sending restart command via WebSocket');
    socket.send(JSON.stringify({ action: 'restart' }));
});

document.getElementById("fullLogsButton").addEventListener("click", () => {
    showFullLogsModal();
});

document.getElementById("closeModalButton").addEventListener("click", () => {
    const modal = document.getElementById("fullLogsModal");
    if (modal) {
        modal.style.display = "none"; // Hide the modal
    }
});

document.getElementById("fullLogsButton").addEventListener("click", () => {
    updateLogModalText("Updated Logs Heading", "This is the updated text for the full logs.");
    showFullLogsModal();
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

function updateScannerStatus(scannerOutputText) {
    const statusElement = document.getElementById("scannerOutput");
    if (statusElement) {
        statusElement.textContent = scannerOutputText;
    } else {
        console.error("`scannerOutput` element not found in the DOM.");
    }
}

function showButtonPanel() {
    const buttonPanel = document.getElementById("buttonPanel");
    if (buttonPanel) {
        buttonPanel.style.display = "flex"; // Make the button panel visible
    } else {
        console.error("`buttonPanel` element not found in the DOM.");
    }
}
function showFullLogsModal() {
    const modal = document.getElementById("fullLogsModal");
    if (modal) {
        modal.style.display = "block"; // Show the modal
    } else {
        console.error("`fullLogsModal` element not found in the DOM.");
    }
}
// Todo: Umar - Update the modal text <<<<<<<<<<<<<<
function updateLogModalText(headingText, bodyText) {
    const modal = document.getElementById("fullLogsModal");

    if (modal) {
        const heading = modal.querySelector("h2");
        if (heading) {
            heading.textContent = headingText;
        }

        const paragraph = modal.querySelector("p");
        if (paragraph) {
            paragraph.textContent = bodyText;
        }
    } else {
        console.error("`fullLogsModal` element not found in the DOM.");
    }
}



function hideButtonPanel() {
    const buttonPanel = document.getElementById("buttonPanel");
    if (buttonPanel) {
        buttonPanel.style.display = "none"; // Hide the button panel
    } else {
        console.error("`buttonPanel` element not found in the DOM.");
    }
}

// Initialize the WebSocket connection
initializeWebSocket();

