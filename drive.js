// ─── Google Drive Upload Helper ────────────────────────────────
// Requires config.js (GOOGLE_CLIENT_ID, DRIVE_ROOT_FOLDER) loaded first.

let _tokenClient = null;
let _accessToken  = null;

function driveInit() {
  _tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: "https://www.googleapis.com/auth/drive.file",
    callback: () => {},   // overridden per-request
  });
}

// Returns a Promise that resolves to an access token.
function getToken() {
  return new Promise((resolve, reject) => {
    if (_accessToken) { resolve(_accessToken); return; }
    _tokenClient.callback = (resp) => {
      if (resp.error) { reject(resp); return; }
      _accessToken = resp.access_token;
      resolve(_accessToken);
    };
    _tokenClient.requestAccessToken({ prompt: "consent" });
  });
}

// Find folder by name under parentId, or create it. Returns folder id.
async function findOrCreateFolder(name, parentId) {
  const token = await getToken();
  const qParts = [`name='${name.replace(/'/g,"\\'")}' `,
                  `and mimeType='application/vnd.google-apps.folder'`,
                  `and trashed=false`];
  if (parentId) qParts.push(`and '${parentId}' in parents`);
  const q = qParts.join(" ");

  const listResp = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const listData = await listResp.json();
  if (listData.files && listData.files.length > 0) return listData.files[0].id;

  // Create folder
  const meta = { name, mimeType: "application/vnd.google-apps.folder" };
  if (parentId) meta.parents = [parentId];
  const createResp = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(meta),
  });
  const folder = await createResp.json();
  return folder.id;
}

// Set "anyone with the link can view" permission on a file.
async function makePublic(fileId) {
  const token = await getToken();
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ role: "reader", type: "anyone" }),
  });
}

// Upload a File object to Drive inside DRIVE_ROOT_FOLDER/{agency}/{orderNumber}/.
// Returns { id, webViewLink } on success.
async function uploadFileToDrive(file, orderNumber, label, agency) {
  const token = await getToken();

  // Ensure root folder exists
  const rootId = await findOrCreateFolder(DRIVE_ROOT_FOLDER, null);
  // Ensure agency folder exists
  const agencyName = (agency || "Unknown Agency").trim();
  const agencyId = await findOrCreateFolder(agencyName, rootId);
  // Ensure order sub-folder exists inside agency folder
  const subId = await findOrCreateFolder(String(orderNumber), agencyId);

  // Build multipart body
  const filename = `${label}_${orderNumber}_${file.name}`;
  const meta = JSON.stringify({ name: filename, parents: [subId] });

  const boundary = "-------driveUploadBoundary314159";
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metaPart = `${delimiter}Content-Type: application/json\r\n\r\n${meta}`;
  const filePartHeader = `${delimiter}Content-Type: ${file.type || "application/octet-stream"}\r\n\r\n`;

  // Read file as ArrayBuffer, then combine with text parts
  const fileBuffer = await file.arrayBuffer();
  const encoder = new TextEncoder();
  const metaBytes = encoder.encode(metaPart + filePartHeader);
  const closeBytes = encoder.encode(closeDelimiter);

  const combined = new Uint8Array(metaBytes.byteLength + fileBuffer.byteLength + closeBytes.byteLength);
  combined.set(metaBytes, 0);
  combined.set(new Uint8Array(fileBuffer), metaBytes.byteLength);
  combined.set(closeBytes, metaBytes.byteLength + fileBuffer.byteLength);

  const uploadResp = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary="${boundary}"`,
      },
      body: combined,
    }
  );

  if (!uploadResp.ok) {
    const err = await uploadResp.json();
    throw new Error(err.error?.message || "Upload failed");
  }

  const result = await uploadResp.json();
  await makePublic(result.id);
  return result; // { id, webViewLink }
}
