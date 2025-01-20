let piConnected = false;
let usbStatus = "Unknown";
let deviceInfoReceived = false;
let socket;
let storage = null;


function initializeWebSocket() {
    socket = new WebSocket('ws://130.225.37.50:3000');

    socket.addEventListener('open', () => {
        console.log('Connected to WebSocket server');
        socket.send(JSON.stringify({ action: 'checkPiStatus' }));
    });

    socket.addEventListener('message', (event) => {
        let scanResults;
        let filePath;
        let findings;

        try {
            const data = JSON.parse(event.data);

            if (data.piConnected !== undefined) {
                piConnected = data.piConnected;
                updateUIBasedOnPiStatus();
            }

            if (data.type === "status") {
                usbStatus = data.piStatus;
                updateUSBStatus();
            }
            if (data.type === "show_button") {
                usbStatus = data.piStatus;
                storage = 0
                updateUSBStatus();
            }


            if (data.type === "storage_device") {
                usbStatus = data.piStatus;
                storage = 1
            }

            if (data.type === 'aiFindings') {
                console.log(data.findings)
                findings = data.findings;
                // Get the container to display findings
                const scannerOutput = document.getElementById("scannerOutput");
                if (!scannerOutput) {
                    console.error("Element with ID 'scannerOutput' not found.");
                    return;
                }

                // Clear previous content
                scannerOutput.innerHTML = "";

                // Iterate over findings and display each file's results
                findings.forEach(file => {
                    const fileDiv = document.createElement('div');
                    fileDiv.classList.add('file-result');

                    let formattedResults = "";

                    // Check if results is an array and format Prediction and Probability
                    if (Array.isArray(file.results) && file.results.length > 0) {
                        formattedResults = file.results.map(result => {
                            return `
                    <strong>Prediction:</strong> ${result.Prediction}<br>
                    <strong>Probability:</strong> ${(result.Probability * 100).toFixed(2)}%
                `;
                        }).join("");
                    } else {
                        formattedResults = "No Results";
                    }

                    // Add the file name and results to the container
                    fileDiv.innerHTML = `
            <strong>File:</strong> ${file.file_name || "Unknown"}<br>
            ${formattedResults}
        `;
                    scannerOutput.appendChild(fileDiv);
                });
            }


            if (data.type === "virusTotalResult") {
                scanResults = data.scanResult
                filePath = data.filePath
                console.log(scanResults)
                console.log(filePath)
                updateVirusTotalResults(filePath, scanResults)
            }

            if (data.type === "device_summary") {
                deviceInfoReceived = true; // Add this line
                displayDeviceSummary(data.device_info);
            }
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    });

    socket.addEventListener('close', () => {
        console.log('Disconnected from WebSocket server');
        piConnected = false;
        hideButtons();
        setTimeout(initializeWebSocket, 5000);
    });

    socket.addEventListener('error', (error) => {
        console.error('WebSocket error:', error);
    });
}

function updateUIBasedOnPiStatus() {
    const deviceStatusText = document.getElementById("deviceStatusText");
    deviceStatusText.textContent = piConnected ? "Pi connected." : "Awaiting Pi connection...";
}

function updateUSBStatus() {
    console.log(`Current usbStatus: ${usbStatus}`);
    const usbStatusElement = document.getElementById("usbStatus");
    usbStatusElement.textContent = `USB Status: ${usbStatus}`;
    updateButtonVisibility();
}

function updateButtonVisibility() {
    const allowButton = document.getElementById("allowButton");
    const blockButton = document.getElementById("blockButton");

    if (usbStatus === "block" && deviceInfoReceived) {
        allowButton.disabled = false;
        blockButton.disabled = true;
    } else if (usbStatus === "allow") {
        allowButton.disabled = true;
        blockButton.disabled = false;
    } else {
        allowButton.disabled = true;
        blockButton.disabled = true;
    }
}

function displayDeviceSummary(deviceInfo) {
    console.log("Received deviceInfo:", deviceInfo); // Debug output

    const deviceInfoElement = document.getElementById("deviceInfo");

    const formattedDrivers = Array.isArray(deviceInfo.drivers)
        ? deviceInfo.drivers.join(", ")
        : "None";

    const formattedInfo = `
        <strong>Vendor ID:</strong> ${deviceInfo.vendor_id || "Unknown"}<br>
        <strong>Product ID:</strong> ${deviceInfo.product_id || "Unknown"}<br>
        <strong>Vendor:</strong> ${deviceInfo.vendor || "Unknown"}<br>
        <strong>Model:</strong> ${deviceInfo.model || "Unknown"}<br>
        <strong>Serial:</strong> ${deviceInfo.serial || "Unknown"}<br>
        <strong>Subsystem:</strong> ${deviceInfo.subsystem || "Unknown"}<br>
        <strong>Bus Number:</strong> ${deviceInfo.busnum || "Unknown"}<br>
        <strong>Device Number:</strong> ${deviceInfo.devnum || "Unknown"}<br>
        <strong>Drivers:</strong> ${formattedDrivers}
    `;
    deviceInfoElement.innerHTML = formattedInfo;

    if(storage == null){
        updateButtonVisibility()
    }
}


document.getElementById("allowButton").addEventListener("click", () => {
    if (piConnected) {
        socket.send(JSON.stringify({ action: "allow" }));
    }
});

document.getElementById("blockButton").addEventListener("click", () => {
    if (piConnected) {
        socket.send(JSON.stringify({ action: "block" }));
    }
});



initializeWebSocket();