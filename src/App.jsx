import React, { useState, useRef, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';
import Overlays from './components/Overlays';
import PartyChat from './components/PartyChat';
import Toast from './components/Toast';
import AdminPortal from './components/AdminPortal'; // 👈 BAGONG IMPORT
import { sbRealtime } from './services/supabase';
import './index.css';

export default function App() {
  const [screen, setScreen] = useState('menu');
  const [hud, setHud] = useState({ score: 0, wave: 1, waveT: 0, waveLen: 30, p: null, p2: null });
  const [coop, setCoop] = useState({ isEnabled: false, isHost: false, channel: null, roomCode: '', p2Name: 'Player 2', status: '' });
  const [wizardName, setWizardName] = useState('Wizard');
  const [toast, setToast] = useState({ message: '', isError: false });
  const [levelUpOptions, setLevelUpOptions] = useState(['Vitality', 'Arcane Might', 'Rapid Fire']); 

  const hudRef = useRef({ score: 0, wave: 1, waveT: 0, waveLen: 30, p: null, p2: null });
  
  const netRef = useRef({ 
    channel: null, 
    isHost: false,
    onCanvasMsg: null 
  });

  useEffect(() => {
    const timer = setInterval(() => {
      if (screen === 'playing' || screen === 'gameover') {
        setHud({ ...hudRef.current });
      }
    }, 600);
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
    if (!netRef.current.isHost && netRef.current.channel) {
      netRef.current.channel.send('guest_levelup_choice', { choice });
    } else if (window.runUpgrade) {
      window.runUpgrade(choice);
    }
    setScreen('playing');
  };

  const routeNetworkMessage = (event, payload) => {
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

    if (event === 'guest_exited') {
      setCoop(prev => ({ 
        ...prev, 
        p2Name: 'Disconnected', 
        status: 'Player 2 has left the match.' 
      }));
      window.dispatchEvent(new CustomEvent('network_guest_exited_trigger'));
    }

    if (event === 'offer_levelup' && !netRef.current.isHost) {
      setLevelUpOptions(payload.ups || ['Vitality', 'Arcane Might', 'Gain Multi-Shot']);
      setScreen('levelup');
    }

    if (event === 'game_paused') {
      setScreen('pause');
    }
    if (event === 'game_resumed') {
      setScreen('playing');
    }

    if (netRef.current.onCanvasMsg) {
      netRef.current.onCanvasMsg(event, payload);
    }

    if (netRef.current.channel && netRef.current.channel.onChatMsg) {
      netRef.current.channel.onChatMsg(event, payload);
    }
  };

  const handleAction = (action, data) => {
    if (action === 'start-solo') {
      if (netRef.current.channel) netRef.current.channel.close();
      netRef.current.channel = null;
      setCoop({ isEnabled: false, isHost: false, channel: null, roomCode: '', p2Name: 'Player 2', status: '' });
      
      const name = data?.name?.trim() || 'Wizard';
      setWizardName(name);

      const pool = ['Vitality', 'Arcane Might', 'Rapid Fire', 'Gain Multi-Shot'];
      const shuffle = [...pool].sort(() => 0.5 - Math.random()).slice(0, 3);
      setLevelUpOptions(shuffle);
      
      setScreen('playing');
    }
    else if (action === 'host-game') {
      const name = data.name.trim() || 'Host Wizard';
      setWizardName(name);
      const code = Math.random().toString(36).slice(2, 8).toUpperCase();
      
      netRef.current.isHost = true;
      netRef.current.channel = sbRealtime(`coop-${code}`, routeNetworkMessage, () => {
        console.log("Room successfully created on network bridge cluster:", code);
      });

      setCoop({ isEnabled: true, isHost: true, channel: netRef.current.channel, roomCode: code, p2Name: 'Player 2', status: '' });
      setScreen('lobby');
    }
    else if (action === 'restart-coop') {
      if (window.triggerRestartVote) {
        window.triggerRestartVote();
      }
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

  // 👈 BAGONG ROUTING LOGIC: I-check kung nasa admin URL tayo
  const currentPath = window.location.pathname;
  if (currentPath === '/scribe-portal') {
    return <AdminPortal />;
  }

  // Kung hindi, i-load ang normal na game UI
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <GameCanvas 
        screen={screen}
        setScreen={setScreen}
        hudRef={hudRef}
        netRef={netRef}
        playerName={wizardName}
        isCoop={coop.isEnabled}
        onLevelUpOffer={(options) => { 
          const pool = options && options.length > 0 ? options : ['Vitality', 'Arcane Might', 'Rapid Fire', 'Gain Multi-Shot'];
          const uniqueChoices = [...pool].sort(() => 0.5 - Math.random()).slice(0, 3);
          setLevelUpOptions(uniqueChoices); 
          setScreen('levelup'); 
        }}
      />
      {screen === 'playing' && (
        <>
          <button 
            id="btn-pause-exit" 
            onClick={() => {
              if (window.executeNetworkExitAction) {
                window.executeNetworkExitAction();
              } else {
                setScreen('menu');
              }
            }}
          >
            Exit
          </button>
          
          {coop.isEnabled && <div id="coop-hud" className="active">⚔️ {wizardName} & {coop.p2Name}</div>}
        </>
      )}

      <Overlays 
        screen={screen}
        setScreen={setScreen}
        hudData={hud}
        roomCode={coop.roomCode}
        p2Status={coop.status}
        isCoop={coop.isEnabled}
        initialWizardName={wizardName}
        levelUpOptions={levelUpOptions} 
        onSelectUpgrade={handleSelectUpgrade}
        onAction={handleAction}
      />

      <PartyChat enabled={coop.isEnabled} channel={netRef.current.channel} localName={wizardName} />
      <Toast message={toast.message} isError={toast.isError} onClose={() => setToast({ message: '', isError: false })} />
    </div>
  );
}