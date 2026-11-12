
// ======================================
// DIAGNOSTICS MODULE - SUPABASE VERSION
// ======================================

// Escape values before displaying database text in HTML.
function diagnosticsEscape(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value).replace(/[&<>"']/g, function (char) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char];
  });
}


// Render pending diagnostic requests from Supabase.
async function renderDiagnostics() {
  const head = document.getElementById("diagnostics-head");
  const body = document.getElementById("diagnostics-body");

  if (!head || !body) return;

  head.innerHTML =
    "<th class='py-2'>Patient Name</th>" +
    "<th>Clinic Number</th>" +
    "<th>Requested Test</th>" +
    "<th>Clinical Notes</th>" +
    "<th>Enter Result</th>" +
    "<th>Action</th>";

  body.innerHTML =
    "<tr><td colspan='6' class='text-center py-6'>Loading diagnostic requests...</td></tr>";

  const { data, error } = await supabaseClient
    .from("diagnostic_requests")
    .select(`
      id,
      visit_id,
      request_type,
      test_name,
      clinical_notes,
      status,
      created_at,
      visits (
        id,
        patients (
          full_name,
          clinic_number
        )
      )
    `)
    .in("status", ["Pending", "In Progress"])
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Diagnostics loading error:", error);
    body.innerHTML =
      "<tr><td colspan='6' class='text-center text-red-600 py-6'>Unable to load diagnostic requests.</td></tr>";
    return;
  }

  if (!data || data.length === 0) {
    body.innerHTML =
      "<tr><td colspan='6' class='text-center text-slate-400 py-6'>No diagnostic requests waiting.</td></tr>";
    return;
  }

  body.innerHTML = data.map(function (request) {
    const visit = request.visits;
    const patient = visit ? visit.patients : null;

    return `
      <tr class="border-b border-slate-100">
        <td class="py-3">${diagnosticsEscape(patient?.full_name)}</td>

        <td>${diagnosticsEscape(patient?.clinic_number)}</td>

        <td>
          <div class="font-semibold">${diagnosticsEscape(request.test_name)}</div>
          <div class="text-xs text-slate-500">${diagnosticsEscape(request.request_type)}</div>
        </td>

        <td>${diagnosticsEscape(request.clinical_notes)}</td>

        <td>
         <textarea
            id="result-${request.id}"
            rows="4"
            class="border border-slate-300 rounded-lg px-2 py-2 text-sm w-52"
            placeholder="Enter findings, measurements and observations..."
        ></textarea>
        </td>

        <td>
          <button
            onclick="sendLabResult('${request.id}', '${request.visit_id}')"
            class="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg">
            Send to Doctor
          </button>
        </td>
      </tr>
    `;
  }).join("");
}


// Save the diagnostic result and return the patient to Doctor.
async function sendLabResult(requestId, visitId) {
  const resultInput = document.getElementById("result-" + requestId);
  const result = resultInput ? resultInput.value.trim() : "";

  if (!result) {
    alert("Please enter the diagnostic result first.");
    return;
  }

  if (!confirm("Submit this result and return the patient to Doctor?")) {
    return;
  }

  // First, return the visit to the Doctor's queue.
  const { data: updatedVisit, error: visitError } = await supabaseClient
  .from("visits")
  .update({ status: "Triaged" })
  .eq("id", visitId)
  .eq("status", "At diagnostics")
  .select("id, status")
  .maybeSingle();

if (visitError || !updatedVisit) {
  console.error("Visit return error:", visitError);

  alert("Diagnostic result could not return the patient to Doctor. Please check permissions and visit status.");
  return;
}

  if (visitError) {
    console.error("Visit update error:", visitError);
    alert("Could not return patient to Doctor. Check the Diagnostics permission for visits.");
    return;
  }

  // Save the result in the diagnostic_requests table.
  const { error: requestError } = await supabaseClient
    .from("diagnostic_requests")
    .update({
      result: result,
      status: "Completed",
      completed_at: new Date().toISOString()
    })
    .eq("id", requestId);

  if (requestError) {
    console.error("Diagnostic result error:", requestError);
    alert("Patient was returned, but the diagnostic result could not be saved.");
    return;
  }

  alert("Diagnostic result saved successfully. Patient returned to Doctor.");

  await renderDiagnostics();

  if (typeof renderDoctorQueue === "function") {
    await renderDoctorQueue();
  }
}
