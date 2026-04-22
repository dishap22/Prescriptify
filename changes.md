**backend/middleware/auth.js** Changed line 15 from VIEW_OWN_PRESCRIPTION TO VIEW_PRESCRIPTION according to schema

**backend/.env** moved to be gitignored

**modify **index.js** to add more apis for 1) Verify/Get Prescription 2) List Patient Prescriptions  3) Seed Medicines for testing logic

**logic shift** moved verification chain from creation to search step for pharmacists.

**UI Refactor** split dosage into 3 inputs and frequency into unit-based controls for better UX.

also commented out mongoose connection since i was using mockdb for testing for now


