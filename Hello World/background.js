let refreshQueue = Promise.resolve();

function queueRefresh() {
    refreshQueue = refreshQueue.then(() => refreshSession())
    .catch((error) => {
        console.error("Error in refreshQueue:", error)
    });
}

function queueStop(){
    refreshQueue = refreshQueue.then(async() => {
        await checkpointSession();
        await clearCurrentSession();
    })
    .catch((error) => {
        console.error("Error in queueStop:", error)
    });
    
}

async function ensureCheckpointAlarm() {
    const alarm = await chrome.alarms.get("checkpointAlarm");
        if(!alarm) {
            await chrome.alarms.create("checkpointAlarm", { periodInMinutes: 1});
        }};

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "checkpointAlarm") {
        queueCheckpoint();
    }
});

function queueCheckpoint() {
    refreshQueue = refreshQueue.then(() => checkpointSession())
    .catch((error) => {
        console.error("Error in queueCheckpoint:", error)
    });
}

const trackedDomains = new Set([
    "linkedin.com",
    "youtube.com",
    "instagram.com",
    "tiktok.com"

]);

function getTrackedDomain(hostname) {
    for (const domain of trackedDomains) { 
    if (hostname === domain || hostname.endsWith("." + domain)) {
        return domain;
        }
    }
    return null;
}

async function addElapsedTime(domain, elapsedTime) {
const localDate = new Date().toLocaleDateString('sv-SE');
    const result = await chrome.storage.local.get(["usage", "usageDate"]);
    if (result.usage == null) {
        result.usage = {};
    }
    if (result.usageDate != localDate) {
    result.usage = {};
    result.usageDate = localDate;
}
    if (result.usage[domain] != null) {
        result.usage[domain] += elapsedTime;
    } else {
        result.usage[domain] = elapsedTime;
    }
     await chrome.storage.local.set({
    "usage": result.usage,
    "usageDate": result.usageDate

});      
}

async function checkpointSession() {
     let session = await getCurrentSession();
    if (session != null) {
        const elapsedTime = (Date.now() - session.lastCheckpointTime) / 1000;
        await addElapsedTime(session.domain, elapsedTime);
        session.lastCheckpointTime = Date.now();
        await setCurrentSession(session);
    }
}

async function refreshSession() {
    await checkpointSession();
    const window = await chrome.windows.getLastFocused();
        if (!window.focused) {
            await clearCurrentSession();
            return;
        }
     const tabs = await chrome.tabs.query({
        active: true,
        windowId: window.id
     });

        if (
            tabs[0] != null &&
            tabs[0].url != null &&
            (
                tabs[0].url.startsWith('http://') ||
                tabs[0].url.startsWith('https://')
            )
        ) {
            const tabUrl = tabs[0].url;
            const parsedUrl = new URL(tabUrl);
            const newDomain = getTrackedDomain(parsedUrl.hostname)
            if (newDomain === null){
                await clearCurrentSession();
                return;
            }
            const existingSession = await getCurrentSession();
            if (existingSession != null && existingSession.domain === newDomain) {
                return;
            }
            const session = {
            domain: newDomain,
            lastCheckpointTime: Date.now(),
            sessionStartTime: Date.now()
            };
            
           await setCurrentSession(session);

        } else {
            await clearCurrentSession();
        }

    }

chrome.idle.onStateChanged.addListener((newState) => {
    if (newState === "active") {
        queueRefresh();
    }
    else {
        queueStop();
    }
});

chrome.tabs.onActivated.addListener(() => {
    queueRefresh();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url != null && tab.active) {
    queueRefresh();
}});

chrome.windows.onFocusChanged.addListener((windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
        queueStop();
    }
    else {
        queueRefresh();
    }
});
queueRefresh();
ensureCheckpointAlarm();

async function getCurrentSession() {
    const result = await chrome.storage.session.get("currentSession");
    return result.currentSession;
}

async function setCurrentSession(session) {
    await chrome.storage.session.set({
        currentSession: session
    })
}

async function clearCurrentSession(){
    await chrome.storage.session.remove("currentSession");
}

async function getCurrentUsage(domain) {
    let storedUsage;
    let sessionUsage = 0;
    const session = await getCurrentSession();
    const result = await chrome.storage.local.get("usage");
    
    if (result.usage != null && result.usage[domain] != null) {
        storedUsage = result.usage[domain];
    }
    else {
        storedUsage = 0;
    }
    if (session != null && session.domain === domain) {
        const elapsedTime = (Date.now() - session.lastCheckpointTime) / 1000;
        storedUsage += elapsedTime;
        const totalnewTime = (Date.now() - session.sessionStartTime) / 1000;
        sessionUsage = totalnewTime;
    }
    return {
        totalUsage: storedUsage,
        sessionUsage: sessionUsage
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "GET_USAGE") {
        const currentDomain = getTrackedDomain(message.domain);

        getCurrentUsage(currentDomain).then((usage) => {
            sendResponse(usage);
        });
        return true;
    }
});


