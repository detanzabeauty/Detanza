# DETANZA — Official Coming Soon Website

A modern, responsive Coming Soon landing page for the **Detanza** brand.

---

## 📁 File Structure

```
├── index.html       # Clean HTML5 markup with brand headers, countdown & waitlist
├── style.css        # Obsidian & champagne gold luxury aesthetics, animations & responsiveness
├── script.js        # Live countdown timer, interactive waitlist form & cursor effects
├── package.json     # NPM scripts for local development
└── README.md        # Documentation and configuration guide
```

---

## 🚀 How to Run

You can run the project using **any** of the following methods:

### Method 1: Using NPM (Terminal)
Run either command in your terminal:
```bash
npm start
```
or
```bash
npm run dev
```
*(This starts a local development server at `http://localhost:3000`)*

### Method 2: Direct in Browser
Double-click [`index.html`](./index.html) to view it directly in any browser without needing Node.js or a server.

---

## ⚙️ Customization Guide

### 1. Change the Launch Date
In [`script.js`](./script.js#L24-L38), the countdown is set to **5 days**:
```javascript
const COUNTDOWN_DAYS = 5;
```
Or set a specific target date:
```javascript
targetDate = new Date('2026-11-05T00:00:00');
```

### 2. Connect the Waitlist Form to Real Email Service
The waitlist currently validates and stores signups locally in the browser's `localStorage` (`detanza_waitlist`).
To send subscribers directly to your email tool:
- **Formspree / Formbold / Getform:** Replace the `<form>` `action` attribute in [`index.html`](./index.html) with your endpoint URL.
- **Mailchimp / ConvertKit / Klaviyo:** Connect your API endpoint inside `initFormHandler()` in [`script.js`](./script.js).

### 3. Update Social Media Links
In [`index.html`](./index.html), replace `#instagram`, `#x`, and `contact@detanza.com` with your official links.
# Detanza
