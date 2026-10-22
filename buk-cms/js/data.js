// data.js — everythinda about STORING data. No HTML here. Loaded before app.js.
// Later (Version: Supabase) we only rewrite the functions below, not app.js.


// command for data reset
// localStorage.removeItem('bukcms_db');
// location.reload();

const DB_KEY = "bukcms_db";

// Simulated BUK student registry (students only, per the approved proposal)
const REGISTRY = [
  {
    matric: "CST/23/SWE/01131",
    name: "Abdullah Isah",
    department: "Software Engineering",
    sex: "Male",
    phone: "08012345678",
    dob: "2003-05-14",
    gradYear: "2027"
  },
  {
    matric: "CST/23/SWE/01150",
    name: "Hafsat Musa",
    department: "Software Engineering",
    sex: "Female",
    phone: "08087654321",
    dob: "2004-09-20",
    gradYear: "2027"
  },
  {
    matric: "CST/22/CSC/00420",
    name: "Adamu Adamu",
    department: "Computer Science",
    sex: "Male",
    phone: "07011223344",
    dob: "2002-11-05",
    gradYear: "2026"
  }
];

const DEFAULT_DRUGS = [
  { name: "Paracetamol 500mg", main: 400, active: 120, dispensary: 60, expiry: "2027-08-01" },
  { name: "Amoxicillin 500mg", main: 150, active: 40, dispensary: 8, expiry: "2026-11-15" },
  { name: "Artemether/Lumefantrine", main: 90, active: 30, dispensary: 25, expiry: "2026-10-14" },
  { name: "Fortide Inhaler", main: 20, active: 6, dispensary: 3, expiry: "2027-03-01" },
];


const DEFAULT_SUPPLIES = [
  {
    name: "Syringe",
    main: 100,
    active: 30,
    dispensary: 20
  },
  {
    name: "Needle",
    main: 200,
    active: 60,
    dispensary: 40
  },
  {
    name: "Gauze",
    main: 150,
    active: 50,
    dispensary: 25
  },
  {
    name: "IV Giving Set",
    main: 80,
    active: 25,
    dispensary: 15
  },
  {
    name: "IV Cannula",
    main: 60,
    active: 20,
    dispensary: 10
  }
];



function loadDB() {
  const raw = localStorage.getItem(DB_KEY);

  if (raw) {
    const db = JSON.parse(raw);

    // Add supplies to older demo databases if missing.
    if (!Array.isArray(db.supplies)) {
      db.supplies = DEFAULT_SUPPLIES.map((item) => ({ ...item }));
      saveDB(db);
    }

    return db;
  }

  const fresh = {
    patients: [],
    visits: [],
    drugs: DEFAULT_DRUGS.map((item) => ({ ...item })),
    supplies: DEFAULT_SUPPLIES.map((item) => ({ ...item }))
  };

  localStorage.setItem(DB_KEY, JSON.stringify(fresh));

  return fresh;
}

function saveDB(db) { localStorage.setItem(DB_KEY, JSON.stringify(db)); }

function findStudent(matric) {
  return REGISTRY.find((s) => s.matric.toLowerCase() === matric.trim().toLowerCase());
}

// corrections
// check if the patient is already registered (Returning Patient)
function getPatientByMatric(matric) {
  const db = loadDB();
  return db.patients.find((p) => p.matric.toLowerCase() === matric.trim().toLowerCase());
}

// calculation of DOB to real age (DOB to Age)
function calculateAge(dob) {
  if (!dob) return null;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() - birthDate.getDate() < 0)) {
    age--;
  }
  return age;
}

// One file per patient. A returning patient keeps the same clinic number.
function registerPatient(student, extra) {
  const db = loadDB();
  let patient = db.patients.find((p) => p.matric === student.matric);
  if (!patient) {
    patient = {
      clinicNumber: "BUK-" + String(db.patients.length + 1).padStart(4, "0"),
      matric: student.matric, name: student.name, department: student.department, sex: student.sex,
      allergy: "", ...extra,
    };
    db.patients.push(patient);
  } else {
    Object.assign(patient, extra);
  }
  saveDB(db);
  return patient;
}

function addToQueue(patient, priority) {
  const db = loadDB(); // Ko loadDB() dangane da wanda kake amfani da shi
  db.visits.push({
    id: Date.now() + "-" + Math.random().toString(16).slice(2),
    clinicNumber: patient.clinicNumber, 
    matric: patient.matric || "",
    name: patient.name, 
    sex: patient.sex || "", 
    age: (patient.dob ? calculateAge(patient.dob) : "") || patient.age || "", 
    priority: priority || "Normal",
    status: "Waiting", 
    time: Date.now(),
    vitals: null, 
    complaint: "", 
    diagnosis: "", 
    lab: null, 
    rx: [],
  });
  saveDB(db);
}

// function addToQueue(patient, priority) {
//   const db = loadDB();
//   db.visits.push({
//     id: Date.now() + "-" + Math.random().toString(16).slice(2),
//     clinicNumber: patient.clinicNumber, 
//     name: patient.name, 
//     sex: patient.sex, // storing gender
//     age: calculateAge(patient.dob), // storing age with automati
//     priority,
//     status: "Waiting", 
//     time: Date.now(),
//     vitals: null, complaint: "", diagnosis: "", lab: null, rx: [],
//   });
//   saveDB(db);
// }

// Emergency first, then first-come-first-served — matches the Nurse's real process.
function getVisitsByStatus(status) {
  return loadDB().visits.filter((v) => v.status === status)
    .sort((a, b) => a.priority === b.priority ? a.time - b.time : (a.priority === "Emergency" ? -1 : 1));
}
function getVisitById(id) { return loadDB().visits.find((v) => v.id === id); }
function getPatientByClinic(clinicNumber) { return loadDB().patients.find((p) => p.clinicNumber === clinicNumber); }

function updateVisit(id, changes) {
  const db = loadDB();
  Object.assign(db.visits.find((v) => v.id === id), changes);
  saveDB(db);
}
function updatePatient(clinicNumber, changes) {
  const db = loadDB();
  Object.assign(db.patients.find((p) => p.clinicNumber === clinicNumber), changes);
  saveDB(db);
}
function getDrugs() { return loadDB().drugs; }

function getDrugs() {
  const db = loadDB();
  return Array.isArray(db.drugs) ? db.drugs : [];
}

function updateDrugByName(name, changes) {
  const db = loadDB();

  const drug = db.drugs.find(
    (item) => item.name === name
  );

  if (!drug) {
    return false;
  }

  Object.assign(drug, changes);
  saveDB(db);

  return true;
}

function getSupplies() {
  const db = loadDB();
  return Array.isArray(db.supplies) ? db.supplies : [];
}

function updateSupplyByName(name, changes) {
  const db = loadDB();

  const supplies = Array.isArray(db.supplies)
    ? db.supplies
    : [];

  const supply = supplies.find(
    (item) => item.name === name
  );

  if (!supply) {
    return false;
  }

  Object.assign(supply, changes);
  db.supplies = supplies;
  saveDB(db);

  return true;
}
function dashboardCounts() {
  const db = loadDB();
  const c = (s) => db.visits.filter((v) => v.status === s).length;
  return {
    patients: db.patients.length, visits: db.visits.length, waiting: c("Waiting"),
    triaged: c("Triaged"), atLab: c("At lab"), atPharmacy: c("At pharmacy"), done: c("Done")
  };
}
