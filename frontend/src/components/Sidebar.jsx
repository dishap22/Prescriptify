import React from 'react';
import '../styles/Dashboard.css';
import { PlusCircle, Search, User as UserIcon } from 'lucide-react';

const Sidebar = ({ role, ROLES, activeTab, setActiveTab }) => (
  <aside className="sidebar glass">
    <div className="sidebar-links">
      <button 
        className={`sidebar-link active`} 
      >
        {role === ROLES.DOCTOR && <><PlusCircle size={20}/> Issue Prescription</>}
        {role === ROLES.PHARMACIST && <><Search size={20}/> Verify & Dispense</>}
        {role === ROLES.PATIENT && <><UserIcon size={20}/> My Prescriptions</>}
      </button>
    </div>
    <div className="user-profile">
      <div className="avatar">{role?.[0]}</div>
      <div className="user-info">
        <p className="user-name">{role}</p>
        <p className="user-status">Online</p>
      </div>
    </div>
  </aside>
);

export default Sidebar;
