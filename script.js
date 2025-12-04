// script.js — fixed + enhanced version (updated dealing logic + court locking)

// DOM refs
const playerForm = document.getElementById("playerForm");
const playerQueue = document.getElementById("playerQueue");
const dealBtn = document.getElementById("dealBtn");
const dealIntermediateBtn = document.getElementById("dealIntermediateBtn");
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const importInput = document.getElementById("importInput");
const resetModal = document.getElementById("resetModal");
const cancelReset = document.getElementById("cancelReset");
const confirmReset = document.getElementById("confirmReset");
const removeModal = document.getElementById("removeModal");
const cancelRemove = document.getElementById("cancelRemove");
const confirmRemove = document.getElementById("confirmRemove");
const resetBtn = document.getElementById("resetBtn");
const openAdvanceBtn = document.getElementById("openAdvanceBtn");
const openAddPlayerBtn = document.getElementById("openAddPlayerBtn");
const addPlayerModal = document.getElementById("addPlayerModal");
const cancelAddPlayer = document.getElementById("cancelAddPlayer");

// control persistence across reloads
const persistAcrossReloads = true;
const STORAGE_QUEUE = "pickleballQueue_v3";
const STORAGE_COURTS = "pickleballCourts_v3";
const STORAGE_COURT_LOCKS = "pickleballCourtLocks_v1";

// app state
let queue = [];                  // waiting players
let courts = [[], [], [], []];   // four courts
let courtLocks = [false, false, false, false]; // true = locked
let playerToRemoveIndex = null;

/* ---------- Utilities ---------- */
function generateUUID() {
  return "xxxx-4xxx-yxxx-xxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function saveState() {
  if (persistAcrossReloads) {
    localStorage.setItem(STORAGE_QUEUE, JSON.stringify(queue));
    localStorage.setItem(STORAGE_COURTS, JSON.stringify(courts));
    localStorage.setItem(STORAGE_COURT_LOCKS, JSON.stringify(courtLocks));
  }
}

function loadState() {
  if (!persistAcrossReloads) return;
  try {
    const q = JSON.parse(localStorage.getItem(STORAGE_QUEUE));
    const c = JSON.parse(localStorage.getItem(STORAGE_COURTS));
    const locks = JSON.parse(localStorage.getItem(STORAGE_COURT_LOCKS));

    if (Array.isArray(q)) queue = q;
    if (Array.isArray(c) && c.length === 4) courts = c;
    if (Array.isArray(locks) && locks.length === 4) courtLocks = locks;
  } catch (e) { /* ignore */ }
}

function clearStoredState() {
  localStorage.removeItem(STORAGE_QUEUE);
  localStorage.removeItem(STORAGE_COURTS);
  localStorage.removeItem(STORAGE_COURT_LOCKS);
}

function animateListItem(li) {
  li.classList.add("show", "glow");
  setTimeout(() => li.classList.remove("glow"), 1400);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

/* small shuffle helper */
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------- Reusable modal (OK) ---------- */
const reusableModal = document.createElement("div");
reusableModal.id = "reusableModal";
reusableModal.style.display = "none";
reusableModal.innerHTML = `
  <div class="modal-overlay" style="display:flex;align-items:center;justify-content:center;height:100%;">
    <div class="modal-content">
      <h3 id="modalTitle"></h3>
      <p id="modalMessage"></p>
      <div style="margin-top:12px;text-align:center;">
        <button id="modalOkBtn" class="btn btn-confirm">OK</button>
      </div>
    </div>
  </div>
`;
document.body.appendChild(reusableModal);
const modalTitle = reusableModal.querySelector("#modalTitle");
const modalMessage = reusableModal.querySelector("#modalMessage");
const modalOkBtn = reusableModal.querySelector("#modalOkBtn");
modalOkBtn.addEventListener("click", () => reusableModal.style.display = "none");

function showModal(title, message) {
  modalTitle.innerHTML = title;
  modalMessage.innerHTML = message;
  reusableModal.style.display = "flex";
}

/* ---------- Toast Notification ---------- */
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <img src="assets/icons/check.png" style="width: 20px; height: 20px;">
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

/* ---------- Queue Rendering ---------- */
function renderQueue() {
  const searchValue = document.getElementById("queueSearch")?.value?.toLowerCase() || "";

  // --- category counts (queue + courts) ---
  const playerCountBox = document.querySelector(".playerCount");
  if (playerCountBox) {
    const allPlayers = [
      ...queue,
      ...courts[0],
      ...courts[1],
      ...courts[2],
      ...courts[3]
    ];

    const total = allPlayers.length;
    const beginners = allPlayers.filter(p => p.rank === "Beginner").length;
    const intermediates = allPlayers.filter(p => p.rank === "Intermediate").length;

    playerCountBox.innerHTML = `
      <span class="count-pill total">Total Players: ${total}</span>
      <span class="count-pill beginner">Beginner: ${beginners}</span>
      <span class="count-pill intermediate">Intermediate: ${intermediates}</span>
    `;
  }

  playerQueue.innerHTML = "";

  if (queue.length === 0) {
    playerQueue.innerHTML = `
      <li class="empty-state">
        No players in queue
      </li>
    `;
    return;
  }

  const filteredQueue = queue.filter(p =>
    p.name.toLowerCase().includes(searchValue)
  );

  if (filteredQueue.length === 0) {
    playerQueue.innerHTML = `
      <li class="empty-state no-result">
        Player not found..
      </li>
    `;
    return;
  }

  filteredQueue.forEach((p, i) => {
    const li = document.createElement("li");
    li.className = "queue-item";
    li.innerHTML = `
      <div class="queue-left">
        <span class="queue-number">${i + 1}.</span>
        <span class="queue-name">${escapeHtml(p.name)}</span>
        <span class="rank-badge ${p.rank.toLowerCase()}">${escapeHtml(p.rank)}</span>
        <span class="play-count">Played: ${p.playCount || 0}</span>
      </div>
      <span class="remove-btn" onclick="openRemoveModal(${queue.indexOf(p)})" title="Delete or Remove Player">
        <img src="assets/icons/remove.png" alt="Delete">
      </span>
    `;
    playerQueue.appendChild(li);
    setTimeout(() => animateListItem(li), 70 * i);
  });
}

/* ---------- Remove Modal ---------- */
window.openRemoveModal = function (index) {
  playerToRemoveIndex = index;
  removeModal.style.display = "flex";
};

cancelRemove.addEventListener("click", () => {
  removeModal.style.display = "none";
  playerToRemoveIndex = null;
});

confirmRemove.addEventListener("click", () => {
  if (playerToRemoveIndex !== null) {
    const liEls = document.querySelectorAll("#playerQueue li");
    const li = liEls[playerToRemoveIndex];
    const playerToRemove = queue[playerToRemoveIndex];
    const playerName = playerToRemove ? playerToRemove.name : "Player";

    if (li) li.classList.add("fade-out");
    setTimeout(() => {
      queue.splice(playerToRemoveIndex, 1);
      saveState();
      renderQueue();
      removeModal.style.display = "none";
      playerToRemoveIndex = null;
      showToast(`Player "${playerName}" removed from queue`, 'error');
    }, 300);
  }
});

/* ---------- Court Rendering & Finish ---------- */
function renderCourts() {
  courts.forEach((court, index) => {
    const courtNumber = index + 1;
    const courtEl = document.getElementById(`court${courtNumber}`);
    const ul = courtEl.querySelector("ul");
    const finishBtn = courtEl.querySelector(".finish-btn");
    const lockBtn = courtEl.querySelector(".court-lock-btn");
    const lockIcon = lockBtn?.querySelector(".lock-icon");

    const isLocked = courtLocks[index] === true;

    // Apply locked styling + icon
    if (isLocked) {
      courtEl.classList.add("locked");
      if (lockIcon) lockIcon.src = "assets/icons/lock.png";
      if (lockIcon) lockIcon.alt = "Locked";
    } else {
      courtEl.classList.remove("locked");
      if (lockIcon) lockIcon.src = "assets/icons/lock-open.png";
      if (lockIcon) lockIcon.alt = "Unlocked";
    }

    ul.innerHTML = "";

    if (!court || court.length === 0) {
      if (isLocked) {
        ul.innerHTML = `<li class="empty-state">Court Not Available</li>`;
      } else {
        ul.innerHTML = `<li class="empty-state">Available for playing</li>`;
      }

      if (finishBtn) finishBtn.style.display = "none";
      courtEl.classList.remove("active");
      return;
    }

    if (finishBtn) finishBtn.style.display = "inline-block";
    courtEl.classList.add("active");

    court.forEach((p, i) => {
      const li = document.createElement("li");
      li.classList.add("court-players");
      li.dataset.id = p.id;

      // refresh / re-roll button
      const swapBtn = document.createElement("button");
      swapBtn.className = "player-refresh-btn";
      swapBtn.title = "Player not available? Click to replace with next in queue.";

      const icon = document.createElement("img");
      icon.src = "assets/icons/arrows-clockwise.png";
      icon.className = "refresh-icon";

      swapBtn.appendChild(icon);
      swapBtn.addEventListener("click", () => replaceCourtPlayer(index, p.id));

      // player name
      const spanName = document.createElement("span");
      spanName.className = "court-players-name";
      spanName.textContent = p.name;

      // rank badge
      const spanRank = document.createElement("span");
      spanRank.className = `rank-badge ${p.rank.toLowerCase()}`;
      spanRank.textContent = p.rank;

      li.appendChild(swapBtn);
      li.appendChild(spanName);
      li.appendChild(spanRank);

      li.style.opacity = "0";
      li.style.transform = "translateY(8px)";
      ul.appendChild(li);

      setTimeout(() => {
        li.style.transition = "all 0.32s ease";
        li.style.opacity = "1";
        li.style.transform = "translateY(0)";
      }, 90 * i);
    });
  });
}

// Replace a player on a court with the next fair player from the queue.
function replaceCourtPlayer(courtIndex, playerId) {
  const court = courts[courtIndex];
  if (!court || court.length === 0) return;

  const playerIdx = court.findIndex(p => p.id === playerId);
  if (playerIdx === -1) return;

  const removedPlayer = court[playerIdx];

  let available = queue.filter(p => !p.inGame && p.id !== playerId);

  if (available.length === 0) {
    showModal("⚠️ No standby players",
      "There is no one in the queue to replace this player yet.");
    return;
  }

  available.sort((a, b) => (a.playCount || 0) - (b.playCount || 0));

  const replacement = available[0];

  // removed player goes to FRONT of queue
  removedPlayer.inGame = false;
  removedPlayer.lastCourt = null;
  queue.unshift(removedPlayer);

  const qIdx = queue.findIndex(p => p.id === replacement.id);
  if (qIdx > -1) queue.splice(qIdx, 1);

  replacement.inGame = true;
  replacement.lastCourt = courtIndex;
  court[playerIdx] = replacement;

  saveState();
  renderCourts();
  renderQueue();
}

/* ---------- Court Lock Toggle ---------- */
window.toggleCourtLock = function (index) {
  courtLocks[index] = !courtLocks[index];
  const locked = courtLocks[index];

  saveState();
  renderCourts();

  const courtNum = index + 1;
  if (locked) {
    showToast(`Court #${courtNum} locked. It will be skipped when rolling the players.`, "success");
  } else {
    showToast(`Court #${courtNum} unlocked and ready for play!`, "success");
  }
};

/* ---------- Finish Game (adds rotation memory) ---------- */
window.finishGame = function (courtNumber) {
  const cIdx = courtNumber - 1;
  const current = courts[cIdx];
  if (!current || current.length === 0) return;

  const ul = document.querySelector(`#court${courtNumber} ul`);
  const lis = ul.querySelectorAll("li");
  lis.forEach(li => {
    li.style.transition = "all 0.35s ease";
    li.style.transform = "translateY(8px)";
    li.style.opacity = "0";
  });

  setTimeout(() => {
    current.forEach(p => {
      p.lastCourt = cIdx;
      p.inGame = false;
      p.played = true;
      p.playCount = (p.playCount || 0) + 1;
      p.lastPartners = current
        .filter(o => o.id !== p.id)
        .map(o => o.id);
      queue.push(p);
    });
    courts[cIdx] = [];
    saveState();
    renderCourts();
    renderQueue();
  }, 360);
};

/* ---------- Deal Players (rotation-aware + respect locks) ---------- */
dealBtn.addEventListener("click", () => {
  const allFullOrLocked = courts.every((c, i) => c.length >= 4 || courtLocks[i]);
  if (allFullOrLocked) {
    return showModal("⚠️ No courts available",
      "All courts are currently full. Wait for a court to finish or unlock one.");
  }

  let available = queue.filter(p => !p.inGame);
  available.sort((a, b) => (a.playCount || 0) - (b.playCount || 0));

  if (available.length < 4) {
    return showModal("⚠️ Not enough players", "At least 4 available players are required to start matches!");
  }

  let courtsUpdated = false;
  for (let i = 0; i < 4; i++) {
    if (courtLocks[i]) continue; // 🔒 skip locked courts
    if (courts[i].length === 0 && available.length >= 4) {
      const group = available.splice(0, 4);
      group.forEach(p => {
        p.inGame = true;
        p.lastCourt = i;
        const qIdx = queue.findIndex(qP => qP.id === p.id);
        if (qIdx > -1) queue.splice(qIdx, 1);
      });
      courts[i] = group;
      courtsUpdated = true;
    }
  }

  if (courtsUpdated) {
    saveState();
    renderCourts();
    renderQueue();
  } else {
    showModal("⚠️ Could not assign", "Not enough players or no available courts.");
  }
});

/* ---------- Deal Intermediate Players Only (respect locks) ---------- */
dealIntermediateBtn.addEventListener("click", () => {
  let intermediateAvailable = queue.filter(p => p.rank === "Intermediate" && !p.inGame);
  intermediateAvailable.sort((a, b) => (a.playCount || 0) - (b.playCount || 0));

  if (intermediateAvailable.length < 4) {
    return showModal(
      "⚠️ Not enough Intermediate players",
      "At least 4 Intermediate players are required to start a match for this mode."
    );
  }

  let courtsUpdated = false;
  for (let i = 0; i < 4; i++) {
    if (courtLocks[i]) continue; // 🔒 skip locked
    if (courts[i].length === 0 && intermediateAvailable.length >= 4) {
      const group = intermediateAvailable.splice(0, 4);
      group.forEach(p => {
        p.inGame = true;
        p.lastCourt = i;
        const qIdx = queue.findIndex(qP => qP.id === p.id);
        if (qIdx > -1) queue.splice(qIdx, 1);
      });
      courts[i] = group;
      courtsUpdated = true;
    }
  }

  if (courtsUpdated) {
    saveState();
    renderCourts();
    renderQueue();
  } else {
    showModal(
      "⚠️ Could not assign",
      "Not enough Intermediate players or no available courts."
    );
  }
});

/* ---------- Reset all data ---------- */
resetBtn.addEventListener("click", () => resetModal.style.display = "flex");
cancelReset.addEventListener("click", () => resetModal.style.display = "none");
confirmReset.addEventListener("click", () => {
  queue = [];
  courts = [[], [], [], []];
  courtLocks = [false, false, false, false];
  clearStoredState();
  renderCourts();
  renderQueue();
  resetModal.style.display = "none";
});

/* ---------- Add Player ---------- */
playerForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("playerName").value.trim();
  const rank = document.getElementById("playerRank").value;
  if (!name || !rank) {
    return showModal("⚠️ Missing info", "Please enter a player name and select a rank.");
  }
  const existsInQueue = queue.some(p => p.name.toLowerCase() === name.toLowerCase());
  const existsInCourts = courts.some(court =>
    court.some(p => p.name.toLowerCase() === name.toLowerCase())
  );

  if (existsInQueue || existsInCourts) {
    return showModal("⚠️ Duplicate Player", `"${name}" is already in the queue or currently playing.`);
  }

  const newPlayer = {
    id: generateUUID(),
    name,
    rank,
    lastCourt: null,
    inGame: false,
    played: false,
    playCount: 0
  };
  queue.push(newPlayer);
  saveState();
  renderQueue();
  playerForm.reset();
  if (addPlayerModal) addPlayerModal.style.display = "none";
  showToast(`Player "${newPlayer.name}" added to queue!`);
});

document.getElementById("openDashboard").addEventListener("click", () => {
  window.open("dashboard.html", "_blank");
});

/* ---------- Add Player Modal Logic ---------- */
if (openAddPlayerBtn) {
  openAddPlayerBtn.addEventListener("click", () => {
    addPlayerModal.style.display = "flex";
    const nameInput = document.getElementById("playerName");
    if (nameInput) setTimeout(() => nameInput.focus(), 50);
  });
}

if (cancelAddPlayer) {
  cancelAddPlayer.addEventListener("click", () => {
    addPlayerModal.style.display = "none";
    playerForm.reset();
  });
}

/* ---------- Export to CSV ---------- */
exportBtn.addEventListener("click", () => {
  const allPlayers = [...queue];
  courts.forEach(court => {
    court.forEach(p => allPlayers.push(p));
  });

  if (allPlayers.length === 0) {
    return showModal("⚠️ No Data", "There are no players to export.");
  }

  let csvContent = "Name,Rank,PlayCount\n";
  allPlayers.forEach(p => {
    const safeName = p.name.replace(/,/g, "");
    csvContent += `${safeName},${p.rank},${p.playCount || 0}\n`;
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "paddle_stacking_players.csv");
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

/* ---------- Import from CSV ---------- */
importBtn.addEventListener("click", () => {
  importInput.click();
});

importInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    const text = event.target.result;
    const lines = text.split("\n");
    let importedCount = 0;

    const startIndex = lines[0].toLowerCase().includes("name") ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(",");
      if (parts.length < 2) continue;

      const name = parts[0].trim();
      const rank = parts[1].trim();
      const playCount = parseInt(parts[2] || "0", 10);

      const validRank = ["Beginner", "Intermediate"].includes(rank) ? rank : "Beginner";

      const exists = queue.some(p => p.name.toLowerCase() === name.toLowerCase()) ||
        courts.some(c => c.some(p => p.name.toLowerCase() === name.toLowerCase()));

      if (!exists && name) {
        queue.push({
          id: generateUUID(),
          name: name,
          rank: validRank,
          playCount: isNaN(playCount) ? 0 : playCount,
          played: playCount > 0,
          inGame: false,
          lastCourt: null
        });
        importedCount++;
      }
    }

    if (importedCount > 0) {
      saveState();
      renderQueue();
      showModal("✅ Import Successful", `Successfully imported ${importedCount} players.`);
    } else {
      showModal("⚠️ Import Info", "No new players were added. They might already exist or the file format is incorrect.");
    }
    importInput.value = "";
  };
  reader.readAsText(file);
});

/* ---------- Advanced buttons toggle ---------- */
openAdvanceBtn.addEventListener("click", () => {
  document.querySelectorAll(".adv-btn").forEach(btn => {
    const current = window.getComputedStyle(btn).display;
    btn.style.display = (current === "none") ? "flex" : "none";
  });
});

/* ---------- Init ---------- */
function init() {
  loadState();
  if (!persistAcrossReloads) {
    queue = [];
    courts = [[], [], [], []];
    courtLocks = [false, false, false, false];
    clearStoredState();
  }
  renderCourts();
  renderQueue();
}
init();

document.getElementById("queueSearch").addEventListener("input", renderQueue);

/* ---------- Service Worker registration ---------- */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js").catch(err => {
    console.warn("SW registration failed:", err);
  });
}
