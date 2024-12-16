const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const FEATURE_EXTRACTION_SCRIPT = "../malware_predict/feature_extraction.py";
const UPLOAD_DIR = "/home/ubuntu/box"; // Directory where files are uploaded
const SCANNING_SCRIPT = "../malware_predict/run_scanner.py";


function runFeatureExtractionAndScanning() {
    return new Promise((resolve, reject) => {
        // Step 1: Run feature extraction
        exec(`python3 ${FEATURE_EXTRACTION_SCRIPT} ${UPLOAD_DIR}`, (error, stdout, stderr) => {
            if (error) {
                console.error("Error during feature extraction:", stderr);
                reject(stderr);
                return;
            }
            console.log("Feature extraction output:", stdout);

            // Step 2: Run malware scanning
            exec(`python3 ${SCANNING_SCRIPT} ${path.join(UPLOAD_DIR, "extracted_features.csv")}`, (scanError, scanStdout, scanStderr) => {
                if (scanError) {
                    console.error("Error during malware scanning:", scanStderr);
                }

                console.log("Scanning output:", scanStdout);
                resolve(); // Resolve after scanning
            });
        });
    });
}

module.exports = { runFeatureExtractionAndScanning };

runFeatureExtractionAndScanning()