const GEMINI_API_KEY = "AIzaSyDwVpvo9dl847OtQbHu_ZEfk_wDLuLOBXA"; 


document.addEventListener("DOMContentLoaded", () => {
    console.log("Popup.js loaded");

    chrome.storage.local.get("selectedText", async (data) => {
        console.log("Selected text:", data.selectedText);

        const eventDetailsDiv = document.getElementById("eventDetails");

        if (data.selectedText) {
            eventDetailsDiv.innerText = "Fetching event details...";

            try {
                const extractedText = await fetchEventDetails(data.selectedText);
                if (!extractedText) throw new Error("No event details extracted.");

                let eventObject = parseEventDetails(extractedText);
                console.log("Parsed Event Object:", eventObject);

                // Find missing fields
                let missingFields = Object.keys(eventObject).filter(key => !eventObject[key]);

                if (missingFields.length > 0) {
                    const mcqs = await askMissingDetails(missingFields);
                    displayMCQs(mcqs, eventObject);
                } else {
                    displayEventDetails(eventObject);
                }

            } catch (error) {
                console.error("Error:", error);
                eventDetailsDiv.innerText = "Error fetching event details.";
            }
        } else {
            eventDetailsDiv.innerText = "No event details found.";
        }
    });
});

// 📌 Function to fetch event details using Gemini API
async function fetchEventDetails(selectedText) {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Extract event details from this text:
                        """${selectedText}"""

                        Expected format:
                        Title: <Extracted Event Title>
                        Date: <YYYY-MM-DD>
                        Start Time: <HH:MM>
                        End Time: <HH:MM or empty if not provided>
                        Location: <Extracted Location or empty if not provided>
                        Description: <Short event summary>

                        Example Output:
                        Title: AI Workshop
                        Date: 2024-11-22
                        Start Time: 10:00
                        End Time: 13:00
                        Location: College Auditorium
                        Description: Workshop on AI advancements.
                        `
                    }]
                }]
            })
        });

        const result = await response.json();
        console.log("Gemini API Response:", result);

        if (!result || !result.candidates || result.candidates.length === 0) {
            throw new Error("No event details extracted.");
        }

        return result.candidates[0].content.parts[0].text.trim();
    } catch (error) {
        console.error("Error fetching Gemini API:", error);
        return null;
    }
}

// 📌 Function to parse event details using regex
function parseEventDetails(text) {
    return {
        title: text.match(/Title:\s*(.*)/)?.[1] || "",
        date: text.match(/Date:\s*(\d{4}-\d{2}-\d{2})/)?.[1] || "",
        startTime: text.match(/Start Time:\s*(\d{2}:\d{2})/)?.[1] || "",
        endTime: text.match(/End Time:\s*(\d{2}:\d{2}|)/)?.[1] || "",
        location: text.match(/Location:\s*(.*)/)?.[1] || "",
        description: text.match(/Description:\s*(.*)/)?.[1] || ""
    };
}

// 📌 Function to ask missing details via MCQs
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
        mcqText = mcqText.replace(/```json|```/g, "").trim(); // Remove JSON formatting

        return JSON.parse(mcqText);
    } catch (error) {
        console.error("Error fetching Gemini API for MCQ:", error);
        return [];
    }
}

// 📌 Function to display MCQs and allow user input
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
            button.classList.add("option-button");
            button.onclick = () => {
                if (option === "Other") {
                    // Replace button with an input field
                    const input = document.createElement("input");
                    input.type = "text";
                    input.placeholder = `Enter ${mcq.field}...`;
                    input.classList.add("option-input");

                    // When user presses Enter or clicks away
                    input.addEventListener("blur", () => {
                        eventObject[mcq.field] = input.value.trim() || "Not provided";
                        div.innerHTML = `<p><strong>${mcq.question}</strong> ${eventObject[mcq.field]}</p>`;
                        checkAllFieldsFilled(eventObject);
                    });

                    input.addEventListener("keypress", (e) => {
                        if (e.key === "Enter") {
                            input.blur(); // Save input and exit field
                        }
                    });

                    div.replaceChild(input, button);
                    input.focus();
                } else {
                    eventObject[mcq.field] = option;
                    div.innerHTML = `<p><strong>${mcq.question}</strong> ${eventObject[mcq.field]}</p>`;
                    checkAllFieldsFilled(eventObject);
                }
            };
            div.appendChild(button);
        });

        eventDetailsDiv.appendChild(div);
    });
}

// 📌 Function to check if all fields are filled
function checkAllFieldsFilled(eventObject) {
    if (Object.values(eventObject).every(val => val)) {
        displayEventDetails(eventObject);
    }
}


// 📌 Function to check if all fields are filled
function checkAllFieldsFilled(eventObject) {
    if (Object.values(eventObject).every(val => val)) {
        displayEventDetails(eventObject);
    }
}


// 📌 Function to display final event details
function displayEventDetails(eventObject) {
    const eventDetailsDiv = document.getElementById("eventDetails");
    eventDetailsDiv.innerHTML = `
        <strong>Title:</strong> ${eventObject.title} <br>
        <strong>Date:</strong> ${eventObject.date} <br>
        <strong>Start Time:</strong> ${eventObject.startTime} <br>
        <strong>End Time:</strong> ${eventObject.endTime} <br>
        <strong>Location:</strong> ${eventObject.location} <br>
        <strong>Description:</strong> ${eventObject.description}
    `;
}
