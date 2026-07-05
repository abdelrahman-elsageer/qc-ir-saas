const state = {
  token: localStorage.getItem("token") || "",
  user: JSON.parse(localStorage.getItem("user") || "null"),
  permissions: [],
  data: { qcLog: [], irLog: [], boq: [], stages: [], locations: [], parts: [] },
};

const queueKey = "qc_ir_offline_queue";

const $ = (id) => document.getElementById(id);
const val = (id) => ($(id) ? $(id).value : "");

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 3600);
}

function queue() {
  return JSON.parse(localStorage.getItem(queueKey) || "[]");
}

function saveQueue(items) {
  localStorage.setItem(queueKey, JSON.stringify(items));
  renderQueue();
  updateNetBadges();
}

function addOfflineOperation(type, payload) {
  const items = queue();
  items.push({
    client_id: crypto.randomUUID(),
    type,
    payload,
    created_at: new Date().toISOString(),
  });
  saveQueue(items);
  toast("Saved offline. It will sync when connection returns.");
}

function can(permission) {
  return state.permissions.includes(permission);
}

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const res = await fetch(path, { ...options, headers });
  const data = await res.json();
  if (!res.ok || data.ok === false) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
}

async function safeApiOrQueue(type, payload, request) {
  if (!navigator.onLine) {
    addOfflineOperation(type, payload);
    return { queued: true };
  }
  try {
    return await request();
  } catch (err) {
    if (String(err.message).includes("Failed to fetch")) {
      addOfflineOperation(type, payload);
      return { queued: true };
    }
    throw err;
  }
}

function updateNetBadges() {
  const online = navigator.onLine;
  for (const id of ["netBadge", "netBadgeApp"]) {
    const el = $(id);
    if (!el) continue;
    el.textContent = online ? "Online" : "Offline";
    el.classList.toggle("offline", !online);
  }
  $("queueCount").textContent = queue().length;
  $("kOffline").textContent = queue().length;
}

function setView(id) {
  document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === id));
  document.querySelectorAll(".nav").forEach((n) => n.classList.toggle("active", n.dataset.view === id));
  const titles = { dashboard: "Dashboard", submit: "Submit QC", qc: "QC Board", ir: "IR Log", queue: "Offline Queue" };
  $("pageTitle").textContent = titles[id] || "Dashboard";
}

function badge(text) {
  const s = text || "-";
  let cls = "badge";
  if (s.includes("Approved") || s.includes("Generated")) cls += " ok";
  if (s.includes("Rejected")) cls += " bad";
  if (s.includes("Pending") || s.includes("Submitted")) cls += " wait";
  return `<span class="${cls}">${escapeHtml(s)}</span>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fileLink(path, label) {
  return path ? `<a href="/files/${escapeHtml(path)}" target="_blank">${escapeHtml(label || "Open")}</a>` : "-";
}

function renderTable(id, rows, columns) {
  const table = $(id);
  if (!rows.length) {
    table.innerHTML = `<tbody><tr><td class="muted">No data yet.</td></tr></tbody>`;
    return;
  }
  const head = columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join("");
  const body = rows.map((row) => {
    const tds = columns.map((c) => {
      const value = typeof c.render === "function" ? c.render(row) : escapeHtml(row[c.key] || "");
      return `<td class="${c.className || ""}">${value}</td>`;
    }).join("");
    return `<tr>${tds}</tr>`;
  }).join("");
  table.innerHTML = `<thead><tr>${head}</tr></thead><tbody>${body}</tbody>`;
}

function renderDashboard() {
  const qc = state.data.qcLog || [];
  const ir = state.data.irLog || [];
  $("kPendingQC").textContent = qc.filter((r) => r.current_status === "Pending QC").length;
  $("kApprovedQC").textContent = qc.filter((r) => r.current_status === "IR Generated" || r.current_status === "QC Approved").length;
  $("kRejectedQC").textContent = qc.filter((r) => String(r.current_status).includes("Rejected")).length;
  $("kIRSubmitted").textContent = ir.filter((r) => r.ir_status === "IR Submitted").length;
  $("kIRApproved").textContent = ir.filter((r) => r.ir_status === "IR Approved").length;
  $("kOffline").textContent = queue().length;
  renderTable("recentTable", qc.slice(0, 8), [
    { label: "Serial", key: "qc_serial" },
    { label: "Subject", key: "subject" },
    { label: "Location", key: "location_text" },
    { label: "Status", render: (r) => badge(r.current_status) },
    { label: "Form", render: (r) => fileLink(r.qc_form_path, "QC Form") },
  ]);
}

function fillSelect(id, options, valueKey, labelKey) {
  $(id).innerHTML = options.map((x) => `<option value="${escapeHtml(x[valueKey])}">${escapeHtml(x[labelKey])}</option>`).join("");
}

function fillFormOptions() {
  fillSelect("floor", state.data.locations || [], "location_code", "location_name");
  fillSelect("part", state.data.parts || [], "part_code", "part_name");
  fillSelect("item", state.data.boq || [], "item_id", "description");
  populateBuildings();
  fillStages();
}

function populateBuildings() {
  const item = (state.data.boq || []).find((x) => x.item_id === val("item"));
  const buildings = String(item?.buildings || "B09,B10").split(",").map((x) => x.trim()).filter(Boolean);
  $("building").innerHTML = buildings.map((b) => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join("");
}

function fillStages() {
  const stages = (state.data.stages || []).filter((x) => x.item_id === val("item"));
  $("stage").innerHTML = stages.map((s) => `<option value="${escapeHtml(s.stage_id)}">${s.stage_no} - ${escapeHtml(s.stage_name)}</option>`).join("");
  renderStageStatus();
}

function renderStageStatus() {
  const item = (state.data.boq || []).find((x) => x.item_id === val("item"));
  const stages = (state.data.stages || []).filter((x) => x.item_id === val("item"));
  const payloadKey = (stageId) => [
    val("building").toUpperCase(),
    val("floor").toUpperCase(),
    normalizeFlat(val("flat")).toUpperCase(),
    val("part").toUpperCase(),
    String(item?.item_no || "").toUpperCase(),
    stageId.toUpperCase(),
  ].join("|");
  const rows = stages.map((s) => {
    const found = (state.data.qcLog || []).find((q) => q.duplicate_key === payloadKey(s.stage_id));
    return { stage: `${s.stage_no} - ${s.stage_name}`, status: found ? found.current_status : "Not Submitted", serial: found ? found.qc_serial : "" };
  });
  renderTable("stageTable", rows, [
    { label: "Stage", key: "stage" },
    { label: "Status", render: (r) => badge(r.status) },
    { label: "Serial", key: "serial" },
  ]);
}

function normalizeFlat(flat) {
  const v = String(flat || "").trim();
  return /^\d$/.test(v) ? `0${v}` : v;
}

function filtered(rows, inputId, fields) {
  const q = val(inputId).toLowerCase();
  if (!q) return rows;
  return rows.filter((r) => fields.some((f) => String(r[f] || "").toLowerCase().includes(q)));
}

function renderQC() {
  const rows = filtered(state.data.qcLog || [], "qcSearch", ["qc_serial", "subject", "location_text", "current_status"]);
  renderTable("qcTable", rows, [
    { label: "Serial", key: "qc_serial" },
    { label: "Subject", key: "subject" },
    { label: "Location", key: "location_text" },
    { label: "Discipline", key: "discipline_code" },
    { label: "Status", render: (r) => badge(r.current_status) },
    { label: "QC Form", render: (r) => fileLink(r.qc_form_path, "Open") },
    { label: "Actions", className: "actions", render: qcActions },
  ]);
}

function qcActions(row) {
  if (!can("REVIEW_QC") || row.current_status !== "Pending QC") return "-";
  return `
    <button class="secondary" onclick="approveQC('${row.qc_id}')">Approve</button>
    <button class="danger" onclick="rejectQC('${row.qc_id}')">Reject</button>
  `;
}

function renderIR() {
  const rows = filtered(state.data.irLog || [], "irSearch", ["serial_no", "subject", "location", "ir_status"]);
  renderTable("irTable", rows, [
    { label: "Serial", key: "serial_no" },
    { label: "Subject", key: "subject" },
    { label: "Location", key: "location" },
    { label: "Status", render: (r) => badge(r.ir_status) },
    { label: "IR Form", render: (r) => fileLink(r.ir_form_path, "Open") },
    { label: "Reply", className: "actions", render: irActions },
  ]);
}

function irActions(row) {
  if (!can("UPDATE_IR_REPLY") || row.ir_status !== "IR Submitted") return "-";
  return `<button class="secondary" onclick="replyIR('${row.ir_id}')">Record Reply</button>`;
}

function renderQueue() {
  const rows = queue();
  $("queueCount").textContent = rows.length;
  if ($("kOffline")) $("kOffline").textContent = rows.length;
  renderTable("queueTable", rows, [
    { label: "Type", key: "type" },
    { label: "Created", render: (r) => new Date(r.created_at).toLocaleString() },
    { label: "Payload", render: (r) => `<code>${escapeHtml(JSON.stringify(r.payload))}</code>` },
  ]);
}

function renderAll() {
  renderDashboard();
  fillFormOptions();
  renderQC();
  renderIR();
  renderQueue();
  updateNetBadges();
}

async function loadData() {
  if (!state.token) return;
  const data = await api("/api/bootstrap");
  state.user = data.user;
  state.permissions = data.permissions || [];
  state.data = data;
  localStorage.setItem("user", JSON.stringify(state.user));
  $("syncStatus").textContent = `Synced ${new Date().toLocaleTimeString()}`;
  $("userInfo").textContent = `${state.user.name} - ${state.user.role}`;
  renderAll();
}

async function syncOfflineQueue() {
  const items = queue();
  if (!items.length || !navigator.onLine || !state.token) return;
  $("syncStatus").textContent = `Syncing ${items.length} offline operation(s)...`;
  const res = await api("/api/offline/sync", {
    method: "POST",
    body: JSON.stringify({ operations: items }),
  });
  const failed = res.results.filter((r) => !r.ok);
  if (failed.length) {
    const failedIds = new Set(failed.map((r) => r.client_id));
    saveQueue(items.filter((x) => failedIds.has(x.client_id)));
    toast(`${failed.length} offline operation(s) need review.`);
  } else {
    saveQueue([]);
    toast("Offline queue synced.");
  }
  await loadData();
}

async function login(event) {
  event.preventDefault();
  $("loginMsg").textContent = "";
  try {
    const res = await api("/api/login", {
      method: "POST",
      body: JSON.stringify({ username: val("username"), password: val("password") }),
    });
    state.token = res.token;
    state.user = res.user;
    state.permissions = res.permissions || [];
    localStorage.setItem("token", state.token);
    localStorage.setItem("user", JSON.stringify(state.user));
    $("loginView").classList.add("hidden");
    $("appView").classList.remove("hidden");
    await loadData();
    await syncOfflineQueue();
  } catch (err) {
    $("loginMsg").textContent = err.message;
  }
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  state.token = "";
  state.user = null;
  $("loginView").classList.remove("hidden");
  $("appView").classList.add("hidden");
}

async function submitQC(event) {
  event.preventDefault();
  if (!can("SUBMIT_QC")) return toast("You do not have permission to submit QC.");
  const payload = {
    building: val("building"),
    floor: val("floor"),
    flat: normalizeFlat(val("flat")),
    part: val("part"),
    item_id: val("item"),
    stage_id: val("stage"),
    notes: val("notes"),
  };
  try {
    const res = await safeApiOrQueue("SUBMIT_QC", payload, () => api("/api/qc", { method: "POST", body: JSON.stringify(payload) }));
    $("submitMsg").textContent = res.queued ? "Saved offline." : res.message;
    $("qcForm").reset();
    if (!res.queued) await loadData();
  } catch (err) {
    $("submitMsg").textContent = err.message;
  }
}

async function approveQC(qcId) {
  const code = prompt("QC Code: A = Approved, B = Approved with comments", "A");
  if (!code) return;
  const remark = prompt("Remark (optional)", "") || "";
  const payload = { qc_id: qcId, code: code.toUpperCase(), remark };
  try {
    const res = await safeApiOrQueue("APPROVE_QC", payload, () => api(`/api/qc/${qcId}/approve`, { method: "POST", body: JSON.stringify(payload) }));
    toast(res.queued ? "Approval saved offline." : res.message);
    if (!res.queued) await loadData();
  } catch (err) {
    toast(err.message);
  }
}

async function rejectQC(qcId) {
  const code = prompt("Reject Code: C or D", "C");
  if (!code) return;
  const remark = prompt("Reject reason");
  if (!remark) return toast("Reject reason is required.");
  const payload = { qc_id: qcId, code: code.toUpperCase(), remark };
  try {
    const res = await safeApiOrQueue("REJECT_QC", payload, () => api(`/api/qc/${qcId}/reject`, { method: "POST", body: JSON.stringify(payload) }));
    toast(res.queued ? "Rejection saved offline." : res.message);
    if (!res.queued) await loadData();
  } catch (err) {
    toast(err.message);
  }
}

async function replyIR(irId) {
  const code = prompt("IR Reply Code: A/B/C/D", "A");
  if (!code) return;
  const remark = prompt("Consultant remark", "") || "";
  try {
    const res = await api(`/api/ir/${irId}/reply`, { method: "POST", body: JSON.stringify({ code: code.toUpperCase(), remark }) });
    toast(res.message);
    await loadData();
  } catch (err) {
    toast(err.message);
  }
}

function boot() {
  $("loginForm").addEventListener("submit", login);
  $("logoutBtn").addEventListener("click", logout);
  $("qcForm").addEventListener("submit", submitQC);
  $("syncBtn").addEventListener("click", async () => { await syncOfflineQueue(); await loadData(); });
  $("clearQueueBtn").addEventListener("click", () => saveQueue([]));
  $("item").addEventListener("change", () => { populateBuildings(); fillStages(); });
  ["building", "floor", "flat", "part"].forEach((id) => $(id).addEventListener("input", renderStageStatus));
  $("qcSearch").addEventListener("input", renderQC);
  $("irSearch").addEventListener("input", renderIR);
  document.querySelectorAll(".nav").forEach((btn) => btn.addEventListener("click", () => setView(btn.dataset.view)));
  window.addEventListener("online", async () => { updateNetBadges(); await syncOfflineQueue(); });
  window.addEventListener("offline", updateNetBadges);
  updateNetBadges();

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js");

  if (state.token && state.user) {
    $("loginView").classList.add("hidden");
    $("appView").classList.remove("hidden");
    $("userInfo").textContent = `${state.user.name} - ${state.user.role}`;
    loadData().then(syncOfflineQueue).catch((err) => {
      $("syncStatus").textContent = `Offline mode: ${err.message}`;
      renderQueue();
    });
  }
}

boot();
