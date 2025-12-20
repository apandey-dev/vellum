// 1. Loader Logic
let progress = 0;
const bar = document.getElementById('bar');
const statusText = document.getElementById('load-status');

const interval = setInterval(() => {
    progress += Math.floor(Math.random() * 5) + 2;
    if (progress > 100) progress = 100;
    
    bar.style.width = progress + "%";
    statusText.innerText = progress + "% complete";

    if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
            document.getElementById('loader').style.display = 'none';
            document.getElementById('main-content').classList.remove('hidden');
            initFloatingIcons();
        }, 500);
    }
}, 100);

// 2. Interactive Floating Icons
const symbols = [
    '<svg viewBox="0 0 24 24" width="40"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>', // Layer icon
    '<svg viewBox="0 0 24 24" width="40"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>', // Chart icon
    '<svg viewBox="0 0 24 24" width="40"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>' // Gear icon
];

function initFloatingIcons() {
    const area = document.getElementById('floating-area');
    for (let i = 0; i < 15; i++) {
        let div = document.createElement('div');
        div.className = 'floating-icon';
        div.innerHTML = symbols[Math.floor(Math.random() * symbols.length)];
        div.style.left = Math.random() * 100 + "vw";
        div.style.top = Math.random() * 100 + "vh";
        area.appendChild(div);
    }
}

// Mouse Parallax Effect
document.addEventListener('mousemove', (e) => {
    const icons = document.querySelectorAll('.floating-icon');
    const x = (window.innerWidth - e.pageX) / 30;
    const y = (window.innerHeight - e.pageY) / 30;

    icons.forEach(icon => {
        icon.style.transform = `translateX(${x}px) translateY(${y}px)`;
    });
});