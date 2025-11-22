// script.js — fixed + enhanced version (updated dealing logic)

// DOM refs
const playerForm = document.getElementById("playerForm");
const playerQueue = document.getElementById("playerQueue");
const dealBtn = document.getElementById("dealBtn");
const dealIntermediateBtn = document.getElementById("dealIntermediateBtn");
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
      document.getElementById(`court${index+1}`).classList.remove('active');
      return;
    }
    if (finishBtn) finishBtn.style.display = "inline-block";
    document.getElementById(`court${index+1}`).classList.add('active');
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

  let available = queue.filter(p => !p.inGame);
  if (available.length < 4) {
    return showModal("⚠️ Not enough players", "At least 4 available players are required to start matches!");
  }

  let freshPlayers = shuffle(available.filter(p => !p.played));
  let finishedPlayers = shuffle(available.filter(p => p.played));

  const courtOrder = shuffle([0, 1, 2, 3]);
  const assignedIds = new Set();

  courtOrder.forEach(cIdx => {
    if (courts[cIdx].length >= 4) return;

    let candidates = shuffle([...freshPlayers, ...finishedPlayers]);
    const group = [];

    // pick 4 players while avoiding recent partners
    while (candidates.length > 0 && group.length < 4) {
      const p = candidates.shift();
      // check if this player recently played with anyone already in group
      const overlap = group.some(g => g.lastPartners && g.lastPartners.includes(p.id));
      if (!overlap) {
        group.push(p);
      }
      // if stuck (too restrictive), break and allow repeats
      if (candidates.length === 0 && group.length < 4) {
        const remaining = shuffle([...freshPlayers, ...finishedPlayers])
          .filter(x => !group.includes(x))
          .slice(0, 4 - group.length);
        group.push(...remaining);
      }
    }

    if (group.length === 4) {
      group.forEach(p => {
        p.inGame = true;
        assignedIds.add(p.id);
      });
      courts[cIdx] = group;
      freshPlayers = freshPlayers.filter(p => !assignedIds.has(p.id));
      finishedPlayers = finishedPlayers.filter(p => !assignedIds.has(p.id));
    }
  });

  if (assignedIds.size > 0) {
    queue = queue.filter(p => !assignedIds.has(p.id));
    saveState();
    renderCourts();
    renderQueue();
  } else {
    showModal("⚠️ Could not assign", "No valid new groups of 4 could be formed. Try again or wait for more players.");
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
    played: false
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

  if (intermediateAvailable.length < 4) {
    return showModal(
      "⚠️ Not enough Intermediate players",
      "At least 4 Intermediate players are required to start a match for this mode."
    );
  }

  // Clone logic for fresh/finished separation
  let fresh = shuffle(intermediateAvailable.filter(p => !p.played));
  let finished = shuffle(intermediateAvailable.filter(p => p.played));

  const courtOrder = shuffle([0, 1, 2, 3]);
  const assignedIds = new Set();

  courtOrder.forEach(cIdx => {
    if (courts[cIdx].length >= 4) return;

    let candidates = shuffle([...fresh, ...finished]);
    let group = [];

    while (candidates.length > 0 && group.length < 4) {
      const p = candidates.shift();
      const overlap = group.some(g => g.lastPartners && g.lastPartners.includes(p.id));
      if (!overlap) group.push(p);

      if (candidates.length === 0 && group.length < 4) {
        const remaining = shuffle([...fresh, ...finished])
          .filter(x => !group.includes(x))
          .slice(0, 4 - group.length);
        group.push(...remaining);
      }
    }

    if (group.length === 4) {
      group.forEach(p => {
        p.inGame = true;
        assignedIds.add(p.id);
      });
      courts[cIdx] = group;
      fresh = fresh.filter(p => !assignedIds.has(p.id));
      finished = finished.filter(p => !assignedIds.has(p.id));
    }
  });

  if (assignedIds.size > 0) {
    queue = queue.filter(p => !assignedIds.has(p.id));
    saveState();
    renderCourts();
    renderQueue();
  } else {
    showModal(
      "⚠️ Could not assign",
      "Not enough valid Intermediate group combinations were found."
    );
  }
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
