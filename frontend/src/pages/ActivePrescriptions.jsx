import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../styles/Common.css';
import '../styles/ActivePrescriptions.css';
import { Pill, Clock, User as UserIcon, Loader2, RefreshCw } from 'lucide-react';

const ActivePrescriptions = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMyPrescriptions = async () => {
    setLoading(true);
    try {
      // In a real app, PAT-101 would come from auth context
      const res = await axios.get('http://localhost:5000/api/patients/PAT-101/prescriptions');
      setPrescriptions(res.data);
    } catch (err) {
      console.error("Failed to fetch prescriptions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyPrescriptions();
  }, []);

  return (
    <div className="dashboard-content animate-fade-in">
      <div className="d-header">
        <div className="title-row">
          <h2>My Prescriptions</h2>
          <button className="icon-btn" onClick={fetchMyPrescriptions} title="Refresh Live Data">
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
        <p>Real-time view of your medical orders and status.</p>
      </div>

      {loading ? (
        <div className="flex-center p-40">
           <Loader2 className="animate-spin text-mauve" size={40} />
        </div>
      ) : (
        <div className="grid-cards">
          {prescriptions.map((px) => (
            <div key={px._id} className="prescription-detail-card glass">
              <div className="px-card-header">
                <div className="px-id-badge">{px._id}</div>
                <div className={`status-pill ${px.status.toLowerCase()}`}>{px.status}</div>
              </div>
              
              <div className="px-meta">
                <div className="meta-item">
                  <UserIcon size={14} />
                  <span>Doctor: {px.doctorId || "Assigned Physician"}</span>
                </div>
                <div className="meta-item">
                  <Clock size={14} />
                  <span>{new Date(px.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="medication-list">
                {px.medications.map((med, idx) => (
                  <div key={idx} className="medication-row">
                    <div className="med-icon">
                      <Pill size={16} />
                    </div>
                    <div className="med-details">
                      <div className="med-name">
                        {/* Support both populated and unpopulated medicine IDs */}
                        {med.medicine.name || med.medicine} <span className="med-dose">{med.dosage}</span>
                      </div>
                      <div className="med-instructions">{med.frequency} • {med.duration} days</div>
                    </div>
                  </div>
                ))}
              </div>

              {px.status === 'ACTIVE' || px.status === 'PENDING' ? (
                <button className="btn btn-primary w-full" onClick={() => {
                  navigator.clipboard.writeText(px._id);
                  alert("Prescription ID Copied! Share this with your Pharmacist.");
                }}>Copy ID for Pharmacy</button>
              ) : (
                <button className="btn btn-ghost w-full" disabled style={{opacity: 0.6}}>
                  {px.status === 'DISPENSED' ? 'Medical Record Closed' : 'History Record'}
                </button>
              )}
            </div>
          ))}
          {prescriptions.length === 0 && (
            <div className="glass empty-state w-full">
               <p>No prescriptions found for your ID.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ActivePrescriptions;
