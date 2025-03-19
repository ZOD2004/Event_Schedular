const GEMINI_API_KEY = "AIzaSyDwVpvo9dl847OtQbHu_ZEfk_wDLuLOBXA"; // Replace with your actual API key


// const GEMINI_API_KEY = "YOUR_API_KEY"; // Replace with your actual API key

document.addEventListener("DOMContentLoaded", () => {
    console.log("Popup.js loaded");

    chrome.storage.local.get("selectedText", (data) => {
        console.log("Selected text:", data.selectedText);

        const eventDetailsDiv = document.getElementById("eventDetails");

        if (data.selectedText) {
            eventDetailsDiv.innerText = "Fetching event details...";

            fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Extract event details from this text:
                            """${data.selectedText}"""
                            Return ONLY valid JSON object with these keys:
                            title, startTime, endTime, location, description.
                            DO NOT include markdown formatting (no \`\`\`json or \`\`\`).`
                        }]
                    }]
                })
            })
            .then(response => response.json())
            .then(result => {
                console.log("Gemini API Response:", result);

                if (result && result.candidates && result.candidates.length > 0) {
                    let extractedText = result.candidates[0].content.parts[0].text.trim();
                    console.log("Extracted Text (Raw):", extractedText);

                    // 🔥 Fix: Remove markdown formatting if it still exists
                    extractedText = extractedText.replace(/```json|```/g, "").trim();

                    try {
                        const eventObject = JSON.parse(extractedText);
                        console.log("Parsed Event Object:", eventObject);

                        eventDetailsDiv.innerHTML = `
                            <strong>Title:</strong> ${eventObject.title} <br>
                            <strong>Start Time:</strong> ${eventObject.startTime} <br>
                            <strong>End Time:</strong> ${eventObject.endTime} <br>
                            <strong>Location:</strong> ${eventObject.location} <br>
                            <strong>Description:</strong> ${eventObject.description}
                        `;
                    } catch (e) {
                        eventDetailsDiv.innerText = "Error parsing event details. Invalid JSON format.";
                        console.error("Parsing error:", e, "Cleaned Extracted Text:", extractedText);
                    }
                } else {
                    eventDetailsDiv.innerText = "No event details extracted.";
                }
            })
            .catch(error => {
                console.error("Error fetching Gemini API:", error);
                eventDetailsDiv.innerText = "Error fetching event details.";
            });

        } else {
            eventDetailsDiv.innerText = "No event details found.";
        }
    });
});
