function showDeviceInfoModal() {
    const modal = document.getElementById('deviceInfoModal');
    if (modal) {
        modal.style.display = 'block'; // Show the modal
    } else {
        console.error('`deviceInfoModal` element not found in the DOM.');
    }
}

function updateDeviceInfoModalText(headingText, bodyText) {
    const modal = document.getElementById('deviceInfoModal');

    if (modal) {
        const heading = modal.querySelector('h2');
        if (heading) {
            heading.textContent = headingText;
        }

        const paragraph = modal.querySelector('p');
        if (paragraph) {
            paragraph.textContent = bodyText;
        }
    } else {
        console.error('`deviceInfoModal` element not found in the DOM.');
    }
}
document.getElementById('extendDeviceInfoButton').addEventListener('click', () => {
    updateDeviceInfoModalText('Device Information', 'This is the device information.');
    showDeviceInfoModal();
});
