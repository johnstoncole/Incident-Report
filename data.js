// ─── Incident Management ────────────────────────────────────────

const INCIDENTS_KEY   = "cimt7_incidents";
const CURRENT_INC_KEY = "cimt7_current_incident";

function getIncidentId() {
  return localStorage.getItem(CURRENT_INC_KEY) || null;
}

function ns(key) {
  return `cimt7_${getIncidentId() || "default"}_${key}`;
}

function loadIncidents() {
  return JSON.parse(localStorage.getItem(INCIDENTS_KEY) || "[]");
}

function saveIncidents(list) {
  localStorage.setItem(INCIDENTS_KEY, JSON.stringify(list));
}

function createIncident(name) {
  const id = "inc_" + Date.now();
  const list = loadIncidents();
  list.push({ id, name, createdAt: new Date().toISOString() });
  saveIncidents(list);
  localStorage.setItem(`cimt7_${id}_settings`, JSON.stringify({ name, password: "CIMT7" }));
  return id;
}

function deleteIncident(id) {
  // Remove all keys belonging to this incident
  const toRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(`cimt7_${id}_`)) toRemove.push(k);
  }
  toRemove.forEach(k => localStorage.removeItem(k));
  saveIncidents(loadIncidents().filter(inc => inc.id !== id));
  if (getIncidentId() === id) localStorage.removeItem(CURRENT_INC_KEY);
}

function loadIncidentSettings() {
  const id = getIncidentId();
  if (!id) return { name: "Incident", password: "CIMT7" };
  return JSON.parse(localStorage.getItem(`cimt7_${id}_settings`) || '{"name":"Incident","password":"CIMT7"}');
}

function saveIncidentSettings(settings) {
  const id = getIncidentId();
  if (!id) return;
  localStorage.setItem(`cimt7_${id}_settings`, JSON.stringify(settings));
  const list = loadIncidents();
  const idx  = list.findIndex(i => i.id === id);
  if (idx !== -1) { list[idx].name = settings.name; saveIncidents(list); }
  window._onDataSaved && window._onDataSaved();
}

function getIncidentName() {
  return loadIncidentSettings().name || "Incident";
}

// ─── Auto-apply incident name to nav ───────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const el = document.getElementById("nav-incident");
  if (el) el.textContent = getIncidentId() ? getIncidentName() : "";
});

// ─── Migration from old tacomaCreek_ keys ──────────────────────
(function migrate() {
  if (localStorage.getItem("cimt7_migrated")) return;
  const oldR = localStorage.getItem("tacomaCreek_resources");
  const oldD = localStorage.getItem("tacomaCreek_divisions");
  if (oldR) {
    const id   = "inc_legacy";
    const list = loadIncidents();
    if (!list.find(i => i.id === id)) {
      list.push({ id, name: "Tacoma Creek Fire", createdAt: new Date().toISOString() });
      saveIncidents(list);
    }
    localStorage.setItem(`cimt7_${id}_settings`, JSON.stringify({ name: "Tacoma Creek Fire", password: "CIMT7" }));
    localStorage.setItem(`cimt7_${id}_resources`, oldR);
    if (oldD) localStorage.setItem(`cimt7_${id}_divisions`, oldD);
    localStorage.setItem(CURRENT_INC_KEY, id);
  }
  localStorage.setItem("cimt7_migrated", "1");
})();

// ─── Resources ──────────────────────────────────────────────────

function loadResources() {
  return JSON.parse(localStorage.getItem(ns("resources")) || "[]");
}

function saveResources(list) {
  localStorage.setItem(ns("resources"), JSON.stringify(list));
  window._onDataSaved && window._onDataSaved();
}

// ─── Divisions ──────────────────────────────────────────────────

function loadDivisions() {
  return JSON.parse(localStorage.getItem(ns("divisions")) || "[]");
}

function saveDivisions(list) {
  localStorage.setItem(ns("divisions"), JSON.stringify(list));
  window._onDataSaved && window._onDataSaved();
}

function loadDivisionCoords() {
  return JSON.parse(localStorage.getItem(ns("divCoords")) || "{}");
}

function saveDivisionCoords(coords) {
  localStorage.setItem(ns("divCoords"), JSON.stringify(coords));
  window._onDataSaved && window._onDataSaved();
}

// ─── Utilities ──────────────────────────────────────────────────

function lastWorkingDay(r) {
  if (!r.firstWorkingDay) return null;
  const d = new Date(r.firstWorkingDay + "T00:00:00");
  d.setDate(d.getDate() + (Number(r.lengthOfAssignment) || 14) - 1);
  return d;
}

function daysLeft(r) {
  const lwd = lastWorkingDay(r);
  if (!lwd) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((lwd - today) / 86400000);
}

function fmtDate(d) {
  if (!d) return "";
  if (typeof d === "string") d = new Date(d + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
}

function typeColor(type) {
  switch ((type || "").trim()) {
    case "Ambo":    return "#e87722";
    case "Med Mod": return "#1a6fba";
    case "Rems":    return "#2a9d4e";
    case "Medic":   return "#9b30c4";
    default:        return "#666";
  }
}

function typeBadge(type) {
  return `<span class="badge" style="background:${typeColor(type)}">${type || "—"}</span>`;
}

function normalize(str) {
  return (str || "").toLowerCase().trim();
}
