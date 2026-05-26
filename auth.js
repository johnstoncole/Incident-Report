// ─── Password Protection ────────────────────────────────────────

const AUTH_KEY = "cimt7_authenticated";

function checkAuth() {
  if (!localStorage.getItem(CURRENT_INC_KEY)) {
    location.replace("fires.html");
    return;
  }
  if (sessionStorage.getItem(AUTH_KEY) === "1") return;
  injectLoginOverlay();
}

function injectLoginOverlay() {
  document.body.style.overflow = "hidden";
  const id       = localStorage.getItem(CURRENT_INC_KEY);
  const settings = JSON.parse(localStorage.getItem(`cimt7_${id}_settings`) || "{}");
  const incName  = settings.name || "";

  const overlay = document.createElement("div");
  overlay.id = "auth-overlay";
  overlay.innerHTML = `
    <div class="auth-card">
      <img src="image1.png" class="auth-logo" alt="Great Basin CIMT 7">
      <h2>Great Basin CIMT 7</h2>
      <p class="auth-sub">Medical Group</p>
      ${incName ? `<p class="auth-incident-label">${incName}</p>` : ""}
      <p class="auth-label">Enter password to continue</p>
      <div class="auth-input-wrap">
        <input type="password" id="auth-password" placeholder="Password" autocomplete="current-password">
        <button onclick="submitPassword()">Unlock</button>
      </div>
      <p class="auth-error" id="auth-error"></p>
      <button class="auth-switch-btn" onclick="location.href='fires.html'">← Switch Incident</button>
    </div>`;

  document.body.appendChild(overlay);
  const inp = document.getElementById("auth-password");
  inp.focus();
  inp.addEventListener("keydown", e => { if (e.key === "Enter") submitPassword(); });
}

function submitPassword() {
  const id       = localStorage.getItem(CURRENT_INC_KEY);
  const settings = JSON.parse(localStorage.getItem(`cimt7_${id}_settings`) || "{}");
  const password = settings.password || "CIMT7";
  const val      = document.getElementById("auth-password").value;

  if (val === password) {
    sessionStorage.setItem(AUTH_KEY, "1");
    const overlay = document.getElementById("auth-overlay");
    overlay.style.opacity    = "0";
    overlay.style.transition = "opacity .3s";
    setTimeout(() => { overlay.remove(); document.body.style.overflow = ""; }, 300);
  } else {
    document.getElementById("auth-error").textContent = "Incorrect password. Try again.";
    const inp = document.getElementById("auth-password");
    inp.value = "";
    inp.classList.add("auth-shake");
    setTimeout(() => inp.classList.remove("auth-shake"), 500);
  }
}
