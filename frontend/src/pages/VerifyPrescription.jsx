import React, { useState, useEffect } from 'react';
import '../styles/Common.css';
import '../styles/VerifyPrescription.css';
import { Search, CheckCircle, XCircle, AlertCircle, Loader2, ShieldCheck, Zap, Copy } from 'lucide-react';

const VerifyPrescription = ({ searchId, setSearchId, foundPrescription, handleVerify, handleDispense, loading }) => {
  const [verifying, setVerifying] = useState(false);
  const [steps, setSteps] = useState([
    { id: 1, name: 'Authenticity Check', status: 'pending' },
    { id: 2, name: 'Fraud Detection', status: 'pending' },
    { id: 3, name: 'Duplicate Check', status: 'pending' }
  ]);

  const onVerifyClick = async () => {
    setVerifying(true);
    // Reset steps
    setSteps(s => s.map(step => ({ ...step, status: 'pending' })));

    // Slow down the animation for prototype feel
    for (let i = 0; i < 3; i++) {
       setSteps(current => current.map((s, idx) => idx === i ? { ...s, status: 'loading' } : s));
       await new Promise(r => setTimeout(r, 800));
       setSteps(current => current.map((s, idx) => idx === i ? { ...s, status: 'complete' } : s));
    }

    await handleVerify();
    setVerifying(false);
  };

  const errorMessage = foundPrescription?.isValid === false ? "Verification Failed: Duplicate or Fraudulent pattern detected." : null;

  return (
    <div className="dashboard-content animate-fade-in">
      <div className="d-header">
        <h2>Pharmacist Portal</h2>
        <p>Verify and dispense medical orders with security checks.</p>
      </div>

      <div className="search-bar glass">
        <Search className="search-icon" size={20} />
        <input 
          type="text" 
          className="search-input" 
          placeholder="Enter Prescription ID (e.g. RX-VAL-001)..." 
          value={searchId} 
          onChange={e => setSearchId(e.target.value)} 
        />
        <button 
          className="btn btn-accent" 
          onClick={onVerifyClick} 
          disabled={loading || verifying}
        >
          {verifying ? <Loader2 className="animate-spin" /> : "Verify Security"}
        </button>
      </div>

      {verifying && (
        <div className="verification-steps glass animate-slide-up">
          <h4>Running Security Chain...</h4>
          <div className="steps-list">
            {steps.map(step => (
              <div key={step.id} className={`step-item ${step.status}`}>
                 {step.status === 'complete' ? <CheckCircle size={18} className="text-success" /> : 
                  step.status === 'loading' ? <Loader2 size={18} className="animate-spin text-mauve" /> : 
                  <ShieldCheck size={18} className="text-muted" />}
                 <span>{step.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {foundPrescription && !verifying && (
        <div className="prescription-result animate-slide-up">
           {/* If the backend returned an internal error state in the body */}
           {foundPrescription.error ? (
              <div className="alert-box glass error text-center">
                 <AlertCircle size={18} /> {foundPrescription.error}
              </div>
           ) : (
             <div className="result-card glass">
               <div className="card-badge success">
                 <ShieldCheck size={16} /> Certified Authentic
               </div>
               
               <div className="res-header">
                 <h3>{foundPrescription._id}</h3>
                 <div className={`status-pill ${foundPrescription.status.toLowerCase()}`}>
                   {foundPrescription.status}
                 </div>
               </div>

               <div className="res-meta">
                  <div className="meta-box">
                    <label>PATIENT</label>
                    <p>{foundPrescription.patientId}</p>
                  </div>
                  <div className="meta-box">
                    <label>ISSUED BY</label>
                    <p>{foundPrescription.doctorId || "Certified Physician"}</p>
                  </div>
               </div>

               <div className="meds-table">
                 {foundPrescription.medications && foundPrescription.medications.map((m, i) => (
                   <div key={i} className="med-row">
                     <div className="med-info">
                       <strong>{(m.medicine && m.medicine.name) || m.medicine}</strong>
                       <span>{m.dosage} • {m.frequency}</span>
                     </div>
                     <div className="med-dur">{m.duration} Days</div>
                   </div>
                 ))}
               </div>

               {foundPrescription.status === 'ACTIVE' || foundPrescription.status === 'PENDING' ? (
                 <button 
                   className="btn btn-primary w-full dispense-btn" 
                   onClick={() => handleDispense(foundPrescription._id)}
                   disabled={loading}
                 >
                   {loading ? <Loader2 className="animate-spin" /> : <><Zap size={18} /> Confirm Dispensing</>}
                 </button>
               ) : (
                 <div className="alert-box glass warning text-center">
                    <AlertCircle size={18} /> This prescription has already been processed.
                 </div>
               )}
             </div>
           )}
        </div>
      )}
    </div>
  );
};

export default VerifyPrescription;
