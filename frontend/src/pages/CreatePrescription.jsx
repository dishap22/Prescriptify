import React from 'react';
import '../styles/Common.css';
import '../styles/CreatePrescription.css';
import { PlusCircle, Loader2 } from 'lucide-react';

const CreatePrescription = ({ patientId, setPatientId, selectedMed, setSelectedMed, dosage, setDosage, frequency, setFrequency, duration, setDuration, medicines, handleIssue, loading }) => {
  
  const onSubmit = (e) => {
    e.preventDefault();
    handleIssue();
  };

  return (
    <div className="dashboard-content animate-fade-in">
      <div className="d-header">
        <h2>Create Prescription</h2>
        <p>Issue secure, verified medical orders in seconds.</p>
      </div>
      <form className="prescription-form glass" onSubmit={onSubmit}>
        <div className="form-section">
          <h4>Patient Identification</h4>
          <div className="input-group">
            <label>Patient ID</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="e.g. PAT-101" 
              value={patientId} 
              onChange={e => setPatientId(e.target.value)} 
              required
            />
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
              <input 
                type="text" 
                className="input-field" 
                placeholder="500mg" 
                value={dosage} 
                onChange={e => setDosage(e.target.value)} 
                required
                maxLength={50}
              />
            </div>
            <div className="input-group">
              <label>Frequency</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="1-0-1" 
                value={frequency} 
                onChange={e => setFrequency(e.target.value)} 
                required
                maxLength={50}
              />
            </div>
            <div className="input-group">
              <label>Duration (Days)</label>
              <input 
                type="number" 
                className="input-field" 
                placeholder="7" 
                value={duration} 
                onChange={e => setDuration(e.target.value)} 
                required
                min={1}
                max={365}
              />
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
