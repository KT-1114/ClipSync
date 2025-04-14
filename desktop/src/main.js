const { app, BrowserWindow, clipboard, ipcMain } = require('electron');
const path = require('path');
const os = require('os');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        }
    });

    mainWindow.loadFile(path.join(__dirname, '../index.html'));
    // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
    createWindow();

    ipcMain.handle('clipboard:readText', () => {
        return clipboard.readText();
    });

    ipcMain.handle('clipboard:writeText', (_, text) => {
        clipboard.writeText(text);
        return true;
    });

    ipcMain.handle('system:getLocalIP', () => {
        const networkInterfaces = os.networkInterfaces();
        for (const interfaceName in networkInterfaces) {
            const interface = networkInterfaces[interfaceName];
            for (const detail of interface) {
                // Look for IPv4 address that's not internal
                if (detail.family === 'IPv4' && !detail.internal) {
                    return detail.address;
                }
            }
        }
        return 'unknown';
    });
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