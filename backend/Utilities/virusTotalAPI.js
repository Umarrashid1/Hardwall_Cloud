const apiKey = 'be1a57391e9307e961c17d32134b2e81c1f68073cefd5407ba96b6f67e315791'; // TEMP API KEY
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch'); // For HTTP requests

// Upload a file to VirusTotal
async function uploadFileToVirusTotal(filePath) {
    const fileStream = fs.createReadStream(filePath);
    const formData = new FormData();
    formData.append('file', fileStream);

    const url = 'https://www.virustotal.com/api/v3/files';
    const options = {
        method: 'POST',
        headers: {
            'x-apikey': apiKey,
            ...formData.getHeaders(),
        },
        body: formData,
    };

    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            console.error('Failed to upload file:', response.status, response.statusText);
            return null;
        }

        const data = await response.json();
        console.log('File uploaded successfully:', data);
        return data.data.id; // Return the analysis ID
    } catch (error) {
        console.error('Error uploading file:', error);
        return null;
    }
}

// Fetch analysis report
async function fetchAnalysisResults(analysisId) {
    const url = `https://www.virustotal.com/api/v3/analyses/${analysisId}`;
    const options = {
        method: 'GET',
        headers: {
            'x-apikey': apiKey,
        },
    };

    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            console.error('Failed to fetch analysis:', response.status, response.statusText);
            return null;
        }

        const data = await response.json();
        console.log('Analysis results:', data);

        // Extract meaningful counts
        const stats = data.data.attributes.stats;
        return {
            malicious: stats.malicious || 0,
            suspicious: stats.suspicious || 0,
            undetected: stats.undetected || 0,
        };
    } catch (error) {
        console.error('Error fetching analysis results:', error);
        return null;
    }
}

// Function to scan a directory
async function scanDirectoryVirusTotal(directoryPath, ws) {
    const fileNames = fs.readdirSync(directoryPath).map(file => path.join(directoryPath, file));

    for (const filePath of fileNames) {
        console.log(`Scanning file: ${filePath}`);

        const analysisId = await uploadFileToVirusTotal(filePath);
        if (analysisId) {
            console.log('Waiting for VirusTotal to process the file...');

            // Wait briefly for the analysis to complete (VirusTotal might take a few seconds)
            await new Promise(resolve => setTimeout(resolve, 10000));

            const scanResults = await fetchAnalysisResults(analysisId);
            if (scanResults) {
                const result = {
                    malicious: scanResults.malicious,
                    suspicious: scanResults.suspicious,
                    undetected: scanResults.undetected,
                    detailsUrl: `https://www.virustotal.com/gui/file/${analysisId}`
                };

                // Send results back to the WebSocket client
                ws.send(JSON.stringify({
                    type: 'virusTotalResult',
                    filePath: path.basename(filePath),
                    scanResult: result,
                }));
            }
        }
    }
}

module.exports = {
    scanDirectoryVirusTotal
};