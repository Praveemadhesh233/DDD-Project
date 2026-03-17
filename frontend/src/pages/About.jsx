import React from 'react';
import { ShieldCheck, Eye, Activity, Bell } from 'lucide-react';

export default function About() {
  return (
    <div className="animate-slide-up">
      <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <ShieldCheck size={64} className="nav-brand-icon" style={{ margin: '0 auto 1rem' }} />
          <h1 className="text-gradient" style={{ fontSize: '2.5rem' }}>DriveSafe AI</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
            Advanced Driver Drowsiness Detection System
          </p>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h2>About the Project</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '1rem' }}>
            This system utilizes modern Computer Vision and Deep Learning techniques to monitor driver awareness in real-time. By tracking facial landmarks, particularly around the eyes and mouth, it can reliably detect signs of fatigue and alert the driver before a critical situation occurs.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="metric-box" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
            <Eye className="nav-brand-icon" size={32} />
            <div>
              <h3>Eye Tracking</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Monitors Eye Aspect Ratio (EAR) to detect prolonged blinks and microsleeps.</p>
            </div>
          </div>
          
          <div className="metric-box" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
            <Activity className="nav-brand-icon" size={32} />
            <div>
              <h3>Yawn Detection</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Calculates Mouth Aspect Ratio (MAR) to identify frequent yawning.</p>
            </div>
          </div>

          <div className="metric-box" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
            <Bell className="nav-brand-icon" size={32} />
            <div>
              <h3>Instant Alerts</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Triggers high-decibel audio alarms and continuous visual warnings upon detecting fatigue.</p>
            </div>
          </div>
        </div>

        <div>
          <h2>Setup & Usage</h2>
          <ul style={{ color: 'var(--text-secondary)', lineHeight: '1.6', paddingLeft: '1.5rem' }}>
            <li>Ensure you are in a brightly lit environment for optimal face detection.</li>
            <li>Position the camera directly in front of your face.</li>
            <li>Click "Start Monitoring" on the Monitor page.</li>
            <li>Review logs of any critical events on the Dashboard page.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
