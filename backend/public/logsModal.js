function showFullLogsModal() {
    const modal = document.getElementById("fullLogsModal");
    if (modal) {
        modal.style.display = "block"; // Show the modal
    } else {
        console.error("`fullLogsModal` element not found in the DOM.");
    }
}

function updateLogModalText(headingText, bodyText) {
    const modal = document.getElementById("fullLogsModal");

    if (modal) {
        const heading = modal.querySelector("h2");
        if (heading) {
            heading.textContent = headingText;
        }

        const paragraph = modal.querySelector("p");
        if (paragraph) {
            paragraph.textContent = bodyText;
        }
    } else {
        console.error("`fullLogsModal` element not found in the DOM.");
    }
}
document.getElementById("fullLogsButton").addEventListener("click", () => {
    updateLogModalText("Updated Logs Heading", "This is the updated text for the full logs.");
    showFullLogsModal();
});

document.getElementById("closeModalButton").addEventListener("click", () => {
    const modal = document.getElementById("fullLogsModal");
    if (modal) {
        modal.style.display = "none"; // Hide the modal
    } else {
        console.error("`fullLogsModal` element not found in the DOM.");
    }
});