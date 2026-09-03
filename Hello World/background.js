let currentSession = null;

function addElapsedTime(domain, elapsedTime) {
const localDate = new Date().toLocaleDateString('sv-SE');
chrome.storage.local.get(["usage", "usageDate"]).then((result) => {
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
     chrome.storage.local.set({
    "usage": result.usage,
    "usageDate": result.usageDate

});      
});
}

function checkpointSession() {
    if (currentSession != null) {
        const elapsedTime = (Date.now() - currentSession.startTime) / 1000;
        addElapsedTime(currentSession.domain, elapsedTime);
        currentSession.startTime = Date.now();
    }
}

chrome.windows.getLastFocused({}).then((window) => {
    chrome.tabs.query({
        active: true,
        windowId: window.id
    }).then((tabs) => {

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

            currentSession = {
                domain: parsedUrl.hostname,
                startTime: Date.now()
            };

            console.log(currentSession);

        } else {
            console.log("This is not a valid URL");
        }

    });
});

