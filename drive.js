// ─── Google Drive Upload via Apps Script ───────────────
// Requires config.js (APPS_SCRIPT_URL, DRIVE_ROOT_FOLDER) loaded first.
// Files always land in the Drive account that owns the Apps Script.

// Read a File object as base64 string (without the data: prefix).
function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Upload a File to Drive via the Apps Script relay.
// Returns { id, webViewLink } on success.
async function uploadFileToDrive(file, orderNumber, label, agency) {
  if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.includes("YOUR_APPS_SCRIPT_URL")) {
    throw new Error("Apps Script URL not configured in config.js");
  }

  const base64Data = await readFileAsBase64(file);

  const payload = {
    fileName:    `${label}_${orderNumber}_${file.name}`,
    base64Data,
    mimeType:    file.type || "application/octet-stream",
    agency:      (agency || "Unknown Agency").trim(),
    orderNumber: String(orderNumber),
    rootFolder:  DRIVE_ROOT_FOLDER,
  };

  const response = await fetch(APPS_SCRIPT_URL, {
    method:   "POST",
    redirect: "follow",
    body:     JSON.stringify(payload),
  });

  const text = await response.text();
  let result;
  try { result = JSON.parse(text); } catch {
    throw new Error("Unexpected response from Apps Script: " + text.slice(0, 200));
  }

  if (!result.success) throw new Error(result.error || "Upload failed");
  return result; // { id, webViewLink }
}
