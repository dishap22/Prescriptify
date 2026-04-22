import React, { useState, useEffect } from 'react';
import '../styles/Common.css';
import '../styles/CreatePrescription.css';
import { PlusCircle, Loader2 } from 'lucide-react';

const CreatePrescription = ({ 
  patientId, setPatientId, 
  selectedMed, setSelectedMed, 
  handleIssue, loading, medicines 
}) => {
  // Local state for simplified inputs
  const [doseValue, setDoseValue] = useState(500);
  const [doseUnit, setDoseUnit] = useState('mg');
  const [freqValue, setFreqValue] = useState(3);
  const [duration, setDuration] = useState(7);

  // Hardcode patient for prototype
  useEffect(() => {
    setPatientId('PAT-101');
  }, [setPatientId]);

  const onSubmit = (e) => {
    e.preventDefault();
    // Simplified formats
    const dosage = `${doseValue}${doseUnit}`;
    const frequency = `${freqValue} times a day`;
    
    handleIssue(dosage, frequency, duration);
  };

  return (
    <div className="dashboard-content animate-fade-in">
      <div className="d-header">
        <h2>Create Prescription</h2>
        <p>Issue medical orders with simplified, intuitive controls.</p>
      </div>
      <form className="prescription-form glass" onSubmit={onSubmit}>
        <div className="form-section">
          <h4>Patient Identification</h4>
          <div className="input-group">
            <label>Patient ID (Prototype Default)</label>
            <input type="text" className="input-field disabled" value={patientId} readOnly />
          </div>
        </div>

        <div className="form-section">
          <h4>Medication Details</h4>
          <div className="input-grid">
            <div className="input-group">
              <label>Medicine</label>
              <select className="input-field" value={selectedMed} onChange={e => setSelectedMed(e.target.value)}>
                {medicines.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
              </select>
            </div>

            <div className="input-group">
              <label>Dosage</label>
              <div className="freq-container">
                <input type="number" min="1" value={doseValue} onChange={e => setDoseValue(e.target.value)} />
                <select className="input-field" value={doseUnit} onChange={e => setDoseUnit(e.target.value)}>
                  <option value="mg">mg (Tablet)</option>
                  <option value="mL">mL (Syrup)</option>
                </select>
              </div>
            </div>

            <div className="input-group">
              <label>Frequency (Times a Day)</label>
              <input type="number" className="input-field" min="1" max="10" value={freqValue} onChange={e => setFreqValue(e.target.value)} />
            </div>

            <div className="input-group">
              <label>Duration (Days)</label>
              <input type="number" className="input-field" value={duration} onChange={e => setDuration(e.target.value)} required min={1} max={365} />
            </div>
          </div>
        </div>

        <button type="submit" className="btn btn-primary w-full" disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : <><PlusCircle size={18} style={{marginRight:'8px'}}/> Issue Prescription</>}
        </button>
      </form>
    </div>
  );
};

export default CreatePrescription;
