
const apiKey = 'be1a57391e9307e961c17d32134b2e81c1f68073cefd5407ba96b6f67e315791'; // TEMP API KEY
const UPLOAD_DIR = "/home/ubuntu/box"; // Directory for files to be scanned

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
async function scanDirectoryVirusTotal(directoryPath) {
    const fileNames = fs.readdirSync(directoryPath).map(file => path.join(directoryPath, file));

    for (const filePath of fileNames) {
        console.log(`Scanning file: ${filePath}`);
        const stats = await initiateVirusScan(filePath);
        if (stats) {
            console.log(`Scan results for ${filePath}: Malicious - ${stats.malicious}, Suspicious - ${stats.suspicious}, Undetected - ${stats.undetected}`);
        }
    }
}




// Function to check the analysis status of a file
async function checkAnalysisStatus(analysisId) {
    const url = `https://www.virustotal.com/api/v3/analyses/${analysisId}`;
    const options = {
        method: 'GET',
        headers: {
            'x-apikey': apiKey,
        },
    };

    try {
        const response = await fetch(url, options);
        if (response.ok) {
            const data = await response.json();
            console.log('Analysis status:', data);
            return data;
        } else if (response.status === 429) {
            console.error('Rate limit exceeded. Retrying in 60 seconds...');
            await new Promise(resolve => setTimeout(resolve, 60000));
            return await checkAnalysisStatus(analysisId);
        } else {
            console.error('Error checking analysis status:', response.status, response.statusText);
            return null;
        }
    } catch (error) {
        console.error('Network error while checking analysis status:', error);
        return null;
    }
}

module.exports = {
    initiateVirusScan,
    scanDirectoryVirusTotal,
    checkAnalysisStatus,
};
