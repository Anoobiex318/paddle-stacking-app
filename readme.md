# 🏓 Matchpoint Palawan Paddle Stacker

### **Full Feature List & Changelog**  
*Last updated: November 01, 2025*

---

## 🎯 Core Purpose
A modern, lightweight **pickleball court queue and game management system** designed for local or club use — optimized for admin and viewer modes, real-time updates, and visual clarity on TVs or tablets.

---

## 🧩 MAIN FEATURES

### 🧑‍🤝‍🧑 Queue Management System
- Add, remove, and reorder players dynamically.
- Displays each player’s **name, rank**, and **last played court**.
- Automatically removes players from queue once assigned to a court.
- Players return to queue **only when the game finishes**.
- New or idle players are prioritized in queue rotations.
- Prevents players still in a game from being requeued or rolled again.

### 🏟️ Court Management
- Supports multiple courts (default 4) with 4-player assignment per court.
- Each court shows up to four players in a **balanced grid layout**.
- Admin can mark a court’s game as **“Finished”**, returning players to the queue.
- Courts remain visually active while a game is ongoing.
- Prevents rolling new players when all courts are full.
- Handles **odd player counts** smartly:
  - Prioritizes new players first.
  - Randomly selects a previously played player to fill any gap.

### 🎲 Rolling System (Match Generator)
- Balanced random rolling ensures fair court time.
- Prevents repeat matchups where possible.
- Fresh players prioritized each round.
- Intelligent odd-player handling for fairness and continuity.

### 🧼 Reset & Data Management
- **Reset Players** button clears all courts and queue.
- Queue and court data persist in `localStorage` across sessions.
- Automatically restores data after page reloads or browser restarts.

### 💾 Local Storage System
- Uses keys:
  - `pickleballQueue_v3` → Queue List  
  - `pickleballCourts_v3` → Courts List
- Fully synchronized between tabs via `storage` event.
- Allows multiple open pages (e.g., admin + dashboard view).

---

## 💻 USER INTERFACE & DESIGN

### 🧭 Index Page (Admin)
- Modern, card-based layout with green/white theme.
- Smooth animations and responsive layout.
- Interactive modals for alerts and confirmations:
  - “Select players first”  
  - “Confirm Reset”  
  - “Court Finished”
- Button animations and disabled states for feedback.
- Works seamlessly across desktop, tablet, and mobile.

### 📺 Queue Dashboard Page (Viewer Mode)
- Real-time visual display of queue and courts.
- Responsive **grid layout** for TVs or tablets.
- Auto-syncs with admin view via localStorage events.
- Auto-refresh fallback every few seconds.
- Square, visually balanced court tiles (4 players each).
- Clean “no players waiting” and “waiting for players” states.
- Minimalist color palette consistent with index UI.

---

## 🧠 FUNCTIONAL INTELLIGENCE

- ✅ Prevents rolling when courts are full  
- ✅ Prevents duplicate player assignment  
- ✅ Players reenter queue only after finishing  
- ✅ Smart handling of new and returning players  
- ✅ Multi-tab synchronization  
- ✅ Persistent state until reset  

---

## 🛠️ TECHNICAL IMPLEMENTATION

| Component | Description |
|------------|-------------|
| **Frontend Stack** | HTML5, CSS3, JavaScript (Vanilla) |
| **State Persistence** | `localStorage` |
| **Sync Method** | `window.storage` event |
| **PWA Ready** | Yes (`manifest.json`) |
| **Hosting Platform** | Firebase Hosting |
| **File Structure** | `index.html`, `dashboard.html`, `style.css`, `script.js`, `manifest.json` |
| **Version Keys** | v3 (Queue & Courts) |

---

## 🔔 QUALITY-OF-LIFE FEATURES

- Reusable modal system  
- Button animations (“Generating…”, “Rolling…”)  
- Smooth hover and transition effects  
- Persistent storage  
- Mobile-friendly layouts  
- Dark green professional accent theme  

---

## 🚀 PLANNED / OPTIONAL ADD-ONS

| Feature | Description | Status |
|----------|-------------|--------|
| 🌙 Auto Dark Mode | Switch to dark theme at night | Optional |
| 📡 Firebase Sync | Sync across multiple devices via Firebase | Future |
| 🏆 Match History | Track who played on which court | Future |
| 📱 PWA Offline Mode | Installable mobile app | Ready |
| 🔔 Sound Alerts | Chime when courts become available | Future |

---

## 🧾 VERSION HISTORY

| Version | Date | Summary |
|----------|------|----------|
| **v1.0** | Initial Release | Base player queue + localStorage |
| **v2.0** | Added Courts System | Multiple courts, finish/reset logic |
| **v2.5** | Random Balancing | Fair rolling, prevents duplicates |
| **v3.0** | Persistent Local Data | Saved queue/court states |
| **v3.5** | Modern UI | Responsive design, modal system |
| **v4.0** | Dashboard Mode | Real-time synced display |
| **v4.1** | Responsive Upgrade | TV/tablet grid layout |

---

**Developed by:** Mark Vill  
**Technology:** Vanilla JS + Firebase Hosting  
**Version:** 4.1  
