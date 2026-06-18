import React, { useState, useRef, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';
import Overlays from './components/Overlays';
import IntroScreen from './components/IntroScreen';
import PartyChat from './components/PartyChat';
import Toast from './components/Toast';
import AdminPortal from './components/AdminPortal';
import { sbRealtime } from './services/supabase';
import './index.css';
import MetaShop from './components/MetaShop';

// 1. I-import ang custom cursor components at styles
import CustomCursor from './components/CustomCursor'; 

// ==========================================================================
// 🔥 STEP 1: GLOBAL AUDIO SINGLETON INSTANCE INITIALIZATION
// ==========================================================================
const MENU_BGM_URL = '../main.mp3';
const GAME_BGM_URL = "../game.mp3";
const BOSS_BGM_URL = "../boss.mp3";
const POST_BOSS_BGM_URL = "../post1.mp3";
// 🔊 MAGDAGDAG NG MGA URL PARA SA UPGRADE SCREEN SFX DITO
const LEVEL_UP_SFX_URL = '../level.mp3'; 
const SELECT_SFX_URL = '../select.mp3';

const GAME_OVER_SFX_URL = '../gameover.mp3';

if (typeof window !== 'undefined' && !window.arcaneAudio) {
  window.arcaneAudio = {
    menuBgm: new Audio(MENU_BGM_URL),
    gameBgm: new Audio(GAME_BGM_URL),
    bossBgm: new Audio(BOSS_BGM_URL),
    postBossBgm: new Audio(POST_BOSS_BGM_URL),
    levelUpSfx: new Audio(LEVEL_UP_SFX_URL),       // 🔥 Bagong SFX kapag lumabas ang screen
    selectUpgradeSfx: new Audio(SELECT_SFX_URL), // 🔥 Bagong SFX kapag may piniling upgrade
    gameOverSfx: new Audio(GAME_OVER_SFX_URL),
    isMuted: localStorage.getItem('arcane_muted') === 'true',
    isBossActive: false
  };
  window.arcaneAudio.menuBgm.loop = true;
  window.arcaneAudio.gameBgm.loop = true;
  window.arcaneAudio.bossBgm.loop = true;
  window.arcaneAudio.postBossBgm.loop = true;

  window.arcaneAudio.stopAllBgm = () => {
    // I-pause ang lahat ng BGM
    window.arcaneAudio.menuBgm.pause();
    window.arcaneAudio.gameBgm.pause();
    window.arcaneAudio.bossBgm.pause();
    window.arcaneAudio.postBossBgm.pause();
    
    // I-reset ang oras pabalik sa simula para sariwa kapag i-play ulit
    window.arcaneAudio.menuBgm.currentTime = 0;
    window.arcaneAudio.gameBgm.currentTime = 0;
    window.arcaneAudio.bossBgm.currentTime = 0;
    window.arcaneAudio.postBossBgm.currentTime = 0;
  };

  window.arcaneAudio.menuBgm.volume = 0.8;
  window.arcaneAudio.gameBgm.volume = 0.8;
  window.arcaneAudio.levelUpSfx.volume = 0.5;       // Setup ang volume para sa SFX
  window.arcaneAudio.selectUpgradeSfx.volume = 0.5;
  window.arcaneAudio.gameOverSfx.volume = 1.0;
  window.arcaneAudio.bossBgm.volume = 1.0;
}

export default function App() {
  const [screen, setScreen] = useState('intro');
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

  const toggleGlobalMute = (e) => {
    e.stopPropagation();
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    localStorage.setItem('arcane_muted', String(nextMute));
    
    if (window.arcaneAudio) {
      window.arcaneAudio.isMuted = nextMute;
      window.arcaneAudio.menuBgm.muted = nextMute;
      window.arcaneAudio.gameBgm.muted = nextMute;
      
      if (window.arcaneAudio.bossBgm) window.arcaneAudio.bossBgm.muted = nextMute; 
      if (window.arcaneAudio.postBossBgm) window.arcaneAudio.postBossBgm.muted = nextMute; 
      
      window.arcaneAudio.levelUpSfx.muted = nextMute;
      window.arcaneAudio.selectUpgradeSfx.muted = nextMute;
      window.arcaneAudio.gameOverSfx.muted = nextMute; 
      
      if (nextMute) {
        window.arcaneAudio.menuBgm.pause();
        window.arcaneAudio.gameBgm.pause();
        window.arcaneAudio.levelUpSfx.pause();
        window.arcaneAudio.selectUpgradeSfx.pause();
        window.arcaneAudio.gameOverSfx.pause(); 
        
        if (window.arcaneAudio.bossBgm) window.arcaneAudio.bossBgm.pause();
        if (window.arcaneAudio.postBossBgm) window.arcaneAudio.postBossBgm.pause(); 
      } else {
        if (screen === 'playing') {
            if (window.arcaneAudio.isPostBossActive && window.arcaneAudio.postBossBgm) {
                window.arcaneAudio.postBossBgm.play().catch(()=>{});
            } else if (window.arcaneAudio.isBossActive && window.arcaneAudio.bossBgm) {
                window.arcaneAudio.bossBgm.play().catch(()=>{});
            } else {
                window.arcaneAudio.gameBgm.play().catch(()=>{});
            }
        }
        else if (screen === 'gameover') window.arcaneAudio.gameOverSfx.play().catch(()=>{});
        else if (screen === 'intro') return;
        else window.arcaneAudio.menuBgm.play().catch(()=>{});
      }
    }
  };

  useEffect(() => {
    /*
    const hasPlayed = sessionStorage.getItem('arcane_intro_played');
    if (hasPlayed && screen === 'intro') {
      setScreen('menu');
    }
    */
  }, [screen]);

  const handleIntroFinish = () => {
    sessionStorage.setItem('arcane_intro_played', 'true');
    setScreen('menu');
  };

  useEffect(() => {
    if (!window.arcaneAudio) return;
    const { menuBgm, gameBgm, bossBgm, postBossBgm, levelUpSfx, selectUpgradeSfx, gameOverSfx, isMuted: globalMute } = window.arcaneAudio;

    menuBgm.muted = globalMute;
    gameBgm.muted = globalMute;
    levelUpSfx.muted = globalMute;
    selectUpgradeSfx.muted = globalMute;
    gameOverSfx.muted = globalMute;
    
    if (bossBgm) bossBgm.muted = globalMute;
    if (postBossBgm) postBossBgm.muted = globalMute;

    if (globalMute) return;

    if (screen === 'playing') {
      menuBgm.pause();
      gameOverSfx.pause();
      gameOverSfx.onended = null; 
      
      if (window.arcaneAudio.isPostBossActive && postBossBgm) {
          postBossBgm.play().catch(() => {});
      } else if (window.arcaneAudio.isBossActive && bossBgm) {
          bossBgm.play().catch(() => {});
      } else {
          gameBgm.play().catch(() => {});
      }

    } else if (screen === 'levelup') {
      menuBgm.pause();
      levelUpSfx.currentTime = 0;
      levelUpSfx.play().catch(() => {});
    } else if (screen === 'gameover') {
      gameBgm.pause();
      if (bossBgm) bossBgm.pause(); 
      if (postBossBgm) postBossBgm.pause(); 
      
      window.arcaneAudio.isBossActive = false; 
      window.arcaneAudio.isPostBossActive = false; 
      menuBgm.pause();
      
      gameOverSfx.currentTime = 0;
      gameOverSfx.play().catch(() => {});

      gameOverSfx.onended = () => {
        if (!window.arcaneAudio.isMuted && screen === 'gameover') {
          menuBgm.currentTime = 0; 
          menuBgm.play().catch(() => {});
        }
      };

    } else if (screen === 'intro') {
      menuBgm.pause();
      gameBgm.pause();
      if (bossBgm) bossBgm.pause();
      if (postBossBgm) postBossBgm.pause();
    } else {
      gameBgm.pause();
      gameOverSfx.pause();
      if (bossBgm) bossBgm.pause();
      if (postBossBgm) postBossBgm.pause();
      gameOverSfx.onended = null; 
      menuBgm.play().catch(() => {});
    }

    return () => {
      gameOverSfx.onended = null;
    };
  }, [screen]);

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
    if (window.arcaneAudio && !window.arcaneAudio.isMuted) {
      window.arcaneAudio.selectUpgradeSfx.currentTime = 0;
      window.arcaneAudio.selectUpgradeSfx.play().catch(() => {});
    }

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
   <div 
      data-screen={screen}
      style={{ 
        position: 'relative', 
        width: '100vw', 
        height: '100dvh', 
        overflow: 'hidden', 
        cursor: 'none' // 🌟 BINAGO: Ginawang permanenteng 'none' para laging tago ang default mouse
      }}
      onClick={() => {
        if (window.arcaneAudio && !window.arcaneAudio.isMuted) {
          if (screen === 'playing') {
            if (window.arcaneAudio.isBossActive) window.arcaneAudio.bossBgm.play().catch(()=>{});
            else window.arcaneAudio.gameBgm.play().catch(()=>{});
          }
          else if (screen === 'levelup' || screen === 'intro') return;
          else window.arcaneAudio.menuBgm.play().catch(()=>{});
        }
      }}
    >
      {/* 🌟 BINAGO: Inilagay sa pinakataas para render agad kahit anong screen ang active! */}
      <CustomCursor />
      {screen === 'intro' ? (
        <IntroScreen onFinish={handleIntroFinish} />
      ) : (
        <>

          {/* GLOBAL TRANSPARENT MUTE BUTTON */}
          <button 
            onClick={toggleGlobalMute}
            style={{
              position: 'fixed',
              top: '16px',
              left: '24px',
              zIndex: 999999,
              background: 'transparent',
              border: 'none',
              fontSize: '1.4rem',
              cursor: 'pointer',
              opacity: 0.35,
              transition: 'opacity 0.2s ease, transform 0.1s ease',
              pointerEvents: 'auto',
              userSelect: 'none',
              WebkitTapHighlightColor: 'transparent'
            }}
            onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
            onMouseOut={(e) => e.currentTarget.style.opacity = '0.35'}
            onPointerDown={(e) => e.stopPropagation()}
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

          <MetaShop screen={screen} setScreen={setScreen} />
          <PartyChat enabled={coop.isEnabled} channel={netRef.current.channel} localName={wizardName} />
          <Toast message={toast.message} isError={toast.isError} onClose={() => setToast({ message: '', isError: false })} />
        </>
      )}
    </div>
  );
}