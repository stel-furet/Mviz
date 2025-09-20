// Theme System Functions
function initializeThemeSystem() {
    const themeSelector = document.getElementById('themeSelector');
    if (!themeSelector) return;

    // Load saved theme or default to steel-gray
    const savedTheme = localStorage.getItem('vizzy-theme') || 'steel-gray';
    themeSelector.value = savedTheme;
    applyTheme(savedTheme);

    // Add event listener for theme changes
    themeSelector.addEventListener('change', (e) => {
        const selectedTheme = e.target.value;
        applyTheme(selectedTheme);
        localStorage.setItem('vizzy-theme', selectedTheme);
    });
}

function applyTheme(themeName) {
    // Remove existing theme classes
    document.body.classList.remove('theme-steel-gray', 'theme-sunset', 'theme-aurora');
    
    // Apply new theme
    document.body.setAttribute('data-theme', themeName);
    document.body.classList.add(`theme-${themeName}`);
    
    // Update any elements that need theme-specific styling
    updateThemeElements(themeName);
}

function updateThemeElements(themeName) {
    // Update any elements that need special theme handling
    const themeColors = {
        'steel-gray': {
            primary: '#111827',
            secondary: '#1f2937',
            accent: '#6b7280'
        },
        'sunset': {
            primary: '#1c1917',
            secondary: '#292524',
            accent: '#f97316'
        },
        'aurora': {
            primary: '#2c3e50',
            secondary: '#34495e',
            accent: '#667eea'
        }
    };

    const colors = themeColors[themeName] || themeColors['steel-gray'];
    
    // Update any custom elements that need theme colors
    // This will be expanded as we add more theme-aware components
    // console.log(`Theme applied: ${themeName}`, colors);
}

