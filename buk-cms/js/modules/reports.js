// ==========================================
// BUK CARE - CLINIC REPORTS MODULE
// SUPABASE VERSION
// ==========================================

let currentClinicReport = null;


// ==========================================
// OPEN AND CLOSE REPORTS
// ==========================================

function viewReports() {

    // Security check: only Records and Admin.
    const allowedRoles = [
        "Records Officer",
        "Administrator"
    ];

    if (!allowedRoles.includes(currentRole)) {

        alert(
            "Access denied. Only Records Officer and Administrator can access Clinic Reports."
        );

        return;
    }

    // Hide all dashboards.
    ALL_PANEL_IDS.forEach(id => {

        const panel = document.getElementById(id);

        if (panel) {
            panel.classList.add("hidden");
        }

    });

    // Open Reports.
    const reportsPanel =
        document.getElementById("panel-reports");

    if (!reportsPanel) {
        console.error("Reports panel not found.");
        return;
    }

    reportsPanel.classList.remove("hidden");

    renderReports();
}


function backFromReports() {

    showRolePanel(currentRole);

}


// ==========================================
// GENERAL HELPERS
// ==========================================

function reportEscape(value) {

    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[char]));

}


function reportNumber(value) {

    return Number(value || 0).toLocaleString();

}


function reportDateString(date) {

    const year = date.getFullYear();

    const month = String(date.getMonth() + 1).padStart(2, "0");

    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;

}


// ==========================================
// DATE FILTER PRESETS
// ==========================================

function applyReportPreset(preset) {

    const today = new Date();

    let start = new Date(today);

    let end = new Date(today);

    today.setHours(0, 0, 0, 0);

    start = new Date(today);
    end = new Date(today);


    switch (preset) {

        case "today":

            break;


        case "week":

            start.setDate(
                today.getDate() - ((today.getDay() + 6) % 7)
            );

            break;


        case "month":

            start = new Date(
                today.getFullYear(),
                today.getMonth(),
                1
            );

            break;


        case "last_month":

            start = new Date(
                today.getFullYear(),
                today.getMonth() - 1,
                1
            );

            end = new Date(
                today.getFullYear(),
                today.getMonth(),
                0
            );

            break;


        case "three_months":

            start = new Date(
                today.getFullYear(),
                today.getMonth() - 2,
                1
            );

            break;


        case "year":

            start = new Date(
                today.getFullYear(),
                0,
                1
            );

            break;


        case "custom":

            return;

    }


    document.getElementById("report-start-date").value =
        reportDateString(start);

    document.getElementById("report-end-date").value =
        reportDateString(end);

}


// ==========================================
// REPORTS DASHBOARD UI
// ==========================================

function renderReports() {

    const container = document.getElementById("reports-grid");

    if (!container) return;


    container.innerHTML = `

        <div class="space-y-6">


            <!-- DATE FILTERS -->

            <div class="bg-white border border-slate-200
                        rounded-2xl shadow-sm p-5">

                <div class="flex flex-wrap justify-between
                            items-center gap-3 mb-4">

                    <div>
                        <h3 class="font-bold text-slate-800">
                            Report Period
                        </h3>

                        <p class="text-xs text-slate-500 mt-1">
                            Select the period you want to analyse.
                        </p>
                    </div>

                    <span class="text-xs font-semibold
                                 bg-blue-50 text-blue-700
                                 px-3 py-2 rounded-full">

                        <i class="fa-solid fa-calendar-days mr-1"></i>
                        Date-based analysis

                    </span>

                </div>


                <div class="grid grid-cols-1 md:grid-cols-4 gap-3">


                    <div>

                        <label class="block text-xs font-semibold
                                      text-slate-600 mb-2">

                            Quick Period

                        </label>

                        <select id="report-preset"
                            onchange="applyReportPreset(this.value)"
                            class="w-full border border-slate-300
                                   rounded-xl px-3 py-3 text-sm
                                   bg-white outline-none
                                   focus:ring-2 focus:ring-blue-500">

                            <option value="today">Today</option>

                            <option value="week">This Week</option>

                            <option value="month" selected>This Month</option>

                            <option value="last_month">Last Month</option>

                            <option value="three_months">Last 3 Months</option>

                            <option value="year">This Year</option>

                            <option value="custom">Custom Range</option>

                        </select>

                    </div>


                    <div>

                        <label class="block text-xs font-semibold
                                      text-slate-600 mb-2">

                            Start Date

                        </label>

                        <input type="date"
                            id="report-start-date"
                            class="w-full border border-slate-300
                                   rounded-xl px-3 py-3 text-sm">

                    </div>


                    <div>

                        <label class="block text-xs font-semibold
                                      text-slate-600 mb-2">

                            End Date

                        </label>

                        <input type="date"
                            id="report-end-date"
                            class="w-full border border-slate-300
                                   rounded-xl px-3 py-3 text-sm">

                    </div>


                    <div class="flex items-end">

                        <button onclick="generateClinicReport()"
                            class="w-full bg-blue-700 hover:bg-blue-800
                                   text-white rounded-xl px-4 py-3
                                   text-sm font-semibold transition">

                            <i class="fa-solid fa-chart-line mr-2"></i>
                            Generate Report

                        </button>

                    </div>

                </div>


                <div class="flex flex-wrap gap-2 mt-5">

                    <button onclick="downloadClinicReportExcel()"
                        class="bg-green-600 hover:bg-green-700
                               text-white px-4 py-2.5 rounded-xl
                               text-sm font-semibold transition">

                        <i class="fa-solid fa-file-excel mr-2"></i>
                        Download Excel (CSV)

                    </button>


                    <button onclick="saveClinicReport()"
                        class="bg-indigo-600 hover:bg-indigo-700
                               text-white px-4 py-2.5 rounded-xl
                               text-sm font-semibold transition">

                        <i class="fa-solid fa-floppy-disk mr-2"></i>
                        Save Report

                    </button>


                    <button onclick="window.print()"
                        class="bg-slate-700 hover:bg-slate-800
                               text-white px-4 py-2.5 rounded-xl
                               text-sm font-semibold transition">

                        <i class="fa-solid fa-print mr-2"></i>
                        Print Report

                    </button>

                </div>

            </div>


            <!-- REPORT STATUS -->

            <div id="report-status"
                class="text-sm text-slate-500">

                Loading clinic reports...

            </div>


            <!-- SUMMARY CARDS -->

            <div id="report-metrics"
                class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">

            </div>


            <!-- INVENTORY ALERTS -->

            <div id="report-inventory-alerts"
                class="grid grid-cols-1 md:grid-cols-3 gap-4">

            </div>


            <!-- CHARTS -->

            <div class="grid grid-cols-1 xl:grid-cols-2 gap-5">


                <div class="bg-white border border-slate-200
                            rounded-2xl p-5 shadow-sm">

                    <h3 class="font-bold text-slate-800">

                        <i class="fa-solid fa-chart-column
                                  text-blue-600 mr-2"></i>

                        Clinic Visits Trend

                    </h3>

                    <p class="text-xs text-slate-500 mt-1 mb-5">
                        Number of visits within the selected period.
                    </p>

                    <div id="report-visit-trend"></div>

                </div>


                <div class="bg-white border border-slate-200
                            rounded-2xl p-5 shadow-sm">

                    <h3 class="font-bold text-slate-800">

                        <i class="fa-solid fa-chart-pie
                                  text-indigo-600 mr-2"></i>

                        Visit Status Analysis

                    </h3>

                    <p class="text-xs text-slate-500 mt-1 mb-5">
                        Distribution of visits by status.
                    </p>

                    <div id="report-status-breakdown"></div>

                </div>


                <div class="bg-white border border-slate-200
                            rounded-2xl p-5 shadow-sm">

                    <h3 class="font-bold text-slate-800">

                        <i class="fa-solid fa-flask
                                  text-purple-600 mr-2"></i>

                        Diagnostics Analysis

                    </h3>

                    <p class="text-xs text-slate-500 mt-1 mb-5">
                        Lab and X-ray requests.
                    </p>

                    <div id="report-diagnostics"></div>

                </div>


                <div class="bg-white border border-slate-200
                            rounded-2xl p-5 shadow-sm">

                    <h3 class="font-bold text-slate-800">

                        <i class="fa-solid fa-prescription-bottle-medical
                                  text-green-600 mr-2"></i>

                        Pharmacy Analysis

                    </h3>

                    <p class="text-xs text-slate-500 mt-1 mb-5">
                        Prescription status distribution.
                    </p>

                    <div id="report-prescriptions"></div>

                </div>

            </div>


            <!-- SAVED REPORTS -->

            <div class="bg-white border border-slate-200
                        rounded-2xl shadow-sm p-5">

                <div class="flex flex-wrap justify-between
                            items-center gap-3 mb-4">

                    <div>

                        <h3 class="font-bold text-slate-800">

                            <i class="fa-solid fa-folder-open
                                      text-blue-600 mr-2"></i>

                            Saved Reports

                        </h3>

                        <p class="text-xs text-slate-500 mt-1">
                            Open reports generated previously.
                        </p>

                    </div>

                    <button onclick="loadSavedClinicReports()"
                        class="text-blue-700 text-sm font-semibold
                               hover:underline">

                        <i class="fa-solid fa-rotate mr-1"></i>
                        Refresh

                    </button>

                </div>

                <div id="saved-clinic-reports">

                    <p class="text-sm text-slate-400">
                        Loading saved reports...
                    </p>

                </div>

            </div>


        </div>

    `;


    applyReportPreset("month");

    generateClinicReport();

    loadSavedClinicReports();

}


// ==========================================
// GENERATE REPORT FROM SUPABASE
// ==========================================

async function generateClinicReport() {

    const startDate =
        document.getElementById("report-start-date").value;

    const endDate =
        document.getElementById("report-end-date").value;

    const status =
        document.getElementById("report-status");


    if (!startDate || !endDate) {

        alert("Please select both report dates.");

        return;

    }


    if (startDate > endDate) {

        alert("End date cannot be earlier than start date.");

        return;

    }


    status.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin mr-2"></i>
        Generating report from Supabase...
    `;


    try {

        const { data, error } = await supabaseClient.rpc(
            "get_clinic_report",
            {
                p_start_date: startDate,
                p_end_date: endDate
            }
        );


        if (error) throw error;


        currentClinicReport = data;

        renderClinicReportResults(data);


        status.innerHTML = `
            <span class="text-green-700 font-semibold">

                <i class="fa-solid fa-circle-check mr-1"></i>
                Report generated successfully.

            </span>

            <span class="text-slate-500 ml-2">
                ${reportEscape(startDate)} to ${reportEscape(endDate)}
            </span>
        `;


    } catch (error) {

        console.error("Clinic report error:", error);

        status.innerHTML = `
            <span class="text-red-600">
                Failed to generate report: ${reportEscape(error.message)}
            </span>
        `;

    }

}


// ==========================================
// SUMMARY CARDS AND REPORT VISUALS
// ==========================================

function renderClinicReportResults(report) {

    const summary = report.summary || {};


    const metrics = [

        {
            label: "Total Visits",
            value: summary.total_visits,
            icon: "fa-users",
            style: "blue"
        },

        {
            label: "New Patients",
            value: summary.new_patients,
            icon: "fa-user-plus",
            style: "indigo"
        },

        {
            label: "Completed Visits",
            value: summary.completed_visits,
            icon: "fa-circle-check",
            style: "green"
        },

        {
            label: "Waiting",
            value: summary.waiting_visits,
            icon: "fa-clock",
            style: "amber"
        },

        {
            label: "With Doctor",
            value: summary.with_doctor,
            icon: "fa-user-doctor",
            style: "purple"
        },

        {
            label: "At Diagnostics",
            value: summary.at_diagnostics,
            icon: "fa-flask",
            style: "cyan"
        },

        {
            label: "At Pharmacy",
            value: summary.at_pharmacy,
            icon: "fa-pills",
            style: "pink"
        },

        {
            label: "Diagnostic Requests",
            value: summary.diagnostic_requests,
            icon: "fa-microscope",
            style: "indigo"
        },

        {
            label: "Prescriptions",
            value: summary.prescriptions,
            icon: "fa-prescription",
            style: "blue"
        },

        {
            label: "Dispensed Items",
            value: summary.dispensed_items,
            icon: "fa-capsules",
            style: "green"
        }

    ];


    const styles = {

        blue: "bg-blue-50 text-blue-700",

        indigo: "bg-indigo-50 text-indigo-700",

        green: "bg-green-50 text-green-700",

        amber: "bg-amber-50 text-amber-700",

        purple: "bg-purple-50 text-purple-700",

        cyan: "bg-cyan-50 text-cyan-700",

        pink: "bg-pink-50 text-pink-700"

    };


    document.getElementById("report-metrics").innerHTML =

        metrics.map(item => `

            <div class="bg-white border border-slate-200
                        rounded-2xl shadow-sm p-4">

                <div class="flex justify-between
                            items-start gap-2">

                    <p class="text-xs font-semibold text-slate-500">

                        ${reportEscape(item.label)}

                    </p>

                    <div class="w-9 h-9 rounded-xl
                                flex items-center justify-center
                                ${styles[item.style]}">

                        <i class="fa-solid ${item.icon}"></i>

                    </div>

                </div>

                <p class="text-2xl md:text-3xl font-bold
                          text-slate-800 mt-4">

                    ${reportNumber(item.value)}

                </p>

            </div>

        `).join("");


    // INVENTORY ALERTS

    const alerts = [

        {
            title: "Low Stock Items",
            value: summary.low_stock_items,
            icon: "fa-box-open",
            style: "bg-amber-50 text-amber-700"
        },

        {
            title: "Expiring Within 30 Days",
            value: summary.expiring_soon_items,
            icon: "fa-calendar-xmark",
            style: "bg-orange-50 text-orange-700"
        },

        {
            title: "Expired Items",
            value: summary.expired_items,
            icon: "fa-triangle-exclamation",
            style: "bg-red-50 text-red-700"
        }

    ];


    document.getElementById("report-inventory-alerts").innerHTML =

        alerts.map(item => `

            <div class="bg-white border border-slate-200
                        rounded-2xl shadow-sm p-4 flex
                        items-center justify-between gap-3">

                <div>

                    <p class="text-sm font-semibold text-slate-600">
                        ${item.title}
                    </p>

                    <p class="text-2xl font-bold text-slate-800 mt-2">
                        ${reportNumber(item.value)}
                    </p>

                </div>

                <div class="w-12 h-12 rounded-xl
                            flex items-center justify-center
                            text-xl ${item.style}">

                    <i class="fa-solid ${item.icon}"></i>

                </div>

            </div>

        `).join("");


    // CHARTS

    renderReportTrend(report.visit_trend || []);

    renderReportBreakdown(
        "report-status-breakdown",
        report.status_breakdown || [],
        "status"
    );

    renderReportBreakdown(
        "report-diagnostics",
        report.diagnostic_breakdown || [],
        "type"
    );

    renderReportBreakdown(
        "report-prescriptions",
        report.prescription_breakdown || [],
        "status"
    );

}


// ==========================================
// VISIT TREND CHART
// ==========================================

function renderReportTrend(data) {

    const container =
        document.getElementById("report-visit-trend");

    if (!container) return;


    if (!data.length) {

        container.innerHTML = `
            <p class="text-center text-sm text-slate-400 py-12">
                No visits recorded during this period.
            </p>
        `;

        return;

    }


    const maximum = Math.max(
        ...data.map(item => Number(item.visits || 0)),
        1
    );


    container.innerHTML = `

        <div class="flex items-end gap-3 overflow-x-auto
                    min-h-52 pb-3">

            ${data.map(item => {

                const value = Number(item.visits || 0);

                const height = Math.max(
                    5,
                    (value / maximum) * 100
                );

                return `

                    <div class="flex flex-col items-center
                                justify-end min-w-[38px] flex-1">

                        <span class="text-xs font-bold
                                     text-slate-600 mb-2">

                            ${reportNumber(value)}

                        </span>

                        <div class="w-full flex items-end
                                    justify-center h-36">

                            <div class="w-full max-w-9
                                        bg-blue-500 hover:bg-blue-700
                                        rounded-t-lg transition"
                                 style="height:${height}%">

                            </div>

                        </div>

                        <span class="text-[10px] text-slate-500
                                     mt-2 whitespace-nowrap">

                            ${reportEscape(item.label)}

                        </span>

                    </div>

                `;

            }).join("")}

        </div>

    `;

}


// ==========================================
// GENERAL BREAKDOWN CHART
// ==========================================

function renderReportBreakdown(containerId, data, labelKey) {

    const container = document.getElementById(containerId);

    if (!container) return;


    if (!data.length) {

        container.innerHTML = `
            <p class="text-sm text-slate-400 text-center py-10">
                No records available for this period.
            </p>
        `;

        return;

    }


    const maximum = Math.max(
        ...data.map(item => Number(item.total || 0)),
        1
    );


    container.innerHTML = `

        <div class="space-y-5">

            ${data.map(item => {

                const value = Number(item.total || 0);

                const width = (value / maximum) * 100;

                return `

                    <div>

                        <div class="flex justify-between
                                    items-center gap-3 mb-2">

                            <span class="text-sm font-medium
                                         text-slate-700">

                                ${reportEscape(item[labelKey])}

                            </span>

                            <span class="text-sm font-bold
                                         text-slate-800">

                                ${reportNumber(value)}

                            </span>

                        </div>

                        <div class="w-full bg-slate-100
                                    rounded-full h-3">

                            <div class="bg-blue-600 h-3
                                        rounded-full transition-all"
                                 style="width:${width}%">

                            </div>

                        </div>

                    </div>

                `;

            }).join("")}

        </div>

    `;

}


// ==========================================
// SAVE REPORT SNAPSHOT
// ==========================================

async function saveClinicReport() {

    if (!currentClinicReport) {

        alert("Generate a report first.");

        return;

    }


    try {

        const { data: userData, error: userError } =
            await supabaseClient.auth.getUser();

        if (userError) throw userError;

        const user = userData.user;

        if (!user) {
            throw new Error("Please sign in again.");
        }


        const start = currentClinicReport.period_start;

        const end = currentClinicReport.period_end;


        const { error } = await supabaseClient
            .from("saved_clinic_reports")
            .insert({

                report_name: `Clinic Activity Report (${start} to ${end})`,

                period_start: start,

                period_end: end,

                report_data: currentClinicReport,

                generated_by: user.id

            });


        if (error) throw error;


        alert("Report saved successfully.");

        loadSavedClinicReports();


    } catch (error) {

        console.error("Save report error:", error);

        alert("Unable to save report: " + error.message);

    }

}


// ==========================================
// LOAD SAVED REPORTS
// ==========================================

async function loadSavedClinicReports() {

    const container =
        document.getElementById("saved-clinic-reports");

    if (!container) return;


    try {

        const { data, error } = await supabaseClient
            .from("saved_clinic_reports")
            .select(`
                id,
                report_name,
                period_start,
                period_end,
                created_at
            `)
            .order("created_at", { ascending: false })
            .limit(10);


        if (error) throw error;


        if (!data || data.length === 0) {

            container.innerHTML = `
                <p class="text-sm text-slate-400">
                    No saved reports yet.
                </p>
            `;

            return;

        }


        container.innerHTML = `

            <div class="space-y-3">

                ${data.map(item => `

                    <div class="flex flex-wrap items-center
                                justify-between gap-3
                                border border-slate-100
                                rounded-xl p-3 hover:bg-slate-50">

                        <div>

                            <p class="text-sm font-semibold
                                      text-slate-800">

                                ${reportEscape(item.report_name)}

                            </p>

                            <p class="text-xs text-slate-500 mt-1">

                                ${reportEscape(item.period_start)}
                                to
                                ${reportEscape(item.period_end)}

                            </p>

                            <p class="text-xs text-slate-400 mt-1">

                                Saved:
                                ${new Date(item.created_at).toLocaleString()}

                            </p>

                        </div>


                        <button
                            onclick="openSavedClinicReport('${item.id}')"
                            class="bg-blue-50 hover:bg-blue-100
                                   text-blue-700 px-4 py-2
                                   rounded-lg text-sm font-semibold">

                            <i class="fa-solid fa-eye mr-1"></i>
                            Open Report

                        </button>

                    </div>

                `).join("")}

            </div>

        `;


    } catch (error) {

        console.error("Saved reports error:", error);

        container.innerHTML = `
            <p class="text-sm text-red-600">
                Unable to load saved reports:
                ${reportEscape(error.message)}
            </p>
        `;

    }

}


// ==========================================
// OPEN AN OLD SAVED REPORT
// ==========================================

async function openSavedClinicReport(id) {

    try {

        const { data, error } = await supabaseClient
            .from("saved_clinic_reports")
            .select("report_data")
            .eq("id", id)
            .single();


        if (error) throw error;


        currentClinicReport = data.report_data;

        renderClinicReportResults(currentClinicReport);


        document.getElementById("report-start-date").value =
            currentClinicReport.period_start;

        document.getElementById("report-end-date").value =
            currentClinicReport.period_end;


        document.getElementById("report-status").innerHTML = `

            <span class="text-green-700 font-semibold">

                <i class="fa-solid fa-folder-open mr-1"></i>
                Previously saved report opened successfully.

            </span>

        `;


        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });


    } catch (error) {

        console.error("Open saved report error:", error);

        alert("Unable to open report: " + error.message);

    }

}


// ==========================================
// EXPORT REPORT TO EXCEL-COMPATIBLE CSV
// ==========================================

function downloadClinicReportExcel() {

    if (!currentClinicReport) {

        alert("Generate a report first.");

        return;

    }


    const report = currentClinicReport;

    const summary = report.summary || {};


    const rows = [

        ["BUK CARE - CLINIC ACTIVITY REPORT"],

        ["Report Period", report.period_start, "to", report.period_end],

        ["Generated", report.generated_at],

        [],

        ["SUMMARY"],

        ["Metric", "Value"],

        ["Total Visits", summary.total_visits],

        ["New Patients", summary.new_patients],

        ["Completed Visits", summary.completed_visits],

        ["Waiting Visits", summary.waiting_visits],

        ["With Doctor", summary.with_doctor],

        ["At Diagnostics", summary.at_diagnostics],

        ["At Pharmacy", summary.at_pharmacy],

        ["Diagnostic Requests", summary.diagnostic_requests],

        ["Prescriptions", summary.prescriptions],

        ["Dispensed Items", summary.dispensed_items],

        ["Low Stock Items", summary.low_stock_items],

        ["Expiring Soon", summary.expiring_soon_items],

        ["Expired Items", summary.expired_items],

        [],

        ["VISIT TREND"],

        ["Period", "Visits"],

        ...(report.visit_trend || []).map(item => [
            item.label,
            item.visits
        ]),

        [],

        ["VISIT STATUS"],

        ["Status", "Total"],

        ...(report.status_breakdown || []).map(item => [
            item.status,
            item.total
        ]),

        [],

        ["DIAGNOSTICS"],

        ["Request Type", "Total"],

        ...(report.diagnostic_breakdown || []).map(item => [
            item.type,
            item.total
        ]),

        [],

        ["PHARMACY"],

        ["Prescription Status", "Total"],

        ...(report.prescription_breakdown || []).map(item => [
            item.status,
            item.total
        ])

    ];


    const csv = rows.map(row => {

        return row.map(value => {

            const text = String(value ?? "");

            return `"${text.replace(/"/g, '""')}"`;

        }).join(",");

    }).join("\r\n");


    // UTF-8 BOM helps Microsoft Excel display text correctly.
    const blob = new Blob(
        ["\uFEFF" + csv],
        { type: "text/csv;charset=utf-8;" }
    );


    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download =
        `BUK-Care-Clinic-Report-${report.period_start}-to-${report.period_end}.csv`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);

}

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


