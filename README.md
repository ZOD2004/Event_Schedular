# **Event Scheduler - Chrome/Brave Extension**  

**Event Scheduler** is a Chrome/Brave extension that extracts event details from any selected text and schedules them into Google Calendar. This extension was built from scratch to automate event scheduling, as no similar solution existed online.  

## **Features** 🚀  

✅ Extracts event details (title, date, time, location, and description) from selected text using the **Google Gemini API**.  
✅ Detects missing event details and generates **multiple-choice questions (MCQs)** for user input.  
✅ Displays a user-friendly **popup UI** for event confirmation.  
✅ Stores extracted event data locally before adding it to **Google Calendar**.  
✅ Fully automated and easy-to-use extension.  

## **Installation** 🛠  

1. Clone this repository or download the ZIP file.  
2. Open **Google Chrome** or **Brave Browser**.  
3. Navigate to **chrome://extensions/**.  
4. Enable **Developer mode** (top right corner).  
5. Click **Load unpacked** and select the extracted project folder.  
6. The extension is now installed and ready to use!  

## **Usage** 🎯  

1. **Select text** containing event details from any webpage.  
2. **Right-click** and choose **"Schedule Event"** from the context menu.  
3. The extension will extract details and ask for any missing information.  
4. Confirm the details in the popup.  
5. Click **"Add to Google Calendar"**, and the event will be scheduled!  

## **Technologies Used** 🏗  

- **JavaScript (Vanilla JS), HTML, CSS** – For building the extension.  
- **Google Gemini API** – For extracting event details.  
- **Chrome Extension API** – For handling selected text and managing storage.  
- **Google Calendar API** – For scheduling events.  

## **Challenges & Solutions** 🔧  

- **API & OAuth 2.0 Integration** – Initially challenging, but resolved by thorough documentation and debugging.  
- **Parsing Event Details** – Improved accuracy by refining the regex-based parsing logic.  
- **Ensuring UI Responsiveness** – Implemented a dynamic resizing function to adjust the popup size based on content.  

## **Future Enhancements** 🔥  

- Add **natural language processing (NLP)** to improve event extraction accuracy.  
- Enable **multi-event detection** from longer text selections.  
- Implement **event reminders and notifications**.  

