const VERSION = "v1.12.2";

document.addEventListener("DOMContentLoaded", () => {
    const versionElements = document.querySelectorAll('.app-ver');
    versionElements.forEach(el => {
        el.textContent = VERSION;
    });
});