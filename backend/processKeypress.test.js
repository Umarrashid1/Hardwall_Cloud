const { parseKeypressData } = require("./Utilities/keypressParser"); // Adjust the path to your module
const WebSocket = require("ws");
const { postKeystrokes } = require("./clusterServiceScripts");
// Mock WebSocket clients
global.piClient = { send: (msg) => console.log("Mock Pi Send:", msg) };
global.frontendClient = { readyState: WebSocket.OPEN, send: (msg) => console.log("Frontend Send:", msg) };

// Example keypress data
const sampleKeypressData = [
    { timestamp: '2024-12-16 16:55:52.358', endpoint: 'EP81', data: ['0', '0', '4', '0', '0', '0', '0', '0'] }, // 'A' pressed
    { timestamp: '2024-12-17 16:25:12.309', endpoint: 'EP81', data: ['0', '0', '20', '0', '0', '0', '0', '0'] }, // 'Q' pressed
    { timestamp: '2024-12-17 16:25:12.319', endpoint: 'EP81', data: ['0', '0', '0', '0', '0', '0', '0', '0'] },  // Released
    { timestamp: '2024-12-17 16:25:13.149', endpoint: 'EP81', data: ['0', '0', '16', '0', '0', '0', '0', '0'] }, // Shift pressed
    { timestamp: '2024-12-17 16:25:13.181', endpoint: 'EP81', data: ['0', '0', '16', '7', '0', '0', '0', '0'] }, // Shift + D pressed
    { timestamp: '2024-12-17 16:25:13.234', endpoint: 'EP81', data: ['0', '0', '7', '0', '0', '0', '0', '0'] },  // 'D' pressed
    { timestamp: '2024-12-17 16:25:15.196', endpoint: 'EP81', data: ['0', '0', '20', '0', '0', '0', '0', '0'] }, // 'Q' pressed
    { timestamp: '2024-12-17 16:25:15.291', endpoint: 'EP81', data: ['0', '0', '0', '0', '0', '0', '0', '0'] },  // Released
    { timestamp: '2024-12-17 16:25:15.424', endpoint: 'EP81', data: ['0', '0', '16', '0', '0', '0', '0', '0'] }, // Shift pressed
    { timestamp: '2024-12-17 16:25:15.504', endpoint: 'EP81', data: ['0', '0', '0', '0', '0', '0', '0', '0'] }   // Released
];

// Call the function directly
console.log("Starting processKeypressData Test...");

const parsedKeypressData = parseKeypressData(sampleKeypressData);
console.log("Parsed Keypress Data:", parsedKeypressData);

if (parsedKeypressData) {
    postKeystrokes(parsedKeypressData).then((response) => {
        console.log(response);
        if (response.predictions) {
            console.log('Predictions:', response.predictions);
        }
    }).catch((error) => {
        console.error('Error posting keystrokes:', error);
    });
} else {
    console.error("Error parsing keypress data");
}