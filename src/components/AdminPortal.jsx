import React, { useState } from 'react';
import { sbGet, sbPost } from '../services/supabase';

export default function AdminPortal() {
  // Ibinalik natin sa Username para tugma sa ginawa mong custom SQL table column
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [admType, setAdmType] = useState('decree');
  const [admTitle, setAdmTitle] = useState('');
  const [admDesc, setAdmDesc] = useState('');
  const [admStatus, setAdmStatus] = useState('');

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    
    try {
      // Hahanapin natin sa iyong 'admin_accounts' table kung may tumutugmang username at password
      const accounts = await sbGet(
        `/rest/v1/admin_accounts?username=eq.${encodeURIComponent(adminUsername.trim())}&password=eq.${encodeURIComponent(adminPassword)}`
      );

      // Kung may nagbalik na record sa array, ibig sabihin ay valid ang credentials!
      if (accounts && accounts.length > 0) {
        setIsAdminAuthenticated(true);
      } else {
        setLoginError('⚠️ Invalid incantation or secret key signature.');
      }
    } catch (err) {
      setLoginError('⚠️ Connection to the matrix failed.');
    }
  };

  const handlePublishNews = async () => {
    if (!admTitle.trim() || !admDesc.trim()) return alert('Mangyaring punan ang lahat ng field.');
    setAdmStatus('Scribing scroll casting...');
    
    const ok = await sbPost('/rest/v1/council_news', {
      type: admType,
      title: admTitle.trim(),
      description: admDesc.trim()
    });

    if (ok) {
      setAdmStatus('✨ Decree published to Supabase core matrix!');
      setAdmTitle('');
      setAdmDesc('');
    } else {
      setAdmStatus('❌ Spell incantation failed to submit.');
    }
  };

  return (
    <div className="admin-bg">
      <style>{`
        .admin-bg { 
          position: fixed;
          inset: 0;
          background-color: #030108; 
          background-image: radial-gradient(circle at 50% 50%, #0e0624 0%, #030107 100%);
          display: flex; 
          align-items: center; 
          justify-content: center; 
          font-family: 'Georgia', serif; 
          color: white;
          padding: 20px;
          z-index: 999999;
          overflow-y: auto;
          box-sizing: border-box;
        }
        .admin-panel { 
          background: rgba(11, 4, 26, 0.95); 
          border: 1px solid rgba(147, 51, 234, 0.25); 
          border-radius: 14px; 
          width: 100%;
          max-width: 400px; 
          padding: 45px 35px; 
          box-shadow: 0 0 40px rgba(147, 51, 234, 0.12), inset 0 0 25px rgba(0, 0, 0, 0.6); 
          display: flex; 
          flex-direction: column; 
          box-sizing: border-box;
          backdrop-filter: blur(10px);
        }
        .admin-panel.wide { max-width: 560px; }
        .admin-title { 
          color: #fbbf24; 
          font-size: 1.25rem; 
          font-weight: 700; 
          text-transform: uppercase; 
          letter-spacing: 0.12em; 
          margin-bottom: 12px; 
          text-shadow: 0 0 10px rgba(251, 191, 36, 0.25); 
          display: flex; 
          align-items: center; 
          justify-content: center;
          gap: 12px; 
        }
        .admin-subtitle { 
          color: #94a3b8; 
          font-size: 0.72rem; 
          text-align: center; 
          margin-bottom: 30px; 
          font-family: monospace; 
          letter-spacing: 0.05em; 
          line-height: 1.6; 
          opacity: 0.8;
        }
        .input-group { margin-bottom: 20px; display: flex; flex-direction: column; }
        .input-label { 
          color: #c084fc; 
          font-size: 0.62rem; 
          text-transform: uppercase; 
          letter-spacing: 0.15em; 
          margin-bottom: 8px; 
          font-family: monospace;
          font-weight: bold;
        }
        .admin-input, .admin-select, .admin-textarea { 
          width: 100%; 
          background: #05020c; 
          border: 1px solid rgba(147, 51, 234, 0.3); 
          border-radius: 6px; 
          color: #f1f5f9; 
          padding: 14px; 
          font-family: monospace; 
          font-size: 0.78rem; 
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); 
          box-sizing: border-box; 
        }
        .admin-textarea { resize: vertical; min-height: 120px; line-height: 1.5; }
        .admin-input:focus, .admin-select:focus, .admin-textarea:focus { 
          outline: none; 
          border-color: #a855f7; 
          box-shadow: 0 0 15px rgba(168, 85, 247, 0.25); 
          background: #080314;
        }
        .admin-input::placeholder, .admin-textarea::placeholder { color: #3b2b54; text-transform: uppercase; }
        .admin-btn { 
          width: 100%; 
          padding: 14px; 
          border-radius: 6px; 
          font-family: 'Georgia', serif; 
          font-weight: bold; 
          text-transform: uppercase; 
          letter-spacing: 0.08em; 
          font-size: 0.82rem; 
          cursor: pointer; 
          transition: all 0.2s ease-in-out; 
          display: flex; 
          justify-content: center; 
          align-items: center; 
          gap: 10px; 
          box-sizing: border-box; 
          margin-bottom: 12px; 
        }
        .btn-gold { 
          background: linear-gradient(180deg, #271708 0%, #170d03 100%); 
          border: 1px solid #b45309; 
          color: #fef08a; 
          box-shadow: 0 4px 10px rgba(0,0,0,0.5);
        }
        .btn-gold:hover { 
          background: linear-gradient(180deg, #3d2208 0%, #221203 100%); 
          border-color: #fbbf24; 
          box-shadow: 0 0 20px rgba(251, 191, 36, 0.25);
          transform: translateY(-1px);
        }
        .btn-danger { 
          background: linear-gradient(180deg, #1c060d 0%, #0f0206 100%); 
          border: 1px solid #500f22; 
          color: #fca5a5; 
        }
        .btn-danger:hover { 
          background: linear-gradient(180deg, #2d0a15 0%, #17030a 100%); 
          border-color: #ef4444; 
          box-shadow: 0 0 15px rgba(239, 68, 68, 0.2);
        }
        .btn-purple { 
          background: linear-gradient(180deg, #1e0b43 0%, #0f0424 100%); 
          border: 1px solid #6d28d9; 
          color: #e9d5ff; 
        }
        .btn-purple:hover { 
          background: linear-gradient(180deg, #2b0e63 0%, #170638 100%); 
          border-color: #a855f7; 
          box-shadow: 0 0 20px rgba(168, 85, 247, 0.35);
          transform: translateY(-1px);
        }
        .status-msg { text-align: center; font-family: monospace; font-size: 0.72rem; min-height: 1.5rem; margin-top: 8px; }
      `}</style>

      {/* --- LOGIN VAULT GATES --- */}
      {!isAdminAuthenticated ? (
        <form className="admin-panel" onSubmit={handleAdminLogin}>
          <div className="admin-title">
            <span style={{ color: '#60a5fa' }}>🛡️</span> ARCHMAGE PORTAL
          </div>
          <div className="admin-subtitle">
            Authentication required to reshape core<br />database blocks.
          </div>

          <div className="input-group">
            <label className="input-label">Scribe Username</label>
            <input 
              className="admin-input"
              type="text" 
              placeholder="ENTER ADMIN USERNAME..." 
              value={adminUsername} 
              onChange={e => setAdminUsername(e.target.value)} 
              required 
            />
          </div>

          <div className="input-group">
            <label className="input-label">Secret Cipher Key</label>
            <input 
              className="admin-input"
              type="password" 
              placeholder="••••••••••••" 
              value={adminPassword} 
              onChange={e => setAdminPassword(e.target.value)} 
              required 
            />
          </div>

          <button type="submit" className="admin-btn btn-gold" style={{ marginTop: '12px' }}>
            🔓 Break Seal & Enter
          </button>
          
          <button type="button" className="admin-btn btn-danger" onClick={() => window.history.back()}>
            ✕ Cancel
          </button>

          <div className="status-msg" style={{ color: '#f87171' }}>
            {loginError}
          </div>
        </form>
      ) : (

        /* --- MATRIX SCROLL CASTING DASHBOARD --- */
        <div className="admin-panel wide">
          <div className="admin-title" style={{ color: '#c084fc', textShadow: '0 0 15px rgba(192, 132, 252, 0.3)' }}>
            🛠️ SCRIBE MATRIX DASHBOARD
          </div>
          <div className="admin-subtitle" style={{ marginBottom: '25px' }}>
            Welcome, Archmage. You are safely linked into the active Supabase core archives.
          </div>

          <div className="input-group">
            <label className="input-label">Scroll Parchment Category</label>
            <select className="admin-select" value={admType} onChange={e => setAdmType(e.target.value)}>
              <option value="decree">📣 Council Decree (Global Announcement)</option>
              <option value="grimoire">📜 Grimoire Log (Spell Adjustments / Patch)</option>
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">Incantation Header Title</label>
            <input 
              className="admin-input"
              type="text" 
              placeholder="E.G. ARCANE COOLDOWN REBALANCED" 
              value={admTitle} 
              onChange={e => setAdmTitle(e.target.value)} 
            />
          </div>

          <div className="input-group">
            <label className="input-label">Scroll Content Description</label>
            <textarea 
              className="admin-textarea"
              placeholder="WRITE DOWN SPELL CHANGES OR ANNOUNCEMENT DETAILS HERE..." 
              value={admDesc} 
              onChange={e => setAdmDesc(e.target.value)} 
            />
          </div>

          <button onClick={handlePublishNews} className="admin-btn btn-purple" style={{ marginTop: '10px' }}>
            🔮 Cast and Publish
          </button>

          <button type="button" className="admin-btn btn-danger" style={{ opacity: 0.6 }} onClick={() => setIsAdminAuthenticated(false)}>
            🔒 Lock Vault
          </button>

          <div className="status-msg" style={{ color: admStatus.includes('❌') ? '#f87171' : '#4ade80' }}>
            {admStatus}
          </div>
        </div>
      )}
    </div>
  );
}