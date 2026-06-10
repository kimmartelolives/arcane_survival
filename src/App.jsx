import React, { useState, useRef, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';
import Overlays from './components/Overlays';
import PartyChat from './components/PartyChat';
import Toast from './components/Toast';
import AdminPortal from './components/AdminPortal';
import { sbRealtime } from './services/supabase';
import './index.css';

// 1. I-import ang custom cursor components at styles
import CustomCursor from './components/CustomCursor'; 

// ==========================================================================
// 🔥 STEP 1: GLOBAL AUDIO SINGLETON INSTANCE INITIALIZATION
// ==========================================================================
// Palitan ang mga URL na ito ng aktwal mong sound assets (mp3/wav) kung nakapwesto na sila
const MENU_BGM_URL = '../main.mp3';
const GAME_BGM_URL = "../game.mp3";

if (typeof window !== 'undefined' && !window.arcaneAudio) {
  window.arcaneAudio = {
    menuBgm: new Audio(MENU_BGM_URL),
    gameBgm: new Audio(GAME_BGM_URL),
    isMuted: localStorage.getItem('arcane_muted') === 'true'
  };
  window.arcaneAudio.menuBgm.loop = true;
  window.arcaneAudio.gameBgm.loop = true;
}

export default function App() {
  const [screen, setScreen] = useState('menu');
  const [hud, setHud] = useState({ score: 0, wave: 1, waveT: 0, waveLen: 30, p: null, p2: null });
  const [coop, setCoop] = useState({ isEnabled: false, isHost: false, channel: null, roomCode: '', p2Name: 'Player 2', status: '' });
  
  const [wizardName, setWizardName] = useState(() => {
    return localStorage.getItem('wizardName') || 'Wizard';
  });
  const wizardNameRef = useRef(wizardName);
  const [toast, setToast] = useState({ message: '', isError: false });
  const [levelUpOptions, setLevelUpOptions] = useState(['Vitality', 'Arcane Might', 'Rapid Fire']); 

  // 🔥 State para sa sound tracking na naka-sync sa localStorage cache presets
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('arcane_muted') === 'true');

  const hudRef = useRef({ score: 0, wave: 1, waveT: 0, waveLen: 30, p: null, p2: null });
  
  const netRef = useRef({ 
    channel: null, 
    isHost: false,
    onCanvasMsg: null 
  });

  // ==========================================================================
  // 🔥 STEP 2: GLOBAL AUDIO MUTING & ROUTING CONTROLLERS
  // ==========================================================================
  const toggleGlobalMute = (e) => {
    e.stopPropagation();
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    localStorage.setItem('arcane_muted', String(nextMute));
    
    if (window.arcaneAudio) {
      window.arcaneAudio.isMuted = nextMute;
      window.arcaneAudio.menuBgm.muted = nextMute;
      window.arcaneAudio.gameBgm.muted = nextMute;
      
      if (nextMute) {
        window.arcaneAudio.menuBgm.pause();
        window.arcaneAudio.gameBgm.pause();
      } else {
        if (screen === 'playing') window.arcaneAudio.gameBgm.play().catch(()=>{});
        else window.arcaneAudio.menuBgm.play().catch(()=>{});
      }
    }
  };

  // Tagalipat ng kanta tuwing nagpapalit ng operational system windows
  useEffect(() => {
    if (!window.arcaneAudio) return;
    const { menuBgm, gameBgm, isMuted: globalMute } = window.arcaneAudio;

    menuBgm.muted = globalMute;
    gameBgm.muted = globalMute;

    if (globalMute) return;

    if (screen === 'playing') {
      menuBgm.pause();
      gameBgm.play().catch(() => {});
    } else {
      gameBgm.pause();
      menuBgm.play().catch(() => {});
    }
  }, [screen]);

  // ==========================================================================
  // EXISTING CORE EFFECTS ENGINE
  // ==========================================================================
  useEffect(() => {
    localStorage.setItem('wizardName', wizardName);
    wizardNameRef.current = wizardName;
  }, [wizardName]);

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
          netRef.current.channel.send('start_game', { p1Name: wizardNameRef.current });
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
      wizardNameRef.current = name;
      const code = Math.random().toString(36).slice(2, 8).toUpperCase();
      
      netRef.current.isHost = true;
      netRef.current.channel = sbRealtime(`coop-${code}`, routeNetworkMessage, () => {
        console.log("Room successfully created on network bridge cluster:", code);
      });

      if (netRef.current.channel && typeof netRef.current.channel.subscribe === 'function') {
        netRef.current.channel.subscribe((status) => {
          console.log("📡 [HOST NET LOG] Status:", status);
          if (status === 'CHANNEL_ERROR') {
            console.error("🛑 QUOTA ERROR: Hindi magawa ang WebSocket stream dahil lumagpas sa 2.7M limit!");
          }
        });
      }

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

      if (netRef.current.channel && typeof netRef.current.channel.subscribe === 'function') {
        netRef.current.channel.subscribe((status) => {
          console.log("📡 [GUEST NET LOG] Status:", status);
          if (status === 'CHANNEL_ERROR') {
            console.error("🛑 QUOTA ERROR: Ayaw tanggapin ng Supabase ang player connection mo!");
          }
        });
      }

      setCoop({ isEnabled: true, isHost: false, channel: netRef.current.channel, roomCode: targetCode, p2Name: 'Host', status: '' });
    }
    else if (action === 'cancel-lobby') {
      setScreen('menu');
    }
  };

  const currentHash = window.location.hash;
  if (currentHash === '#/scribe-portal') {
    return <AdminPortal />;
  }

  return (
    /* 2. Ginawang dynamic height 100dvh para safe sa phone status bars at floating Safari URL boundaries */
    <div 
      style={{ position: 'relative', width: '100vw', height: '100dvh', overflow: 'hidden', cursor: 'none' }}
      onClick={() => {
        // 🔥 STEP 3: AUTOMATIC INTERACTION BYPASS FOR MOBILE BROWSER AUTOPLAY BLOCK
        if (window.arcaneAudio && !window.arcaneAudio.isMuted) {
          if (screen === 'playing') window.arcaneAudio.gameBgm.play().catch(()=>{});
          else window.arcaneAudio.menuBgm.play().catch(()=>{});
        }
      }}
    >
      
      {/* 3. Inilagay ang Animated Custom Cursor dito sa pinakataas */}
      <CustomCursor />

      {/* ==========================================================================
          🔥 STEP 4: ENCHANTED GLOBAL TRANSPARENT MUTE BUTTON (FLOATING UPPER LEFT)
          ========================================================================== */}
      <button 
        onClick={toggleGlobalMute}
        style={{
          position: 'fixed',
          top: '16px',
          left: '24px',          /* Safe edge indentation para umiwas sa modern device rounding/notches */
          zIndex: 999999,        /* Lumulutang sa pinakamataas na z-index plane layer ng matrix sheet */
          background: 'transparent',
          border: 'none',
          fontSize: '1.4rem',
          cursor: 'pointer',
          opacity: 0.35,         /* Semi-transparent para nakatago at hindi harang sa pixel graphics */
          transition: 'opacity 0.2s ease, transform 0.1s ease',
          pointerEvents: 'auto', /* Pinapayagang makasagap ng touch click events */
          userSelect: 'none',
          WebkitTapHighlightColor: 'transparent'
        }}
        onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
        onMouseOut={(e) => e.currentTarget.style.opacity = '0.35'}
        onPointerDown={(e) => e.stopPropagation()} /* Haharangin ang loop para hindi mag-flicker sa left joystick area */
      >
        {isMuted ? '🔇' : '🔊'}
      </button>

      <GameCanvas 
        screen={screen}
        setScreen={setScreen}
        hudRef={hudRef}
        netRef={netRef}
        playerName={wizardName}
        allyName={coop.p2Name}
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