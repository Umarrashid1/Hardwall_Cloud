import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

// TODO: Update this address to match kube service address
const featureExtractorAddress = 'http://example.com';

async function postFile(fileInput) {
    var formData = new FormData();
    fileInput.files.forEach(file => {
        formData.append('file', file.stream, file.data, file.fileName);
    });

    try {
        const response = await axios.post(featureExtractorAddress + '/malpredict', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                ...formData.getHeaders()
            },
            timeout: 60000  // Increase timeout to 60 seconds
        });
        console.log('Response:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error posting file to Flask:', error);
    }
}

function postTestFiles() {
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
        try {
            const data = Object.entries(response);
            const findings = [];
            for (const item of data) {
                findings.push(item[1]);
            }
            for (const item of findings) {
                item['results'] = item['results'][0];
            }
            console.log('findings:', findings);
            return findings;
        } catch (error) {
            console.error('Error parsing device info:', error);
        }
    });
}

// Export the functions
export { postFile, postTestFiles, featureExtractorAddress };