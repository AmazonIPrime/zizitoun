const { ipcRenderer } = require('electron');

window.desktopMate = {
    dragWindow: (deltaX, deltaY) => {
        ipcRenderer.send('window-drag', { deltaX, deltaY });
    },

    setIgnoreMouse: (ignore) => {
        ipcRenderer.send('set-ignore-mouse-events', ignore);
    },

    getScreenSize: () => {
        return ipcRenderer.invoke('get-screen-size');
    },

    getWindowBounds: () => {
        return ipcRenderer.invoke('get-window-bounds');
    },

    getScreenLayout: () => {
        return ipcRenderer.invoke('get-screen-layout');
    },

    setWindowPosition: (x, y) => {
        ipcRenderer.send('set-window-position', { x, y });
    },

    getVisibleWindows: () => {
        return ipcRenderer.invoke('get-visible-windows');
    },

    setWindowSize: (width, height) => {
        ipcRenderer.send('set-window-size', { width, height });
    },

    onTriggerAnimation: (callback) => {
        ipcRenderer.on('trigger-animation', (event, animationName) => {
            callback(animationName);
        });
    },

    onWindowMoved: (callback) => {
        ipcRenderer.on('window-moved', (event, bounds) => {
            callback(bounds);
        });
    }
};
