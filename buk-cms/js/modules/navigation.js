// Navigation: controls which screen and role panel is visible.

const ROLE_PANELS = {
  "Records Officer": "panel-records",
  "Triage Nurse": "panel-nurse",
  "Doctor": "panel-doctor",
  "Diagnostics": "panel-diagnostics",
  "Pharmacist": "panel-pharmacy",
};

const ALL_PANEL_IDS = [
  ...Object.values(ROLE_PANELS),
  "panel-reports"
];


function showSection(sectionId) {
  // All main pages in BUK-CMS
const sectionIds = [
  "view-home",
  "login-section",
  "register-section",
  "student-login-section",
  "student-register-section",
  "dashboard-section",
  "student-dashboard-section",
  "clinic-registration-section"
];

  // Hide all pages first
  sectionIds.forEach((id) => {
    const section = document.getElementById(id);

    if (section) {
      section.classList.add("hidden");
    }
  });

  // Display the selected page
  const targetSection = document.getElementById(sectionId);

  if (targetSection) {
    targetSection.classList.remove("hidden");
  }

  // Show the Home navigation button only on the Home page
  const navHome = document.getElementById("nav-home");

  if (navHome) {
    navHome.style.display =
      sectionId === "view-home" ? "inline-block" : "none";
  }
}
function showRolePanel(role) {
  ALL_PANEL_IDS.forEach((id) => {
    const panel = document.getElementById(id);
    if (panel) panel.classList.add("hidden");
  });

  const targetPanelId = ROLE_PANELS[role];

  if (targetPanelId) {
    const targetPanel = document.getElementById(targetPanelId);
    if (targetPanel) targetPanel.classList.remove("hidden");
  }
}