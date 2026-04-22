import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import '../styles/Navbar.css';
import { LogOut, Menu, X, ArrowLeft } from 'lucide-react';

const Navbar = ({ setRole, isMenuOpen, setIsMenuOpen, setFoundPrescription, setActiveTab, setSearchId, setPatientId }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const showBack = location.pathname !== '/';

  const resetState = () => {
    setRole(null);
    setFoundPrescription(null);
    setActiveTab('action');
    setSearchId('');
    setPatientId('');
  };

  const handleLogout = () => {
    resetState();
    navigate('/');
  };

  return (
    <nav className="navbar glass">
      <div className="container nav-content">
        <Link to="/" className="logo-section" onClick={resetState}>
          <div className="logo-icon">P</div>
          <span className="logo-text">Prescriptify</span>
        </Link>
        
        <div className={`nav-links ${isMenuOpen ? 'open' : ''}`}>
          {showBack && (
            <button className="nav-link go-back-btn" onClick={() => navigate(-1)}>
              <ArrowLeft size={18} /> Back
            </button>
          )}

          {location.pathname === '/dashboard' ? (
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
