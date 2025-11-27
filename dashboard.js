/* ==========================================================
   DASHBOARD STATE + CONSTANTS
========================================================== */
const STORAGE_QUEUE = "pickleballQueue_v3";
const STORAGE_COURTS = "pickleballCourts_v3";

/* Track when each court becomes filled */
let courtPrevState = [false, false, false, false];
let courtFillAt = [0, 0, 0, 0];

/* ==========================================================
   MAIN RENDER FUNCTION
========================================================== */
function renderDashboard() {
  const queue = JSON.parse(localStorage.getItem(STORAGE_QUEUE)) || [];
  const courts = JSON.parse(localStorage.getItem(STORAGE_COURTS)) || [[], [], [], []];

  const queueList = document.getElementById("queueList");
  const courtsContainer = document.getElementById("courtsContainer");

  queueList.innerHTML = "";
  courtsContainer.innerHTML = "";

  /* ---- QUEUE DISPLAY ---- */
  if (queue.length === 0) {
    queueList.innerHTML = `<div class="empty-state">No players in queue</div>`;
  } else {
    queue.forEach((p, i) => {
      const li = document.createElement("li");
      li.className = "queue-item";
      li.innerHTML = `
        <div class="queue-left">
          <span class="queue-number">${i + 1}.</span>
          <span class="queue-name">${p.name}</span>
        </div>
        <div style="display:flex;align-items:center;">
          <span class="rank-badge ${p.rank.toLowerCase()}">${p.rank}</span>
          <span class="play-count" style="font-size:0.85rem; margin-left:8px; opacity:0.9;">Games: ${p.playCount || 0}</span>
        </div>
      `;
      queueList.appendChild(li);
    });
  }

  /* ==========================================================
     COURTS DISPLAY + ANIMATIONS
  ========================================================== */
  const now = Date.now();

  courts.forEach((court, idx) => {
    const card = document.createElement("div");
    card.className = "court";
    card.innerHTML = `<div class="court-header">Court #${idx + 1}</div>`;

    const ul = document.createElement("ul");
    ul.className = "court-list";

    const wasFilled = courtPrevState[idx];
    const isFilled = court.length > 0;

    /* Detect empty → filled transition */
    if (!wasFilled && isFilled) {
      courtFillAt[idx] = now;
    }

    const age = now - courtFillAt[idx]; // ms since assignment

    const showPopup = isFilled && age < 1500;     // popup for first 1.5s
    const showGlow = isFilled && age < 5000;      // glow lasts full 5 seconds
    const showFade = isFilled && age >= 5000 && age < 6000; // fade out between 5–6s

    /* ---- Apply Glow / Blur / Fade States ---- */
    if (showGlow) {
      card.classList.add("glow");
      if (showPopup) card.classList.add("match-ready-blur");
    }

    if (showFade) {
      card.classList.remove("glow", "match-ready-blur");
      card.classList.add("fade-out-glow");
    }

    if (!showGlow && !showFade) {
      card.classList.remove("glow", "fade-out-glow", "match-ready-blur");
    }

    /* ---- Popup: GET YOUR PADDLES READY! ---- */
    if (showPopup && !card.querySelector(".match-ready-center")) {
      const banner = document.createElement("div");
      banner.className = "match-ready-center";
      banner.innerHTML = `
        <img src="assets/icons/logo.png" alt="Logo" />
        <span>GET YOUR PADDLES READY!</span>
      `;
      card.appendChild(banner);

      // remove popup after 1.5s but keep glow
      setTimeout(() => {
        banner.classList.add("fade-out");
        setTimeout(() => banner.remove(), 500);
      }, 2500);
    }

    /* ---- PLAYER LIST ---- */
    if (!isFilled) {
      ul.innerHTML = `<li class="empty-state">Waiting for players</li>`;
    } else {
      court.forEach((p) => {
        const li = document.createElement("li");
        li.className = "court-players";

        // Roulette animation only when match is newly assigned
        if (age < 1200) li.classList.add("roulette-in");

        li.innerHTML = `
          <span class="court-players-name">${p.name}</span>
          <span class="rank-badge ${p.rank.toLowerCase()}">${p.rank}</span>
        `;
        ul.appendChild(li);
      });

      // Hide players while popup is showing
      if (showPopup) ul.classList.add("hide-players");
      else ul.classList.remove("hide-players");
    }

    /* Reset if court becomes empty */
    if (!isFilled) {
      courtFillAt[idx] = 0;
      card.classList.remove("glow", "fade-out-glow", "match-ready-blur");
    }

    card.appendChild(ul);
    courtsContainer.appendChild(card);

    courtPrevState[idx] = isFilled; // update status
  });
}

/* ==========================================================
   AUTO REFRESH (Smooth / Fast)
========================================================== */
renderDashboard();
window.addEventListener("storage", renderDashboard);
setInterval(renderDashboard, 1000);

/* ==========================================================
   LIVE FOOTER CLOCK
========================================================== */
const clockEl = document.getElementById("clock");
const yearEl = document.getElementById("currentYear");
const dateEl = document.getElementById("currentDate");

function updateClock() {
  const now = new Date();
  yearEl.textContent = now.getFullYear();

  dateEl.textContent = now.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric"
  });

  let h = now.getHours();
  const m = now.getMinutes().toString().padStart(2, "0");
  const s = now.getSeconds().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;

  const colon = now.getSeconds() % 2 === 0 ? ":" : "<span class='blink'>:</span>";
  clockEl.innerHTML = `${h}${colon}${m}:${s} ${ampm}`;
}

setInterval(updateClock, 1000);
updateClock();
