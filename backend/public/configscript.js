document.getElementById("sendDataButton").addEventListener("click", () => {
    const jsonData = {
        key1: "value1",
        key2: "value2"
    };

    const backendUrl = "http://130.225.37.50:3000/config-hardwall"; // Replace with your backend URL

    fetch(backendUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(jsonData)
    })
    .then(response => response.json())
    .then(data => {
        console.log("Success:", data);
        // Update the page content on success
        const successMessage = document.createElement("p");
        successMessage.textContent = "Data sent successfully!";
        document.body.appendChild(successMessage);
    })
    .catch((error) => {
        console.error("Error:", error);
        // Optionally, update the page content on error
        const errorMessage = document.createElement("p");
        errorMessage.textContent = "Failed to send data.";
        document.body.appendChild(errorMessage);
    });
});