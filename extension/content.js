const tickerHost = document.createElement("div");

Object.assign(tickerHost.style, {
    position: "fixed",
    top: "64px",
    right: "12px",
    zIndex: "2147483647",
    pointerEvents: "auto",
    visibility: "hidden"
});

const shadow = tickerHost.attachShadow({ mode: "open" });

shadow.innerHTML = `
<style>
    .widget {
        position: relative;
        display: inline-flex;
        align-items: center;
    }

    .anchor {
        min-width: 58px;
        height: 30px;
        box-sizing: border-box;
        display: grid;
        place-items: center;
        padding: 0 10px;

        background: rgba(22, 22, 22, 0.74);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);

        border: 1px solid rgba(255, 255, 255, 0.11);
        border-radius: 999px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.16);

        color: rgba(255, 255, 255, 0.96);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 12px;
        font-weight: 650;
        line-height: 1;
        letter-spacing: -0.01em;
        font-variant-numeric: tabular-nums;

        opacity: 0.74;
        cursor: grab;
        user-select: none;
        white-space: nowrap;
        outline: none;

        transition:
            opacity 140ms ease,
            background 140ms ease,
            border-color 140ms ease,
            box-shadow 140ms ease;
    }

    .anchor:hover,
    .anchor:focus-visible {
        opacity: 0.98;
        background: rgba(22, 22, 22, 0.91);
        border-color: rgba(255, 255, 255, 0.15);
        box-shadow: 0 3px 12px rgba(0, 0, 0, 0.20);
    }

    .anchor:focus-visible {
        box-shadow:
            0 0 0 2px rgba(255, 255, 255, 0.28),
            0 3px 12px rgba(0, 0, 0, 0.20);
    }

    .details {
        position: absolute;
        top: 50%;
        height: 30px;
        box-sizing: border-box;

        display: flex;
        align-items: center;
        gap: 6px;
        padding: 0 10px;

        background: rgba(22, 22, 22, 0.90);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);

        border: 1px solid rgba(255, 255, 255, 0.10);
        border-radius: 999px;
        box-shadow: 0 3px 12px rgba(0, 0, 0, 0.18);

        color: rgba(255, 255, 255, 0.94);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 10.5px;
        font-weight: 500;
        line-height: 1;
        white-space: nowrap;

        opacity: 0;
        visibility: hidden;
        pointer-events: none;
        transform: translateY(-50%) scale(0.985);

        transition:
            opacity 120ms ease,
            transform 140ms ease,
            visibility 0s linear 140ms;
    }

    .details.open-left {
        right: calc(100% + 6px);
    }

    .details.open-right {
        left: calc(100% + 6px);
    }

    .details.open-left::after,
    .details.open-right::after {
        content: "";
        position: absolute;
        top: -2px;
        bottom: -2px;
        width: 8px;
    }

    .details.open-left::after {
        right: -8px;
    }

    .details.open-right::after {
        left: -8px;
    }

    .widget:hover .details,
    .widget:focus-within .details,
    .widget.pinned .details {
        opacity: 1;
        visibility: visible;
        pointer-events: auto;
        transform: translateY(-50%) scale(1);
        transition-delay: 0s;
    }

    .widget.dismissed .details,
    .widget.dragging .details {
        opacity: 0 !important;
        visibility: hidden !important;
        pointer-events: none !important;
    }

    .widget.dragging .anchor {
        opacity: 1;
        cursor: grabbing;
        background: rgba(22, 22, 22, 0.96);
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.22);
    }

    .site {
        display: flex;
        align-items: center;
        gap: 5px;
    }

    .site-icon {
        width: 14px;
        height: 14px;
        flex-shrink: 0;
        border-radius: 3px;
        object-fit: contain;
    }

    .site-name {
        max-width: 76px;
        overflow: hidden;
        text-overflow: ellipsis;
        color: rgba(255, 255, 255, 0.74);
    }

    .divider {
        color: rgba(255, 255, 255, 0.23);
    }

    .label {
        color: rgba(255, 255, 255, 0.46);
        font-size: 10px;
    }

    .today-value {
        font-weight: 650;
        letter-spacing: -0.01em;
        font-variant-numeric: tabular-nums;
    }

    @media (prefers-reduced-motion: reduce) {
        .anchor,
        .details {
            transition: none;
        }
    }
</style>

<div class="widget" id="usage-widget">
    <div class="details open-left" id="details-panel">
        <div class="site">
            <img class="site-icon" id="site-icon" alt="">
            <span class="site-name" id="site-name"></span>
        </div>

        <span class="divider">·</span>
        <span class="label">Today</span>
        <span class="today-value" id="day-time">00:00</span>
    </div>

    <div
        class="anchor"
        id="timer-anchor"
        tabindex="0"
        role="button"
        aria-expanded="false"
        aria-label="Current session timer. Click for details. Drag to move."
    >
        <span id="session-time">00:00</span>
    </div>
</div>
`;

document.documentElement.appendChild(tickerHost);

const widget = shadow.getElementById("usage-widget");
const detailsPanel = shadow.getElementById("details-panel");
const timerAnchor = shadow.getElementById("timer-anchor");
const dayTimeElement = shadow.getElementById("day-time");
const sessionTimeElement = shadow.getElementById("session-time");
const siteIcon = shadow.getElementById("site-icon");
const siteNameElement = shadow.getElementById("site-name");

const currentDomain = window.location.hostname;
const DRAG_THRESHOLD = 4;

let savedTickerPosition = null;
let dragState = null;
let resizeFrame = null;
let tickerIntervalId = null;


// -------------------------
// SITE IDENTITY
// -------------------------

const siteNames = {
    "youtube.com": "YouTube",
    "instagram.com": "Instagram",
    "linkedin.com": "LinkedIn",
    "tiktok.com": "TikTok",
    "reddit.com": "Reddit",
    "twitter.com": "Twitter",
    "facebook.com": "Facebook",
    "pinterest.com": "Pinterest",
    "snapchat.com": "Snapchat",
    "twitch.tv": "Twitch"
};

function getDisplayDomain(hostname) {
    for (const domain in siteNames) {
        if (
            hostname === domain ||
            hostname.endsWith("." + domain)
        ) {
            return domain;
        }
    }

    return hostname;
}

function faviconURL(pageUrl) {
    const url = new URL(
        chrome.runtime.getURL("/_favicon/")
    );

    url.searchParams.set("pageUrl", pageUrl);
    url.searchParams.set("size", "32");

    return url.toString();
}

const displayDomain =
    getDisplayDomain(currentDomain);

siteNameElement.innerText =
    siteNames[displayDomain] ?? displayDomain;

siteIcon.src =
    faviconURL(window.location.href);

siteIcon.addEventListener("error", () => {
    siteIcon.style.display = "none";
});


// -------------------------
// POSITIONING
// -------------------------

function clampPosition(x, y) {
    const maxX = Math.max(
        0,
        window.innerWidth - tickerHost.offsetWidth
    );

    const maxY = Math.max(
        0,
        window.innerHeight - tickerHost.offsetHeight
    );

    return {
        x: Math.max(0, Math.min(x, maxX)),
        y: Math.max(0, Math.min(y, maxY))
    };
}

function setTickerPosition(x, y) {
    const position =
        clampPosition(x, y);

    tickerHost.style.right = "auto";
    tickerHost.style.bottom = "auto";
    tickerHost.style.left = position.x + "px";
    tickerHost.style.top = position.y + "px";
}

async function saveTickerPosition() {
    const rect =
        tickerHost.getBoundingClientRect();

    savedTickerPosition = {
        x: Math.round(rect.left),
        y: Math.round(rect.top)
    };

    try {
        await chrome.storage.sync.set({
            tickerX: savedTickerPosition.x,
            tickerY: savedTickerPosition.y
        });
    } catch (error) {
        console.error(
            "Error saving ticker position:",
            error
        );
    }
}

async function restoreTickerPosition() {
    try {
        const result =
            await chrome.storage.sync.get([
                "tickerX",
                "tickerY"
            ]);

        if (
            Number.isFinite(result.tickerX) &&
            Number.isFinite(result.tickerY)
        ) {
            savedTickerPosition = {
                x: result.tickerX,
                y: result.tickerY
            };

            setTickerPosition(
                savedTickerPosition.x,
                savedTickerPosition.y
            );
        }
    } catch (error) {
        console.error(
            "Error restoring ticker position:",
            error
        );
    }
}

function renderSavedTickerPosition() {
    if (savedTickerPosition !== null) {
        setTickerPosition(
            savedTickerPosition.x,
            savedTickerPosition.y
        );
    }

    updateDetailsSide();
}

function updateDetailsSide() {
    const rect =
        tickerHost.getBoundingClientRect();

    const panelWidth =
        detailsPanel.offsetWidth;

    const availableLeft =
        rect.left;

    const availableRight =
        window.innerWidth - rect.right;

    const openRight =
        availableRight >= panelWidth + 6 ||
        availableRight >= availableLeft;

    detailsPanel.classList.toggle(
        "open-right",
        openRight
    );

    detailsPanel.classList.toggle(
        "open-left",
        !openRight
    );
}


// -------------------------
// DETAILS PANEL
// -------------------------

function setPinned(isPinned) {
    widget.classList.toggle(
        "pinned",
        isPinned
    );

    timerAnchor.setAttribute(
        "aria-expanded",
        String(isPinned)
    );
}

function openPinnedDetails() {
    widget.classList.remove("dismissed");
    setPinned(true);
    updateDetailsSide();
}

function closePinnedDetails(
    { dismissUntilLeave = false } = {}
) {
    setPinned(false);

    widget.classList.toggle(
        "dismissed",
        dismissUntilLeave
    );
}

function togglePinnedDetails() {
    if (
        widget.classList.contains("pinned")
    ) {
        closePinnedDetails({
            dismissUntilLeave: true
        });
    } else {
        openPinnedDetails();
    }
}

timerAnchor.addEventListener(
    "pointerenter",
    () => {
        if (dragState === null) {
            widget.classList.remove(
                "dismissed"
            );

            updateDetailsSide();
        }
    }
);

timerAnchor.addEventListener(
    "focus",
    () => {
        widget.classList.remove(
            "dismissed"
        );

        updateDetailsSide();
    }
);

widget.addEventListener(
    "pointerleave",
    () => {
        if (dragState === null) {
            widget.classList.remove(
                "dismissed"
            );
        }
    }
);


// -------------------------
// DRAGGING
// -------------------------

function beginActualDrag() {
    const rect =
        tickerHost.getBoundingClientRect();

    setPinned(false);

    widget.classList.add(
        "dragging",
        "dismissed"
    );

    tickerHost.style.left =
        rect.left + "px";

    tickerHost.style.top =
        rect.top + "px";

    tickerHost.style.right = "auto";
    tickerHost.style.bottom = "auto";
}

timerAnchor.addEventListener(
    "pointerdown",
    (event) => {
        if (event.button !== 0) {
            return;
        }

        event.preventDefault();

        const rect =
            tickerHost.getBoundingClientRect();

        dragState = {
            startX: event.clientX,
            startY: event.clientY,
            offsetX:
                event.clientX - rect.left,
            offsetY:
                event.clientY - rect.top,
            dragging: false
        };

        timerAnchor.setPointerCapture(
            event.pointerId
        );
    }
);

timerAnchor.addEventListener(
    "pointermove",
    (event) => {
        if (dragState === null) {
            return;
        }

        const distance = Math.hypot(
            event.clientX - dragState.startX,
            event.clientY - dragState.startY
        );

        if (
            !dragState.dragging &&
            distance > DRAG_THRESHOLD
        ) {
            dragState.dragging = true;
            beginActualDrag();
        }

        if (!dragState.dragging) {
            return;
        }

        event.preventDefault();

        setTickerPosition(
            event.clientX -
                dragState.offsetX,
            event.clientY -
                dragState.offsetY
        );
    }
);

async function finishPointerInteraction(
    allowClick
) {
    if (dragState === null) {
        return;
    }

    const wasDragging =
        dragState.dragging;

    dragState = null;

    widget.classList.remove(
        "dragging"
    );

    if (wasDragging) {
        setPinned(false);

        widget.classList.add(
            "dismissed"
        );

        timerAnchor.blur();

        await saveTickerPosition();
        updateDetailsSide();

        return;
    }

    if (allowClick) {
        togglePinnedDetails();
    }
}

timerAnchor.addEventListener(
    "pointerup",
    () => {
        finishPointerInteraction(true);
    }
);

timerAnchor.addEventListener(
    "pointercancel",
    () => {
        finishPointerInteraction(false);
    }
);


// -------------------------
// CLICK OUTSIDE
// -------------------------

document.addEventListener(
    "pointerdown",
    (event) => {
        if (
            !event
                .composedPath()
                .includes(tickerHost)
        ) {
            closePinnedDetails();
        }
    }
);


// -------------------------
// KEYBOARD
// -------------------------

document.addEventListener(
    "keydown",
    async (event) => {
        const timerHasFocus =
            shadow.activeElement ===
            timerAnchor;

        if (
            event.key === "Escape" &&
            (
                widget.matches(":hover") ||
                timerHasFocus ||
                widget.classList.contains(
                    "pinned"
                )
            )
        ) {
            closePinnedDetails({
                dismissUntilLeave: true
            });

            timerAnchor.blur();
            return;
        }

        if (
            timerHasFocus &&
            (
                event.key === "Enter" ||
                event.key === " "
            )
        ) {
            event.preventDefault();
            togglePinnedDetails();
            return;
        }

        const arrowKeys = [
            "ArrowLeft",
            "ArrowRight",
            "ArrowUp",
            "ArrowDown"
        ];

        if (
            !timerHasFocus ||
            !arrowKeys.includes(event.key)
        ) {
            return;
        }

        event.preventDefault();

        const rect =
            tickerHost.getBoundingClientRect();

        const step =
            event.shiftKey ? 40 : 10;

        let x = rect.left;
        let y = rect.top;

        if (event.key === "ArrowLeft") {
            x -= step;
        }

        if (event.key === "ArrowRight") {
            x += step;
        }

        if (event.key === "ArrowUp") {
            y -= step;
        }

        if (event.key === "ArrowDown") {
            y += step;
        }

        setTickerPosition(x, y);
        updateDetailsSide();

        await saveTickerPosition();
    }
);


// -------------------------
// VIEWPORT SAFETY
// -------------------------

function scheduleSavedPositionRender() {
    if (resizeFrame !== null) {
        cancelAnimationFrame(
            resizeFrame
        );
    }

    resizeFrame =
        requestAnimationFrame(() => {
            resizeFrame = null;

            if (dragState !== null) {
                return;
            }

            renderSavedTickerPosition();
        });
}

window.addEventListener(
    "resize",
    scheduleSavedPositionRender
);

window.addEventListener(
    "focus",
    scheduleSavedPositionRender
);

document.addEventListener(
    "visibilitychange",
    () => {
        if (
            document.visibilityState ===
            "visible"
        ) {
            scheduleSavedPositionRender();
        }
    }
);


// -------------------------
// TIMER
// -------------------------

function handleTickerError(error) {
    const message =
        error?.message ||
        String(error);

    if (
        message.includes(
            "Extension context invalidated"
        )
    ) {
        if (tickerIntervalId !== null) {
            clearInterval(
                tickerIntervalId
            );
        }

        return;
    }

    console.error(
        "Error updating usage ticker:",
        error
    );
}

function updateTicker() {
    if (
        document.visibilityState !==
        "visible"
    ) {
        return;
    }

    try {
        chrome.runtime.sendMessage({
            type: "GET_USAGE",
            domain: currentDomain
        })
        .then((response) => {
            if (response == null) {
                return;
            }

            const dayTime =
                formatTime(
                    response.totalUsage
                );

            const sessionTime =
                formatTime(
                    response.sessionUsage
                );

            dayTimeElement.innerText =
                dayTime;

            sessionTimeElement.innerText =
                sessionTime;

            timerAnchor.setAttribute(
                "aria-label",
                "Current session " +
                sessionTime +
                ". Click for details. Drag to move."
            );
        })
        .catch(handleTickerError);

    } catch (error) {
        handleTickerError(error);
    }
}

function formatTime(totalSeconds) {
    if (
        !Number.isFinite(totalSeconds) ||
        totalSeconds < 0
    ) {
        return "--:--";
    }

    totalSeconds =
        Math.round(totalSeconds);

    const minutes =
        Math.floor(
            totalSeconds / 60
        );

    const seconds =
        totalSeconds % 60;

    return (
        minutes
            .toString()
            .padStart(2, "0") +
        ":" +
        seconds
            .toString()
            .padStart(2, "0")
    );
}


// -------------------------
// STARTUP
// -------------------------

async function initializeTicker() {
    await restoreTickerPosition();

    updateDetailsSide();

    tickerHost.style.visibility =
        "visible";

    updateTicker();

    tickerIntervalId =
        setInterval(
            updateTicker,
            1000
        );
}

initializeTicker();