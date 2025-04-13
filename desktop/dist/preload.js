"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronClipboard', {
    readText: () => electron_1.clipboard.readText(),
    writeText: (text) => electron_1.clipboard.writeText(text),
});
