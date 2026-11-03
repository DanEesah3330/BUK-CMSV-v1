
function getApprovedClinicRequest(query) {
  const requests = JSON.parse(
    localStorage.getItem("bukcms_clinic_requests") || "[]"
  );

  const searchValue = query.trim().toLowerCase();

  return requests.find(function (request) {
    const student = request.studentInformation || {};

    return (
      request.status === "Approved" &&
      (
        (student.regNo || "").toLowerCase() === searchValue ||
        (request.clinicNumber || "").toLowerCase() === searchValue
      )
    );
  });
}




function lookupStudent() {
  const query = document.getElementById("search-matric").value.trim();
  const msg = document.getElementById("reg-message");

  if (!query) {
    msg.textContent = "Please enter a Matric Number or Clinic Number.";
    msg.className = "text-xs mb-3 text-red-600";
    return;
  }

  const nameBox = document.getElementById("reg-fullname");
  const deptBox = document.getElementById("reg-department");
  const genderBox = document.getElementById("reg-gender");
  const phoneBox = document.getElementById("reg-phone");
  const dobBox = document.getElementById("reg-dob");
  const gradBox = document.getElementById("reg-grad-year");
  const kinBox = document.getElementById("reg-kin");

  // 1. Check for a returning patient
  let existingPatient = null;

  if (query.toUpperCase().startsWith("BUK-")) {
    existingPatient = getPatientByClinic(query);
  } else {
    existingPatient = getPatientByMatric(query);
  }

  if (existingPatient) {
    nameBox.value = existingPatient.name || "";
    deptBox.value = existingPatient.department || "";
    genderBox.value = existingPatient.sex || "Male";

    if (phoneBox) phoneBox.value = existingPatient.phone || "";
    if (dobBox) dobBox.value = existingPatient.dob || "";
    if (gradBox) gradBox.value = existingPatient.gradYear || "";
    if (kinBox) kinBox.value = existingPatient.kin || "";

    const age = calculateAge(existingPatient.dob);

    msg.textContent = `Returning Patient found! Clinic No: ${existingPatient.clinicNumber} ${age ? `(Age: ${age} yrs)` : ""}. Ready for queue.`;
    msg.className = "text-xs mb-3 text-blue-700 font-semibold";

    foundStudent = existingPatient;
    return;
  }

  // 2. Check approved clinic registration requests
  const approvedRequest = getApprovedClinicRequest(query);

  if (approvedRequest) {
    const student = approvedRequest.studentInformation || {};
    const biodata = approvedRequest.patientBiodata || {};
    const kin = approvedRequest.healthServiceForm || {};

    // Prepare student information for patient registration
    foundStudent = {
      matric: student.regNo,
      name: student.fullName,
      department: student.department,
      sex: biodata.sex || "",
      clinicNumber: approvedRequest.clinicNumber,
      phone: biodata.phone || "",
      dob: biodata.dateOfBirth || "",
      gradYear: biodata.graduationYear || "",
      kin: biodata.nextOfKinPhone || kin.nextOfKinPhone || "",
      passportDoc: approvedRequest.documents?.passport || "Not uploaded",
      admissionDoc: approvedRequest.documents?.admissionLetter || "Not uploaded",
      medicalDoc: approvedRequest.documents?.medicalCertificate || "Not uploaded"
    };

    nameBox.value = foundStudent.name || "";
    deptBox.value = foundStudent.department || "";
    genderBox.value = foundStudent.sex || "Male";

    if (phoneBox) phoneBox.value = foundStudent.phone;
    if (dobBox) dobBox.value = foundStudent.dob;
    if (gradBox) gradBox.value = foundStudent.gradYear;
    if (kinBox) kinBox.value = foundStudent.kin;

    msg.textContent =
      "Approved clinic registration found! Clinic No: " +
      approvedRequest.clinicNumber +
      ". Information auto-filled. Ready for registration.";

    msg.className = "text-xs mb-3 text-green-700 font-semibold";
    return;
  }

  // 3. Check the simulated BUK student registry
  foundStudent = findStudent(query);

  if (foundStudent) {
    nameBox.value = foundStudent.name || "";
    deptBox.value = foundStudent.department || "";
    genderBox.value = foundStudent.sex || "Male";

    if (phoneBox) phoneBox.value = foundStudent.phone || "";
    if (dobBox) dobBox.value = foundStudent.dob || "";
    if (gradBox) gradBox.value = foundStudent.gradYear || "";
    if (kinBox) kinBox.value = "";

    msg.textContent =
      "New Student found in BUK registry. Auto-filled record details. Please upload required documents.";

    msg.className = "text-xs mb-3 text-blue-700 font-semibold";
  } else {
    nameBox.value = "";
    deptBox.value = "";
    genderBox.value = "";

    if (phoneBox) phoneBox.value = "";
    if (dobBox) dobBox.value = "";
    if (gradBox) gradBox.value = "";
    if (kinBox) kinBox.value = "";

    foundStudent = null;

    msg.textContent =
      "No approved registration or patient record found. Check the Matric/Clinic number.";

    msg.className = "text-xs mb-3 text-red-600";
  }
}


// new and secure complete registration

function completeRegistration() {
  const msg = document.getElementById("reg-message");

  if (!foundStudent) {
    msg.textContent =
      "Please look up a student first using their Matric or Clinic number.";
    msg.className = "text-xs mb-3 text-red-600";
    return;
  }

  // Get the document upload inputs.
  const passportInput = document.getElementById("reg-passport");
  const admissionInput = document.getElementById("reg-admission");
  const medicalInput = document.getElementById("reg-medical");
  const serviceInput = document.getElementById("reg-service");

  // Get the patient's information.
  const phone = document.getElementById("reg-phone").value.trim();
  const dob = document.getElementById("reg-dob").value.trim();
  const gradYear = document.getElementById("reg-grad-year").value.trim();
  const kin = document.getElementById("reg-kin").value.trim();

  // Check whether this student has an approved clinic request.
  const approvedRequest = getApprovedClinicRequest(foundStudent.matric);

  const isApprovedRequest = Boolean(approvedRequest);

  // Check whether the patient is already registered.
  const isExistingPatient =
    getPatientByMatric(foundStudent.matric) ||
    (foundStudent.clinicNumber &&
      getPatientByClinic(foundStudent.clinicNumber));

  // Validate information for new patients.
  if (!isExistingPatient) {
    if (!phone || !dob || !gradYear || !kin) {
      msg.textContent =
        "Error: Please fill in Phone, DOB, Graduation Year, and Next of Kin.";

      msg.className = "text-xs mb-3 text-red-600 font-semibold";
      return;
    }


  // Prepare the patient's additional information.
  const extra = {
    phone: phone || foundStudent.phone || "",
    sex: document.getElementById("reg-gender").value ||
      foundStudent.sex || "",
    dob: dob || foundStudent.dob || "",
    gradYear: gradYear || foundStudent.gradYear || "",
    kin: kin || foundStudent.kin || "",

    passportDoc:
  (passportInput && passportInput.files[0]
    ? passportInput.files[0].name
    : foundStudent.passportDoc || "Not uploaded"),

admissionDoc:
  (admissionInput && admissionInput.files[0]
    ? admissionInput.files[0].name
    : foundStudent.admissionDoc || "Not uploaded"),

medicalDoc:
  (medicalInput && medicalInput.files[0]
    ? medicalInput.files[0].name
    : foundStudent.medicalDoc || "Not uploaded"),

serviceDoc:
  (serviceInput && serviceInput.files[0]
    ? serviceInput.files[0].name
    : foundStudent.serviceDoc || "Not uploaded")
  };

  // Give priority to the clinic number assigned during approval.
  const studentToRegister = {
    ...foundStudent,

    clinicNumber:
      approvedRequest?.clinicNumber ||
      foundStudent.clinicNumber
  };

  // Register or update the patient.
  const patient = registerPatient(studentToRegister, extra);

  // Add the patient to the queue without duplicating an active visit.
  addToQueue(patient, document.getElementById("reg-priority").value);

  msg.textContent =
    "Registration successful! Clinic Number: " +
    patient.clinicNumber +
    ". Sent to Nurse queue.";

  msg.className = "text-xs mb-3 text-blue-700 font-semibold";

  // Clear the form after successful registration.
  [
    "search-matric",
    "reg-phone",
    "reg-dob",
    "reg-grad-year",
    "reg-kin"
  ].forEach(function (id) {
    const element = document.getElementById(id);
    if (element) element.value = "";
  });

  [
    "reg-passport",
    "reg-admission",
    "reg-medical",
    "reg-service"
  ].forEach(function (id) {
    const element = document.getElementById(id);
    if (element) element.value = "";
  });

  document.getElementById("reg-fullname").value = "";
  document.getElementById("reg-department").value = "";

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


function priorityTag(p) {
  return p === "Emergency"
    ? '<span class="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">Emergency</span>'
    : '<span class="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">Normal</span>';
}

// ==========================================
// CLINIC REGISTRATION REQUESTS
// ==========================================

// 1. Get all clinic registration requests
function getClinicRequests() {
  return JSON.parse(
    localStorage.getItem("bukcms_clinic_requests") || "[]"
  );
}


function renderClinicRequests() {
  const requests = getClinicRequests();

  const total = requests.length;
  const pending = requests.filter(r => r.status === "Pending").length;
  const approved = requests.filter(r => r.status === "Approved").length;
  const rejected = requests.filter(r => r.status === "Rejected").length;

  document.getElementById("clinic-total-requests").textContent = total;
  document.getElementById("clinic-pending-requests").textContent = pending;
  document.getElementById("clinic-approved-requests").textContent = approved;
  document.getElementById("clinic-rejected-requests").textContent = rejected;

  const table = document.getElementById("clinic-requests-list");
  if (!table) return;

  if (requests.length === 0) {
    table.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-6 text-slate-400">
          No clinic registration requests found.
        </td>
      </tr>
    `;
    return;
  }

  table.innerHTML = requests.map(request => {
    const student = request.studentInformation || {};

    const submittedDate = request.submittedAt
      ? new Date(request.submittedAt).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric"
        })
      : "-";

    let statusClass = "bg-orange-100 text-orange-700";

    if (request.status === "Approved") {
      statusClass = "bg-green-100 text-green-700";
    } else if (request.status === "Rejected") {
      statusClass = "bg-red-100 text-red-700";
    }

    return `
      <tr class="border-b border-slate-100 hover:bg-slate-50">
        <td class="px-4 py-3 text-sm font-medium text-slate-800">
          ${student.fullName || "-"}
        </td>

        <td class="px-4 py-3 text-sm text-slate-600">
          ${student.regNo || "-"}
        </td>

        <td class="px-4 py-3 text-sm text-slate-600">
          ${student.department || "-"}
        </td>

        <td class="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
          ${submittedDate}
        </td>

        <td class="px-4 py-3">
          <span class="inline-block px-3 py-1 rounded-full text-xs font-semibold ${statusClass}">
            ${request.status || "Pending"}
          </span>
        </td>

        <td class="px-4 py-3">
          <button
            type="button"
            onclick="viewClinicRequest(${Number(request.id)})"
            class="text-blue-600 hover:text-blue-800 font-semibold text-sm whitespace-nowrap">
            View Details
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

// 3. View a particular registration request
let selectedClinicRequestId = null;

function viewClinicRequest(id) {
  const requests = getClinicRequests();

  const request = requests.find(item => item.id === id);

  if (!request) {
    alert("Clinic registration request not found.");
    return;
  }

  selectedClinicRequestId = id;

  const student = request.studentInformation || {};
  const biodata = request.patientBiodata || {};
  const kin = request.healthServiceForm || {};
  const documents = request.documents || {};

  // Display student information
  document.getElementById("clinic-detail-student").innerHTML = `
    <p><strong>Full Name:</strong> ${student.fullName || "-"}</p>
    <p><strong>Matric Number:</strong> ${student.regNo || "-"}</p>
    <p><strong>Faculty:</strong> ${student.faculty || "-"}</p>
    <p><strong>Department:</strong> ${student.department || "-"}</p>
    <p><strong>Level:</strong> ${student.level || "-"}</p>
    <p><strong>Email:</strong> ${student.email || "-"}</p>
  `;

  // Display personal information
  document.getElementById("clinic-detail-biodata").innerHTML = `
    <p><strong>Graduation Year:</strong> ${biodata.graduationYear || "-"}</p>
    <p><strong>Phone:</strong> ${biodata.phone || "-"}</p>
    <p><strong>Sex:</strong> ${biodata.sex || "-"}</p>
    <p><strong>Date of Birth:</strong> ${biodata.dateOfBirth || "-"}</p>
    <p><strong>Next of Kin Phone:</strong> ${biodata.nextOfKinPhone || "-"}</p>
  `;

  // Display next of kin information
  document.getElementById("clinic-detail-kin").innerHTML = `
    <p><strong>Next of Kin Name:</strong> ${kin.nextOfKinName || "-"}</p>
    <p><strong>Relationship:</strong> ${kin.relationship || "-"}</p>
    <p><strong>Place of Origin:</strong> ${kin.placeOfOrigin || "-"}</p>
    <p><strong>Tribe:</strong> ${kin.tribe || "-"}</p>
    <p><strong>Religion:</strong> ${kin.religion || "-"}</p>
    <p><strong>Next of Kin Address:</strong> ${kin.nextOfKinAddress || "-"}</p>
    <p><strong>Occupation:</strong> ${kin.occupation || "-"}</p>
  `;

  // Display uploaded document names
  document.getElementById("clinic-detail-documents").innerHTML = `
    <p><strong>Admission Letter:</strong> ${documents.admissionLetter || "Not uploaded"}</p>
    <p><strong>Passport:</strong> ${documents.passport || "Not uploaded"}</p>
    <p><strong>Medical Certificate:</strong> ${documents.medicalCertificate || "Not uploaded"}</p>
  `;

  // Show the request details section
  document.getElementById("clinic-request-details").classList.remove("hidden");

  // Hide previous review messages
  document.getElementById("clinic-review-result").textContent = "";

  // Hide rejection form when opening another request
  document.getElementById("clinic-rejection-form").classList.add("hidden");
}

function closeClinicRequestDetails() {
  const details = document.getElementById("clinic-request-details");
  const rejectForm = document.getElementById("clinic-rejection-form");

  if (details) {
    details.classList.add("hidden");
  }

  if (rejectForm) {
    rejectForm.classList.add("hidden");
  }

  selectedClinicRequestId = null;
}

javascript
// ==========================================
// REJECT CLINIC REGISTRATION REQUEST
// ==========================================

// 1. Show the rejection reason form
function showClinicRejectForm() {
  if (selectedClinicRequestId === null) {
    alert("Please open a registration request first.");
    return;
  }

  const request = getClinicRequests().find(
    item => item.id === selectedClinicRequestId
  );

  if (!request) {
    alert("Registration request not found.");
    return;
  }

  if (request.status !== "Pending") {
    alert("Only pending requests can be rejected.");
    return;
  }

  document.getElementById("clinic-rejection-form").classList.remove("hidden");
  document.getElementById("clinic-rejection-reason").value = "";
}

// 2. Save the rejection and its reason
function rejectClinicRequest() {
  if (selectedClinicRequestId === null) {
    alert("Please select a registration request first.");
    return;
  }

  const reasonInput = document.getElementById("clinic-rejection-reason");
  const reason = reasonInput.value.trim();

  if (!reason) {
    alert("Please enter a reason for rejecting this request.");
    reasonInput.focus();
    return;
  }

  const requests = getClinicRequests();

  const requestIndex = requests.findIndex(
    item => item.id === selectedClinicRequestId
  );

  if (requestIndex === -1) {
    alert("Registration request not found.");
    return;
  }

  if (requests[requestIndex].status !== "Pending") {
    alert("Only pending requests can be rejected.");
    return;
  }

  requests[requestIndex].status = "Rejected";
  requests[requestIndex].rejectionReason = reason;
  requests[requestIndex].reviewedAt = new Date().toISOString();

  localStorage.setItem("bukcms_clinic_requests", JSON.stringify(requests));

  const result = document.getElementById("clinic-review-result");

  if (result) {
    result.textContent = "Registration request rejected successfully.";
    result.className = "mt-3 text-sm font-semibold text-red-600";
  }

  document.getElementById("clinic-rejection-form").classList.add("hidden");

  renderClinicRequests();

  alert("Request rejected successfully.");
}

// 3. Hide the rejection form
function hideClinicRejectForm() {
  const form = document.getElementById("clinic-rejection-form");

  if (form) {
    form.classList.add("hidden");
  }
}
}
