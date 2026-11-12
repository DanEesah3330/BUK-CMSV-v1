// PHARMACIST / LAB OFFICER



let pharmTab = "rx";

function showPharmTab(tab) {

    // Close forms when switching tabs.
    closeRestockForm();
    closeAddMedicineForm();
    closeAddSupplyForm();

    pharmTab = tab;

    const baseClasses =
        "text-xs sm:text-sm px-3 sm:px-4 py-2.5 rounded-lg font-medium flex-1 sm:flex-none text-center whitespace-nowrap";

    ["rx", "stock", "supplies", "history"].forEach((t) => {

        const btn = document.getElementById("tab-" + t);

        if (!btn) return;

        if (t === tab) {
            btn.className =
                `${baseClasses} bg-blue-700 text-white`;
        } else {
            btn.className =
                `${baseClasses} bg-white border border-slate-300 text-slate-700`;
        }

    });

    renderPharmacy();
}


function calculatePatientAge(dateOfBirth) {
    if (!dateOfBirth) return "-";

    const today = new Date();
    const birthDate = new Date(dateOfBirth);

    let age = today.getFullYear() - birthDate.getFullYear();

    const monthDifference = today.getMonth() - birthDate.getMonth();

    if (
        monthDifference < 0 ||
        (monthDifference === 0 && today.getDate() < birthDate.getDate())
    ) {
        age--;
    }

    return age;
}



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


async function updatePharmacySummary() {

  // 1. Get visits currently waiting at Pharmacy.
  const { data: visits, error: visitsError } = await supabaseClient
    .from("visits")
    .select("id")
    .eq("status", "At pharmacy");

  if (visitsError) {
    console.error("Pharmacy visits error:", visitsError);
    return;
  }

  const visitIds = (visits || []).map(visit => visit.id);

  // 2. Count pending prescription items.
  let pendingCount = 0;

  if (visitIds.length > 0) {
    const { count, error } = await supabaseClient
      .from("prescriptions")
      .select("id", { count: "exact", head: true })
      .in("visit_id", visitIds)
      .eq("status", "Pending");

    if (error) {
      console.error("Pending prescriptions error:", error);
      return;
    }

    pendingCount = count || 0;
  }

  // 3. Count all dispensed prescription items.
  const { count: dispensedCount, error: dispensedError } =
    await supabaseClient
      .from("prescriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "Dispensed");

  if (dispensedError) {
    console.error("Dispensed prescriptions error:", dispensedError);
    return;
  }

  // 4. Count medicines with low dispensary stock.
  const { count: lowStockCount, error: stockError } =
    await supabaseClient
      .from("medicines")
      .select("id", { count: "exact", head: true })
      .lt("dispensary", 10);

  if (stockError) {
    console.error("Low stock error:", stockError);
    return;
  }

  // 5. Count medical supplies.
  const { count: suppliesCount, error: suppliesError } =
    await supabaseClient
      .from("medical_supplies")
      .select("id", { count: "exact", head: true });

  if (suppliesError) {
    console.error("Supplies count error:", suppliesError);
    return;
  }

  // 6. Display summary cards.
  document.getElementById("pharm-pending-count").textContent =
    pendingCount;

  document.getElementById("pharm-dispensed-count").textContent =
    dispensedCount || 0;

  document.getElementById("pharm-low-stock-count").textContent =
    lowStockCount || 0;

  document.getElementById("pharm-supplies-count").textContent =
    suppliesCount || 0;
}

      async function renderPharmacy() {
        const head = document.getElementById("pharm-head");
        const body = document.getElementById("pharm-body");

        await updatePharmacySummary();


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
    controls.classList.remove("hidden");
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

        // TAB 1: PRESCRIPTIONS - SUPABASE

if (pharmTab === "rx") {

    const searchTerm = (
        document.getElementById("pharm-search")?.value || ""
    ).trim().toLowerCase();

    const selectedStatus =
        document.getElementById("pharm-status-filter")?.value || "All";

    if (title) title.textContent = "Prescription Items";

    if (description) {
        description.textContent =
            "View and process prescriptions submitted by Doctors.";
    }

        head.innerHTML = `
            <th class="py-3 pr-3">Patient</th>
            <th class="py-3 pr-3">Clinic Number</th>
            <th class="py-3 pr-3">Sex</th>
            <th class="py-3 pr-3">Age</th>
            <th class="py-3 pr-3">Item</th>
            <th class="py-3 pr-3">Type</th>
            <th class="py-3 pr-3">Dosage</th>
            <th class="py-3 pr-3">Frequency</th>
            <th class="py-3 pr-3">Duration</th>
            <th class="py-3 pr-3">Quantity</th>
            <th class="py-3">Status</th>
            <th class="py-3">Action</th>
        `;

    body.innerHTML = `
        <tr>
            <td colspan="12" class="text-center py-6">
                Loading prescriptions...
            </td>
        </tr>
    `;

    const { data, error } = await supabaseClient
    .from("prescriptions")
    .select(`
        id,
        visit_id,
        item_type,
        medicine_id,
        supply_id,
        dosage,
        frequency,
        duration,
        quantity,
        status,
        visits!prescriptions_visit_id_fkey (
            patients!visits_patient_id_fkey (
                full_name,
                clinic_number,
                sex,
                date_of_birth
            )
        ),
        medicines (
            name,
            strength
        ),
        medical_supplies (
            name
        )
    `)
    .order("created_at", { ascending: false });

    console.log(
    "PHARMACY PRESCRIPTION DATA:",
    JSON.stringify(data?.[0], null, 2)
);
    if (error) {
        console.error("Prescription loading error:", error);

        body.innerHTML = `
            <tr>
                <td colspan="12" class="text-center text-red-600 py-6">
                    Unable to load prescriptions.
                </td>
            </tr>
        `;

        return;
    }

    const rows = (data || []).filter((item) => {

        const patient = item.visits?.patients;
        const itemName = item.item_type === "Medicine"
            ? `${item.medicines?.name || ""} ${item.medicines?.strength || ""}`.trim()
            : item.medical_supplies?.name || "";

        const patientName = patient?.full_name || "";
        const clinicNumber = patient?.clinic_number || "";

        const matchesSearch =
            !searchTerm ||
            patientName.toLowerCase().includes(searchTerm) ||
            clinicNumber.toLowerCase().includes(searchTerm) ||
            itemName.toLowerCase().includes(searchTerm);

        const matchesStatus =
            selectedStatus === "All" ||
            item.status === selectedStatus;

        return matchesSearch && matchesStatus;
    });

    body.innerHTML = rows.length
        ? rows.map((item) => {

            const actionButtons = item.status === "Pending"
    ? `
        <div class="flex flex-wrap gap-2">

            <button
                type="button"
                onclick="dispensePrescription('${item.id}')"
                class="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-2 rounded-lg">
                Dispense
            </button>

            <button
                type="button"
                onclick="markPrescriptionUnavailable('${item.id}')"
                class="bg-red-50 hover:bg-red-100 text-red-700 text-xs px-3 py-2 rounded-lg">
                Unavailable
            </button>

        </div>
    `
    : '<span class="text-slate-400 text-xs">Processed</span>';

            const patient = item.visits?.patients;

            const itemName = item.item_type === "Medicine"
                ? `${item.medicines?.name || ""} ${item.medicines?.strength || ""}`.trim()
                : item.medical_supplies?.name || "";

            const statusStyle =
                item.status === "Dispensed"
                    ? "bg-green-100 text-green-700"
                    : item.status === "Unavailable"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-800";

            return `
                <tr class="border-b border-slate-100 hover:bg-slate-50">

                    <td class="py-3 pr-3 font-medium">
                    ${patient?.full_name || "-"}
                </td>

                <td class="py-3 pr-3">
                    ${patient?.clinic_number || "-"}
                </td>

                <td class="py-3 pr-3">
                    ${patient?.sex || "-"}
                </td>

                <td class="py-3 pr-3">
                    ${calculatePatientAge(patient?.date_of_birth)}
                </td>
                    <td class="py-3 pr-3 font-medium">
                        ${itemName || "-"}
                    </td>

                    <td class="py-3 pr-3">
                        ${item.item_type}
                    </td>

                    <td class="py-3 pr-3">
                        ${item.dosage || "-"}
                    </td>

                    <td class="py-3 pr-3">
                        ${item.frequency || "-"}
                    </td>

                    <td class="py-3 pr-3">
                        ${item.duration || "-"}
                    </td>

                    <td class="py-3 pr-3">
                        ${item.quantity}
                    </td>

                    <td class="py-3">
                        <span class="${statusStyle} text-xs px-2 py-1 rounded-full">
                            ${item.status}
                        </span>
                    </td>

                    <td class="py-3">
                        ${actionButtons}
                    </td>

                </tr>
            `;

        }).join("")
        : `
            <tr>
                <td colspan="12"
                    class="text-center text-slate-400 py-8">
                    No prescription items found.
                </td>
            </tr>
        `;

    return;
}
        // TAB 2: DRUG STOCK - SUPABASE
if (pharmTab === "stock") {

    const searchTerm = (
        document.getElementById("pharm-search")?.value || ""
    ).trim().toLowerCase();

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

    body.innerHTML = `
        <tr>
            <td colspan="7" class="text-center py-6">
                Loading medicine inventory...
            </td>
        </tr>
    `;

    const { data, error } = await supabaseClient
        .from("medicines")
        .select(`
            id,
            name,
            quantity,
            reorder_level,
            expiry_date,
            main,
            active,
            dispensary,
            is_active
        `)
        .eq("is_active", true)
        .order("name");

    if (error) {
        console.error("Medicine inventory error:", error);

        body.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-red-600 py-6">
                    Unable to load medicine inventory.
                </td>
            </tr>
        `;

        return;
    }

    const drugs = (data || []).filter(drug =>
        String(drug.name || "")
            .toLowerCase()
            .includes(searchTerm)
    );

    body.innerHTML = drugs.length
        ? drugs.map(drug => {

            const low =
                Number(drug.dispensary || 0) < 10;

            const expiryInfo =
                getExpiryInfo(drug.expiry_date);

            return `
                <tr class="border-b border-slate-100 hover:bg-slate-50">

                    <td class="py-3 pr-3 font-medium">
                        ${drug.name}
                    </td>

                    <td class="py-3 pr-3">
                        ${drug.main ?? 0}
                    </td>

                    <td class="py-3 pr-3">
                        ${drug.active ?? 0}
                    </td>

                    <td class="py-3 pr-3">
                        ${drug.dispensary ?? 0}
                    </td>

                    <td class="py-3 pr-3">
                        ${drug.expiry_date || "Not recorded"}
                    </td>

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
            <div class="flex flex-wrap gap-2 min-w-[150px]">

                <button
                    type="button"
                    onclick="editMedicine('${drug.id}')"
                    class="bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs px-3 py-2 rounded-lg whitespace-nowrap">
                    Edit
                </button>

                <button
                    type="button"
                    onclick="deactivateDrug('${drug.id}')"
                    class="bg-red-50 hover:bg-red-100 text-red-700 text-xs px-3 py-2 rounded-lg whitespace-nowrap">
                    Deactivate
                </button>

            </div>
        </td>

                </tr>
            `;

        }).join("")
        : `
            <tr>
                <td colspan="7"
                    class="text-center py-8 text-slate-400">
                    No medicines in stock.
                </td>
            </tr>
        `;

    return;
}


        // TAB 3: MEDICAL SUPPLIES - SUPABASE

if (pharmTab === "supplies") {

    const searchTerm = (
        document.getElementById("pharm-search")?.value || ""
    ).trim().toLowerCase();

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

    body.innerHTML = `
        <tr>
            <td colspan="6" class="text-center py-6">
                Loading medical supplies...
            </td>
        </tr>
    `;

    // Fetch supplies from Supabase.
    const { data, error } = await supabaseClient
        .from("medical_supplies")
        .select(`
            id,
            name,
            quantity,
            reorder_level,
            expiry_date,
            main,
            active,
            dispensary,
            is_active
        `)
        .eq("is_active", true)
        .order("name");

    if (error) {
        console.error("Medical supplies loading error:", error);

        body.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-red-600 py-6">
                    Unable to load medical supplies.
                </td>
            </tr>
        `;

        return;
    }

   

    // Apply search filter.
    const supplies = (data || []).filter(supply =>
        String(supply.name || "")
            .toLowerCase()
            .includes(searchTerm)
    );

    // Display supplies.
    body.innerHTML = supplies.length
        ? supplies.map(supply => {

            const low =
                Number(supply.dispensary || 0) < 10;

            return `
                <tr class="border-b border-slate-100 hover:bg-slate-50">

                    <td class="py-3 pr-3 font-medium">
                        ${supply.name}
                    </td>

                    <td class="py-3 pr-3">
                        ${supply.main ?? 0}
                    </td>

                    <td class="py-3 pr-3">
                        ${supply.active ?? 0}
                    </td>

                    <td class="py-3 pr-3">
                        ${supply.dispensary ?? 0}
                    </td>

                    <td class="py-3">
                        ${low
                            ? '<span class="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full">Low stock</span>'
                            : '<span class="text-slate-400 text-xs">—</span>'}
                    </td>

                   <td class="py-3">
            <div class="flex flex-wrap gap-2 min-w-[150px]">
                <button
                    type="button"
                    onclick="editSupply('${supply.id}')"
                    class="bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs px-3 py-2 rounded-lg whitespace-nowrap">
                    Edit
                </button>

                <button
                    type="button"
                    onclick="deactivateSupply('${supply.id}')"
                    class="bg-red-50 hover:bg-red-100 text-red-700 text-xs px-3 py-2 rounded-lg whitespace-nowrap">
                    Deactivate
                </button>
            </div>
        </td>

                </tr>
            `;

        }).join("")
        : `
            <tr>
                <td colspan="6"
                    class="text-center py-8 text-slate-400">
                    No medical supplies recorded.
                </td>
            </tr>
        `;

      return;
    }



// ==========================================
// TAB 4: INVENTORY HISTORY - SUPABASE
// ==========================================

if (pharmTab === "history") {

    const searchTerm = (
        document.getElementById("pharm-search")?.value || ""
    ).trim().toLowerCase();

    if (title) title.textContent = "Inventory History";

    if (description) {
        description.textContent =
            "Track all stock received and issued by the Pharmacy.";
    }

    head.innerHTML = `
        <th class="py-3 pr-3">Item</th>
        <th class="py-3 pr-3">Type</th>
        <th class="py-3 pr-3">Movement</th>
        <th class="py-3 pr-3">Quantity</th>
        <th class="py-3 pr-3">Details</th>
        <th class="py-3 pr-3">Recorded By</th>
        <th class="py-3">Date</th>
    `;

    body.innerHTML = `
        <tr>
            <td colspan="7" class="text-center py-6">
                Loading inventory history...
            </td>
        </tr>
    `;

    // Fetch inventory movements.
    const { data, error } = await supabaseClient
        .from("inventory_movements")
        .select(`
            id,
            item_type,
            medicine_id,
            supply_id,
            movement_type,
            quantity,
            notes,
            recorded_by,
            created_at
        `)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Inventory history error:", error);

        body.innerHTML = `
            <tr>
                <td colspan="7"
                    class="text-center text-red-600 py-6">
                    Unable to load inventory history.
                </td>
            </tr>
        `;

        return;
    }
    

    // Collect medicine and supply IDs.
    const medicineIds = [
        ...new Set(
            (data || [])
                .filter(item => item.medicine_id)
                .map(item => item.medicine_id)
        )
    ];

    const supplyIds = [
        ...new Set(
            (data || [])
                .filter(item => item.supply_id)
                .map(item => item.supply_id)
        )
    ];

    // Load medicine names.
    let medicineMap = {};

    if (medicineIds.length) {

        const { data: medicines, error: medicineError } =
            await supabaseClient
                .from("medicines")
                .select("id, name, strength")
                .in("id", medicineIds);

        if (medicineError) {
            console.error("Medicine history lookup error:", medicineError);
        } else {
            (medicines || []).forEach(medicine => {
                medicineMap[medicine.id] =
                    `${medicine.name} ${medicine.strength || ""}`.trim();
            });
        }
    }

    // Load medical supply names.
    let supplyMap = {};

    if (supplyIds.length) {

        const { data: supplies, error: supplyError } =
            await supabaseClient
                .from("medical_supplies")
                .select("id, name")
                .in("id", supplyIds);

        if (supplyError) {
            console.error("Supply history lookup error:", supplyError);
        } else {
            (supplies || []).forEach(supply => {
                supplyMap[supply.id] = supply.name;
            });
        }
    }

    // Apply search filter.
    const movements = (data || []).filter(item => {

        const itemName = item.item_type === "Medicine"
            ? medicineMap[item.medicine_id] || "Medicine"
            : supplyMap[item.supply_id] || "Medical Supply";

        return (
            itemName.toLowerCase().includes(searchTerm) ||
            String(item.movement_type || "").toLowerCase().includes(searchTerm) ||
            String(item.notes || "").toLowerCase().includes(searchTerm)
        );
    });

    // Get staff names from profiles
let staffMap = {};

const recordedByIds = [
    ...new Set(
        (movements || [])
            .filter(item => item.recorded_by)
            .map(item => item.recorded_by)
    )
];

if (recordedByIds.length) {
    const { data: profiles, error: profilesError } = await supabaseClient
        .from("profiles")
        .select("id, full_name")
        .in("id", recordedByIds);

    if (profilesError) {
        console.error("Staff history lookup error:", profilesError);
    } else {
        (profiles || []).forEach(profile => {
            staffMap[profile.id] = profile.full_name || "Staff";
        });
    }
}

    // Display inventory history.
    body.innerHTML = movements.length
        ? movements.map(item => {

            const itemName = item.item_type === "Medicine"
                ? medicineMap[item.medicine_id] || "Medicine"
                : supplyMap[item.supply_id] || "Medical Supply";

            const movementStyle =
                item.movement_type === "Stock In"
                    ? "bg-green-100 text-green-700"
                    : item.movement_type === "Stock Out"
                        ? "bg-red-100 text-red-700"
                        : "bg-blue-100 text-blue-700";

            const date = item.created_at
                ? new Date(item.created_at).toLocaleString()
                : "-";

            const staff = item.recorded_by
            ? staffMap[item.recorded_by] || "Staff"
            : "-";

            return `
                <tr class="border-b border-slate-100 hover:bg-slate-50">

                    <td class="py-3 pr-3 font-medium">
                        ${itemName}
                    </td>

                    <td class="py-3 pr-3">
                        ${item.item_type}
                    </td>

                    <td class="py-3 pr-3">
                        <span class="${movementStyle} text-xs px-2 py-1 rounded-full">
                            ${item.movement_type}
                        </span>
                    </td>

                    <td class="py-3 pr-3 font-semibold">
                        ${item.quantity}
                    </td>

                    <td class="py-3 pr-3">
                        ${item.notes || "-"}
                    </td>

                    <td class="py-3 pr-3 text-xs">
                        ${staff}
                    </td>

                    <td class="py-3 text-xs">
                        ${date}
                    </td>

                </tr>
            `;

        }).join("")
        : `
            <tr>
                <td colspan="7"
                    class="text-center py-8 text-slate-400">
                    No inventory movements recorded yet.
                </td>
            </tr>
        `;

    return;
}

} // End of renderPharmacy()


// ==========================================
// PHARMACY INVENTORY EDIT FORM
// ==========================================

function openPharmacyEditModal(type, item) {

    document.getElementById("pharm-edit-id").value = item.id;

    document.getElementById("pharm-edit-type").value = type;

    document.getElementById("pharm-edit-name").value =
        item.name || "";

    document.getElementById("pharm-edit-strength").value =
        item.strength || "";

    document.getElementById("pharm-edit-form").value =
        item.dosage_form || "";

    document.getElementById("pharm-edit-expiry").value =
        item.expiry_date || "";

    document.getElementById("pharm-edit-main").value =
        item.main ?? 0;

    document.getElementById("pharm-edit-active").value =
        item.active ?? 0;

    document.getElementById("pharm-edit-dispensary").value =
        item.dispensary ?? 0;

    const medicineFields =
        document.getElementById("pharm-edit-medicine-fields");

    medicineFields.classList.toggle(
        "hidden",
        type !== "Medicine"
    );

    document.getElementById("pharm-edit-title").textContent =
        type === "Medicine"
            ? "Edit Medicine"
            : "Edit Medical Supply";

    document.getElementById("pharm-edit-modal")
        .classList.remove("hidden");

    document.body.classList.add("overflow-hidden");
}


function closePharmacyEditModal() {

    document.getElementById("pharm-edit-modal")
        .classList.add("hidden");

    document.getElementById("pharm-edit-form").reset();

    document.body.classList.remove("overflow-hidden");
}


// ==========================================
// EDIT MEDICINE
// ==========================================

async function editMedicine(id) {

    const { data: medicine, error } = await supabaseClient
        .from("medicines")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !medicine) {

        console.error("Medicine loading error:", error);

        alert("Unable to load medicine details.");

        return;
    }

    openPharmacyEditModal("Medicine", medicine);
}


// ==========================================
// EDIT MEDICAL SUPPLY
// ==========================================

async function editSupply(id) {

    const { data: supply, error } = await supabaseClient
        .from("medical_supplies")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !supply) {

        console.error("Supply loading error:", error);

        alert("Unable to load medical supply details.");

        return;
    }

    openPharmacyEditModal("Supply", supply);
}


// ==========================================
// SAVE PHARMACY INVENTORY EDIT
// ==========================================

async function savePharmacyInventoryEdit(event) {

    event.preventDefault();

    const id =
        document.getElementById("pharm-edit-id").value;

    const type =
        document.getElementById("pharm-edit-type").value;

    const name =
        document.getElementById("pharm-edit-name").value.trim();

    const strength =
        document.getElementById("pharm-edit-strength").value.trim();

    const dosageForm =
        document.getElementById("pharm-edit-form").value.trim();

    const expiry =
        document.getElementById("pharm-edit-expiry").value;

    const main =
        Number(document.getElementById("pharm-edit-main").value);

    const active =
        Number(document.getElementById("pharm-edit-active").value);

    const dispensary =
        Number(document.getElementById("pharm-edit-dispensary").value);

    // Validate information.
    if (!id || !name) {

        alert("Please provide a valid item name.");

        return;
    }

    const quantities = [main, active, dispensary];

    if (
        quantities.some(q =>
            !Number.isInteger(q) || q < 0
        )
    ) {

        alert("Quantities must be whole numbers and cannot be negative.");

        return;
    }

    if (type === "Medicine" && (!strength || !dosageForm)) {

        alert("Please enter the medicine strength and dosage form.");

        return;
    }

    const updateData = {

        name: name,

        expiry_date: expiry || null,

        main: main,

        active: active,

        dispensary: dispensary,

        quantity: main + active + dispensary

    };

    const table = type === "Medicine"
        ? "medicines"
        : "medical_supplies";

    if (type === "Medicine") {

        updateData.strength = strength;

        updateData.dosage_form = dosageForm;

    } else if (type !== "Supply") {

        alert("Invalid inventory item.");

        return;
    }

    const { error } = await supabaseClient
        .from(table)
        .update(updateData)
        .eq("id", id);

    if (error) {

        console.error("Inventory update error:", error);

        alert("Unable to update inventory.");

        return;
    }

    closePharmacyEditModal();

    alert("Inventory updated successfully.");

    await renderPharmacy();
}        


// ==========================================
// DISPENSE PRESCRIPTION
// ==========================================

async function dispensePrescription(id) {

    const confirmed = confirm(
        "Are you sure you want to dispense this prescription?"
    );

    if (!confirmed) return;

    const { error } = await supabaseClient.rpc(
        "dispense_pharmacy_prescription",
        {
            p_prescription_id: id
        }
    );

    if (error) {
        console.error("Dispensing error:", error);
        alert(error.message || "Unable to dispense prescription.");
        return;
    }

    alert("Prescription dispensed successfully.");

    await renderPharmacy();
    await updatePharmacySummary();
}


// ==========================================
// MARK PRESCRIPTION UNAVAILABLE
// ==========================================

async function markPrescriptionUnavailable(id) {

    const confirmed = confirm(
        "Are you sure this prescription item is unavailable?"
    );

    if (!confirmed) return;

    const { error } = await supabaseClient.rpc(
        "mark_pharmacy_prescription_unavailable",
        {
            p_prescription_id: id
        }
    );

    if (error) {
        console.error("Prescription update error:", error);
        alert(error.message || "Unable to update prescription.");
        return;
    }

    alert("Prescription marked as unavailable.");

    await renderPharmacy();
    await updatePharmacySummary();
}


// ==========================================
// UPDATE RESTOCK ITEMS
// ==========================================

async function updateRestockItems() {

    const type = document.getElementById("restock-type").value;

    const itemSelect = document.getElementById("restock-item");

    if (!itemSelect) return;

    itemSelect.innerHTML =
        '<option value="">Loading items...</option>';

    const table = type === "Medicine"
        ? "medicines"
        : "medical_supplies";

    const { data, error } = await supabaseClient
        .from(table)
        .select("id, name")
        .eq("is_active", true)
        .order("name");

    if (error) {
        console.error("Restock items loading error:", error);

        itemSelect.innerHTML =
            '<option value="">Unable to load items</option>';

        return;
    }

    itemSelect.innerHTML =
        '<option value="">Select an item</option>';

    (data || []).forEach(item => {

        const option = document.createElement("option");

        option.value = item.id;
        option.textContent = item.name;

        itemSelect.appendChild(option);

    });
}


// ==========================================
// SAVE RESTOCK
// ==========================================

async function saveRestock(event) {

    event.preventDefault();

    const type = document.getElementById("restock-type").value;

    const itemId = document.getElementById("restock-item").value;

    const store = document.getElementById("restock-store").value;

    const quantity = Number(
        document.getElementById("restock-quantity").value
    );

    if (!itemId || !Number.isInteger(quantity) || quantity <= 0) {

        alert("Please select an item and enter a valid quantity.");

        return;
    }

    const { error } = await supabaseClient.rpc(
        "restock_pharmacy_inventory",
        {
            p_item_type: type,
            p_item_id: itemId,
            p_store: store,
            p_quantity: quantity
        }
    );

    if (error) {

        console.error("Restock error:", error);

        alert(error.message || "Unable to restock inventory.");

        return;
    }

    alert("Stock added successfully.");

    document.getElementById("restock-form").reset();

    closeRestockForm();

    await updateRestockItems();

    await renderPharmacy();

    await updatePharmacySummary();
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


async function saveNewMedicine(event) {
    event.preventDefault();

    const name = document.getElementById("new-medicine-name").value.trim();
    const strength = document.getElementById("new-medicine-strength").value.trim();
    const form = document.getElementById("new-medicine-form").value;
    const expiry = document.getElementById("new-medicine-expiry").value;

    const main = Number(document.getElementById("new-medicine-main").value);
    const active = Number(document.getElementById("new-medicine-active").value);
    const dispensary = Number(document.getElementById("new-medicine-dispensary").value);

    // Validate required information.
    if (!name || !strength || !form) {
        alert("Please complete all required medicine details.");
        return;
    }

    // Validate quantities.
    if (
        !Number.isFinite(main) ||
        !Number.isFinite(active) ||
        !Number.isFinite(dispensary) ||
        main < 0 ||
        active < 0 ||
        dispensary < 0
    ) {
        alert("Please enter valid medicine quantities.");
        return;
    }

    const fullQuantity = main + active + dispensary;

    // Check whether this medicine already exists.
    const { data: existingMedicine, error: checkError } =
        await supabaseClient
            .from("medicines")
            .select("id")
            .eq("name", name)
            .eq("strength", strength)
            .maybeSingle();

    if (checkError) {
        console.error("Medicine duplicate check error:", checkError);
        alert("Unable to check existing medicines.");
        return;
    }

    if (existingMedicine) {
        alert("This medicine already exists in the inventory.");
        return;
    }

    // Prepare medicine record.
    const newMedicine = {
        name: name,
        strength: strength,
        dosage_form: form,
        quantity: fullQuantity,
        reorder_level: 10,
        expiry_date: expiry || null,
        main: main,
        active: active,
        dispensary: dispensary,
        is_active: true
    };

    // Save medicine to Supabase.
    const { data, error } = await supabaseClient
        .from("medicines")
        .insert([newMedicine])
        .select()
        .single();

    if (error) {
        console.error("Medicine saving error:", error);
        alert("Unable to save medicine. Check the console for details.");
        return;
    }

    // Clear and close the form.
    event.target.reset();

    closeAddMedicineForm();

    // Refresh inventory and summary.
    await renderPharmacy();

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


async function saveNewSupply(event) {
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

    // Validate supply name.
    if (!name) {
        alert("Please enter the supply name.");
        return;
    }

    // Validate quantities.
    if (
        !Number.isFinite(main) ||
        !Number.isFinite(active) ||
        !Number.isFinite(dispensary) ||
        main < 0 ||
        active < 0 ||
        dispensary < 0
    ) {
        alert("Please enter valid supply quantities.");
        return;
    }

    // Check for an existing supply.
    const { data: existingSupply, error: checkError } =
        await supabaseClient
            .from("medical_supplies")
            .select("id")
            .ilike("name", name)
            .maybeSingle();

    if (checkError) {
        console.error("Supply duplicate check error:", checkError);
        alert("Unable to check existing medical supplies.");
        return;
    }

    if (existingSupply) {
        alert("This medical supply already exists in the inventory.");
        return;
    }

    // Calculate total quantity.
    const totalQuantity = main + active + dispensary;

    // Prepare supply record.
    const newSupply = {
        name: name,
        quantity: totalQuantity,
        reorder_level: 10,
        expiry_date: expiry || null,
        main: main,
        active: active,
        dispensary: dispensary,
        is_active: true
    };

    // Save to Supabase.
    const { data, error } = await supabaseClient
        .from("medical_supplies")
        .insert([newSupply])
        .select()
        .single();

    if (error) {
        console.error("Supply saving error:", error);
        alert("Unable to save medical supply. Check the console.");
        return;
    }

    // Reset and close form.
    event.target.reset();

    closeAddSupplyForm();

    await renderPharmacy();

    alert("New medical supply added successfully.");
}





