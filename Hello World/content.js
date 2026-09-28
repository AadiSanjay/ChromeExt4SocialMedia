const time_box = document.createElement("div");

time_box.innerText = "";
time_box.style.position = "fixed";
time_box.style.top = "20px";
time_box.style.right = "20px";
time_box.style.backgroundColor = "rgba(20, 20, 20, 0.9)";
time_box.style.color = "white";
time_box.style.padding = "8px 12px";
time_box.style.borderRadius = "8px";
time_box.style.fontFamily = "Arial, sans-serif";
time_box.style.fontSize = "14px";
time_box.style.fontWeight = "600";
time_box.style.zIndex = "999999";

document.body.appendChild(time_box);

let currentDomain = window.location.hostname;

function updateTicker() {
if (document.visibilityState !== "visible") {
    return;
}
chrome.runtime.sendMessage({
    type: "GET_USAGE",
    domain: currentDomain
})
.then((response) => {

    const dayTime = formatTime(response.totalUsage);
    const sessionTime = formatTime(response.sessionUsage);
    const finalTime = dayTime + " · " + sessionTime;
    time_box.innerText = finalTime;
});
}
updateTicker();
setInterval(updateTicker, 1000);

function formatTime(totalSeconds) {
    totalSeconds = Math.round(totalSeconds);
    const minutes = Math.floor(totalSeconds/60);
    const seconds = totalSeconds % 60;
    const formattedMinutes = (minutes.toString()).padStart(2, "0");
    const formattedSeconds = (seconds.toString()).padStart(2, "0");
    const finalTime = formattedMinutes + ":" + formattedSeconds;
    return finalTime;
};