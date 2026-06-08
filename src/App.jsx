import React, { useState, useCallback } from 'react';
import GameCanvas from './components/GameCanvas';
import Overlays from './components/Overlays';
import PartyChat from './components/PartyChat';
import Toast from './components/Toast';
import { sbRealtime } from './services/supabase';

export default function App() {
  const [gameState, setGameState] = useState('menu'); // menu, coop-menu, lobby, leaderboard, playing, paused, gameover, levelup
  const [hud, setHud] = useState({ score: 0, wave: 1, waveT: 0, waveLen: 30, p: null });
  const [coop, setCoop] = useState({ isEnabled: false, isHost: false, channel: null, roomCode: '', p2Name: 'Player 2', status: '' });
  const [wizardName, setWizardName] = useState('Wizard');
  const [toast, setToast] = useState({ message: '', isError: false });
  const [levelUpOptions, setLevelUpOptions] = useState([]);

  const showToast = useCallback((msg, err = false) => setToast({ message: msg, isError: err }), []);

  const handleAction = useCallback((action, data) => {
    if (action === 'start-solo') {
      setCoop({ isEnabled: false, isHost: false, channel: null, roomCode: '', p2Name: 'Player 2', status: '' });
      setGameState('playing');
    }
    else if (action === 'open-coop') setGameState('coop-menu');
    else if (action === 'open-lb') setGameState('leaderboard');
    else if (action === 'to-menu') setGameState('menu');
    
    else if (action === 'host-game') {
      const name = data.name.trim() || 'Host Wizard';
      setWizardName(name);
      const code = Math.random().toString(36).slice(2, 8).toUpperCase();
      
      const channel = sbRealtime(`coop-${code}`, (event, payload) => {
        if (event === 'guest_joined') {
          setCoop(prev => ({ ...prev, p2Name: payload.name, status: `✦ ${payload.name} joined! Starting...` }));
          setTimeout(() => {
            channel.send('start_game', { p1Name: name });
            setGameState('playing');
          }, 1200);
        }
        if (channel.onMsg) channel.onMsg(event, payload);
      });

      setCoop({ isEnabled: true, isHost: true, channel, roomCode: code, p2Name: 'Player 2', status: '' });
      setGameState('lobby');
    }
    
    else if (action === 'join-game') {
      const name = data.name.trim() || 'Guest Wizard';
      setWizardName(name);
      if (data.code.length < 4) return showToast('Invalid room code', true);

      const channel = sbRealtime(`coop-${data.code}`, (event, payload) => {
        if (event === 'start_game') {
          setCoop(prev => ({ ...prev, p2Name: payload.p1Name }));
          setGameState('playing');
        }
        if (channel.onGuestMsg) channel.onGuestMsg(event, payload);
        if (channel.onMsg) channel.onMsg(event, payload);
      });

      setTimeout(() => {
        channel.send('guest_joined', { name });
        showToast(`Connecting to room ${data.code}...`);
      }, 500);

      setCoop({ isEnabled: true, isHost: false, channel, roomCode: data.code, p2Name: 'Host', status: '' });
    }
    
    else if (action === 'cancel-lobby') {
      if (coop.channel) coop.channel.close();
      setGameState('coop-menu');
    }
    else if (action === 'resume') setGameState('playing');
  }, [coop.channel, showToast]);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <h2 className="sr-only">Arcane Survival – Action Arcade Arena</h2>
      
      <GameCanvas 
        gameState={gameState}
        isCoop={coop.isEnabled}
        isHost={coop.isHost}
        coopChannel={coop.channel}
        coopName={wizardName}
        p2Name={coop.p2Name}
        onStateUpdate={setHud}
        onGameOver={(targetState) => setGameState(targetState)}
        onLevelUpOffer={(options) => { setLevelUpOptions(options); setGameState('levelup'); }}
      />

      {/* Declarative Heads-up Display */}
      {gameState === 'playing' && (
        <>
          <button id="btn-pause-exit" onClick={() => setGameState('paused')}>⏸ PAUSE</button>
          {coop.isEnabled && <div id="coop-hud" className="active">⚔ Match · {wizardName} & {coop.p2Name}</div>}
          
          <div style={{ position: 'absolute', bottom: '10px', left: '10px', zIndex: 10 }}>
            {hud.p && (
              <div style={{ color: '#ef4444', fontFamily: 'Share Tech Mono', fontSize: '14px' }}>
                HP: {Math.ceil(hud.p.hp)}/{hud.p.maxHp} | LVL: {hud.p.level}
              </div>
            )}
            <div style={{ color: '#a78bfa', fontSize: '18px', fontFamily: 'Cinzel' }}>
              WAVE: {hud.wave} ({Math.max(0, Math.ceil(hud.waveLen - hud.waveT))}s)
            </div>
          </div>
          
          <div style={{ position: 'absolute', top: '10px', right: '10px', color: '#fbbf24', fontSize: '20px', fontFamily: 'Cinzel' }}>
            {hud.score.toLocaleString()}
          </div>
        </>
      )}

      <Overlays 
        gameState={gameState}
        score={hud.score}
        wave={hud.wave}
        level={hud.p?.level || 1}
        isCoop={coop.isEnabled}
        roomCode={coop.roomCode}
        p2Status={coop.status}
        onAction={handleAction}
      />

      <PartyChat enabled={coop.isEnabled} channel={coop.channel} localName={wizardName} />
      <Toast message={toast.message} isError={toast.isError} onClose={() => setToast({ message: '', isError: false })} />
    </div>
  );
}