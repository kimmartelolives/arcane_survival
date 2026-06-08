import React, { useState, useEffect } from 'react';
import { sbGet, sbPost, hasSupabase } from '../services/supabase';

export default function Overlays({ 
  gameState, 
  score, 
  wave, 
  level, 
  isCoop, 
  roomCode, 
  p2Status, 
  onAction 
}) {
  const [wizardName, setWizardName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingLb, setLoadingLb] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('');

  useEffect(() => {
    if (gameState === 'leaderboard') {
      setLoadingLb(true);
      sbGet('/rest/v1/leaderboard?select=name,score,wave,level,mode&order=score.desc&limit=10')
        .then(data => { setLeaderboard(data || []); setLoadingLb(false); });
    }
  }, [gameState]);

  const handleSubmitScore = async () => {
    if (!wizardName.trim()) return alert('Enter name first');
    setSubmitStatus('Submitting…');
    const ok = await sbPost('/rest/v1/leaderboard', {
      name: wizardName, score, wave, level, mode: isCoop ? 'coop' : 'solo'
    });
    setSubmitStatus(ok ? '✦ Score submitted!' : 'Failed submission.');
  };

  if (gameState === 'playing') return null;

  return (
    <div id="overlays">
      {gameState === 'menu' && (
        <div className="overlay active">
          <div className="panel">
            <div className="panel-shine" />
            <div className="menu-title"><span className="arc">ARCANE</span><br/><span className="sur">SURVIVAL</span></div>
            <div className="menu-sub">A Wizard's Last Stand</div>
            <div className="divider" />
            <button className="btn" onClick={() => onAction('start-solo')}>
              <span className="btn-icon">🧙</span><span className="btn-label">Solo Play</span>
            </button>
            <button className="btn gold" onClick={() => onAction('open-coop')}>
              <span className="btn-icon">⚔️</span><span className="btn-label">Co-op Play</span>
            </button>
            <button className="btn" onClick={() => onAction('open-lb')}>
              <span className="btn-icon">🏆</span><span className="btn-label">Leaderboard</span>
            </button>
          </div>
        </div>
      )}

      {gameState === 'coop-menu' && (
        <div className="overlay active">
          <div className="panel">
            <div className="section-title">⚔️ Co-op Play</div>
            <div className="field-group">
              <label className="field-label">Your Wizard Name</label>
              <input className="field-input" type="text" value={wizardName} onChange={e => setWizardName(e.target.value)} placeholder="e.g. Eldrin" maxLength={16} />
            </div>
            <button className="btn gold" onClick={() => onAction('host-game', { name: wizardName })}>Host Room</button>
            <div style={{ margin: '12px 0', fontSize: '.65rem', color: 'rgba(167,139,250,.4)' }}>— OR —</div>
            <div className="field-group">
              <label className="field-label">Room Code</label>
              <input className="field-input" type="text" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="6-LETTER CODE" maxLength={6} style={{ textAlign: 'center', letterSpacing: '.2em' }} />
            </div>
            <button className="btn" onClick={() => onAction('join-game', { name: wizardName, code: joinCode })}>Join Game</button>
            <button className="btn danger sm" style={{ marginTop: '14px' }} onClick={() => onAction('to-menu')}>← Back</button>
          </div>
        </div>
      )}

      {gameState === 'lobby' && (
        <div className="overlay active">
          <div className="panel">
            <div className="section-title">🌐 Waiting for Player 2</div>
            <div className="room-code-display">{roomCode}</div>
            <div style={{ fontSize: '.75rem', color: '#a78bfa' }}>{p2Status || 'Waiting for an ally to connect...'}</div>
            <button className="btn danger sm" style={{ marginTop: '20px' }} onClick={() => onAction('cancel-lobby')}>✕ Cancel</button>
          </div>
        </div>
      )}

      {gameState === 'leaderboard' && (
        <div className="overlay active">
          <div className="panel" style={{ width: 'min(600px, 96vw)' }}>
            <div className="section-title">🏆 Hall of Legends</div>
            <div className="scroll-area">
              {loadingLb ? <div className="lb-loading">Summoning records…</div> : (
                <table className="lb-table">
                  <thead><tr><th>#</th><th>Wizard</th><th>Mode</th><th>Wave</th><th>Score</th></tr></thead>
                  <tbody>
                    {leaderboard.map((row, idx) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td>{row.name}</td>
                        <td>{row.mode}</td>
                        <td>{row.wave}</td>
                        <td className="lb-score">{row.score.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <button className="btn danger sm" style={{ marginTop: '14px' }} onClick={() => onAction('to-menu')}>← Back</button>
          </div>
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="overlay active">
          <div className="panel">
            <div className="menu-title" style={{ color: '#ef4444' }}>YOU PERISHED</div>
            <div id="go-score" style={{ fontSize: '1.45rem', margin: '12px 0' }}>Final Score: {score.toLocaleString()}</div>
            <div style={{ fontSize: '.85rem', color: '#a78bfa', marginBottom: '14px' }}>Wave {wave} · Level {level}</div>
            
            {hasSupabase && (
              <div id="go-submit" style={{ marginBottom: '14px' }}>
                <div className="field-row">
                  <input className="field-input" type="text" value={wizardName} onChange={e => setWizardName(e.target.value)} placeholder="Wizard name" />
                  <button className="btn gold" onClick={handleSubmitScore} style={{ margin: 0 }}>Submit</button>
                </div>
                <div style={{ fontSize: '.7rem', color: '#a78bfa', mt: '4px' }}>{submitStatus}</div>
              </div>
            )}
            <button className="btn" onClick={() => onAction('start-solo')}>🔄 Play Again</button>
            <button className="btn" onClick={() => onAction('to-menu')}>🏠 Main Menu</button>
          </div>
        </div>
      )}

      {gameState === 'paused' && (
        <div className="overlay active">
          <div className="panel" style={{ width: '320px' }}>
            <div className="section-title">⏸ Paused</div>
            <button className="btn" onClick={() => onAction('resume')}>Resume</button>
            <button className="btn danger" onClick={() => onAction('to-menu')}>Exit Match</button>
          </div>
        </div>
      )}
    </div>
  );
}