// Navigation: controls which screen and role panel is visible.

const ROLE_PANELS = {
    "Records Officer": "panel-records",
    "Triage Nurse": "panel-nurse",
    "Doctor": "panel-doctor",
    "Diagnostics": "panel-diagnostics",
    "Pharmacist": "panel-pharmacy",
    "Administrator": "panel-admin"
};

const ALL_PANEL_IDS = [
  ...Object.values(ROLE_PANELS),
  "panel-reports"
];


// ==========================================
// MAIN PAGE NAVIGATION
// ==========================================

function showSection(sectionId) {

    // All main pages.
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


    // Hide all pages first.
    sectionIds.forEach(id => {

        const section = document.getElementById(id);

        if (section) {
            section.classList.add("hidden");
        }

    });


    // Show the selected page.
    const targetSection = document.getElementById(sectionId);

    if (targetSection) {

        targetSection.classList.remove("hidden");

    } else {

        console.error("Navigation section not found:", sectionId);

    }


    // Homepage footer appears ONLY on Homepage.
    const homeFooter = document.getElementById("home-footer");

    if (homeFooter) {

        homeFooter.classList.toggle(
            "hidden",
            sectionId !== "view-home"
        );

    }


    // Home navigation button.
    const navHome = document.getElementById("nav-home");

    if (navHome) {

        navHome.style.display =
            sectionId === "view-home" ? "inline-block" : "none";

    }


    // Close mobile navigation when changing pages.
    if (typeof closeMobileNav === "function") {

        closeMobileNav();

    }


    // Reset Staff Login form when opening it.
    if (sectionId === "login-section") {

        const loginForm = document.getElementById("form-login");

        if (loginForm) {
            loginForm.reset();
        }

        const passwordInput = document.getElementById("password");

        if (passwordInput) {

            passwordInput.type = "password";

            const eyeButton =
                passwordInput.parentElement.querySelector("button i");

            if (eyeButton) {

                eyeButton.classList.remove("fa-eye-slash");

                eyeButton.classList.add("fa-eye");

            }

        }

    }


    // Clear Student Login fields.
    if (sectionId === "student-login-section") {

        const emailInput =
            document.getElementById("student-login-email");

        const passwordInput =
            document.getElementById("student-login-password");


        if (emailInput) emailInput.value = "";

        if (passwordInput) passwordInput.value = "";

    }


    // Always start the selected page from the top.
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

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

/// ==========================================
// RESPONSIVE MOBILE NAVIGATION
// ==========================================


// Sync mobile buttons with desktop authentication state.

function syncMobileNavButtons() {

    const desktopStudent =
        document.getElementById("btn-student-login");

    const desktopStaff =
        document.getElementById("btn-login-toggle");

    const mobileStudent =
        document.getElementById("mobile-btn-student-login");

    const mobileStaff =
        document.getElementById("mobile-btn-login-toggle");


    // Synchronise Patient Login.

    if (desktopStudent && mobileStudent) {

        mobileStudent.innerHTML = desktopStudent.innerHTML;

        mobileStudent.classList.toggle(
            "hidden",
            desktopStudent.classList.contains("hidden")
        );

        // Keep mobile buttons visually consistent.
        mobileStudent.className =
            "w-full bg-white hover:bg-blue-100 text-blue-700 " +
            "px-4 py-3 rounded-xl text-sm font-semibold " +
            "flex items-center justify-center gap-2";

        mobileStudent.classList.toggle(
            "hidden",
            desktopStudent.classList.contains("hidden")
        );

    }


    // Synchronise Staff Login / Logout.

    if (desktopStaff && mobileStaff) {

        mobileStaff.innerHTML = desktopStaff.innerHTML;

        const isLogout =
            desktopStaff.getAttribute("onclick")?.includes("handleLogout");

        mobileStaff.className = isLogout
            ? "w-full bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            : "w-full bg-white hover:bg-blue-100 text-blue-700 px-4 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2";

    }


    // Synchronise Reports visibility.

    const desktopReports =
        document.getElementById("nav-reports");

    const mobileReports =
        document.getElementById("nav-reports-mobile");


    if (desktopReports && mobileReports) {

        const canSeeReports =
            !desktopReports.classList.contains("hidden") &&
            desktopReports.style.display !== "none";

        mobileReports.classList.toggle(
            "hidden",
            !canSeeReports
        );

    }


    // Synchronise Role Badge.

    const desktopBadge =
        document.getElementById("role-badge");

    const mobileBadge =
        document.getElementById("mobile-role-badge");

    const desktopRole =
        document.getElementById("current-role-title");

    const mobileRole =
        document.getElementById("mobile-current-role-title");


    if (desktopBadge && mobileBadge) {

        mobileBadge.classList.toggle(
            "hidden",
            desktopBadge.classList.contains("hidden")
        );

    }

    if (desktopRole && mobileRole) {

        mobileRole.textContent = desktopRole.textContent;

    }

}


// OPEN MENU

function toggleMobileNav() {

    const menu =
        document.getElementById("mobile-nav-menu");

    const button =
        document.getElementById("mobile-menu-toggle");

    if (!menu || !button) return;


    const isOpening =
        menu.classList.contains("hidden");


    if (isOpening) {

        syncMobileNavButtons();

        menu.classList.remove("hidden");

        button.setAttribute("aria-expanded", "true");

        button.innerHTML =
            '<i class="fa-solid fa-xmark text-xl"></i>';

        button.setAttribute("aria-label", "Close navigation menu");

    } else {

        closeMobileNav();

    }

}


// CLOSE MENU

function closeMobileNav() {

    const menu =
        document.getElementById("mobile-nav-menu");

    const button =
        document.getElementById("mobile-menu-toggle");


    if (menu) {

        menu.classList.add("hidden");

    }

    if (button) {

        button.setAttribute("aria-expanded", "false");

        button.setAttribute("aria-label", "Open navigation menu");

        button.innerHTML =
            '<i class="fa-solid fa-bars text-xl"></i>';

    }

}