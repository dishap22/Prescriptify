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
import LoginPage from './pages/LoginPage';
import CreatePrescription from './pages/CreatePrescription';
import VerifyPrescription from './pages/VerifyPrescription';
import ActivePrescriptions from './pages/ActivePrescriptions';

// Global Styles
import './index.css';

// --- API Config ---
const API = axios.create({
  baseURL: 'http://localhost:5000/api'
});

// Add logic to include JWT in all requests
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const ROLES = {
  DOCTOR: 'DOCTOR',
  PHARMACIST: 'PHARMACIST',
  PATIENT: 'PATIENT'
};

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [role, setRole] = useState(() => {
    const saved = localStorage.getItem('user');
    try {
      return saved ? JSON.parse(saved).role : null;
    } catch (e) {
      return null;
    }
  });
  const [activeTab, setActiveTab] = useState('action');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Shared Data States
  const [medicines, setMedicines] = useState([]);
  const [patientId, setPatientId] = useState('');
  const [selectedMed, setSelectedMed] = useState('');
  
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

  const handleIssue = async (dosageVal, freqVal, durVal) => {
    if (!patientId || !dosageVal || !freqVal || !durVal) return showMsg("Please fill all fields", "error");
    
    const durNum = Number(durVal);
    if (durNum <= 0 || durNum > 365) return showMsg("Duration must be between 1 and 365 days", "error");

    setLoading(true);
    try {
      const res = await API.post('/prescriptions', {
        patientId,
        doctorId: user?.userId || 'DOC-001',
        medications: [{ medicine: selectedMed, dosage: dosageVal, frequency: freqVal, duration: durNum }]
      }, { headers: { 'x-user-role': role } });
      
      showMsg("Prescription issued successfully! ID: " + res.data.prescriptionId, "success");
      setPatientId('');
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
      const headers = { 'x-user-role': role };
      // Identity for RBAC ownership check
      if (role === ROLES.PATIENT) headers['x-patient-id'] = user?.userId || 'PAT-101';
      
      const res = await API.get(`/prescriptions/${id}/verify`, { headers });
      setFoundPrescription(res.data.prescription || res.data);
    } catch (err) {
      console.error("Verification failed:", err.response?.data);
      showMsg(err.response?.data?.error || "Prescription verification failed.", "error");
      // Set to null or a special error state so the UI updates
      setFoundPrescription({ error: err.response?.data?.error || "Verification failed." });
    } finally {
      setLoading(false);
    }
  };

  const handleDispense = async (id) => {
    setLoading(true);
    try {
      await API.patch(`/prescriptions/${id}/dispense`, {}, {
        headers: { 'x-user-role': role }
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
          setUser={setUser}
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
            <Route path="/auth" element={<LoginPage setUser={setUser} setRole={setRole} ROLES={ROLES} />} />
            
            <Route path="/dashboard" element={
              user ? (
                <div className="container dashboard-container">
                  <Sidebar role={role} ROLES={ROLES} activeTab={activeTab} setActiveTab={setActiveTab} />
                  <section className="view-content">
                    {role === ROLES.DOCTOR && (
                      <CreatePrescription 
                        patientId={patientId} setPatientId={setPatientId}
                        selectedMed={selectedMed} setSelectedMed={setSelectedMed}
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
                    {role === ROLES.PATIENT && <ActivePrescriptions patientId={user?.userId} handleVerify={handleVerify} />}
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
