"use strict";
// console.log('electronAPI:', window.electronAPI);
console.log('window.electronAPI:', window.electronAPI);
console.log('Preload test:', window.electronAPI?.test);
const SERVER_IP = '172.20.10.4'; // Your backend socket server
let socket;
let copiedHistory = [];
let showHistory = false;
let lastClipboardContent = '';
async function getUserIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    }
    catch (error) {
        console.error('Error getting IP:', error);
        return 'unknown';
    }
}
async function initializeSocket() {
    const userIP = await getUserIP();
    console.log('User IP:', userIP);
    socket = io(`http://${SERVER_IP}:3000`, {
        query: { userIP },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
    });
    socket.on('connect', () => {
        console.log('Connected to server:', socket.id);
        document.getElementById('status').innerText = '🟢 Connected';
    });
    socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        document.getElementById('status').innerText = '🔴 Connection error';
    });
    socket.on('receive-message', (data) => {
        console.log('Received:', data);
        updateClipboardContent(data);
    });
    // Clipboard polling
    setInterval(async () => {
        try {
            const text = await window.electronAPI.readClipboard();
            if (text && text !== lastClipboardContent) {
                lastClipboardContent = text;
                await updateClipboardContent(text);
                socket.emit('sendMessage', text);
            }
        }
        catch (error) {
            console.error('Clipboard error:', error);
        }
    }, 1000);
}
async function updateClipboardContent(content) {
    document.getElementById('textInput').value = content;
    document.getElementById('copiedContent').innerText = content;
    copiedHistory = [content, ...copiedHistory];
    updateHistory();
    lastClipboardContent = content;
    await window.electronAPI.writeClipboard(content);
}
window.copyToClipboard = async () => {
    const text = document.getElementById('textInput').value.trim();
    if (!text) {
        document.getElementById('status').innerText = '⚠️ Please enter text!';
        return;
    }
    await updateClipboardContent(text);
    socket.emit('sendMessage', text);
};
window.toggleHistory = () => {
    showHistory = !showHistory;
    const historySection = document.getElementById('historySection');
    const historyBtn = document.getElementById('historyBtn');
    historySection.style.display = showHistory ? 'block' : 'none';
    historyBtn.innerText = showHistory ? 'Close History' : 'View copied content';
    historyBtn.style.backgroundColor = showHistory ? 'orange' : '';
};
window.resetContent = () => {
    document.getElementById('textInput').value = '';
    document.getElementById('copiedContent').innerText = '';
    lastClipboardContent = '';
    copiedHistory = [];
    updateHistory();
};
function updateHistory() {
    const historyItems = document.getElementById('historyItems');
    historyItems.innerHTML = copiedHistory
        .map((item) => `<div class="history-item">${item}</div>`)
        .join('');
}
// Initialize
initializeSocket().catch((error) => {
    console.error('Socket initialization error:', error);
    document.getElementById('status').innerText = '🔴 Initialization error';
});
