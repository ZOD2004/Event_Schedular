const GEMINI_API_KEY = ""; 


document.addEventListener("DOMContentLoaded", async () => {
    console.log("Popup.js loaded");

    chrome.storage.local.get("selectedText", async (data) => {
        console.log("Selected text:", data.selectedText);

        const eventDetailsDiv = document.getElementById("eventDetails");

        if (data.selectedText) {
            eventDetailsDiv.innerText = "Fetching event details...";

            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: `Extract event details from this text:
                                """${data.selectedText}"""
                                Return ONLY valid JSON with these keys: 
                                {"title": "...", "startTime": "...", "endTime": "...", "location": "...", "description": "..."}`
                            }]
                        }]
                    })
                });

                const result = await response.json();
                console.log("Gemini API Response:", result);

                if (!result || !result.candidates || result.candidates.length === 0) {
                    throw new Error("No event details extracted.");
                }

                let extractedText = result.candidates[0].content.parts[0].text.trim();
                extractedText = extractedText.replace(/```json|```/g, "").trim(); // Remove formatting
                let eventObject = JSON.parse(extractedText);

                console.log("Parsed Event Object:", eventObject);

                const missingFields = [];
                for (const key of ["title", "startTime", "endTime", "location", "description"]) {
                    if (!eventObject[key]) {
                        missingFields.push(key);
                    }
                }

                if (missingFields.length > 0) {
                    const mcqs = await askMissingDetails(missingFields);
                    displayMCQs(mcqs, eventObject);
                } else {
                    displayEventDetails(eventObject);
                }

            } catch (error) {
                console.error("Error fetching event details:", error);
                eventDetailsDiv.innerText = "Error fetching event details.";
            }
        } else {
            eventDetailsDiv.innerText = "No event details found.";
        }
    });
});

// 🛠 Function to fetch MCQs for missing details
async function askMissingDetails(missingFields) {
    console.log("Fetching MCQs for missing fields:", missingFields);

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Generate multiple-choice questions (MCQs) to fill missing event details.
                        The missing fields are: ${missingFields.join(", ")}
                        Return ONLY valid JSON in this format:
                        [
                            {
                                "field": "startTime",
                                "question": "What is the start time?",
                                "options": ["6 PM", "7 PM", "8 PM", "Other"]
                            },
                            {
                                "field": "location",
                                "question": "Where is the event?",
                                "options": ["Community Hall", "Grand Hotel", "Park", "Other"]
                            }
                        ]`
                    }]
                }]
            })
        });

        const result = await response.json();
        console.log("MCQ API Response:", result);

        if (!result || !result.candidates || result.candidates.length === 0) {
            throw new Error("No MCQs generated.");
        }

        let mcqText = result.candidates[0].content.parts[0].text.trim();
        mcqText = mcqText.replace(/```json|```/g, "").trim(); // Remove formatting

        return JSON.parse(mcqText);
    } catch (error) {
        console.error("Error fetching Gemini API for MCQ:", error);
        return [];
    }
}

// 🖥 Function to display event details
function displayEventDetails(eventObject) {
    const eventDetailsDiv = document.getElementById("eventDetails");
    eventDetailsDiv.innerHTML = `
        <strong>Title:</strong> ${eventObject.title} <br>
        <strong>Start Time:</strong> ${eventObject.startTime} <br>
        <strong>End Time:</strong> ${eventObject.endTime} <br>
        <strong>Location:</strong> ${eventObject.location} <br>
        <strong>Description:</strong> ${eventObject.description}
    `;
}

// 📌 Function to display MCQs and allow user input
function displayMCQs(mcqs, eventObject) {
    const eventDetailsDiv = document.getElementById("eventDetails");
    eventDetailsDiv.innerHTML = "<h3>Fill Missing Event Details:</h3>";

    mcqs.forEach(mcq => {
        const div = document.createElement("div");
        div.innerHTML = `<p><strong>${mcq.question}</strong></p>`;
        
        mcq.options.forEach(option => {
            const button = document.createElement("button");
            button.innerText = option;
            button.onclick = () => {
                if (option === "Other") {
                    const userInput = prompt(`Enter ${mcq.field}:`);
                    eventObject[mcq.field] = userInput || "Not provided";
                } else {
                    eventObject[mcq.field] = option;
                }
                div.innerHTML = `<p><strong>${mcq.question}</strong> ${eventObject[mcq.field]}</p>`;

                if (Object.values(eventObject).every(val => val)) {
                    displayEventDetails(eventObject);
                }
            };
            div.appendChild(button);
        });

        eventDetailsDiv.appendChild(div);
    });
}
