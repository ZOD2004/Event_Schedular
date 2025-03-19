  
document.addEventListener("DOMContentLoaded", () => {
    const addToCalendarBtn = document.getElementById("addToCalendarBtn");

    addToCalendarBtn.addEventListener("click", async () => {
        if (eventObject) {
            console.log("Event Object:", eventObject);
            try {
                await createCalendarEvent(eventObject);
            } catch (error) {
                console.error("Error adding event to calendar:", error);
            }
        } else {
            console.error("Event object is not defined.");
            alert("No event details found. Please extract event details first.");
        }
    });
});

  
  // Function to fetch authentication token
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
  
  function formatToISO(date, time) {
        return time ? `${date}T${time}:00+05:30` : null; // Convert to ISO format for India timezone (IST)
    }

  // Function to create a Google Calendar event
  async function createCalendarEvent(event) {
    let token = await getAuthToken();

    let eventData = {
        summary: event.title || "Untitled Event", // Using event instead of eventObject
        location: event.location || "",
        description: event.description ? event.description.replace(/\.\s+/g, ".\n") : "",
        start: { 
            dateTime: formatToISO(event.date, event.startTime),  // Using event, not eventObject
            timeZone: "Asia/Kolkata" 
        },
        end: { 
            dateTime: formatToISO(event.date, event.endTime),  // Using event, not eventObject
            timeZone: "Asia/Kolkata" 
        }
    };

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
    } else {
        console.error("Error Creating Event:", data);
        throw new Error("Failed to add event.");
    }
}

  
  // Function to show Chrome notifications
  function showNotification(title, message) {
    chrome.notifications.create({
        type: "basic",
        iconUrl: "icon48.png",
        title: title,
        message: message
    });
  }