// TRIAGE NURSE


// ==========================================
// RENDER NURSE QUEUE FROM SUPABASE
// ==========================================

async function renderNurseQueue() {

    const waitingTable = document.getElementById("nurse-queue");
    const absentTable = document.getElementById("nurse-absent-queue");

    if (!waitingTable || !absentTable) return;

    waitingTable.innerHTML = `
        <tr>
            <td colspan="3" class="text-center py-6 text-blue-600">
                Loading nurse queue...
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
                    date_of_birth,
                    department,
                    passport_photo_path
                )
            `)
            .in("status", ["Waiting", "Absent"])
            .order("created_at", { ascending: true });

        if (error) throw error;

        const waitingRows = visits.filter(v => v.status === "Waiting");
        const absentRows = visits.filter(v => v.status === "Absent");

        // Emergency first, then Urgent, then Normal.
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

        waitingRows.sort(sortQueue);
        absentRows.sort(sortQueue);

        const escapeHTML = value =>
            String(value ?? "-").replace(/[&<>"']/g, char => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            }[char]));

        // Waiting patients.
        waitingTable.innerHTML = waitingRows.length
            ? waitingRows.map(v => {

                const patient = v.patients;

                return `
                    <tr class="border-b border-slate-100">

                        <td class="py-3 font-medium">
                            ${escapeHTML(patient?.full_name)}

                            <span class="text-xs text-slate-400 block">
                                ${escapeHTML(patient?.clinic_number)}
                                · ${escapeHTML(patient?.sex)}
                            </span>
                        </td>

                        <td>
                            ${priorityTag(v.priority)}
                        </td>

                        <td>
                            <button
                                type="button"
                                onclick="callPatient('${v.id}')"
                                class="bg-blue-700 hover:bg-blue-800 text-white text-xs px-3 py-1.5 rounded-lg">
                                Call
                            </button>
                        </td>

                    </tr>
                `;

            }).join("")
            : `
                <tr>
                    <td colspan="3"
                        class="text-center text-slate-400 py-6 text-xs">
                        No one is waiting.
                    </td>
                </tr>
            `;

        // Absent patients.
        absentTable.innerHTML = absentRows.length
            ? absentRows.map(v => `

                <tr class="border-b border-slate-100">

                    <td class="py-3 font-medium">
                        ${escapeHTML(v.patients?.full_name)}

                        <span class="text-xs text-slate-400 block">
                            ${escapeHTML(v.patients?.clinic_number)}
                        </span>
                    </td>

                    <td>
                        <span class="text-blue-700 text-xs font-semibold">
                            Absent
                        </span>
                    </td>

                    <td>
                        <button
                            type="button"
                            onclick="callPatient('${v.id}')"
                            class="bg-blue-700 hover:bg-blue-800 text-white text-xs px-3 py-1.5 rounded-lg">
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

        console.error("Nurse queue error:", error);

        waitingTable.innerHTML = `
            <tr>
                <td colspan="3" class="text-center text-red-600 py-6">
                    Failed to load queue: ${escapeHTML(error.message)}
                </td>
            </tr>
        `;
    }
}

// ==========================================
// CALL PATIENT AND DISPLAY DETAILS
// ==========================================

async function callPatient(id) {

    openVisitId = id;

    const form = document.getElementById("nurse-form");

    try {

        form.innerHTML = `
            <p class="text-blue-600 text-sm">
                Loading patient information...
            </p>
        `;

        const { data: visit, error } = await supabaseClient
            .from("visits")
            .select(`
                id,
                priority,
                status,
                patients (
                    id,
                    clinic_number,
                    full_name,
                    sex,
                    date_of_birth,
                    department,
                    passport_photo_path
                )
            `)
            .eq("id", id)
            .single();

        if (error) throw error;

        const patient = visit.patients;

        if (!patient) {
            throw new Error("Patient information was not found.");
        }

        const age = patient.date_of_birth
            ? calculateAge(patient.date_of_birth)
            : null;

        // Display patient photograph.
        let photoHTML = `
            <div class="w-24 h-28 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 text-xs">
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
                        alt="Patient Passport"
                        class="w-24 h-28 object-cover rounded-xl border shadow-sm">
                `;

            } else {
                console.error("Nurse passport photo error:", photoError);
            }
        }

        form.innerHTML = `

            <!-- Patient Information -->
            <div class="flex items-center gap-4 mb-5">

                ${photoHTML}

                <div class="min-w-0">

                    <h4 class="font-bold text-slate-800 text-lg">
                        ${patient.full_name}
                    </h4>

                    <p class="text-sm text-blue-700 font-semibold">
                        ${patient.clinic_number}
                    </p>

                    <p class="text-xs text-slate-500 mt-1">
                        ${patient.department || "-"}
                    </p>

                    <p class="text-xs text-slate-500">
                        ${patient.sex || "-"}
                        ${age ? " · " + age + " years" : ""}
                    </p>

                    <div class="mt-2">
                        ${priorityTag(visit.priority)}
                    </div>

                </div>

            </div>

            <hr class="border-slate-200 mb-4">

            <h5 class="font-bold text-slate-700 mb-3">
                Patient Vitals
            </h5>

            <div class="grid grid-cols-2 gap-3 mb-4">

                <input
                    id="v-bp"
                    placeholder="Blood Pressure (120/80)"
                    class="border border-slate-300 rounded-lg px-3 py-2 text-sm">

                <input
                    id="v-temp"
                    type="number"
                    step="0.1"
                    placeholder="Temperature °C"
                    class="border border-slate-300 rounded-lg px-3 py-2 text-sm">

                <input
                    id="v-pulse"
                    type="number"
                    placeholder="Pulse Rate /min"
                    class="border border-slate-300 rounded-lg px-3 py-2 text-sm">

                <input
                    id="v-resp"
                    type="number"
                    placeholder="Respiration /min"
                    class="border border-slate-300 rounded-lg px-3 py-2 text-sm">

                <input
                    id="v-ox"
                    type="number"
                    step="0.1"
                    placeholder="Oxygen Saturation %"
                    class="border border-slate-300 rounded-lg px-3 py-2 text-sm">

                <input
                    id="v-weight"
                    type="number"
                    step="0.1"
                    placeholder="Weight (kg)"
                    class="border border-slate-300 rounded-lg px-3 py-2 text-sm">

                <input
                    id="v-height"
                    type="number"
                    step="0.1"
                    placeholder="Height (cm)"
                    class="border border-slate-300 rounded-lg px-3 py-2 text-sm">

            </div>

            <textarea
                id="v-notes"
                rows="3"
                placeholder="Additional nursing notes..."
                class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-4"></textarea>

            <div class="flex flex-wrap gap-2">

                <button
                    type="button"
                    onclick="saveVitals()"
                    class="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg font-semibold">

                    Save & Send to Doctor
                </button>

                <button
                    type="button"
                    onclick="markAbsent()"
                    class="bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm px-4 py-2 rounded-lg">

                    Mark Absent
                </button>

            </div>
        `;

    } catch (error) {

        console.error("Patient loading failed:", error);

        form.innerHTML = `
            <p class="text-red-600 text-sm">
                Failed to load patient: ${error.message}
            </p>
        `;
    }
}

// ==========================================
// SAVE VITALS AND SEND PATIENT TO DOCTOR
// ==========================================

async function saveVitals() {

    if (!openVisitId) {
        alert("Please select a patient first.");
        return;
    }

    const form = document.getElementById("nurse-form");

    try {

        // Get current authenticated user.
        const { data: { session }, error: sessionError } =
            await supabaseClient.auth.getSession();

        if (sessionError || !session) {
            throw new Error("Please log in again.");
        }

        const readNumber = (id, label, integer = false) => {

            const input = document.getElementById(id);
            const raw = input.value.trim();

            if (!raw) return null;

            const value = integer
                ? Number.parseInt(raw, 10)
                : Number(raw);

            if (!Number.isFinite(value) || value <= 0) {
                throw new Error("Enter a valid " + label + ".");
            }

            return value;
        };

        const oxygen = readNumber(
            "v-ox",
            "oxygen saturation"
        );

        if (oxygen !== null && oxygen > 100) {
            throw new Error("Oxygen saturation cannot exceed 100%.");
        }

        const vitals = {

            visit_id: openVisitId,

            nurse_id: session.user.id,

            blood_pressure:
                document.getElementById("v-bp").value.trim() || null,

            temperature:
                readNumber("v-temp", "temperature"),

            pulse_rate:
                readNumber("v-pulse", "pulse rate", true),

            respiratory_rate:
                readNumber("v-resp", "respiration rate", true),

            oxygen_saturation: oxygen,

            weight:
                readNumber("v-weight", "weight"),

            height:
                readNumber("v-height", "height"),

            notes:
                document.getElementById("v-notes").value.trim() || null
        };

        // Save patient vitals.
        const { error: vitalsError } = await supabaseClient
            .from("vitals")
            .insert(vitals);

        if (vitalsError) throw vitalsError;

        // Move the visit to the doctor.
        const { data: updatedVisit, error: updateError } =
            await supabaseClient
                .from("visits")
                .update({
                    status: "Triaged"
                })
                .eq("id", openVisitId)
                .select("id")
                .maybeSingle();

        if (updateError) throw updateError;

        if (!updatedVisit) {
            throw new Error("Vitals saved, but visit status was not updated. Please check the queue.");
        }

        openVisitId = null;

        form.innerHTML = `
            <div class="bg-green-50 border border-green-200 rounded-xl p-4">
                <p class="text-green-700 font-semibold">
                    <i class="fa-solid fa-circle-check mr-2"></i>
                    Vitals saved successfully.
                </p>

                <p class="text-sm text-green-700 mt-1">
                    Patient has been sent to the Doctor.
                </p>
            </div>
        `;

        await renderNurseQueue();

        alert("Vitals saved. Patient sent to Doctor.");

    } catch (error) {

        console.error("Saving vitals failed:", error);

        alert("Failed to save vitals: " + error.message);
    }
}
// ==========================================
// MARK PATIENT ABSENT
// ==========================================

async function markAbsent() {

    if (!openVisitId) {
        alert("Please select a patient first.");
        return;
    }

    try {

        const { data, error } = await supabaseClient
            .from("visits")
            .update({
                status: "Absent"
            })
            .eq("id", openVisitId)
            .select("id")
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            throw new Error("Patient visit could not be updated.");
        }

        openVisitId = null;

        document.getElementById("nurse-form").innerHTML = `
            <p class="text-slate-500 text-sm">
                Patient marked absent.
            </p>
        `;

        await renderNurseQueue();

        alert("Patient marked absent.");

    } catch (error) {

        console.error("Mark absent failed:", error);

        alert("Failed to mark patient absent: " + error.message);
    }
}