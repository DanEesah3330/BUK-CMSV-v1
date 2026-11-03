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
