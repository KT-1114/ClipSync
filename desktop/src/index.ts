import { app, BrowserWindow, clipboard } from 'electron';
import * as path from 'path';

let mainWindow: BrowserWindow;


app.on('ready', () => {
    createWindows();
});

function createWindows(): void {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
        },
        show: false,
    });

    mainWindow.loadFile('./index.html');
    mainWindow.on('ready-to-show', () => mainWindow.show());
}
