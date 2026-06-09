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
                
                {/* FIXED: Direct Core Execution para iwas bara sa React State Tree */}
                <button 
                  className="btn danger" 
                  onClick={() => {
                    if (window.executeNetworkExitAction) {
                      window.executeNetworkExitAction();
                    } else {
                      // Hard reset fallback kung sakaling hindi pa nag-mount ang Canvas engine
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