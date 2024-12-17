const { processKeypressData } = require("./Utilities/keypressParser"); // Adjust the path to your module
const WebSocket = require("ws");

// Mock WebSocket clients
global.piClient = { send: (msg) => console.log("Mock Pi Send:", msg) };
global.frontendClient = { readyState: WebSocket.OPEN, send: (msg) => console.log("Frontend Send:", msg) };

// Example keypress data
const sampleKeypressData = [
    { timestamp: '2024-12-16 16:55:52.358', endpoint: 'EP81', data: ['0', '0', '0', '0', '0', '0', '0', '0'] },
    { timestamp: '2024-12-17 16:25:12.309', endpoint: 'EP81', data: ['0', '0', '20', '0', '0', '0', '0', '0'] },
    { timestamp: '2024-12-17 16:25:12.319', endpoint: 'EP81', data: ['0', '0', '0', '0', '0', '0', '0', '0'] },
    { timestamp: '2024-12-17 16:25:13.149', endpoint: 'EP81', data: ['0', '0', '16', '0', '0', '0', '0', '0'] },
    { timestamp: '2024-12-17 16:25:13.181', endpoint: 'EP81', data: ['0', '0', '16', '7', '0', '0', '0', '0'] },
    { timestamp: '2024-12-17 16:25:13.234', endpoint: 'EP81', data: ['0', '0', '7', '0', '0', '0', '0', '0'] },
    { timestamp: '2024-12-17 16:25:15.196', endpoint: 'EP81', data: ['0', '0', '16', '0', '0', '0', '0', '0'] },
    { timestamp: '2024-12-17 16:25:15.291', endpoint: 'EP81', data: ['0', '0', '0', '0', '0', '0', '0', '0'] },
    { timestamp: '2024-12-17 16:25:15.424', endpoint: 'EP81', data: ['0', '0', '16', '0', '0', '0', '0', '0'] },
    { timestamp: '2024-12-17 16:25:15.504', endpoint: 'EP81', data: ['0', '0', '0', '0', '0', '0', '0', '0'] },
    { timestamp: '2024-12-17 16:25:24.470', endpoint: 'EP81', data: ['0', '0', '1a', '0', '0', '0', '0', '0'] }
];

// Call the function directly
console.log("Starting processKeypressData Test...");

processKeypressData(sampleKeypressData);