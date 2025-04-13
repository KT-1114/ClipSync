import { contextBridge, clipboard } from 'electron';

contextBridge.exposeInMainWorld('electronClipboard', {
    readText: (): string => clipboard.readText(),
    writeText: (text: string): void => clipboard.writeText(text),
});
