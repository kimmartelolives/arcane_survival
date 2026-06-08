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
  
  const netRef = useRef({ 
    channel: null, 
    isHost: false,
    onCanvasMsg: null 
  });

  useEffect(() => {
    const timer = setInterval(() => {
      if (screen === 'playing') {
        setHud({ ...hudRef.current });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [screen]);

  useEffect(() => {
    if (screen === 'menu' && netRef.current.channel) {
      netRef.current.channel.close();
      netRef.current.channel = null;
      setCoop({ isEnabled: false, isHost: false, channel: null, roomCode: '', p2Name: 'Player 2', status: '' });
    }
  }, [screen]);

  const showToast = (msg, err = false) => setToast({ message: msg, isError: err });

  const handleSelectUpgrade = (choice) => {
    if (window.runUpgrade) window.runUpgrade(choice);
    setScreen('playing');
  };

  // Centralized Master Network Router
  const routeNetworkMessage = (event, payload) => {
    // 1. Handle Core Lobby Lifecycle Events
    if (event === 'guest_joined') {
      setCoop(prev => ({ ...prev, p2Name: payload.name, status: `✦ ${payload.name} joined! Starting...` }));
      setTimeout(() => {
        if (netRef.current.channel) {
          netRef.current.channel.send('start_game', { p1Name: wizardName });
        }
        setScreen('playing');
      }, 1000);
    }

    if (event === 'start_game') {
      setCoop(prev => ({ ...prev, p2Name: payload.p1Name }));
      setScreen('playing');
    }

    // FIXED: I-sync ang React HUD states ni Player 2 tuwing dumarating ang state packet mula sa Host
    if (event === 'state_sync' && !netRef.current.isHost) {
      setHud({
        score: payload.score ?? 0,
        wave: payload.wave ?? 1,
        waveT: payload.waveT ?? 0,
        waveLen: payload.waveLen ?? 30,
        p: payload.p2 ? { hp: payload.p2.hp, maxHp: payload.p2.maxHp, level: payload.p2_level || 1 } : null
      });
    }

    // 2. Forward gameplay loop frames directly to the Canvas engine safely
    if (netRef.current.onCanvasMsg) {
      netRef.current.onCanvasMsg(event, payload);
    }

    // 3. Forward message packets to PartyChat observer hooks explicitly
    if (netRef.current.channel && netRef.current.channel.onChatMsg) {
      netRef.current.channel.onChatMsg(event, payload);
    }
  };

  const handleAction = (action, data) => {
    if (action === 'start-solo') {
      if (netRef.current.channel) netRef.current.channel.close();
      netRef.current.channel = null;
      setCoop({ isEnabled: false, isHost: false, channel: null, roomCode: '', p2Name: 'Player 2', status: '' });
      setScreen('playing');
    }
    else if (action === 'host-game') {
      const name = data.name.trim() || 'Host Wizard';
      setWizardName(name);
      const code = Math.random().toString(36).slice(2, 8).toUpperCase();
      
      netRef.current.isHost = true;
      netRef.current.channel = sbRealtime(`coop-${code}`, routeNetworkMessage, () => {
        console.log("Room successfully created:", code);
      });

      setCoop({ isEnabled: true, isHost: true, channel: netRef.current.channel, roomCode: code, p2Name: 'Player 2', status: '' });
      setScreen('lobby');
    }
    else if (action === 'join-game') {
      const name = data.name.trim() || 'Guest Wizard';
      setWizardName(name);
      if (data.code.length < 4) return showToast('Invalid room code', true);
      
      const targetCode = data.code.trim().toUpperCase();
      netRef.current.isHost = false;
      
      netRef.current.channel = sbRealtime(`coop-${targetCode}`, routeNetworkMessage, () => {
        showToast(`Connected to room ${targetCode}! Welcoming host...`);
        setTimeout(() => {
          if (netRef.current.channel) {
            netRef.current.channel.send('guest_joined', { name });
          }
        }, 150);
      });

      setCoop({ isEnabled: true, isHost: false, channel: netRef.current.channel, roomCode: targetCode, p2Name: 'Host', status: '' });
    }
    else if (action === 'cancel-lobby') {
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
          <button id="btn-pause-exit" onClick={() => setScreen('menu')}>Exit</button>
          {coop.isEnabled && <div id="coop-hud" className="active">⚔ {wizardName} & {coop.p2Name}</div>}
          
          <div style={{ position: 'absolute', bottom: '15px', left: '15px', zIndex: 10 }}>
            <div style={{ color: '#ef4444', fontFamily: 'Share Tech Mono', fontSize: '15px', textShadow: '0 2px 4px #000' }}>
              HP: {screen === 'playing' && hud.p ? Math.ceil(hud.p.hp) : 100}/{hud.p ? hud.p.maxHp : 100} | LVL: {hud.p ? hud.p.level : 1}
            </div>
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
    </div>
  );
}