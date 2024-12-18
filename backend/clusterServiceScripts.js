const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const { json } = require('body-parser');
const path = require("path");
const { parseKeypressData } = require('./Utilities/keypressParser');

// TODO: Update this address to match kube service address
const ingressAddress = 'http://example.com';
const featureExtractorAddress = ingressAddress + '/malpredict/';
const hardwallConfigAddress = ingressAddress + '/config-hardwall/';
const cloudConfigAddress = ingressAddress + '/config-cloud/';
const keystrokeAnalyzerAddress = ingressAddress + '/keystroke-ai/';

async function postFile(fileInput) {
    var formData = new FormData();
    fileInput.files.forEach(file => {
        console.log(`Appending file: ${file.fileName}, Stream readable: ${file.stream.readable}`);
        formData.append('file', file.stream, file.fileName);
    });

    try {
        const response = await axios.post(featureExtractorAddress, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                ...formData.getHeaders()
            },
            timeout: 60000  // Increase timeout to 60 seconds
        });
        return response.data;
    } catch (error) {
        console.error('Error posting file to Flask:', error);
        if (error.response) {
            console.error('Response data:', error.response.data);
            console.error('Response status:', error.response.status);
            console.error('Response headers:', error.response.headers);
        } else if (error.request) {
            console.error('Request data:', error.request);
        } else {
            console.error('Error message:', error.message);
        }
        throw error;
    }
}

function createFileInput(fileList) {
    let files_array = [];
    for (const file of fileList) {
        let filePath = file;
        let fileName = path.basename(filePath);

        // Check if file exists and stream is readable
        if (!fs.existsSync(filePath)) {
            console.error(`File does not exist: ${filePath}`);
            continue;
        }

        let fileStream = fs.createReadStream(filePath);
        fileStream.on('error', (err) => {
            console.error(`Error reading file ${filePath}:`, err.message);
        });

        files_array.push({ fileName: fileName, path: filePath, stream: fileStream });
    }

    console.log("Returning file input with streams...");
    let bigFiles;
    bigFiles = {files: files_array};
    return bigFiles;
}

function postTestFiles() {
    return new Promise((resolve, reject) => {
        console.log('Posting test files to:', featureExtractorAddress);
        const testFilePath = fs.realpathSync('test/mspaint.exe');
        const fileData = fs.readFileSync(testFilePath);
        var fileStream = fs.createReadStream(testFilePath);

        const testFilePathTwo = fs.realpathSync('test/SnippingTool.exe');
        const fileDataTwo = fs.readFileSync(testFilePathTwo);
        var fileStreamTwo = fs.createReadStream(testFilePathTwo);

        const fileInput = { 
            files: [
                {fileName: 'mspaint.exe', path: testFilePath, data: fileData, stream: fileStream },
                {fileName: 'SnippingTool.exe', path: testFilePathTwo, data: fileDataTwo, stream: fileStreamTwo }
            ],
        };

        postFile(fileInput).then((response) => {
            if (!response) {
                console.error('No response from postFile');
                reject('No response from postFile');
                return;
            }
            try {
                const data = Object.entries(response);
                const findings = [];
                console.log('printing data:\n',data,'\n\n');
                for (const item of data) {
                    findings.push(item[1]);
                }
                console.log('findings:', findings);
                for (field of findings) {
                    field['results'] = field['results'][0];
                    console.log('field:', field);
                }

                resolve(findings);
            } catch (error) {
                console.error('Error parsing device info:', error);
                reject(error);
            }
        }).catch((error) => {
            reject(error);
        });
    });
}

async function postKeystrokes(parsedKeypressData) {
    // Format the output to match the desired style
    const formattedData = parsedKeypressData.map(result => ({
        VK: result.VK,
        HT: result.HT || -1,
        FT: result.FT || -1
    }));

    try {
        const response = await axios.post(keystrokeAnalyzerAddress, formattedData, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    } catch (error) {
        if (error.response) {
            console.error('Response data:', error.response.data);
            console.error('Response status:', error.response.status);
            console.error('Response headers:', error.response.headers);
        } else if (error.request) {
            console.error('Request data:', error.request);
        } else {
            console.error('Error message:', error.message);
        }
        throw error;
    }
}


function postHardwallConfig(config) {
    return 'Feature not implemented';
    return new Promise(async (resolve, reject) => {
        try {
            const response = await axios.post(hardwallConfigAddress, config, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            resolve(response.data);
        } catch (error) {
            console.error('Error posting hardwall config:', error);
            reject(error);
        }
    });
}


function forceRemoteBuild() {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await axios.post(cloudConfigAddress, {}, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            resolve(response.data);
        } catch (error) {
            console.error('Error posting cloud config:', error);
            reject(error);
        }
    });
}
// Export the functions using CommonJS syntax
module.exports = { postFile, postTestFiles, postHardwallConfig, createFileInput, postKeystrokes };
