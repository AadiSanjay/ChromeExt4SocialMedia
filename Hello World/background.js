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

function queueCheckpoint() {
    refreshQueue = refreshQueue.then(() => checkpointSession()
    .catch((error) => {
        console.error("Error in queueCheckpoint:", error)
    }));
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
        const elapsedTime = (Date.now() - session.startTime) / 1000;
        await addElapsedTime(session.domain, elapsedTime);
        session.startTime = Date.now();
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

            const session = {
                domain: parsedUrl.hostname,
                startTime: Date.now()
            };
           await setCurrentSession(session);
            console.log(session);

        } else {
            console.log("This is not a valid URL");
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

chrome.windows.onFocusChanged.addListener((windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
        queueStop();
    }
    else {
        queueRefresh();
    }
});
queueRefresh();

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