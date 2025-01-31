function updateVirusTotalResults(filePath, scanResults) {
    const virusTotalOutput = document.getElementById('virusTotalOutput');
    const extendResultsButton = document.getElementById('extendResultsButton');

    if (!scanResults) {
        const errorDiv = document.createElement('div');
        errorDiv.classList.add('error-message');
        errorDiv.innerHTML = `<strong>Error:</strong> Unable to fetch scan results for ${filePath}.`;
        virusTotalOutput.appendChild(errorDiv);
        return;
    }

    const resultDiv = document.createElement('div');
    resultDiv.classList.add('scan-result');
    resultDiv.innerHTML = `
        <strong>File:</strong> ${filePath}<br>
        <strong>Malicious:</strong> ${scanResults.malicious || 0}<br>
        <strong>Suspicious:</strong> ${scanResults.suspicious || 0}<br>
        <strong>Undetected:</strong> ${scanResults.undetected || 0}
    `;
    virusTotalOutput.appendChild(resultDiv);

    if (scanResults.detailsUrl) {
        extendResultsButton.disabled = false;
        extendResultsButton.onclick = () => window.open(scanResults.detailsUrl, '_blank');
    }
}