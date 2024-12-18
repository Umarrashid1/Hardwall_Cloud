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
        console.log('Received response: ', response);
        if (response.predictions) {
            console.log('Predictions:', response.predictions);
        }
        if (response.data) {
            console.log('Data:', response.data);
        }
        if (response.error) {
            console.error('Error in predictions:', response.error);
        }
    }).catch((error) => {
        console.error('Error posting keystrokes:', error);
    });
} else {
    console.error("Error parsing keypress data");
}
//uh idk, hvordan dataen egentligt skal se ud.. her er dataen som service modtager:
//Received request:
// [
//   {'VK': 81, 'HT': 10, 'FT': -1}, 
//   {'VK': 77, 'HT': 80, 'FT': 133}, 
//   {'VK': 77, 'HT': 85, 'FT': 830}, 
//   {'VK': 81, 'HT': 95, 'FT': 1962}, 
//   {'VK': 68, 'HT': 2015, 'FT': 862}, 
//   {'VK': 65, 'HT': 84559951, 'FT': -1}
// ]

// response fra service:
// received response:  { predictions: [ 1 ] }