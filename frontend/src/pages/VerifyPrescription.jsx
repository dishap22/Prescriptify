import React from 'react';
import '../styles/Common.css';
import '../styles/VerifyPrescription.css';
import { Search, Loader2, Pill } from 'lucide-react';

const VerifyPrescription = ({ searchId, setSearchId, foundPrescription, handleVerify, handleDispense, loading }) => (
  <div className="dashboard-content animate-fade-in">
    <div className="d-header">
      <h2>Verify & Dispense</h2>
      <p>Ensure authenticity before providing medication.</p>
    </div>
    <div className="search-bar glass">
      <Search className="search-icon" size={20} />
      <input type="text" className="search-input" placeholder="Enter Prescription ID..." value={searchId} onChange={e => setSearchId(e.target.value)} />
      <button className="btn btn-accent" onClick={() => handleVerify()} disabled={loading}>Verify</button>
    </div>

    {foundPrescription ? (
      <div className="prescription-card glass animate-fade-in">
        <div className="card-top">
          <div className="p-badge success">Authentic</div>
          <span className={`status-pill ${foundPrescription.status.toLowerCase()}`}>{foundPrescription.status}</span>
        </div>
        <div className="card-info">
           <div className="info-group">
             <span className="info-label">Prescription ID</span>
             <span className="info-value"># {foundPrescription._id.toUpperCase()}</span>
           </div>
           <div className="info-group">
             <span className="info-label">Issued To</span>
             <span className="info-value">{foundPrescription.patientId}</span>
           </div>
        </div>
        <div className="card-meds">
           {foundPrescription.medications.map((m, i) => (
             <div key={i} className="med-row">
               <div className="med-main">
                  <Pill size={16} className="text-mauve" />
                  <span className="med-name">{m.medicine.name}</span>
               </div>
               <span className="med-dose">{m.dosage} • {m.frequency}</span>
             </div>
           ))}
        </div>
        {foundPrescription.status !== 'DISPENSED' && (
          <button className="btn btn-primary w-full" onClick={() => handleDispense(foundPrescription._id)} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : 'Confirm Dispensing'}
          </button>
        )}
      </div>
    ) : searchId && !loading && <div className="glass empty-state-focused">No results. Check the ID and try again.</div>}
  </div>
);

export default VerifyPrescription;
