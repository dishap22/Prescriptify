import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle2, AlertCircle } from 'lucide-react';

// Modules
import medicineData from './medicine.json';

// Components
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

// Pages
import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import CreatePrescription from './pages/CreatePrescription';
import VerifyPrescription from './pages/VerifyPrescription';
import ActivePrescriptions from './pages/ActivePrescriptions';

// Global Styles
import './index.css';

// --- API Config ---
const API = axios.create({
  baseURL: 'http://localhost:5000/api'
});

const ROLES = {
  DOCTOR: 'DOCTOR',
  PHARMACIST: 'PHARMACIST',
  PATIENT: 'PATIENT'
};

function App() {
  const [role, setRole] = useState(null);
  const [activeTab, setActiveTab] = useState('action');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Shared Data States
  const [medicines, setMedicines] = useState([]);
  const [patientId, setPatientId] = useState('');
  const [selectedMed, setSelectedMed] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [duration, setDuration] = useState('');
  
  const [searchId, setSearchId] = useState('');
  const [foundPrescription, setFoundPrescription] = useState(null);

  useEffect(() => {
    setMedicines(medicineData);
    if (medicineData.length > 0) setSelectedMed(medicineData[0]._id);
  }, []);

  const showMsg = (text, type = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleIssue = async () => {
    // Advanced Field Checks
    if (!patientId || !dosage || !frequency || !duration) return showMsg("Please fill all fields", "error");
    
    const durNum = Number(duration);
    if (durNum <= 0 || durNum > 365) return showMsg("Duration must be between 1 and 365 days", "error");
    
    if (dosage.length > 50) return showMsg("Dosage description is too long", "error");
    if (frequency.length > 50) return showMsg("Frequency description is too long", "error");

    setLoading(true);
    try {
      const res = await API.post('/prescriptions', {
        patientId,
        doctorId: 'DOC-001',
        medications: [{ medicine: selectedMed, dosage, frequency, duration: durNum }]
      }, { headers: { 'x-user-role': ROLES.DOCTOR } });
      
      showMsg("Prescription issued successfully! ID: " + res.data.id, "success");
      setPatientId('');
      setDosage('');
      setFrequency('');
      setDuration('');
    } catch (err) {
      showMsg(err.response?.data?.error || "Failed to issue prescription", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (id = searchId) => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await API.get(`/prescriptions/${id}`, { 
        headers: { 'x-user-role': ROLES.PHARMACIST } 
      });
      setFoundPrescription(res.data);
    } catch (err) {
      showMsg("Prescription not found.", "error");
      setFoundPrescription(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDispense = async (id) => {
    setLoading(true);
    try {
      await API.patch(`/prescriptions/${id}/dispense`, {}, {
        headers: { 'x-user-role': ROLES.PHARMACIST }
      });
      showMsg("Medication dispensed successfully!", "success");
      handleVerify(id); 
    } catch (err) {
      showMsg(err.response?.data?.error || "Failed to dispense", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Router>
      <div className="app-wrapper">
        <Navbar 
          setRole={setRole} 
          setFoundPrescription={setFoundPrescription}
          setActiveTab={setActiveTab}
          setSearchId={setSearchId}
          setPatientId={setPatientId}
        />
        
        {message && (
          <div className={`toast glass ${message.type}`}>
            {message.type === 'success' ? <CheckCircle2 size={18} className="text-success" /> : <AlertCircle size={18} className="text-error" />}
            {message.text}
          </div>
        )}
        
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage setRole={setRole} ROLES={ROLES} />} />
            <Route path="/auth" element={<AuthPage setRole={setRole} ROLES={ROLES} />} />
            
            <Route path="/dashboard" element={
              role ? (
                <div className="container dashboard-container">
                  <Sidebar role={role} ROLES={ROLES} activeTab={activeTab} setActiveTab={setActiveTab} />
                  <section className="view-content">
                    {role === ROLES.DOCTOR && (
                      <CreatePrescription 
                        patientId={patientId} setPatientId={setPatientId}
                        selectedMed={selectedMed} setSelectedMed={setSelectedMed}
                        dosage={dosage} setDosage={setDosage}
                        frequency={frequency} setFrequency={setFrequency}
                        duration={duration} setDuration={setDuration}
                        medicines={medicines} handleIssue={handleIssue} loading={loading}
                      />
                    )}
                    {role === ROLES.PHARMACIST && (
                      <VerifyPrescription 
                        searchId={searchId} setSearchId={setSearchId}
                        foundPrescription={foundPrescription}
                        handleVerify={handleVerify} handleDispense={handleDispense} loading={loading}
                      />
                    )}
                    {role === ROLES.PATIENT && <ActivePrescriptions />}
                  </section>
                </div>
              ) : <Navigate to="/auth" />
            } />
          </Routes>
        </main>

        <footer className="footer container">
          <p>&copy; 2026 Prescriptify. A Team-19 endeavour</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;
