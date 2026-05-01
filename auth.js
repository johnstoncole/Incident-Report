// ─── Password Protection ───────────────────────────────────────────
// Change PASSWORD below to update the site password.
const PASSWORD = "CIMT7";
const AUTH_KEY = "cimt7_authenticated";

function checkAuth() {
  if (sessionStorage.getItem(AUTH_KEY) === "1") return;
  injectLoginOverlay();
}

function injectLoginOverlay() {
  // Blur content behind overlay
  document.body.style.overflow = "hidden";

  const overlay = document.createElement("div");
  overlay.id = "auth-overlay";
  overlay.innerHTML = `
    <div class="auth-card">
      <img src="image1.png" class="auth-logo" alt="Great Basin CIMT 7">
      <h2>Great Basin CIMT 7</h2>
      <p class="auth-sub">Medical Group</p>
      <p class="auth-label">Enter password to continue</p>
      <div class="auth-input-wrap">
        <input type="password" id="auth-password" placeholder="Password" autocomplete="current-password">
        <button onclick="submitPassword()">Unlock</button>
      </div>
      <p class="auth-error" id="auth-error"></p>
    </div>`;

  document.body.appendChild(overlay);

  const inp = document.getElementById("auth-password");
  inp.focus();
  inp.addEventListener("keydown", e => { if (e.key === "Enter") submitPassword(); });
}

function submitPassword() {
  const val = document.getElementById("auth-password").value;
  if (val === PASSWORD) {
    sessionStorage.setItem(AUTH_KEY, "1");
    const overlay = document.getElementById("auth-overlay");
    overlay.style.opacity = "0";
    overlay.style.transition = "opacity .3s";
    setTimeout(() => { overlay.remove(); document.body.style.overflow = ""; }, 300);
  } else {
    const err = document.getElementById("auth-error");
    err.textContent = "Incorrect password. Try again.";
    const inp = document.getElementById("auth-password");
    inp.value = "";
    inp.classList.add("auth-shake");
    setTimeout(() => inp.classList.remove("auth-shake"), 500);
  }
}
