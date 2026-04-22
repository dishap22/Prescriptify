import React from 'react';
import '../styles/Auth.css';
import { Stethoscope, ShieldCheck, User as UserIcon } from 'lucide-react';

const Auth = ({ setRole, setView, ROLES }) => (
  <section className="auth-section container animate-fade-in">
    <h2 className="section-title">Select Your Role</h2>
    <div className="grid-cards">
      <div className="role-card glass" onClick={() => { setRole(ROLES.DOCTOR); setView('dashboard'); }}>
        <div className="role-icon-wrapper doctor"><Stethoscope size={32} className="icon-doctor" /></div>
        <h3>Doctor</h3>
        <p>Issue and manage prescriptions.</p>
      </div>
      <div className="role-card glass" onClick={() => { setRole(ROLES.PHARMACIST); setView('dashboard'); }}>
        <div className="role-icon-wrapper pharmacist"><ShieldCheck size={32} className="icon-pharmacist" /></div>
        <h3>Pharmacist</h3>
        <p>Verify and dispense medication.</p>
      </div>
      <div className="role-card glass" onClick={() => { setRole(ROLES.PATIENT); setView('dashboard'); }}>
        <div className="role-icon-wrapper patient"><UserIcon size={32} className="icon-patient" /></div>
        <h3>Patient</h3>
        <p>Access your health history.</p>
      </div>
    </div>
  </section>
);

export default Auth;
