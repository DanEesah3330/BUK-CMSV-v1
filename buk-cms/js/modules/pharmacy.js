// PHARMACIST / LAB OFFICER



let pharmTab = "rx";

function showPharmTab(tab) {
  // Close open forms when changing pharmacy tabs.
  closeRestockForm();
  closeAddMedicineForm();

  pharmTab = tab;

  ["rx", "stock", "supplies", "history"].forEach((t) => {
    const btn = document.getElementById("tab-" + t);

    if (!btn) return;

    btn.className = t === tab
      ? "bg-blue-700 text-white text-sm px-4 py-2 rounded-lg font-medium"
      : "bg-white border border-slate-300 text-slate-700 text-sm px-4 py-2 rounded-lg font-medium";
  });

  renderPharmacy();
}


// correction
// -----------------
// calculate how many calender days remain before expiry.
function getExpiryInfo(expiryValue) {
  // Check whether an expiry date was privided.
  if (!expiryValue) {
    return {
      daysLeft: null,
      expired: false,
      expiringSoon: false,
      needsCheck: true
    };
  }

  //  set today's date to midnight to compare calender days.
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Interpret the expiry date as a local calender date.
  const expiryDate = new Date(`${expiryValue}T00:00:00`);

  // Handle a date that javaScript cannot read.
  if (Number.isNaN(expiryDate.getTime())) {
    return {
      daysLeft: null,
      expired: false,
      expiringSoon: false,
      needsCheck: true
    };
  }

  // Convert the difference from milliseconds into days
  const daysLeft = Math.round(
    (expiryDate.getTime() - today.getTime()) / 864e5
  );

  return {
    daysLeft,
    expired: daysLeft < 0,
    expiringSoon: daysLeft >= 0 && daysLeft <= 90,
    needsCheck: false
  };
}


function updatePharmacySummary() {
  const visits = getVisitsByStatus("At pharmacy");
  const allVisits = loadDB().visits;

  // Count prescription items waiting for processing.
  let pendingCount = 0;

  visits.forEach((visit) => {
    const items = Array.isArray(visit.rx) ? visit.rx : [];

    items.forEach((item) => {
      if ((item.dispenseStatus || "Pending") === "Pending") {
        pendingCount++;
      }
    });
  });

  // Count all items successfully dispensed.
  let dispensedCount = 0;

  allVisits.forEach((visit) => {
    const items = Array.isArray(visit.rx) ? visit.rx : [];

    items.forEach((item) => {
      if (item.dispenseStatus === "Dispensed") {
        dispensedCount++;
      }
    });
  });

  // Count medicines with low dispensary stock.
  const drugs = getDrugs();

  const lowStockCount = drugs.filter(
    (drug) => Number(drug.dispensary) < 10
  ).length;

  // Count the types of medical supplies recorded.
  const supplies = getSupplies();
  const suppliesCount = supplies.length;

  // Display the calculated numbers in the cards.
  document.getElementById("pharm-pending-count").textContent =
    pendingCount;

  document.getElementById("pharm-dispensed-count").textContent =
    dispensedCount;

  document.getElementById("pharm-low-stock-count").textContent =
    lowStockCount;

  document.getElementById("pharm-supplies-count").textContent =
    suppliesCount;
}


      function renderPharmacy() {
        const head = document.getElementById("pharm-head");
        const body = document.getElementById("pharm-body");

        updatePharmacySummary();


        const controls = document.getElementById("pharm-search-controls");
        const searchInput = document.getElementById("pharm-search");
        const statusInput = document.getElementById("pharm-status-filter");

        const inventoryActions = document.getElementById("pharm-inventory-actions");

      
      if (inventoryActions) {
        const showInventoryActions = ["stock", "supplies"].includes(pharmTab);

        inventoryActions.classList.toggle("hidden", !showInventoryActions);
        inventoryActions.classList.toggle("flex", showInventoryActions);

        const addMedicineButton = inventoryActions.querySelector(
          'button[onclick="openAddMedicineForm()"]'
        );

        const addSupplyButton = inventoryActions.querySelector(
          'button[onclick="openAddSupplyForm()"]'
        );

        if (addMedicineButton) {
          addMedicineButton.classList.toggle("hidden", pharmTab !== "stock");
        }

        if (addSupplyButton) {
          addSupplyButton.classList.toggle("hidden", pharmTab !== "supplies");
        }
      }


        if (controls) {
          controls.classList.toggle("hidden", pharmTab === "rx" ? false : false);
        }

        if (searchInput) {
          if (pharmTab === "rx") {
            searchInput.placeholder = "Search patient or medicine...";
          } else if (pharmTab === "stock") {
            searchInput.placeholder = "Search drug name...";
          } else if (pharmTab === "supplies") {
            searchInput.placeholder = "Search supply name...";
          }
        }

        const statusContainer = document.getElementById("pharm-status-container");

        if (statusContainer) {
          statusContainer.classList.toggle("hidden", pharmTab !== "rx");
        }

        const title = document.getElementById("pharm-table-title");
        const description = document.getElementById("pharm-table-description");

        if (!head || !body) return;

        // TAB 1: PRESCRIPTIONS

        if (pharmTab === "rx") {
          // Get all visits so we can see every prescription status.
          const visits = loadDB().visits || [];

          const searchInput = document.getElementById("pharm-search");
          const statusInput = document.getElementById("pharm-status-filter");

          const searchTerm = searchInput
            ? searchInput.value.trim().toLowerCase()
            : "";

          const selectedStatus = statusInput
            ? statusInput.value
            : "All";

          if (title) title.textContent = "Prescription Items";

          if (description) {
            description.textContent =
              "Search prescriptions and filter items by processing status.";
          }

          // Show search and filter only on the Prescriptions tab.
          const controls = document.getElementById("pharm-prescription-controls");
          if (controls) controls.classList.remove("hidden");

          head.innerHTML = `
          <th class="py-3 pr-3">Patient</th>
          <th class="py-3 pr-3">Item</th>
          <th class="py-3 pr-3">Type</th>
          <th class="py-3 pr-3">Dosage</th>
          <th class="py-3 pr-3">Quantity</th>
          <th class="py-3 pr-3">Status</th>
          <th class="py-3">Action</th>
        `;

          const rows = [];

          visits.forEach((v) => {
            const items = Array.isArray(v.rx) ? v.rx : [];

            items.forEach((item, index) => {
              const status = item.dispenseStatus || "Pending";

              // Apply the selected status filter.
              if (
                selectedStatus !== "All" &&
                status !== selectedStatus
              ) {
                return;
              }

              // Search by patient name or prescription item name.
              const patientName = String(v.name || "").toLowerCase();
              const itemName = String(item.drug || "").toLowerCase();

              if (
                searchTerm &&
                !patientName.includes(searchTerm) &&
                !itemName.includes(searchTerm)
              ) {
                return;
              }

              const statusStyle =
                status === "Dispensed"
                  ? "bg-green-100 text-green-700"
                  : status === "Unavailable"
                    ? "bg-red-100 text-red-700"
                    : "bg-amber-100 text-amber-800";

              const action =
                status === "Pending"
                  ? `
                  <div class="flex flex-wrap gap-2">
                    <button
                      onclick="dispense('${v.id}', ${index})"
                      class="bg-blue-700 hover:bg-blue-800 text-white text-xs px-3 py-2 rounded-lg">
                      Dispense
                    </button>

                    <button
                      onclick="markPrescriptionUnavailable('${v.id}', ${index})"
                      class="bg-red-50 hover:bg-red-100 text-red-700 text-xs px-3 py-2 rounded-lg">
                      Unavailable
                    </button>
                  </div>
                `
                  : `<span class="text-slate-400 text-xs">Processed</span>`;

              rows.push(`
              <tr class="border-b border-slate-100 hover:bg-slate-50">
                <td class="py-3 pr-3 font-medium text-slate-800">
                  ${v.name || "-"}
                </td>
                <td class="py-3 pr-3">${item.drug || "-"}</td>
                <td class="py-3 pr-3">${item.type || "Medicine"}</td>
                <td class="py-3 pr-3">${item.dose || "-"}</td>
                <td class="py-3 pr-3">${item.quantity ?? 1}</td>
                <td class="py-3 pr-3">
                  <span class="${statusStyle} text-xs px-2 py-1 rounded-full">
                    ${status}
                  </span>
                </td>
                <td class="py-3">${action}</td>
              </tr>
            `);
            });
          });

          body.innerHTML = rows.length
            ? rows.join("")
            : `<tr>
              <td colspan="7" class="text-center text-slate-400 py-8">
                No prescription items match your search or filter.
              </td>
            </tr>`;

          return;
        }

        // TAB 2: DRUG STOCK
        if (pharmTab === "stock") {
          const searchTerm = (
            document.getElementById("pharm-search")?.value || ""
          ).trim().toLowerCase();

                const drugs = getDrugs().filter((drug) =>
          drug.isActive !== false &&
          String(drug.name || "").toLowerCase().includes(searchTerm)
        );

          if (title) title.textContent = "Drug Inventory";
          if (description) {
            description.textContent =
              "Monitor medicine quantities, expiry dates and stock alerts.";
          }

              head.innerHTML = `
                <th class="py-3 pr-3">Drug</th>
                <th class="py-3 pr-3">Main Store</th>
                <th class="py-3 pr-3">Active Store</th>
                <th class="py-3 pr-3">Dispensary</th>
                <th class="py-3 pr-3">Expiry</th>
                <th class="py-3 pr-3">Alerts</th>
                <th class="py-3">Action</th>
              `;

          body.innerHTML = drugs.length
            ? drugs.map((d) => {
              const low = Number(d.dispensary) < 10;
              const expiryInfo = getExpiryInfo(d.expiry);

              return `
                  <tr class="border-b border-slate-100 hover:bg-slate-50">
                    <td class="py-3 pr-3 font-medium">${d.name}</td>
                    <td class="py-3 pr-3">${d.main}</td>
                    <td class="py-3 pr-3">${d.active}</td>
                    <td class="py-3 pr-3">${d.dispensary}</td>
                    <td class="py-3 pr-3">${d.expiry || "Not recorded"}</td>
                    <td class="py-3">
                      ${expiryInfo.expired
                  ? '<span class="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full mr-1">Expired</span>'
                  : ""}
                      ${expiryInfo.expiringSoon
                  ? '<span class="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full mr-1">Expiring soon</span>'
                  : ""}
                      ${expiryInfo.needsCheck
                  ? '<span class="bg-slate-200 text-slate-700 text-xs px-2 py-1 rounded-full mr-1">Check expiry</span>'
                  : ""}
                      ${low
                  ? '<span class="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full">Low stock</span>'
                  : ""}
                    </td>
                    <td class="py-3">
                      <button
                        type="button"
                        onclick="deactivateDrug('${d.name.replace(/'/g, "\\'")}')"
                        class="bg-red-50 hover:bg-red-100 text-red-700 text-xs px-3 py-2 rounded-lg">
                        Deactivate
                      </button>
                    </td>
                  </tr>
                `;
            }).join("")
            : `<tr><td colspan="6" class="text-center py-8 text-slate-400">
                No medicines in stock.
              </td></tr>`;

          return;
        }

        // TAB 3: MEDICAL SUPPLIES
        if (pharmTab === "supplies") {
          const searchTerm = (
            document.getElementById("pharm-search")?.value || ""
          ).trim().toLowerCase();

          const supplies = getSupplies().filter((supply) =>
            supply.isActive !== false &&
            String(supply.name || "").toLowerCase().includes(searchTerm)
          );

          if (title) title.textContent = "Medical Supplies Inventory";
          if (description) {
            description.textContent =
              "Monitor the quantities of syringes, gauze and other medical supplies.";
          }

       
          head.innerHTML = `
            <th class="py-3 pr-3">Supply</th>
            <th class="py-3 pr-3">Main Store</th>
            <th class="py-3 pr-3">Active Store</th>
            <th class="py-3 pr-3">Dispensary</th>
            <th class="py-3 pr-3">Alerts</th>
            <th class="py-3">Action</th>
          `;


          body.innerHTML = supplies.length
            ? supplies.map((s) => {
              const low = Number(s.dispensary) < 10;

              return `
                  <tr class="border-b border-slate-100 hover:bg-slate-50">
                    <td class="py-3 pr-3 font-medium">${s.name}</td>
                    <td class="py-3 pr-3">${s.main}</td>
                    <td class="py-3 pr-3">${s.active}</td>
                    <td class="py-3 pr-3">${s.dispensary}</td>
                    <td class="py-3">
                      ${low
                  ? '<span class="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full">Low stock</span>'
                  : '<span class="text-slate-400 text-xs">—</span>'}
                    </td>
                    
                <td class="py-3">
                  <button
                    type="button"
                    onclick="deactivateSupply('${s.name.replace(/'/g, "\\'")}')"
                    class="bg-red-50 hover:bg-red-100 text-red-700 text-xs px-3 py-2 rounded-lg">
                    Deactivate
                  </button>
                </td>

                  </tr>
                `;
            }).join("")
                : `<tr><td colspan="5" class="text-center py-8 text-slate-400">
                No medical supplies recorded.
              </td></tr>`;
          return;
        }

        // TAB 4: RESTOCK HISTORY
        if (pharmTab === "history") {
          const searchTerm = (
            document.getElementById("pharm-search")?.value || ""
          ).trim().toLowerCase();

          const db = loadDB();
          const history = Array.isArray(db.restockHistory)
            ? db.restockHistory
            : [];

          const filteredHistory = history
            .filter((item) =>
              String(item.itemName || "").toLowerCase().includes(searchTerm)
            )
            .slice()
            .reverse();

          if (title) title.textContent = "Restock History";

          if (description) {
            description.textContent =
              "Review previously recorded stock additions.";
          }

          if (searchInput) {
            searchInput.placeholder = "Search item name...";
          }

          head.innerHTML = `
            <th class="py-3 pr-3">Item Name</th>
            <th class="py-3 pr-3">Type</th>
            <th class="py-3 pr-3">Quantity Added</th>
            <th class="py-3 pr-3">Store</th>
            <th class="py-3">Date</th>
          `;

          body.innerHTML = filteredHistory.length
            ? filteredHistory.map((item) => {
                const date = item.date
                  ? new Date(item.date).toLocaleString()
                  : "Not recorded";

                const storeName = {
                  main: "Main Store",
                  active: "Active Store",
                  dispensary: "Dispensary"
                }[item.store] || item.store || "-";

                return `
                  <tr class="border-b border-slate-100 hover:bg-slate-50">
                    <td class="py-3 pr-3 font-medium">${item.itemName || "-"}</td>
                    <td class="py-3 pr-3">${item.type || "-"}</td>
                    <td class="py-3 pr-3">${item.quantity ?? 0}</td>
                    <td class="py-3 pr-3">${storeName}</td>
                    <td class="py-3">${date}</td>
                  </tr>
                `;
              }).join("")
            : `<tr>
                <td colspan="5" class="text-center text-slate-400 py-8">
                  No restock history found.
                </td>
              </tr>`;
        }
      }
        



function dispense(id, index) {
  const v = getVisitById(id);

  if (!v || !Array.isArray(v.rx) || !v.rx[index]) {
    alert("Prescription item not found.");
    return;
  }

  const item = v.rx[index];

  if (item.dispenseStatus !== "Pending") {
    alert("This item has already been processed.");
    return;
  }

  const quantity = Number(item.quantity);

  if (!Number.isInteger(quantity) || quantity < 1) {
    alert("Invalid prescription quantity.");
    return;
  }

  // Handle medicine items.
  if (!item.type || item.type === "Medicine") {
    const drug = getDrugs().find(
      (d) => d.name.toLowerCase() === item.drug.toLowerCase()
    );

    if (!drug) {
      alert("Medicine not found in drug stock: " + item.drug);
      return;
    }

    const expiryInfo = getExpiryInfo(drug.expiry);

    if (expiryInfo.needsCheck) {
      alert("Please check the expiry date for " + drug.name + ".");
      return;
    }

    if (expiryInfo.expired) {
      alert(drug.name + " has expired. Do not dispense it.");
      return;
    }

    if (Number(drug.dispensary) < quantity) {
      alert("Not enough " + drug.name + " in the dispensary.");
      return;
    }

    updateDrugByName(drug.name, {
      dispensary: Number(drug.dispensary) - quantity
    });

    
  }

  // Handle medical supply items.
  else if (item.type === "Medical Supply") {
    const supply = getSupplies().find(
      (s) => s.name.toLowerCase() === item.drug.toLowerCase()
    );

    if (!supply) {
      alert("Medical supply not found: " + item.drug);
      return;
    }

    if (Number(supply.dispensary) < quantity) {
      alert("Not enough " + supply.name + " in the dispensary.");
      return;
    }

    updateSupplyByName(supply.name, {
      dispensary: Number(supply.dispensary) - quantity
    });
  }

  else {
    alert("Unknown prescription item type: " + item.type);
    return;
  }

  // Mark only this item as dispensed.
  const updatedItems = v.rx.map((rxItem, i) =>
    i === index
      ? { ...rxItem, dispenseStatus: "Dispensed" }
      : rxItem
  );

  const remaining = updatedItems.some(
    (rxItem) => rxItem.dispenseStatus === "Pending"
  );

  updateVisit(id, {
    rx: updatedItems,
    status: remaining ? "At pharmacy" : "Done"
  });

  renderPharmacy();
}


function markPrescriptionUnavailable(id, index) {
  const v = getVisitById(id);

  if (!v || !Array.isArray(v.rx) || !v.rx[index]) {
    alert("Prescription item not found.");
    return;
  }

  if ((v.rx[index].dispenseStatus || "Pending") !== "Pending") {
    alert("This item has already been processed.");
    return;
  }

  const updatedItems = v.rx.map((item, i) =>
    i === index
      ? { ...item, dispenseStatus: "Unavailable" }
      : item
  );

  const remaining = updatedItems.some(
    (item) => item.dispenseStatus === "Pending"
  );

  updateVisit(id, {
    rx: updatedItems,
    status: remaining ? "At pharmacy" : "Done"
  });

  renderPharmacy();
}

// Opens the restock form
function openRestockForm() {
  const form = document.getElementById("restock-form-container");

  if (form) {
    form.classList.remove("hidden");
  }
}

// Closes the restock form
function closeRestockForm() {
  const form = document.getElementById("restock-form-container");

  if (form) {
    form.classList.add("hidden");
  }
}

function openAddMedicineForm() {
  const form = document.getElementById("add-medicine-form-container");

  if (form) {
    form.classList.remove("hidden");
  } else {
    console.error("Add Medicine form container not found.");
  }
}

function closeAddMedicineForm() {
  const form = document.getElementById("add-medicine-form-container");

  if (form) {
    form.classList.add("hidden");
  }
}


function saveNewMedicine(event) {
  event.preventDefault();

  const name = document.getElementById("new-medicine-name").value.trim();
  const strength = document.getElementById("new-medicine-strength").value.trim();
  const form = document.getElementById("new-medicine-form").value;
  const expiry = document.getElementById("new-medicine-expiry").value;

  const main = Number(document.getElementById("new-medicine-main").value);
  const active = Number(document.getElementById("new-medicine-active").value);
  const dispensary = Number(document.getElementById("new-medicine-dispensary").value);

  if (!name || !strength || !form) {
    alert("Please complete all required medicine details.");
    return;
  }

  const db = loadDB();
  const drugs = Array.isArray(db.drugs) ? db.drugs : [];

  const fullName = `${name} ${strength}`;

  const alreadyExists = drugs.some(
    (drug) => drug.name.toLowerCase() === fullName.toLowerCase()
  );

  if (alreadyExists) {
    alert("This medicine already exists in the inventory.");
    return;
  }

  const newMedicine = {
    name: fullName,
    form: form,
    main: main,
    active: active,
    dispensary: dispensary,
    expiry: expiry,
     isActive: true
  };

  drugs.push(newMedicine);

  db.drugs = drugs;
  saveDB(db);

  event.target.reset();

  closeAddMedicineForm();
  renderPharmacy();
  updatePharmacySummary();

  alert("New medicine added successfully.");
}



function openAddSupplyForm() {
  const form = document.getElementById("add-supply-form-container");

  if (form) {
    form.classList.remove("hidden");
  } else {
    console.error("Add Supply form container not found.");
  }
}

function closeAddSupplyForm() {
  const form = document.getElementById("add-supply-form-container");

  if (form) {
    form.classList.add("hidden");
  }
}


function saveNewSupply(event) {
  event.preventDefault();

  const name = document
    .getElementById("new-supply-name")
    .value.trim();

  const expiry = document
    .getElementById("new-supply-expiry")
    .value;

  const main = Number(
    document.getElementById("new-supply-main").value
  );

  const active = Number(
    document.getElementById("new-supply-active").value
  );

  const dispensary = Number(
    document.getElementById("new-supply-dispensary").value
  );

  if (!name) {
    alert("Please enter the supply name.");
    return;
  }

  const db = loadDB();

  const supplies = Array.isArray(db.supplies)
    ? db.supplies
    : [];

  const alreadyExists = supplies.some(
    (supply) =>
      supply.name.toLowerCase() === name.toLowerCase()
  );

  if (alreadyExists) {
    alert("This medical supply already exists in the inventory.");
    return;
  }

  const newSupply = {
    name: name,
    main: main,
    active: active,
    dispensary: dispensary,
    expiry: expiry,
     isActive: true
  };

  supplies.push(newSupply);

  db.supplies = supplies;
  saveDB(db);

  event.target.reset();

  closeAddSupplyForm();
  renderPharmacy();
  updatePharmacySummary();

  alert("New medical supply added successfully.");
}



function updateRestockItems() {
  const type = document.getElementById("restock-type").value;
  const itemSelect = document.getElementById("restock-item");

  if (!itemSelect) return;

  let items = [];

  if (type === "Medicine") {
    items = getDrugs();
  } else {
    items = getSupplies();
  }

  itemSelect.innerHTML = '<option value="">Select an item</option>';

  items.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.name;
    option.textContent = item.name;
    itemSelect.appendChild(option);
  });
}

function saveRestock(event) {
  event.preventDefault();

  const type = document.getElementById("restock-type").value;
  const itemName = document.getElementById("restock-item").value;
  const store = document.getElementById("restock-store").value;
  const quantity = Number(document.getElementById("restock-quantity").value);

  if (!itemName || !Number.isInteger(quantity) || quantity <= 0) {
    alert("Please select an item and enter a valid quantity.");
    return;
  }

  const storeField = {
    main: "main",
    active: "active",
    dispensary: "dispensary"
  }[store];

  let updated = false;

  if (type === "Medicine") {
    const drug = getDrugs().find(
      (item) => item.name === itemName
    );

    if (drug) {
      updated = updateDrugByName(itemName, {
        [storeField]: Number(drug[storeField] || 0) + quantity
      });
    }
  } else {
    const supply = getSupplies().find(
      (item) => item.name === itemName
    );

    if (supply) {
      updated = updateSupplyByName(itemName, {
        [storeField]: Number(supply[storeField] || 0) + quantity
      });
    }
  }

  if (!updated) {
    alert("Could not update stock. Please check the selected item.");
    return;
  }

  // Save the restock transaction to the database.
  const db = loadDB();

  if (!Array.isArray(db.restockHistory)) {
    db.restockHistory = [];
  }

  db.restockHistory.push({
    id: Date.now(),
    type: type,
    itemName: itemName,
    quantity: quantity,
    store: store,
    date: new Date().toISOString()
  });

  saveDB(db)

  alert("Stock added successfully.");

  document.getElementById("restock-form").reset();
  updateRestockItems();
  closeRestockForm();
  renderPharmacy();
}


