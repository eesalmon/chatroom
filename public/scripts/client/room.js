// public/scripts/client/room.js

// render chat room list
function renderRoomList() {
    roomList.innerHTML = "";

    ROOMS.forEach(roomName => {
    const div = document.createElement("div");
    div.textContent = roomName;
    div.className = "room-item";
    div.dataset.room = roomName;

    div.addEventListener("click", () => {
      if (currentRoom !== roomName) {
        joinRoom(roomName);
      }
    });

    roomList.appendChild(div);
  });

}

// EnderDragon message filter (minecraft channel only)
const endraToggleWrap = document.getElementById('endra-toggle-wrap');
const endraToggleButton = document.getElementById('endraToggleButton');
let hideEndra = localStorage.getItem('hide-endra') === '1';

function applyEndraState() {
  // filter only applies while viewing the minecraft channel
  chatWindow.classList.toggle('hide-endra', hideEndra && currentRoom === 'minecraft');
  if (endraToggleButton) {
    endraToggleButton.textContent = hideEndra ? 'show endra' : 'hide endra';
  }
}

let isFillingEndra = false;

// Hiding EnderDragon can drop the visible history below one screen, which kills the
// scroll-to-top pagination trigger. Keep pulling older pages until there is enough
// non-endra content to scroll, or history runs out.
async function fillEndraFilteredHistory(minVisible = 15, maxPages = 10) {
  if (isFillingEndra) return;
  isFillingEndra = true;
  try {
    for (let i = 0; i < maxPages; i++) {
      const visible = chatWindow.querySelectorAll('.message:not(.endra-msg)').length;
      const scrollable = chatWindow.scrollHeight > chatWindow.clientHeight + 50;
      if (visible >= minVisible && scrollable) return;
      if (!oldestMsgId) return;
      const before = oldestMsgId;
      await loadMoreMessages();
      if (oldestMsgId === before) return;  // no progress / end of history
    }
  } finally {
    isFillingEndra = false;
  }
}

// show the toggle only in the minecraft room
function updateEndraToggle(roomName) {
  if (endraToggleWrap) {
    endraToggleWrap.style.display = roomName === 'minecraft' ? '' : 'none';
  }
  applyEndraState();
}

if (endraToggleButton) {
  endraToggleButton.addEventListener('click', (e) => {
    e.preventDefault();
    hideEndra = !hideEndra;
    localStorage.setItem('hide-endra', hideEndra ? '1' : '0');
    applyEndraState();
    if (hideEndra && currentRoom === 'minecraft') fillEndraFilteredHistory();
  });
}

// switch active chat room
function joinRoom(roomName) {

  if (retryButton) retryButton.style.display = 'none';
  if (reloadButton) reloadButton.style.display = 'none';
  
  // disconnect current session
  if (currentSocket) {
    console.log(`disconnecting from ${currentRoom}...`);
    currentSocket.close();
  }

  // update UI state
  currentRoom = roomName;
  oldestMsgId = null; 
  isLoadingHistory = false;
  updateActiveRoomUI(roomName);

  const channelBtn = document.getElementById('channel-menu-btn');
  if (channelBtn) {
    channelBtn.textContent = roomName;
  }

  updateEndraToggle(roomName);

  messageInput.placeholder = ROOM_PLACEHOLDERS[roomName] || "input...";
  
  // clear chat interface
  chatWindow.innerHTML = ""; 
  statusText.innerText = "connecting...";
  statusText.style.color = "var(--comment-color)";

  // establish new connection
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/websocket/${roomName}`;
  
  currentSocket = new WebSocket(wsUrl);

  setupSocketListeners(currentSocket);
}

// bind websocket event listeners
function setupSocketListeners(socket) {
  socket.onopen = () => {
    if (socket !== currentSocket) return;
    console.log("connected successfully");
    statusText.innerText = "connected";
    statusText.style.color = "var(--connection-green)";
    setTimeout(fetchOnlineCount, 500);
  };

  socket.onmessage = (event) => {
    console.log("received:", event.data);
    try {
        const msg = JSON.parse(event.data);

        // handle bridge status notification
        if (msg.type === "bridge_status" && msg.status === "success" && msg.msg_id) {
            const existingDiv = document.querySelector(`.message[data-msg-id="${msg.msg_id}"]`);
            if (existingDiv) {
                const headerDiv = existingDiv.firstElementChild;
                const copySpan = existingDiv.querySelector('.msg-id-copy');
                if (headerDiv && copySpan && !existingDiv.querySelector('.bridge-success-mark')) {
                    const checkmark = document.createElement('span');
                    checkmark.className = "bridge-success-mark";
                    checkmark.textContent = "✓";
                    checkmark.style.color = "var(--success-color, #347b68)";
                    checkmark.style.marginLeft = "5px";
                    checkmark.style.fontSize = "0.85em";
                    checkmark.title = "synced";
                    headerDiv.insertBefore(checkmark, copySpan);
                }
            }
            return;
        }

        // initialize cursor with first message
        if (oldestMsgId === null && msg.msg_id) {
            oldestMsgId = msg.msg_id;
        }

        const senderName = msg.sender_username || msg.sender || "anonymous";
        addMessage(senderName, msg.text, "received", msg.timestamp, msg.msg_id, "append", msg.is_deleted, msg.is_censored, msg.is_bridged);

        // covers entering minecraft with the filter already on: top up as history streams in
        if (hideEndra && currentRoom === 'minecraft') fillEndraFilteredHistory();
    } catch (e) {
        addMessage("anonymous", event.data, "received");
    }
  };

  socket.onclose = () => {
    if (socket !== currentSocket) return;
    statusText.innerText = "disconnected";
    statusText.style.color = "var(--connection-red)";
    console.log("connection lost");
    
    if (retryButton) {
      retryButton.style.display = 'inline';
    }
    if (reloadButton) {
      reloadButton.style.display = 'inline';
    }
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
  };
}
