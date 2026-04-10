import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import { Power, VideoOff, Volume2, VolumeX, AlertTriangle, ShieldAlert, CheckCircle, Activity } from 'lucide-react';

export default function Home() {
  const webcamRef = useRef(null);
  const wsRef = useRef(null);
  const audioCtxRef = useRef(null);

  const [isMonitoring, setIsMonitoring] = useState(false);
  const [metrics, setMetrics] = useState({ ear: 0, mar: 0, status: 'Normal' });
  const [wsConnected, setWsConnected] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [alarmActive, setAlarmActive] = useState(false);
  const [relativePhone, setRelativePhone] = useState('9342263135');
  const [smsStatus, setSmsStatus] = useState(null);

  // Cooldown ref for database logging to prevent spam
  const lastLogTimeRef = useRef(0);

  // Refs for 1.5-second delay logic and continuous alarm
  const criticalStartTimeRef = useRef(null);
  const alarmActiveRef = useRef(false);
  const incidentCountRef = useRef(0);
  const persistentAlertActiveRef = useRef(false);
  const selectedVoiceRef = useRef(null);

  // Initialize Audio Context for the alarm
  useEffect(() => {
    try {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.error("Audio Context not supported");
    }

    // Pre-load and cache the male voice
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        const maleVoice = voices.find(voice =>
          voice.name.toLowerCase().includes('male') ||
          voice.name.toLowerCase().includes('daniel') ||
          voice.name.toLowerCase().includes('james') ||
          voice.name.toLowerCase().includes('john') ||
          voice.name.toLowerCase().includes('richard')
        );
        selectedVoiceRef.current = maleVoice || voices[0] || null;
      };

      // Voices may load asynchronously
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const playAlarm = useCallback(() => {
    if (!soundEnabled || !alarmActiveRef.current) {
      return;
    }

    // Don't start another one if already speaking
    if (window.speechSynthesis.speaking) {
      return;
    }

    console.log('Playing alarm!');

    // Use Web Speech API for voice alert
    if ('speechSynthesis' in window) {
      let text = "Wake up driver, you are in drowsiness";
      if (incidentCountRef.current >= 3) {
        text = "Driver you are in very dangerous situation please stop the vehicle and take rest";
      }
      
      const utterance = new SpeechSynthesisUtterance(text);

      // Try to find a male voice
      const voices = window.speechSynthesis.getVoices();
      const maleVoice = voices.find(voice =>
        voice.name.toLowerCase().includes('male') ||
        voice.name.toLowerCase().includes('daniel') ||
        voice.name.toLowerCase().includes('james') ||
        voice.name.toLowerCase().includes('john') ||
        voice.name.toLowerCase().includes('richard')
      );

      // Use cached voice for consistent voice every time
      const voiceToUse = selectedVoiceRef.current || maleVoice || voices[0];

      if (voiceToUse) {
        utterance.voice = voiceToUse;
      }

      utterance.rate = 1.0; // Normal speed for urgency
      utterance.pitch = 0.8; // Lower pitch for stronger male voice
      utterance.volume = 1.0;

      utterance.onend = () => {
        // If driver still has eyes closed OR if this is a persistent alert, repeat
        if (alarmActiveRef.current || persistentAlertActiveRef.current) {
          playAlarm();
        }
      };

      window.speechSynthesis.speak(utterance);
    }
  }, [soundEnabled]);

  // Log incident to database
  const logIncident = useCallback(async (status, ear, mar) => {
    const now = Date.now();
    // Only log if 5 seconds have passed since the last log
    if (now - lastLogTimeRef.current < 5000) return;

    lastLogTimeRef.current = now;
    try {
      await axios.post('/api/logs', null, {
        params: { status, ear, mar }
      });
    } catch (err) {
      console.error("Error logging incident:", err);
    }
  }, []);

  // Send SMS Alert
  const sendSmsAlert = useCallback(async () => {
    try {
      const response = await axios.post('/api/alerts/sms', null, {
        params: {
          phone_number: relativePhone,
          message: "EMERGENCY: The DriveSafe AI system has detected critical drowsiness. The driver (Relative) needs immediate attention!"
        }
      });
      console.log("SMS result:", response.data);
      setSmsStatus('Sent');
      setTimeout(() => setSmsStatus(null), 5000);
    } catch (err) {
      console.error("Failed to send SMS:", err);
      setSmsStatus('Error');
    }
  }, [relativePhone]);

  // Set up WebSocket connection
  useEffect(() => {
    if (isMonitoring) {
      const ws = new WebSocket('ws://localhost:8000/ws/video');

      ws.onopen = () => {
        console.log('WebSocket Connected');
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.error) {
          console.error(data.error);
          return;
        }

        setMetrics(data);

        // Handle Alarms and Logging with 1.5-second delay
        if (data.status === 'Critical') {
          // Start timer if not already started
          if (!criticalStartTimeRef.current) {
            criticalStartTimeRef.current = Date.now();
          }

          // Check if 1.5 seconds have passed (between 1-2 seconds) and play alarm continuously
          const elapsedTime = Date.now() - criticalStartTimeRef.current;
          if (elapsedTime >= 2000) {
            // Play alarm immediately and start repetition loop
            if (!alarmActiveRef.current) {
              incidentCountRef.current += 1;
              
              // If this is the 3rd incident, set it to persistent and send SMS
              if (incidentCountRef.current === 3) {
                persistentAlertActiveRef.current = true;
                sendSmsAlert();
              } else if (incidentCountRef.current > 3) {
                persistentAlertActiveRef.current = true;
              }
              
              alarmActiveRef.current = true;
              setAlarmActive(true);
              playAlarm();
            }
            logIncident(data.status, data.ear, data.mar);
          }
        } else {
          // Reset timer and stop continuous alarm when status is not Critical
          criticalStartTimeRef.current = null;
          // Only stop if NOT in persistent mode
          if (alarmActiveRef.current && !persistentAlertActiveRef.current) {
            alarmActiveRef.current = false;
            setAlarmActive(false);
            window.speechSynthesis.cancel();
          }

          // Handle Warning status (no delay needed)
          if (data.status === 'Warning') {
            logIncident(data.status, data.ear, data.mar);
          }
        }
      };

      ws.onclose = () => {
        console.log('WebSocket Disconnected');
        setWsConnected(false);
      };

      wsRef.current = ws;

      // Frame sending loop
      const interval = setInterval(() => {
        if (webcamRef.current && ws.readyState === WebSocket.OPEN) {
          const imageSrc = webcamRef.current.getScreenshot();
          if (imageSrc) {
            ws.send(imageSrc);
          }
        }
      }, 200); // 5 FPS is enough for real-time analysis

      return () => {
        clearInterval(interval);
        ws.close();
      };
    } else {
      setWsConnected(false);
      if (wsRef.current) wsRef.current.close();
    }
  }, [isMonitoring, playAlarm, logIncident]);

  const toggleMonitoring = async () => {
    if (!isMonitoring) {
      // Resume audio context before starting
      if (audioCtxRef.current?.state === 'suspended') {
        await audioCtxRef.current.resume();
      }
    } else {
      setWsConnected(false);
      if (wsRef.current) wsRef.current.close();
      
      // STOP EVERYTHING when monitoring is toggled off
      incidentCountRef.current = 0;
      persistentAlertActiveRef.current = false;
      alarmActiveRef.current = false;
      setAlarmActive(false);
      window.speechSynthesis.cancel();
    }
    setIsMonitoring(!isMonitoring);
  };

  const getStatusColor = () => {
    if (metrics.status === 'Critical') return 'var(--status-critical)';
    if (metrics.status === 'Warning') return 'var(--status-warning)';
    return 'var(--status-normal)';
  };

  return (
    <div className="animate-slide-up">
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="text-gradient">Live Monitoring</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Continuous facial landmark analysis</p>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            className="btn btn-outline"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? "Mute Alarms" : "Enable Alarms"}
          >
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>

          <button
            className={`btn ${isMonitoring ? 'btn-outline' : 'btn-primary'}`}
            style={isMonitoring ? { borderColor: 'var(--status-critical)', color: 'var(--status-critical)' } : {}}
            onClick={toggleMonitoring}
          >
            <Power size={20} />
            {isMonitoring ? "Stop Monitoring" : "Start Monitoring"}
          </button>
        </div>
      </div>

      {smsStatus && (
        <div className="glass-card animate-slide-up" style={{ 
          position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 1000,
          background: smsStatus === 'Sent' ? 'var(--status-normal)' : 'var(--status-critical)',
          padding: '1rem 2rem', border: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem'
        }}>
          <CheckCircle size={20} />
          <span>{smsStatus === 'Sent' ? "Emergency SMS Sent Successfully" : "Error Sending SMS"}</span>
        </div>
      )}

      <div className="dashboard-grid">
        <div className="glass-card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={20} color="var(--accent-primary)" />
              Camera Feed
            </h3>

            {isMonitoring && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  backgroundColor: wsConnected ? 'var(--status-normal)' : 'var(--status-warning)',
                  boxShadow: `0 0 8px ${wsConnected ? 'var(--status-normal)' : 'var(--status-warning)'}`
                }} />
                <span style={{ color: 'var(--text-secondary)' }}>
                  {wsConnected ? 'Backend Connected' : 'Connecting to Server...'}
                </span>
              </div>
            )}
          </div>

          <div className="video-container" style={{ borderRadius: 0, border: 'none' }}>
            {isMonitoring ? (
              <>
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  screenshotQuality={0.8}
                  videoConstraints={{ facingMode: "user", width: 640, height: 480 }}
                />

                {wsConnected && (
                  <div className={`video-overlay status-${metrics.status.toLowerCase()}`}>
                    <div className="status-indicator"></div>
                    <span style={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {metrics.status}
                    </span>
                  </div>
                )}

                {metrics.status === 'Critical' && (
                  <div style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none',
                    border: '4px solid var(--status-critical)',
                    boxShadow: 'inset 0 0 50px rgba(239, 68, 68, 0.5)',
                    animation: 'pulse 1s infinite',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10
                  }}>
                    {alarmActive && (
                      <div style={{
                        color: 'white',
                        fontSize: incidentCountRef.current >= 3 ? '2rem' : '3rem',
                        fontWeight: '900',
                        textAlign: 'center',
                        textShadow: '0 0 20px rgba(0,0,0,0.5)',
                        backgroundColor: 'rgba(239, 68, 68, 0.8)',
                        padding: '1.5rem 2rem',
                        borderRadius: '12px',
                        animation: 'bounce 0.5s infinite alternate',
                        maxWidth: '80%'
                      }}>
                        {incidentCountRef.current >= 3 ? 
                          "DANGEROUS SITUATION: STOP THE VEHICLE!" : 
                          "WAKE UP!"}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--text-secondary)' }}>
                <VideoOff size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <p>Camera is currently offline</p>
                <p style={{ fontSize: '0.875rem', opacity: 0.7, marginTop: '0.5rem' }}>Click "Start Monitoring" to begin</p>
              </div>
            )}
          </div>
        </div>

        <div className="metrics-panel">
          <div className="glass-card" style={{
            borderColor: metrics.status === 'Normal' || !isMonitoring ? 'var(--border-light)' : getStatusColor(),
            transition: 'border-color 0.3s'
          }}>
            <h3 style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {metrics.status === 'Critical' ? <ShieldAlert color="var(--status-critical)" /> :
                metrics.status === 'Warning' ? <AlertTriangle color="var(--status-warning)" /> :
                  <CheckCircle color="var(--status-normal)" />}
              Current State
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Status Overview</span>
                  <span style={{ color: getStatusColor(), fontWeight: 'bold' }}>
                    {isMonitoring ? metrics.status : 'Idle'}
                  </span>
                </div>
                <div style={{ height: '4px', background: 'var(--bg-tertiary)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: '100%',
                    background: getStatusColor(),
                    opacity: isMonitoring ? 1 : 0.2,
                    transition: 'all 0.3s ease'
                  }}></div>
                </div>
              </div>

              <div className="metric-box">
                <div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Eye Aspect Ratio (EAR)</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', opacity: 0.7 }}>Threshold: {'<'} 0.25</div>
                </div>
                <span className="metric-value">{metrics.ear.toFixed(2)}</span>
              </div>

              <div className="metric-box">
                <div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Mouth Aspect Ratio (MAR)</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', opacity: 0.7 }}>Threshold: {'>'} 0.50</div>
                </div>
                <span className="metric-value">{metrics.mar.toFixed(2)}</span>
              </div>

              <div className="metric-box" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Relative's Emergency Contact</div>
                <input 
                  type="text" 
                  value={relativePhone}
                  onChange={(e) => setRelativePhone(e.target.value)}
                  style={{ 
                    width: '100%', padding: '0.75rem', borderRadius: '8px', 
                    background: 'var(--bg-primary)', border: '1px solid var(--border-light)',
                    color: 'white', outline: 'none'
                  }}
                  placeholder="Enter phone number"
                />
              </div>

              <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '8px', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                <strong>Tip:</strong> Ensure your face is well-lit and clearly visible in the camera frame for accurate readings.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
