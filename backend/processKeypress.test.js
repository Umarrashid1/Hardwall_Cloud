const { processKeypressData } = require("./Utilities/keypressParser"); // Adjust the path to your module
const WebSocket = require("ws");

// Mock WebSocket clients
global.piClient = { send: (msg) => console.log("Mock Pi Send:", msg) };
global.frontendClient = { readyState: WebSocket.OPEN, send: (msg) => console.log("Frontend Send:", msg) };

// Example keypress data
const sampleKeypressData = [
    { timestamp: "2024-12-17 16:25:24.480", endpoint: "EP81", data: ["0", "4"] },
    { timestamp: "2024-12-17 16:25:51.327", endpoint: "EP81", data: ["0"] },
    { timestamp: "2024-12-17 16:25:51.428", endpoint: "EP81", data: ["0", "5"] },
    { timestamp: "2024-12-17 16:25:52.189", endpoint: "EP81", data: ["0"] },
    { timestamp: "2024-12-17 16:25:52.268", endpoint: "EP81", data: ["0", "6"] },
    { timestamp: "2024-12-17 16:25:52.587", endpoint: "EP81", data: ["0"] }
];

// Call the function directly
console.log("Starting processKeypressData Test...");

processKeypressData(sampleKeypressData);