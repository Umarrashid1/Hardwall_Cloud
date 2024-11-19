// Connect to the WebSocket server
const socket = new WebSocket('ws://localhost:8080');

socket.addEventListener('open', () => {
    console.log('Connected to WebSocket server');
});

socket.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    console.log('Received data from backend:', data);

    if (data.showButtons) {
        showTopPanel();
        updateDeviceStatus(`Device Info: ${JSON.stringify(data.deviceInfo)}`);
    }
});

socket.addEventListener('close', () => {
    console.log('Disconnected from WebSocket server');
});

socket.addEventListener('error', (error) => {
    console.error('WebSocket error:', error);
});

// Event listeners for side panel buttons
document.getElementById("homeButton").addEventListener("click", () => {
    console.log("Home button clicked");
    // Placeholder for any future backend call or logic
});

document.getElementById("aboutButton").addEventListener("click", () => {
    console.log("About button clicked");
    // Placeholder for any future backend call or logic
});

document.getElementById("contactButton").addEventListener("click", () => {
    console.log("Contact button clicked");
    // Placeholder for any future backend call or logic
});

// Event listeners for block and allow buttons
document.getElementById("blockButton").addEventListener("click", () => {
    console.log('Sending block command via WebSocket');
    socket.send(JSON.stringify({ action: 'block' }));
});

document.getElementById("allowButton").addEventListener("click", () => {
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
