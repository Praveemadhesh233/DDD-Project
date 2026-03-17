import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldAlert, CheckCircle, AlertTriangle } from 'lucide-react';

export default function Dashboard() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const response = await axios.get('/api/logs');
      setLogs(response.data);
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const criticalCount = logs.filter(log => log.status === 'Critical').length;
  const warningCount = logs.filter(log => log.status === 'Warning').length;

  return (
    <div className="animate-slide-up">
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="text-gradient">Incident Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Review historical drowsiness records</p>
        </div>
        <button className="btn btn-outline" onClick={fetchLogs}>
          Refresh Logs
        </button>
      </div>

      <div className="dashboard-grid">
        <div className="glass-card">
          <h2 style={{ marginBottom: '1.5rem' }}>Recent Events</h2>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              Loading logs...
            </div>
          ) : logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              <CheckCircle size={48} style={{ color: 'var(--status-normal)', marginBottom: '1rem', opacity: 0.5 }} />
              <p>No incidents recorded yet. Good job!</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Status</th>
                    <th>EAR (Eyes)</th>
                    <th>MAR (Mouth)</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td>{new Date(log.timestamp).toLocaleString()}</td>
                      <td>
                        <span style={{
                          color: log.status === 'Critical' ? 'var(--status-critical)' :
                            log.status === 'Warning' ? 'var(--status-warning)' : 'var(--status-normal)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontWeight: 500
                        }}>
                          {log.status === 'Critical' && <ShieldAlert size={16} />}
                          {log.status === 'Warning' && <AlertTriangle size={16} />}
                          {log.status === 'Normal' && <CheckCircle size={16} />}
                          {log.status}
                        </span>
                      </td>
                      <td>{log.ear_value.toFixed(3)}</td>
                      <td>{log.mar_value.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="metrics-panel">
          <div className="glass-card">
            <h3>Summary</h3>
            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="metric-box">
                <span style={{ color: 'var(--text-secondary)' }}>Total Recorded</span>
                <span className="metric-value">{logs.length}</span>
              </div>
              <div className="metric-box" style={{ borderLeft: '4px solid var(--status-critical)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Critical Alerts</span>
                <span className="metric-value" style={{ color: 'var(--status-critical)' }}>{criticalCount}</span>
              </div>
              <div className="metric-box" style={{ borderLeft: '4px solid var(--status-warning)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Warning Alerts</span>
                <span className="metric-value" style={{ color: 'var(--status-warning)' }}>{warningCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
