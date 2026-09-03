let currentSession = null;

function addElapsedTime(domain, elapsedTime) {
chrome.storage.local.get(domain).then((result) => {
    if (result[domain] != null) {
        result[domain] += elapsedTime;
    } else {
        result[domain] = elapsedTime;
    }
     chrome.storage.local.set({
    [domain]: result[domain]
});      
});
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

