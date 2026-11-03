// Login / logout
// --------------

function handleLogin(event) {
  event.preventDefault();

  // Get the email and password entered by the user
  const email = document.getElementById("email").value.trim().toLowerCase();
  const password = document.getElementById("password").value;

  // Demo accounts for testing each staff dashboard
  const demoAccounts = {
    "records@bukcms.demo": "Records Officer",
    "nurse@bukcms.demo": "Triage Nurse",
    "doctor@bukcms.demo": "Doctor",
    "diagnostics@bukcms.demo": "Diagnostics",
    "pharmacy@bukcms.demo": "Pharmacist"
  };

  // Check whether the email and password are correct
  if (!demoAccounts[email] || password !== "demo123") {
    alert("Invalid demo email or password. Please try again.");
    return;
  }

  // Set the role associated with the demo email
  const role = demoAccounts[email];
  currentRole = role;

  // Save the demo role so the dashboard can be restored after refresh
  localStorage.setItem("bukcms_role", role);

  // Display the staff role in the navbar
  document.getElementById("current-role-title").innerText = role;

  const roleBadge = document.getElementById("role-badge");
  roleBadge.classList.remove("hidden");
  roleBadge.classList.add("flex");

  // Change the Login button to Logout
  const loginBtn = document.getElementById("btn-login-toggle");
  loginBtn.innerHTML =
    '<i class="fa-solid fa-right-from-bracket mr-1"></i> Logout';

  loginBtn.className =
    "bg-red-600 hover:bg-red-700 text-white text-xs px-4 py-2 rounded font-semibold transition shadow";

  loginBtn.setAttribute("onclick", "handleLogout()");

  // Show the dashboard and hide the login form
  showSection("dashboard-section");

  // Reset the login form
  document.getElementById("form-login").reset();

  // Show the Reports navigation option
  document.getElementById("nav-reports").classList.remove("hidden");

  // Open the correct dashboard for this staff role
  enterDashboard(role);
}


function handleLogout() {
  currentRole = null;
  localStorage.removeItem('bukcms_role');

  const roleBadge = document.getElementById('role-badge');
  roleBadge.classList.remove('flex');
  roleBadge.classList.add('hidden');

  const loginBtn = document.getElementById('btn-login-toggle');
  loginBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket mr-1"></i> Staff Login';
  loginBtn.className = "bg-blue-500 hover:bg-blue-600 text-white text-xs px-4 py-2 rounded font-semibold transition shadow";
  loginBtn.setAttribute('onclick', "showSection('login-section')");
  document.getElementById('nav-reports').classList.add('hidden');

  showSection('view-home');
  document.getElementById('form-login').reset();
}


function handleRegister(event) {
  event.preventDefault();

  // Get the information entered in the registration form
  const fullName = document.getElementById("staff-name").value.trim();
  const staffId = document.getElementById("staff-id").value.trim();
  const email = document.getElementById("register-email").value.trim().toLowerCase();
  const password = document.getElementById("register-password").value;
  const confirmPassword = document.getElementById("confirm-password").value;

  // Check that the passwords match
  if (password !== confirmPassword) {
    alert("Passwords do not match. Please try again.");
    return;
  }

  // Check that the password has at least 8 characters
  if (password.length < 8) {
    alert("Password must contain at least 8 characters.");
    return;
  }

  // Stop registration if any required field is empty
  if (!fullName || !staffId || !email || !password) {
    alert("Please complete all required fields.");
    return;
  }

  // Explain that real registration is not connected yet
  alert(
    "Your form has been validated, but account registration is not active yet. Supabase Auth and staff verification must be connected first."
  );

  // Clear the form after validation
  document.getElementById("form-register").reset();

  // Return to the login page
  showSection("login-section");
}

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


