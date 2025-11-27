// script.js — fixed + enhanced version (updated dealing logic)

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

// control persistence across reloads
const persistAcrossReloads = true;
const STORAGE_QUEUE = "pickleballQueue_v3";
const STORAGE_COURTS = "pickleballCourts_v3";

// app state
let queue = [];            // waiting players (only players available to be dealt)
let courts = [[], [], [], []]; // four courts (players currently playing)
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
  }
}

function loadState() {
  if (!persistAcrossReloads) return;
  try {
    const q = JSON.parse(localStorage.getItem(STORAGE_QUEUE));
    const c = JSON.parse(localStorage.getItem(STORAGE_COURTS));
    if (Array.isArray(q)) queue = q;
    if (Array.isArray(c) && c.length === 4) courts = c;
  } catch (e) { /* ignore */ }
}

function clearStoredState() {
  localStorage.removeItem(STORAGE_QUEUE);
  localStorage.removeItem(STORAGE_COURTS);
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

function renderQueue() {
  const searchValue = document.getElementById("queueSearch")?.value?.toLowerCase() || "";

  playerQueue.innerHTML = "";

  // CASE 1: Queue itself is empty (no players at all)
  if (queue.length === 0) {
    playerQueue.innerHTML = `
      <li class="empty-state">
        No players in queue
      </li>
    `;
    return;
  }

  // CASE 2: Queue has players → apply search filter
  const filteredQueue = queue.filter(p =>
    p.name.toLowerCase().includes(searchValue)
  );

  // CASE 3: Search returned empty result
  if (filteredQueue.length === 0) {
    playerQueue.innerHTML = `
      <li class="empty-state no-result">
        Player not found..
      </li>
    `;
    return;
  }

  // CASE 4: Display filtered queue
  filteredQueue.forEach((p, i) => {
    const li = document.createElement("li");
    li.className = "queue-item";
    li.innerHTML = `
      <div class="queue-left">
        <span class="queue-number">${i + 1}.</span>
        <span class="queue-name">${escapeHtml(p.name)}</span>
        <span class="rank-badge ${p.rank.toLowerCase()}">${escapeHtml(p.rank)}</span>
        <span class="play-count" style="font-size:0.85rem; margin-left:8px; opacity:0.9;">Games: ${p.playCount || 0}</span>
      </div>
      <button class="remove-btn" onclick="openRemoveModal(${queue.indexOf(p)})" title="Delete or Remove Player">❌</button>
    `;
    playerQueue.appendChild(li);

    // Optional animation stagger
    setTimeout(() => animateListItem(li), 70 * i);
  });
}


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
    if (li) li.classList.add("fade-out");
    setTimeout(() => {
      queue.splice(playerToRemoveIndex, 1);
      saveState();
      renderQueue();
      removeModal.style.display = "none";
      playerToRemoveIndex = null;
    }, 300);
  }
});

/* ---------- Court Rendering & Finish ---------- */
function renderCourts() {
  courts.forEach((court, index) => {
    const ul = document.querySelector(`#court${index + 1} ul`);
    const finishBtn = document.querySelector(`#court${index + 1} .finish-btn`);
    ul.innerHTML = "";
    if (!court || court.length === 0) {
      ul.innerHTML = `<li class="empty-state">Waiting for players</li>`;
      if (finishBtn) finishBtn.style.display = "none";
      document.getElementById(`court${index + 1}`).classList.remove('active');
      return;
    }
    if (finishBtn) finishBtn.style.display = "inline-block";
    document.getElementById(`court${index + 1}`).classList.add('active');
    court.forEach((p, i) => {
      const li = document.createElement("li");
      li.classList.add("court-players");

      // player name
      const spanName = document.createElement("span");
      spanName.className = "court-players-name";
      spanName.textContent = p.name;

      // rank badge
      const spanRank = document.createElement("span");
      spanRank.className = `rank-badge ${p.rank.toLowerCase()}`;
      spanRank.textContent = p.rank;

      li.appendChild(spanName);
      li.appendChild(spanRank);

      li.dataset.id = p.id;
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
    // record last partners for rotation tracking
    current.forEach(p => {
      p.lastCourt = cIdx;
      p.inGame = false;
      p.played = true;
      p.playCount = (p.playCount || 0) + 1; // Increment play count
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

/* ---------- Deal Players (rotation-aware) ---------- */
dealBtn.addEventListener("click", () => {
  const allFull = courts.every(c => c.length >= 4);
  if (allFull) {
    return showModal("⚠️ All courts active", "All courts are currently full. Wait for a court to finish before dealing.");
  }

  // 1. Filter available players
  let available = queue.filter(p => !p.inGame);

  // 2. Sort by Play Count (Ascending) -> Then by Queue Order (FIFO)
  // Since 'queue' is already in FIFO order, a stable sort by playCount preserves FIFO for ties.
  available.sort((a, b) => (a.playCount || 0) - (b.playCount || 0));

  if (available.length < 4) {
    return showModal("⚠️ Not enough players", "At least 4 available players are required to start matches!");
  }

  let courtsUpdated = false;
  // Fill empty courts
  for (let i = 0; i < 4; i++) {
    if (courts[i].length === 0 && available.length >= 4) {
      const group = available.splice(0, 4);
      group.forEach(p => {
        p.inGame = true;
        p.lastCourt = i;
        // Remove from main queue
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
    showModal("⚠️ Could not assign", "Not enough players to fill an empty court.");
  }
});


/* ---------- Reset all data ---------- */
resetBtn.addEventListener("click", () => resetModal.style.display = "flex");
cancelReset.addEventListener("click", () => resetModal.style.display = "none");
confirmReset.addEventListener("click", () => {
  queue = [];
  courts = [[], [], [], []];
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
  // Prevent duplicate names (case-insensitive)
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
});
document.getElementById("openDashboard").addEventListener("click", () => {
  window.open("dashboard.html", "_blank");
});

/* ---------- Deal Intermediate Players Only ---------- */
dealIntermediateBtn.addEventListener("click", () => {
  // Filter queue to Intermediate players only (not currently in game)
  let intermediateAvailable = queue.filter(p => p.rank === "Intermediate" && !p.inGame);

  // Sort by Play Count (Ascending) -> Then by Queue Order (FIFO)
  intermediateAvailable.sort((a, b) => (a.playCount || 0) - (b.playCount || 0));

  if (intermediateAvailable.length < 4) {
    return showModal(
      "⚠️ Not enough Intermediate players",
      "At least 4 Intermediate players are required to start a match for this mode."
    );
  }

  let courtsUpdated = false;
  // Fill empty courts
  for (let i = 0; i < 4; i++) {
    if (courts[i].length === 0 && intermediateAvailable.length >= 4) {
      const group = intermediateAvailable.splice(0, 4);
      group.forEach(p => {
        p.inGame = true;
        p.lastCourt = i;
        // Remove from main queue
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
      "Not enough Intermediate players to fill an empty court."
    );
  }
});

/* ---------- Export to CSV ---------- */
exportBtn.addEventListener("click", () => {
  // Gather all players from queue and courts
  const allPlayers = [...queue];
  courts.forEach(court => {
    court.forEach(p => allPlayers.push(p));
  });

  if (allPlayers.length === 0) {
    return showModal("⚠️ No Data", "There are no players to export.");
  }

  // CSV Header
  let csvContent = "Name,Rank,PlayCount\n";

  // CSV Rows
  allPlayers.forEach(p => {
    const safeName = p.name.replace(/,/g, ""); // simple escape for commas
    csvContent += `${safeName},${p.rank},${p.playCount || 0}\n`;
  });

  // Create Download Link
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

    // Skip header if present (check if first line contains "Name")
    const startIndex = lines[0].toLowerCase().includes("name") ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(",");
      if (parts.length < 2) continue;

      const name = parts[0].trim();
      const rank = parts[1].trim();
      const playCount = parseInt(parts[2] || "0", 10);

      // Validate Rank
      const validRank = ["Beginner", "Intermediate"].includes(rank) ? rank : "Beginner";

      // Check duplicates
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
    importInput.value = ""; // reset
  };
  reader.readAsText(file);
});



/* ---------- Init ---------- */
function init() {
  loadState();
  if (!persistAcrossReloads) {
    queue = [];
    courts = [[], [], [], []];
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
