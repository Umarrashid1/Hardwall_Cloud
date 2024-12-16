const WebSocket = require('ws');
const { createServer } = require('http');
const { initWebSocket } = require('../Utilities/websocketHandler'); // Adjust the path as needed

let server;
let port;
let wss;

// Helper to create WebSocket clients
const createWebSocketClient = (port, headers = {}) => {
    return new WebSocket(`ws://localhost:${port}`, { headers });
};

// Initialize the server before running tests
beforeAll((done) => {
    server = createServer();
    initWebSocket(server); // Initialize your WebSocket server

    server.listen(() => {
        port = server.address().port; // Dynamically get the assigned port
        done();
    });
});

// Close the server after tests are complete
afterAll(() => {
    server.close();
});

describe('WebSocket Handler', () => {
    test('Pi client connects successfully', (done) => {
        const client = createWebSocketClient(port, { 'x-device-type': 'Pi' });

        client.on('open', () => {
            expect(client.readyState).toBe(WebSocket.OPEN); // Check that the WebSocket is open
            client.close();
            done();
        });
    });

    test('Frontend client connects successfully', (done) => {
        const client = createWebSocketClient(port);

        client.on('open', () => {
            expect(client.readyState).toBe(WebSocket.OPEN); // Check that the WebSocket is open
            client.close();
            done();
        });
    });

    test('Frontend receives Pi connection status', (done) => {
        const piClient = createWebSocketClient(port, { 'x-device-type': 'Pi' });
        const frontendClient = createWebSocketClient(port);

        frontendClient.on('open', () => {
            frontendClient.on('message', (message) => {
                const parsed = JSON.parse(message);
                expect(parsed).toEqual({ piConnected: true }); // Verify the message content
                frontendClient.close();
                piClient.close();
                done();
            });
        });
    });

    test('Pi sends device summary and frontend receives it', (done) => {
        const piClient = createWebSocketClient(port, { 'x-device-type': 'Pi' });
        const frontendClient = createWebSocketClient(port);

        frontendClient.on('open', () => {
            piClient.on('open', () => {
                piClient.send(
                    JSON.stringify({
                        type: 'device_summary',
                        device_info: 'usb-storage',
                        event_history: [],
                    })
                );
            });

            frontendClient.on('message', (message) => {
                const parsed = JSON.parse(message);
                expect(parsed.type).toBe('device_summary');
                expect(parsed.device_info).toBe('usb-storage');
                frontendClient.close();
                piClient.close();
                done();
            });
        });
    });

    test('Invalid JSON messages are handled', (done) => {
        const piClient = createWebSocketClient(port, { 'x-device-type': 'Pi' });

        piClient.on('open', () => {
            piClient.send('invalid json');
        });

        piClient.on('close', () => {
            // No crash should occur; ensure the connection is still functional
            expect(piClient.readyState).toBe(WebSocket.CLOSED);
            done();
        });

        piClient.on('error', (error) => {
            expect(error).toBeDefined();
        });
    });

    test('Frontend forwards allow command to Pi', (done) => {
        const piClient = createWebSocketClient(port, { 'x-device-type': 'Pi' });
        const frontendClient = createWebSocketClient(port);

        frontendClient.on('open', () => {
            piClient.on('open', () => {
                frontendClient.send(
                    JSON.stringify({
                        action: 'allow',
                    })
                );

                piClient.on('message', (message) => {
                    const parsed = JSON.parse(message);
                    expect(parsed.action).toBe('allow');
                    frontendClient.close();
                    piClient.close();
                    done();
                });
            });
        });
    });

    test('Frontend forwards block command to Pi', (done) => {
        const piClient = createWebSocketClient(port, { 'x-device-type': 'Pi' });
        const frontendClient = createWebSocketClient(port);

        frontendClient.on('open', () => {
            piClient.on('open', () => {
                frontendClient.send(
                    JSON.stringify({
                        action: 'block',
                    })
                );

                piClient.on('message', (message) => {
                    const parsed = JSON.parse(message);
                    expect(parsed.action).toBe('block');
                    frontendClient.close();
                    piClient.close();
                    done();
                });
            });
        });
    });
});