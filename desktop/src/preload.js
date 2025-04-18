const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    readClipboard: () => ipcRenderer.invoke('clipboard:readText'),
    writeClipboard: (text) => ipcRenderer.invoke('clipboard:writeText', text),
    getLocalIP: () => ipcRenderer.invoke('system:getLocalIP'),
    onGlobalPaste: (callback) => ipcRenderer.on('global-paste', callback),
    readClipboardImage: () => ipcRenderer.invoke('clipboard:readImage'),
    writeClipboardImage: (imageData) => ipcRenderer.invoke('clipboard:writeImage', imageData),
    isImageInClipboard: () => ipcRenderer.invoke('clipboard:hasImage'),
});

console.log('Preload script loaded');