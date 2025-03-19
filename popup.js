const GEMINI_API_KEY = "AIzaSyDwVpvo9dl847OtQbHu_ZEfk_wDLuLOBXA"; 


document.addEventListener("DOMContentLoaded", () => {
    console.log("Popup.js loaded");

    const eventDetailsDiv = document.getElementById("eventDetails");
    const loadingDiv = document.getElementById("loading"); // Get the loader

    // Show loader initially
    loadingDiv.style.display = "block";
    eventDetailsDiv.style.display = "none";

    chrome.storage.local.get("selectedText", async (data) => {
        console.log("Selected text:", data.selectedText);

        if (data.selectedText) {
            try {
                const extractedText = await fetchEventDetails(data.selectedText);
                if (!extractedText) throw new Error("No event details extracted.");

                let eventObject = parseEventDetails(extractedText);
                console.log("Parsed Event Object:", eventObject);

                // Find missing fields
                let missingFields = Object.keys(eventObject).filter(key => !eventObject[key]);

                // Hide loader when data is ready
                loadingDiv.style.display = "none";
                eventDetailsDiv.style.display = "block";

                if (missingFields.length > 0) {
                    const mcqs = await askMissingDetails(missingFields);
                    displayMCQs(mcqs, eventObject);
                } else {
                    displayEventDetails(eventObject);
                }

            } catch (error) {
                console.error("Error:", error);
                loadingDiv.style.display = "none";
                eventDetailsDiv.style.display = "block";
                eventDetailsDiv.innerText = "Error fetching event details.";
            }
        } else {
            loadingDiv.style.display = "none";
            eventDetailsDiv.style.display = "block";
            eventDetailsDiv.innerText = "No event details found.";
        }
    });

    // Function to resize popup dynamically
    function resizePopup() {
        let width = 420; // Adjust width as needed
        let height = Math.max(document.body.scrollHeight, 300); // Minimum height 300px

        chrome.runtime.getPlatformInfo(() => {
            window.resizeTo(width, height);
        });
    }

    // Resize popup after content loads
    setTimeout(resizePopup, 100);
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
                        text: `Extract event details from this text and keep the time in 24 hours format. Make a title which is suitable and short:
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
// 📌 Function to parse event details using regex
function parseEventDetails(text) {
    const extractValue = (regex) => {
        const match = text.match(regex);
        return match ? match[1] : ""; // Return empty if no match
    };

    let startTime = extractValue(/Start Time:\s*(\d{2}:\d{2})/);
    let endTime = extractValue(/End Time:\s*(\d{2}:\d{2})/);

    // Treat "00:00" as missing by setting it to an empty string
    startTime = (startTime === "00:00") ? "" : startTime;
    endTime = (endTime === "00:00") ? "" : endTime;

    return {
        title: extractValue(/Title:\s*(.*)/),
        date: extractValue(/Date:\s*(\d{4}-\d{2}-\d{2})/),
        startTime: startTime,
        endTime: endTime,
        location: extractValue(/Location:\s*(.*)/),
        description: extractValue(/Description:\s*(.*)/)
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

// 📌 Function to handle user input with validation
function handleUserInput(field, value, div, question, eventObject) {
    if (value !== "Other") {
        eventObject[field] = value;
        div.innerHTML = `<p><strong>${question}</strong> ${eventObject[field]}</p>`;
        checkAllFieldsFilled(eventObject);
        return;
    }

    // Create an input field for custom input
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = `Enter ${field} (HH:MM AM/PM)...`;
    input.classList.add("option-input");

    input.addEventListener("blur", () => {
        let userInput = input.value.trim();

        // Ensure required fields are not empty
        if (!userInput) {
            alert(`Please enter a valid ${field}.`);
            input.focus();
            return;
        }

        // Validate time format and infer AM/PM if needed
        let referenceTime = field === "startTime" ? eventObject.endTime : eventObject.startTime;
        let validTime = validateAndFormatTime(userInput, field === "endTime", referenceTime);

        if (!validTime) {
            alert("Invalid time format. Please enter time in HH:MM AM/PM.");
            input.focus();
            return;
        }

        eventObject[field] = validTime;
        div.innerHTML = `<p><strong>${question}</strong> ${eventObject[field]}</p>`;
        checkAllFieldsFilled(eventObject);
    });

    input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") input.blur(); // Save input when pressing Enter
    });

    div.replaceChildren(input);
    input.focus();
}



// 📌 Function to validate and auto-correct time input with AM/PM detection
// 📌 Function to validate and auto-correct time input with AM/PM detection
function validateAndFormatTime(input, isEndTime, otherTime) {
    input = input.trim().toLowerCase();

    const timeRegex = /^(\d{1,2})(?::(\d{1,2}))?\s*(am|pm)?$/;
    const match = input.match(timeRegex);

    if (!match) return null; // Invalid input

    let hours = parseInt(match[1], 10);
    let minutes = match[2] ? parseInt(match[2], 10) : 0; // Default minutes to 00
    let period = match[3]; // AM or PM (if provided)

    // Validate time range
    if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) return null;

    // If no AM/PM given, infer based on otherTime
    if (!period) {
        if (otherTime) {
            let otherHours = parseInt(otherTime.split(":")[0], 10);
            period = otherHours >= 12 ? "pm" : "am"; // Match the other time
        } else {
            period = hours < 7 ? "am" : "pm"; // Default to PM if afternoon
        }
    }

    // Convert to 24-hour format
    if (period === "pm" && hours !== 12) hours += 12;
    if (period === "am" && hours === 12) hours = 0;

    // Format as HH:MM
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

// 📌 Function to handle user input with validation
function handleUserInput(field, value, div, question, eventObject) {
    if (value !== "Other") {
        eventObject[field] = value;
        div.innerHTML = `<p><strong>${question}</strong> ${eventObject[field]}</p>`;
        checkAllFieldsFilled(eventObject);
        return;
    }

    // Create an input field for custom input
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = `Enter ${field} (HH:MM AM/PM)...`;
    input.classList.add("option-input");

    input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            let userInput = input.value.trim();

            // Ensure input is not empty
            if (!userInput) {
                alert(`Please enter a valid ${field}.`);
                return;
            }

            // Validate time format and infer AM/PM if needed
            let referenceTime = field === "startTime" ? eventObject.endTime : eventObject.startTime;
            let validTime = validateAndFormatTime(userInput, field === "endTime", referenceTime);

            if (!validTime) {
                alert("Invalid time format. Please enter time in HH:MM AM/PM.");
                return;
            }

            eventObject[field] = validTime;
            div.innerHTML = `<p><strong>${question}</strong> ${eventObject[field]}</p>`;
            checkAllFieldsFilled(eventObject);
        }
    });

    div.replaceChildren(input);
    input.focus();
}




// 📌 Function to display MCQs and enforce correct input format
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
            button.onclick = () => handleUserInput(mcq.field, option, div, mcq.question, eventObject);
            div.appendChild(button);
        });

        // Ensure "Other" option is always available
        if (!mcq.options.includes("Other")) {
            const otherButton = document.createElement("button");
            otherButton.innerText = "Other";
            otherButton.classList.add("option-button");
            otherButton.onclick = () => handleUserInput(mcq.field, "Other", div, mcq.question, eventObject);
            div.appendChild(otherButton);
        }

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
