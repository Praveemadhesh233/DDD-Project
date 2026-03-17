import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { Activity, LayoutDashboard, Info, ShieldAlert } from 'lucide-react';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import About from './pages/About';

function App() {
  return (
    <Router>
      <div className="app-container">
        <nav className="navbar">
          <NavLink to="/" className="nav-brand">
            <ShieldAlert className="nav-brand-icon" size={28} />
            <span>DriveSafe AI</span>
          </NavLink>
          
          <div className="nav-links">
            <NavLink to="/" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
              <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <Activity size={18} /> Monitor
              </div>
            </NavLink>
            <NavLink to="/dashboard" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
              <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <LayoutDashboard size={18} /> Logs
              </div>
            </NavLink>
            <NavLink to="/about" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
              <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <Info size={18} /> About
              </div>
            </NavLink>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
