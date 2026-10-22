# BUK-CMS — Prototype Setup Guide

## Folder structure (check this first)
`data.js` and `app.js` only work if they sit **inside a folder named `js`**,
right next to `index.html`. If they are loose next to `index.html` instead,
the browser cannot find them and nothing will run.

```
buk-cms/
  index.html
  js/
    data.js
    app.js
  SETUP-GUIDE.md
  supabase-schema.sql
```

Also: double-clicking `data.js` or `app.js` on its own does nothing. A `.js`
file is not a program you open by itself — it is code that `index.html`
loads for you. You only ever open `index.html`.

## What you have
`index.html` is a **complete, clickable prototype** of BUK-CMS. It runs
entirely in the browser with demo data stored in `localStorage` — no backend
required to demo it for your supervisor.

It covers the four roles from Chapter 1 (Records Officer, Nurse, Doctor,
Pharmacist/Lab Officer) plus a Reports view, following the real process you
recorded in Chapter 3: registration with the simulated student registry,
the priority queue, nurse triage, doctor consultation (with drug-reaction
flag and lab/radiology request), and pharmacy dispensing with stock tracking.

## How to try it
Open `index.html` in a browser (Live Server in VS Code is best). Try this
flow to see everything work:

1. **Home** → **Staff Login** → sign in as **Records Officer** (any email/password).
2. Enter matric number `CST/23/SWE/01150`, click **Look up** → Name and
   Department fill in by themselves.
3. Fill in the phone number, pick **Emergency**, click **Complete
   Registration** → see the patient appear in the queue on the right.
4. Click **Logout**, sign back in as **Triage Nurse** → **Call** the patient
   → fill in vital signs → **Save & send to Doctor**.
5. Logout, sign in as **Doctor** → **Open** the patient → write a diagnosis
   → either **Send request** (lab/radiology) or write a prescription and
   **send to Pharmacy**.
6. Logout, sign in as **Pharmacist** → enter a lab result (sends it back to
   the Doctor) or **Dispense** a prescription → check the **Drug Stock** tab.
7. Click **Reports** in the top bar at any time to see the clinic-wide
   counts, including low-stock and expiring-soon drugs.

## Moving from demo data to real Supabase
Every screen in `app.js` only ever calls the functions in `data.js`
(`findStudent`, `registerPatient`, `getVisitsByStatus`, `updateVisit`,
`getDrugs`, ...). `app.js` never touches `localStorage` directly. That means
you can rewrite the **inside** of each `data.js` function to call Supabase
instead, without changing `app.js` or `index.html` at all.

```js
// Before (demo, in data.js):
function findStudent(matric) {
  return REGISTRY.find((s) => s.matric.toLowerCase() === matric.trim().toLowerCase());
}

// After (Supabase):
async function findStudent(matric) {
  const { data } = await sb.from("students_registry").select("*").eq("matric", matric).maybeSingle();
  return data;
}
```

Because the Supabase version is `async`, every place that calls it needs
`await`, and the functions that call *those* functions become `async` too
(for example `lookupStudent()` in `app.js`). This is the only mechanical
change `app.js` needs — the logic itself does not change.

Steps to connect for real:
1. Create a Supabase project, then run `supabase-schema.sql` in the SQL editor.
2. In `index.html`, add before your own scripts:
   ```html
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
   ```
3. At the top of `data.js`, add your project's URL and anon key (Project
   Settings → API):
   ```js
   const sb = supabase.createClient("YOUR_PROJECT_URL", "YOUR_ANON_KEY");
   ```
4. Rewrite the `data.js` functions **one at a time**, starting with
   `findStudent` and `registerPatient`, and test after each one before
   moving to the next.
5. Replace the role dropdown in the login form with real
   `sb.auth.signInWithPassword({ email, password })`, and read the role
   from the `profiles` table instead of the dropdown.
6. Turn on the Row Level Security policies already written at the bottom of
   `supabase-schema.sql`, then sign in as each role and confirm a Nurse
   cannot, for example, edit the drug stock.

## Suggested order to build this for your defense
1. Supabase auth + `profiles` (login really works, role comes from the database).
2. Records Officer: registry lookup + registration + queue.
3. Nurse: triage, reading and writing real visits.
4. Doctor: consultation, lab/radiology request, prescription.
5. Pharmacist: lab result entry, dispensing, stock.
6. Reports reading real counts, then Row Level Security on every table.

Each stage is a working demo on its own — useful if you need to show
progress at different supervision meetings.

## Suggested cuts if you're still short on time
- Moving stock between the three stores (main, active, dispensary) can stay
  a manual, outside-the-system process for this version — say so plainly in
  Chapter 5 as a limitation.
- A real patient photo upload can wait; Chapter 3 already lists this as a
  limitation.
- Backup can be a simple "Export visits as CSV" button rather than a full
  automatic backup system; note that Supabase's own backups cover the rest.
