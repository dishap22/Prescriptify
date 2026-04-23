import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../styles/Common.css';
import '../styles/ActivePrescriptions.css';
import { Pill, Clock, User as UserIcon, Loader2, RefreshCw, FileText } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const PrescriptionModal = ({ prescription, onClose }) => {
  if (!prescription) return null;

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center',
      alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(8px)'
    }}>
      <div className="glass modal-content" style={{
        maxWidth: '500px', width: '90%', padding: '32px', borderRadius: '28px',
        maxHeight: '90vh', overflowY: 'auto', position: 'relative',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.1)',
          border: 'none', color: 'white', width: '36px', height: '36px', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          transition: 'background 0.2s'
        }}>&times;</button>

        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '4px' }}>Prescription Details</h2>
          <p style={{ opacity: 0.6, fontSize: '0.9rem', fontFamily: 'monospace' }}>ID: {prescription._id}</p>
        </div>

        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          background: 'white', 
          padding: '20px', 
          borderRadius: '24px', 
          marginBottom: '28px',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)'
        }}>
          <QRCodeSVG value={prescription._id} size={220} />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '12px', opacity: 0.8 }}>Medications</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {prescription.medications.map((med, idx) => (
               <div key={idx} style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontWeight: 'bold', color: 'var(--primary)', marginBottom: '4px' }}>{med.medicine?.name || med.medicine}</div>
                  <div style={{ opacity: 0.7, fontSize: '0.85rem' }}>{med.dosage} • {med.frequency} • {med.duration} days</div>
               </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ opacity: 0.6, fontSize: '0.9rem' }}>Status</span>
            <span className={`badge badge-${prescription.status.toLowerCase()}`}>{prescription.status}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ opacity: 0.6, fontSize: '0.9rem' }}>Created On</span>
            <span style={{ opacity: 0.9, fontSize: '0.9rem' }}>{new Date(prescription.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
          </div>
        </div>

        <button className="btn btn-primary w-full" style={{ marginTop: '32px' }} onClick={onClose}>Close Portal</button>
      </div>
    </div>
  )
}

const ActivePrescriptions = ({ patientId }) => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPx, setSelectedPx] = useState(null);

  const fetchMyPrescriptions = async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:5000/api/patients/${patientId}/prescriptions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPrescriptions(res.data);
    } catch (err) {
      console.error("Failed to fetch prescriptions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyPrescriptions();
  }, [patientId]);

  return (
    <div className="dashboard-content animate-fade-in">
      {selectedPx && <PrescriptionModal prescription={selectedPx} onClose={() => setSelectedPx(null)} />}
      <div className="d-header">
        <div className="title-row">
          <h2 className="flex items-center gap-2">
            <FileText className="text-primary" />
            My Prescriptions
          </h2>
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
                        {/* Display populated name, string property, or fallback */}
                        {med.medicine?.name || (typeof med.medicine === 'string' ? med.medicine : 'Unknown Medicine')} 
                        <span className="med-dose">{med.dosage}</span>
                      </div>
                      <div className="med-instructions">{med.frequency} • {med.duration} days</div>
                    </div>
                  </div>
                ))}
              </div>

              {px.status === 'ACTIVE' || px.status === 'PENDING' ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setSelectedPx(px)}>
                    View QR & Details
                  </button>
                  <button className="btn btn-secondary" onClick={() => {
                    navigator.clipboard.writeText(px._id);
                    alert("Prescription ID Copied!");
                  }}>Copy ID</button>
                </div>
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
