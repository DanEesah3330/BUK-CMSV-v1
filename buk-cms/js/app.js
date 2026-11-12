
// app.js — controls what users see and which dashboard opens.
// Database functions are handled separately in data.js.

// Global variables
let currentRole = null;
let foundStudent = null;
let openVisitId = null;


// Convert Supabase role values into dashboard names.
const AUTH_ROLE_LABELS = {
    records: "Records Officer",
    nurse: "Triage Nurse",
    doctor: "Doctor",
    diagnostics: "Diagnostics",
    pharmacy: "Pharmacist",
    admin: "Administrator"
};


// Opens the correct dashboard for the authenticated staff member.
function enterDashboard(role) {
  showRolePanel(role);

  if (role === "Records Officer") renderQueue();
  if (role === "Triage Nurse") renderNurseQueue();
  if (role === "Doctor") renderDoctorQueue();
  if (role === "Diagnostics") renderDiagnostics();
  if (role === "Pharmacist") showPharmTab("rx");
}


// Updates the navigation bar after successful authentication.
function updateLoginInterface(role) {
  const roleTitle = document.getElementById("current-role-title");
  const roleBadge = document.getElementById("role-badge");
  const loginBtn = document.getElementById("btn-login-toggle");
  const studentLoginBtn = document.getElementById("btn-student-login");
  const reportsNav = document.getElementById("nav-reports");
  const reportsNavMobile =
    document.getElementById("nav-reports-mobile");

  if (roleTitle) roleTitle.innerText = role;

  if (roleBadge) {
    roleBadge.classList.remove("hidden");
    roleBadge.classList.add("flex");
  }

  // Change Staff Login to Logout.
  if (loginBtn) {
    loginBtn.innerHTML =
      '<i class="fa-solid fa-right-from-bracket mr-1"></i> Logout';

    loginBtn.className =
      "bg-red-600 hover:bg-red-700 text-white text-xs px-4 py-2 rounded font-semibold transition shadow";

    loginBtn.setAttribute("onclick", "handleLogout()");
  }

  // Hide Student Login while staff is logged in.
  if (studentLoginBtn) {
    studentLoginBtn.classList.add("hidden");
  }

// Only Records Officer and Administrator can access Reports.

// Only Records Officer and Administrator can access Reports.

const canAccessReports = [
    "Records Officer",
    "Administrator"
].includes(role);


const reportsButtons = [
    document.getElementById("nav-reports")
];

reportsButtons.forEach(button => {

    if (!button) return;

    button.classList.toggle("hidden", !canAccessReports);

    button.style.display =
        canAccessReports ? "inline-flex" : "none";

});
}

// Opens a staff dashboard using the role retrieved from Supabase.
function openStaffDashboard(databaseRole) {
  const role = AUTH_ROLE_LABELS[databaseRole];

  if (!role || !ROLE_PANELS[role]) {
    console.error("Invalid or unsupported staff role:", databaseRole);
    showSection("view-home");
    return;
  }

  currentRole = role;

  updateLoginInterface(role);
  showSection("dashboard-section");
  enterDashboard(role);
}


// Restore the authenticated staff session after a browser refresh.
// Restore Student or Staff session after browser refresh.
document.addEventListener("DOMContentLoaded", async function () {

    console.log("BUK Care: Checking saved session...");

    try {
        console.time("Session restoration");

        const { data, error } =
            await supabaseClient.auth.getSession();

        if (error) throw error;

        const session = data.session;

        if (!session) {
            currentRole = null;
            showSection("view-home");
            console.log("BUK Care: No active session.");
            console.timeEnd("Session restoration");
            return;
        }

        console.log("BUK Care: Session found.");

        // Retrieve the user's profile and role.
        console.time("Profile loading");

        const { data: profile, error: profileError } =
            await supabaseClient
                .from("profiles")
                .select("role, student_matric")
                .eq("id", session.user.id)
                .single();

        console.timeEnd("Profile loading");

        if (profileError) throw profileError;

        if (!profile) {
            throw new Error("User profile was not found.");
        }

        console.log("BUK Care: User role:", profile.role);

        // STUDENT
        if (profile.role === "student") {

            currentRole = null;

            const user = session.user;
            const meta = user.user_metadata || {};

            localStorage.setItem("bukcms_student_email", user.email);
            localStorage.setItem("bukcms_student_id", user.id);

            // Safely update Student Dashboard information.
            const studentFields = {
                "dashboard-student-name": meta.full_name || user.email,
                "dashboard-student-regno": profile.student_matric || "N/A",
                "dashboard-student-faculty": meta.faculty || "N/A",
                "dashboard-student-department": meta.department || "N/A",
                "dashboard-student-level": meta.level || "N/A"
            };

            Object.entries(studentFields).forEach(([id, value]) => {
                const element = document.getElementById(id);

                if (element) {
                    element.textContent = value;
                } else {
                    console.warn("Missing HTML element:", id);
                }
            });

            updateStudentLoginInterface(true);

            // Open dashboard immediately.
            showSection("student-dashboard-section");

            // Load registration status without delaying dashboard opening.
            updateStudentClinicStatus().catch(error => {
                console.error("Student status loading failed:", error);
            });

            console.timeEnd("Session restoration");
            return;
        }

        // STAFF
        localStorage.removeItem("bukcms_student_email");
        localStorage.removeItem("bukcms_student_id");

        console.time("Staff dashboard loading");

        openStaffDashboard(profile.role);

        console.timeEnd("Staff dashboard loading");
        console.timeEnd("Session restoration");

    } catch (error) {

        console.error("BUK Care session restoration failed:", error);

        alert(
            "Unable to restore your dashboard: " + error.message
        );

        showSection("view-home");
    }
});