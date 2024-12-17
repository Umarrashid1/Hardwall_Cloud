// VirusTotal Backend
const apiKey = 'be1a57391e9307e961c17d32134b2e81c1f68073cefd5407ba96b6f67e315791'; // TEMP API KEY

require('dotenv').config(); // Load environment variables
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch'); // Use `node-fetch` for HTTP requests


async function initiateVirusScan(filePath) {
    const fileStream = fs.createReadStream(filePath); // Stream the file
    const formData = new FormData();
    formData.append('file', fileStream);

    const url = 'https://www.virustotal.com/api/v3/files';
    const options = {
        method: 'POST',
        headers: {
            'x-apikey': apiKey,
            ...formData.getHeaders(), // Include form headers
        },
        body: formData,
    };

    try {
        const response = await fetch(url, options);
        if (response.ok) {
            const data = await response.json();
            console.log('File uploaded successfully:', data);
            return data;
        } else {
            console.error('Error uploading file:', response.status, response.statusText);
            return null;
        }
    } catch (error) {
        console.error('Network error while uploading file:', error);
        return null;
    }
}
// Function to scan all files in a directory
async function scanDirectoryVirusTotal(directoryPath, ws) {
    const fileNames = fs.readdirSync(directoryPath).map(file => path.join(directoryPath, file));

    for (const filePath of fileNames) {
        console.log(`Scanning file: ${filePath}`);
        const stats = await initiateVirusScan(filePath);
        if (stats) {
            // Simulated scan results for the UI
            const scanResults = {
                malicious: stats.malicious || 0,
                suspicious: stats.suspicious || 0,
                undetected: stats.undetected || 0,
                detailsUrl: `https://www.virustotal.com/gui/file/${stats.id}`, // Hypothetical URL for extended details
            };

            ws.send(JSON.stringify({
                type: 'virusTotalResult',
                filepath: path.basename(filePath),
                scanResult: scanResults
            }));

        }
    }
}
module.exports = {
    scanDirectoryVirusTotal
};
