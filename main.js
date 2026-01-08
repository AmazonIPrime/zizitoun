const { app, BrowserWindow, Tray, Menu, ipcMain, screen, nativeImage, powerMonitor, desktopCapturer } = require('electron');
const path = require('path');

let mainWindow;
let tray;
let isQuitting = false;

const WINDOW_CONFIG = {
    width: 500,
    height: 700,
    minWidth: 200,
    minHeight: 250
};

function createWindow() {
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

    mainWindow = new BrowserWindow({
        width: WINDOW_CONFIG.width,
        height: WINDOW_CONFIG.height,
        x: screenWidth - WINDOW_CONFIG.width - 50,
        y: screenHeight - WINDOW_CONFIG.height - 50,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        hasShadow: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.setIgnoreMouseEvents(false);
    mainWindow.loadFile('index.html');

    mainWindow.on('close', (event) => {
        if (!isQuitting) {
            event.preventDefault();
            mainWindow.hide();
            return false;
        }
    });

    mainWindow.on('moved', () => {
        const bounds = mainWindow.getBounds();
        mainWindow.webContents.send('window-moved', bounds);
    });

    if (process.argv.includes('--enable-logging')) {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
}

function createTray() {
    const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
    let trayIcon;

    try {
        trayIcon = nativeImage.createFromPath(iconPath);
        if (trayIcon.isEmpty()) {
            trayIcon = createDefaultTrayIcon();
        }
    } catch (e) {
        trayIcon = createDefaultTrayIcon();
    }

    tray = new Tray(trayIcon);

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Saluer',
            click: () => mainWindow.webContents.send('trigger-animation', 'wave')
        },
        {
            label: 'Danser',
            click: () => mainWindow.webContents.send('trigger-animation', 'dance')
        },
        {
            label: 'S\'asseoir',
            click: () => mainWindow.webContents.send('trigger-animation', 'sit')
        },
        { type: 'separator' },
        {
            label: 'Afficher/Masquer',
            click: () => {
                if (mainWindow.isVisible()) {
                    mainWindow.hide();
                } else {
                    mainWindow.show();
                }
            }
        },
        {
            label: 'Reinitialiser Position',
            click: () => resetWindowPosition()
        },
        { type: 'separator' },
        {
            label: 'Quitter',
            click: () => {
                isQuitting = true;
                app.quit();
            }
        }
    ]);

    tray.setToolTip('Desktop Mate');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
        if (mainWindow.isVisible()) {
            mainWindow.focus();
        } else {
            mainWindow.show();
        }
    });
}

function createDefaultTrayIcon() {
    const size = 16;
    const canvas = Buffer.alloc(size * size * 4);

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;
            const centerX = size / 2;
            const centerY = size / 2;
            const radius = size / 2 - 1;
            const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);

            if (dist <= radius) {
                canvas[idx] = 255;
                canvas[idx + 1] = 105;
                canvas[idx + 2] = 180;
                canvas[idx + 3] = 255;
            } else {
                canvas[idx] = 0;
                canvas[idx + 1] = 0;
                canvas[idx + 2] = 0;
                canvas[idx + 3] = 0;
            }
        }
    }

    return nativeImage.createFromBuffer(canvas, { width: size, height: size });
}

function resetWindowPosition() {
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
    mainWindow.setBounds({
        x: screenWidth - WINDOW_CONFIG.width - 50,
        y: screenHeight - WINDOW_CONFIG.height - 50,
        width: WINDOW_CONFIG.width,
        height: WINDOW_CONFIG.height
    });
}

ipcMain.on('window-drag', (event, { deltaX, deltaY }) => {
    const bounds = mainWindow.getBounds();
    mainWindow.setBounds({
        x: bounds.x + deltaX,
        y: bounds.y + deltaY,
        width: bounds.width,
        height: bounds.height
    });
});

ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
        win.setIgnoreMouseEvents(ignore, { forward: true });
    }
});

ipcMain.handle('get-screen-size', () => {
    return screen.getPrimaryDisplay().workAreaSize;
});

ipcMain.handle('get-window-bounds', () => {
    return mainWindow.getBounds();
});

ipcMain.handle('get-screen-layout', () => {
    const displays = screen.getAllDisplays();
    return displays.map(d => ({
        x: d.bounds.x,
        y: d.bounds.y,
        width: d.bounds.width,
        height: d.bounds.height,
        id: d.id
    }));
});

ipcMain.on('set-window-position', (event, data) => {
    if (!data || typeof data.x !== 'number' || typeof data.y !== 'number' ||
        isNaN(data.x) || isNaN(data.y)) {
        console.error('Invalid position data:', data);
        return;
    }
    mainWindow.setPosition(Math.round(data.x), Math.round(data.y));
});

ipcMain.on('set-window-size', (event, { width, height }) => {
    const bounds = mainWindow.getBounds();
    mainWindow.setBounds({
        x: bounds.x,
        y: bounds.y,
        width: Math.round(width),
        height: Math.round(height)
    });
});

ipcMain.handle('get-visible-windows', async () => {
    const { exec } = require('child_process');
    const isDev = !app.isPackaged;
    const scriptPath = isDev
        ? path.join(__dirname, 'scripts', 'getWindows.ps1')
        : path.join(process.resourcesPath, 'scripts', 'getWindows.ps1');

    return new Promise((resolve) => {
        exec(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`, { maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
            if (error) {
                console.error('Error getting windows:', error);
                resolve([]);
                return;
            }

            const windows = stdout.trim().split('\n')
                .filter(line => line.includes('|'))
                .map(line => {
                    const parts = line.trim().split('|');
                    return {
                        x: parseInt(parts[0]) || 0,
                        y: parseInt(parts[1]) || 0,
                        width: parseInt(parts[2]) || 0,
                        height: parseInt(parts[3]) || 0,
                        title: parts.slice(4).join('|')
                    };
                })
                .filter(w => w.width > 200 && w.height > 100 && !w.title.includes('Desktop Mate'));

            resolve(windows);
        });
    });
});

app.whenReady().then(() => {
    createWindow();
    createTray();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

app.on('before-quit', () => {
    isQuitting = true;
});
