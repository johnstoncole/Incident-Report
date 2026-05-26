// ─── Firebase Real-time Sync ────────────────────────────────────
// Requires: firebase-app-compat + firebase-firestore-compat CDN scripts,
//           config.js (FIREBASE_CONFIG), and data.js loaded before this file.

let _db       = null;
let _listener = null;
let _pushing  = false; // prevent push→listen→push loops

// ── Live sync badge ──────────────────────────────────────────────
function _injectBadge() {
  if (document.getElementById("sync-badge")) return;
  const nav = document.querySelector("nav");
  if (!nav) return;
  const badge = document.createElement("span");
  badge.id = "sync-badge";
  badge.className = "sync-badge connecting";
  badge.innerHTML = `<span class="sync-dot"></span><span id="sync-label">Connecting…</span>`;
  nav.appendChild(badge);
}

function _setBadge(state) { // state: 'live' | 'connecting' | 'offline'
  const badge = document.getElementById("sync-badge");
  const label = document.getElementById("sync-label");
  if (!badge || !label) return;
  badge.className = "sync-badge " + state;
  label.textContent = state === "live" ? "LIVE" : state === "offline" ? "Offline" : "Connecting…";
}

// ── Core init ────────────────────────────────────────────────────
function initFirebaseSync() {
  if (typeof firebase === "undefined") return;
  if (!FIREBASE_CONFIG || !FIREBASE_CONFIG.projectId) return;
  try {
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    _db = firebase.firestore();
    window._onDataSaved = pushToFirebase;
    console.log("[Firebase] Connected to", FIREBASE_CONFIG.projectId);
    _setBadge("connecting");

    // Watch online/offline status
    window.addEventListener("online",  () => { if (_db) _setBadge("live"); });
    window.addEventListener("offline", () => _setBadge("offline"));
  } catch (e) {
    console.warn("[Firebase] Init failed:", e);
    _setBadge("offline");
  }
}

function _incRef() {
  return _db.collection("incidents").doc(getIncidentId());
}

// Push all current localStorage data for this incident up to Firestore
function pushToFirebase() {
  if (!_db || !getIncidentId() || _pushing) return;
  const id       = getIncidentId();
  const settings = loadIncidentSettings();
  const incs     = loadIncidents();
  const inc      = incs.find(i => i.id === id) || {};

  _pushing = true;
  _incRef().set({
    name:      settings.name     || "Incident",
    password:  settings.password || "CIMT7",
    createdAt: inc.createdAt     || new Date().toISOString(),
    resources: loadResources(),
    divisions: loadDivisions(),
    divCoords: loadDivisionCoords(),
  }, { merge: true })
  .then(() => _setBadge("live"))
  .catch(e => { console.warn("[Firebase] Push error:", e); _setBadge("offline"); })
  .finally(() => { _pushing = false; });
}

// Listen for changes pushed by other devices and refresh UI automatically
function startFirebaseListener() {
  if (!_db || !getIncidentId()) return;
  if (_listener) { _listener(); _listener = null; }

  _listener = _incRef().onSnapshot({ includeMetadataChanges: true }, (doc) => {
    if (!doc.exists) return;

    // Mark badge live on any snapshot (proves we're connected)
    _setBadge("live");

    if (doc.metadata.hasPendingWrites) return; // our own write — skip

    const data = doc.data();
    const id   = getIncidentId();

    // Update localStorage cache with server data
    if (Array.isArray(data.resources))
      localStorage.setItem(`cimt7_${id}_resources`, JSON.stringify(data.resources));
    if (Array.isArray(data.divisions))
      localStorage.setItem(`cimt7_${id}_divisions`, JSON.stringify(data.divisions));
    if (data.divCoords)
      localStorage.setItem(`cimt7_${id}_divCoords`, JSON.stringify(data.divCoords));
    if (data.name || data.password)
      localStorage.setItem(`cimt7_${id}_settings`, JSON.stringify({
        name: data.name, password: data.password
      }));

    // Keep incidents list name in sync
    const incs = loadIncidents();
    const idx  = incs.findIndex(i => i.id === id);
    if (idx !== -1 && incs[idx].name !== data.name) {
      incs[idx].name = data.name;
      localStorage.setItem(INCIDENTS_KEY, JSON.stringify(incs));
    }

    // Refresh the current page's UI
    if (typeof window.onFirebaseUpdate === "function") {
      window.onFirebaseUpdate();
    }
  }, (err) => {
    console.warn("[Firebase] Listener error:", err);
    _setBadge("offline");
  });
}

// One-time fetch on page load — pull latest from Firestore into localStorage
async function pullFromFirebase() {
  if (!_db || !getIncidentId()) return;
  try {
    const doc = await _incRef().get();
    if (!doc.exists) {
      pushToFirebase();
      return;
    }
    const data = doc.data();
    const id   = getIncidentId();
    if (Array.isArray(data.resources))
      localStorage.setItem(`cimt7_${id}_resources`, JSON.stringify(data.resources));
    if (Array.isArray(data.divisions))
      localStorage.setItem(`cimt7_${id}_divisions`, JSON.stringify(data.divisions));
    if (data.divCoords)
      localStorage.setItem(`cimt7_${id}_divCoords`, JSON.stringify(data.divCoords));
    if (data.name || data.password)
      localStorage.setItem(`cimt7_${id}_settings`, JSON.stringify({
        name: data.name, password: data.password
      }));
    _setBadge("live");
  } catch (e) {
    console.warn("[Firebase] Pull error:", e);
    _setBadge("offline");
  }
}

// Load all incidents across all devices (used by fires.html)
async function loadIncidentsFromFirebase() {
  if (!_db) return loadIncidents();
  try {
    const snapshot = await _db.collection("incidents").get();
    const remote   = [];
    snapshot.forEach(doc => {
      remote.push({ id: doc.id, name: doc.data().name, createdAt: doc.data().createdAt });
    });
    const local  = loadIncidents();
    const merged = [...local];
    remote.forEach(r => { if (!merged.find(l => l.id === r.id)) merged.push(r); });
    if (merged.length !== local.length) saveIncidents(merged);
    _setBadge("live");
    return merged;
  } catch (e) {
    console.warn("[Firebase] Load incidents error:", e);
    _setBadge("offline");
    return loadIncidents();
  }
}

// Delete incident from Firestore too
async function deleteIncidentFromFirebase(id) {
  if (!_db) return;
  try { await _db.collection("incidents").doc(id).delete(); } catch (e) {}
}

// ─── Auto-init on page load ──────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  _injectBadge();
  initFirebaseSync();
  if (getIncidentId()) {
    await pullFromFirebase();
    startFirebaseListener();
  }
});
