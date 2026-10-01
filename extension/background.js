let refreshQueue = Promise.resolve();

const trackedDomains = new Set([
    "linkedin.com",
    "youtube.com",
    "instagram.com",
    "tiktok.com",
    "reddit.com",
    "twitter.com",
    "facebook.com",
    "pinterest.com",
    "snapchat.com",
    "twitch.tv"
]);

function queueRefresh() {
    refreshQueue = refreshQueue
        .then(() => refreshSession())
        .catch((error) => {
            console.error("Error in refreshQueue:", error);
        });
}

function queueStop() {
    refreshQueue = refreshQueue
        .then(async () => {
            await checkpointSession();
            await clearCurrentSession();
        })
        .catch((error) => {
            console.error("Error in queueStop:", error);
        });
}

function queueCheckpoint() {
    refreshQueue = refreshQueue
        .then(() => checkpointSession())
        .catch((error) => {
            console.error("Error in queueCheckpoint:", error);
        });
}

function getTrackedDomain(hostname) {
    for (const domain of trackedDomains) {
        if (
            hostname === domain ||
            hostname.endsWith("." + domain)
        ) {
            return domain;
        }
    }
    return null;
}

function getLocalDate() {
    return new Date().toLocaleDateString("sv-SE");
}

async function ensureCheckpointAlarm() {
    const alarm = await chrome.alarms.get("checkpointAlarm");

    if (!alarm) {
        await chrome.alarms.create("checkpointAlarm", {
            periodInMinutes: 1
        });
    }
}

async function getCurrentSession() {
    const result = await chrome.storage.session.get("currentSession");
    return result.currentSession;
}

async function setCurrentSession(session) {
    await chrome.storage.session.set({
        currentSession: session
    });
}

async function clearCurrentSession() {
    await chrome.storage.session.remove("currentSession");
}

async function addElapsedTime(domain, elapsedTime) {
    if (domain == null || elapsedTime <= 0) {
        return;
    }

    const localDate = getLocalDate();

    const result = await chrome.storage.local.get([
        "usage",
        "usageDate"
    ]);

    let usage = result.usage ?? {};

    if (result.usageDate !== localDate) {
        usage = {};
    }

    usage[domain] = (usage[domain] ?? 0) + elapsedTime;

    await chrome.storage.local.set({
        usage: usage,
        usageDate: localDate
    });
}

async function checkpointSession() {
    const session = await getCurrentSession();

    if (session == null) {
        return;
    }

    const now = Date.now();

    const elapsedTime = Math.max(
        0,
        (now - session.lastCheckpointTime) / 1000
    );

    await addElapsedTime(
        session.domain,
        elapsedTime
    );

    session.lastCheckpointTime = now;

    await setCurrentSession(session);
}

async function refreshSession() {
    const idleState = await chrome.idle.queryState(60);

    if (idleState !== "active") {
        await clearCurrentSession();
        return;
    }

    await checkpointSession();

    const focusedWindow =
        await chrome.windows.getLastFocused();

    if (!focusedWindow.focused) {
        await clearCurrentSession();
        return;
    }

    const tabs = await chrome.tabs.query({
        active: true,
        windowId: focusedWindow.id
    });

    const activeTab = tabs[0];

    if (
        activeTab == null ||
        activeTab.url == null ||
        (
            !activeTab.url.startsWith("http://") &&
            !activeTab.url.startsWith("https://")
        )
    ) {
        await clearCurrentSession();
        return;
    }

    const parsedUrl = new URL(activeTab.url);

    const newDomain =
        getTrackedDomain(parsedUrl.hostname);

    if (newDomain === null) {
        await clearCurrentSession();
        return;
    }

    const existingSession =
        await getCurrentSession();

    if (
        existingSession != null &&
        existingSession.domain === newDomain
    ) {
        return;
    }

    const now = Date.now();

    await setCurrentSession({
        domain: newDomain,
        lastCheckpointTime: now,
        sessionStartTime: now
    });
}

async function getCurrentUsage(domain) {
    let storedUsage = 0;
    let sessionUsage = 0;

    if (domain == null) {
        return {
            totalUsage: 0,
            sessionUsage: 0
        };
    }

    const localDate = getLocalDate();

    const session = await getCurrentSession();

    const result = await chrome.storage.local.get([
        "usage",
        "usageDate"
    ]);

    if (
        result.usageDate === localDate &&
        result.usage != null &&
        result.usage[domain] != null
    ) {
        storedUsage = result.usage[domain];
    }

    if (
        session != null &&
        session.domain === domain
    ) {
        const now = Date.now();

        storedUsage += Math.max(
            0,
            (now - session.lastCheckpointTime) / 1000
        );

        sessionUsage = Math.max(
            0,
            (now - session.sessionStartTime) / 1000
        );
    }

    return {
        totalUsage: storedUsage,
        sessionUsage: sessionUsage
    };
}


// -------------------------
// EVENTS
// -------------------------

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "checkpointAlarm") {
        queueCheckpoint();
    }
});

chrome.idle.onStateChanged.addListener((newState) => {
    if (newState === "active") {
        queueRefresh();
    } else {
        queueStop();
    }
});

chrome.tabs.onActivated.addListener(() => {
    queueRefresh();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (
        changeInfo.url != null &&
        tab.active
    ) {
        queueRefresh();
    }
});

chrome.windows.onFocusChanged.addListener((windowId) => {
    if (
        windowId === chrome.windows.WINDOW_ID_NONE
    ) {
        queueStop();
    } else {
        queueRefresh();
    }
});

chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {
        if (message.type !== "GET_USAGE") {
            return;
        }

        const currentDomain =
            getTrackedDomain(message.domain);

        getCurrentUsage(currentDomain)
            .then((usage) => {
                sendResponse(usage);
            })
            .catch((error) => {
                console.error(
                    "Error getting usage:",
                    error
                );

                sendResponse({
                    totalUsage: 0,
                    sessionUsage: 0
                });
            });

        return true;
    }
);


// -------------------------
// STARTUP
// -------------------------

queueRefresh();

ensureCheckpointAlarm()
    .catch((error) => {
        console.error(
            "Error creating checkpoint alarm:",
            error
        );
    });