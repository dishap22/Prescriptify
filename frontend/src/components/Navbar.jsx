import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import '../styles/Navbar.css';
import { LogOut, Menu, X, ArrowLeft } from 'lucide-react';

const Navbar = ({ setUser, setRole, isMenuOpen, setIsMenuOpen, setFoundPrescription, setActiveTab, setSearchId, setPatientId }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const showBack = location.pathname !== '/';
  const user = JSON.parse(localStorage.getItem('user'));

  const resetState = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setRole(null);
    setFoundPrescription(null);
    setActiveTab('action');
    setSearchId('');
    setPatientId('');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/'; // Forced refresh to clear all states
  };

  return (
    <nav className="navbar glass">
      <div className="container nav-content">
        <Link to="/" className="logo-section" onClick={resetState}>
          <div className="logo-icon">P</div>
          <span className="logo-text">Prescriptify</span>
        </Link>
        
        <div className={`nav-links ${isMenuOpen ? 'open' : ''}`}>
          {user && (
            <div className="user-greeting">
              <span className="greeting-label">Hello,</span>
              <span className="greeting-name">{user.name}</span>
            </div>
          )}
          {showBack && (
            <button className="nav-link go-back-btn" onClick={() => navigate(-1)}>
              <ArrowLeft size={18} /> Back
            </button>
          )}

          {user ? (
            <button className="nav-link logout-btn" onClick={handleLogout}>
              <LogOut size={18} /> Logout
            </button>
          ) : location.pathname === '/auth' ? null : (
            <Link to="/auth" className="btn btn-primary">Get Started</Link>
          )}
        </div>

        <button className="menu-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X /> : <Menu />}
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
