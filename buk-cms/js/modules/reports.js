
// Reports is a VIEW, not a login role — any signed-in staff member can check it,
// then go back to whichever work panel matches the role they signed in with.
function viewReports() {
  ALL_PANEL_IDS.forEach((id) => document.getElementById(id).classList.add('hidden'));
  document.getElementById('panel-reports').classList.remove('hidden');
  renderReports();
}

function backFromReports() {
     showRolePanel(currentRole); 
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

javascript
// ==========================================
// APPROVE CLINIC REGISTRATION REQUEST


function approveClinicRequest() {
  // 1. Check whether a request is selected
  if (selectedClinicRequestId === null) {
    alert("Please open a registration request first.");
    return;
  }

  // 2. Get all clinic registration requests
  const requests = getClinicRequests();

  // 3. Find the selected request
  const requestIndex = requests.findIndex(function (item) {
    return item.id === selectedClinicRequestId;
  });

  if (requestIndex === -1) {
    alert("Registration request not found.");
    return;
  }

  const request = requests[requestIndex];

  // 4. Only pending requests can be approved
  if (request.status !== "Pending") {
    alert("This request has already been reviewed.");
    return;
  }

  // 5. Generate a unique clinic number
  const approvedRequests = requests.filter(function (item) {
    return item.clinicNumber;
  });

  let clinicNumber;
  let numberExists;

  do {
    clinicNumber = "BUK-CLN-" +
      String(approvedRequests.length + 1).padStart(4, "0");

    numberExists = requests.some(function (item) {
      return item.clinicNumber === clinicNumber;
    });

    if (numberExists) {
      approvedRequests.push({ clinicNumber: clinicNumber });
    }
  } while (numberExists);

  // 6. Update the request
  request.status = "Approved";
  request.clinicNumber = clinicNumber;
  request.reviewedAt = new Date().toISOString();
  request.rejectionReason = "";

  // 7. Save the updated requests
  localStorage.setItem(
    "bukcms_clinic_requests",
    JSON.stringify(requests)
  );

  // 8. Display success message
  const result = document.getElementById("clinic-review-result");

  if (result) {
    result.textContent =
      "Request approved successfully. Clinic Number: " + clinicNumber;

    result.className =
      "mt-3 text-sm font-semibold text-green-600";
  }

  // 9. Refresh the requests table and summary cards
  renderClinicRequests();

  alert(
    "Clinic registration approved successfully!\nClinic Number: " +
    clinicNumber
  );
}


