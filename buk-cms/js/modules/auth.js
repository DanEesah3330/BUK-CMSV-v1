
 // Login / logout using Supabase Auth
// ----------------------------------

async function handleLogin(event) {
  event.preventDefault();

  // Get the email and password entered by the user.
  const email = document.getElementById("email").value.trim().toLowerCase();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    alert("Please enter your email and password.");
    return;
  }

  // Sign in with Supabase Authentication.
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: email,
    password: password
  });

  if (error) {
    alert("Login failed: " + error.message);
    return;
  }

  // Retrieve the user's role from their Supabase profile.
  const { data: profile, error: profileError } = await supabaseClient
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (profileError || !profile) {
    await supabaseClient.auth.signOut();
    alert("Your account profile was not found. Please contact the administrator.");
    return;
  }

  // Students use the separate Student Portal.
  if (profile.role === "student") {
    await supabaseClient.auth.signOut();
    alert("Please use the Student Portal to sign in.");
    return;
  }

  // Check that the account has an accepted staff role.
  if (!AUTH_ROLE_LABELS[profile.role]) {
    await supabaseClient.auth.signOut();
    alert("Your account does not have a valid staff role.");
    return;
  }

  // Open the dashboard using the role from Supabase.
  document.getElementById("form-login").reset();
  openStaffDashboard(profile.role);
}


// Sign out from Supabase.
async function handleLogout() {
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    alert("Logout failed: " + error.message);
    return;
  }

  currentRole = null;

  const clinicSearch = document.getElementById("search-matric");

if (clinicSearch) {
    clinicSearch.value = "";
}

  // Hide role badge.
  const roleBadge = document.getElementById("role-badge");

  if (roleBadge) {
    roleBadge.classList.remove("flex");
    roleBadge.classList.add("hidden");
  }

  // Restore Staff Login button.
  const loginBtn = document.getElementById("btn-login-toggle");

  if (loginBtn) {
    loginBtn.innerHTML =
      '<i class="fa-solid fa-right-to-bracket mr-1"></i> Staff Login';

    loginBtn.className =
      "bg-blue-700 hover:bg-blue-800 text-white text-sm px-4 py-2.5 rounded-lg font-semibold transition shadow";

    loginBtn.setAttribute("onclick", "showSection('login-section')");
  }

  // Restore Student Login button.
  const studentLoginBtn = document.getElementById("btn-student-login");

  if (studentLoginBtn) {
    studentLoginBtn.classList.remove("hidden");
  }

  // Hide Reports.
 const reportsNav =
    document.getElementById("nav-reports");

const reportsNavMobile =
    document.getElementById("nav-reports-mobile");

[reportsNav, reportsNavMobile].forEach(button => {

    if (!button) return;

    button.classList.add("hidden");

    button.style.display = "none";

});

  // Clear login form.
  const loginForm = document.getElementById("form-login");

  if (loginForm) loginForm.reset();

  showSection("view-home");
}

// Public staff registration is disabled.
// Staff accounts must be created by an authorised administrator.
function handleRegister(event) {
  event.preventDefault();

  alert(
    "Staff account registration is restricted. Please contact the system administrator to create your account."
  );

  showSection("login-section");
}


// Show or hide password.
function togglePassword(inputId, button) {
  const passwordInput = document.getElementById(inputId);
  const eyeIcon = button.querySelector("i");

  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    eyeIcon.classList.replace("fa-eye", "fa-eye-slash");
    button.setAttribute("aria-label", "Hide password");
    button.title = "Hide password";
  } else {
    passwordInput.type = "password";
    eyeIcon.classList.replace("fa-eye-slash", "fa-eye");
    button.setAttribute("aria-label", "Show password");
    button.title = "Show password";
  }
}
