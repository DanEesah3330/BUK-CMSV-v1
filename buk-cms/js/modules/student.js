

// Stores the rejected registration request being edited.
let currentRejectedClinicRequest = null;
// ==========================================
// STUDENT PORTAL MODULE (Supabase Integrated)
// ==========================================

// Handle Student Registration
// Handle Student Registration
async function handleStudentRegister(event) {
    event.preventDefault();

    const regNo = document.getElementById("student-reg-no").value.trim();
    const fullName = document.getElementById("student-full-name").value.trim();
    const faculty = document.getElementById("student-faculty").value.trim();
    const department = document.getElementById("student-department").value.trim();
    const level = document.getElementById("student-level").value;

    const email = document.getElementById("student-register-email")
        .value.trim().toLowerCase();

    const password = document.getElementById("student-register-password").value;
    const confirmPassword = document.getElementById("student-confirm-password").value;

    if (password !== confirmPassword) {
        alert("Passwords do not match.");
        return;
    }

    if (!regNo || !fullName || !faculty || !department ||
        !level || !email || !password) {

        alert("Please fill in all the required fields.");
        return;
    }

    const registerButton = event.submitter;

    try {

        if (registerButton) {
            registerButton.disabled = true;
            registerButton.textContent = "Creating account...";
        }

        const { data: authData, error: authError } =
            await supabaseClient.auth.signUp({

                email: email,
                password: password,

                options: {
                    data: {
                        full_name: fullName,
                        reg_no: regNo,
                        faculty: faculty,
                        department: department,
                        level: level,
                        role: "student"
                    }
                }
            });

        if (authError) {
            throw authError;
        }

        if (!authData.user) {
            throw new Error("Student account could not be created.");
        }

        // Supabase trigger automatically creates:
        // 1. students_registry reference
        // 2. Student profile

        alert(
            "Student account created successfully. You can now log in."
        );

        document.getElementById("form-student-register").reset();

        showSection("student-login-section");

    } catch (error) {

        console.error("Student registration error:", error);

        alert("Registration failed: " + error.message);

    } finally {

        if (registerButton) {
            registerButton.disabled = false;
            registerButton.textContent = "Create Account";
        }
    }
}

// ==========================================
// HANDLE STUDENT LOGIN
// ==========================================

async function handleStudentLogin(event) {

    event.preventDefault();

    const emailInput =
        document.getElementById("student-login-email");

    const passwordInput =
        document.getElementById("student-login-password");

    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    if (!email || !password) {
        alert("Please enter your email and password.");
        return;
    }

    const loginButton = event.submitter;
    const originalText = loginButton?.textContent;

    try {

        if (loginButton) {
            loginButton.disabled = true;
            loginButton.textContent = "Signing in...";
        }

        // Sign in through Supabase Authentication.
        const { data, error } =
            await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });

        if (error) {
            throw error;
        }

        const user = data.user;

        // Get the student's database profile.
        const { data: profile, error: profileError } =
            await supabaseClient
                .from("profiles")
                .select("full_name, role, student_matric")
                .eq("id", user.id)
                .single();

        if (profileError || !profile) {

            await supabaseClient.auth.signOut();

            throw new Error(
                "Student profile was not found. Please contact the administrator."
            );
        }

        // Ensure this is a Student account.
        if (profile.role !== "student") {

            await supabaseClient.auth.signOut();

            throw new Error(
                "This account is not registered as a student account."
            );
        }

        if (!profile.student_matric) {

            await supabaseClient.auth.signOut();

            throw new Error(
                "Your student matric number is missing from your profile."
            );
        }

        // Store student session information.
        localStorage.setItem("bukcms_student_email", user.email);
        localStorage.setItem("bukcms_student_id", user.id);

        const meta = user.user_metadata || {};

        // Display student information.
        const studentFields = {
            "dashboard-student-name":
                profile.full_name || meta.full_name || user.email,

            "dashboard-student-regno":
                profile.student_matric,

            "dashboard-student-faculty":
                meta.faculty || "N/A",

            "dashboard-student-department":
                meta.department || "N/A",

            "dashboard-student-level":
                meta.level || "N/A"
        };

        Object.entries(studentFields).forEach(([id, value]) => {

            const element = document.getElementById(id);

            if (element) {
                element.textContent = value;
            }

        });

        // Update Student and Staff login buttons.
        updateStudentLoginInterface(true);

        // Open Student Dashboard immediately.
        showSection("student-dashboard-section");

        // Load registration status.
        updateStudentClinicStatus().catch(error => {
            console.error(
                "Student clinic status loading failed:",
                error
            );
        });

        console.log("Student login successful:", profile.student_matric);

    } catch (error) {

        console.error("Student login error:", error);

        alert("Login failed: " + error.message);

    } finally {

        if (loginButton) {
            loginButton.disabled = false;
            loginButton.textContent = originalText;
        }

    }
}

// Start Clinic Registration Form
// Start new registration or edit a rejected registration.
async function startClinicRegistration() {

    try {

        const { data: { user }, error: authError } =
            await supabaseClient.auth.getUser();

        if (authError || !user) {
            alert("Please log in to continue.");
            showSection("student-login-section");
            return;
        }

        // Get student profile.
        const { data: profile, error: profileError } =
            await supabaseClient
                .from("profiles")
                .select("student_matric, full_name, role")
                .eq("id", user.id)
                .single();

        if (profileError || !profile) {
            throw new Error("Student profile could not be found.");
        }

        const matric = profile.student_matric;

        // Check whether the student already has a patient profile.
        const { data: patient, error: patientError } =
            await supabaseClient
                .from("patients")
                .select("clinic_number")
                .eq("matric", matric)
                .maybeSingle();

        if (patientError) throw patientError;

        if (patient) {

            alert(
                "Your clinic registration is already approved.\nClinic Number: " +
                patient.clinic_number
            );

            await updateStudentClinicStatus();
            showSection("student-dashboard-section");
            return;
        }

        // Get the student's latest registration request.
        const { data: request, error: requestError } =
            await supabaseClient
                .from("clinic_registration_requests")
                .select("*")
                .eq("matric", matric)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

        if (requestError) throw requestError;

        // Prevent duplicate submissions while Pending.
        if (request && request.status === "Pending") {

            alert("Your registration is already awaiting review.");

            await updateStudentClinicStatus();
            showSection("student-dashboard-section");
            return;
        }

        // Only Rejected requests can be edited and resubmitted.
        currentRejectedClinicRequest =
            request && request.status === "Rejected" ? request : null;

        const meta = user.user_metadata || {};

        const name = request?.full_name || meta.full_name || "";

        // Display student information.
        const displayFields = {
            "clinic-display-name": name,
            "clinic-display-regno": matric,
            "clinic-display-faculty": meta.faculty || "",
            "clinic-display-department": request?.department || meta.department || "",
            "clinic-display-level": meta.level || ""
        };

        Object.entries(displayFields).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });

        // Display name fields.
        const nameParts = name.trim().split(/\s+/);

        const firstName = nameParts[0] || "";
        const secondName = nameParts[1] || "";

        const setValue = (id, value) => {
            const element = document.getElementById(id);
            if (element) element.value = value ?? "";
        };

        // Student information.
        setValue("clinic-surname", firstName);
        setValue("clinic-first-name", secondName);
        setValue("clinic-other-names", nameParts.slice(2).join(" "));

        setValue("clinic-reg-no", matric);
        setValue("clinic-department", request?.department || meta.department);
        setValue("clinic-faculty", meta.faculty);
        setValue("clinic-level", meta.level);

        // Restore previously submitted biodata.
        setValue("clinic-graduation-year", request?.graduation_year);
        setValue("clinic-phone", request?.phone);
        setValue("clinic-sex", request?.sex);
        setValue("clinic-dob", request?.date_of_birth);
        setValue("clinic-kin-phone", request?.next_of_kin_phone);
        setValue("clinic-next-kin", request?.next_of_kin_name);
        setValue("clinic-kin-relationship", request?.next_of_kin_relationship);
        setValue("clinic-kin-address", request?.next_of_kin_address);
        setValue("clinic-origin", request?.place_of_origin);
        setValue("clinic-tribe", request?.tribe);
        setValue("clinic-religion", request?.religion);
        setValue("clinic-occupation", request?.occupation);
        setValue("clinic-allergy", request?.allergy);

        // Show the rejection reason inside the form.
        let notice = document.getElementById("clinic-resubmission-notice");

        const registrationForm =
            document.getElementById("form-clinic-registration");

        if (!notice && registrationForm) {

            notice = document.createElement("div");
            notice.id = "clinic-resubmission-notice";

            notice.className =
                "hidden mb-5 p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm";

            registrationForm.prepend(notice);
        }

        if (currentRejectedClinicRequest && notice) {

            notice.classList.remove("hidden");

            notice.textContent =
                "Your previous registration was rejected. Reason: " +
                (request.rejection_reason || "Please review your information and submit again.");

        } else if (notice) {

            notice.classList.add("hidden");
        }

        // Allow existing documents to remain unchanged.
        const documentInputs = [
            {
                id: "clinic-admission-letter",
                path: request?.admission_letter_path,
                label: "Admission Letter"
            },
            {
                id: "clinic-passport",
                path: request?.passport_photo_path,
                label: "Passport Photograph"
            },
            {
                id: "clinic-health-service-form",
                path: request?.health_service_form_path,
                label: "Health Service Form"
            },
            {
                id: "clinic-medical-certificate",
                path: request?.medical_certificate_path,
                label: "Medical Certificate"
            }
        ];

        documentInputs.forEach(item => {

            const input = document.getElementById(item.id);

            if (!input) return;

            // A previously uploaded file does not need to be uploaded again.
            input.required = !item.path;

            let note = document.getElementById(item.id + "-status");

            if (!note) {

                note = document.createElement("p");
                note.id = item.id + "-status";

                note.className =
                    "text-xs mt-1 text-green-700";

                input.insertAdjacentElement("afterend", note);
            }

            note.textContent = item.path
                ? item.label + " already submitted. Choose a new file only if you want to replace it."
                : item.label + " is required.";
        });

        showSection("clinic-registration-section");

    } catch (error) {

        console.error("Registration form error:", error);

        alert("Unable to open registration form: " + error.message);
    }
}
// Handle Student Logout
async function handleStudentLogout() {

    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        alert("Logout failed: " + error.message);
        return;
    }

    localStorage.removeItem("bukcms_student_email");
    localStorage.removeItem("bukcms_student_id");

    // Restore both login buttons
    updateStudentLoginInterface(false);

    showSection("view-home");

    alert("You have logged out successfully.");
}

// Submit new or resubmitted clinic registration.
async function submitClinicRegistration(event) {

    event.preventDefault();

    try {

        const { data: { user }, error: authError } =
            await supabaseClient.auth.getUser();

        if (authError || !user) {
            throw new Error("Please log in again.");
        }

        // Get verified student profile.
        const { data: profile, error: profileError } =
            await supabaseClient
                .from("profiles")
                .select("student_matric, full_name, role")
                .eq("id", user.id)
                .single();

        if (profileError || !profile || profile.role !== "student") {
            throw new Error("Student profile could not be verified.");
        }

        const matric = profile.student_matric;

        // Prevent registration if patient already exists.
        const { data: patient, error: patientError } =
            await supabaseClient
                .from("patients")
                .select("clinic_number")
                .eq("matric", matric)
                .maybeSingle();

        if (patientError) throw patientError;

        if (patient) {
            alert(
                "Your registration is already approved. Clinic Number: " +
                patient.clinic_number
            );
            return;
        }

        // Get the latest application.
        const { data: previousRequest, error: requestError } =
            await supabaseClient
                .from("clinic_registration_requests")
                .select("*")
                .eq("matric", matric)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

        if (requestError) throw requestError;

        if (previousRequest?.status === "Pending") {
            throw new Error("Your application is already awaiting review.");
        }

        if (
            previousRequest?.status === "Approved"
        ) {
            throw new Error("Your registration has already been approved.");
        }

        const isResubmission =
            previousRequest?.status === "Rejected";

        // Check declaration.
        const declaration =
            document.getElementById("clinic-declaration");

        if (!declaration.checked) {
            alert("Please accept the declaration before submitting.");
            return;
        }

        // Get selected files.
        const admission = document.getElementById("clinic-admission-letter").files[0];

        const passport = document.getElementById("clinic-passport").files[0];

        const healthForm = document.getElementById("clinic-health-service-form").files[0];

        const certificate = document.getElementById("clinic-medical-certificate").files[0];

        // Upload a new document when selected.
        // Otherwise, retain the previous document path.
        async function resolveDocument(bucket, file, oldPath, label) {

            if (!file && oldPath) {
                return oldPath;
            }

            if (!file) {
                throw new Error("Please upload " + label + ".");
            }

            const safeName = file.name.replace(
                /[^a-zA-Z0-9._-]/g,
                "_"
            );

            const filePath =
                matric + "/" + crypto.randomUUID() + "_" + safeName;

            const { error } = await supabaseClient.storage
                .from(bucket)
                .upload(filePath, file);

            if (error) throw error;

            return filePath;
        }

        // Resolve all four document paths.
        const admissionPath = await resolveDocument(
            "student-documents",
            admission,
            previousRequest?.admission_letter_path,
            "Admission Letter"
        );

        const passportPath = await resolveDocument(
            "patient-photos",
            passport,
            previousRequest?.passport_photo_path,
            "Passport Photograph"
        );

        const healthFormPath = await resolveDocument(
            "student-documents",
            healthForm,
            previousRequest?.health_service_form_path,
            "Health Service Form"
        );

        const certificatePath = await resolveDocument(
            "student-documents",
            certificate,
            previousRequest?.medical_certificate_path,
            "Medical Certificate"
        );

        // Collect form values.
        const getValue = id =>
            document.getElementById(id)?.value.trim() || null;

        const meta = user.user_metadata || {};

        const fullName =
            meta.full_name ||
            profile.full_name ||
            previousRequest?.full_name;

        if (!fullName) {
            throw new Error("Student full name is missing.");
        }

        // Prepare a new database request.
        const requestPayload = {

            matric: matric,
            full_name: fullName,

            phone: getValue("clinic-phone"),

            sex: getValue("clinic-sex"),

            date_of_birth: getValue("clinic-dob"),

            department:
                meta.department || previousRequest?.department,

            graduation_year: getValue("clinic-graduation-year"),

            next_of_kin_name: getValue("clinic-next-kin"),

            next_of_kin_relationship:
                getValue("clinic-kin-relationship"),

            next_of_kin_phone:
                getValue("clinic-kin-phone"),

            next_of_kin_address:
                getValue("clinic-kin-address"),

            place_of_origin: getValue("clinic-origin"),

            tribe: getValue("clinic-tribe"),

            religion: getValue("clinic-religion"),

            occupation: getValue("clinic-occupation"),

            allergy:
                getValue("clinic-allergy") ||
                previousRequest?.allergy ||
                null,

            admission_letter_path: admissionPath,

            passport_photo_path: passportPath,

            health_service_form_path: healthFormPath,

            medical_certificate_path: certificatePath,

            status: "Pending",

            reviewed_by: null,

            reviewed_at: null,

            rejection_reason: null
        };

        // Resubmit by updating the existing rejected request.
if (previousRequest && previousRequest.status === "Rejected") {

    const { data, error } = await supabaseClient
        .from("clinic_registration_requests")
        .update({
            ...requestPayload,
            created_at: new Date().toISOString()
        })
        .eq("id", previousRequest.id)
        .eq("status", "Rejected")
        .select("id")
        .maybeSingle();

    if (error) throw error;

    if (!data) {
        throw new Error("The rejected request could not be updated.");
    }

    // Remove old files only when new replacements were uploaded.
    const documentsToDelete = {
        "student-documents": [],
        "patient-photos": []
    };

    if (admission && previousRequest.admission_letter_path) {
        documentsToDelete["student-documents"].push(
            previousRequest.admission_letter_path
        );
    }

    if (healthForm && previousRequest.health_service_form_path) {
        documentsToDelete["student-documents"].push(
            previousRequest.health_service_form_path
        );
    }

    if (certificate && previousRequest.medical_certificate_path) {
        documentsToDelete["student-documents"].push(
            previousRequest.medical_certificate_path
        );
    }

    if (passport && previousRequest.passport_photo_path) {
        documentsToDelete["patient-photos"].push(
            previousRequest.passport_photo_path
        );
    }

    // Delete replaced files to save Storage space.
    for (const [bucket, paths] of Object.entries(documentsToDelete)) {

        if (paths.length === 0) continue;

        const { error: deleteError } = await supabaseClient.storage
            .from(bucket)
            .remove(paths);

        if (deleteError) {
            console.warn("Old document cleanup failed:", deleteError);
        }
    }

} else {

    // First registration: create the request.
    const { error: insertError } = await supabaseClient
        .from("clinic_registration_requests")
        .insert(requestPayload);

    if (insertError) throw insertError;
}

        currentRejectedClinicRequest = null;

        alert(
            isResubmission
                ? "Your corrected registration has been resubmitted successfully. Status: Pending."
                : "Clinic registration submitted successfully. Status: Pending."
        );

        document.getElementById("form-clinic-registration").reset();

        await updateStudentClinicStatus();

        showSection("student-dashboard-section");

    } catch (error) {

        console.error("Clinic registration submission error:", error);

        alert("Submission failed: " + error.message);
    }
}
// Update Student Clinic Registration Status
// Update Student Clinic Status
async function updateStudentClinicStatus() {

    const statusElement =
        document.getElementById("student-clinic-status");

    const clinicNumberBox =
        document.getElementById("student-clinic-number-box");

    const clinicNumberElement =
        document.getElementById("student-clinic-number");

    const rejectionBox =
        document.getElementById("student-clinic-rejection-box");

    const rejectionReasonElement =
        document.getElementById("student-clinic-rejection-reason");

    const registerButton =
        document.getElementById("student-clinic-register-button");

    if (!statusElement) return;

    const { data: { user }, error: authError } =
        await supabaseClient.auth.getUser();

    if (authError || !user) return;

    // Get student matric number
    const { data: profile, error: profileError } =
        await supabaseClient
            .from("profiles")
            .select("student_matric")
            .eq("id", user.id)
            .single();

    if (profileError || !profile) {
        console.error("Profile error:", profileError);
        return;
    }

    const matric = profile.student_matric;

    // Check whether a permanent patient profile exists.
    const { data: patient, error: patientError } =
        await supabaseClient
            .from("patients")
            .select("clinic_number")
            .eq("matric", matric)
            .maybeSingle();

    if (patientError) {
        console.error("Patient lookup error:", patientError);
        return;
    }

    // An existing patient profile takes priority.
    if (patient) {

        statusElement.textContent = "Approved";
        statusElement.className =
            "font-semibold text-green-600";

        if (clinicNumberBox) {
            clinicNumberBox.classList.remove("hidden");
        }

        if (clinicNumberElement) {
            clinicNumberElement.textContent =
                patient.clinic_number;
        }

        if (rejectionBox) {
            rejectionBox.classList.add("hidden");
        }

        if (registerButton) {
            registerButton.classList.add("hidden");
        }

        return;
    }

    // No patient profile: check the latest request.
    const { data: requests, error } =
        await supabaseClient
            .from("clinic_registration_requests")
            .select("status, rejection_reason, created_at")
            .eq("matric", matric)
            .order("created_at", { ascending: false })
            .limit(1);

    if (error) {
        console.error("Request loading error:", error);
        return;
    }

    if (clinicNumberBox) {
        clinicNumberBox.classList.add("hidden");
    }

    if (rejectionBox) {
        rejectionBox.classList.add("hidden");
    }

    if (!requests || requests.length === 0) {

        statusElement.textContent = "Not Registered";
        statusElement.className =
            "font-semibold text-slate-500";

        if (registerButton) {
            registerButton.classList.remove("hidden");
        }

        return;
    }

    const request = requests[0];

    statusElement.textContent = request.status;

    if (request.status === "Pending") {

        statusElement.className =
            "font-semibold text-orange-600";

        if (registerButton) {
            registerButton.classList.add("hidden");
        }

    } else if (request.status === "Rejected") {

        statusElement.className =
            "font-semibold text-red-600";

        if (rejectionBox) {
            rejectionBox.classList.remove("hidden");
        }

        if (rejectionReasonElement) {
            rejectionReasonElement.textContent =
                request.rejection_reason ||
                "No rejection reason provided.";
        }

        if (registerButton) {
            registerButton.classList.remove("hidden");
            registerButton.textContent = "Review Registration";
        }
    }
}// Update header buttons for Student Login
function updateStudentLoginInterface(isLoggedIn) {

    const studentLoginBtn = document.getElementById("btn-student-login");
    const staffLoginBtn = document.getElementById("btn-login-toggle");

    if (isLoggedIn) {

        // Change Student Login to Logout
        if (studentLoginBtn) {
            studentLoginBtn.innerHTML =
                '<i class="fa-solid fa-right-from-bracket mr-1"></i> Logout';

            studentLoginBtn.className =
                "bg-red-600 hover:bg-red-700 text-white text-xs px-4 py-2 rounded font-semibold transition shadow";

            studentLoginBtn.setAttribute(
                "onclick",
                "handleStudentLogout()"
            );
        }

        // Hide Staff Login
        if (staffLoginBtn) {
            staffLoginBtn.classList.add("hidden");
        }

    } else {

        // Restore Student Login
        if (studentLoginBtn) {
            studentLoginBtn.innerHTML =
                '<i class="fa-solid fa-user-graduate mr-1"></i> Student Login';

            studentLoginBtn.className =
                "bg-white hover:bg-blue-200 text-blue-700 text-sm px-4 py-2.5 rounded-lg font-semibold transition shadow";

            studentLoginBtn.setAttribute(
                "onclick",
                "showSection('student-login-section')"
            );
        }

        // Show Staff Login again
        if (staffLoginBtn) {
            staffLoginBtn.classList.remove("hidden");
        }
    }
}

// ==========================================
// STUDENT LOGIN
// ==========================================

window.handleStudentLogin = async function(event) {

    event.preventDefault();

    const email = document.getElementById("student-login-email")
        .value.trim().toLowerCase();

    const password = document.getElementById("student-login-password").value;

    if (!email || !password) {
        alert("Please enter your email and password.");
        return;
    }

    try {

        const { data, error } =
            await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });

        if (error) throw error;

        const user = data.user;

        const { data: profile, error: profileError } =
            await supabaseClient
                .from("profiles")
                .select("full_name, role, student_matric")
                .eq("id", user.id)
                .single();

        if (profileError) throw profileError;

        if (!profile || profile.role !== "student") {
            await supabaseClient.auth.signOut();
            throw new Error("This account is not registered as a student.");
        }

        if (!profile.student_matric) {
            await supabaseClient.auth.signOut();
            throw new Error("Student matric number is missing.");
        }

        localStorage.setItem("bukcms_student_email", user.email);
        localStorage.setItem("bukcms_student_id", user.id);

        const meta = user.user_metadata || {};

        const fields = {
            "dashboard-student-name": profile.full_name || user.email,
            "dashboard-student-regno": profile.student_matric,
            "dashboard-student-faculty": meta.faculty || "N/A",
            "dashboard-student-department": meta.department || "N/A",
            "dashboard-student-level": meta.level || "N/A"
        };

        Object.entries(fields).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });

        updateStudentLoginInterface(true);

        showSection("student-dashboard-section");

        updateStudentClinicStatus().catch(error => {
            console.error("Clinic status error:", error);
        });

        console.log("Student login successful:", profile.student_matric);

    } catch (error) {

        console.error("Student login error:", error);
        alert("Login failed: " + error.message);

    }
};

console.log("BUK Care Student Login function loaded.");