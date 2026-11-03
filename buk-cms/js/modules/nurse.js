// TRIAGE NURSE


function renderNurseQueue() {
  // Get patients waiting for the nurse.
  const rows = getVisitsByStatus("Waiting");

  // Get patients who were marked absent.
  const absentRows = getVisitsByStatus("Absent");

  // Display the normal waiting queue.
  document.getElementById('nurse-queue').innerHTML = rows.length
    ? rows.map((v) => `
      <tr class="border-b border-slate-100">
        <td class="py-2 font-medium">
          ${v.name}
          <span class="text-xs text-slate-400 block">
            ${v.sex || ""} · ${v.age ? v.age + " yrs" : ""}
          </span>
        </td>
        <td>${priorityTag(v.priority)}</td>
        <td>
          <button onclick="callPatient('${v.id}')"
            class="bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg">
            Call
          </button>
        </td>
      </tr>
    `).join("")
    : '<tr><td colspan="3" class="text-center text-slate-400 py-6 text-xs">No one is waiting.</td></tr>';

  // Display absent patients separately.
  document.getElementById('nurse-absent-queue').innerHTML = absentRows.length
    ? absentRows.map((v) => `
      <tr class="border-b border-slate-100">
        <td class="py-2 font-medium">
          ${v.name}
          <span class="text-xs text-slate-400 block">
            ${v.sex || ""} · ${v.age ? v.age + " yrs" : ""}
          </span>
        </td>
        <td>
          <span class="text-blue-700 text-xs font-semibold">Absent</span>
        </td>
        <td>
          <button onclick="callPatient('${v.id}')"
            class="bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg">
            Call Again
          </button>
        </td>
      </tr>
    `).join("")
    : '<tr><td colspan="3" class="text-center text-slate-400 py-6 text-xs">No absent patients.</td></tr>';
}

function callPatient(id) {
  openVisitId = id;
  const v = getVisitById(id);
  document.getElementById('nurse-form').innerHTML = `
    <h4 class="font-semibold mb-3">${v.name} <span class="text-slate-400 font-normal">${priorityTag(v.priority)}</span></h4>
    <div class="grid grid-cols-2 gap-3 mb-3">
      <input id="v-bp" placeholder="Blood pressure e.g. 120/80" class="border border-slate-300 rounded-lg px-3 py-2 text-sm">
      <input id="v-temp" placeholder="Temperature °C" class="border border-slate-300 rounded-lg px-3 py-2 text-sm">
      <input id="v-resp" placeholder="Respiration /min" class="border border-slate-300 rounded-lg px-3 py-2 text-sm">
      <input id="v-ox" placeholder="Oxygen level %" class="border border-slate-300 rounded-lg px-3 py-2 text-sm">
      <input id="v-sugar" placeholder="Blood sugar mmol/L" class="border border-slate-300 rounded-lg px-3 py-2 text-sm col-span-2">
    </div>
    <div class="flex gap-2">
      <button onclick="saveVitals()" class="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg font-semibold">Save &amp; send to Doctor</button>
      <button onclick="markAbsent()" class="bg-slate-200 text-slate-700 text-sm px-4 py-2 rounded-lg">Mark absent</button>
    </div>`;
}
function saveVitals() {
  const vitals = {
    bp: document.getElementById('v-bp').value, temp: document.getElementById('v-temp').value,
    resp: document.getElementById('v-resp').value, ox: document.getElementById('v-ox').value, sugar: document.getElementById('v-sugar').value,
  };
  updateVisit(openVisitId, { status: "Triaged", vitals });
  openVisitId = null;
  document.getElementById('nurse-form').innerHTML = '<p class="text-blue-700 text-sm font-semibold">Saved. The patient has been sent to the doctor.</p>';
  renderNurseQueue();
}
function markAbsent() {
  updateVisit(openVisitId, { status: "Absent" });
  openVisitId = null;
  document.getElementById('nurse-form').innerHTML = '<p class="text-slate-500 text-sm">Patient marked absent.</p>';
  renderNurseQueue();
}
