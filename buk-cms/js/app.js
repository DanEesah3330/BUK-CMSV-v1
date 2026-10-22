// app.js — all the SCREEN logic (what the user sees/clicks). Data storage lives in data.js.
// Loaded after data.js, so every function in data.js is already available here


// (Global variable) secure all needed items in any page
let currentRole = null;   // "Records Officer" | "Triage Nurse" | "Doctor" | "Pharmacist"
let foundStudent = null;  // result of the last lookupStudent() call
let openVisitId = null;   // the visit currently open on the Nurse/Doctor screen


// Section switching (Application Routing)

function showSection(sectionId) {
  const homeView = document.getElementById('view-home');
  const loginSection = document.getElementById('login-section');
  const dashboardSection = document.getElementById('dashboard-section');
  const navHome = document.getElementById('nav-home');

  homeView.classList.add('hidden');
  loginSection.classList.add('hidden');
  dashboardSection.classList.add('hidden');
  document.getElementById(sectionId).classList.remove('hidden');
  navHome.style.display = sectionId === 'view-home' ? 'inline-block' : 'none';
}


// Role name (shown in the login form) -> the <div id="panel-..."> that role should see

const ROLE_PANELS = {
  "Records Officer": "panel-records",
  "Triage Nurse": "panel-nurse",
  "Doctor": "panel-doctor",
  "Diagnostics": "panel-diagnostics",
  "Pharmacist": "panel-pharmacy",
};

const ALL_PANEL_IDS = [
  ...Object.values(ROLE_PANELS),
  "panel-reports"
];

function showRolePanel(role) {
  ALL_PANEL_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });

  const targetPanelId = ROLE_PANELS[role];
  if (targetPanelId) {
    const targetEl = document.getElementById(targetPanelId);
    if (targetEl) targetEl.classList.remove('hidden');
  }
}

// Reports is a VIEW, not a login role — any signed-in staff member can check it,
// then go back to whichever work panel matches the role they signed in with.
function viewReports() {
  ALL_PANEL_IDS.forEach((id) => document.getElementById(id).classList.add('hidden'));
  document.getElementById('panel-reports').classList.remove('hidden');
  renderReports();
}
function backFromReports() { showRolePanel(currentRole); }


// Login / logout
// --------------
function handleLogin(event) {
  event.preventDefault();
  const role = document.getElementById('role').value;
  currentRole = role;
  localStorage.setItem('bukcms_role', role); // so a page refresh does not throw the staff back to login

  document.getElementById('current-role-title').innerText = role;
  const roleBadge = document.getElementById('role-badge');
  roleBadge.classList.remove('hidden');
  roleBadge.classList.add('flex');

  const loginBtn = document.getElementById('btn-login-toggle');
  loginBtn.innerHTML = '<i class="fa-solid fa-right-from-bracket mr-1"></i> Logout';
  loginBtn.className = "bg-red-600 hover:bg-red-700 text-white text-xs px-4 py-2 rounded font-semibold transition shadow";
  loginBtn.setAttribute('onclick', 'handleLogout()');

  document.getElementById('login-section').classList.add('hidden');
  document.getElementById('dashboard-section').classList.remove('hidden');
  document.getElementById('form-login').reset();
  document.getElementById('nav-reports').classList.remove('hidden');

  enterDashboard(role);
}

function handleLogout() {
  currentRole = null;
  localStorage.removeItem('bukcms_role');

  const roleBadge = document.getElementById('role-badge');
  roleBadge.classList.remove('flex');
  roleBadge.classList.add('hidden');

  const loginBtn = document.getElementById('btn-login-toggle');
  loginBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket mr-1"></i> Staff Login';
  loginBtn.className = "bg-blue-500 hover:bg-blue-600 text-white text-xs px-4 py-2 rounded font-semibold transition shadow";
  loginBtn.setAttribute('onclick', "showSection('login-section')");
  document.getElementById('nav-reports').classList.add('hidden');

  showSection('view-home');
  document.getElementById('form-login').reset();
}


// Opens the correct panel and draws its first data. This is the "router" for roles.

function enterDashboard(role) {
  // Open only the panel assigned to this staff role.
  showRolePanel(role);

  if (role === "Records Officer") renderQueue();
  if (role === "Triage Nurse") renderNurseQueue();
  if (role === "Doctor") renderDoctorQueue();

  if (role === "Diagnostics") renderDiagnostics();

  if (role === "Pharmacist") showPharmTab("rx");
}

// RECORDS OFFICER: look up, auto-fill, register, queue
// corrections

function lookupStudent() {
  const query = document.getElementById('search-matric').value.trim();
  const msg = document.getElementById('reg-message');
  if (!query) {
    msg.textContent = "Please enter a Matric Number or Clinic Number.";
    msg.className = "text-xs mb-3 text-red-600";
    return;
  }

  const nameBox = document.getElementById('reg-fullname');
  const deptBox = document.getElementById('reg-department');
  const genderBox = document.getElementById('reg-gender');
  const phoneBox = document.getElementById('reg-phone');
  const dobBox = document.getElementById('reg-dob');
  const gradBox = document.getElementById('reg-grad-year');
  const kinBox = document.getElementById('reg-kin');

  // 1. check if it's Returning Patient (in clinic database)
  let existingPatient = null;
  if (query.toUpperCase().startsWith("BUK-")) {
    existingPatient = getPatientByClinic(query);
  } else {
    existingPatient = getPatientByMatric(query);
  }

  if (existingPatient) {
    // if it's Returning student
    nameBox.value = existingPatient.name || "";
    deptBox.value = existingPatient.department || "";
    genderBox.value = existingPatient.sex || "Male";
    if (phoneBox) phoneBox.value = existingPatient.phone || "";
    if (dobBox) dobBox.value = existingPatient.dob || "";
    if (gradBox) gradBox.value = existingPatient.gradYear || "";
    if (kinBox) kinBox.value = existingPatient.kin || "";

    const age = calculateAge(existingPatient.dob);
    msg.textContent = `Returning Patient found! Clinic No: ${existingPatient.clinicNumber} ${age ? `(Age: ${age} yrs)` : ''}. Ready for queue.`;
    msg.className = "text-xs mb-3 text-blue-700 font-semibold";
    foundStudent = existingPatient;
    return;
  }

  // 2. if it's new student (from BUK Registry)
  foundStudent = findStudent(query);

  if (foundStudent) {
    nameBox.value = foundStudent.name || "";
    deptBox.value = foundStudent.department || "";
    genderBox.value = foundStudent.sex || "Male";

    //  AUTO-FILL from REGISTRY
    if (phoneBox) phoneBox.value = foundStudent.phone || "";
    if (dobBox) dobBox.value = foundStudent.dob || "";
    if (gradBox) gradBox.value = foundStudent.gradYear || "";
    if (kinBox) kinBox.value = ""; // Next of kin za a bar shi a wani fili saboda shi daban yake

    msg.textContent = "New Student found in BUK registry. Auto-filled record details. Please upload required documents.";
    msg.className = "text-xs mb-3 text-blue-700 font-semibold";
  } else {
    // if it's empty
    nameBox.value = "";
    deptBox.value = "";
    if (phoneBox) phoneBox.value = "";
    if (dobBox) dobBox.value = "";
    if (gradBox) gradBox.value = "";
    if (kinBox) kinBox.value = "";

    msg.textContent = "No record found with that Clinic/Matric number. Check and try again.";
    msg.className = "text-xs mb-3 text-red-600";
  }
}

// // SUMMITED BTN
// function completeRegistration() {
//   const msg = document.getElementById('reg-message');
//   if (!foundStudent) { msg.textContent = "Look up a student before registering."; msg.className = "text-xs mb-3 text-red-600"; return; }

//   const extra = {
//     phone: document.getElementById('reg-phone').value,
//     sex: document.getElementById('reg-gender').value,
//     dob: document.getElementById('reg-dob').value,
//     gradYear: document.getElementById('reg-grad-year').value,
//     kin: document.getElementById('reg-kin').value,
//   };
//   const patient = registerPatient(foundStudent, extra);
//   addToQueue(patient, document.getElementById('reg-priority').value);

//   msg.textContent = "Registered. Clinic number " + patient.clinicNumber + ". Sent to the Nurse queue.";
//   msg.className = "text-xs mb-3 text-blue-700 font-semibold";

//   // clear the form for the next patient
//   ["search-matric", "reg-phone", "reg-dob", "reg-grad-year", "reg-kin"].forEach((id) => document.getElementById(id).value = "");
//   document.getElementById('reg-fullname').value = "";
//   document.getElementById('reg-department').value = "";
//   foundStudent = null;

//   renderQueue();
// }

// new and secure complete registration
function completeRegistration() {
  const msg = document.getElementById('reg-message');
  if (!foundStudent) {
    msg.textContent = "Please look up a student first using their Matric or Clinic number.";
    msg.className = "text-xs mb-3 text-red-600";
    return;
  }

  //   1. Get the upload inputs ONCE, here at the top
  const passportInput = document.getElementById('reg-passport');
  const admissionInput = document.getElementById('reg-admission');
  const medicalInput = document.getElementById('reg-medical');
  const serviceInput = document.getElementById('reg-service');

  // 2. Get the form values
  // collecting info from form
  const phone = document.getElementById('reg-phone').value.trim();
  const dob = document.getElementById('reg-dob').value.trim();
  const gradYear = document.getElementById('reg-grad-year').value.trim();
  const kin = document.getElementById('reg-kin').value.trim();

  // 3. Is this a returning patient?(Returning Patient)
  const isExistingPatient = getPatientByMatric(foundStudent.matric) || (foundStudent.clinicNumber && getPatientByClinic(foundStudent.clinicNumber));


  // if is new patient must complete fill the info and UPLOADS
  if (!isExistingPatient) {

    if (!phone || !dob || !gradYear || !kin) {
      msg.textContent = "Error: New patients must fill out Phone, DOB, Graduation Year, and Next of Kin!";
      msg.className = "text-xs mb-3 text-red-600 font-semibold";
      return;
    }

    if (!passportInput || !passportInput.files[0] ||
      !admissionInput || !admissionInput.files[0] ||
      !medicalInput || !medicalInput.files[0] ||
      !serviceInput || !serviceInput.files[0]) {
      msg.textContent = "Error: All required documents (Passport, Admission Letter, Medical Cert, Service Form) must be uploaded!";
      msg.className = "text-xs mb-3 text-red-600 font-semibold";
      return;
    }
  }

  // if everything is complete, we prepare extra data

  // 5. Build the extra data (keep old file names for a returning patient)

  const extra = {
    phone,
    sex: document.getElementById('reg-gender').value,
    dob,
    gradYear,
    kin,
    passportDoc: passportInput && passportInput.files[0] ? passportInput.files[0].name : (isExistingPatient ? foundStudent.passportDoc : "Not uploaded"),
    admissionDoc: admissionInput && admissionInput.files[0] ? admissionInput.files[0].name : (isExistingPatient ? foundStudent.admissionDoc : "Not uploaded"),
    medicalDoc: medicalInput && medicalInput.files[0] ? medicalInput.files[0].name : (isExistingPatient ? foundStudent.medicalDoc : "Not uploaded"),
    serviceDoc: serviceInput && serviceInput.files[0] ? serviceInput.files[0].name : (isExistingPatient ? foundStudent.serviceDoc : "Not uploaded"),
  };

  const patient = registerPatient(foundStudent, extra);
  addToQueue(patient, document.getElementById('reg-priority').value);

  msg.textContent = "Registration successful! Clinic Number: " + patient.clinicNumber + ". Sent to Nurse queue.";
  msg.className = "text-xs mb-3 text-blue-700 font-semibold";

  //   // 6. Clear the form for the next patient
  ["search-matric", "reg-phone", "reg-dob", "reg-grad-year", "reg-kin"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  ["reg-passport", "reg-admission", "reg-medical", "reg-service"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  document.getElementById('reg-fullname').value = "";
  document.getElementById('reg-department').value = "";
  foundStudent = null;

  renderQueue();
}


function renderQueue() {
  // Fetch visits that have the status "Waiting" from the database
  const rows = getVisitsByStatus("Waiting");

  // Target the table body element (Make sure this ID matches your HTML: 'queue-body' or 'queue-list')
  const body = document.getElementById('queue-list');
  if (!body) return;

  // If no patients are waiting, display an empty state message
  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="6" class="text-center text-slate-400 py-6 text-xs">No patients in the queue yet.</td></tr>';
    return;
  }

  // Map and render each patient row into the queue table
  body.innerHTML = rows.map((v, i) => `
    <tr class="border-b border-slate-100">
      <td class="py-2">${i + 1}</td>
      <td>${v.clinicNumber}</td>
      <td>${v.name}</td>
      <td>${v.sex || "-"}</td>
      <td>${v.age ? v.age + " " : "-"}</td>
      <td>${priorityTag(v.priority)}</td>
    </tr>`).join("");
}

function renderReports() {
  const c = dashboardCounts();
  const drugs = getDrugs();
  const lowStock = drugs.filter((d) => Number(d.dispensary) < 10).length;
  const expiringSoon = drugs.filter((d) => getExpiryInfo(d.expiry).expiringSoon).length;
  const expired = drugs.filter((d) => getExpiryInfo(d.expiry).expired).length;
  const items = [
    ["Registered patients", c.patients], ["Visits today", c.visits],
    ["Waiting", c.waiting], ["Completed", c.done],
    ["With doctor", c.triaged], ["At Diagnostics", c.atLab],
    ["Low-stock drugs", lowStock], ["Expiring soon", expiringSoon], ["Expired drugs", expired],
  ];
  document.getElementById('reports-grid').innerHTML = items.map(([l, v]) => `
    <div class="bg-white border border-slate-200 shadow rounded-xl p-4">
      <p class="text-slate-500 text-xs">${l}</p><p class="text-3xl font-bold text-slate-800">${v}</p>
    </div>`).join("");
}

function priorityTag(p) {
  return p === "Emergency"
    ? '<span class="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">Emergency</span>'
    : '<span class="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">Normal</span>';
}

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


// DOCTOR


function renderDoctorQueue() {
  // Get patients ready for consultation.
  const rows = getVisitsByStatus("Triaged");

  // Get patients marked absent by the doctor.
  const absentRows = getVisitsByStatus("Doctor Absent");

  // Display patients waiting for consultation.
  document.getElementById('doctor-queue').innerHTML = rows.length
    ? rows.map((v) => `
          <tr class="border-b border-slate-100">
            
        <td class="py-2">
          <div class="font-medium">${v.name}</div>
          ${v.returnedFromDiagnostics ? `
            <span class="inline-block mt-1 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-md">
              Returned from Diagnostics
            </span>
          ` : ""}
        </td>

            <td>${priorityTag(v.priority)}</td>
            <td class="whitespace-nowrap">
              <button onclick="openConsultation('${v.id}')"
                class="bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg">
                Open
              </button>
              <button onclick="markDoctorAbsent('${v.id}')"
                class="bg-amber-100 text-amber-800 text-xs px-3 py-1.5 rounded-lg ml-1">
                Absent
              </button>
            </td>
          </tr>
        `).join("")
    : '<tr><td colspan="3" class="text-center text-slate-400 py-6 text-xs">No one is ready for consultation.</td></tr>';

  // Display patients marked absent by the doctor.
  document.getElementById('doctor-absent-queue').innerHTML = absentRows.length
    ? absentRows.map((v) => `
          <tr class="border-b border-slate-100">
            <td class="py-2">${v.name}</td>
            <td>
              <span class="text-blue-700 text-xs font-semibold">Absent</span>
            </td>
            <td>
              <button onclick="openConsultation('${v.id}')"
                class="bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg">
                Call Again
              </button>
            </td>
          </tr>
        `).join("")
    : '<tr><td colspan="3" class="text-center text-slate-400 py-6 text-xs">No absent patients.</td></tr>';
}


function markDoctorAbsent(id) {
  // Mark this patient as absent from the doctor's queue.
  updateVisit(id, { status: "Doctor Absent" });

  // Clear the consultation form if it belongs to this patient.
  if (openVisitId === id) {
    openVisitId = null;
    document.getElementById('doctor-form').innerHTML =
      '<p class="text-slate-400 text-sm">Patient marked absent. Call them again when they return.</p>';
  }

  // Refresh both doctor queues.
  renderDoctorQueue();
}




function openConsultation(id) {
  const v = getVisitById(id);

  // Return the patient to the active doctor queue if they were absent.

  if (v && v.status === "Doctor Absent") {
    updateVisit(id, { status: "Triaged" });

    // Refresh the queues immediately after changing the status.
    renderDoctorQueue();
  }


  openVisitId = id;

  const p = getPatientByClinic(v.clinicNumber);
  const vt = v.vitals || {};
  const patientAge = calculateAge(p.dob); // Lissafin age daga p.dob
  const drugOptions = getDrugs().map((d) => `<option>${d.name}</option>`).join("");

  document.getElementById('doctor-form').innerHTML = `
    
    <!-- Patient Information Card -->
    <div class="bg-white border border-blue-100 rounded-xl p-3 mb-3 shadow-sm">
      <div class="flex items-start gap-3">
        <div class="w-11 h-11 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
          <span class="font-bold text-lg">${v.name.charAt(0).toUpperCase()}</span>
        </div>

        <div class="flex-1 min-w-0">
          <h4 class="font-bold text-slate-800 text-base">
            ${v.name}
          </h4>
          
        ${v.returnedFromDiagnostics ? `
          <span class="inline-block mt-1 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-md">
            Returned from Diagnostics
          </span>
        ` : ""}

          <p class="text-xs text-slate-500 mt-1">
            ${p.clinicNumber} · ${p.department}
          </p>
          <div class="flex flex-wrap gap-2 mt-2">
            <span class="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-md">
              ${p.sex || "Sex not recorded"}
            </span>
            <span class="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded-md">
              ${patientAge ? patientAge + " years" : "Age unavailable"}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Vital Signs -->
    <div class="border border-slate-200 rounded-xl p-3 mb-3">
      <div class="flex items-center gap-2 mb-3">
        <span class="text-blue-700">♥</span>
        <h5 class="font-bold text-slate-800 text-sm">Patient Vital Signs</h5>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <div class="bg-blue-50 rounded-lg p-2">
          <p class="text-xs text-slate-500">Blood Pressure</p>
          <p class="font-bold text-blue-800 text-sm mt-1">${vt.bp || "—"}</p>
          <p class="text-xs text-slate-400">mmHg</p>
        </div>

        <div class="bg-slate-50 rounded-lg p-2">
          <p class="text-xs text-slate-500">Temperature</p>
          <p class="font-bold text-slate-800 text-sm mt-1">${vt.temp || "—"}</p>
          <p class="text-xs text-slate-400">°C</p>
        </div>

        <div class="bg-slate-50 rounded-lg p-2">
          <p class="text-xs text-slate-500">Respiration</p>
          <p class="font-bold text-slate-800 text-sm mt-1">${vt.resp || "—"}</p>
          <p class="text-xs text-slate-400">breaths/min</p>
        </div>

        <div class="bg-slate-50 rounded-lg p-2">
          <p class="text-xs text-slate-500">Oxygen Level</p>
          <p class="font-bold text-slate-800 text-sm mt-1">${vt.ox || "—"}</p>
          <p class="text-xs text-slate-400">%</p>
        </div>

        <div class="bg-slate-50 rounded-lg p-2">
          <p class="text-xs text-slate-500">Blood Sugar</p>
          <p class="font-bold text-slate-800 text-sm mt-1">${vt.sugar || "—"}</p>
          <p class="text-xs text-slate-400">mmol/L</p>
        </div>
      </div>
    </div>

    <!-- Drug Allergy Alert -->
    ${p.allergy ? `
      <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
        <p class="text-amber-800 font-bold text-sm">⚠ Drug Allergy / Reaction</p>
        <p class="text-blue-700 text-sm mt-1">${p.allergy}</p>
      </div>
    ` : ""}
 ${v.lab && v.lab.result ? `<p class="bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm my-2"><b>${v.lab.test} result:</b> ${v.lab.result}</p>` : ""}
    <input id="d-complaint" value="${v.complaint || ''}" placeholder="Complaint and symptoms" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-2">
    <input id="d-diagnosis" value="${v.diagnosis || ''}" placeholder="Diagnosis" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-2">
    <input id="d-allergy" placeholder="Flag a drug reaction (optional)" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3">
    ${p.sex === "Female" ? '<label class="text-xs flex items-center gap-2 mb-3"><input type="checkbox" id="d-pregnancy"> Pregnancy checked (female patients 18–40)</label>' : ""}
    <div class="flex gap-2 mb-3">
      <select id="d-labtype" class="border border-slate-300 rounded-lg px-2 py-2 text-sm"><option>Laboratory test</option><option>X-ray / scan</option></select>
      <button onclick="requestLab()" class="bg-slate-200 text-slate-700 text-sm px-3 py-2 rounded-lg whitespace-nowrap">Send request</button>
    </div>
   <!-- Prescription Section -->
<div class="border border-slate-200 rounded-xl p-3 mt-4">
  <h5 class="font-bold text-slate-800 text-sm mb-1">
    Prescription
  </h5>

  <p class="text-xs text-slate-500 mb-3">
    Add each medicine or medical supply separately.
  </p>

  <div id="prescription-items" class="space-y-3"></div>

  <button
    type="button"
    onclick="addPrescriptionItem()"
    class="w-full border border-blue-300 text-blue-700 text-sm px-3 py-2 rounded-lg font-semibold mt-3">
    + Add Another Item
  </button>

  <button
    type="button"
    onclick="prescribe()"
    class="w-full bg-blue-700 hover:bg-blue-800 text-white text-sm px-4 py-2 rounded-lg font-semibold mt-3">
    Send Prescription to Pharmacy
  </button>
</div>`;

  addPrescriptionItem();
}


let prescriptionItemCount = 0;


function addPrescriptionItem() {
  prescriptionItemCount++;

  const container = document.getElementById("prescription-items");
  if (!container) return;

  const itemId = prescriptionItemCount;

  const drugOptions = getDrugs()
    .map((d) => `<option value="${d.name}">${d.name}</option>`)
    .join("");

  // Demo options until we create the separate supplies inventory.
  const supplyOptions = `
    <option value="Syringe">
    <option value="Needle">
    <option value="Gauze">
    <option value="IV Giving Set">
    <option value="IV Cannula">
  `;

  const item = document.createElement("div");
  item.id = `prescription-item-${itemId}`;
  item.className = "border border-slate-200 rounded-lg p-3";

  item.innerHTML = `
    <div class="flex items-center justify-between mb-3">
      <h6 class="font-semibold text-slate-700 text-sm">
        Prescription Item ${itemId}
      </h6>

      <button
        type="button"
        onclick="removePrescriptionItem(${itemId})"
        class="text-red-600 text-xs font-medium">
        Remove
      </button>
    </div>

    <label class="block text-xs text-slate-600 mb-1">
      Item Type
    </label>

    <select
      class="rx-type w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3">
      <option value="Medicine">Medicine</option>
      <option value="Medical Supply">Medical Supply</option>
    </select>

    <!-- Medicine input -->
    <div class="rx-medicine-field">
      <label class="block text-xs text-slate-600 mb-1">
        Medicine Name
      </label>

      <input
        class="rx-medicine-name w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3"
        list="rx-drug-options-${itemId}"
        placeholder="Select or type medicine"
        autocomplete="off">

      <datalist id="rx-drug-options-${itemId}">
        ${drugOptions}
      </datalist>
    </div>

    <!-- Medical supply input -->
    <div class="rx-supply-field hidden">
      <label class="block text-xs text-slate-600 mb-1">
        Medical Supply Name
      </label>

      <input
        class="rx-supply-name w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3"
        list="rx-supply-options-${itemId}"
        placeholder="Select or type medical supply"
        autocomplete="off">

      <datalist id="rx-supply-options-${itemId}">
        ${supplyOptions}
      </datalist>
    </div>

    <label class="block text-xs text-slate-600 mb-1">
      Dosage / Instructions
    </label>

    <input
      class="rx-dose w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3"
      placeholder="Enter instructions if applicable">

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-xs text-slate-600 mb-1">
          Frequency
        </label>

        <input
          class="rx-frequency w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          placeholder="If applicable">
      </div>

      <div>
        <label class="block text-xs text-slate-600 mb-1">
          Duration
        </label>

        <input
          class="rx-duration w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          placeholder="If applicable">
      </div>
    </div>

    <label class="block text-xs text-slate-600 mt-3 mb-1">
      Quantity
    </label>

    <input
      type="number"
      min="1"
      step="1"
      class="rx-quantity w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
      placeholder="Enter quantity">
  `;

  container.appendChild(item);

  // Get this item's type selector and both input sections.
  const typeSelect = item.querySelector(".rx-type");
  const medicineField = item.querySelector(".rx-medicine-field");
  const supplyField = item.querySelector(".rx-supply-field");

  // Show the correct input without deleting either value.
  typeSelect.addEventListener("change", () => {
    const isMedicine = typeSelect.value === "Medicine";

    medicineField.classList.toggle("hidden", !isMedicine);
    supplyField.classList.toggle("hidden", isMedicine);
  });
}


function removePrescriptionItem(itemId) {
  const item = document.getElementById(`prescription-item-${itemId}`);

  if (item) {
    item.remove();
  }
}

function saveDoctorNotes() {
  const v = getVisitById(openVisitId);
  updateVisit(openVisitId, { complaint: document.getElementById('d-complaint').value, diagnosis: document.getElementById('d-diagnosis').value });
  const allergy = document.getElementById('d-allergy').value.trim();
  if (allergy) updatePatient(v.clinicNumber, { allergy });
}

function requestLab() {
  saveDoctorNotes();
  updateVisit(openVisitId, {
    status: "At lab",
    returnedFromDiagnostics: false,
    lab: { test: document.getElementById('d-labtype').value, result: null }
  });

  openVisitId = null;
  document.getElementById('doctor-form').innerHTML = '<p class="text-blue-700 text-sm font-semibold">Request sent. The result will come back to you here.</p>';
  renderDoctorQueue();
}

function prescribe() {
  const v = getVisitById(openVisitId);

  if (!v) {
    alert("Patient visit not found.");
    return;
  }

  const container = document.getElementById("prescription-items");

  if (!container) {
    alert("Prescription form not found.");
    return;
  }

  const rows = container.querySelectorAll(
    '[id^="prescription-item-"]'
  );

  if (rows.length === 0) {
    alert("Please add at least one prescription item.");
    return;
  }

  const newItems = [];

  for (const row of rows) {
    const type = row.querySelector(".rx-type").value;

    const nameInput = type === "Medicine"
      ? row.querySelector(".rx-medicine-name")
      : row.querySelector(".rx-supply-name");

    const name = nameInput.value.trim();
    const dose = row.querySelector(".rx-dose").value.trim();
    const frequency = row.querySelector(".rx-frequency").value.trim();
    const duration = row.querySelector(".rx-duration").value.trim();
    const quantityInput = row.querySelector(".rx-quantity").value;
    const quantity = Number(quantityInput);

    if (!name) {
      alert("Please enter the name for every item.");
      return;
    }

    if (type === "Medicine" && !dose) {
      alert("Please enter dosage for " + name);
      return;
    }

    if (
      quantityInput === "" ||
      !Number.isInteger(quantity) ||
      quantity < 1
    ) {
      alert("Enter a valid quantity for " + name);
      return;
    }

    newItems.push({
      drug: name,
      type: type,
      dose: dose || "Not applicable",
      frequency: frequency,
      duration: duration,
      quantity: quantity,
      dispenseStatus: "Pending"
    });
  }

  // Save the consultation notes.
  saveDoctorNotes();

  // Keep existing prescription items.
  const existingItems = Array.isArray(v.rx) ? v.rx : [];
  const allItems = [...existingItems, ...newItems];

  updateVisit(openVisitId, {
    status: "At pharmacy",
    rx: allItems,
    returnedFromDiagnostics: false
  });

  openVisitId = null;

  document.getElementById("doctor-form").innerHTML = `
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <p class="text-blue-800 font-semibold">
        Prescription sent to the pharmacy.
      </p>
      <p class="text-blue-700 text-sm mt-1">
        ${newItems.length} item(s) added to the prescription.
      </p>
    </div>
  `;

  renderDoctorQueue();
}



// PHARMACIST / LAB OFFICER


let pharmTab = "rx";

function showPharmTab(tab) {
  pharmTab = tab;

  // List all three pharmacy tabs.
  ["rx", "stock", "supplies"].forEach((t) => {
    const btn = document.getElementById("tab-" + t);

    // Skip a button if it does not exist in the HTML.
    if (!btn) return;

    // Highlight the active tab.
    btn.className = t === tab
      ? "bg-blue-700 text-white text-sm px-4 py-2 rounded-lg font-medium"
      : "bg-white border border-slate-300 text-slate-700 text-sm px-4 py-2 rounded-lg font-medium";
  });

  // Refresh the table for the selected tab.
  renderPharmacy();
}


// correction
// -----------------
// calculate how many calender days remain before expiry.
function getExpiryInfo(expiryValue) {
  // Check whether an expiry date was privided.
  if (!expiryValue) {
    return {
      daysLeft: null,
      expired: false,
      expiringSoon: false,
      needsCheck: true
    };
  }

  //  set today's date to midnight to compare calender days.
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Interpret the expiry date as a local calender date.
  const expiryDate = new Date(`${expiryValue}T00:00:00`);

  // Handle a date that javaScript cannot read.
  if (Number.isNaN(expiryDate.getTime())) {
    return {
      daysLeft: null,
      expired: false,
      expiringSoon: false,
      needsCheck: true
    };
  }

  // Convert the difference from milliseconds into days
  const daysLeft = Math.round(
    (expiryDate.getTime() - today.getTime()) / 864e5
  );

  return {
    daysLeft,
    expired: daysLeft < 0,
    expiringSoon: daysLeft >= 0 && daysLeft <= 90,
    needsCheck: false
  };
}

function renderPharmacy() {
  const head = document.getElementById('pharm-head');
  const body = document.getElementById('pharm-body');


  if (pharmTab === "rx") {
    const rows = getVisitsByStatus("At pharmacy");

    // Add the new columns to the Pharmacy table.
    head.innerHTML =
      "<th class='py-2'>Name</th>" +
      "<th>Sex</th>" +
      "<th>Age</th>" +
      "<th>Drug</th>" +
      "<th>Dosage</th>" +
      "<th></th>";

    body.innerHTML = rows.length ? rows.map((v) => {
      // Get the latest prescription for this visit.
      const r = v.rx[v.rx.length - 1];

      return `
      <tr class="border-b border-slate-100">
        <td class="py-2">${v.name}</td>
        <td>${v.sex || "-"}</td>
        <td>${v.age !== "" && v.age != null ? v.age : "-"}</td>
        <td>${r ? r.drug : "-"}</td>
        <td>${r ? r.dose : "-"}</td>
        <td>
          <button
            onclick="dispense('${v.id}')"
            class="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg">
            Dispense
          </button>
        </td>
      </tr>`;
    }).join("") :
      "<tr><td colspan='6' class='text-center text-slate-400 py-6 text-xs'>No prescriptions waiting.</td></tr>";
  }


  if (pharmTab === "stock") {
    const drugs = getDrugs();

    head.innerHTML =
      "<th class='py-2'>Drug</th><th>Main store</th><th>Active store</th><th>Dispensary</th><th>Expiry</th><th>Alert</th>";

    body.innerHTML = drugs.map((d) => {
      // Check stock quantity.
      const low = Number(d.dispensary) < 10;

      // Get the expiry information using our helper function.
      const expiryInfo = getExpiryInfo(d.expiry);

      return `<tr class="border-b border-slate-100">
        <td class="py-2">${d.name}</td>
        <td>${d.main}</td>
        <td>${d.active}</td>
        <td>${d.dispensary}</td>
        <td>${d.expiry || "Not recorded"}</td>
        <td>
          ${expiryInfo.expired
          ? '<span class="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full mr-1">Expired</span>'
          : ""}

          ${expiryInfo.expiringSoon
          ? '<span class="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full mr-1">Expiring soon</span>'
          : ""}

          ${expiryInfo.needsCheck
          ? '<span class="bg-slate-200 text-slate-700 text-xs px-2 py-0.5 rounded-full mr-1">Check expiry</span>'
          : ""}

          ${low
          ? '<span class="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full">Low stock</span>'
          : ""}
        </td>
      </tr>`;
    }).join("");
  }
}

// Diagnosis panel

function renderDiagnostics() {
  const head = document.getElementById("diagnostics-head");
  const body = document.getElementById("diagnostics-body");

  // Get patients waiting for laboratory tests.
  const rows = getVisitsByStatus("At lab");

  head.innerHTML =
    "<th class='py-2'>Patient Name</th>" +
    "<th>Requested Test</th>" +
    "<th>Enter Result</th>" +
    "<th>Action</th>";

  body.innerHTML = rows.length
    ? rows.map((v) => `
        <tr class="border-b border-slate-100">
          <td class="py-2">${v.name}</td>
          <td>${v.lab ? v.lab.test : "-"}</td>
          <td>
            <input
              id="result-${v.id}"
              class="border border-slate-300 rounded-lg px-2 py-1 text-sm"
              placeholder="Enter result"
            >
          </td>
          <td>
            <button
              onclick="sendLabResult('${v.id}')"
              class="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg">
              Send to Doctor
            </button>
          </td>
        </tr>
      `).join("")
    : "<tr><td colspan='4' class='text-center text-slate-400 py-6 text-xs'>No lab requests waiting.</td></tr>";
}



function sendLabResult(id) {
  const result = document.getElementById('result-' + id).value.trim();

  // A result must be entered before sending it to the doctor.
  if (!result) {
    alert("Please enter the diagnostic result first.");
    return;
  }

  const v = getVisitById(id);
  if (!v) {
    alert("Patient visit not found.");
    return;
  }

  // Send the patient back to the doctor and save the result.
  updateVisit(id, {
    status: "Triaged",
    returnedFromDiagnostics: true,
    lab: { ...v.lab, result }
  });

  // Refresh both relevant panels.
  renderDiagnostics();
  renderDoctorQueue();
}



// Resume session on refresh (nice to have, not required)

window.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('bukcms_role');
  if (saved) {
    currentRole = saved;
    document.getElementById('current-role-title').innerText = saved;
    document.getElementById('role-badge').classList.remove('hidden');
    document.getElementById('role-badge').classList.add('flex');
    const loginBtn = document.getElementById('btn-login-toggle');
    loginBtn.innerHTML = '<i class="fa-solid fa-right-from-bracket mr-1"></i> Logout';
    loginBtn.className = "bg-red-600 hover:bg-red-700 text-white text-xs px-4 py-2 rounded font-semibold transition shadow";
    loginBtn.setAttribute('onclick', 'handleLogout()');
    document.getElementById('nav-reports').classList.remove('hidden');
    showSection('dashboard-section');
    enterDashboard(saved);
  }
});
