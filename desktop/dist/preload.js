"use strict";
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('electronAPI', {
    readClipboard: () => ipcRenderer.invoke('clipboard:readText'),
    writeClipboard: (text) => ipcRenderer.invoke('clipboard:writeText', text),
    test: 'Hello from preload'
});
console.log('Preload script loaded');
