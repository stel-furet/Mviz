// UI Controls - Sidebar and Drawer functionality completely removed
// All functionality has been moved to header/footer controls

// Global function for closing info popup
function closeInfoPopup() {
    if (window.visualizer) {
        window.visualizer.closeInfoPopup();
    }
}