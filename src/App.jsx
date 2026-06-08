import React, { useState, useRef, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';
import Overlays from './components/Overlays';
import PartyChat from './components/PartyChat';
import Toast from './components/Toast';
import { sbRealtime } from './services/supabase';
import './index.css';

export default function App() {
  const [screen, setScreen] = useState('menu');
  const [hud, setHud] = useState({ score: 0, wave: 1, waveT: 0, waveLen: 30, p: null, p2: null });
  const [coop, setCoop] = useState({ isEnabled: false, isHost: false, channel: null, roomCode: '', p2Name: 'Player 2', status: '' });
  const [wizardName, setWizardName] = useState('Wizard');
  const [toast, setToast] = useState({ message: '', isError: false });
  const [levelUpOptions, setLevelUpOptions] = useState([]);

  const hudRef = useRef({ score: 0, wave: 1, waveT: 0, waveLen: 30, p: null, p2: null });
  const netRef = useRef({ channel: null, isHost: false });

  useEffect(() => {
    const timer = setInterval(() => {
      if (screen === 'playing') {
        setHud({ ...hudRef.current });
      }
    }, 1200);
    return () => clearInterval(timer);
  }, [screen]);

  const showToast = (msg, err = false) => setToast({ message: msg, isError: err });

  const handleSelectUpgrade = (choice) => {
    if (window.runUpgrade) {
      window.runUpgrade(choice);
    }
    setScreen('playing');
  };

  const handleAction = (action, data) => {
    if (action === 'start-solo') {
      if (netRef.current.channel) netRef.current.channel.close();
      netRef.current = { channel: null, isHost: false };
      setCoop({ isEnabled: false, isHost: false, channel: null, roomCode: '', p2Name: 'Player 2', status: '' });
      setScreen('playing');
    }
    else if (action === 'host-game') {
      const name = data.name.trim() || 'Host Wizard';
      setWizardName(name);
      const code = Math.random().toString(36).slice(2, 8).toUpperCase();
      netRef.current.isHost = true;
      
      const channel = sbRealtime(`coop-${code}`, (event, payload) => {
        if (event === 'guest_joined') {
          setCoop(prev => ({ ...prev, p2Name: payload.name, status: `✦ ${payload.name} joined! Starting...` }));
          setTimeout(() => {
            channel.send('start_game', { p1Name: name });
            setScreen('playing');
          }, 1200);
        }
      });

      netRef.current.channel = channel;
      setCoop({ isEnabled: true, isHost: true, channel, roomCode: code, p2Name: 'Player 2', status: '' });
      setScreen('lobby');
    }
    else if (action === 'join-game') {
      const name = data.name.trim() || 'Guest Wizard';
      setWizardName(name);
      if (data.code.length < 4) return showToast('Invalid room code', true);
      netRef.current.isHost = false;

      const channel = sbRealtime(`coop-${data.code}`, (event, payload) => {
        if (event === 'start_game') {
          setCoop(prev => ({ ...prev, p2Name: payload.p1Name }));
          setScreen('playing');
        }
      });

      netRef.current.channel = channel;
      setTimeout(() => {
        channel.send('guest_joined', { name });
        showToast(`Connecting to room ${data.code}...`);
      }, 500);

      setCoop({ isEnabled: true, isHost: false, channel, roomCode: data.code, p2Name: 'Host', status: '' });
    }
    else if (action === 'cancel-lobby') {
      if (netRef.current.channel) netRef.current.channel.close();
      netRef.current = { channel: null, isHost: false };
      setScreen('menu');
    }
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <GameCanvas 
        screen={screen}
        setScreen={setScreen}
        hudRef={hudRef}
        netRef={netRef}
        onLevelUpOffer={(options) => { setLevelUpOptions(options); setScreen('levelup'); }}
      />

      {screen === 'playing' && (
        <>
          <button id="btn-pause-exit" onClick={() => setScreen('paused')}>⏸ PAUSE</button>
          {coop.isEnabled && <div id="coop-hud" className="active">⚔ {wizardName} & {coop.p2Name}</div>}
          
          <div style={{ position: 'absolute', bottom: '15px', left: '15px', zIndex: 10 }}>
            {hud.p && (
              <div style={{ color: '#ef4444', fontFamily: 'Share Tech Mono', fontSize: '15px', textShadow: '0 2px 4px #000' }}>
                HP: {Math.ceil(hud.p.hp)}/{hud.p.maxHp} | LVL: {hud.p.level}
              </div>
            )}
            <div style={{ color: '#a78bfa', fontSize: '18px', fontFamily: 'Cinzel', textShadow: '0 2px 4px #000' }}>
              WAVE: {hud.wave} ({Math.max(0, Math.ceil(hud.waveLen - hud.waveT))}s)
            </div>
          </div>
          
          <div style={{ position: 'absolute', top: '15px', left: '15px', color: '#fbbf24', fontSize: '22px', fontFamily: 'Cinzel', textShadow: '0 2px 4px #000' }}>
            SCORE: {hud.score.toLocaleString()}
          </div>
        </>
      )}

      <Overlays 
        screen={screen}
        setScreen={setScreen}
        hudData={hud}
        roomCode={coop.roomCode}
        p2Status={coop.status}
        isCoop={coop.isEnabled}
        levelUpOptions={levelUpOptions}
        onSelectUpgrade={handleSelectUpgrade}
        onAction={handleAction}
      />

      <PartyChat enabled={coop.isEnabled} channel={netRef.current.channel} localName={wizardName} />
      <Toast message={toast.message} isError={toast.isError} onClose={() => setToast({ message: '', isError: false })} />
    </div>
  );
}