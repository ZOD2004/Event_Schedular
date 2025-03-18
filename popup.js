document.addEventListener("DOMContentLoaded", () => {
    chrome.storage.local.get("selectedText", (data) => {
        const eventDetails = document.getElementById("eventDetails");
        if (data.selectedText) {
            eventDetails.innerText = data.selectedText;
        } else {
            eventDetails.innerText = "No event details found.";
        }
    });

    document.getElementById("addToCalendar").addEventListener("click", () => {
        alert("Function to add event to Google Calendar will be implemented here!");
    });
});
