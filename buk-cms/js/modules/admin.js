// ==========================================
// BUK CARE - ADMIN STAFF MANAGEMENT
// ==========================================


// Only administrator can open this section.

function openStaffManagement() {

    if (currentRole !== "Administrator") {
        alert("Administrator permission required.");
        return;
    }

    document.getElementById("admin-dashboard-cards")
        .classList.add("hidden");

    document.getElementById("admin-staff-management")
        .classList.remove("hidden");

    loadAdminStaff();
}


function closeStaffManagement() {

    document.getElementById("admin-staff-management")
        .classList.add("hidden");

    document.getElementById("admin-dashboard-cards")
        .classList.remove("hidden");
}
// ==========================================
// HELPER
// ==========================================

function adminStaffEscape(value) {

    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[char]));

}


function adminStaffRoleName(role) {

    const names = {

        records: "Records Officer",

        nurse: "Triage Nurse",

        doctor: "Doctor",

        diagnostics: "Diagnostics",

        pharmacy: "Pharmacist",

        admin: "Administrator"

    };

    return names[role] || role;

}


// ==========================================
// LOAD STAFF FROM EDGE FUNCTION
// ==========================================

async function loadAdminStaff() {

    const container =
        document.getElementById("admin-staff-list");

    if (!container) return;


    container.innerHTML = `
        <p class="text-sm text-slate-500">
            <i class="fa-solid fa-spinner fa-spin mr-2"></i>
            Loading staff accounts...
        </p>
    `;


    try {

        const { data, error } =
            await supabaseClient.functions.invoke(
                "admin-staff-management",
                {
                    body: {
                        action: "list_staff"
                    }
                }
            );


        if (error) throw error;

        if (!data.success) {
            throw new Error(data.error || "Unable to load staff.");
        }


        renderAdminStaff(data.staff || []);


    } catch (error) {

        console.error("Staff loading error:", error);

        container.innerHTML = `
            <p class="text-sm text-red-600">
                ${adminStaffEscape(error.message)}
            </p>
        `;

    }

}


// ==========================================
// DISPLAY STAFF TABLE
// ==========================================

function renderAdminStaff(staff) {

    const container =
        document.getElementById("admin-staff-list");

    if (!container) return;


    if (!staff.length) {

        container.innerHTML = `
            <p class="text-sm text-slate-400 py-5">
                No staff accounts found.
            </p>
        `;

        return;

    }


    const roleOptions = role => {

        return [
            ["records", "Records Officer"],
            ["nurse", "Triage Nurse"],
            ["doctor", "Doctor"],
            ["diagnostics", "Diagnostics"],
            ["pharmacy", "Pharmacist"]
        ].map(([value, label]) => `
            <option value="${value}"
                ${role === value ? "selected" : ""}>
                ${label}
            </option>
        `).join("");

    };


    container.innerHTML = `

        <table class="w-full min-w-[850px] text-left
                      text-sm whitespace-nowrap">

            <thead class="bg-slate-50 text-slate-600">

                <tr>

                    <th class="p-3">Staff Name</th>

                    <th class="p-3">Email Address</th>

                    <th class="p-3">Role</th>

                    <th class="p-3">Date Created</th>

                    <th class="p-3">Action</th>

                </tr>

            </thead>


            <tbody class="divide-y divide-slate-100">

                ${staff.map(item => {

                    const isAdmin = item.role === "admin";

                    return `

                        <tr>

                            <td class="p-3 font-semibold text-slate-800">

                                ${adminStaffEscape(item.full_name)}

                            </td>


                            <td class="p-3 text-slate-600">

                                ${adminStaffEscape(item.email)}

                            </td>


                            <td class="p-3">

                                ${isAdmin

                                    ? `<span class="bg-purple-100 text-purple-700
                                                   px-3 py-1 rounded-full text-xs font-semibold">
                                            Administrator
                                       </span>`

                                    : `
                                        <select id="staff-role-${item.id}"
                                            class="border border-slate-300
                                                   rounded-lg px-2 py-2 text-xs">

                                            ${roleOptions(item.role)}

                                        </select>
                                    `
                                }

                            </td>


                            <td class="p-3 text-slate-500">

                                ${item.created_at
                                    ? new Date(item.created_at).toLocaleDateString()
                                    : "-"
                                }

                            </td>


                            <td class="p-3">

                                ${isAdmin

                                    ? `<span class="text-xs text-slate-400">
                                            Protected account
                                       </span>`

                                    : `
                                        <button
                                            onclick="saveAdminStaffRole('${item.id}')"
                                            class="bg-blue-600 hover:bg-blue-700
                                                   text-white px-3 py-2
                                                   rounded-lg text-xs font-semibold">

                                            Save Role

                                        </button>
                                    `
                                }

                            </td>

                        </tr>

                    `;

                }).join("")}

            </tbody>

        </table>

    `;

}


// ==========================================
// CREATE STAFF ACCOUNT
// ==========================================

async function createAdminStaff(event) {

    event.preventDefault();


    if (currentRole !== "Administrator") {
        alert("Administrator permission required.");
        return;
    }


    const button = event.submitter;

    const message =
        document.getElementById("admin-staff-message");


    const fullName =
        document.getElementById("admin-staff-name").value.trim();

    const email =
        document.getElementById("admin-staff-email").value.trim().toLowerCase();

    const password =
        document.getElementById("admin-staff-password").value;

    const role =
        document.getElementById("admin-staff-role").value;


    if (password.length < 10) {
        alert("Password must contain at least 10 characters.");
        return;
    }


    button.disabled = true;

    button.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin mr-2"></i>
        Creating Account...
    `;


    try {

        const { data, error } =
            await supabaseClient.functions.invoke(
                "admin-staff-management",
                {
                    body: {
                        action: "create_staff",
                        full_name: fullName,
                        email: email,
                        password: password,
                        role: role
                    }
                }
            );


        if (error) throw error;

        if (!data.success) {
            throw new Error(data.error || "Staff creation failed.");
        }


        message.innerHTML = `
            <span class="text-green-700 font-semibold">
                <i class="fa-solid fa-circle-check mr-1"></i>
                Staff account created successfully.
            </span>
        `;


        document.getElementById("admin-create-staff-form").reset();

        await loadAdminStaff();


   } catch (error) {

    console.error("Create staff error:", error);

    let errorMessage = error.message || "Unknown error.";

    // Read the actual response returned by Supabase.
    if (error.context && typeof error.context.clone === "function") {

        const response = error.context.clone();

        const responseText = await response.text();

        console.error("Edge Function HTTP Status:", response.status);
        console.error("Edge Function Response:", responseText);

        try {

            const responseData = JSON.parse(responseText);

            errorMessage =
                responseData.error ||
                responseData.message ||
                errorMessage;

        } catch (parseError) {
            console.error("Could not parse error response:", parseError);
        }
    }

    message.innerHTML = `
        <span class="text-red-600">
            ${adminStaffEscape(errorMessage)}
        </span>
    `;

} finally {

        button.disabled = false;

        button.innerHTML = `
            <i class="fa-solid fa-user-plus mr-2"></i>
            Create Staff Account
        `;

    }

}


// ==========================================
// CHANGE STAFF ROLE
// ==========================================

async function saveAdminStaffRole(userId) {

    if (currentRole !== "Administrator") {
        alert("Administrator permission required.");
        return;
    }


    const select =
        document.getElementById("staff-role-" + userId);

    if (!select) return;


    const newRole = select.value;


    if (!confirm(
        "Are you sure you want to change this staff member's role?"
    )) {
        return;
    }


    try {

        const { data, error } =
            await supabaseClient.functions.invoke(
                "admin-staff-management",
                {
                    body: {
                        action: "change_role",
                        user_id: userId,
                        role: newRole
                    }
                }
            );


        if (error) throw error;

        if (!data.success) {
            throw new Error(data.error || "Role update failed.");
        }


        alert("Staff role updated successfully.");

        await loadAdminStaff();


    } catch (error) {

        console.error("Staff role update error:", error);

        alert("Unable to update role: " + error.message);

    }

}

// ==========================================
// BUK CARE - ADMIN AUDIT LOGS
// ==========================================

let adminAuditLogsCache = [];


// Open Audit Logs.

function openAuditLogs() {

    if (currentRole !== "Administrator") {

        alert("Administrator permission required.");

        return;

    }

    document.getElementById("admin-dashboard-cards")
        .classList.add("hidden");

    document.getElementById("admin-staff-management")
        .classList.add("hidden");

    document.getElementById("admin-audit-logs")
        .classList.remove("hidden");

    loadAdminAuditLogs();

}


// Return to Administrator Dashboard.

function closeAuditLogs() {

    document.getElementById("admin-audit-logs")
        .classList.add("hidden");

    document.getElementById("admin-dashboard-cards")
        .classList.remove("hidden");

}


// Convert values into safe HTML.

function auditEscape(value) {

    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[char]));

}


// ==========================================
// LOAD AUDIT LOGS
// ==========================================

async function loadAdminAuditLogs() {

    const container =
        document.getElementById("admin-audit-list");

    if (!container) return;


    if (currentRole !== "Administrator") {

        container.innerHTML = `
            <p class="text-red-600 text-sm">
                Administrator permission required.
            </p>
        `;

        return;

    }


    container.innerHTML = `
        <p class="text-sm text-slate-500 py-5">
            <i class="fa-solid fa-spinner fa-spin mr-2"></i>
            Loading audit records...
        </p>
    `;


    try {

        const startDate =
            document.getElementById("audit-start-date").value;

        const endDate =
            document.getElementById("audit-end-date").value;

        const action =
            document.getElementById("audit-action-filter").value;

        const table =
            document.getElementById("audit-table-filter").value;


        if (startDate && endDate && startDate > endDate) {
            throw new Error("Start date cannot be later than end date.");
        }


        const { data, error } =
            await supabaseClient.functions.invoke(
                "admin-staff-management",
                {
                    body: {
                        action: "list_audit_logs",
                        start_date: startDate,
                        end_date: endDate,
                        filter_action: action,
                        table_name: table,
                        limit: 200
                    }
                }
            );


        if (error) throw error;

        if (!data.success) {
            throw new Error(data.error || "Unable to load audit logs.");
        }


        adminAuditLogsCache = data.logs || [];


        document.getElementById("audit-total-count").textContent =
            Number(data.total_count || 0).toLocaleString();

        document.getElementById("audit-today-count").textContent =
            Number(data.today_count || 0).toLocaleString();

        document.getElementById("audit-loaded-count").textContent =
            adminAuditLogsCache.length.toLocaleString();


        filterAuditLogs();


    } catch (error) {

        console.error("Audit logs loading error:", error);

        container.innerHTML = `
            <div class="text-red-600 text-sm py-5">
                Unable to load audit logs:
                ${auditEscape(error.message)}
            </div>
        `;

    }

}


// ==========================================
// FILTER LOADED AUDIT RECORDS
// ==========================================

function filterAuditLogs() {

    const search =
        document.getElementById("audit-search")
            .value.trim().toLowerCase();


    const filtered = adminAuditLogsCache.filter(item => {

        const searchable = [

            item.staff_name,
            item.staff_role,
            item.action,
            item.table_name,
            item.description,
            item.record_id

        ].join(" ").toLowerCase();


        return !search || searchable.includes(search);

    });


    renderAdminAuditLogs(filtered);

}


// ==========================================
// DISPLAY AUDIT RECORDS
// ==========================================

function renderAdminAuditLogs(logs) {

    const container =
        document.getElementById("admin-audit-list");

    if (!container) return;


    if (!logs.length) {

        container.innerHTML = `
            <div class="text-center py-12">

                <i class="fa-solid fa-clipboard-check
                          text-slate-300 text-4xl"></i>

                <p class="text-slate-500 text-sm mt-3">
                    No audit activities found.
                </p>

            </div>
        `;

        return;

    }


    const actionStyles = {

        INSERT: "bg-green-100 text-green-700",

        UPDATE: "bg-blue-100 text-blue-700",

        DELETE: "bg-red-100 text-red-700"

    };


    container.innerHTML = `

        <table class="w-full min-w-[1000px]
                      text-left text-sm whitespace-nowrap">

            <thead class="bg-slate-50 text-slate-600">

                <tr>

                    <th class="p-3">Staff Member</th>

                    <th class="p-3">Action</th>

                    <th class="p-3">Affected Table</th>

                    <th class="p-3">Description</th>

                    <th class="p-3">Record ID</th>

                    <th class="p-3">Date & Time</th>

                </tr>

            </thead>


            <tbody class="divide-y divide-slate-100">

                ${logs.map(item => `

                    <tr class="hover:bg-slate-50">

                        <td class="p-3">

                            <p class="font-semibold text-slate-800">
                                ${auditEscape(item.staff_name)}
                            </p>

                            <p class="text-xs text-slate-400 mt-1">
                                ${auditEscape(item.staff_role)}
                            </p>

                        </td>


                        <td class="p-3">

                            <span class="px-3 py-1 rounded-full
                                         text-xs font-semibold
                                         ${actionStyles[item.action] || "bg-slate-100 text-slate-700"}">

                                ${auditEscape(item.action)}

                            </span>

                        </td>


                        <td class="p-3 font-medium text-slate-700">

                            ${auditEscape(item.table_name)}

                        </td>


                        <td class="p-3 text-slate-600
                                   max-w-xs whitespace-normal">

                            ${auditEscape(item.description)}

                        </td>


                        <td class="p-3 text-xs text-slate-400">

                            ${auditEscape(item.record_id || "-")}

                        </td>


                        <td class="p-3 text-xs text-slate-500">

                            ${item.created_at
                                ? new Date(item.created_at).toLocaleString()
                                : "-"
                            }

                        </td>

                    </tr>

                `).join("")}

            </tbody>

        </table>

        <p class="text-xs text-slate-400 mt-4">
            Displaying ${logs.length} records from the loaded audit history.
        </p>

    `;

}


// ==========================================
// CLEAR AUDIT FILTERS
// ==========================================

function clearAuditFilters() {

    document.getElementById("audit-search").value = "";

    document.getElementById("audit-start-date").value = "";

    document.getElementById("audit-end-date").value = "";

    document.getElementById("audit-action-filter").value = "";

    document.getElementById("audit-table-filter").value = "";

    loadAdminAuditLogs();

}


// ==========================================
// EXPORT AUDIT LOGS TO CSV
// ==========================================

function exportAuditLogsCSV() {

    if (!adminAuditLogsCache.length) {

        alert("There are no audit records to export.");

        return;

    }


    const rows = [

        [
            "Staff Member",
            "Role",
            "Action",
            "Affected Table",
            "Description",
            "Record ID",
            "Date & Time"
        ],

        ...adminAuditLogsCache.map(item => [

            item.staff_name,
            item.staff_role,
            item.action,
            item.table_name,
            item.description,
            item.record_id,
            item.created_at

        ])

    ];


    const csv = rows.map(row => {

        return row.map(value => {

            const text = String(value ?? "");

            return `"${text.replace(/"/g, '""')}"`;

        }).join(",");

    }).join("\r\n");


    const blob = new Blob(
        ["\uFEFF" + csv],
        { type: "text/csv;charset=utf-8;" }
    );


    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = "BUK-Care-Audit-Logs.csv";

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);

}