
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




// ==========================================
// LOOK UP REGISTERED PATIENT FROM SUPABASE
// ==========================================

// ==========================================
// LOOK UP PATIENT FROM SUPABASE
// ==========================================

async function lookupStudent() {

    const input = document.getElementById("search-matric");
    const enteredValue = input.value.trim().toUpperCase();

    const msg = document.getElementById("reg-message");

    const nameBox = document.getElementById("reg-fullname");
    const deptBox = document.getElementById("reg-department");
    const genderBox = document.getElementById("reg-gender");

    const phoneBox = document.getElementById("reg-phone");
    const dobBox = document.getElementById("reg-dob");
    const gradBox = document.getElementById("reg-grad-year");
    const kinBox = document.getElementById("reg-kin");

    const photoContainer =
        document.getElementById("reg-photo-container");

    const photoElement =
        document.getElementById("reg-patient-photo");

    if (!enteredValue) {
        msg.textContent = "Please enter a Clinic Number or Matric Number.";
        msg.className = "text-xs mb-3 text-red-600";
        return;
    }

    try {

        // Determine the search type.
        let searchColumn;
        let searchValue;

        if (enteredValue.includes("/")) {

            searchColumn = "matric";
            searchValue = enteredValue;

        } else {

            searchColumn = "clinic_number";

            let serial = enteredValue
                .replace(/^BUK-(CLN|CNL)-/i, "");

            if (!/^\d{1,4}$/.test(serial)) {
                msg.textContent = "Enter a valid clinic number, e.g. 0001.";
                msg.className = "text-xs mb-3 text-red-600";
                return;
            }

            searchValue = "BUK-CLN-" + serial.padStart(4, "0");
        }

        msg.textContent = "Searching patient records...";
        msg.className = "text-xs mb-3 text-blue-600";

        // Hide previous photograph.
        if (photoContainer) photoContainer.classList.add("hidden");
        if (photoElement) photoElement.src = "";

        // Search Supabase.
        const { data: patient, error } = await supabaseClient
            .from("patients")
            .select("*")
            .eq(searchColumn, searchValue)
            .maybeSingle();

        if (error) throw error;

        if (!patient) {

            foundStudent = null;

            nameBox.value = "";
            deptBox.value = "";

            if (genderBox) genderBox.value = "";
            if (phoneBox) phoneBox.value = "";
            if (dobBox) dobBox.value = "";
            if (gradBox) gradBox.value = "";
            if (kinBox) kinBox.value = "";

            msg.textContent = "No approved patient found.";
            msg.className = "text-xs mb-3 text-red-600";

            return;
        }

        // Get department from approved registration if missing.
        let department = patient.department || "";

        if (!department) {

            const { data: approvedRequest } = await supabaseClient
                .from("clinic_registration_requests")
                .select("department, passport_photo_path")
                .eq("matric", patient.matric)
                .eq("status", "Approved")
                .maybeSingle();

            department = approvedRequest?.department || "";

        }

        // Store patient information.
        foundStudent = {
            id: patient.id,
            matric: patient.matric,
            name: patient.full_name,
            department: department,
            sex: patient.sex || "",
            clinicNumber: patient.clinic_number,
            phone: patient.phone || "",
            dob: patient.date_of_birth || "",
            gradYear: patient.graduation_year || "",
            kin: patient.next_of_kin_phone || ""
        };

        // Fill patient information.
        nameBox.value = patient.full_name || "";
        deptBox.value = department;

        if (genderBox) genderBox.value = patient.sex || "Male";
        if (phoneBox) phoneBox.value = patient.phone || "";
        if (dobBox) dobBox.value = patient.date_of_birth || "";
        if (gradBox) gradBox.value = patient.graduation_year || "";
        if (kinBox) kinBox.value = patient.next_of_kin_phone || "";

        // Display patient passport photograph.
        if (patient.passport_photo_path) {

            const { data: photoData, error: photoError } =
                await supabaseClient.storage
                    .from("patient-photos")
                    .createSignedUrl(
                        patient.passport_photo_path,
                        300
                    );

            if (!photoError && photoData && photoElement) {

                photoElement.src = photoData.signedUrl;

                if (photoContainer) {
                    photoContainer.classList.remove("hidden");
                }

            } else {
                console.error("Passport photo error:", photoError);
            }
        }

        // Display success message.
        const age = patient.date_of_birth
            ? calculateAge(patient.date_of_birth)
            : null;

        msg.textContent =
            "Approved Patient Found! Clinic No: " +
            patient.clinic_number +
            (age ? " (Age: " + age + " years)" : "") +
            ". Ready for visit registration.";

        msg.className =
            "text-xs mb-3 text-green-700 font-semibold";

    } catch (error) {

        console.error("Patient lookup failed:", error);

        msg.textContent = "Patient search failed: " + error.message;
        msg.className = "text-xs mb-3 text-red-600";
    }
}// ==========================================
// REGISTER PATIENT FOR A NEW CLINIC VISIT
// ==========================================

async function completeRegistration() {

    const msg = document.getElementById("reg-message");

    if (!foundStudent || !foundStudent.id) {

        msg.textContent =
            "Please look up an approved patient first.";

        msg.className = "text-xs mb-3 text-red-600";

        return;
    }

    const button = document.querySelector(
        "#panel-records button[onclick='completeRegistration()']"
    );

    const originalText = button?.innerHTML;

    try {

        if (button) {
            button.disabled = true;
            button.innerHTML =
                '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Registering...';
        }

        // Confirm the patient still exists.
        const { data: patient, error: patientError } =
            await supabaseClient
                .from("patients")
                .select("id, clinic_number, full_name")
                .eq("id", foundStudent.id)
                .single();

        if (patientError) throw patientError;

        if (!patient) {
            throw new Error("Patient record was not found.");
        }

        // Check whether this patient already has an active visit.
        const activeStatuses = [
            "Waiting",
            "Triaged",
            "Doctor Absent",
            "At diagnostics",
            "At pharmacy"
        ];

        const { data: activeVisit, error: visitCheckError } =
            await supabaseClient
                .from("visits")
                .select("id, status")
                .eq("patient_id", patient.id)
                .in("status", activeStatuses)
                .limit(1)
                .maybeSingle();

        if (visitCheckError) throw visitCheckError;

        if (activeVisit) {

            msg.textContent =
                "This patient already has an active visit. Current status: " +
                activeVisit.status;

            msg.className =
                "text-xs mb-3 text-amber-700 font-semibold";

            return;
        }

        // Get the selected queue priority.
        const priority =
            document.getElementById("reg-priority").value;

        // Create a new visit in Supabase.
        const { data: newVisit, error: insertError } =
            await supabaseClient
                .from("visits")
                .insert({
                    patient_id: patient.id,
                    priority: priority,
                    status: "Waiting"
                })
                .select()
                .single();

        if (insertError) throw insertError;

        console.log("New patient visit created:", newVisit);

        msg.textContent =
            "Registration successful! Clinic Number: " +
            patient.clinic_number +
            ". Patient added to Nurse Queue.";

        msg.className =
            "text-xs mb-3 text-green-700 font-semibold";

        // Clear the form.
        [
            "search-matric",
            "reg-phone",
            "reg-dob",
            "reg-grad-year",
            "reg-kin"
        ].forEach(id => {
            const element = document.getElementById(id);
            if (element) element.value = "";
        });

        const nameBox = document.getElementById("reg-fullname");
        const deptBox = document.getElementById("reg-department");

        if (nameBox) nameBox.value = "";
        if (deptBox) deptBox.value = "";

        // Clear patient passport photo after successful registration.
        const photoContainer =
            document.getElementById("reg-photo-container");

        const photoElement =
            document.getElementById("reg-patient-photo");

        if (photoContainer) {
            photoContainer.classList.add("hidden");
        }

        if (photoElement) {
            photoElement.src = "";
        }

        foundStudent = null;

        // Refresh the Nurse Queue information.
        await renderQueue();

        alert(
            "Patient registered successfully and added to the Nurse Queue."
        );

    } catch (error) {

        console.error("Patient registration failed:", error);

        msg.textContent =
            "Registration failed: " + error.message;

        msg.className =
            "text-xs mb-3 text-red-600 font-semibold";

        alert("Registration failed: " + error.message);

    } finally {

        if (button) {
            button.disabled = false;
            button.innerHTML = originalText;
        }
    }
}

// ==========================================
// RENDER NURSE WAITING QUEUE
// ==========================================

async function renderQueue() {

    const body = document.getElementById("queue-list");

    if (!body) return;

    try {

        body.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-blue-600 py-6">
                    Loading patient queue...
                </td>
            </tr>
        `;

        // Get Waiting visits and their patient information.
        const { data: visits, error } = await supabaseClient
            .from("visits")
            .select(`
                id,
                patient_id,
                priority,
                status,
                created_at,
                patients (
                    clinic_number,
                    full_name,
                    sex,
                    date_of_birth
                )
            `)
            .eq("status", "Waiting")
            .order("created_at", { ascending: true });

        if (error) throw error;

        if (!visits || visits.length === 0) {

            body.innerHTML = `
                <tr>
                    <td colspan="6"
                        class="text-center text-slate-400 py-6 text-xs">
                        No patients in the queue yet.
                    </td>
                </tr>
            `;

            return;
        }

        // Emergency patients appear before Urgent and Normal patients.
        const priorityOrder = {
            Emergency: 1,
            Urgent: 2,
            Normal: 3
        };

        visits.sort((a, b) => {

            const priorityDifference =
                (priorityOrder[a.priority] || 4) -
                (priorityOrder[b.priority] || 4);

            if (priorityDifference !== 0) {
                return priorityDifference;
            }

            return new Date(a.created_at) -
                new Date(b.created_at);
        });

        // Escape values before inserting them into HTML.
        const escapeHTML = value =>
            String(value ?? "-").replace(/[&<>"']/g, char => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            }[char]));

        body.innerHTML = visits.map((visit, index) => {

            const patient = visit.patients;

            if (!patient) return "";

            const age = patient.date_of_birth
                ? calculateAge(patient.date_of_birth)
                : null;

            return `
                <tr class="border-b border-slate-100">

                    <td class="py-3 px-4">
                        ${index + 1}
                    </td>

                    <td class="px-4 py-3">
                        ${escapeHTML(patient.clinic_number)}
                    </td>

                    <td class="px-4 py-3 font-medium">
                        ${escapeHTML(patient.full_name)}
                    </td>

                    <td class="px-4 py-3">
                        ${escapeHTML(patient.sex)}
                    </td>

                    <td class="px-4 py-3">
                        ${age ? age + " yrs" : "-"}
                    </td>

                    <td class="px-4 py-3">
                        ${escapeHTML(visit.priority)}
                    </td>

                </tr>
            `;

        }).join("");

    } catch (error) {

        console.error("Nurse queue loading failed:", error);

        body.innerHTML = `
            <tr>
                <td colspan="6"
                    class="text-center text-red-600 py-6">
                    Failed to load queue: ${String(error.message)}
                </td>
            </tr>
        `;
    }
}

function priorityTag(p) {
  return p === "Emergency"
    ? '<span class="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">Emergency</span>'
    : '<span class="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">Normal</span>';
}

// ==========================================
// CLINIC REGISTRATION REQUESTS - SUPABASE
// ==========================================

// Escape database values before displaying them in HTML.
function clinicEscape(value) {
    return String(value ?? "-").replace(/[&<>"']/g, function (char) {
        return {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        }[char];
    });
}


// Get all registration requests from Supabase.
async function getClinicRequests() {

    const { data, error } = await supabaseClient
        .from("clinic_registration_requests")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        throw error;
    }

    return data || [];
}


// Render registration requests.
async function renderClinicRequests() {

    const table = document.getElementById("clinic-requests-list");

    try {

        const requests = await getClinicRequests();

        const total = requests.length;
        const pending = requests.filter(r => r.status === "Pending").length;
        const approved = requests.filter(r => r.status === "Approved").length;
        const rejected = requests.filter(r => r.status === "Rejected").length;

        document.getElementById("clinic-total-requests").textContent = total;
        document.getElementById("clinic-pending-requests").textContent = pending;
        document.getElementById("clinic-approved-requests").textContent = approved;
        document.getElementById("clinic-rejected-requests").textContent = rejected;

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

            const submittedDate = request.created_at
                ? new Date(request.created_at).toLocaleDateString("en-GB", {
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
                        ${clinicEscape(request.full_name)}
                    </td>

                    <td class="px-4 py-3 text-sm text-slate-600">
                        ${clinicEscape(request.matric)}
                    </td>

                    <td class="px-4 py-3 text-sm text-slate-600">
                        ${clinicEscape(request.department)}
                    </td>

                    <td class="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                        ${submittedDate}
                    </td>

                    <td class="px-4 py-3">
                        <span class="inline-block px-3 py-1 rounded-full text-xs font-semibold ${statusClass}">
                            ${clinicEscape(request.status)}
                        </span>
                    </td>

                    <td class="px-4 py-3">
                        <button
                            type="button"
                            onclick="viewClinicRequest('${clinicEscape(request.id)}')"
                            class="text-blue-600 hover:text-blue-800 font-semibold text-sm whitespace-nowrap">
                            View Details
                        </button>
                    </td>

                </tr>
            `;

        }).join("");

    } catch (error) {

        console.error("Clinic requests loading failed:", error);

        if (table) {
            table.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-6 text-red-600">
                        Failed to load requests: ${clinicEscape(error.message)}
                    </td>
                </tr>
            `;
        }
    }
}


// ==========================================
// VIEW REGISTRATION REQUEST DETAILS
// ==========================================

let selectedClinicRequestId = null;
let selectedClinicRequest = null;


// Create temporary secure links for private documents.
async function clinicDocumentLink(label, bucket, path) {

    if (!path) {
        return `
            <div class="border rounded-lg p-3">
                <p class="font-semibold">${clinicEscape(label)}</p>
                <p class="text-sm text-red-500">Not uploaded</p>
            </div>
        `;
    }

    return `
        <div class="border border-slate-200 rounded-lg p-3">

            <p class="font-semibold text-slate-800 mb-2">
                ${clinicEscape(label)}
            </p>

            <button
                type="button"
                class="clinic-document-open text-blue-600 hover:text-blue-800 text-sm font-semibold"
                data-bucket="${clinicEscape(bucket)}"
                data-path="${clinicEscape(path)}"
                data-label="${clinicEscape(label)}">

                <i class="fa-solid fa-file-arrow-up mr-1"></i>
                View Document

            </button>

        </div>
    `;
}
async function viewClinicRequest(id) {

    try {

        const { data: request, error } = await supabaseClient
            .from("clinic_registration_requests")
            .select("*")
            .eq("id", id)
            .single();

        if (error) throw error;

        selectedClinicRequestId = request.id;
        selectedClinicRequest = request;

        // Student information
        document.getElementById("clinic-detail-student").innerHTML = `
            <p><strong>Full Name:</strong> ${clinicEscape(request.full_name)}</p>
            <p><strong>Matric Number:</strong> ${clinicEscape(request.matric)}</p>
            <p><strong>Department:</strong> ${clinicEscape(request.department)}</p>
        `;

        // Patient biodata
        document.getElementById("clinic-detail-biodata").innerHTML = `
            <p><strong>Phone:</strong> ${clinicEscape(request.phone)}</p>
            <p><strong>Sex:</strong> ${clinicEscape(request.sex)}</p>
            <p><strong>Date of Birth:</strong> ${clinicEscape(request.date_of_birth)}</p>
            <p><strong>Graduation Year:</strong> ${clinicEscape(request.graduation_year)}</p>
        `;

        // Next of kin and health information
        document.getElementById("clinic-detail-kin").innerHTML = `
            <p><strong>Next of Kin Name:</strong> ${clinicEscape(request.next_of_kin_name)}</p>
            <p><strong>Relationship:</strong> ${clinicEscape(request.next_of_kin_relationship)}</p>
            <p><strong>Next of Kin Phone:</strong> ${clinicEscape(request.next_of_kin_phone)}</p>
            <p><strong>Next of Kin Address:</strong> ${clinicEscape(request.next_of_kin_address)}</p>
            <p><strong>Place of Origin:</strong> ${clinicEscape(request.place_of_origin)}</p>
            <p><strong>Tribe:</strong> ${clinicEscape(request.tribe)}</p>
            <p><strong>Religion:</strong> ${clinicEscape(request.religion)}</p>
            <p><strong>Occupation:</strong> ${clinicEscape(request.occupation)}</p>
            <p><strong>Allergy:</strong> ${clinicEscape(request.allergy)}</p>
        `;

        // Display uploaded documents using signed URLs.
        const documents = await Promise.all([

            clinicDocumentLink(
                "Admission Letter",
                "student-documents",
                request.admission_letter_path
            ),

            clinicDocumentLink(
                "Passport Photograph",
                "patient-photos",
                request.passport_photo_path
            ),

            clinicDocumentLink(
                "Health Service Form",
                "student-documents",
                request.health_service_form_path
            ),

            clinicDocumentLink(
                "Medical Certificate",
                "student-documents",
                request.medical_certificate_path
            )

        ]);

        const documentContainer =
    document.getElementById("clinic-detail-documents");

documentContainer.innerHTML = documents.join("");

// Attach click events to the document buttons
documentContainer.querySelectorAll(".clinic-document-open")
    .forEach(button => {

        button.addEventListener("click", function () {

            openClinicDocument(
                this.dataset.bucket,
                this.dataset.path,
                this.dataset.label
            );

        });

    });

closeClinicDocumentViewer();

        // Show request details.
        document.getElementById("clinic-request-details")
            .classList.remove("hidden");

        // Only Pending requests can be approved or rejected.
        const reviewActions = document.getElementById("clinic-review-actions");

        if (reviewActions) {
            reviewActions.classList.toggle("hidden", request.status !== "Pending");
        }

        const result = document.getElementById("clinic-review-result");

        if (request.status === "Rejected") {

            result.classList.remove("hidden");
            result.className = "border-t border-slate-200 pt-5 text-sm text-red-600";

            result.textContent =
                "Rejected. Reason: " + (request.rejection_reason || "No reason provided.");

        } else if (request.status === "Approved") {

            result.classList.remove("hidden");
            result.className = "border-t border-slate-200 pt-5 text-sm text-green-600";

            result.textContent = "This registration has been approved.";

        } else {

            result.classList.add("hidden");
            result.textContent = "";
        }

        // Close and clear rejection form.
        document.getElementById("clinic-rejection-form").classList.add("hidden");
        document.getElementById("clinic-rejection-reason").value = "";

    } catch (error) {

        console.error("Request details loading failed:", error);

        alert("Unable to open registration details: " + error.message);
    }
}


// Close request details.
function closeClinicRequestDetails() {

    const details = document.getElementById("clinic-request-details");
    const rejectForm = document.getElementById("clinic-rejection-form");

    if (details) details.classList.add("hidden");

    if (rejectForm) rejectForm.classList.add("hidden");

    selectedClinicRequestId = null;
    selectedClinicRequest = null;
}


// ==========================================
// REJECT CLINIC REGISTRATION REQUEST
// ==========================================

function showClinicRejectForm() {

    if (!selectedClinicRequest) {
        alert("Please open a registration request first.");
        return;
    }

    if (selectedClinicRequest.status !== "Pending") {
        alert("Only pending requests can be rejected.");
        return;
    }

    document.getElementById("clinic-rejection-form").classList.remove("hidden");

    document.getElementById("clinic-rejection-reason").value = "";
}


async function rejectClinicRequest() {

    if (!selectedClinicRequestId) {
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

    if (!selectedClinicRequest || selectedClinicRequest.status !== "Pending") {
        alert("Only pending requests can be rejected.");
        return;
    }

    try {

        const { data: { user }, error: userError } =
            await supabaseClient.auth.getUser();

        if (userError || !user) {
            throw new Error("Please log in again.");
        }

        const { data, error } = await supabaseClient
            .from("clinic_registration_requests")
            .update({
                status: "Rejected",
                rejection_reason: reason,
                reviewed_by: user.id,
                reviewed_at: new Date().toISOString()
            })
            .eq("id", selectedClinicRequestId)
            .eq("status", "Pending")
            .select()
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            throw new Error(
                "The request was not updated. It may no longer be Pending, or you may not have permission."
            );
        }

        alert("Registration request rejected successfully.");

        document.getElementById("clinic-rejection-form").classList.add("hidden");

        await renderClinicRequests();

        await viewClinicRequest(selectedClinicRequestId);

    } catch (error) {

        console.error("Request rejection failed:", error);

        alert("Failed to reject request: " + error.message);
    }
}


// Hide rejection form.
function hideClinicRejectForm() {

    const form = document.getElementById("clinic-rejection-form");

    if (form) {
        form.classList.add("hidden");
    }
}


// Open document inside BUK Care
async function openClinicDocument(bucket, path, label) {

    const viewer = document.getElementById("clinic-document-viewer");
    const frame = document.getElementById("clinic-document-frame");
    const title = document.getElementById("clinic-document-title");

    title.textContent = "Loading " + label + "...";
    viewer.classList.remove("hidden");

    const { data, error } = await supabaseClient.storage
        .from(bucket)
        .createSignedUrl(path, 300);

    if (error) {

        console.error("Document preview error:", error);

        title.textContent = "Unable to open document";

        alert("Document could not be opened: " + error.message);

        return;
    }

    title.textContent = label;
    frame.src = data.signedUrl;
}


// Close document viewer
function closeClinicDocumentViewer() {

    const viewer = document.getElementById("clinic-document-viewer");
    const frame = document.getElementById("clinic-document-frame");

    viewer.classList.add("hidden");
    frame.src = "about:blank";
}

// Approve Clinic Registration Request
// Approve Student Clinic Registration
async function approveClinicRegistrationRequest() {

    if (!selectedClinicRequestId || !selectedClinicRequest) {
        alert("Please open a registration request first.");
        return;
    }

    if (selectedClinicRequest.status !== "Pending") {
        alert("Only Pending requests can be approved.");
        return;
    }

    const button = document.getElementById("clinic-approve-button");

    const originalText = button.innerHTML;
    const requestId = selectedClinicRequestId;

    const confirmed = confirm(
        "Are you sure you want to approve this student registration?"
    );

    if (!confirmed) return;

    try {

        // Show loading indication
        button.disabled = true;

        button.innerHTML =
            '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Approving...';

        console.log("Starting clinic registration approval...");

        // Call Supabase approval function
        const { data, error } = await supabaseClient.rpc(
            "approve_clinic_registration_request",
            {
                p_request_id: requestId
            }
        );

        if (error) {
            throw error;
        }

        console.log("Clinic Number generated:", data);

        alert(
            "Registration approved successfully!\n\nClinic Number: " + data
        );

        // Reload registration requests
        await renderClinicRequests();

        // Reload selected request details
        await viewClinicRequest(requestId);

    } catch (error) {

        console.error("Approval failed:", error);

        alert("Approval failed: " + error.message);

    } finally {

        button.disabled = false;
        button.innerHTML = originalText;

    }
}

// Show or hide the fixed clinic number prefix.
function updateClinicLookupPrefix(input) {

    const prefix = document.getElementById(
        "clinic-number-prefix"
    );

    if (!prefix) return;

    const value = input.value.trim().toUpperCase();

    const isMatric = value.includes("/");
    const hasFullPrefix =
        value.startsWith("BUK-CLN-") ||
        value.startsWith("BUK-CNL-");

    prefix.classList.toggle(
        "hidden",
        isMatric || hasFullPrefix
    );
}