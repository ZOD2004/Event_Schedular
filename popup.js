const GEMINI_API_KEY = "AIzaSyDwVpvo9dl847OtQbHu_ZEfk_wDLuLOBXA"; 

let eventObject;



document.addEventListener("DOMContentLoaded", () => {
    console.log("Popup.js loaded");

    const eventDetailsDiv = document.getElementById("eventDetails");
    const loadingDiv = document.getElementById("loading"); 
    const addToCalendarBtn = document.getElementById("addToCalendarBtn");
    
    loadingDiv.style.display = "block";
    eventDetailsDiv.style.display = "none";

    // Initialize Add to Calendar button
    addToCalendarBtn.addEventListener("click", async () => {
        if (eventObject) {
            console.log("Adding to calendar:", eventObject);
            try {
                await createCalendarEvent(eventObject);
            } catch (error) {
                console.error("Error adding event to calendar:", error);
                showNotification("Error", "Failed to add event to calendar. Please try again.");
            }
        } else {
            console.error("Event object is not defined.");
            alert("No event details found. Please extract event details first.");
        }
    });

    // Process selected text
    chrome.storage.local.get("selectedText", async (data) => {
        console.log("Selected text:", data.selectedText);

        if (data.selectedText) {
            try {
                const extractedText = await fetchEventDetails(data.selectedText);
                if (!extractedText) throw new Error("No event details extracted.");

                eventObject = parseEventDetails(extractedText);
                console.log("Parsed Event Object:", eventObject);
                let missingFields = Object.keys(eventObject).filter(key => !eventObject[key]);

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

    function resizePopup() {
        let width = 420; 
        let height = Math.max(document.body.scrollHeight, 300); 

        chrome.runtime.getPlatformInfo(() => {
            window.resizeTo(width, height);
        });
    }
    setTimeout(resizePopup, 100);
});



// to show error
function showError(message) {
    const eventDetailsDiv = document.getElementById("eventDetails");
    eventDetailsDiv.innerHTML = `
        <div class="error-message">
            <p>${message}</p>
            <button id="retryButton" class="primary-button">Try Again</button>
        </div>
    `;
    
    document.getElementById("retryButton").addEventListener("click", () => {
        location.reload();
    });
    
    eventDetailsDiv.style.display = "block";
    document.getElementById("loading").style.display = "none";
}

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
function parseEventDetails(text) {
    const extractValue = (regex) => {
        const match = text.match(regex);
        return match ? match[1] : "";
    };

    let startTime = extractValue(/Start Time:\s*(\d{2}:\d{2})/);
    let endTime = extractValue(/End Time:\s*(\d{2}:\d{2})/);
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

    // Get the original selected text for context
    const { selectedText } = await new Promise(resolve => {
        chrome.storage.local.get("selectedText", (data) => {
            resolve(data);
        });
    });

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Based on this original text:
                        """${selectedText}"""
                        
                        Generate multiple-choice questions (MCQs) to fill missing event details.
                        The missing fields are: ${missingFields.join(", ")}
                        
                        Make intelligent guesses based on the context of the original text.
                        For time-related fields, offer reasonable time options based on context clues.
                        For location fields, suggest plausible locations based on any context.
                        
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
        mcqText = mcqText.replace(/```json|```/g, "").trim();

        return JSON.parse(mcqText);
    } catch (error) {
        console.error("Error fetching Gemini API for MCQ:", error);
        return [];
    }
}

// 📌 Function to validate and format time input
function validateAndFormatTime(input, isEndTime, otherTime) {
    input = input.trim().toLowerCase();

    const timeRegex = /^(\d{1,2})(?::(\d{1,2}))?\s*(am|pm)?$/;
    const match = input.match(timeRegex);

    if (!match) return null; // Invalid input

    let hours = parseInt(match[1], 10);
    let minutes = match[2] ? parseInt(match[2], 10) : 0;
    let period = match[3]; 

    if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) return null;

    if (!period) {
        if (otherTime) {
            let otherHours = parseInt(otherTime.split(":")[0], 10);
            period = otherHours >= 12 ? "pm" : "am";
        } else {
            period = hours < 7 ? "am" : "pm"; 
        }
    }

    // Convert to 24-hour format
    if (period === "pm" && hours !== 12) hours += 12;
    if (period === "am" && hours === 12) hours = 0;

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

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = `Enter ${field}...`;
    input.classList.add("option-input");

    // Add event listeners for both blur and enter key
    input.addEventListener("blur", () => processInputValue());
    input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") processInputValue();
    });

    function processInputValue() {
        let userInput = input.value.trim();
        
        if (!userInput) {
            alert(`Please enter a valid ${field}.`);
            return;
        }

        // Handle time-specific fields
        if (field === "startTime" || field === "endTime") {
            let referenceTime = field === "startTime" ? eventObject.endTime : eventObject.startTime;
            let validTime = validateAndFormatTime(userInput, field === "endTime", referenceTime);

            if (!validTime) {
                alert("Invalid time format. Please enter time in HH:MM AM/PM.");
                return;
            }
            
            eventObject[field] = validTime;
        } else {
            eventObject[field] = userInput;
        }

        div.innerHTML = `<p><strong>${question}</strong> ${eventObject[field]}</p>`;
        checkAllFieldsFilled(eventObject);
    }

    div.replaceChildren(input);
    input.focus();
}

// 📌 Function to display MCQs
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

// 📌 Function to display final event details
function displayEventDetails(eventObject) {
    const eventDetailsDiv = document.getElementById("eventDetails");
    eventDetailsDiv.innerHTML = `
        <h3>Event Details:</h3>
        <p><strong>Title:</strong> ${eventObject.title}</p>
        <p><strong>Date:</strong> ${eventObject.date}</p>
        <p><strong>Start Time:</strong> ${eventObject.startTime}</p>
        <p><strong>End Time:</strong> ${eventObject.endTime}</p>
        <p><strong>Location:</strong> ${eventObject.location}</p>
        <p><strong>Description:</strong> ${eventObject.description}</p>
    `;
    addToCalendarBtn.style.display = "block";

    // Re-attach event listener for the newly created button
    document.getElementById("addToCalendarBtn").addEventListener("click", async () => {
        if (eventObject) {
            console.log("Adding to calendar:", eventObject);
            try {
                await createCalendarEvent(eventObject);
            } catch (error) {
                console.error("Error adding event to calendar:", error);
                showNotification("Error", "Failed to add event to calendar. Please try again.");
            }
        } else {
            console.error("Event object is not defined.");
            alert("No event details found. Please extract event details first.");
        }
    });
}

// 📌 Function to fetch authentication token
async function getAuthToken() {
    return new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: true }, (token) => {
            if (chrome.runtime.lastError) {
                console.error("Auth Error:", chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
            } else {
                console.log("Token received:", token);
                resolve(token);
            }
        });
    });
}

// 📌 Function to format dates to ISO format
function formatToISO(date, time) {
    return time ? `${date}T${time}:00+05:30` : `${date}T00:00:00+05:30`; // Default to midnight if no time
}

// 📌 Function to create a Google Calendar event
async function createCalendarEvent(event) {
    try {
        let token = await getAuthToken();

        // Fallback to all-day event if no times provided
        const useDateTime = event.startTime && event.endTime;
        
        let eventData = {
            summary: event.title || "Untitled Event",
            location: event.location || "",
            description: event.description ? event.description.replace(/\.\s+/g, ".\n") : "",
        };
        
        // Handle both timed events and all-day events
        if (useDateTime) {
            eventData.start = { 
                dateTime: formatToISO(event.date, event.startTime),
                timeZone: "Asia/Kolkata" 
            };
            eventData.end = { 
                dateTime: formatToISO(event.date, event.endTime),
                timeZone: "Asia/Kolkata" 
            };
        } else {
            eventData.start = { 
                date: event.date
            };
            eventData.end = { 
                date: event.date
            };
        }

        console.log("Creating event with data:", eventData);

        let response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(eventData)
        });

        let data = await response.json();
        if (response.ok) {
            console.log("Event Created:", data);
            showNotification("Success", "Event Added to Google Calendar!");
            
            // Store in local storage as well for backup
            chrome.storage.local.set({ lastAddedEvent: event }, () => {
                console.log("Event stored in local storage");
            });
            
            return data;
        } else {
            console.error("Error Creating Event:", data);
            throw new Error("Failed to add event: " + (data.error ? data.error.message : "Unknown error"));
        }
    } catch (error) {
        console.error("Calendar API Error:", error);
        showNotification("Error", error.message || "Failed to add event to calendar");
        throw error;
    }
}

// 📌 Function to show Chrome notifications
function showNotification(title, message) {
    chrome.notifications.create({
        type: "basic",
        iconUrl: "icon48.png",
        title: title,
        message: message
    });
}