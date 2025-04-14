const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    readClipboard: () => ipcRenderer.invoke('clipboard:readText'),
    writeClipboard: (text) => ipcRenderer.invoke('clipboard:writeText', text),
    getLocalIP: () => ipcRenderer.invoke('system:getLocalIP')
});

console.log('Preload script loaded');