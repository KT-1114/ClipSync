"use strict";
const { app, BrowserWindow, clipboard, ipcMain } = require('electron');
const path = require('path');
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
    console.log('Preload path:', path.join(__dirname, 'preload.js'));
    mainWindow.loadFile(path.join(__dirname, '../index.html'));
    mainWindow.webContents.openDevTools();
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
