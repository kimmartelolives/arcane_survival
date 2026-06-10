import React, { useState, useEffect } from 'react';
import { sbGet, sbPost, supabase, SUPABASE_URL, SUPABASE_ANON } from '../services/supabase';

export default function AdminPortal() {
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [adminTab, setAdminTab] = useState('editor');
  const [newsList, setNewsList] = useState([]);
  const [editId, setEditId] = useState(null); 

  const [admType, setAdmType] = useState('decree');
  const [admTitle, setAdmTitle] = useState('');
  const [admDesc, setAdmDesc] = useState('');
  const [admStatus, setAdmStatus] = useState('');

  const fetchNews = async () => {
    const data = await sbGet('/rest/v1/council_news?select=*&order=created_at.desc');
    if (data) setNewsList(data);
  };

  useEffect(() => {
    if (isAdminAuthenticated) {
      fetchNews();
    }
  }, [isAdminAuthenticated]);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    
    try {
      const accounts = await sbGet(
        `/rest/v1/admin_accounts?username=eq.${encodeURIComponent(adminUsername.trim())}&password=eq.${encodeURIComponent(adminPassword)}`
      );

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
    if (!admTitle.trim() || !admDesc.trim()) return alert('Your spellbook contains missing runes. Fill every enchanted field to continue');
    setAdmStatus('Scribing scroll casting...');
    
    if (editId) {
      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/council_news?id=eq.${editId}`, {
          method: 'PATCH',
          headers: { 
            'apikey': SUPABASE_ANON, 
            'Authorization': `Bearer ${SUPABASE_ANON}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            type: admType,
            title: admTitle.trim(),
            description: admDesc.trim()
          })
        });

        if (response.ok) {
          setAdmStatus('✨ Scroll updated successfully!');
          resetEditor();
          fetchNews();
        } else {
          // Capture the exact matrix rejection reason
          const errData = await response.json();
          console.error('Update Error:', errData);
          setAdmStatus('❌ Failed to update the scroll.');
        }
      } catch (err) {
        console.error('Network Error:', err);
        setAdmStatus('❌ Connection to the matrix failed.');
      }
    } 
    else {
      // Create new record
      const ok = await sbPost('/rest/v1/council_news', {
        type: admType,
        title: admTitle.trim(),
        description: admDesc.trim()
      });

      if (ok) {
        setAdmStatus('✨ Decree published to Supabase core matrix!');
        resetEditor();
        fetchNews();
      } else {
        setAdmStatus('❌ Spell incantation failed to submit.');
      }
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to burn this scroll? This cannot be undone.')) return;
    
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/council_news?id=eq.${id}`, {
        method: 'DELETE',
        headers: { 
          'apikey': SUPABASE_ANON, 
          'Authorization': `Bearer ${SUPABASE_ANON}`
        }
      });
      
      if (response.ok) {
        fetchNews(); // I-refresh ang listahan
      } else {
        alert('Failed to delete the scroll.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditClick = (item) => {
    setEditId(item.id);
    setAdmType(item.type);
    setAdmTitle(item.title);
    setAdmDesc(item.description);
    setAdmStatus('Editing ancient record...');
    setAdminTab('editor'); // Ibalik sa editor tab
  };

  const resetEditor = () => {
    setEditId(null);
    setAdmTitle('');
    setAdmDesc('');
    setAdmType('decree');
  };

  return (
    <div className="admin-bg">
      <style>{`
        .admin-bg { 
          position: fixed; inset: 0; background-color: #030108; 
          background-image: radial-gradient(circle at 50% 50%, #0e0624 0%, #030107 100%);
          display: flex; align-items: center; justify-content: center; 
          font-family: 'Georgia', serif; color: white; padding: 20px;
          z-index: 999999; overflow-y: auto; box-sizing: border-box;
        }
        .admin-panel { 
          background: rgba(11, 4, 26, 0.95); border: 1px solid rgba(147, 51, 234, 0.25); 
          border-radius: 14px; width: 100%; max-width: 400px; padding: 45px 35px; 
          box-shadow: 0 0 40px rgba(147, 51, 234, 0.12), inset 0 0 25px rgba(0, 0, 0, 0.6); 
          display: flex; flex-direction: column; box-sizing: border-box; backdrop-filter: blur(10px);
        }
        .admin-panel.wide { max-width: 650px; min-height: 600px; }
        .admin-title { 
          color: #fbbf24; font-size: 1.25rem; font-weight: 700; text-transform: uppercase; 
          letter-spacing: 0.12em; margin-bottom: 12px; text-shadow: 0 0 10px rgba(251, 191, 36, 0.25); 
          display: flex; align-items: center; justify-content: center; gap: 12px; 
        }
        .admin-subtitle { 
          color: #94a3b8; font-size: 0.72rem; text-align: center; margin-bottom: 20px; 
          font-family: monospace; letter-spacing: 0.05em; line-height: 1.6; opacity: 0.8;
        }
        .input-group { margin-bottom: 20px; display: flex; flex-direction: column; }
        .input-label { 
          color: #c084fc; font-size: 0.62rem; text-transform: uppercase; 
          letter-spacing: 0.15em; margin-bottom: 8px; font-family: monospace; font-weight: bold;
        }
        .admin-input, .admin-select, .admin-textarea { 
          width: 100%; background: #05020c; border: 1px solid rgba(147, 51, 234, 0.3); 
          border-radius: 6px; color: #f1f5f9; padding: 14px; font-family: monospace; 
          font-size: 0.78rem; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); box-sizing: border-box; 
        }
        .admin-textarea { resize: vertical; min-height: 120px; line-height: 1.5; }
        .admin-input:focus, .admin-select:focus, .admin-textarea:focus { 
          outline: none; border-color: #a855f7; box-shadow: 0 0 15px rgba(168, 85, 247, 0.25); background: #080314;
        }
        .admin-input::placeholder, .admin-textarea::placeholder { color: #3b2b54; text-transform: uppercase; }
        .admin-btn { 
          width: 100%; padding: 14px; border-radius: 6px; font-family: 'Georgia', serif; 
          font-weight: bold; text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.82rem; 
          cursor: pointer; transition: all 0.2s ease-in-out; display: flex; justify-content: center; 
          align-items: center; gap: 10px; box-sizing: border-box; margin-bottom: 12px; 
        }
        .btn-gold { background: linear-gradient(180deg, #271708 0%, #170d03 100%); border: 1px solid #b45309; color: #fef08a; box-shadow: 0 4px 10px rgba(0,0,0,0.5); }
        .btn-gold:hover { background: linear-gradient(180deg, #3d2208 0%, #221203 100%); border-color: #fbbf24; box-shadow: 0 0 20px rgba(251, 191, 36, 0.25); transform: translateY(-1px); }
        .btn-danger { background: linear-gradient(180deg, #1c060d 0%, #0f0206 100%); border: 1px solid #500f22; color: #fca5a5; }
        .btn-danger:hover { background: linear-gradient(180deg, #2d0a15 0%, #17030a 100%); border-color: #ef4444; box-shadow: 0 0 15px rgba(239, 68, 68, 0.2); }
        .btn-purple { background: linear-gradient(180deg, #1e0b43 0%, #0f0424 100%); border: 1px solid #6d28d9; color: #e9d5ff; }
        .btn-purple:hover { background: linear-gradient(180deg, #2b0e63 0%, #170638 100%); border-color: #a855f7; box-shadow: 0 0 20px rgba(168, 85, 247, 0.35); transform: translateY(-1px); }
        .status-msg { text-align: center; font-family: monospace; font-size: 0.72rem; min-height: 1.5rem; margin-top: 8px; }

        /* TAB STYLES */
        .admin-tabs { display: flex; gap: 10px; margin-bottom: 25px; border-bottom: 1px solid rgba(147, 51, 234, 0.3); padding-bottom: 15px; }
        .tab-btn { flex: 1; background: transparent; border: 1px solid rgba(147, 51, 234, 0.3); color: #94a3b8; padding: 10px; border-radius: 6px; cursor: pointer; font-family: monospace; font-weight: bold; transition: 0.2s; }
        .tab-btn.active { background: rgba(147, 51, 234, 0.2); color: #f1f5f9; border-color: #a855f7; box-shadow: inset 0 0 10px rgba(168, 85, 247, 0.2); }
        .tab-btn:hover:not(.active) { background: rgba(255,255,255,0.05); color: #fff; }

        /* LIST ARCHIVES STYLES */
        .archive-list { display: flex; flex-direction: column; gap: 12px; overflow-y: auto; max-height: 400px; padding-right: 5px; }
        .archive-card { background: rgba(5, 2, 12, 0.8); border: 1px solid rgba(147, 51, 234, 0.2); padding: 16px; border-radius: 8px; display: flex; justify-content: space-between; align-items: flex-start; gap: 15px; }
        .ac-content { flex: 1; }
        .ac-header { font-size: 0.65rem; color: #fbbf24; font-family: monospace; letter-spacing: 1px; margin-bottom: 6px; }
        .ac-title { font-size: 1rem; color: #f1f5f9; font-weight: bold; margin-bottom: 6px; text-transform: uppercase; }
        .ac-desc { font-size: 0.75rem; color: #94a3b8; font-family: monospace; line-height: 1.4; white-space: pre-line; }
        .ac-actions { display: flex; flex-direction: column; gap: 8px; }
        .btn-small { padding: 6px 12px; font-size: 0.7rem; letter-spacing: 0; margin: 0; }
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
              className="admin-input" type="text" placeholder="ENTER ADMIN USERNAME..." 
              value={adminUsername} onChange={e => setAdminUsername(e.target.value)} required 
            />
          </div>

          <div className="input-group">
            <label className="input-label">Secret Cipher Key</label>
            <input 
              className="admin-input" type="password" placeholder="••••••••••••" 
              value={adminPassword} onChange={e => setAdminPassword(e.target.value)} required 
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
          <div className="admin-subtitle">
            Welcome, Archmage. You are safely linked into the active Supabase core archives.
          </div>

          {/* TABS CONTROLS */}
          <div className="admin-tabs">
            <button 
              className={`tab-btn ${adminTab === 'editor' ? 'active' : ''}`}
              onClick={() => setAdminTab('editor')}
            >
              {editId ? '✍️ Editing Scroll' : '✍️ Write New Scroll'}
            </button>
            <button 
              className={`tab-btn ${adminTab === 'list' ? 'active' : ''}`}
              onClick={() => { setAdminTab('list'); resetEditor(); }}
            >
              📜 View Archives ({newsList.length})
            </button>
          </div>

          {/* EDITOR VIEW */}
          {adminTab === 'editor' && (
            <>
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
                  className="admin-input" type="text" placeholder="E.G. ARCANE COOLDOWN REBALANCED" 
                  value={admTitle} onChange={e => setAdmTitle(e.target.value)} 
                />
              </div>

              <div className="input-group">
                <label className="input-label">Scroll Content Description</label>
                <textarea 
                  className="admin-textarea" placeholder="WRITE DOWN SPELL CHANGES OR ANNOUNCEMENT DETAILS HERE..." 
                  value={admDesc} onChange={e => setAdmDesc(e.target.value)} 
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={handlePublishNews} className="admin-btn btn-purple" style={{ marginTop: '10px', flex: 1 }}>
                  {editId ? '✨ Update Seal' : '🔮 Cast and Publish'}
                </button>
                
                {editId && (
                  <button onClick={resetEditor} className="admin-btn btn-danger" style={{ marginTop: '10px', flex: 0.3 }}>
                    Cancel
                  </button>
                )}
              </div>
            </>
          )}

          {/* ARCHIVES LIST VIEW */}
          {adminTab === 'list' && (
            <div className="archive-list">
              {newsList.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', padding: '20px' }}>
                  No scrolls found in the archives.
                </div>
              ) : (
                newsList.map((item) => (
                  <div key={item.id} className="archive-card">
                    <div className="ac-content">
                      <div className="ac-header">
                        {item.type === 'decree' ? '📣 DECREE' : '📜 GRIMOIRE'} • {new Date(item.created_at).toLocaleDateString()}
                      </div>
                      <div className="ac-title">{item.title}</div>
                      <div className="ac-desc">{item.description}</div>
                    </div>
                    <div className="ac-actions">
                      <button className="admin-btn btn-gold btn-small" onClick={() => handleEditClick(item)}>
                        ✍️ Edit
                      </button>
                      <button className="admin-btn btn-danger btn-small" onClick={() => handleDelete(item.id)}>
                        🗑️ Burn
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          <div className="status-msg" style={{ color: admStatus.includes('❌') ? '#f87171' : '#4ade80' }}>
            {admStatus}
          </div>

          <button type="button" className="admin-btn btn-danger" style={{ opacity: 0.6, marginTop: 'auto' }} onClick={() => setIsAdminAuthenticated(false)}>
            🔒 Lock Vault
          </button>

        </div>
      )}
    </div>
  );
}