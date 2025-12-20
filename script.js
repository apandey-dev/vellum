window.addEventListener('load', () => {
    const loader = document.getElementById('loader');
    const mainContent = document.getElementById('main-content');

    // Loader timeout (3 seconds)
    setTimeout(() => {
        loader.style.display = 'none';
        mainContent.classList.remove('hidden');
        createFloatingSymbols();
    }, 3500);
});

function createFloatingSymbols() {
    const container = document.getElementById('floating-symbols');
    const symbols = ['∑', 'π', '📊', '📈', 'f(x)', '{ }', 'σ', 'μ'];
    
    for (let i = 0; i < 20; i++) {
        let span = document.createElement('span');
        span.classList.add('symbol');
        span.innerText = symbols[Math.floor(Math.random() * symbols.length)];
        
        // Random position and speed
        span.style.left = Math.random() * 100 + 'vw';
        span.style.animationDuration = (Math.random() * 5 + 5) + 's';
        span.style.animationDelay = Math.random() * 5 + 's';
        
        container.appendChild(span);
    }
}