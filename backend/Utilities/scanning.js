import {exec} from "child_process";
import path from "path";
import WebSocket from "ws";
import fs from "fs";

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
                    reject(scanStderr);
                    return;
                }

                console.log("Scanning output:", scanStdout);

                // Send scanning results to frontend
                const resultsFilePath = path.join(UPLOAD_DIR, "scanning_results.json");
                if (frontendClient && frontendClient.readyState === WebSocket.OPEN) {
                    try {
                        const results = fs.readFileSync(resultsFilePath, "utf-8");
                        frontendClient.send(JSON.stringify({ type: "scanningResults", results: JSON.parse(results) }));
                        console.log("Scanning results sent to frontend.");
                    } catch (err) {
                        console.error("Error reading or sending scanning results:", err);
                    }
                } else {
                    console.warn("No frontend connected. Scanning results not sent.");
                }

                resolve(); // Resolve after sending results
            });
        });
    });
}
module.exports = {runFeatureExtractionAndScanning};