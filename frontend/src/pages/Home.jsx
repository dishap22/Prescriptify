import React from 'react';
import '../styles/Home.css';

const Home = ({ setRole, setView, ROLES }) => (
  <section className="hero-section container animate-fade-in">
    <div className="hero-badge">Seamless. Secure. Centralized.</div>
    <h1 className="hero-title">
      The Future of <span className="text-mauve">Prescription</span> <br />
      Management is <span className="text-yellow">Here</span>.
    </h1>
    <p className="hero-subtitle">
      A state-of-the-art platform for doctors to issue and pharmacies to verify
      prescriptions with absolute security and zero fraud.
    </p>
    <div className="hero-actions">
      <button className="btn btn-primary" onClick={() => setView('auth')}>Get Started</button>
    </div>

    <div className="hero-stats grid-cards">
      <div className="stat-card glass">
        <h3>2k+</h3>
        <p>Active Doctors</p>
      </div>
      <div className="stat-card glass">
        <h3>50k+</h3>
        <p>Verified Prescriptions</p>
      </div>
      <div className="stat-card glass">
        <h3>Zero</h3>
        <p>Fraud Cases</p>
      </div>
    </div>
  </section>
);

export default Home;
