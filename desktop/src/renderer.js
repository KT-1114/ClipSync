const SERVER_IP = "https://clipsync-qhc1.onrender.com";
let socket;
let copiedHistory = [];
let showHistory = false;
let lastClipboardContent = "";
let isQueueActive = false;
let isPastingQueue = false;
let copyQueue = [];
let pasteInterval = null;
let currentPasteIndex = -1;
let isPollingPaused = false;
let lastClipboardImage = null;

async function getUserIP() {
  try {
    const localIP = await window.electronAPI.getLocalIP();
    return localIP;
  } catch (error) {
    console.error("Error getting local IP:", error);
    return "unknown";
  }
}

console.log("Connecting to server:", SERVER_IP);

async function initializeSocket() {
  const userIP = await getUserIP();

  socket = io(SERVER_IP, {
    query: { userIP },
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 5,
  });

  socket.on("connect", () => {
    console.log("Connected to server:", socket.id);
    document.getElementById("status").innerText = "🟢 Connected";
  });

  socket.on("connect_error", (error) => {
    console.error("Connection error:", error);
    document.getElementById("status").innerText = "🔴 Connection error";
  });

  socket.on("receive-message", (data) => {
    console.log("Received:", data);
    updateClipboardContent(data);
  });

  // Clipboard polling

  // setInterval(async () => {
  //   if (isPollingPaused) return; // Skip polling if paused
  //   try {
  //     const text = await window.electronAPI.readClipboard();
  //     if (
  //       text &&
  //       text !== lastClipboardContent &&
  //       !isPastingQueue &&
  //       text.trim()
  //     ) {
  //       lastClipboardContent = text;
  //       if (isQueueActive) {
  //         copyQueue.push(text);
  //         const queueStatus = document.getElementById("queueStatus");
  //         queueStatus.textContent = `Added to queue (${copyQueue.length} items)`;
  //         updateQueueDisplay();
  //         console.log("Added to queue:", text);
  //       } else {
  //         await updateClipboardContent(text);
  //         socket.emit("sendMessage", text);
  //       }
  //     }
  //   } catch (error) {
  //     console.error("Clipboard error:", error);
  //   }
  // }, 1000);

  setInterval(async () => {
    if (isPollingPaused) return;
    try {
        // Check for text content
        const text = await window.electronAPI.readClipboard();
        if (text && text !== lastClipboardContent && !isPastingQueue) {
            handleNewClipboardText(text);
        }

        // Check for image content
        const hasImage = await window.electronAPI.isImageInClipboard();
        if (hasImage) {
            const imageDataUrl = await window.electronAPI.readClipboardImage();
            if (imageDataUrl && imageDataUrl !== lastClipboardImage) {
                handleNewClipboardImage(imageDataUrl);
            }
        }
    } catch (error) {
        console.error("Clipboard error:", error);
    }
}, 1000);
}

// Queue Functions
function updateQueueDisplay() {
  const queueItems = document.getElementById("queueItems");
  const queueSection = document.getElementById("queueSection");

  if (!queueItems || !queueSection) {
    console.error("Queue elements not found!");
    return;
  }

  queueSection.style.display =
    isQueueActive || copyQueue.length > 0 ? "block" : "none";

  queueItems.innerHTML = copyQueue
    .map(
      (item, index) => `
      <div class="queue-item ${
        index < currentPasteIndex ? "completed-item" : ""
      }">
        <span>${item.length > 50 ? item.substring(0, 50) + "..." : item}</span>
        <div class="queue-progress">
          ${
            index < currentPasteIndex
              ? "✓"
              : index === currentPasteIndex && isPastingQueue
              ? "⟳"
              : `#${index + 1}`
          }
        </div>
      </div>
    `
    )
    .join("");
}

window.startQueue = () => {
  const startBtn = document.getElementById("startQueueBtn");
  const pasteBtn = document.getElementById("pasteQueueBtn");
  const queueStatus = document.getElementById("queueStatus");
  const queueSection = document.getElementById("queueSection");

  isQueueActive = !isQueueActive;

  if (isQueueActive) {
    startBtn.textContent = "Stop Queue";
    startBtn.classList.add("queue-active");
    queueStatus.textContent =
      "Queue is active - Copy items to add them to queue";
    pasteBtn.disabled = copyQueue.length === 0;
    queueSection.style.display = "block";
  } else {
    startBtn.textContent = "Start Queue";
    startBtn.classList.remove("queue-active");
    queueStatus.textContent = `Queue ready with ${copyQueue.length} items`;
    pasteBtn.disabled = copyQueue.length === 0;
    queueSection.style.display = copyQueue.length > 0 ? "block" : "none";
  }
  updateQueueDisplay();
};

window.pasteQueue = async () => {
  const e = new KeyboardEvent("keydown", {
    key: "v",
    ctrlKey: true,
  });
  await window.dispatchEvent(e);
};

window.addEventListener("keydown", async (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
    if (copyQueue.length === 0) {
      document.getElementById("status").innerText = "✅ All items pasted!";
      document.getElementById("queueStatus").textContent = "Queue empty.";

      isQueueActive = false;
      const startBtn = document.getElementById("startQueueBtn");
      const pasteBtn = document.getElementById("pasteQueueBtn");

      startBtn.textContent = "Start Queue";
      startBtn.classList.remove("queue-active");
      pasteBtn.disabled = true;
      clearQueue();
      document.getElementById("queueSection").style.display = "none";
      return;
    }

    // Let the system paste the current item first
    setTimeout(async () => {
      // If only one item left, clear queue after pasting
      const isLastItem = copyQueue.length === 1;

      // Load the next item into clipboard
      const nextItem = copyQueue[0];
      try {
        await window.electronAPI.writeClipboard(nextItem);
        socket.emit("sendMessage", nextItem);
        copyQueue.shift();
        const TopofQueue = isLastItem ? "" : copyQueue[0];
        document.getElementById(
          "status"
        ).innerText = `✅ Loaded item: "${nextItem.substring(0, 30)}... " & next item: "${TopofQueue.substring(0, 30)}..."`;      

        if (isLastItem) {
          document.getElementById("status").innerText = "✅ All items pasted!";
          document.getElementById("queueStatus").textContent = "Queue empty.";

          isQueueActive = false;
          const startBtn = document.getElementById("startQueueBtn");
          const pasteBtn = document.getElementById("pasteQueueBtn");

          startBtn.textContent = "Start Queue";
          startBtn.classList.remove("queue-active");
          pasteBtn.disabled = true;
          clearQueue();
          document.getElementById("queueSection").style.display = "none";
          return;
        }
      } catch (err) {
        console.error("Clipboard write failed:", err);
        document.getElementById("status").innerText =
          "❌ Failed to load next item.";
      }

      updateQueueDisplay();
      document.getElementById(
        "queueStatus"
      ).textContent = `${copyQueue.length} item(s) left.`;
    }, 100);
  }
});

window.clearQueue = () => {
  copyQueue = [];
  currentPasteIndex = -1;
  isPastingQueue = false;
  const queueStatus = document.getElementById("queueStatus");
  const pasteBtn = document.getElementById("pasteQueueBtn");
  const queueSection = document.getElementById("queueSection");

  queueStatus.textContent = "Queue cleared";
  pasteBtn.disabled = true;
  queueSection.style.display = "none";

  if (pasteInterval) {
    clearInterval(pasteInterval);
  }
  updateQueueDisplay();
};

async function updateClipboardContent(content) {
  copiedHistory = [content, ...copiedHistory];
  updateHistory();
  lastClipboardContent = content;
  if (!isPastingQueue) {
    await window.electronAPI.writeClipboard(content);
  }
}

window.copyToClipboard = async () => {
  const text = document.getElementById("textInput").value.trim();
  if (!text) {
    document.getElementById("status").innerText = "⚠️ Please enter text!";
    return;
  }

  if (isQueueActive) {
    copyQueue.push(text);
    const queueStatus = document.getElementById("queueStatus");
    queueStatus.textContent = `Added to queue (${copyQueue.length} items)`;
    updateQueueDisplay();
    document.getElementById("status").innerText = "✅ Added to queue!";
  } else {
    await updateClipboardContent(text);
    socket.emit("sendMessage", text);
    document.getElementById("status").innerText = "✅ Copied!";
  }

  document.getElementById("textInput").value = "";
  setTimeout(() => {
    document.getElementById("status").innerText = "🟢 Connected";
  }, 2000);
};

window.toggleHistory = () => {
  showHistory = !showHistory;
  const historySection = document.getElementById("historySection");
  const historyBtn = document.getElementById("historyBtn");
  historySection.style.display = showHistory ? "block" : "none";
  historyBtn.innerText = showHistory ? "Close History" : "View copied content";
  historyBtn.style.backgroundColor = showHistory ? "orange" : "";
};

window.resetContent = async () => {
  isPollingPaused = true; // Pause polling to prevent race conditions
  document.getElementById("textInput").value = "";
  lastClipboardContent = "";
  copiedHistory = [];
  copyQueue = [];
  currentPasteIndex = -1;
  isPastingQueue = false;
  isQueueActive = false;

  // Update UI
  updateHistory();
  updateQueueDisplay();

  const queueStatus = document.getElementById("queueStatus");
  const pasteBtn = document.getElementById("pasteQueueBtn");
  const startBtn = document.getElementById("startQueueBtn");
  queueStatus.textContent = "Queue cleared";
  pasteBtn.disabled = true;
  startBtn.disabled = false;
  startBtn.textContent = "Start Queue";
  startBtn.classList.remove("queue-active");

  if (pasteInterval) {
    clearInterval(pasteInterval);
  }

  // Clear clipboard
  await window.electronAPI.writeClipboard("");

  // Resume polling after a short delay
  setTimeout(() => {
    isPollingPaused = false;
  }, 100);
};

initializeSocket().catch((error) => {
  console.error("Socket initialization error:", error);
  document.getElementById("status").innerText = "🔴 Initialization error";
});

// backup code for history display
// function updateHistory() {
//   const historyItems = document.getElementById("historyItems");
//   historyItems.innerHTML = copiedHistory
//     .map(
//       (item, index) => `
//         <div class="history-item">
//           <span>${item}</span>
//           <button 
//             class="copy-btn" 
//             onclick="copyHistoryItem(${index})"
//           >
//             Copy
//           </button>
//         </div>
//       `
//     )
//     .join("");
// }

window.copyHistoryItem = async (index) => {
  const content = copiedHistory[index];
  if (content) {
    if (isQueueActive) {
      copyQueue.push(content);
      const queueStatus = document.getElementById("queueStatus");
      queueStatus.textContent = `Added to queue (${copyQueue.length} items)`;
      updateQueueDisplay();
      document.getElementById("status").innerText = "✅ Added to queue!";
    } else {
      await updateClipboardContent(content);
      socket.emit("sendMessage", content);
      document.getElementById("status").innerText = "✅ Copied!";
    }

    const buttons = document.querySelectorAll(".copy-btn");
    const button = buttons[index];
    const originalText = button.innerText;
    button.innerText = isQueueActive ? "Added!" : "Copied!";
    button.style.backgroundColor = "#45a049";

    setTimeout(() => {
      button.innerText = originalText;
      button.style.backgroundColor = "#4CAF50";
    }, 1000);

    setTimeout(() => {
      document.getElementById("status").innerText = "🟢 Connected";
    }, 2000);
  }
};

window.addEventListener("beforeunload", () => {
  if (pasteInterval) {
    clearInterval(pasteInterval);
  }
});

window.electronAPI.onGlobalPaste(async () => {
  const e = new KeyboardEvent("keydown", {
    key: "v",
    ctrlKey: true,
  });
  await window.dispatchEvent(e);
});


// Add these new functions
async function handleNewClipboardText(text) {
  lastClipboardContent = text;
  if (isQueueActive) {
      addToQueue(text);
  } else {
      await updateClipboardContent(text);
      socket.emit("sendMessage", { type: 'text', content: text });
  }
}

async function handleNewClipboardImage(imageDataUrl) {
  lastClipboardImage = imageDataUrl;
  copiedHistory = [{ type: 'image', content: imageDataUrl }, ...copiedHistory];
  updateHistory();
  socket.emit("sendMessage", { type: 'image', content: imageDataUrl });
}

// Update the socket receive handler
socket.on("receive-message", (data) => {
  if (typeof data === 'string') {
      // Handle legacy text-only messages
      updateClipboardContent(data);
  } else if (data.type === 'text') {
      updateClipboardContent(data.content);
  } else if (data.type === 'image') {
      window.electronAPI.writeClipboardImage(data.content);
      copiedHistory = [{ type: 'image', content: data.content }, ...copiedHistory];
      updateHistory();
  }
});

// Update the history display function
function updateHistory() {
  const historyItems = document.getElementById("historyItems");
  historyItems.innerHTML = copiedHistory
      .map((item, index) => {
          if (typeof item === 'string') {
              // Handle legacy text-only items
              return createTextHistoryItem(item, index);
          }
          return item.type === 'image' 
              ? createImageHistoryItem(item.content, index)
              : createTextHistoryItem(item.content, index);
      })
      .join("");
}

function createTextHistoryItem(text, index) {
  return `
      <div class="history-item">
          <span>${text}</span>
          <button class="copy-btn" onclick="copyHistoryItem(${index})">
              Copy
          </button>
      </div>
  `;
}

function createImageHistoryItem(imageDataUrl, index) {
  return `
      <div class="history-item">
          <img src="${imageDataUrl}" style="max-width: 200px; max-height: 100px;" />
          <button class="copy-btn" onclick="copyHistoryItem(${index})">
              Copy
          </button>
      </div>
  `;
}