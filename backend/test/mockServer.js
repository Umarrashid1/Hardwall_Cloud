const WebSocket = require("ws");

function createMockWebSocketServer(port) {
    const server = new WebSocket.Server({ port });

    console.log(`Mock WebSocket server running on ws://localhost:${port}`);

    server.on("connection", (ws, req) => {
        console.log("Frontend client connected to mock WebSocket");

        // Simulate RPI connection status
        ws.send(JSON.stringify({ piConnected: false }));

        // Periodically send device summaries
        const deviceSummaryInterval = setInterval(() => {
            ws.send(
                JSON.stringify({
                    type: "device_summary",
                    device_info: "Mock USB Device",
                    event_history: [{ timestamp: new Date().toISOString(), event: "Mock Event" }],
                })
            );
            console.log("Sent mock device summary.");
        }, 5000); // Every 5 seconds

        // Handle messages from frontend
        ws.on("message", (message) => {
            console.log("Received from frontend:", message);

            const parsedMessage = JSON.parse(message);
            switch (parsedMessage.action) {
                case "checkPiStatus":
                    ws.send(JSON.stringify({ piConnected: true })); // Mock connected state
                    console.log("Sent mock Pi status.");
                    break;

                case "allow":
                    console.log("Mock: Allow command received.");
                    ws.send(JSON.stringify({ type: "response", message: "Allow command executed in mock mode" }));
                    simulateUsbActivity(ws, "allow"); // Simulate USB activity on "allow"
                    break;

                case "block":
                    console.log("Mock: Block command received.");
                    ws.send(JSON.stringify({ type: "response", message: "Block command executed in mock mode" }));
                    break;

                case "restart":
                    console.log("Mock: Restart command received.");
                    ws.send(JSON.stringify({ type: "response", message: "Restart command executed in mock mode" }));
                    break;

                default:
                    ws.send(JSON.stringify({ type: "error", message: `Unknown action: ${parsedMessage.action}` }));
                    console.warn("Unhandled command:", parsedMessage.action);
            }
        });

        ws.on("close", () => {
            console.log("Frontend client disconnected");
            clearInterval(deviceSummaryInterval); // Stop sending device summaries
        });
    });

    return server;
}

// Simulate USB activity based on commands
function simulateUsbActivity(ws, status) {
    if (status === "allow") {
        setTimeout(() => {
            ws.send(
                JSON.stringify({
                    type: "device_summary",
                    device_info: "Allowed USB Device",
                    event_history: [
                        { timestamp: new Date().toISOString(), event: "Device allowed for interaction" },
                    ],
                })
            );
            console.log("Simulated allowed USB device activity.");
        }, 2000); // Simulate activity after 2 seconds
    }
}

module.exports = createMockWebSocketServer;