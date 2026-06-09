import React, { useState, useEffect } from 'react';
import { sbGet, sbPost, hasSupabase } from '../services/supabase';

export default function Overlays({ 
  screen, 
  setScreen, 
  hudData, 
  roomCode, 
  p2Status, 
  isCoop, 
  initialWizardName,
  levelUpOptions, 
  onSelectUpgrade, 
  onAction 
}) {
  const [wizardName, setWizardName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingLb, setLoadingLb] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('');

  // States para sa Dynamic Supabase Council News Modal Window
  const [councilNewsOpen, setCouncilNewsOpen] = useState(false);
  const [councilTab, setCouncilTab] = useState('decrees'); // 'decrees' o 'grimoire'
  const [newsData, setNewsData] = useState([]);
  const [loadingNews, setLoadingNews] = useState(false);

  // States para sa Exclusive Login and Password Protection Security Gate
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState('');

  // States para sa Admin Dashboard Management Form
  const [admType, setAdmType] = useState('decree');
  const [admTitle, setAdmTitle] = useState('');
  const [admDesc, setAdmDesc] = useState('');
  const [admStatus, setAdmStatus] = useState('');

  // I-sync ang local field kapag may nakuhang global name prop galing sa App level
  useEffect(() => {
    if (initialWizardName) {
      setWizardName(initialWizardName);
    }
  }, [initialWizardName]);

  useEffect(() => {
    if (screen === 'leaderboard') {
      setLoadingLb(true);
      sbGet('/rest/v1/leaderboard?select=name,score,wave,level,mode&order=score.desc&limit=10')
        .then(data => { 
          setLeaderboard(data || []); 
          setLoadingLb(false); 
        })
        .catch(() => {
          setLoadingLb(false);
        });
    }
    
    if (screen !== 'gameover') {
      setSubmitStatus('');
    }
  }, [screen]);

  // Awtomatikong mag-fe-fetch sa Supabase kapag binuksan ang Council News archives or Admin Panel
  useEffect(() => {
    if (councilNewsOpen || screen === 'admin-login' || screen === 'admin-dashboard') {
      setLoadingNews(true);
      sbGet('/rest/v1/council_news?select=*&order=created_at.desc')
        .then(data => {
          setNewsData(data || []);
          setLoadingNews(false);
        })
        .catch(() => setLoadingNews(false));
    }
  }, [councilNewsOpen, screen]);

  useEffect(() => {
    if (screen !== 'levelup') return;
    
    const handleHotkey = (e) => {
      if (['1', '2', '3'].includes(e.key)) {
        const index = parseInt(e.key, 10) - 1;
        const choices = levelUpOptions || [];
        if (choices[index]) {
          onSelectUpgrade(choices[index]);
        }
      }
    };

    window.addEventListener('keydown', handleHotkey);
    return () => window.removeEventListener('keydown', handleHotkey);
  }, [screen, levelUpOptions, onSelectUpgrade]);

  const handleSubmitScore = async () => {
    if (!wizardName.trim()) return alert('Enter name first');
    setSubmitStatus('Submitting…');
    const ok = await sbPost('/rest/v1/leaderboard', {
      name: wizardName.trim(), 
      score: hudData?.score || 0, 
      wave: hudData?.wave || 1, 
      level: hudData?.p?.level || 1, 
      mode: isCoop ? 'coop' : 'solo'
    });
    setSubmitStatus(ok ? '✦ Score submitted!' : 'Failed submission.');
  };

  // Dedicated credentials check function
  const handleAdminLogin = (e) => {
    e.preventDefault();
    setLoginError('');
    
    // Eksklusibong login combination para sa iyo, Waki
    if (adminUsername === 'waki' && adminPassword === 'WakiAdmin2026!') {
      setIsAdminAuthenticated(true);
      setScreen('admin-dashboard');
      setAdminUsername('');
      setAdminPassword('');
    } else {
      setLoginError('⚠️ Invalid incantation or secret key signature.');
    }
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    setScreen('menu');
  };

  // Pag-post ng bagong balita sa Supabase
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
      sbGet('/rest/v1/council_news?select=*&order=created_at.desc').then(d => setNewsData(d || []));
    } else {
      setAdmStatus('❌ Spell incantation failed to submit.');
    }
  };

  const getUpgradeMeta = (rawString) => {
    const normalize = String(rawString || '').toLowerCase().trim();
    
    if (normalize.includes('rate') || normalize.includes('rapid') || normalize.includes('fire')) {
      return { icon: '⚡', title: 'RAPID FIRE', desc: 'ATTACK COOLDOWN RATE -0.1s' };
    }
    if (normalize.includes('damage') || normalize.includes('might') || normalize.includes('increase')) {
      return { icon: '🔮', title: 'ARCANE MIGHT', desc: 'BOLT DAMAGE +14 POINTS' };
    }
    if (normalize.includes('hp') || normalize.includes('vitality') || normalize.includes('max')) {
      return { icon: '💛', title: 'VITALITY', desc: 'MAX HP +25 & FULL HEAL' };
    }
    if (normalize.includes('multi') || normalize.includes('shot') || normalize.includes('gain') || normalize.includes('-')) {
      return { icon: '🏹', title: 'SPLIT BOLT', desc: 'FIRE AN ADDITIONAL PROJECTILE' };
    }
    return { icon: '📜', title: String(rawString).toUpperCase(), desc: 'ARCANE COVENANT BLESSING' };
  };

  if (screen === 'playing') return null;

  const medals = ['🥇', '🥈', '🥉'];
  const displayedChoices = (levelUpOptions || []).slice(0, 3);
  const restartVotes = isCoop ? [hudData?.coopVotes?.p1, hudData?.coopVotes?.p2].filter(Boolean).length : 0;

  const activeLogs = newsData.filter(item => 
    councilTab === 'decrees' ? item.type === 'decree' : item.type === 'grimoire'
  );

  return (
    <div id="overlays">
      <style>{`
        .lu-wrapper { text-align: center; max-width: 960px; width: 100%; padding: 20px; }
        .lu-title { font-size: 2.35rem; font-weight: 800; color: #fef08a; text-shadow: 0 0 20px rgba(251,240,138,0.3); margin-bottom: 8px; letter-spacing: 0.05em; font-family: Georgia, serif; text-transform: uppercase; }
        .lu-subtitle { font-size: 0.85rem; color: #cbd5e1; letter-spacing: 0.08em; margin-bottom: 4px; opacity: 0.9; text-transform: uppercase; font-family: Georgia, serif; }
        .lu-warning { font-size: 0.72rem; color: #eab308; opacity: 0.85; margin-bottom: 28px; font-family: monospace; letter-spacing: 0.05em; font-weight: bold; }
        .lu-cards-row { display: flex; justify-content: center; gap: 24px; width: 100%; flex-wrap: wrap; }
        .lu-card { background: linear-gradient(135deg, #3b117b 0%, #1e0a45 100%); border: 2px solid #7c3aed; border-radius: 16px; width: 230px; padding: 32px 16px; cursor: pointer; transition: all 0.22s ease-in-out; box-shadow: 0 0 20px rgba(124, 58, 237, 0.25); display: flex; flex-direction: column; align-items: center; position: relative; }
        .lu-card:hover { transform: translateY(-6px); border-color: #a78bfa; box-shadow: 0 0 32px rgba(167, 139, 250, 0.65); background: linear-gradient(135deg, #4c1d95 0%, #2e1065 100%); }
        .lu-icon { font-size: 2.2rem; margin-bottom: 16px; filter: drop-shadow(0 0 8px rgba(255,255,255,0.2)); }
        .lu-card-title { font-size: 1.15rem; font-weight: 700; color: #ffffff; margin-bottom: 8px; letter-spacing: 0.03em; text-transform: uppercase; font-family: Georgia, serif; }
        .lu-card-desc { font-size: 0.78rem; color: #94a3b8; font-family: monospace; margin-bottom: 24px; min-height: 2em; line-height: 1.3; }
        .lu-hotkey { font-size: 0.95rem; color: #fde047; font-weight: bold; font-family: monospace; opacity: 0.85; }

        .council-news-overlay { position: fixed; inset: 0; background: rgba(3, 1, 17, 0.85); display: flex; align-items: center; justify-content: center; z-index: 100000; backdrop-filter: blur(6px); pointer-events: auto; }
        
        /* Arcane Wizardry News System Custom Style Deck */
        .council-news-box { 
          background: linear-gradient(135deg, #12072b 0%, #06020f 100%); 
          border: 2px solid #b45309; 
          border-radius: 8px; 
          width: 580px; 
          height: 485px; 
          box-shadow: 0 0 40px rgba(196, 181, 253, 0.2), inset 0 0 20px rgba(124, 58, 237, 0.15); 
          display: flex; 
          flex-direction: column; 
          padding: 24px; 
          position: relative; 
          pointer-events: auto; 
          animation: mmoSlideUp 0.22s cubic-bezier(0.175, 0.885, 0.32, 1.1); 
        }
        @keyframes mmoSlideUp { from { transform: translateY(15px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        
        .council-tab-headers { display: flex; gap: 8px; margin-bottom: 12px; pointer-events: auto; }
        .council-tab-btn { flex: 1; background: rgba(14, 8, 38, 0.7); border: 1px solid #5b21b6; color: #c4b5fd; font-family: 'Georgia', serif; font-size: 0.78rem; padding: 10px; border-radius: 4px; cursor: pointer; font-weight: bold; text-transform: uppercase; transition: all 0.15s ease; }
        .council-tab-btn.active { background: linear-gradient(180deg, #6d28d9 0%, #4c1d95 100%); color: #fef08a; border-color: #fef08a; box-shadow: 0 0 12px rgba(124, 58, 237, 0.5); text-shadow: 0 1px 3px rgba(0,0,0,0.9); }
        .council-tab-btn:hover:not(.active) { color: #ffffff; border-color: #7c3aed; background: rgba(124, 58, 237, 0.15); }
        
        .council-scroll-logs { flex: 1; overflow-y: auto; background: #070312; border: 1px solid #431407; border-radius: 4px; padding: 18px; text-align: left; font-family: 'Georgia', serif; }
        .council-log-item { margin-bottom: 16px; padding-bottom: 14px; border-bottom: 1px solid rgba(180, 83, 9, 0.2); }
        .council-log-header { font-size: 0.65rem; color: #a78bfa; font-family: monospace; font-weight: bold; margin-bottom: 4px; letter-spacing: 1px; }
        .council-log-title { color: #fef08a; font-size: 0.9rem; font-weight: bold; margin-bottom: 6px; text-shadow: 0 0 10px rgba(254,240,138,0.2); }
        .council-log-desc { color: #e2e8f0; font-size: 0.75rem; line-height: 1.5; font-family: monospace; white-space: pre-line; }
      `}</style>

      {/* MAIN MENU SCREEN */}
      {screen === 'menu' && (
        <div className="overlay active">
          <div className="panel">
            <div className="panel-shine" />
            <div className="menu-title"><span className="arc">ARCANE</span><br/><span className="sur">SURVIVAL</span></div>
            <div className="menu-sub">A Wizard's Last Stand</div>
            <div className="divider" />
            
            <div className="field-group" style={{ width: '100%', marginBottom: '14px' }}>
              <label className="field-label">Wizard Character Name</label>
              <input 
                className="field-input"
                type="text"
                value={wizardName}
                onChange={e => setWizardName(e.target.value)}
                placeholder="Enter character name..."
                maxLength={16}
                style={{ textAlign: 'center' }}
              />
            </div>

            <button className="btn" onClick={() => onAction('start-solo', { name: wizardName })}>
              <span className="btn-icon">🧙</span><span className="btn-label">Solo Play</span>
            </button>
            <button className="btn gold" onClick={() => setScreen('coop-menu')}>
              <span className="btn-icon">⚔️</span><span className="btn-label">Co-op Play</span>
            </button>
            <button className="btn" onClick={() => setScreen('leaderboard')}>
              <span className="btn-icon">🏆</span><span className="btn-label">Leaderboard</span>
            </button>
            
            <div style={{ display: 'flex', width: '100%', gap: '10px' }}>
              <button 
                className="btn" 
                style={{ flex: 1, background: 'linear-gradient(135deg, #240d47 0%, #0f0423 100%)', borderColor: '#6d28d9', color: '#cbd5e1', margin: 0 }}
                onClick={() => { setCouncilTab('decrees'); setCouncilNewsOpen(true); }}
              >
                <span className="btn-icon">🏛️</span><span className="btn-label">Council News</span>
              </button>
              
              {/* Scribe Admin Lock Trigger Button */}
              <button 
                className="btn danger" 
                style={{ width: '54px', padding: 0, margin: 0, border: '1px solid #b45309', background: '#241403' }}
                onClick={() => setScreen('admin-login')}
                title="Open Secure Scribe Portal"
              >
                👑
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DYNAMIC ARCANE COUNCIL SCROLL OVERLAY WINDOW */}
      {councilNewsOpen && (
        <div className="council-news-overlay" onClick={() => setCouncilNewsOpen(false)}>
          <div className="council-news-box" onClick={e => e.stopPropagation()}>
            <div className="section-title" style={{ color: '#fef08a', fontSize: '1.25rem', fontFamily: 'Georgia, serif', marginBottom: '12px' }}>
              🏛️ COUNCIL SANCTUM ARCHIVES
            </div>
            
            <div className="council-tab-headers">
              <button className={`council-tab-btn ${councilTab === 'decrees' ? 'active' : ''}`} onClick={() => setCouncilTab('decrees')}>
                📣 Council Decrees
              </button>
              <button className={`council-tab-btn ${councilTab === 'grimoire' ? 'active' : ''}`} onClick={() => setCouncilTab('grimoire')}>
                📜 Grimoire Changes
              </button>
            </div>
            
            <div className="council-scroll-logs">
              {loadingNews ? (
                <div style={{ color: '#a78bfa', textAlign: 'center', marginTop: '40px', fontFamily: 'monospace' }}>Chanting divination spell to pull archives...</div>
              ) : activeLogs.length === 0 ? (
                <div style={{ color: 'rgba(167,139,250,0.5)', textAlign: 'center', marginTop: '40px', fontFamily: 'monospace' }}>No records written on the scrolls yet.</div>
              ) : (
                activeLogs.map((item) => (
                  <div className="council-log-item" key={item.id}>
                    <div className="council-log-header">
                      ✨ {item.type === 'decree' ? 'DECREE' : 'GRIMOIRE LOG'} • {new Date(item.created_at).toLocaleDateString()}
                    </div>
                    <div className="council-log-title">{item.title?.toUpperCase()}</div>
                    <div className="council-log-desc">{item.description}</div>
                  </div>
                ))
              )}
            </div>
            
            <button className="btn danger sm" style={{ marginTop: '14px', pointerEvents: 'auto', width: '100%' }} onClick={() => setCouncilNewsOpen(false)}>
              ✕ Dismiss Scroll
            </button>
          </div>
        </div>
      )}

      {/* NEW SECURE INTERFACE PAGE: ADMIN LOGIN RESTRICION SCREEN */}
      {screen === 'admin-login' && (
        <div className="overlay active">
          <form className="panel" style={{ width: '360px' }} onSubmit={handleAdminLogin}>
            <div className="section-title" style={{ color: '#fbbf24' }}>🛡️ Archmage Portal</div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: '14px', marginTop: '-8px', fontFamily: 'monospace', textAlign: 'center' }}>
              Authentication required to reshape core database blocks.
            </div>

            <div className="field-group">
              <label className="field-label">Scribe Username</label>
              <input 
                className="field-input" 
                type="text" 
                placeholder="Enter admin code name..."
                value={adminUsername}
                onChange={e => setAdminUsername(e.target.value)}
                required
              />
            </div>

            <div className="field-group" style={{ marginBottom: '16px' }}>
              <label className="field-label">Secret Cipher Key</label>
              <input 
                className="field-input" 
                type="password" 
                placeholder="••••••••••••"
                value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)}
                required
              />
            </div>

            <button className="btn gold" style={{ width: '100%', margin: 0 }} type="submit">
              🔓 Break Seal & Enter
            </button>
            
            {loginError && (
              <div style={{ fontSize: '0.7rem', color: '#ef4444', marginTop: '8px', fontFamily: 'monospace', textAlign: 'center' }}>
                {loginError}
              </div>
            )}

            <button className="btn danger sm" style={{ width: '100%', marginTop: '10px' }} type="button" onClick={() => setScreen('menu')}>
              ✕ Cancel
            </button>
          </form>
        </div>
      )}

      {/* NEW EXCLUSIVE INTERFACE PAGE: SECURED ADMIN PANEL DASHBOARD SCREEN */}
      {screen === 'admin-dashboard' && isAdminAuthenticated && (
        <div className="overlay active">
          <div className="panel" style={{ width: '520px', textAlign: 'left' }}>
            <div className="section-title" style={{ color: '#a855f7' }}>🛠️ Scribe Matrix Dashboard</div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: '14px', marginTop: '-8px', fontFamily: 'monospace' }}>
              Welcome, Architect Joaquin. You are writing dynamic scroll data directly into Supabase server clusters.
            </div>

            <div className="field-group">
              <label className="field-label">Scroll Parchment Type</label>
              <select 
                value={admType} 
                onChange={e => setAdmType(e.target.value)}
                style={{ width: '100%', background: '#0b0826', border: '1px solid #4c2d82', color: '#fff', padding: '8px', borderRadius: '4px', fontFamily: 'monospace' }}
              >
                <option value="decree">📣 Council Decree (Announcement)</option>
                <option value="grimoire">📜 Grimoire Log (Patch Notes)</option>
              </select>
            </div>

            <div className="field-group">
              <label className="field-label">Incantation Header Title</label>
              <input 
                className="field-input" 
                type="text" 
                placeholder="e.g. MULTIPLAYER MATRIX RESTORED"
                value={admTitle}
                onChange={e => setAdmTitle(e.target.value)}
                maxLength={45}
              />
            </div>

            <div className="field-group">
              <label className="field-label">Scroll Content Description</label>
              <textarea 
                placeholder="Write spell changes or rules announcement logs..."
                value={admDesc}
                onChange={e => setAdmDesc(e.target.value)}
                rows={5}
                style={{ width: '100%', background: '#0b0826', border: '1px solid #4c2d82', color: '#fff', padding: '10px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.75rem', resize: 'vertical' }}
              />
            </div>

            <button className="btn gold" style={{ width: '100%', marginTop: '6px' }} onClick={handlePublishNews}>
              🔮 Cast and Publish Scroll
            </button>
            
            <div style={{ minHeight: '1.2em', fontSize: '0.7rem', color: '#34d399', margin: '4px 0', fontFamily: 'monospace', textAlign: 'center' }}>
              {admStatus}
            </div>

            <button className="btn danger sm" style={{ width: '100%', marginTop: '4px' }} onClick={handleAdminLogout}>
              🔒 Secure Dashboard Logout
            </button>
          </div>
        </div>
      )}

      {/* CO-OP CONFIGURATION MENU */}
      {screen === 'coop-menu' && (
        <div className="overlay active">
          <div className="panel">
            <div className="section-title">⚔️ Co-op Play</div>
            <div className="field-group">
              <label className="field-label">Your Wizard Name</label>
              <input 
                className="field-input" 
                type="text" 
                value={wizardName} 
                onChange={e => setWizardName(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && onAction('host-game', { name: wizardName })}
                placeholder="e.g. Eldrin" 
                maxLength={16} 
              />
            </div>
            <button className="btn gold" onClick={() => onAction('host-game', { name: wizardName })}>Host Room</button>
            
            <div style={{ margin: '12px 0', fontSize: '.65rem', color: 'rgba(167,139,250,.4)' }}>— OR —</div>
            
            <div className="field-group">
              <label className="field-label">Room Code</label>
              <input 
                className="field-input" 
                type="text" 
                value={joinCode} 
                onChange={e => setJoinCode(e.target.value.toUpperCase())} 
                onKeyDown={e => e.key === 'Enter' && onAction('join-game', { name: wizardName, code: joinCode })}
                placeholder="6-LETTER CODE" 
                maxLength={6} 
                style={{ textAlign: 'center', letterSpacing: '.2em' }} 
              />
            </div>
            <button className="btn" onClick={() => onAction('join-game', { name: wizardName, code: joinCode })}>Join Game</button>
            <button className="btn danger sm" style={{ marginTop: '14px' }} onClick={() => setScreen('menu')}>← Back</button>
          </div>
        </div>
      )}

      {/* MULTIPLAYER LOBBY SCREEN */}
      {screen === 'lobby' && (
        <div className="overlay active">
          <div className="panel">
            <div className="section-title">🌐 Waiting for Player 2</div>
            <div className="room-code-display">{roomCode}</div>
            <div style={{ fontSize: '.75rem', color: '#a78bfa' }}>{p2Status || 'Waiting for an ally to connect...'}</div>
            <button className="btn danger sm" style={{ marginTop: '20px' }} onClick={() => onAction('cancel-lobby')}>✕ Cancel</button>
          </div>
        </div>
      )}

      {/* HALL OF LEGENDS LEADERBOARD */}
      {screen === 'leaderboard' && (
        <div className="overlay active">
          <div className="panel" style={{ width: 'min(600px, 96vw)' }}>
            <div className="section-title">🏆 Hall of Legends</div>
            <div className="scroll-area">
              {loadingLb ? <div className="lb-loading">Summoning records…</div> : (
                <table className="lb-table">
                  <thead><tr><th>#</th><th>Wizard</th><th>Mode</th><th>Wave</th><th>Score</th></tr></thead>
                  <tbody>
                    {leaderboard.length === 0 ? (
                      <tr><td colSpan="5" style={{ textAlign: 'center', color: 'rgba(167,139,250,0.5)' }}>No records yet. Be the first legend!</td></tr>
                    ) : (
                      leaderboard.map((row, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 'bold' }}>{medals[idx] || `#${idx + 1}`}</td>
                          <td>{row.name || 'Anonymous'}</td>
                          <td style={{ textTransform: 'uppercase', fontSize: '0.7rem', color: '#a78bfa' }}>{row.mode || 'solo'}</td>
                          <td>{row.wave || 1}</td>
                          <td className="lb-score">{(row.score || 0).toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
            <button className="btn danger sm" style={{ marginTop: '14px' }} onClick={() => setScreen('menu')}>← Back</button>
          </div>
        </div>
      )}

      {/* LEVEL UP MODAL PANEL LAYER */}
      {screen === 'levelup' && (
        <div className="overlay active" style={{ background: 'rgba(3, 1, 17, 0.45)', backdropFilter: 'blur(1px)' }}>
          <div className="lu-wrapper">
            <div className="lu-title">LEVEL UP — WAVE {hudData?.wave || 1}</div>
            <div className="lu-subtitle">Choose an Upgrade (Press 1, 2, 3 or Click)</div>
            <div className="lu-warning">⚠️ Game continues – enemies are still moving!</div>
            
            <div className="lu-cards-row">
              {displayedChoices.map((opt, i) => {
                const card = getUpgradeMeta(opt);
                return (
                  <div key={i} className="lu-card" onClick={() => onSelectUpgrade(opt)}>
                    <div className="lu-icon">{card.icon}</div>
                    <div className="lu-card-title">{card.title}</div>
                    <div className="lu-card-desc">{card.desc}</div>
                    <div className="lu-hotkey">[{i + 1}]</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER SUMMARY SCREEN */}
      {screen === 'gameover' && (
        <div className="overlay active">
          <div className="panel">
            <div className="menu-title" style={{ color: '#ef4444' }}>YOU PERISHED</div>
            <div id="go-score" style={{ fontSize: '1.45rem', margin: '12px 0' }}>
              Final Score: {(hudData?.score || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '.85rem', color: '#a78bfa', marginBottom: '14px' }}>
              Survived to Wave {hudData?.wave || 1}
            </div>
            {isCoop && (
              <div style={{ fontSize: '.85rem', color: '#f8fafc', marginBottom: '10px' }}>
                {restartVotes} / 2 voted to restart the game
              </div>
            )}
            {hasSupabase && (
              <div id="go-submit" style={{ marginBottom: '14px' }}>
                <div className="field-row">
                  <input 
                    className="field-input" 
                    type="text" 
                    value={wizardName} 
                    onChange={e => setWizardName(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && handleSubmitScore()}
                    placeholder="Wizard name" 
                  />
                  <button className="btn gold" onClick={handleSubmitScore} style={{ margin: 0 }}>Submit</button>
                </div>
                <div style={{ fontSize: '.7rem', color: '#a78bfa', marginTop: '4px', minHeight: '1em' }}>{submitStatus}</div>
              </div>
            )}
            <button className="btn" onClick={() => onAction(isCoop ? 'restart-coop' : 'start-solo', { name: wizardName })}>
              🔄 {isCoop ? 'Vote Restart' : 'Play Again'}
            </button>
            <button className="btn" onClick={() => setScreen('menu')}>🏠 Main Menu</button>
          </div>
        </div>
      )}

      {/* MATCH PAUSE OVERLAY */}
      {screen === 'pause' && (
        <div className="overlay active">
          <div className="panel" style={{ width: '320px' }}>
            <div className="section-title">⏸ Paused</div>
            
            {/* RESUME BUTTON */}
            <button 
              className="btn" 
              onClick={() => {
                if (window.executeNetworkResumeAction) {
                  window.executeNetworkResumeAction();
                } else {
                  setScreen('playing');
                }
              }}
            >
              Resume
            </button>
            
            {/* EXIT MATCH BUTTON */}
            <button 
              className="btn danger" 
              onClick={() => {
                if (window.executeNetworkExitAction) {
                  window.executeNetworkExitAction();
                } else {
                  setScreen('menu');
                  if (onAction) {
                    try { onAction('exit-match'); } catch(e) {}
                  }
                }
              }}
            >
              Exit Match
            </button>
          </div>
        </div>
      )}
    </div>
  );
}