
function handleStudentRegister(event) {
  // Stop the form from refreshing the page
  event.preventDefault();

  // Get the details entered by the student
  const regNo = document.getElementById("student-reg-no").value.trim();
  const fullName = document.getElementById("student-full-name").value.trim();
  const faculty = document.getElementById("student-faculty").value.trim();
  const department = document.getElementById("student-department").value.trim();
  const level = document.getElementById("student-level").value;
  const email = document.getElementById("student-register-email").value.trim().toLowerCase();
  const password = document.getElementById("student-register-password").value;
  const confirmPassword = document.getElementById("student-confirm-password").value;

  // Check that both passwords match
  if (password !== confirmPassword) {
    alert("Passwords do not match.");
    return;
  }

  // Check that all required details are provided
  if (
    !regNo ||
    !fullName ||
    !faculty ||
    !department ||
    !level ||
    !email ||
    !password
  ) {
    alert("Please fill in all the required fields.");
    return;
  }

  // Get existing student accounts from browser storage
  const students = JSON.parse(
    localStorage.getItem("bukcms_students") || "[]"
  );

  // Prevent duplicate registration numbers or email addresses
  const existingStudent = students.find(function (student) {
    return (
      student.regNo.toLowerCase() === regNo.toLowerCase() ||
      student.email === email
    );
  });

  if (existingStudent) {
    alert("This registration number or email is already registered.");
    return;
  }

  // Create the new student account
  const newStudent = {
    regNo: regNo,
    fullName: fullName,
    faculty: faculty,
    department: department,
    level: level,
    email: email,
    password: password,
    status: "Not Registered"
  };

  // Add the account to the existing list
  students.push(newStudent);

  // Save the updated list in browser storage
  localStorage.setItem("bukcms_students", JSON.stringify(students));

  alert("Student account created successfully. You can now log in.");

  // Clear the registration form
  document.getElementById("form-student-register").reset();

  // Return to Student Login
  showSection("student-login-section");
}


function handleStudentLogin(event) {
  // Stop the form from refreshing the page
  event.preventDefault();

  // Get the email and password entered by the student
  const email = document.getElementById("student-login-email").value.trim().toLowerCase();
  const password = document.getElementById("student-login-password").value;

  // Get the saved student accounts
  const students = JSON.parse(
    localStorage.getItem("bukcms_students") || "[]"
  );

  // Find a student with the matching email and password
  const student = students.find(function (student) {
    return student.email === email && student.password === password;
  });

  // Check whether the login details are correct
  if (!student) {
    alert("Invalid email or password.");
    return;
  }

  
  // Save the logged-in student's email for this demo
  localStorage.setItem("bukcms_student_email", student.email);

  // Display the student's information on the dashboard
  document.getElementById("dashboard-student-name").textContent =
    student.fullName;

  document.getElementById("dashboard-student-regno").textContent =
    student.regNo;

  document.getElementById("dashboard-student-faculty").textContent =
    student.faculty;

  document.getElementById("dashboard-student-department").textContent =
    student.department;

  document.getElementById("dashboard-student-level").textContent =
    student.level;

  // Show the welcome message
  alert("Welcome, " + student.fullName + "!");

  updateStudentClinicStatus(student.email);

  // Open the student dashboard
  showSection("student-dashboard-section");

}

// javascript


function startClinicRegistration() {
  // Get the logged-in student's email
  const email = localStorage.getItem("bukcms_student_email");

  if (!email) {
    alert("Please log in to continue.");
    showSection("student-login-section");
    return;
  }

  // Get saved student accounts
  const students = JSON.parse(
    localStorage.getItem("bukcms_students") || "[]"
  );

  // Find the logged-in student
  const student = students.find(function (student) {
    return student.email === email;
  });

  if (!student) {
    alert("Student account not found.");
    showSection("student-login-section");
    return;
  }

  // Get previous clinic registration requests
  const requests = JSON.parse(
    localStorage.getItem("bukcms_clinic_requests") || "[]"
  );

  // Find this student's previous request
  const previousRequest = requests.find(function (request) {
    return request.studentEmail === email;
  });

  // Open the clinic registration form
  showSection("clinic-registration-section");

  // Display existing student information
  const displayFields = {
    "clinic-display-name": student.fullName,
    "clinic-display-regno": student.regNo,
    "clinic-display-faculty": student.faculty,
    "clinic-display-department": student.department,
    "clinic-display-level": student.level
  };

  Object.keys(displayFields).forEach(function (id) {
    const element = document.getElementById(id);

    if (element) {
      element.textContent = displayFields[id] || "";
    }
  });

  // Separate the student's full name
  const nameParts = (student.fullName || "").trim().split(/\s+/);

  // Fill in the student's information
  const nameFields = {
    "clinic-surname": nameParts[0] || "",
    "clinic-first-name": nameParts[1] || "",
    "clinic-other-names": nameParts.slice(2).join(" "),
    "clinic-reg-no": student.regNo || "",
    "clinic-department": student.department || "",
    "clinic-faculty": student.faculty || "",
    "clinic-level": student.level || ""
  };

  Object.keys(nameFields).forEach(function (id) {
    const element = document.getElementById(id);

    if (element) {
      element.value = nameFields[id];
    }
  });

  // Restore previously entered information if the request was rejected
  if (previousRequest && previousRequest.status === "Rejected") {

    const biodata = previousRequest.patientBiodata || {};
    const healthForm = previousRequest.healthServiceForm || {};

    const previousFields = {
      "clinic-graduation-year": biodata.graduationYear,
      "clinic-phone": biodata.phone,
      "clinic-sex": biodata.sex,
      "clinic-dob": biodata.dateOfBirth,
      "clinic-kin-phone": biodata.nextOfKinPhone,

      "clinic-next-kin": healthForm.nextOfKinName,
      "clinic-kin-relationship": healthForm.relationship,
      "clinic-origin": healthForm.placeOfOrigin,
      "clinic-tribe": healthForm.tribe,
      "clinic-religion": healthForm.religion,
      "clinic-kin-address": healthForm.nextOfKinAddress,
      "clinic-occupation": healthForm.occupation
    };

    Object.keys(previousFields).forEach(function (id) {
      const element = document.getElementById(id);

      if (element) {
        element.value = previousFields[id] || "";
      }
    });

    // Restore the previous declaration choice
    const declaration = document.getElementById("clinic-declaration");

    if (declaration) {
      declaration.checked = previousRequest.declaration || false;
    }
  }
}

function handleStudentLogout() {
  // Remove only the current student's login session
  localStorage.removeItem("bukcms_student_email");

  // Return to the Home page
  showSection("view-home");

  alert("You have logged out successfully.");
}




function submitClinicRegistration(event) {
  event.preventDefault();

  // 1. Get the logged-in student's email
  const email = localStorage.getItem("bukcms_student_email");

  if (!email) {
    alert("Please log in to continue.");
    showSection("student-login-section");
    return;
  }

  // 2. Get student account information
  const students = JSON.parse(
    localStorage.getItem("bukcms_students") || "[]"
  );

  const student = students.find(function (item) {
    return item.email === email;
  });

  if (!student) {
    alert("Student account not found.");
    return;
  }

  // 3. Get existing clinic registration requests
  const requests = JSON.parse(
    localStorage.getItem("bukcms_clinic_requests") || "[]"
  );

  const existingIndex = requests.findIndex(function (request) {
    return request.studentEmail === email;
  });

  const existingRequest =
    existingIndex !== -1 ? requests[existingIndex] : null;

  // 4. Prevent resubmission if already Pending or Approved
  if (
    existingRequest &&
    existingRequest.status !== "Rejected"
  ) {
    alert("You already have a submitted clinic registration request.");
    return;
  }

  // 5. Collect uploaded documents
  const admissionLetter =
    document.getElementById("clinic-admission-letter").files[0];

  const passport =
    document.getElementById("clinic-passport").files[0];

  const medicalCertificate =
    document.getElementById("clinic-medical-certificate").files[0];

  // 6. Collect clinic registration information
  const clinicRequest = {
    id: existingRequest ? existingRequest.id : Date.now(),

    studentEmail: email,

    studentInformation: {
      fullName: student.fullName,
      regNo: student.regNo,
      faculty: student.faculty,
      department: student.department,
      level: student.level,
      email: student.email
    },

    patientBiodata: {
      graduationYear: document.getElementById("clinic-graduation-year").value,
      phone: document.getElementById("clinic-phone").value.trim(),
      sex: document.getElementById("clinic-sex").value,
      dateOfBirth: document.getElementById("clinic-dob").value,
      nextOfKinPhone: document.getElementById("clinic-kin-phone").value.trim()
    },

    healthServiceForm: {
      nextOfKinName: document.getElementById("clinic-next-kin").value.trim(),
      relationship: document.getElementById("clinic-kin-relationship").value.trim(),
      placeOfOrigin: document.getElementById("clinic-origin").value.trim(),
      tribe: document.getElementById("clinic-tribe").value.trim(),
      religion: document.getElementById("clinic-religion").value.trim(),
      nextOfKinAddress: document.getElementById("clinic-kin-address").value.trim(),
      occupation: document.getElementById("clinic-occupation").value.trim()
    },

    documents: {
      admissionLetter: admissionLetter
        ? admissionLetter.name
        : (existingRequest ? existingRequest.documents.admissionLetter : ""),

      passport: passport
        ? passport.name
        : (existingRequest ? existingRequest.documents.passport : ""),

      medicalCertificate: medicalCertificate
        ? medicalCertificate.name
        : (existingRequest ? existingRequest.documents.medicalCertificate : "")
    },

    declaration: document.getElementById("clinic-declaration").checked,

    status: "Pending",
    clinicNumber: null,
    submittedAt: new Date().toISOString()
  };

  // 7. Check required documents
  if (
    !clinicRequest.documents.admissionLetter ||
    !clinicRequest.documents.passport ||
    !clinicRequest.documents.medicalCertificate
  ) {
    alert("Please upload all required documents.");
    return;
  }

  if (!clinicRequest.declaration) {
    alert("Please accept the declaration before submitting.");
    return;
  }

  // 8. Save new request or update rejected request
  if (existingRequest) {
    requests[existingIndex] = clinicRequest;
  } else {
    requests.push(clinicRequest);
  }

  localStorage.setItem(
    "bukcms_clinic_requests",
    JSON.stringify(requests)
  );

  alert(
    existingRequest
      ? "Your corrected registration has been resubmitted successfully. It is now pending review."
      : "Clinic registration submitted successfully. Your request is pending review."
  );

  // 9. Reset form and update dashboard
  document.getElementById("form-clinic-registration").reset();

  updateStudentClinicStatus(email);

  showSection("student-dashboard-section");
}



// javascript
function updateStudentClinicStatus(email) {
  // Get saved clinic registration requests
  const requests = JSON.parse(
    localStorage.getItem("bukcms_clinic_requests") || "[]"
  );

  // Find this student's registration request
  const request = requests.find(function (item) {
    return item.studentEmail === email;
  });

  // Get dashboard elements
  const statusElement = document.getElementById("student-clinic-status");
  const clinicNumberBox = document.getElementById("student-clinic-number-box");
  const clinicNumberElement = document.getElementById("student-clinic-number");
  const rejectionBox = document.getElementById("student-clinic-rejection-box");
  const rejectionReasonElement = document.getElementById("student-clinic-rejection-reason");
  const registerButton = document.getElementById("student-clinic-register-button");

  if (!statusElement) return;

  // Hide additional information by default
  if (clinicNumberBox) clinicNumberBox.classList.add("hidden");
  if (rejectionBox) rejectionBox.classList.add("hidden");

  // No registration request yet
  if (!request) {
    statusElement.textContent = "Not Registered";
    statusElement.className = "font-semibold text-slate-500";

    if (registerButton) {
      registerButton.classList.remove("hidden");
      registerButton.textContent = "Complete Clinic Registration";
    }

    return;
  }

  // Display current status
  statusElement.textContent = request.status;

  // Pending request
  if (request.status === "Pending") {
    statusElement.className = "font-semibold text-orange-600";

    if (registerButton) {
      registerButton.classList.add("hidden");
    }
  }

  // Approved request
  else if (request.status === "Approved") {
    statusElement.className = "font-semibold text-green-600";

    if (clinicNumberBox) {
      clinicNumberBox.classList.remove("hidden");
    }

    if (clinicNumberElement) {
      clinicNumberElement.textContent = request.clinicNumber || "Not assigned";
    }

    if (registerButton) {
      registerButton.classList.add("hidden");
    }
  }

  // Rejected request
  else if (request.status === "Rejected") {
    statusElement.className = "font-semibold text-red-600";

    if (rejectionBox) {
      rejectionBox.classList.remove("hidden");
    }

    if (rejectionReasonElement) {
      rejectionReasonElement.textContent =
        request.rejectionReason || "No rejection reason was provided.";
    }

    if (registerButton) {
      registerButton.classList.remove("hidden");
      registerButton.textContent = "Review Registration";
    }
  }
}


