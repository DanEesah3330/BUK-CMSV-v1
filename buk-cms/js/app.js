// app.js — all the SCREEN logic (what the user sees/clicks). Data storage lives in data.js.
// Loaded after data.js, so every function in data.js is already available here


// (Global variable) secure all needed items in any page
let currentRole = null;   // "Records Officer" | "Triage Nurse" | "Doctor" | "Pharmacist"
let foundStudent = null;  // result of the last lookupStudent() call
let openVisitId = null;   // the visit currently open on the Nurse/Doctor screen







// Opens the correct panel and draws its first data. This is the "router" for roles.

function enterDashboard(role) {
  // Open only the panel assigned to this staff role.
  showRolePanel(role);

  if (role === "Records Officer") renderQueue();
  if (role === "Triage Nurse") renderNurseQueue();
  if (role === "Doctor") renderDoctorQueue();

  if (role === "Diagnostics") renderDiagnostics();

  if (role === "Pharmacist") showPharmTab("rx");
}


// Restore the staff dashboard after a browser refresh.
document.addEventListener("DOMContentLoaded", function () {
  const savedRole = localStorage.getItem("bukcms_role");

  if (!savedRole || !ROLE_PANELS[savedRole]) {
    showSection("view-home");
    return;
  }

  currentRole = savedRole;

  const roleTitle = document.getElementById("current-role-title");
  const roleBadge = document.getElementById("role-badge");
  const loginBtn = document.getElementById("btn-login-toggle");
  const reportsNav = document.getElementById("nav-reports");

  if (roleTitle) roleTitle.innerText = savedRole;

  if (roleBadge) {
    roleBadge.classList.remove("hidden");
    roleBadge.classList.add("flex");
  }

  if (loginBtn) {
    loginBtn.innerHTML =
      '<i class="fa-solid fa-right-from-bracket mr-1"></i> Logout';

    loginBtn.className =
      "bg-red-600 hover:bg-red-700 text-white text-xs px-4 py-2 rounded font-semibold transition shadow";

    loginBtn.setAttribute("onclick", "handleLogout()");
  }

  if (reportsNav) reportsNav.classList.remove("hidden");

  showSection("dashboard-section");
  enterDashboard(savedRole);
});
// RECORDS OFFICER: look up, auto-fill, register, queue
// corrections











// // Resume session on refresh (nice to have, not required)

// window.addEventListener('DOMContentLoaded', () => {
//   const saved = localStorage.getItem('bukcms_role');
//   if (saved) {
//     currentRole = saved;
//     document.getElementById('current-role-title').innerText = saved;
//     document.getElementById('role-badge').classList.remove('hidden');
//     document.getElementById('role-badge').classList.add('flex');
//     const loginBtn = document.getElementById('btn-login-toggle');
//     loginBtn.innerHTML = '<i class="fa-solid fa-right-from-bracket mr-1"></i> Logout';
//     loginBtn.className = "bg-red-600 hover:bg-red-700 text-white text-xs px-4 py-2 rounded font-semibold transition shadow";
//     loginBtn.setAttribute('onclick', 'handleLogout()');
//     document.getElementById('nav-reports').classList.remove('hidden');
//     showSection('dashboard-section');
//     enterDashboard(saved);
//   }
// });
