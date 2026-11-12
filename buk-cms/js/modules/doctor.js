// ==========================================
// BUK CARE - DOCTOR MODULE (SUPABASE)
// ==========================================

let doctorMedicinesCache = [];
let doctorSuppliesCache = [];
let prescriptionItemCount = 0;


// Escape database values before displaying in HTML.
function doctorEscape(value) {

    return String(value ?? "-").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[char]));
}


// Format dates for patient history.
function doctorFormatDate(value) {

    if (!value) return "-";

    return new Date(value).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}


// ==========================================
// 1. DOCTOR QUEUE
// ==========================================

async function renderDoctorQueue() {

    const queue = document.getElementById("doctor-queue");
    const absentQueue = document.getElementById("doctor-absent-queue");

    if (!queue || !absentQueue) return;

    queue.innerHTML = `
        <tr>
            <td colspan="3" class="text-center py-6 text-blue-600">
                Loading Doctor Queue...
            </td>
        </tr>
    `;

    try {

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
                    department,
                    date_of_birth
                )
            `)
            .in("status", ["Triaged", "Doctor Absent"])
            .order("created_at", { ascending: true });

        if (error) throw error;

        const waiting = visits.filter(
            v => v.status === "Triaged" && v.patients
        );

        const absent = visits.filter(
            v => v.status === "Doctor Absent" && v.patients
        );

        // Emergency first, followed by Urgent and Normal.
        const priorityOrder = {
            Emergency: 1,
            Urgent: 2,
            Normal: 3
        };

        const sortQueue = (a, b) => {

            const difference =
                (priorityOrder[a.priority] || 4) -
                (priorityOrder[b.priority] || 4);

            return difference ||
                new Date(a.created_at) - new Date(b.created_at);
        };

        waiting.sort(sortQueue);
        absent.sort(sortQueue);

        // Waiting patients.
        queue.innerHTML = waiting.length
            ? waiting.map(v => `
                <tr class="border-b border-slate-100">

                    <td class="py-3">
                        <div class="font-medium">
                            ${doctorEscape(v.patients.full_name)}
                        </div>

                        <span class="text-xs text-slate-400 block">
                            ${doctorEscape(v.patients.clinic_number)}
                        </span>
                    </td>

                    <td>
                        ${priorityTag(v.priority)}
                    </td>

                    <td class="whitespace-nowrap">

                        <button
                            type="button"
                            onclick="openConsultation('${v.id}')"
                            class="bg-blue-700 hover:bg-blue-800 text-white text-xs px-3 py-1.5 rounded-lg">
                            Open
                        </button>

                        <button
                            type="button"
                            onclick="markDoctorAbsent('${v.id}')"
                            class="bg-amber-100 text-amber-800 text-xs px-3 py-1.5 rounded-lg ml-1">
                            Absent
                        </button>

                    </td>

                </tr>
            `).join("")
            : `
                <tr>
                    <td colspan="3"
                        class="text-center text-slate-400 py-6 text-xs">
                        No one is ready for consultation.
                    </td>
                </tr>
            `;


        // Absent patients.
        absentQueue.innerHTML = absent.length
            ? absent.map(v => `
                <tr class="border-b border-slate-100">

                    <td class="py-2">
                        ${doctorEscape(v.patients.full_name)}
                    </td>

                    <td>
                        <span class="text-blue-700 text-xs font-semibold">
                            Doctor Absent
                        </span>
                    </td>

                    <td>
                        <button
                            type="button"
                            onclick="openConsultation('${v.id}')"
                            class="bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg">
                            Call Again
                        </button>
                    </td>

                </tr>
            `).join("")
            : `
                <tr>
                    <td colspan="3"
                        class="text-center text-slate-400 py-6 text-xs">
                        No absent patients.
                    </td>
                </tr>
            `;

    } catch (error) {

        console.error("Doctor queue error:", error);

        queue.innerHTML = `
            <tr>
                <td colspan="3" class="text-center text-red-600 py-6">
                    Failed to load Doctor Queue: ${doctorEscape(error.message)}
                </td>
            </tr>
        `;
    }
}


// ==========================================
// 2. MARK DOCTOR ABSENT
// ==========================================

async function markDoctorAbsent(id) {

    try {

        const { error } = await supabaseClient
            .from("visits")
            .update({
                status: "Doctor Absent"
            })
            .eq("id", id);

        if (error) throw error;

        if (openVisitId === id) {

            openVisitId = null;

            document.getElementById("doctor-form").innerHTML = `
                <p class="text-slate-400 text-sm">
                    Patient marked absent.
                </p>
            `;
        }

        await renderDoctorQueue();

    } catch (error) {

        console.error("Mark doctor absent failed:", error);

        alert("Unable to mark patient absent: " + error.message);
    }
}


// ==========================================
// 3. PREVIOUS PATIENT HISTORY
// ==========================================

async function loadDoctorPatientHistory(patientId, currentVisitId) {

    const { data: previousVisits, error } = await supabaseClient
        .from("visits")
        .select("id, created_at, status")
        .eq("patient_id", patientId)
        .neq("id", currentVisitId)
        .order("created_at", { ascending: false })
        .limit(10);

    if (error) throw error;

    if (!previousVisits || previousVisits.length === 0) {

        return `
            <p class="text-sm text-slate-400">
                No previous consultation history available.
            </p>
        `;
    }

    const visitIds = previousVisits.map(v => v.id);

    // Load previous consultations, diagnostics and prescriptions.
    const [consultationsResult, diagnosticsResult, prescriptionsResult] =
        await Promise.all([

            supabaseClient
                .from("consultations")
                .select("*")
                .in("visit_id", visitIds)
                .order("created_at", { ascending: false }),

            supabaseClient
                .from("diagnostic_requests")
                .select("*")
                .in("visit_id", visitIds)
                .order("created_at", { ascending: false }),

            supabaseClient
                .from("prescriptions")
                .select("*")
                .in("visit_id", visitIds)
                .order("created_at", { ascending: false })

        ]);

    if (consultationsResult.error) throw consultationsResult.error;
    if (diagnosticsResult.error) throw diagnosticsResult.error;
    if (prescriptionsResult.error) throw prescriptionsResult.error;

    const consultations = consultationsResult.data || [];
    const diagnostics = diagnosticsResult.data || [];
    const prescriptions = prescriptionsResult.data || [];

    // Get medicine and supply names for old prescriptions.
    const medicineIds = prescriptions
        .filter(p => p.medicine_id)
        .map(p => p.medicine_id);

    const supplyIds = prescriptions
        .filter(p => p.supply_id)
        .map(p => p.supply_id);

    let medicineNames = {};
    let supplyNames = {};

    if (medicineIds.length) {

        const { data } = await supabaseClient
            .from("medicines")
            .select("id, name")
            .in("id", [...new Set(medicineIds)]);

        (data || []).forEach(m => {
            medicineNames[m.id] = m.name;
        });
    }

    if (supplyIds.length) {

        const { data } = await supabaseClient
            .from("medical_supplies")
            .select("id, name")
            .in("id", [...new Set(supplyIds)]);

        (data || []).forEach(s => {
            supplyNames[s.id] = s.name;
        });
    }

    const visitDates = {};

    previousVisits.forEach(v => {
        visitDates[v.id] = v.created_at;
    });

    let historyItems = [];

    consultations.forEach(c => {

        historyItems.push({
            date: c.created_at,
            html: `
                <div class="border rounded-lg p-3 mb-3">

                    <p class="text-xs text-slate-400 mb-2">
                        Consultation · ${doctorFormatDate(c.created_at)}
                    </p>

                    <p class="text-sm">
                        <b>Symptoms:</b> ${doctorEscape(c.symptoms)}
                    </p>

                    <p class="text-sm mt-1">
                        <b>Diagnosis:</b> ${doctorEscape(c.diagnosis)}
                    </p>

                    <p class="text-sm mt-1">
                        <b>Treatment:</b> ${doctorEscape(c.treatment_plan)}
                    </p>

                    <p class="text-sm mt-1">
                        <b>Doctor Notes:</b> ${doctorEscape(c.doctor_notes)}
                    </p>

                </div>
            `
        });
    });

    diagnostics.forEach(d => {

        historyItems.push({
            date: d.created_at,
            html: `
                <div class="border rounded-lg p-3 mb-3">

                    <p class="text-xs text-slate-400 mb-2">
                        Diagnostic Request · ${doctorFormatDate(d.created_at)}
                    </p>

                    <p class="text-sm">
                        <b>Test:</b> ${doctorEscape(d.test_name)}
                    </p>

                    <p class="text-sm">
                        <b>Type:</b> ${doctorEscape(d.request_type)}
                    </p>

                    <p class="text-sm">
                        <b>Status:</b> ${doctorEscape(d.status)}
                    </p>

                    <p class="text-sm mt-1">
                        <b>Result:</b> ${doctorEscape(d.result || "No result recorded")}
                    </p>

                </div>
            `
        });
    });

    prescriptions.forEach(p => {

        const itemName = p.item_type === "Medicine"
            ? medicineNames[p.medicine_id] || "Medicine"
            : supplyNames[p.supply_id] || "Medical Supply";

        historyItems.push({
            date: p.created_at,
            html: `
                <div class="border rounded-lg p-3 mb-3">

                    <p class="text-xs text-slate-400 mb-2">
                        Prescription · ${doctorFormatDate(p.created_at)}
                    </p>

                    <p class="text-sm">
                        <b>Item:</b> ${doctorEscape(itemName)}
                    </p>

                    <p class="text-sm">
                        <b>Dosage:</b> ${doctorEscape(p.dosage)}
                    </p>

                    <p class="text-sm">
                        <b>Quantity:</b> ${p.quantity}
                    </p>

                    <p class="text-sm">
                        <b>Status:</b> ${doctorEscape(p.status)}
                    </p>

                </div>
            `
        });
    });

    historyItems.sort(
        (a, b) => new Date(b.date) - new Date(a.date)
    );

    if (!historyItems.length) {

        return `
            <p class="text-sm text-slate-400">
                Previous visits found, but no consultation records are available.
            </p>
        `;
    }

    return historyItems.map(item => item.html).join("");
}


// ==========================================
// 4. OPEN PATIENT CONSULTATION
// ==========================================

async function openConsultation(id) {

    const form = document.getElementById("doctor-form");

    openVisitId = id;

    form.innerHTML = `
        <p class="text-blue-600 text-sm">
            Loading patient record...
        </p>
    `;

    try {

        // Get visit and patient information.
        const { data: visit, error: visitError } = await supabaseClient
            .from("visits")
            .select(`
                id,
                patient_id,
                priority,
                status,
                complaint,
                created_at,
                patients (
                    id,
                    clinic_number,
                    matric,
                    full_name,
                    department,
                    sex,
                    date_of_birth,
                    allergy,
                    passport_photo_path
                )
            `)
            .eq("id", id)
            .single();

        if (visitError) throw visitError;

        const patient = visit.patients;

        if (!patient) {
            throw new Error("Patient record not found.");
        }

        // Return an absent patient to Doctor's queue.
        if (visit.status === "Doctor Absent") {

            const { error } = await supabaseClient
                .from("visits")
                .update({
                    status: "Triaged"
                })
                .eq("id", id);

            if (error) throw error;
        }

        // Load current vitals, consultation, diagnostics and inventory.
        const results = await Promise.all([

            supabaseClient
                .from("vitals")
                .select("*")
                .eq("visit_id", id)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle(),

            supabaseClient
                .from("consultations")
                .select("*")
                .eq("visit_id", id)
                .maybeSingle(),

            supabaseClient
                .from("diagnostic_requests")
                .select("*")
                .eq("visit_id", id)
                .order("created_at", { ascending: false }),

            supabaseClient
                .from("medicines")
                .select("id, name, strength, dosage_form, is_active")
                .eq("is_active", true)
                .order("name"),

            supabaseClient
                .from("medical_supplies")
                .select("id, name, is_active")
                .eq("is_active", true)
                .order("name")

        ]);

        const [vitalsResult, consultationResult,
            diagnosticsResult, medicinesResult, suppliesResult] = results;

        if (vitalsResult.error) throw vitalsResult.error;
        if (consultationResult.error) throw consultationResult.error;
        if (diagnosticsResult.error) throw diagnosticsResult.error;

        doctorMedicinesCache = medicinesResult.data || [];
        doctorSuppliesCache = suppliesResult.data || [];

        if (medicinesResult.error) {
            console.warn("Medicines loading failed:", medicinesResult.error);
        }

        if (suppliesResult.error) {
            console.warn("Supplies loading failed:", suppliesResult.error);
        }

        const vitals = vitalsResult.data || {};
        const consultation = consultationResult.data || {};
        const diagnostics = diagnosticsResult.data || [];

        // Generate a signed URL for the private passport photo.
        let photoHTML = `
            <div class="w-24 h-28 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
                No Photo
            </div>
        `;

        if (patient.passport_photo_path) {

            const { data: photoData, error: photoError } =
                await supabaseClient.storage
                    .from("patient-photos")
                    .createSignedUrl(
                        patient.passport_photo_path,
                        300
                    );

            if (!photoError && photoData) {

                photoHTML = `
                    <img
                        src="${photoData.signedUrl}"
                        alt="Patient Passport Photograph"
                        class="w-24 h-28 object-cover rounded-xl border shadow-sm">
                `;

            } else {
                console.error("Doctor passport photo error:", photoError);
            }
        }

        const age = patient.date_of_birth
            ? calculateAge(patient.date_of_birth)
            : null;

        const historyHTML =
            await loadDoctorPatientHistory(patient.id, id);

        // Display current diagnostic results.
        const diagnosticHTML = diagnostics.length
            ? diagnostics.map(d => `
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">

                    <p class="font-semibold text-blue-800 text-sm">
                        ${doctorEscape(d.test_name)}
                    </p>

                    <p class="text-xs text-slate-600 mt-1">
                        ${doctorEscape(d.request_type)}
                        · ${doctorEscape(d.status)}
                    </p>

                    <p class="text-sm mt-2">
                        <b>Result:</b>
                        ${doctorEscape(d.result || "Awaiting result")}
                    </p>

                </div>
            `).join("")
            : `
                <p class="text-sm text-slate-400">
                    No diagnostic requests for this visit.
                </p>
            `;

        // Reset prescription item counter.
        prescriptionItemCount = 0;

        form.innerHTML = `

            <!-- PATIENT PROFILE -->
            <div class="bg-white border border-blue-100 rounded-xl p-4 mb-4 shadow-sm">

                <div class="flex items-start gap-4">

                    ${photoHTML}

                    <div class="flex-1 min-w-0">

                        <h4 class="font-bold text-slate-800 text-lg">
                            ${doctorEscape(patient.full_name)}
                        </h4>

                        <p class="text-sm text-blue-700 font-semibold mt-1">
                            ${doctorEscape(patient.clinic_number)}
                        </p>

                        <p class="text-xs text-slate-500 mt-1">
                            ${doctorEscape(patient.department)}
                        </p>

                        <div class="flex flex-wrap gap-2 mt-2">

                            <span class="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-md">
                                ${doctorEscape(patient.sex)}
                            </span>

                            <span class="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded-md">
                                ${age ? age + " years" : "Age unavailable"}
                            </span>

                            ${priorityTag(visit.priority)}

                        </div>

                    </div>

                </div>

            </div>


            <!-- ALLERGY ALERT -->
            ${patient.allergy ? `
                <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">

                    <p class="text-amber-800 font-bold text-sm">
                        <i class="fa-solid fa-triangle-exclamation mr-1"></i>
                        Drug Allergy / Reaction
                    </p>

                    <p class="text-amber-700 text-sm mt-1">
                        ${doctorEscape(patient.allergy)}
                    </p>

                </div>
            ` : ""}


            <!-- CURRENT VITALS -->
            <div class="border border-slate-200 rounded-xl p-3 mb-4">

                <h5 class="font-bold text-slate-800 text-sm mb-3">
                    Patient Vital Signs
                </h5>

                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">

                    <div class="bg-blue-50 rounded-lg p-2">
                        <p class="text-xs text-slate-500">Blood Pressure</p>
                        <p class="font-bold text-blue-800 text-sm">
                            ${doctorEscape(vitals.blood_pressure)}
                        </p>
                        <p class="text-xs text-slate-400">mmHg</p>
                    </div>

                    <div class="bg-slate-50 rounded-lg p-2">
                        <p class="text-xs text-slate-500">Temperature</p>
                        <p class="font-bold text-sm">
                            ${doctorEscape(vitals.temperature)}
                        </p>
                        <p class="text-xs text-slate-400">°C</p>
                    </div>

                    <div class="bg-slate-50 rounded-lg p-2">
                        <p class="text-xs text-slate-500">Pulse Rate</p>
                        <p class="font-bold text-sm">
                            ${doctorEscape(vitals.pulse_rate)}
                        </p>
                        <p class="text-xs text-slate-400">beats/min</p>
                    </div>

                    <div class="bg-slate-50 rounded-lg p-2">
                        <p class="text-xs text-slate-500">Respiration</p>
                        <p class="font-bold text-sm">
                            ${doctorEscape(vitals.respiratory_rate)}
                        </p>
                        <p class="text-xs text-slate-400">breaths/min</p>
                    </div>

                    <div class="bg-slate-50 rounded-lg p-2">
                        <p class="text-xs text-slate-500">Oxygen Saturation</p>
                        <p class="font-bold text-sm">
                            ${doctorEscape(vitals.oxygen_saturation)}
                        </p>
                        <p class="text-xs text-slate-400">%</p>
                    </div>

                    <div class="bg-slate-50 rounded-lg p-2">
                        <p class="text-xs text-slate-500">Weight</p>
                        <p class="font-bold text-sm">
                            ${doctorEscape(vitals.weight)}
                        </p>
                        <p class="text-xs text-slate-400">kg</p>
                    </div>

                    <div class="bg-slate-50 rounded-lg p-2">
                        <p class="text-xs text-slate-500">Height</p>
                        <p class="font-bold text-sm">
                            ${doctorEscape(vitals.height)}
                        </p>
                        <p class="text-xs text-slate-400">cm</p>
                    </div>

                </div>

                ${vitals.notes ? `
                    <p class="text-sm mt-3">
                        <b>Nurse Notes:</b> ${doctorEscape(vitals.notes)}
                    </p>
                ` : ""}

            </div>

            


            <!-- DIAGNOSTIC RESULTS -->
            <div class="border border-slate-200 rounded-xl p-3 mb-4">

                <h5 class="font-bold text-slate-800 text-sm mb-3">
                    Laboratory / X-ray Results
                </h5>

                ${diagnosticHTML}

            </div>


            <!-- PREVIOUS MEDICAL HISTORY -->
            <div class="border border-slate-200 rounded-xl p-3 mb-4">

                <h5 class="font-bold text-slate-800 text-sm mb-3">
                    <i class="fa-solid fa-clock-rotate-left text-blue-600 mr-1"></i>
                    Previous Consultation History
                </h5>

                ${historyHTML}

            </div>


            <!-- CONSULTATION FORM -->
            <div class="border border-slate-200 rounded-xl p-4 mb-4">

                <h5 class="font-bold text-slate-800 text-sm mb-3">
                    Current Consultation
                </h5>

                <input
                    id="d-complaint"
                    value="${doctorEscape(consultation.symptoms || visit.complaint || "")}"
                    placeholder="Complaint and symptoms"
                    class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3">

                <input
                    id="d-diagnosis"
                    value="${doctorEscape(consultation.diagnosis || "")}"
                    placeholder="Diagnosis"
                    class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3">

                <textarea
                    id="d-treatment"
                    rows="3"
                    placeholder="Treatment plan"
                    class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3">${doctorEscape(consultation.treatment_plan || "")}</textarea>

                <input
                    id="d-allergy"
                    placeholder="Additional allergy / reaction note (optional)"
                    class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3">

                <textarea
                    id="d-notes"
                    rows="3"
                    placeholder="Doctor's additional notes"
                    class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3">${doctorEscape(consultation.doctor_notes || "")}</textarea>

                <button
                    type="button"
                    onclick="saveDoctorNotes()"
                    class="bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm px-4 py-2 rounded-lg font-semibold">

                    Save Consultation Notes
                </button>

            </div>


            <!-- DIAGNOSTICS REQUEST -->
            <div class="border border-slate-200 rounded-xl p-3 mb-4">

                <h5 class="font-bold text-slate-800 text-sm mb-3">
                    Request Diagnostic Test
                </h5>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">

                    <select
                        id="d-labtype"
                        class="border border-slate-300 rounded-lg px-3 py-2 text-sm">

                        <option value="Lab">Laboratory Test</option>
                        <option value="X-ray">X-ray / Scan</option>

                    </select>

                    <input
                        id="d-test-name"
                        placeholder="Test name (e.g. FBC)"
                        class="border border-slate-300 rounded-lg px-3 py-2 text-sm">

                </div>

                <button
                    type="button"
                    onclick="requestLab()"
                    class="bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm px-4 py-2 rounded-lg mt-3">

                    Send Diagnostic Request
                </button>

            </div>


            <!-- PRESCRIPTION -->
            <div class="border border-slate-200 rounded-xl p-3">

                <h5 class="font-bold text-slate-800 text-sm mb-1">
                    Prescription
                </h5>

                <p class="text-xs text-slate-500 mb-3">
                    Add medicines and medical supplies separately.
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

            </div>

        `;

        // Add the first prescription row.
        addPrescriptionItem();

    } catch (error) {

        console.error("Open consultation failed:", error);

        form.innerHTML = `
            <p class="text-red-600 text-sm">
                Failed to open patient consultation: ${doctorEscape(error.message)}
            </p>
        `;
    }
}

// Create a unique display name for each medicine.
function doctorMedicineLabel(medicine) {

    const details = [
        medicine.strength,
        medicine.dosage_form
    ].filter(Boolean).join(" ");

    return details
        ? `${medicine.name} - ${details}`
        : medicine.name;
}


// ==========================================
// 5. SAVE CONSULTATION NOTES
// ==========================================

async function saveDoctorNotes() {

    if (!openVisitId) {
        alert("Please open a patient consultation first.");
        return;
    }

    try {

        const { data: { session }, error: sessionError } =
            await supabaseClient.auth.getSession();

        if (sessionError || !session) {
            throw new Error("Please log in again.");
        }

        const complaint =
            document.getElementById("d-complaint").value.trim();

        const diagnosis =
            document.getElementById("d-diagnosis").value.trim();

        const treatment =
            document.getElementById("d-treatment").value.trim();

        const allergyNote =
            document.getElementById("d-allergy").value.trim();

        let doctorNotes =
            document.getElementById("d-notes").value.trim();

        if (allergyNote) {
            doctorNotes +=
                (doctorNotes ? "\n" : "") +
                "Additional allergy/reaction note: " + allergyNote;
        }

        const consultationPayload = {

            visit_id: openVisitId,

            doctor_id: session.user.id,

            symptoms: complaint || null,

            diagnosis: diagnosis || null,

            treatment_plan: treatment || null,

            doctor_notes: doctorNotes || null
        };

        const { error } = await supabaseClient
            .from("consultations")
            .upsert(
                consultationPayload,
                { onConflict: "visit_id" }
            );

        if (error) throw error;

        alert("Consultation notes saved successfully.");

        return true;

    } catch (error) {

        console.error("Save consultation failed:", error);

        alert("Failed to save consultation: " + error.message);

        return false;
    }
}


// ==========================================
// 6. REQUEST LABORATORY / X-RAY
// ==========================================

async function requestLab() {

    if (!openVisitId) {
        alert("No active consultation selected.");
        return;
    }

    try {

        const saved = await saveDoctorNotes();

        if (!saved) return;

        const { data: { session }, error: sessionError } =
            await supabaseClient.auth.getSession();

        if (sessionError || !session) {
            throw new Error("Please log in again.");
        }

        const requestType =
            document.getElementById("d-labtype").value;

        const testName =
            document.getElementById("d-test-name").value.trim();

        if (!testName) {
            alert("Please enter the diagnostic test name.");
            return;
        }

        const complaint =
            document.getElementById("d-complaint").value.trim();

        const diagnosis =
            document.getElementById("d-diagnosis").value.trim();

        const { error: diagnosticError } = await supabaseClient
            .from("diagnostic_requests")
            .insert({
                visit_id: openVisitId,
                requested_by: session.user.id,
                request_type: requestType,
                test_name: testName,
                clinical_notes:
                    "Symptoms: " + complaint +
                    "\nDiagnosis: " + diagnosis,
                status: "Pending"
            });

        if (diagnosticError) throw diagnosticError;

        // Use the valid status defined in the database.
        const visitId = openVisitId;

        const { error: updateError } = await supabaseClient
            .from("visits")
            .update({
                status: "At diagnostics"
            })
            .eq("id", visitId);

        if (updateError) throw updateError;

        openVisitId = null;

        document.getElementById("doctor-form").innerHTML = `
            <div class="bg-blue-50 border border-blue-200 rounded-xl p-4">

                <p class="text-blue-800 font-semibold">
                    Diagnostic request sent successfully.
                </p>

                <p class="text-blue-700 text-sm mt-1">
                    The patient has been sent to Diagnostics.
                </p>

            </div>
        `;

        await renderDoctorQueue();

    } catch (error) {

        console.error("Diagnostic request failed:", error);

        alert("Failed to send diagnostic request: " + error.message);
    }
}


// ==========================================
// 7. ADD PRESCRIPTION ITEM
// ==========================================



function addPrescriptionItem() {

    prescriptionItemCount++;

    const container =
        document.getElementById("prescription-items");

    if (!container) return;

    const itemId = prescriptionItemCount;

    const drugOptions = doctorMedicinesCache
    .map(m => `<option value="${doctorEscape(doctorMedicineLabel(m))}">`)
    .join("");

    const supplyOptions = doctorSuppliesCache
        .map(s => `
            <option value="${doctorEscape(s.name)}">
        `)
        .join("");

    const item = document.createElement("div");

    item.id = `prescription-item-${itemId}`;

    item.className =
        "border border-slate-200 rounded-lg p-3";

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


        <div class="rx-medicine-field">

            <label class="block text-xs text-slate-600 mb-1">
                Medicine Name
            </label>

            <input
                class="rx-medicine-name w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3"
                list="rx-drug-options-${itemId}"
                placeholder="Select a medicine"
                autocomplete="off">

            <datalist id="rx-drug-options-${itemId}">
                ${drugOptions}
            </datalist>

        </div>


        <div class="rx-supply-field hidden">

            <label class="block text-xs text-slate-600 mb-1">
                Medical Supply Name
            </label>

            <input
                class="rx-supply-name w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3"
                list="rx-supply-options-${itemId}"
                placeholder="Select a medical supply"
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
            placeholder="Dosage or instructions">


        <div class="grid grid-cols-2 gap-3">

            <div>

                <label class="block text-xs text-slate-600 mb-1">
                    Frequency
                </label>

                <input
                    class="rx-frequency w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="e.g. Twice daily">

            </div>

            <div>

                <label class="block text-xs text-slate-600 mb-1">
                    Duration
                </label>

                <input
                    class="rx-duration w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="e.g. 5 days">

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

    const typeSelect = item.querySelector(".rx-type");

    const medicineField =
        item.querySelector(".rx-medicine-field");

    const supplyField =
        item.querySelector(".rx-supply-field");

    typeSelect.addEventListener("change", () => {

        const isMedicine = typeSelect.value === "Medicine";

        medicineField.classList.toggle("hidden", !isMedicine);

        supplyField.classList.toggle("hidden", isMedicine);

    });
}


// ==========================================
// 8. REMOVE PRESCRIPTION ITEM
// ==========================================

function removePrescriptionItem(itemId) {

    const item = document.getElementById(
        `prescription-item-${itemId}`
    );

    if (item) {
        item.remove();
    }
}


// ==========================================
// 9. SEND PRESCRIPTION TO PHARMACY
// ==========================================

async function prescribe() {

    if (!openVisitId) {
        alert("Please open a patient consultation first.");
        return;
    }

    const container =
        document.getElementById("prescription-items");

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

    try {

        const newPrescriptions = [];

        for (const row of rows) {

            const type = row.querySelector(".rx-type").value;

            const isMedicine = type === "Medicine";

            const nameInput = isMedicine
                ? row.querySelector(".rx-medicine-name")
                : row.querySelector(".rx-supply-name");

            const name = nameInput.value.trim();

            const dosage =
                row.querySelector(".rx-dose").value.trim();

            const frequency =
                row.querySelector(".rx-frequency").value.trim();

            const duration =
                row.querySelector(".rx-duration").value.trim();

            const quantityInput =
                row.querySelector(".rx-quantity").value;

            const quantity = Number(quantityInput);

            if (!name) {
                throw new Error("Enter the name of every prescription item.");
            }

            if (isMedicine && !dosage) {
                throw new Error("Enter dosage for " + name);
            }

            if (
                !Number.isInteger(quantity) ||
                quantity < 1
            ) {
                throw new Error("Enter a valid quantity for " + name);
            }

            // Find the actual database inventory item.
                const inventoryItem = isMedicine
                ? doctorMedicinesCache.find(
                    m => doctorMedicineLabel(m).toLowerCase() === name.toLowerCase()
                )
                : doctorSuppliesCache.find(
                    s => s.name.toLowerCase() === name.toLowerCase()
                );

            if (!inventoryItem) {
                throw new Error(
                    name + " was not found in the active inventory. Select an existing item."
                );
            }

            newPrescriptions.push({

                visit_id: openVisitId,

                item_type: isMedicine ? "Medicine" : "Supply",

                medicine_id: isMedicine
                    ? inventoryItem.id
                    : null,

                supply_id: isMedicine
                    ? null
                    : inventoryItem.id,

                dosage: dosage || null,

                frequency: frequency || null,

                duration: duration || null,

                quantity: quantity,

                status: "Pending"

            });
        }

        // Save doctor's consultation before sending prescription.
        const saved = await saveDoctorNotes();

        if (!saved) return;

        // Save ALL new prescription items together.
        // Existing prescriptions are not deleted or overwritten.
        const { error: prescriptionError } = await supabaseClient
            .from("prescriptions")
            .insert(newPrescriptions);

        if (prescriptionError) throw prescriptionError;

        // Move visit to Pharmacy.
        const visitId = openVisitId;

        const { error: updateError } = await supabaseClient
            .from("visits")
            .update({
                status: "At pharmacy"
            })
            .eq("id", visitId);

        if (updateError) throw updateError;

        openVisitId = null;

        document.getElementById("doctor-form").innerHTML = `
            <div class="bg-green-50 border border-green-200 rounded-xl p-4">

                <p class="text-green-800 font-semibold">
                    <i class="fa-solid fa-circle-check mr-2"></i>
                    Prescription sent to Pharmacy.
                </p>

                <p class="text-sm text-green-700 mt-2">
                    ${newPrescriptions.length} prescription item(s) saved successfully.
                </p>

            </div>
        `;

        await renderDoctorQueue();

    } catch (error) {

        console.error("Prescription failed:", error);

        alert("Failed to send prescription: " + error.message);
    }
}