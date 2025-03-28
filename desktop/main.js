const { app, BrowserWindow, clipboard } = require('electron');
const WebSocket = require('ws');

let win;
const wss = new WebSocket.Server({ port: 3001 }); // WebSocket Server

app.whenReady().then(() => {
    win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
        },
    });

    win.loadURL('https://your-ui-or-blank-page');

    // WebSocket handling
    wss.on('connection', (ws) => {
        ws.on('message', (message) => {
            clipboard.writeText(message.toString()); // Set clipboard data
        });

        // Send clipboard content to mobile when copied
        setInterval(() => {
            ws.send(clipboard.readText());
        }, 1000);
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
