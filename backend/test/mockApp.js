const express = require('express');
const path = require('path');
const createMockWebSocketServer = require('./mockServer'); // Import the mock WebSocket server

const MOCK_SERVER_PORT = 4000; // Port for the mock WebSocket server
const EXPRESS_PORT = 3000; // Port for the mock Express server

// Start the mock WebSocket server
createMockWebSocketServer(MOCK_SERVER_PORT);

// Start the Express server
const app = express();

// Serve the frontend files (update path if necessary)
app.use(express.static(path.resolve(__dirname, '../public')));

// Listen on the specified port
app.listen(EXPRESS_PORT, () => {
    console.log(`Mock Express server is running at http://localhost:${EXPRESS_PORT}`);
    console.log(`Mock WebSocket server is running at ws://localhost:${MOCK_SERVER_PORT}`);
});