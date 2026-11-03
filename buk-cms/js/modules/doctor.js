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
