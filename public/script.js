// Event Listeners for Side Panel Buttons
document.getElementById("homeButton").addEventListener("click", () => {
    console.log("Home button clicked");
    // Placeholder for backend call
});

document.getElementById("aboutButton").addEventListener("click", () => {
    console.log("About button clicked");
    // Placeholder for backend call
});

document.getElementById("contactButton").addEventListener("click", () => {
    console.log("Contact button clicked");
    // Placeholder for backend call
});

// Event Listeners for Top Panel Buttons
document.getElementById("blockButton").addEventListener("click", () => {
    console.log("Block button clicked");
    // Placeholder for backend call
});

document.getElementById("allowButton").addEventListener("click", () => {
    console.log("Allow button clicked");
    // Placeholder for backend call
});

document.getElementById("configureButton").addEventListener("click", () => {
    console.log("Configure button clicked");
    // Placeholder for backend call
});

// Updating Device Status Placeholder
function updateDeviceStatus(statusText) {
    const statusElement = document.getElementById("deviceStatusText");
    statusElement.textContent = statusText;
}

// Example usage: Simulate status update
updateDeviceStatus("No device available");
