# FocusTicker

FocusTicker is a lightweight Chrome extension that helps you stay aware of how much time you spend on distracting websites without blocking them or interrupting your browsing.

A small floating timer appears directly on supported sites. By default, it shows your current session time; hovering or opening the widget reveals more context such as the site and your total time spent there today.

## Features

- Live current-session timer
- Daily per-site usage totals
- Automatic tracking when a supported site is active
- Pauses tracking when Chrome loses focus or the user becomes idle
- Periodic session checkpointing so usage is not lost when the Manifest V3 service worker sleeps
- Minimal floating UI designed to stay out of the way
- Hover/click detail view
- Site favicon and site name in the expanded view
- Draggable timer placement
- Saved timer position across browsing sessions
- No FocusTicker account required
- No external FocusTicker server in V1

## Supported Sites

V1 is configured to support:

- YouTube
- Instagram
- TikTok
- Reddit
- LinkedIn
- X / Twitter
- Facebook
- Pinterest
- Snapchat
- Twitch

## How It Works

FocusTicker is built as a Manifest V3 Chrome extension.

### `background.js`

The background service worker handles the tracking logic.

It:

1. Detects the currently active tab and focused Chrome window.
2. Checks whether the active tab belongs to a supported domain.
3. Starts a timing session for that domain.
4. Checkpoints elapsed time into Chrome storage.
5. Stops or switches sessions when the active tab, window focus, or idle state changes.
6. Uses `chrome.alarms` as a periodic checkpoint because Manifest V3 service workers can be suspended when inactive.
7. Responds to the content script with the site's current daily usage and current-session usage.

### `content.js`

The content script renders the FocusTicker widget directly on supported websites.

It:

- Creates the floating timer UI
- Uses Shadow DOM to isolate FocusTicker's styling from the host website
- Requests current usage data from the background service worker
- Updates the timer while the page is active
- Displays the site's name and favicon
- Handles hover/click behavior
- Allows the widget to be repositioned
- Restores the saved widget position

### Storage

FocusTicker uses Chrome's built-in extension storage APIs.

- `chrome.storage.local` stores daily usage totals.
- `chrome.storage.session` stores the active timing session.
- `chrome.storage.sync` stores interface preferences such as the timer position.

V1 does not send usage data to an external FocusTicker server.

## Project Structure

```text
FocusTicker/
├── manifest.json
├── background.js
├── content.js
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md