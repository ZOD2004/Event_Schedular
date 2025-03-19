const GEMINI_API_KEY = "AIzaSyDwVpvo9dl847OtQbHu_ZEfk_wDLuLOBXA"; 



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
                            Return ONLY valid JSON with these keys: 
                            {"title": "...", "startTime": "...", "endTime": "...", "location": "...", "description": "..."}`
                        }]
                    }]
                })
            })
            .then(response => response.json())
            .then(result => {
                console.log("Gemini API Response:", result);
                let extractedText = result.candidates[0]?.content.parts[0]?.text.trim() || "";
                extractedText = extractedText.replace(/```json|```/g, "").trim();
                
                try {
                    const eventObject = JSON.parse(extractedText);
                    console.log("Parsed Event Object:", eventObject);

                    let missingFields = [];
                    ["title", "startTime", "endTime", "location", "description"].forEach(field => {
                        if (!eventObject[field] || eventObject[field].trim() === "") {
                            missingFields.push(field);
                        }
                    });

                    if (missingFields.length > 0) {
                        askMissingDetails(missingFields, eventObject);
                    } else {
                        displayEventDetails(eventObject);
                    }
                } catch (e) {
                    eventDetailsDiv.innerText = "Error parsing event details. Invalid JSON format.";
                    console.error("Parsing error:", e, "Extracted Text:", extractedText);
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

async function askMissingDetails(missingFields) {
    console.log("Asking for missing details:", missingFields);

    const promptText = `
        Some event details are missing. Ask relevant multiple-choice questions to fill in the gaps. 
        Provide at most 4 options per question, including an 'Other' option.
        Missing fields: ${missingFields.join(", ")}
        
        Format the response as:
        [
            {
                "question": "What is the event title?",
                "options": ["Option 1", "Option 2", "Option 3", "Other"]
            },
            ...
        ]
    `;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: promptText
                    }]
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        console.log("Gemini API Response (Raw):", result);

        if (!result || !result.candidates || result.candidates.length === 0) {
            throw new Error("No valid response from Gemini API.");
        }

        let extractedText = result.candidates[0].content.parts[0].text.trim();
        console.log("Extracted Text (Raw):", extractedText);
        extractedText = extractedText.replace(/```json|```/g, "").trim();

        let mcqQuestions;

        try {
            mcqQuestions = JSON.parse(extractedText);
        } catch (e) {
            console.warn("First JSON parse attempt failed. Trying to extract JSON manually.");

            const jsonMatch = extractedText.match(/\[.*\]/s);
            if (jsonMatch) {
                mcqQuestions = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error(`Parsing error: Invalid JSON format. Extracted Text: ${extractedText}`);
            }
        }

        console.log("Parsed MCQ Questions:", mcqQuestions);

        return mcqQuestions;
    } catch (error) {
        console.error("Error fetching Gemini API for MCQ:", error);
        return [];
    }
}


function displayEventDetails(eventObject) {
    document.getElementById("eventDetails").innerHTML = `
        <strong>Title:</strong> ${eventObject.title} <br>
        <strong>Start Time:</strong> ${eventObject.startTime} <br>
        <strong>End Time:</strong> ${eventObject.endTime} <br>
        <strong>Location:</strong> ${eventObject.location} <br>
        <strong>Description:</strong> ${eventObject.description}
    `;
}
