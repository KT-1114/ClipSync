const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    readClipboard: () => ipcRenderer.invoke('clipboard:readText'),
    writeClipboard: (text) => ipcRenderer.invoke('clipboard:writeText', text),
    getLocalIP: () => ipcRenderer.invoke('system:getLocalIP'),
    onGlobalPaste: (callback) => ipcRenderer.on('global-paste', callback),
    pasteDefault: () => {
        const activeElement = document.activeElement;
        if (activeElement instanceof HTMLInputElement || 
            activeElement instanceof HTMLTextAreaElement) {
            document.execCommand('paste');
        }
    },
});

console.log('Preload script loaded');