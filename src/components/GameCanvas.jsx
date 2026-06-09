import React, { useEffect, useRef, useState } from 'react';

const W = 900;
const H = 560;

const ET = [
  { r: 13, speed: 65,  hp: 30,  dmg: 8,  xp: 15,  color: '#e2e8f0', glow: '#94a3b8', boss: false },
  { r: 11, speed: 105, hp: 20,  dmg: 12, xp: 20,  color: '#fb923c', glow: '#f97316', boss: false },
  { r: 14, speed: 135, hp: 55,  dmg: 20, xp: 35,  color: '#818cf8', glow: '#6366f1', boss: false },
  { r: 27, speed: 50,  hp: 260, dmg: 30, xp: 100, color: '#fbbf24', glow: '#f59e0b', boss: true },
];

const focusStyles = `
  #wrap {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    background: #030111;
    overflow: hidden;
  }
  .game-container {
    position: relative;
    box-shadow: 0 0 30px rgba(139, 92, 246, 0.2);
    border-radius: 4px;
    overflow: hidden;
  }
  .hud-start-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(3, 1, 17, 0.88);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    font-family: monospace;
  }
  .hud-start-modal {
    background: #0b0826;
    border: 2px solid #8b5cf6;
    padding: 2rem;
    border-radius: 8px;
    text-align: center;
    color: #fff;
    max-width: 420px;
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.5);
  }
  .hud-start-modal h2 {
    margin: 0 0 0.75rem 0;
    font-size: 1.5rem;
    letter-spacing: 1px;
  }
  .hud-start-modal p {
    font-size: 0.9rem;
    color: #d1d5db;
    line-height: 1.4;
    margin: 0;
  }
  .game-hud-top {
    position: absolute;
    top: 12px;
    left: 12px;
    right: 12px;
    display: flex;
    justify-content: space-between;
    font-family: monospace;
    font-size: 1.1rem;
    color: #fff;
    text-shadow: 0 0 6px rgba(255,255,255,0.6);
    pointer-events: none;
    z-index: 10;
  }
  .game-hud-bottom {
    position: absolute;
    bottom: 12px;
    left: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-family: monospace;
    pointer-events: none;
    z-index: 10;
  }
  .hud-bar-container {
    width: 260px;
    background: rgba(15, 11, 42, 0.75);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 3px;
    position: relative;
    height: 18px;
    overflow: hidden;
  }
  .hud-bar-fill {
    height: 100%;
    width: 100%;
    transition: width 0.1s linear;
  }
  .hud-bar-text {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    text-align: center;
    font-size: 0.75rem;
    line-height: 18px;
    color: #fff;
    font-weight: bold;
    text-shadow: 0 1px 2px rgba(0,0,0,0.8);
  }

  .stats-toggle-btn {
    background: #110c36;
    border: 1px solid #8b5cf6;
    color: #e2e8f0;
    font-family: monospace;
    font-size: 0.7rem;
    font-weight: bold;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    align-self: flex-start;
    pointer-events: auto;
    box-shadow: 0 0 10px rgba(139, 92, 246, 0.3);
    transition: all 0.15s ease;
  }
  .stats-toggle-btn:hover {
    background: #24145e;
    border-color: #c084fc;
    color: #fff;
  }
  .rpg-stats-panel {
    width: 260px;
    background: rgba(11, 8, 38, 0.94);
    border: 2px solid #8b5cf6;
    border-radius: 6px;
    padding: 10px;
    color: #fff;
    font-family: monospace;
    display: flex;
    flex-direction: column;
    gap: 4px;
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.4);
    backdrop-filter: blur(4px);
    pointer-events: auto;
  }
  .stats-header {
    font-size: 0.78rem;
    font-weight: bold;
    color: #fef08a;
    border-bottom: 1px solid rgba(139, 92, 246, 0.4);
    padding-bottom: 4px;
    margin-bottom: 2px;
    letter-spacing: 0.5px;
  }
  .stats-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
  }
  .stats-label { color: #94a3b8; }
  .stats-value { color: #34d399; font-weight: bold; }

  .rpg-buff-container {
    position: absolute;
    top: 48px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 6px;
    z-index: 80;
    font-family: monospace;
    pointer-events: none;
  }
  .rpg-buff-badge {
    background: linear-gradient(180deg, #130b3a 0%, #060314 100%);
    border: 1px solid #c084fc;
    box-shadow: 0 0 10px rgba(192, 132, 252, 0.4);
    border-radius: 4px;
    padding: 3px 6px;
    color: #ffffff;
    font-size: 0.72rem;
    display: flex;
    align-items: center;
    gap: 5px;
    font-weight: bold;
    text-shadow: 0 1px 2px rgba(0,0,0,0.8);
  }
  .rpg-buff-badge.pot-power { border-color: #f97316; box-shadow: 0 0 10px rgba(249, 115, 22, 0.4); }
  .rpg-buff-badge.pot-defense { border-color: #3b82f6; box-shadow: 0 0 10px rgba(59, 130, 246, 0.4); }
  .rpg-buff-badge.pot-crit { border-color: #eab308; box-shadow: 0 0 10px rgba(234, 179, 8, 0.4); }
  .rpg-buff-badge.pot-regen { border-color: #22c55e; box-shadow: 0 0 10px rgba(34, 197, 94, 0.4); }
  .rpg-buff-badge.pot-xpBoost { border-color: #a855f7; box-shadow: 0 0 10px rgba(168, 85, 247, 0.4); }
  .rpg-buff-badge.skill-instinct { border-color: #e879f9; box-shadow: 0 0 12px rgba(232, 121, 249, 0.6); background: #3b0764; }

  .skill-tree-toggle-btn {
    position: absolute;
    bottom: 12px;
    right: 12px;
    background: #7c3aed;
    border: 1px solid #a78bfa;
    border-radius: 4px;
    padding: 6px 12px;
    color: #fff;
    font-family: monospace;
    font-size: 0.75rem;
    font-weight: bold;
    cursor: pointer;
    z-index: 60;
    box-shadow: 0 0 10px rgba(124, 58, 237, 0.6);
    transition: all 0.2s;
  }
  .skill-tree-toggle-btn:hover {
    background: #6d28d9;
    transform: translateY(-2px);
  }

  .skill-tree-container {
    position: absolute;
    bottom: 46px;
    right: 12px;
    background: rgba(11, 8, 38, 0.95);
    border: 2px solid #7c3aed;
    border-radius: 8px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    z-index: 50;
    font-family: monospace;
    color: #fff;
    width: 250px;
    max-height: 480px;
    overflow-y: auto;
    box-shadow: 0 0 20px rgba(124, 58, 237, 0.5);
    backdrop-filter: blur(4px);
  }
  .skill-tree-title-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(124, 58, 237, 0.4);
    padding-bottom: 6px;
    margin-bottom: 4px;
  }
  .skill-tree-title {
    font-size: 0.75rem;
    font-weight: bold;
    color: #fef08a;
    letter-spacing: 0.5px;
  }
  .skill-tree-close-x {
    background: transparent;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: bold;
  }
  .skill-tree-close-x:hover {
    color: #f87171;
  }
  .skill-row-btn {
    background: linear-gradient(135deg, #1e1145 0%, #0f0726 100%);
    border: 1px solid #5b21b6;
    border-radius: 4px;
    padding: 6px 8px;
    color: #e2e8f0;
    font-size: 0.72rem;
    text-align: left;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition: all 0.2s;
    position: relative;
  }
  .skill-row-btn:hover:not(:disabled) {
    border-color: #a78bfa;
    background: #2e146a;
    color: #fff;
  }
  .skill-row-btn:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
  .skill-row-btn.learned {
    border-color: #10b981;
    background: linear-gradient(135deg, #064e3b 0%, #022c22 100%);
    color: #34d399;
  }
  .skill-row-btn.disabled-toggle {
    border-color: #f87171;
    background: linear-gradient(135deg, #4c0519 0%, #1c0007 100%);
    color: #f43f5e;
  }
  .skill-cd-text {
    font-size: 0.65rem;
    color: #fbbf24;
    font-weight: bold;
  }
  .skill-node-desc {
    font-size: 0.65rem;
    color: #94a3b8;
    line-height: 1.3;
    background: rgba(3, 1, 17, 0.5);
    padding: 4px 6px;
    border-radius: 3px;
    margin-top: -2px;
    margin-bottom: 4px;
    border-left: 2px solid #7c3aed;
  }

  .mmo-hotbar-container {
    position: absolute;
    bottom: 14px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(11, 8, 38, 0.9);
    border: 2px solid #8b5cf6;
    padding: 6px 14px;
    border-radius: 8px;
    box-shadow: 0 0 25px rgba(139, 92, 246, 0.4);
    z-index: 55;
    font-family: monospace;
    backdrop-filter: blur(4px);
  }
  .mmo-hotbar-slot {
    position: relative;
    width: 58px;
    height: 58px;
    background: #110c36;
    border: 2px solid #5b21b6;
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    user-select: none;
    transition: all 0.15s ease;
  }
  .mmo-hotbar-slot:hover:not(.not-learned) {
    border-color: #c084fc;
    background: #24145e;
    transform: translateY(-2px);
  }
  .mmo-hotbar-slot.disabled-toggle {
    border-color: #f43f5e;
    background: #310413;
  }
  .mmo-hotbar-slot.learned {
    border-color: #10b981;
  }
  .mmo-hotbar-slot.not-learned {
    border-color: #374151;
    background: #1f2937;
    opacity: 0.4;
    cursor: not-allowed;
  }
  
  .mmo-hotbar-ult-slot {
    position: relative;
    width: 72px;
    height: 72px;
    background: radial-gradient(circle, #2e1065 0%, #09051c 100%);
    border: 3px solid #d946ef;
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    user-select: none;
    transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    box-shadow: 0 0 20px rgba(217, 70, 239, 0.6), inset 0 0 10px rgba(217, 70, 239, 0.4);
    margin-left: 6px;
  }
  .mmo-hotbar-ult-slot:hover:not(.not-learned) {
    border-color: #f472b6;
    box-shadow: 0 0 32px rgba(244, 114, 182, 0.9), inset 0 0 14px rgba(244, 114, 182, 0.6);
    transform: scale(1.08) translateY(-4px);
  }
  .mmo-hotbar-ult-slot.not-learned {
    border-color: #4b5563;
    background: #111827;
    box-shadow: none;
    opacity: 0.35;
    cursor: not-allowed;
  }
  
  .hotbar-icon {
    font-size: 1.3rem;
    margin-bottom: -1px;
  }
  .mmo-hotbar-ult-slot .hotbar-icon {
    font-size: 1.7rem;
    text-shadow: 0 0 10px rgba(217, 70, 239, 0.8);
  }
  .hotbar-name {
    font-size: 0.52rem;
    color: #cbd5e1;
    text-align: center;
    max-width: 54px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .mmo-hotbar-ult-slot .hotbar-name {
    font-size: 0.48rem;
    color: #f472b6;
    font-weight: bold;
    max-width: 64px;
  }
  .hotbar-key-bind {
    position: absolute;
    top: 2px;
    left: 4px;
    font-size: 0.55rem;
    color: #fbbf24;
    font-weight: bold;
  }
  .mmo-hotbar-ult-slot .hotbar-key-bind {
    top: 4px;
    left: 14px;
    font-size: 0.65rem;
    color: #a78bfa;
  }
  .hotbar-status-dot {
    position: absolute;
    bottom: 2px;
    right: 4px;
    font-size: 0.52rem;
    font-weight: bold;
  }
  .hotbar-status-dot.on { color: #34d399; }
  .hotbar-status-dot.off { color: #f43f5e; }
  
  .hotbar-cooldown-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.76);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fef08a;
    font-size: 1.1rem;
    font-weight: bold;
    pointer-events: none;
  }
  .mmo-hotbar-ult-slot .hotbar-cooldown-overlay {
    border-radius: 50%;
    font-size: 1.3rem;
    color: #fef08a;
    text-shadow: 0 0 8px rgba(234, 179, 8, 0.9);
  }
`;

export default function GameCanvas({ screen, setScreen, hudRef, netRef, onLevelUpOffer, playerName, isCoop }) {
  const canvasRef = useRef(null);
  const workerRef = useRef(null);
  
  const scoreValueRef = useRef(null);
  const waveValueRef = useRef(null);
  const hpFillRef = useRef(null);
  const hpTextRef = useRef(null);
  const xpFillRef = useRef(null);
  const xpTextRef = useRef(null);
  const audioCtxRef = useRef(null);

  const statAtkRef = useRef(null);
  const statDefRef = useRef(null);
  const statCritRef = useRef(null);
  const statSpdRef = useRef(null);
  const statCdRef = useRef(null); 

  const [hasStarted, setHasStarted] = useState(false);
  const [isWindowBlurred, setIsWindowBlurred] = useState(false);

  const [p1VotedRestart, setP1VotedRestart] = useState(false);
  const [p2VotedRestart, setP2VotedRestart] = useState(false);

  const [isTreeOpen, setIsTreeOpen] = useState(true);
  const [isStatsOpen, setIsStatsOpen] = useState(false); 
  const [playerLevel, setPlayerLevel] = useState(1);
  const [activeBuffsList, setActiveBuffsList] = useState([]);
  const [guestExitedAlert, setGuestExitedAlert] = useState(false);

  // NEW MULTIPLAYER STATES
  const [hostExitedCountdown, setHostExitedCountdown] = useState(null);
  const exitTimerRef = useRef(null);
  
  const initSkills = () => ({
    berserk: { learned: false, enabled: true, cd: 0, duration: 0 },
    haste: { learned: false, enabled: true, cd: 0, duration: 0 },
    fortify: { learned: false, enabled: true },
    shield: { learned: false, enabled: true, cd: 0, duration: 0 },
    bodyCutter: { learned: false, enabled: true },
    shootingStar: { learned: false, enabled: true, cd: 0 },
    cubeBash: { learned: false, enabled: true, cd: 0 },
    vacuumSlash: { learned: false, enabled: true, cd: 0 },
    arcaneCollapse: { learned: false, enabled: true, cd: 0 },
    arcaneInstinct: { learned: false, enabled: true, cd: 0, duration: 0, autoTimer: 0 }
  });

  const [skillsState, setSkillsState] = useState(initSkills());

  const engineRef = useRef({
    score: 0, wave: 1, waveT: 0, waveLen: 30, spawnT: 0, spawnRate: 2, boltDmg: 22,
    gameStarted: false, screenShake: 0,
    p: null, p2: null, bullets: [], enemies: [], particles: [], gems: [], ambs: [],
    slashes: [], cubeBashes: [], stars: [], collapses: [], potions: [],
    keys: {}, floorPat: null, p2Input: { x: 0, y: 0 },
    p1Target: { x: 300, y: 280, hp: 100, maxHp: 100, inv: 0, dead: false },
    p2Target: { x: 600, y: 280, hp: 100, maxHp: 100, inv: 0, dead: false },
    p1Render: { x: 300, y: 280 },
    p2Render: { x: 600, y: 280 },
    p2History: []
  });

    useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const sx = (window.innerWidth - 12) / W;
      const sy = (window.innerHeight - 12) / H;
      const s = Math.min(sx, sy, 1.8);
      canvas.style.width = Math.round(W * s) + 'px';
      canvas.style.height = Math.round(H * s) + 'px';
    };

    // FIXED: Makinig sa trigger mula sa App.jsx kapag nag-exit si Player 2
    const handleGlobalGuestExit = () => {
      console.log("🎯 GameCanvas caught the global guest exit event signal!");
      const eng = engineRef.current;
      if (eng) eng.p2 = null; // Burahin agad ang avatar/model ni Player 2 sa canvas loop
      
      setGuestExitedAlert(true); // Puwersahing lumabas ang pulang alert banner sa Host HUD
      
      // Pagkalipas ng 4 na segundo, kusa itong mawawala
      setTimeout(() => {
        setGuestExitedAlert(false);
      }, 4000);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('network_guest_exited_trigger', handleGlobalGuestExit);
    
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('network_guest_exited_trigger', handleGlobalGuestExit);
    };
  }, []);

  const activateAudioKeepAlive = () => {
    if (audioCtxRef.current) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0, ctx.currentTime); 
      
      const osc = ctx.createOscillator();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start();
      
      audioCtxRef.current = ctx;
    } catch (e) {
      console.warn("Audio Keep-Alive pipeline initialization bypassed:", e);
    }
  };

  useEffect(() => {
    const handleBlur = () => {
      setIsWindowBlurred(true);
      const net = netRef.current;
      if (net && net.channel && net.isHost) {
        net.channel.send('host_focus_changed', { isTabbedOut: true });
      }
    };

    const handleFocus = () => {
      setIsWindowBlurred(false);
      const net = netRef.current;
      if (net && net.channel && net.isHost) {
        net.channel.send('host_focus_changed', { isTabbedOut: false });
      }
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [netRef]);

  useEffect(() => {
    window.p1VotedRestart = p1VotedRestart;
    window.p2VotedRestart = p2VotedRestart;
    window.coopVotes = { p1: p1VotedRestart, p2: p2VotedRestart };

    if (hudRef && hudRef.current) {
      hudRef.current.p1VotedRestart = p1VotedRestart;
      hudRef.current.p2VotedRestart = p2VotedRestart;
      hudRef.current.coopVotes = { p1: p1VotedRestart, p2: p2VotedRestart };
    }

    window.dispatchEvent(new CustomEvent('coop_votes_changed', {
      detail: { p1: p1VotedRestart, p2: p2VotedRestart }
    }));
  }, [p1VotedRestart, p2VotedRestart, hudRef]);

  // NETWORK MESSAGES HANDLING
  useEffect(() => {
    const net = netRef.current;
    if (!net) return;

    net.onCanvasMsg = (event, payload) => {
      const eng = engineRef.current;
      if (!eng) return;

      // FIXED: Sync Host Pause to Guest POV
      if (event === 'host_paused' && !net.isHost) {
        setScreen('pause');
        return;
      }

      if (event === 'host_resumed' && !net.isHost) {
        setScreen('playing');
        return;
      }

      // FIXED: Host exited room handler (5 seconds auto-boot counter)
      if (event === 'host_exited' && !net.isHost) {
        let count = 5;
        setHostExitedCountdown(count);
        if (exitTimerRef.current) clearInterval(exitTimerRef.current);
        exitTimerRef.current = setInterval(() => {
          count -= 1;
          if (count <= 0) {
            clearInterval(exitTimerRef.current);
            setHostExitedCountdown(null);
            setScreen('menu');
          } else {
            setHostExitedCountdown(count);
          }
        }, 1000);
        return;
      }

      // FIXED: Guest exited room handler (Remove assets, host can continue solo)
      if (event === 'guest_exited' && net.isHost) {
        eng.p2 = null;
        return;
      }

      if (event === 'state_sync' && !net.isHost) {
        if (payload.gameStarted !== undefined) {
          eng.gameStarted = payload.gameStarted;
          setHasStarted(payload.gameStarted);
        }

        if (!eng.p) {
          eng.p = { x: W / 3, y: H / 2, r: 16, speed: 200, hp: 100, maxHp: 100, xp: 0, xpNext: 80, level: 1, shootCd: 0, shootRate: 0.6, multiShot: 1, inv: 0, dead: false, dmg: 0, chatBubble: null };
        }
        
        // Kung hindi pa umalis si Guest, i-sync ang assets niya
        if (payload.p2 && eng.p2 !== null) {
          if (!eng.p2) {
            eng.p2 = { x: W * 2 / 3, y: H / 2, r: 16, speed: 200, hp: 100, maxHp: 100, xp: 0, xpNext: 80, level: 1, shootCd: 0, shootRate: 0.6, multiShot: 1, inv: 0, dead: false, dmg: 0, chatBubble: null };
          }
          eng.p2.hp = payload.p2.hp;
          eng.p2.maxHp = payload.p2.maxHp;
          eng.p2.dead = payload.p2.dead;
          eng.p2.inv = payload.p2.inv ?? eng.p2.inv;
          eng.p2.dmg = payload.p2.dmg ?? eng.p2.dmg;
          eng.p2.shootRate = payload.p2.shootRate ?? eng.p2.shootRate;
          eng.p2.chatBubble = payload.p2.chatBubble; 
          eng.p2.level = payload.p2_level || eng.p2.level;
          eng.p2.xp = payload.p2_xp || eng.p2.xp;
          eng.p2.xpNext = payload.p2_xpNext || eng.p2.xpNext;
          if (payload.p2_skills) eng.p2.skills = payload.p2_skills;
          if (payload.p2_potBuffs) eng.p2.potBuffs = payload.p2_potBuffs;
          
          const hts = payload.ts || Date.now();
          eng.p2History.push({ t: hts, x: payload.p2.x, y: payload.p2.y });
          const now = Date.now();
          while (eng.p2History.length > 20) eng.p2History.shift();
          eng.p2History = eng.p2History.filter(s => (now - s.t) < 2000);
        }

        eng.enemies = (payload.enemies || []).map(e => ({
          x: e.x, y: e.y, r: e.r, speed: e.speed, hp: e.hp, maxHp: e.maxHp,
          dmg: e.dmg, xp: e.xp, color: e.color, glow: e.glow, boss: e.boss, flash: e.flash || 0,
          stunnedTime: e.stunnedTime || 0, stigmaTime: e.stigmaTime || 0,
          temporalSlowTime: e.temporalSlowTime || 0, arcaneBurnTime: e.arcaneBurnTime || 0,
          voidExhaustTime: e.voidExhaustTime || 0, instabTime: e.instabTime || 0
        }));

        eng.gems = (payload.gems || []).map(g => ({ x: g.x, y: g.y, r: g.r, xp: g.xp, life: g.life }));
        eng.bullets = (payload.bullets || []).map(b => ({ x: b.x, y: b.y, vx: b.vx, vy: b.vy, r: b.r, life: b.life, p2: b.p2 }));
        eng.potions = (payload.potions || []).map(p => ({ x: p.x, y: p.y, r: p.r, type: p.type, life: p.life }));
        eng.collapses = (payload.collapses || []).map(c => ({ x: c.x, y: c.y, radius: c.radius, maxRadius: c.maxRadius, life: c.life }));

        eng.score = payload.score ?? eng.score;
        eng.wave = payload.wave ?? eng.wave;
        eng.waveT = payload.waveT ?? eng.waveT;
        eng.waveLen = payload.waveLen ?? eng.waveLen;
        eng.boltDmg = payload.boltDmg ?? eng.boltDmg;

        if (payload.p1) eng.p1Target = payload.p1;
        if (payload.p2) eng.p2Target = payload.p2;

        if (payload.p1 && eng.p) {
          eng.p.hp = payload.p1.hp;
          eng.p.maxHp = payload.p1.maxHp;
          eng.p.dead = payload.p1.dead;
          eng.p.dmg = payload.p1.dmg ?? eng.p.dmg;
          eng.p.shootRate = payload.p1.shootRate ?? eng.p.shootRate;
          eng.p.x = payload.p1.x;
          eng.p.y = payload.p1.y;
          eng.p.chatBubble = payload.p1.chatBubble;

          if (payload.p1_skills) eng.p.skills = payload.p1_skills;
          if (payload.p1_potBuffs) eng.p.potBuffs = payload.p1_potBuffs;
        }

        if (eng.p2) {
          setPlayerLevel(eng.p2.level);
          if (eng.p2.skills) setSkillsState({ ...eng.p2.skills });
        }
      }
      
      if (event === 'guest_input' && net.isHost) {
        eng.p2Input = payload || { x: 0, y: 0 };
      }

      if (event === 'guest_levelup_choice' && net.isHost) {
        if (window.runUpgrade) window.runUpgrade(payload.choice, 'p2');
      }

      if (event === 'guest_learned_skill' && net.isHost) {
        if (window.learnSkillTreeTech) window.learnSkillTreeTech(payload.skillId, 'p2');
      }

      if (event === 'guest_cast_ultimate' && net.isHost) {
        if (window.castArcaneCollapseUltimate) window.castArcaneCollapseUltimate('p2');
      }

      if (event === 'guest_cast_instinct' && net.isHost) {
        if (window.castArcaneInstinctUltimate) window.castArcaneInstinctUltimate('p2');
      }
      
      if (event === 'offer_levelup' && !net.isHost) {
        onLevelUpOffer(payload.ups);
        setScreen('levelup');
      }
      
      if (event === 'game_over') {
        setScreen('gameover');
      }

      if (event === 'player_voted_restart') {
        if (net.isHost) setP2VotedRestart(payload.voted);
        else setP1VotedRestart(payload.voted);
      }

      if (event === 'restart_game') {
        setScreen('playing'); 
        setP1VotedRestart(false); 
        setP2VotedRestart(false);
      }
    };

    return () => {
      net.onCanvasMsg = null;
    };
  }, [onLevelUpOffer, setScreen, netRef]);

  useEffect(() => {
    const net = netRef.current;
    if (net && net.channel && net.isHost) {
      if (p1VotedRestart && p2VotedRestart) {
        net.channel.send('restart_game', {}); 
        setScreen('playing');
      }
    }
  }, [p1VotedRestart, p2VotedRestart, setScreen, netRef]);

  // FIXED: Trigger reset only on initial loading or authentic full restart state (Hindi tuwing babalik galing pause menu)
  useEffect(() => {
    const eng = engineRef.current;

    if (screen === 'playing') {
      // Kung kasalukuyang tumatakbo ang makina, huwag burahin ang state vectors nito
      if (eng.gameStarted && eng.p && !eng.p.dead) {
        return;
      }
    }

    if (screen === 'menu' || screen === 'lobby' || screen === 'playing') {
      setP1VotedRestart(false);
      setP2VotedRestart(false);
      setPlayerLevel(1);
      setIsTreeOpen(true); 
      setSkillsState(initSkills());
      setActiveBuffsList([]);
      if (exitTimerRef.current) clearInterval(exitTimerRef.current);
      setHostExitedCountdown(null);

      const isCoopActive = Boolean(netRef.current && netRef.current.channel);
      
      eng.score = 0; eng.wave = 1; eng.waveT = 0; eng.waveLen = 30; eng.spawnT = 0; eng.spawnRate = 2; eng.boltDmg = 22; eng.screenShake = 0;
      eng.bullets = []; eng.enemies = []; eng.particles = []; eng.gems = [];
      eng.slashes = []; eng.cubeBashes = []; eng.stars = []; eng.collapses = []; eng.potions = [];
      eng.gameStarted = false; 
      setHasStarted(false);     
      
      eng.p = { x: isCoopActive ? W / 3 : W / 2, y: H / 2, r: 16, speed: 200, hp: 100, maxHp: 100, xp: 0, xpNext: 80, level: 1, shootCd: 0, shootRate: 0.6, multiShot: 1, inv: 0, dead: false, dmg: 0, chatBubble: null, skills: initSkills(), potBuffs: { power: 0, defense: 0, crit: 0, regen: 0, xpBoost: 0 } };
      eng.p1Target = { x: eng.p.x, y: eng.p.y, hp: 100, maxHp: 100, inv: 0, dead: false };
      eng.p1Render = { x: eng.p.x, y: eng.p.y };

      if (isCoopActive) {
        eng.p2 = { x: W * 2 / 3, y: H / 2, r: 16, speed: 200, hp: 100, maxHp: 100, xp: 0, xpNext: 80, level: 1, shootCd: 0, shootRate: 0.6, multiShot: 1, inv: 0, dead: false, dmg: 0, chatBubble: null, skills: initSkills(), potBuffs: { power: 0, defense: 0, crit: 0, regen: 0, xpBoost: 0 } };
        eng.p2Target = { x: eng.p2.x, y: H / 2, hp: 100, maxHp: 100, inv: 0, dead: false };
        eng.p2Render = { x: eng.p2.x, y: H / 2 };

        if (screen === 'playing' && netRef.current.isHost) {
          netRef.current.channel.send('restart_game', {});
        }
      } else {
        eng.p2 = null;
      }
    }
  }, [screen, netRef]);

  // Expose global execution methods to App level overlay handlers
  useEffect(() => {
    window.triggerRestartVote = () => {
      const net = netRef.current;
      const isCoopActive = Boolean(net && net.channel);

      if (!isCoopActive) {
        setScreen('playing');
        return;
      }

      if (net.isHost) {
        const nextVoteState = !p1VotedRestart;
        setP1VotedRestart(nextVoteState);
        net.channel.send('player_voted_restart', { voted: nextVoteState });
      } else {
        const nextVoteState = !p2VotedRestart;
        setP2VotedRestart(nextVoteState);
        net.channel.send('player_voted_restart', { voted: nextVoteState });
      }
    };

    // FIXED: Global registration endpoints para sa pause broadcast engine
    window.executeNetworkPauseAction = () => {
      const net = netRef.current;
      if (net && net.channel && net.isHost) {
        setScreen('pause');
        net.channel.send('host_paused', {});
      }
    };

    // FIXED: Mas pinatibay na Resume Action registration sa GameCanvas.jsx
    window.executeNetworkResumeAction = () => {
      const net = netRef.current;
      const isCoopActive = Boolean(net && net.channel);

      // 1. I-set agad ang local screen sa 'playing' para magpatuloy ang render loop
      setScreen('playing');

      // 2. Kung multiplayer at ikaw ang Host, sabihan si Player 2 na mag-resume na rin
      if (isCoopActive && net.isHost) {
        net.channel.send('host_resumed', {});
      }
    };

// FIXED: Mas pinatibay na Exit Action na may delay para makarating ang packet sa kabilang panig
    window.executeNetworkExitAction = () => {
      const net = netRef?.current;
      const isCoopActive = Boolean(net && net.channel);

      console.log(" 🚪 Triggering Match Exit. Co-op Active:", isCoopActive);

      if (isCoopActive) {
        try {
          if (net.isHost) {
            net.channel.send('host_exited', {});
          } else {
            net.channel.send('guest_exited', {});
          }
        } catch (err) {
          console.error("Network broadcast fail during exit:", err);
        }
      }

      // FIXED: Bigyan ng 100ms delay bago tuluyang isara ang render loop at lumipat ng screen
      // para may sapat na oras ang network na ma-iresibat ang data packet kay Host
      setTimeout(() => {
        if (workerRef.current) {
          workerRef.current.postMessage('stop');
        }
        setScreen('menu');
      }, 100);
    };

  }, [p1VotedRestart, p2VotedRestart, setScreen, netRef]);

  useEffect(() => {
    window.learnSkillTreeTech = (skillId, forcedTarget = null) => {
      const eng = engineRef.current;
      if (!eng) return;
      
      const isCoopActive = Boolean(netRef.current && netRef.current.channel);
      let target = (isCoopActive && !netRef.current.isHost) ? eng.p2 : eng.p;
      if (forcedTarget === 'p2') target = eng.p2;
      if (forcedTarget === 'p1') target = eng.p;

      if (!target || target.dead) return;

      const baseSkills = ['berserk', 'haste', 'fortify', 'shield'];
      const attackSkills = ['bodyCutter', 'shootingStar', 'cubeBash', 'vacuumSlash'];
      
      if (baseSkills.includes(skillId) && target.level < 5) return; 
      if (attackSkills.includes(skillId) && target.level < 10) return;
      if (['arcaneCollapse', 'arcaneInstinct'].includes(skillId) && target.level < 12) return; 

      if (!target.skills) target.skills = initSkills();

      if (!target.skills[skillId]) {
        target.skills[skillId] = { learned: false, enabled: true };
      }

      if (!target.skills[skillId].learned) {
        target.skills[skillId].learned = true;
        target.skills[skillId].enabled = true;
        if (skillId === 'berserk' || skillId === 'haste' || skillId === 'shield') {
          target.skills[skillId].cd = 0;
          target.skills[skillId].duration = 0;
        }
        if (['shootingStar', 'cubeBash', 'vacuumSlash'].includes(skillId)) {
          target.skills[skillId].cd = 0;
        }
        if (['arcaneCollapse', 'arcaneInstinct'].includes(skillId)) {
          target.skills[skillId].cd = 0;
        }
      } else {
        if (!['arcaneCollapse', 'arcaneInstinct'].includes(skillId)) {
          target.skills[skillId].enabled = !target.skills[skillId].enabled;
        }
      }

      if (isCoopActive && !forcedTarget) {
        if (!netRef.current.isHost) {
          netRef.current.channel.send('guest_learned_skill', { skillId });
        }
      }

      if (target === ((isCoopActive && !netRef.current.isHost) ? eng.p2 : eng.p)) {
        setSkillsState({ ...target.skills });
      }
    };

    window.castArcaneCollapseUltimate = (forcedTarget = null) => {
      const eng = engineRef.current;
      if (!eng) return;

      const isCoopActive = Boolean(netRef.current && netRef.current.channel);
      let target = (isCoopActive && !netRef.current.isHost) ? eng.p2 : eng.p;
      if (forcedTarget === 'p2') target = eng.p2;
      if (forcedTarget === 'p1') target = eng.p;

      if (!target || target.dead || target.level < 12) return; 
      if (!target.skills) target.skills = initSkills();
      
      if (!target.skills.arcaneCollapse?.learned) {
        target.skills.arcaneCollapse = { learned: true, enabled: true, cd: 0 };
      }

      if (target.skills.arcaneCollapse.cd > 0) return;

      target.skills.arcaneCollapse.cd = 30.0;
      eng.screenShake = 0.8; 

      target.chatBubble = { text: "ARCANE COLLAPSE!!!", life: 1.8 };

      if (!eng.collapses) eng.collapses = [];
      eng.collapses.push({
        x: target.x, y: target.y,
        radius: 10, maxRadius: 520,
        life: 2.2, pulseTimer: 0, pulseCount: 0
      });

      for (const enemy of eng.enemies) {
        let colPulseDmg = 85;
        if (target.potBuffs?.power > 0) colPulseDmg *= 1.4; 
        if (target.skills?.arcaneInstinct?.duration > 0) colPulseDmg *= 2.5; 
        if (enemy.instabTime > 0) colPulseDmg *= 1.5;

        if (target.potBuffs?.crit > 0 && Math.random() < 0.35) {
          colPulseDmg *= 2;
          enemy.flash = 0.5;
        } else {
          enemy.flash = 0.35;
        }

        enemy.hp -= colPulseDmg;
        
        enemy.stunnedTime = 4.0;       
        enemy.temporalSlowTime = 6.0;  
        enemy.arcaneBurnTime = 6.0;    
        enemy.voidExhaustTime = 6.0;   
        enemy.instabTime = 6.0;        

        if (enemy.hp <= 0) enemy.deadTrigger = true;
      }

      for (let k = 0; k < 35; k++) {
        const pa = Math.random() * Math.PI * 2;
        const ps = Math.random() * 220 + 80;
        eng.particles.push({
          x: target.x, y: target.y,
          vx: Math.cos(pa) * ps, vy: Math.sin(pa) * ps,
          color: Math.random() < 0.5 ? '#d946ef' : '#a855f7',
          life: 0.6, ml: 0.6, r: Math.random() * 3 + 1.5
        });
      }

      if (isCoopActive && !forcedTarget && !netRef.current.isHost) {
        netRef.current.channel.send('guest_cast_ultimate', {});
      }

      if (target === ((isCoopActive && !netRef.current.isHost) ? eng.p2 : eng.p)) {
        setSkillsState({ ...target.skills });
      }
    };

    window.castArcaneInstinctUltimate = (forcedTarget = null) => {
      const eng = engineRef.current;
      if (!eng) return;

      const isCoopActive = Boolean(netRef.current && netRef.current.channel);
      let target = (isCoopActive && !netRef.current.isHost) ? eng.p2 : eng.p;
      if (forcedTarget === 'p2') target = eng.p2;
      if (forcedTarget === 'p1') target = eng.p;

      if (!target || target.dead || target.level < 12) return;
      if (!target.skills) target.skills = initSkills();

      if (!target.skills.arcaneInstinct) {
        target.skills.arcaneInstinct = { learned: true, enabled: true, cd: 0, duration: 0, autoTimer: 0 };
      }

      if (target.skills.arcaneInstinct.cd > 0) return;

      target.skills.arcaneInstinct.cd = 45.0;
      target.skills.arcaneInstinct.duration = 10.0;
      target.skills.arcaneInstinct.autoTimer = 3.0; 
      eng.screenShake = 1.2; 

      target.chatBubble = { text: "ARCANE INSTINCT!!!", life: 1.8 };

      for (const enemy of eng.enemies) {
        enemy.stunnedTime = 2.0;
        enemy.flash = 0.4;
      }

      for (let k = 0; k < 45; k++) {
        const pa = Math.random() * Math.PI * 2;
        const ps = Math.random() * 260 + 60;
        eng.particles.push({
          x: target.x, y: target.y,
          vx: Math.cos(pa) * ps, vy: Math.sin(pa) * ps,
          color: Math.random() < 0.4 ? '#ffffff' : '#e879f9',
          life: 0.7, ml: 0.7, r: Math.random() * 4 + 2
        });
      }

      if (isCoopActive && !forcedTarget && !netRef.current.isHost) {
        netRef.current.channel.send('guest_cast_instinct', {});
      }

      if (target === ((isCoopActive && !netRef.current.isHost) ? eng.p2 : eng.p)) {
        setSkillsState({ ...target.skills });
      }
    };

  }, [netRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = W; canvas.height = H;
    const eng = engineRef.current;

    const oc = document.createElement('canvas');
    oc.width = oc.height = 60;
    const ox = oc.getContext('2d');
    ox.fillStyle = '#0a061e'; ox.fillRect(0,0,60,60);
    ox.strokeStyle = 'rgba(139,92,246,0.07)'; ox.lineWidth = 0.5; ox.strokeRect(0,0,60,60);
    eng.floorPat = ctx.createPattern(oc, 'repeat');

    eng.ambs = Array.from({ length: 55 }, () => ({
      x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.8 + 0.4,
      vx: (Math.random() - 0.5) * 12, vy: -(Math.random() * 18 + 4),
      a: Math.random() * 0.5 + 0.15, t: Math.random(),
      c: ['#c4b5fd', '#818cf8', '#a78bfa', '#7c3aed'][Math.floor(Math.random() * 4)]
    }));

    let lastTime = performance.now();
    let renderAnimId;
    let syncTimer = 0;

    const rollUpgradeOptions = () => {
      const fullPool = ['Vitality', 'Arcane Might', 'Rapid Fire', 'Gain Multi-Shot'];
      return [...fullPool].sort(() => 0.5 - Math.random()).slice(0, 3);
    };

    const workerBlob = new Blob([`
      let timer = null;
      self.onmessage = function(e) {
        if (e.data === 'start') {
          if (timer) clearInterval(timer);
          timer = setInterval(() => { self.postMessage('tick'); }, 1000 / 60);
        } else if (e.data === 'stop') {
          if (timer) clearInterval(timer);
        }
      };
    `], { type: 'application/javascript' });
    
    const workerURL = URL.createObjectURL(workerBlob);
    const worker = new Worker(workerURL);
    workerRef.current = worker;

    worker.onmessage = () => {
      const ts = performance.now();
      const dt = Math.min((ts - lastTime) / 1000, 0.05);
      lastTime = ts;

      const net = netRef.current || {};
      const isCoopActive = Boolean(net.channel);
      const isHost = Boolean(net.isHost) || !isCoopActive;

      // FIXED: Patigilin ang buong physics calculation engine kapag naka-pause ang laro
      if (screen === 'pause') {
        return;
      }

      if (screen === 'playing' || screen === 'levelup') {
        let mx = 0, my = 0;
        if (eng.keys['ArrowLeft'] || eng.keys['a'] || eng.keys['A']) mx -= 1;
        if (eng.keys['ArrowRight'] || eng.keys['d'] || eng.keys['D']) mx += 1;
        if (eng.keys['ArrowUp'] || eng.keys['w'] || eng.keys['W']) my -= 1;
        if (eng.keys['ArrowDown'] || eng.keys['s'] || eng.keys['S']) my += 1;
        const ml = Math.hypot(mx, my);
        if (ml > 1) { mx /= ml; my /= ml; }

        if (!eng.gameStarted) {
          if (isHost && (mx !== 0 || my !== 0)) {
            eng.gameStarted = true;
            setHasStarted(true);
            activateAudioKeepAlive(); 
          } else if (!isHost) {
            mx = 0; 
            my = 0;
          }
        }

        if (eng.screenShake > 0) {
          eng.screenShake -= dt;
        }

        if (eng.gameStarted) {
          eng.waveT += dt;
          eng.spawnT += dt;

          if (!isCoopActive || isHost) {
            if (eng.spawnT >= eng.spawnRate) {
              eng.spawnT = 0;
              eng.spawnRate = Math.max(0.35, 2 - eng.wave * 0.12);
              const pool = eng.wave < 2 ? [0] : eng.wave < 4 ? [0, 1] : [0, 1, 2];
              const ti = pool[Math.floor(Math.random() * pool.length)];
              const t = ET[ti]; const side = Math.floor(Math.random() * 4); let ex, ey;
              if (side === 0) { ex = Math.random() * W; ey = -30; }
              else if (side === 1) { ex = W + 30; ey = Math.random() * H; }
              else if (side === 2) { ex = Math.random() * W; ey = H + 30; }
              else { ex = -30; ey = Math.random() * H; }
              eng.enemies.push({ x: ex, y: ey, r: t.r, speed: t.speed + (eng.wave - 1) * 5, hp: t.hp + (eng.wave - 1) * 10, maxHp: t.hp + (eng.wave - 1) * 10, dmg: t.dmg, xp: t.xp, color: t.color, glow: t.glow, boss: t.boss, flash: 0, stunnedTime: 0, stigmaTime: 0, temporalSlowTime: 0, arcaneBurnTime: 0, voidExhaustTime: 0, instabTime: 0 });
            }
            if (eng.waveT >= eng.waveLen) {
              eng.waveT = 0; eng.wave++;
              eng.waveLen = Math.max(15, 30 - eng.wave * 0.8);
              if (eng.wave % 3 === 0) {
                const t = ET[3];
                eng.enemies.push({ x: W/2, y: -40, r: t.r, speed: t.speed, hp: t.hp + eng.wave*20, maxHp: t.hp + eng.wave*20, dmg: t.dmg, xp: t.xp, color: t.color, glow: t.glow, boss: true, flash: 0, stunnedTime: 0, stigmaTime: 0, temporalSlowTime: 0, arcaneBurnTime: 0, voidExhaustTime: 0, instabTime: 0 });
              }
            }
          }
        }

        const tickPlayerSkillTrackers = (playerObj) => {
          if (!playerObj || playerObj.dead) return;
          if (!playerObj.skills) playerObj.skills = initSkills();
          if (!playerObj.potBuffs) playerObj.potBuffs = { power: 0, defense: 0, crit: 0, regen: 0, xpBoost: 0 };

          if (playerObj.chatBubble && playerObj.chatBubble.life > 0) {
            playerObj.chatBubble.life -= dt;
          }

          if (playerObj.potBuffs.power > 0) playerObj.potBuffs.power -= dt;
          if (playerObj.potBuffs.defense > 0) playerObj.potBuffs.defense -= dt;
          if (playerObj.potBuffs.crit > 0) playerObj.potBuffs.crit -= dt;
          if (playerObj.potBuffs.xpBoost > 0) playerObj.potBuffs.xpBoost -= dt;
          if (playerObj.potBuffs.regen > 0) {
            playerObj.potBuffs.regen -= dt;
            playerObj.hp = Math.min(playerObj.maxHp, playerObj.hp + 3.5 * dt); 
          }

          if (playerObj.skills.arcaneCollapse?.cd > 0) playerObj.skills.arcaneCollapse.cd -= dt;
          if (playerObj.skills.arcaneInstinct?.cd > 0) playerObj.skills.arcaneInstinct.cd -= dt;
          
          if (playerObj.skills.arcaneInstinct?.duration > 0) {
            playerObj.skills.arcaneInstinct.duration -= dt;
            
            if (playerObj.skills.arcaneInstinct.autoTimer > 0) {
              playerObj.skills.arcaneInstinct.autoTimer -= dt;
              
              if (!playerObj.skills.arcaneInstinct.burstTick) playerObj.skills.arcaneInstinct.burstTick = 0;
              playerObj.skills.arcaneInstinct.burstTick += dt;

              if (playerObj.skills.arcaneInstinct.burstTick >= 0.15) {
                playerObj.skills.arcaneInstinct.burstTick = 0;

                let targetEnemy = null; let minDist = Infinity;
                for (const e of eng.enemies) {
                  const d = Math.hypot(e.x - playerObj.x, e.y - playerObj.y);
                  if (d < minDist) { minDist = d; targetEnemy = e; }
                }
                let angle = -Math.PI / 2;
                if (targetEnemy) angle = Math.atan2(targetEnemy.y - playerObj.y, targetEnemy.x - playerObj.x);
                if (!eng.slashes) eng.slashes = [];
                eng.slashes.push({ x: playerObj.x, y: playerObj.y, vx: Math.cos(angle) * 340, vy: Math.sin(angle) * 340, angle: angle, life: 1.2, hits: new Set(), p2: playerObj === eng.p2 });

                let targetX = playerObj.x + (Math.random() - 0.5) * 220;
                let targetY = playerObj.y + (Math.random() - 0.5) * 220;
                if (eng.enemies.length > 0) {
                  const randEnemy = eng.enemies[Math.floor(Math.random() * eng.enemies.length)];
                  targetX = randEnemy.x; targetY = randEnemy.y;
                }
                if (!eng.stars) eng.stars = [];
                eng.stars.push({ x: targetX, y: targetY, currentY: targetY - 300, targetY: targetY, progress: 0, radius: 85, p2: playerObj === eng.p2 });

                if (!eng.cubeBashes) eng.cubeBashes = [];
                eng.cubeBashes.push({ x: playerObj.x, y: playerObj.y, radius: 10, maxRadius: 120, speed: 320 });
              }
            }
          }

          if (playerObj.skills.berserk?.learned) {
            if (playerObj.skills.berserk.cd > 0) playerObj.skills.berserk.cd -= dt;
            if (playerObj.skills.berserk.duration > 0) {
              playerObj.skills.berserk.duration -= dt;
            } else if (playerObj.skills.berserk.cd <= 0 && playerObj.skills.berserk.enabled !== false) {
              playerObj.skills.berserk.duration = 6; 
              playerObj.skills.berserk.cd = 15;      
            }
          }

          if (playerObj.skills.haste?.learned) {
            if (playerObj.skills.haste.cd > 0) playerObj.skills.haste.cd -= dt;
            if (playerObj.skills.haste.duration > 0) {
              playerObj.skills.haste.duration -= dt;
            } else if (playerObj.skills.haste.cd <= 0 && playerObj.skills.haste.enabled !== false) {
              playerObj.skills.haste.duration = 6; 
              playerObj.skills.haste.cd = 15;      
            }
          }

          if (playerObj.skills.shield?.learned) {
            if (playerObj.skills.shield.cd > 0) playerObj.skills.shield.cd -= dt;
            if (playerObj.skills.shield.duration > 0) {
              playerObj.skills.shield.duration -= dt;
            } else if (playerObj.skills.shield.cd <= 0 && playerObj.skills.shield.enabled !== false) {
              playerObj.skills.shield.duration = 5; 
              playerObj.skills.shield.cd = 18;      
            }
          }

          if (playerObj.skills.shootingStar?.learned) {
            if (playerObj.skills.shootingStar.cd === undefined) playerObj.skills.shootingStar.cd = 0;
            if (playerObj.skills.shootingStar.cd > 0) playerObj.skills.shootingStar.cd -= dt;
            
            if (playerObj.skills.shootingStar.cd <= 0 && playerObj.skills.shootingStar.enabled !== false) {
              playerObj.skills.shootingStar.cd = 3.5;
              let targetX = playerObj.x + (Math.random() - 0.5) * 160;
              let targetY = playerObj.y + (Math.random() - 0.5) * 160;
              if (eng.enemies.length > 0) {
                const randEnemy = eng.enemies[Math.floor(Math.random() * eng.enemies.length)];
                targetX = randEnemy.x;
                targetY = randEnemy.y;
              }
              if (!eng.stars) eng.stars = [];
              eng.stars.push({ x: targetX, y: targetY, currentY: targetY - 400, targetY: targetY, progress: 0, radius: 95 });
            }
          }

          if (playerObj.skills.cubeBash?.learned) {
            if (playerObj.skills.cubeBash.cd === undefined) playerObj.skills.cubeBash.cd = 0;
            if (playerObj.skills.cubeBash.cd > 0) playerObj.skills.cubeBash.cd -= dt;
            
            if (playerObj.skills.cubeBash.cd <= 0 && playerObj.skills.cubeBash.enabled !== false) {
              playerObj.skills.cubeBash.cd = 4.5;
              if (!eng.cubeBashes) eng.cubeBashes = [];
              eng.cubeBashes.push({ x: playerObj.x, y: playerObj.y, radius: 10, maxRadius: 135, speed: 260 });
              for (const enemy of eng.enemies) {
                if (Math.hypot(enemy.x - playerObj.x, enemy.y - playerObj.y) <= 135) {
                  enemy.stunnedTime = 1.6;
                }
              }
            }
          }

          if (playerObj.skills.vacuumSlash?.learned) {
            if (playerObj.skills.vacuumSlash.cd === undefined) playerObj.skills.vacuumSlash.cd = 0;
            if (playerObj.skills.vacuumSlash.cd > 0) playerObj.skills.vacuumSlash.cd -= dt;
            
            if (playerObj.skills.vacuumSlash.cd <= 0 && playerObj.skills.vacuumSlash.enabled !== false) {
              playerObj.skills.vacuumSlash.cd = 2.0;
              let targetEnemy = null;
              let minDist = Infinity;
              for (const e of eng.enemies) {
                const d = Math.hypot(e.x - playerObj.x, e.y - playerObj.y);
                if (d < minDist) { minDist = d; targetEnemy = e; }
              }
              let angle = -Math.PI / 2;
              if (targetEnemy) {
                angle = Math.atan2(targetEnemy.y - playerObj.y, targetEnemy.x - playerObj.x);
              }
              if (!eng.slashes) eng.slashes = [];
              eng.slashes.push({ x: playerObj.x, y: playerObj.y, vx: Math.cos(angle) * 340, vy: Math.sin(angle) * 340, angle: angle, life: 1.6, hits: new Set() });
            }
          }
        };

        if (isHost || !isCoopActive) {
          if (eng.p && !eng.p.dead) {
            tickPlayerSkillTrackers(eng.p);

            let calculatedSpeed = 200;
            if (eng.p.skills?.haste?.duration > 0 && eng.p.skills?.haste?.enabled !== false) calculatedSpeed *= 1.45; 
            if (eng.p.skills?.arcaneInstinct?.duration > 0) calculatedSpeed *= 2.50; 

            eng.p.x = Math.max(eng.p.r, Math.min(W - eng.p.r, eng.p.x + mx * calculatedSpeed * dt));
            eng.p.y = Math.max(eng.p.r, Math.min(H - eng.p.r, eng.p.y + my * calculatedSpeed * dt));
            if (eng.p.inv > 0) eng.p.inv -= dt;
          }
          if (isCoopActive && eng.p2 && !eng.p2.dead && eng.gameStarted) {
            tickPlayerSkillTrackers(eng.p2);

            let calculatedSpeedp2 = 200;
            if (eng.p2.skills?.haste?.duration > 0 && eng.p2.skills?.haste?.enabled !== false) calculatedSpeedp2 *= 1.45;
            if (eng.p2.skills?.arcaneInstinct?.duration > 0) calculatedSpeedp2 *= 2.50;

            eng.p2.x = Math.max(eng.p2.r, Math.min(W - eng.p2.r, eng.p2.x + eng.p2Input.x * calculatedSpeedp2 * dt));
            eng.p2.y = Math.max(eng.p2.r, Math.min(H - eng.p2.r, eng.p2.y + eng.p2Input.y * calculatedSpeedp2 * dt));
            if (eng.p2.inv > 0) eng.p2.inv -= dt;
          }
        } else {
          if (eng.p2 && !eng.p2.dead) {
            tickPlayerSkillTrackers(eng.p2);

            let calculatedSpeedp2 = 200;
            if (eng.p2.skills?.haste?.duration > 0 && eng.p2.skills?.haste?.enabled !== false) calculatedSpeedp2 *= 1.45;
            if (eng.p2.skills?.arcaneInstinct?.duration > 0) calculatedSpeedp2 *= 2.50;

            eng.p2.x = Math.max(eng.p2.r, Math.min(W - eng.p2.r, eng.p2.x + mx * calculatedSpeedp2 * dt));
            eng.p2.y = Math.max(eng.p2.r, Math.min(H - eng.p2.r, eng.p2.y + my * calculatedSpeedp2 * dt));
            if (eng.p2.inv > 0) eng.p2.inv -= dt;

            const predFactor = Math.min(1, dt * 18);
            eng.p2Render.x += (eng.p2.x - eng.p2Render.x) * predFactor;
            eng.p2Render.y += (eng.p2.y - eng.p2Render.y) * predFactor;

            if (eng.p2Target) {
              const reconcileFactor = 0.06;
              const dx = eng.p2Target.x - eng.p2Render.x;
              const dy = eng.p2Target.y - eng.p2Render.y;
              const dist = Math.hypot(dx, dy);
              if (dist > 60) {
                eng.p2Render.x = eng.p2Target.x;
                eng.p2Render.y = eng.p2Target.y;
              } else {
                eng.p2Render.x += dx * reconcileFactor;
                eng.p2Render.y += dy * reconcileFactor;
              }
            }
          }
          if (eng.p) tickPlayerSkillTrackers(eng.p);
          const f = Math.min(1, dt * 14);
          eng.p1Render.x += (eng.p1Target.x - eng.p1Render.x) * f;
          eng.p1Render.y += (eng.p1Target.y - eng.p1Render.y) * f;
        }

        const localTrackedObj = (isCoopActive && !isHost) ? eng.p2 : eng.p;
        if (localTrackedObj) {
          setPlayerLevel(localTrackedObj.level);
          if (localTrackedObj.skills) {
            setSkillsState({ ...localTrackedObj.skills });
          }

          const activeBuffs = [];
          if (localTrackedObj.skills?.berserk?.duration > 0 && localTrackedObj.skills?.berserk?.enabled) {
            activeBuffs.push({ type: 'skill', name: 'BERSERK', icon: '🔥', life: localTrackedObj.skills.berserk.duration });
          }
          if (localTrackedObj.skills?.haste?.duration > 0 && localTrackedObj.skills?.haste?.enabled) {
            activeBuffs.push({ type: 'skill', name: 'HASTE', icon: '👟', life: localTrackedObj.skills.haste.duration });
          }
          if (localTrackedObj.skills?.shield?.duration > 0 && localTrackedObj.skills?.shield?.enabled) {
            activeBuffs.push({ type: 'skill', name: 'SHIELD', icon: '🔮', life: localTrackedObj.skills.shield.duration });
          }
          if (localTrackedObj.skills?.arcaneInstinct?.duration > 0) {
            activeBuffs.push({ type: 'skill-instinct', name: 'ARCANE INSTINCT', icon: '⚡', life: localTrackedObj.skills.arcaneInstinct.duration });
          }

          if (localTrackedObj.potBuffs) {
            if (localTrackedObj.potBuffs.power > 0) activeBuffs.push({ type: 'pot-power', name: 'POWER', icon: '💪', life: localTrackedObj.potBuffs.power });
            if (localTrackedObj.potBuffs.defense > 0) activeBuffs.push({ type: 'pot-defense', name: 'DEFENSE', icon: '🛡️', life: localTrackedObj.potBuffs.defense });
            if (localTrackedObj.potBuffs.crit > 0) activeBuffs.push({ type: 'pot-crit', name: 'CRIT CHANCE', icon: '🎯', life: localTrackedObj.potBuffs.crit });
            if (localTrackedObj.potBuffs.regen > 0) activeBuffs.push({ type: 'pot-regen', name: 'REGEN', icon: '🌿', life: localTrackedObj.potBuffs.regen });
            if (localTrackedObj.potBuffs.xpBoost > 0) activeBuffs.push({ type: 'pot-xpBoost', name: 'XP BOOST', icon: '✨', life: localTrackedObj.potBuffs.xpBoost });
          }
          setActiveBuffsList(activeBuffs);

          let currentAtk = eng.boltDmg + (localTrackedObj.dmg || 0);
          if (localTrackedObj.skills?.berserk?.duration > 0 && localTrackedObj.skills?.berserk?.enabled) currentAtk = Math.ceil(currentAtk * 1.5);
          if (localTrackedObj.potBuffs?.power > 0) currentAtk = Math.ceil(currentAtk * 1.4);
          if (localTrackedObj.skills?.arcaneInstinct?.duration > 0) currentAtk = Math.ceil(currentAtk * 2.50); 

          let currentDef = 0;
          if (localTrackedObj.skills?.fortify?.learned && localTrackedObj.skills?.fortify?.enabled) currentDef += 25;
          if (localTrackedObj.potBuffs?.defense > 0) currentDef += 35;
          if (localTrackedObj.skills?.arcaneInstinct?.duration > 0) currentDef += 250; 

          let currentCrit = 0;
          if (localTrackedObj.potBuffs?.crit > 0) currentCrit += 35;
          if (localTrackedObj.skills?.arcaneInstinct?.duration > 0) currentCrit += 250; 

          let currentSpd = 200;
          if (localTrackedObj.skills?.haste?.duration > 0 && localTrackedObj.skills?.haste?.enabled) currentSpd = Math.ceil(currentSpd * 1.45);
          if (localTrackedObj.skills?.arcaneInstinct?.duration > 0) currentSpd = Math.ceil(currentSpd * 2.50); 

          let currentCd = localTrackedObj.shootRate || 0.6;
          if (localTrackedObj.skills?.berserk?.duration > 0 && localTrackedObj.skills?.berserk?.enabled) currentCd *= 0.5;
          if (localTrackedObj.skills?.arcaneInstinct?.duration > 0) currentCd *= 0.35; 

          if (statAtkRef.current) statAtkRef.current.textContent = currentAtk;
          if (statDefRef.current) statDefRef.current.textContent = `${currentDef}%`;
          if (statCritRef.current) statCritRef.current.textContent = `${currentCrit}%`;
          if (statSpdRef.current) statSpdRef.current.textContent = `${currentSpd} IPS`;
          if (statCdRef.current) statCdRef.current.textContent = `${currentCd.toFixed(2)}s`;
        }

        if (isCoopActive && netRef.current.channel) {
          syncTimer -= dt;
          if (syncTimer <= 0) {
            syncTimer = 0.033;
            if (!isHost) {
              netRef.current.channel.send('guest_input', { x: mx, y: my });
            } else {
              netRef.current.channel.send('state_sync', {
                gameStarted: eng.gameStarted, 
                enemies: eng.enemies.map(e => ({ x: Math.round(e.x), y: Math.round(e.y), r: e.r, speed: e.speed, hp: e.hp, maxHp: e.maxHp, dmg: e.dmg, xp: e.xp, color: e.color, glow: e.glow, boss: e.boss, flash: e.flash, stunnedTime: e.stunnedTime, stigmaTime: e.stigmaTime, temporalSlowTime: e.temporalSlowTime, arcaneBurnTime: e.arcaneBurnTime, voidExhaustTime: e.voidExhaustTime, instabTime: e.instabTime })),
                gems: eng.gems.map(g => ({ x: Math.round(g.x), y: Math.round(g.y), r: g.r, xp: g.xp, life: Math.round(g.life) })),
                bullets: eng.bullets.map(b => ({ x: Math.round(b.x), y: Math.round(b.y), vx: Math.round(b.vx), vy: Math.round(b.vy), r: b.r, life: b.life, p2: b.p2 })),
                potions: (eng.potions || []).map(p => ({ x: Math.round(p.x), y: Math.round(p.y), r: p.r, type: p.type, life: p.life })),
                collapses: (eng.collapses || []).map(c => ({ x: Math.round(c.x), y: Math.round(c.y), radius: Math.round(c.radius), maxRadius: c.maxRadius, life: c.life })),
                score: eng.score, wave: eng.wave, waveT: eng.waveT, waveLen: eng.waveLen, boltDmg: eng.boltDmg,
                p1: eng.p ? { x: eng.p.x, y: eng.p.y, hp: eng.p.hp, maxHp: eng.p.maxHp, inv: eng.p.inv, dead: eng.p.dead, dmg: eng.p.dmg, shootRate: eng.p.shootRate, chatBubble: eng.p.chatBubble } : null,
                p2: eng.p2 ? { x: eng.p2.x, y: eng.p2.y, hp: eng.p2.hp, maxHp: eng.p2.maxHp, inv: eng.p2.inv, dead: eng.p2.dead, dmg: eng.p2.dmg, shootRate: eng.p2.shootRate, chatBubble: eng.p2.chatBubble } : null,
                p1_skills: eng.p ? eng.p.skills : null,
                p2_skills: eng.p2 ? eng.p2.skills : null,
                p1_potBuffs: eng.p ? eng.p.potBuffs : null,
                p2_potBuffs: eng.p2 ? eng.p2.potBuffs : null,
                ts: Date.now(),
                p2_level: eng.p2 ? eng.p2.level : 1, p2_xp: eng.p2 ? eng.p2.xp : 0, p2_xpNext: eng.p2 ? eng.p2.xpNext : 80
              });
            }
          }
        }

        if (eng.slashes) {
          for (let slIdx = eng.slashes.length - 1; slIdx >= 0; slIdx--) {
            const sl = eng.slashes[slIdx];
            sl.x += sl.vx * dt;
            sl.y += sl.vy * dt;
            sl.life -= dt;
            if (sl.life <= 0) {
              eng.slashes.splice(slIdx, 1);
              continue;
            }
            for (const enemy of eng.enemies) {
              if (Math.hypot(enemy.x - sl.x, enemy.y - sl.y) < enemy.r + 28) {
                if (!sl.hits.has(enemy)) {
                  sl.hits.add(enemy);
                  
                  let baseSkillDmg = 42;
                  const shooterObj = sl.p2 ? eng.p2 : eng.p;
                  if (shooterObj?.potBuffs?.power > 0) baseSkillDmg *= 1.4; 
                  if (shooterObj?.skills?.arcaneInstinct?.duration > 0) baseSkillDmg *= 2.5; 
                  if (enemy.instabTime > 0) baseSkillDmg *= 1.5;

                  if (shooterObj?.potBuffs?.crit > 0 && Math.random() < 0.35) {
                    baseSkillDmg *= 2;
                    enemy.flash = 0.45;
                  } else {
                    enemy.flash = 0.15;
                  }

                  enemy.hp -= baseSkillDmg; 
                  if (enemy.hp <= 0) enemy.deadTrigger = true;
                }
              }
            }
          }
        }

        if (eng.stars) {
          for (let sIdx = eng.stars.length - 1; sIdx >= 0; sIdx--) {
            const star = eng.stars[sIdx];
            star.progress += dt * 2.5;
            star.currentY = star.targetY - 400 * (1 - star.progress);
            if (star.progress >= 1) {
              for (const enemy of eng.enemies) {
                if (Math.hypot(enemy.x - star.x, enemy.y - star.targetY) <= star.radius) {
                  let splashDmg = 70;
                  const shooterObj = star.p2 ? eng.p2 : eng.p;
                  if (shooterObj?.potBuffs?.power > 0) splashDmg *= 1.4;
                  if (shooterObj?.skills?.arcaneInstinct?.duration > 0) splashDmg *= 2.5;
                  if (enemy.instabTime > 0) splashDmg *= 1.5;

                  if (shooterObj?.potBuffs?.crit > 0 && Math.random() < 0.35) {
                    splashDmg *= 2;
                    enemy.flash = 0.5;
                  } else {
                    enemy.flash = 0.2;
                  }

                  enemy.hp -= splashDmg;
                  if (enemy.hp <= 0) enemy.deadTrigger = true;
                }
              }
              for (let k = 0; k < 10; k++) {
                const pa = Math.random() * Math.PI * 2;
                const ps = Math.random() * 110 + 50;
                eng.particles.push({ x: star.x, y: star.targetY, vx: Math.cos(pa) * ps, vy: Math.sin(pa) * ps, color: '#60a5fa', life: 0.35, ml: 0.35, r: 2.5 });
              }
              eng.stars.splice(sIdx, 1);
            }
          }
        }

        if (eng.cubeBashes) {
          for (let cbIdx = eng.cubeBashes.length - 1; cbIdx >= 0; cbIdx--) {
            const cb = eng.cubeBashes[cbIdx];
            cb.radius += cb.speed * dt;
            if (cb.radius >= cb.maxRadius) {
              eng.cubeBashes.splice(cbIdx, 1);
            }
          }
        }

        if (eng.collapses) {
          for (let cIdx = eng.collapses.length - 1; cIdx >= 0; cIdx--) {
            const col = eng.collapses[cIdx];
            col.life -= dt;
            col.pulseTimer += dt;
            col.radius += 360 * dt;

            if (col.pulseTimer >= 0.5 && col.pulseCount < 3) {
              col.pulseTimer = 0;
              col.pulseCount++;
              eng.screenShake = 0.4;

              for (const enemy of eng.enemies) {
                let colPulseDmg = 50;
                if (enemy.instabTime > 0) colPulseDmg *= 1.5;
                enemy.hp -= colPulseDmg;
                enemy.flash = 0.25;
                if (enemy.hp <= 0) enemy.deadTrigger = true;
              }
            }

            if (col.life <= 0) eng.collapses.splice(cIdx, 1);
          }
        }

        if (eng.potions) {
          for (let pIdx = eng.potions.length - 1; pIdx >= 0; pIdx--) {
            const pot = eng.potions[pIdx];
            pot.life -= dt;
            if (pot.life <= 0) { eng.potions.splice(pIdx, 1); continue; }

            let tx = eng.p ? eng.p.x : W/2, ty = eng.p ? eng.p.y : H/2; let targetPlayer = eng.p;
            if (isCoopActive && eng.p2 && !eng.p2.dead) {
              const dP1 = eng.p ? Math.hypot(eng.p.x - pot.x, eng.p.y - pot.y) : Infinity;
              if (Math.hypot(eng.p2.x - pot.x, eng.p2.y - pot.y) < dP1) {
                tx = eng.p2.x; ty = eng.p2.y; targetPlayer = eng.p2;
              }
            }
            if (!targetPlayer) continue;

            const pd = Math.hypot(tx - pot.x, ty - pot.y);
            if (pd < 110) {
              const ga = Math.atan2(ty - pot.y, tx - pot.x);
              pot.x += Math.cos(ga) * 260 * dt; pot.y += Math.sin(ga) * 260 * dt;
            }

            if (!targetPlayer.dead && Math.hypot(targetPlayer.x - pot.x, targetPlayer.y - pot.y) < targetPlayer.r + pot.r) {
              if (!targetPlayer.potBuffs) {
                targetPlayer.potBuffs = { power: 0, defense: 0, crit: 0, regen: 0, xpBoost: 0 };
              }

              if (pot.type === 'health') {
                targetPlayer.hp = Math.min(targetPlayer.maxHp, targetPlayer.hp + 20); 
              } else if (pot.type === 'regen') {
                targetPlayer.potBuffs.regen = 10.0;
              } else {
                targetPlayer.potBuffs[pot.type] = 12.0; 
              }

              for(let k=0; k<8; k++) {
                eng.particles.push({ x: pot.x, y: pot.y, vx: (Math.random()-0.5)*120, vy: (Math.random()-0.5)*120, color: '#f472b6', life: 0.25, ml: 0.25, r: 2 });
              }
              eng.potions.splice(pot.type === 'xp' ? eng.potions.indexOf(pot) : pIdx, 1);
            }
          }
        }

        if (eng.gameStarted) {
          if (eng.enemies.length > 0) {
            if (eng.p && !eng.p.dead) {
              eng.p.shootCd -= dt;
              if (eng.p.shootCd <= 0) {
                let near = null, nd = Infinity;
                for (const e of eng.enemies) {
                  const d = Math.hypot(e.x - eng.p.x, e.y - eng.p.y);
                  if (d < nd) { nd = d; near = e; }
                }
                if (near) {
                  let activeRate = (eng.p.skills?.berserk?.duration > 0 && eng.p.skills?.berserk?.enabled !== false) ? (eng.p.shootRate * 0.5) : eng.p.shootRate;
                  if (eng.p.skills?.arcaneInstinct?.duration > 0) activeRate *= 0.35; 

                  eng.p.shootCd = activeRate;
                  const ba = Math.atan2(near.y - eng.p.y, near.x - eng.p.x);
                  const sp = (eng.p.multiShot - 1) * 0.18;
                  for (let i = 0; i < eng.p.multiShot; i++) {
                    const a = ba + (i - (eng.p.multiShot - 1) / 2) * sp;
                    eng.bullets.push({ x: eng.p.x, y: eng.p.y, vx: Math.cos(a) * 390, vy: Math.sin(a) * 390, r: 5, life: 2, p2: false });
                  }
                }
              }
            }

            if (isCoopActive && eng.p2 && !eng.p2.dead) {
              eng.p2.shootCd -= dt;
              if (eng.p2.shootCd <= 0) {
                let near = null, nd = Infinity;
                for (const e of eng.enemies) {
                  const d = Math.hypot(e.x - eng.p2.x, e.y - eng.p2.y);
                  if (d < nd) { nd = d; near = e; }
                }
                if (near) {
                  let activeRatep2 = (eng.p2.skills?.berserk?.duration > 0 && eng.p2.skills?.berserk?.enabled !== false) ? (eng.p2.shootRate * 0.5) : eng.p2.shootRate;
                  if (eng.p2.skills?.arcaneInstinct?.duration > 0) activeRatep2 *= 0.35;

                  eng.p2.shootCd = activeRatep2;
                  const ba = Math.atan2(near.y - eng.p2.y, near.x - eng.p2.x);
                  const sp = (eng.p2.multiShot - 1) * 0.18;
                  for (let i = 0; i < eng.p2.multiShot; i++) {
                    const a = ba + (i - (eng.p2.multiShot - 1) / 2) * sp;
                    eng.bullets.push({ x: eng.p2.x, y: eng.p2.y, vx: Math.cos(a) * 390, vy: Math.sin(a) * 390, r: 5, life: 2, p2: true });
                  }
                }
              }
            }
          }

          if (!isCoopActive || isHost) {
            for (let i = eng.bullets.length - 1; i >= 0; i--) {
              const b = eng.bullets[i]; b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
              if (b.life <= 0 || b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) { 
                eng.bullets.splice(i, 1); 
                continue; 
              }
              let hit = false;
              for (let j = eng.enemies.length - 1; j >= 0; j--) {
                const e = eng.enemies[j];
                if (Math.hypot(b.x - e.x, b.y - e.y) < b.r + e.r) {
                  const shooterObj = b.p2 ? eng.p2 : eng.p;
                  const isBerserkActive = b.p2 ? (eng.p2?.skills?.berserk?.duration > 0 && eng.p2?.skills?.berserk?.enabled !== false) : (eng.p?.skills?.berserk?.duration > 0 && eng.p?.skills?.berserk?.enabled !== false);
                  let calculatedDmg = isBerserkActive ? Math.ceil((eng.boltDmg + (shooterObj?.dmg || 0)) * 1.5) : (eng.boltDmg + (shooterObj?.dmg || 0));

                  if (shooterObj?.potBuffs?.power > 0) calculatedDmg = Math.ceil(calculatedDmg * 1.4); 
                  if (shooterObj?.skills?.arcaneInstinct?.duration > 0) calculatedDmg = Math.ceil(calculatedDmg * 2.50); 
                  if (e.instabTime > 0) calculatedDmg = Math.ceil(calculatedDmg * 1.5);

                  if (shooterObj?.potBuffs?.crit > 0 && Math.random() < 0.35) {
                    calculatedDmg *= 2;
                    e.flash = 0.45;
                  } else {
                    e.flash = 0.1;
                  }

                  e.hp -= calculatedDmg;
                  
                  const hasBodyCutter = b.p2 ? (eng.p2?.skills?.bodyCutter?.learned && eng.p2?.skills?.bodyCutter?.enabled !== false) : (eng.p?.skills?.bodyCutter?.learned && eng.p?.skills?.bodyCutter?.enabled !== false);
                  if (hasBodyCutter) e.stigmaTime = 4.0;

                  for(let k=0; k<5; k++) {
                    const pa = Math.random()*Math.PI*2; const ps = Math.random()*80+40;
                    eng.particles.push({ x: b.x, y: b.y, vx: Math.cos(pa)*ps, vy: Math.sin(pa)*ps, color: e.color, life: 0.3, ml: 0.3, r: 2 });
                  }
                  eng.bullets.splice(i, 1); hit = true;
                  if (e.hp <= 0) {
                    eng.score += e.boss ? 1500 : 100;
                    eng.gems.push({ x: e.x, y: e.y, r: 7, xp: e.xp, life: 12 });

                    if (Math.random() < 0.22) {
                      const types = ['power', 'defense', 'crit', 'health', 'regen', 'xp'];
                      eng.potions.push({
                        x: e.x, y: e.y, r: 8,
                        type: types[Math.floor(Math.random() * types.length)],
                        life: 14.0
                      });
                    }
                    eng.enemies.splice(j, 1);
                  }
                  break;
                }
              }
              if (hit) continue;
            }

            for (let j = eng.enemies.length - 1; j >= 0; j--) {
              const e = eng.enemies[j];

              if (e.stigmaTime > 0) {
                e.stigmaTime -= dt;
                e.hp -= 20 * dt; 
                if (Math.random() < 0.15) {
                  eng.particles.push({ x: e.x + (Math.random() - 0.5) * 10, y: e.y + (Math.random() - 0.5) * 10, vx: 0, vy: -15, color: '#f43f5e', life: 0.25, ml: 0.25, r: 1.5 });
                }
                if (e.hp <= 0) e.deadTrigger = true;
              }

              if (e.temporalSlowTime > 0) e.temporalSlowTime -= dt;
              if (e.voidExhaustTime > 0) e.voidExhaustTime -= dt;
              if (e.instabTime > 0) e.instabTime -= dt;
              if (e.arcaneBurnTime > 0) {
                e.arcaneBurnTime -= dt;
                e.hp -= 45 * dt; 
                if (Math.random() < 0.22) {
                  eng.particles.push({ x: e.x + (Math.random()-0.5)*16, y: e.y + (Math.random()-0.5)*16, vx: (Math.random()-0.5)*15, vy: -25, color: '#d946ef', life: 0.3, ml: 0.3, r: 2 });
                }
                if (e.hp <= 0) e.deadTrigger = true;
              }

              if (e.deadTrigger) {
                eng.score += e.boss ? 1500 : 100;
                eng.gems.push({ x: e.x, y: e.y, r: 7, xp: e.xp, life: 12 });
                
                if (Math.random() < 0.22) {
                  const types = ['power', 'defense', 'crit', 'health', 'regen', 'xp'];
                  eng.potions.push({
                    x: e.x, y: e.y, r: 8,
                    type: types[Math.floor(Math.random() * types.length)],
                    life: 14.0
                  });
                }
                eng.enemies.splice(j, 1);
                continue;
              }

              if (e.stunnedTime > 0) {
                e.stunnedTime -= dt;
              } else {
                let tx = (eng.p && !eng.p.dead) ? eng.p : null;
                if (isCoopActive && eng.p2 && !eng.p2.dead) {
                  const d1 = (!eng.p || eng.p.dead) ? Infinity : Math.hypot(e.x - eng.p.x, e.y - eng.p.y);
                  const d2 = Math.hypot(e.x - eng.p2.x, e.y - eng.p2.y);
                  if (d2 < d1) tx = eng.p2;
                }
                if (tx) {
                  const ea = Math.atan2(tx.y - e.y, tx.x - e.x);
                  let runSpeed = e.speed;
                  if (e.temporalSlowTime > 0) runSpeed *= 0.30; 
                  e.x += Math.cos(ea) * runSpeed * dt; e.y += Math.sin(ea) * runSpeed * dt;
                }
              }
              
              if (e.flash > 0) e.flash -= dt;

              if (eng.p && !eng.p.dead && eng.p.inv <= 0 && Math.hypot(e.x - eng.p.x, e.y - eng.p.y) < e.r + eng.p.r) {
                let damageTaken = e.dmg;
                if (e.voidExhaustTime > 0) damageTaken *= 0.5; 
                if (eng.p.potBuffs?.defense > 0) damageTaken *= 0.65; 

                if (eng.p.skills?.shield?.duration > 0 && eng.p.skills?.shield?.enabled !== false) {
                  damageTaken = 0; 
                } else if (eng.p.skills?.fortify?.learned && eng.p.skills?.fortify?.enabled !== false) {
                  damageTaken *= 0.75; 
                }

                eng.p.hp -= damageTaken; eng.p.inv = 0.7;
                // FIXED: Solo/Host Game-over check updates
                if (eng.p.hp <= 0) { 
                  eng.p.dead = true; 
                  if(!isCoopActive || !eng.p2 || eng.p2.dead) { 
                    if(isCoopActive) netRef.current.channel.send('game_over',{}); 
                    setScreen('gameover'); 
                  } 
                }
              }
              if (isCoopActive && eng.p2 && !eng.p2.dead && eng.p2.inv <= 0 && Math.hypot(e.x - eng.p2.x, e.y - eng.p2.y) < e.r + eng.p2.r) {
                let damageTakenp2 = e.dmg;
                if (e.voidExhaustTime > 0) damageTakenp2 *= 0.5;
                if (eng.p2.potBuffs?.defense > 0) damageTakenp2 *= 0.65;

                if (eng.p2.skills?.shield?.duration > 0 && eng.p2.skills?.shield?.enabled !== false) {
                  damageTakenp2 = 0;
                } else if (eng.p2.skills?.fortify?.learned && eng.p2.skills?.fortify?.enabled !== false) {
                  damageTakenp2 *= 0.75;
                }

                eng.p2.hp -= damageTakenp2; eng.p2.inv = 0.7;
                if (eng.p2.hp <= 0) {
                  eng.p2.dead = true; 
                  if(!eng.p || eng.p.dead) { netRef.current.channel.send('game_over',{}); setScreen('gameover'); } 
                }
              }
            }

            for (let i = eng.gems.length - 1; i >= 0; i--) {
              const g = eng.gems[i]; g.life -= dt;
              if (g.life <= 0) { eng.gems.splice(i, 1); continue; }
              let tx = eng.p ? eng.p.x : W/2, ty = eng.p ? eng.p.y : H/2; let targetPlayer = eng.p;
              if (isCoopActive && eng.p2 && !eng.p2.dead) {
                const dP1 = eng.p ? Math.hypot(eng.p.x - g.x, eng.p.y - g.y) : Infinity;
                if (Math.hypot(eng.p2.x - g.x, eng.p2.y - g.y) < dP1) {
                  tx = eng.p2.x; ty = eng.p2.y; targetPlayer = eng.p2;
                }
              }
              if (!targetPlayer) continue;
              const gd = Math.hypot(tx - g.x, ty - g.y);
              if (gd < 110) {
                const ga = Math.atan2(ty - g.y, tx - g.x);
                g.x += Math.cos(ga) * 260 * dt; g.y += Math.sin(ga) * 260 * dt;
              }
              if (!targetPlayer.dead && Math.hypot(targetPlayer.x - g.x, targetPlayer.y - g.y) < targetPlayer.r + g.r) {
                let distributedXp = g.xp;
                if (targetPlayer.potBuffs?.xpBoost > 0) distributedXp = Math.ceil(distributedXp * 1.5); 

                if (isCoopActive && targetPlayer === eng.p2) {
                  eng.p2.xp += distributedXp;
                  if (eng.p2.xp >= eng.p2.xpNext) {
                    eng.p2.xp -= eng.p2.xpNext; eng.p2.xpNext = Math.ceil(eng.p2.xpNext * 1.45); eng.p2.level++;
                    netRef.current.channel.send('offer_levelup', { ups: rollUpgradeOptions() });
                  }
                } else if (eng.p) {
                  eng.p.xp += distributedXp;
                  if (eng.p.xp >= eng.p.xpNext) {
                    eng.p.xp -= eng.p.xpNext; eng.p.xpNext = Math.ceil(eng.p.xpNext * 1.45); eng.p.level++;
                    onLevelUpOffer(rollUpgradeOptions()); 
                    setScreen('levelup');
                  }
                }
                eng.gems.splice(i, 1);
              }
            }
          }

          if (!isHost && isCoopActive) {
            for (let i = eng.bullets.length - 1; i >= 0; i--) {
              const b = eng.bullets[i]; b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
              if (b.life <= 0 || b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) {
                eng.bullets.splice(i, 1);
              }
            }
          }
        }

        const localTarget = (isCoopActive && !isHost) ? eng.p2 : eng.p;
        if (localTarget) {
          hudRef.current = { 
            score: eng.score, wave: eng.wave, waveT: eng.waveT, waveLen: eng.waveLen, 
            p: localTarget, p2: (isCoopActive && isHost) ? eng.p2 : eng.p,
            p1VotedRestart, p2VotedRestart
          };
        }

        if (scoreValueRef.current) scoreValueRef.current.textContent = eng.score;
        if (waveValueRef.current) {
          const timeRem = Math.max(0, Math.ceil(eng.waveLen - eng.waveT));
          waveValueRef.current.textContent = `WAVE ${eng.wave} | ${timeRem}s`;
        }
        if (localTarget) {
          const hpPct = Math.max(0, Math.min(100, (localTarget.hp / localTarget.maxHp) * 100));
          if (hpFillRef.current) hpFillRef.current.style.width = `${hpPct}%`;
          if (hpTextRef.current) hpTextRef.current.textContent = `HP ${Math.max(0, Math.ceil(localTarget.hp))}/${localTarget.maxHp}`;

          const xpPct = Math.max(0, Math.min(100, (localTarget.xp / localTarget.xpNext) * 100));
          if (xpFillRef.current) xpFillRef.current.style.width = `${xpPct}%`;
          if (xpTextRef.current) xpTextRef.current.textContent = `LV${localTarget.level} XP ${localTarget.xp}/${localTarget.xpNext}`;
        }
      }

      for (let i = eng.particles.length - 1; i >= 0; i--) {
        const p = eng.particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.93; p.vy *= 0.93; p.life -= dt;
        if (p.life <= 0) eng.particles.splice(i, 1);
      }
      for (const a of eng.ambs) {
        a.x += a.vx * dt; a.y += a.vy * dt; a.t -= dt * 0.22;
        if (a.t <= 0 || a.y < -10) { a.x = Math.random() * W; a.y = H + 10; a.t = 1; }
      }
    };

    worker.postMessage('start');

    const renderRpgChatBubble = (x, y, txt) => {
      ctx.save();
      ctx.font = 'bold 11px monospace';
      const textWidth = ctx.measureText(txt).width;
      const boxWidth = textWidth + 16;
      const boxHeight = 22;
      const boxX = x - boxWidth / 2;
      const boxY = y - 48;

      ctx.fillStyle = 'rgba(11, 8, 38, 0.93)';
      ctx.strokeStyle = '#d946ef';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#d946ef';
      
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 5);
      else ctx.rect(boxX, boxY, boxWidth, boxHeight);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x - 5, boxY + boxHeight);
      ctx.lineTo(x + 5, boxY + boxHeight);
      ctx.lineTo(x, boxY + boxHeight + 6);
      ctx.closePath();
      ctx.fillStyle = 'rgba(11, 8, 38, 0.93)';
      ctx.fill();
      ctx.strokeStyle = '#d946ef';
      ctx.beginPath();
      ctx.moveTo(x - 5, boxY + boxHeight);
      ctx.lineTo(x, boxY + boxHeight + 6);
      ctx.lineTo(x + 5, boxY + boxHeight);
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fef08a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(txt, x, boxY + boxHeight / 2 + 1);
      ctx.restore();
    };

    const renderLoop = () => {
      ctx.save();
      if (eng.screenShake > 0) {
        const dx = (Math.random() - 0.5) * 9;
        const dy = (Math.random() - 0.5) * 9;
        ctx.translate(dx, dy);
      }

      ctx.fillStyle = '#030111'; ctx.fillRect(0, 0, W, H);
      if (eng.floorPat) { ctx.fillStyle = eng.floorPat; ctx.fillRect(0, 0, W, H); }

      for (const a of eng.ambs) {
        ctx.save(); ctx.globalAlpha = a.a * a.t; ctx.fillStyle = a.c;
        ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      for (const g of eng.gems) {
        ctx.save(); ctx.shadowColor = '#34d399'; ctx.shadowBlur = 12; ctx.fillStyle = '#34d399';
        ctx.beginPath(); ctx.moveTo(g.x, g.y - g.r); ctx.lineTo(g.x + g.r * 0.6, g.y);
        ctx.lineTo(g.x, g.y + g.r); ctx.lineTo(g.x - g.r * 0.6, g.y); ctx.closePath(); ctx.fill(); ctx.restore();
      }

      if (eng.potions) {
        for (const pot of eng.potions) {
          ctx.save();
          let color = '#ef4444';
          if (pot.type === 'power') color = '#f97316';
          if (pot.type === 'defense') color = '#3b82f6';
          if (pot.type === 'crit') color = '#eab308';
          if (pot.type === 'regen') color = '#22c55e';
          if (pot.type === 'xp') color = '#a855f7';

          ctx.shadowColor = color;
          ctx.shadowBlur = 14;
          ctx.fillStyle = color;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;

          ctx.beginPath();
          ctx.moveTo(pot.x - pot.r * 0.4, pot.y - pot.r);
          ctx.lineTo(pot.x + pot.r * 0.4, pot.y - pot.r);
          ctx.lineTo(pot.x + pot.r * 0.4, pot.y - pot.r * 0.4);
          ctx.lineTo(pot.x + pot.r, pot.y + pot.r);
          ctx.lineTo(pot.x - pot.r, pot.y + pot.r);
          ctx.lineTo(pot.x - pot.r * 0.4, pot.y - pot.r * 0.4);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
      }

      for (const b of eng.bullets) {
        ctx.save(); ctx.shadowColor = b.p2 ? '#fb923c' : '#e879f9'; ctx.shadowBlur = 16;
        ctx.fillStyle = b.p2 ? '#fed7aa' : '#f5d0fe'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }

      if (eng.slashes) {
        for (const sl of eng.slashes) {
          ctx.save();
          ctx.translate(sl.x, sl.y);
          ctx.rotate(sl.angle);
          ctx.strokeStyle = sl.p2 ? 'rgba(251, 146, 60, 0.85)' : 'rgba(168, 85, 247, 0.85)';
          ctx.lineWidth = 4;
          ctx.shadowBlur = 14;
          ctx.shadowColor = sl.p2 ? '#fb923c' : '#a855f7';
          ctx.beginPath();
          ctx.arc(0, 0, 26, -Math.PI / 2, Math.PI / 2);
          ctx.stroke();
          ctx.restore();
        }
      }

      if (eng.stars) {
        for (const s of eng.stars) {
          ctx.save();
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(s.x, s.targetY, s.radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          ctx.save();
          ctx.translate(s.x, s.currentY);
          ctx.rotate(performance.now() * 0.006);
          ctx.fillStyle = '#60a5fa';
          ctx.shadowBlur = 12;
          ctx.shadowColor = '#3b82f6';
          ctx.fillRect(-8, -8, 16, 16);
          ctx.restore();
        }
      }

      if (eng.cubeBashes) {
        for (const cb of eng.cubeBashes) {
          ctx.save();
          ctx.strokeStyle = 'rgba(52, 211, 153, 0.6)';
          ctx.lineWidth = 2;
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#34d399';
          ctx.strokeRect(cb.x - cb.radius, cb.y - cb.radius, cb.radius * 2, cb.radius * 2);
          ctx.restore();
        }
      }

      if (eng.collapses) {
        for (const col of eng.collapses) {
          ctx.save();
          ctx.strokeStyle = 'rgba(217, 70, 239, ' + Math.max(0, col.life / 2.2) + ')';
          ctx.lineWidth = 5;
          ctx.shadowBlur = 24;
          ctx.shadowColor = '#d946ef';
          
          ctx.beginPath();
          ctx.arc(col.x, col.y, col.radius % col.maxRadius, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = 'rgba(168, 85, 247, ' + Math.max(0, col.life / 3) + ')';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(col.x, col.y, (col.radius * 0.6) % col.maxRadius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }

      for (const e of eng.enemies) {
        ctx.save(); ctx.fillStyle = e.flash > 0 ? '#fff' : e.color; ctx.shadowColor = e.flash > 0 ? '#fff' : e.glow; ctx.shadowBlur = e.boss ? 22 : 12;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        
        if (e.stunnedTime > 0) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.strokeRect(e.x - e.r - 2, e.y - e.r - 2, (e.r * 2) + 4, (e.r * 2) + 4);
        }

        if (e.temporalSlowTime > 0) {
          ctx.strokeStyle = '#d946ef';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.r + 4, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.fillStyle = '#030111'; ctx.beginPath(); ctx.arc(e.x - e.r * 0.3, e.y - e.r * 0.05, e.r * 0.2, 0, Math.PI * 2); ctx.arc(e.x + e.r * 0.3, e.y - e.r * 0.05, e.r * 0.2, 0, Math.PI * 2); ctx.fill();
        if (e.hp < e.maxHp) {
          const bw = e.r * 2.5; const bh = 4; const bx = e.x - bw / 2; const by = e.y - e.r - 10;
          ctx.fillRect(bx, by, bw, bh);
          ctx.fillStyle = e.boss ? '#fbbf24' : '#ef4444'; ctx.fillRect(bx, by, bw * (e.hp / e.maxHp), bh);
        }
        ctx.restore();
      }

      for (const p of eng.particles) {
        ctx.save(); ctx.globalAlpha = p.life / p.ml; ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.r, p.y - p.r, p.r*2, p.r*2); ctx.restore();
      }

      const p1Color = '#8b5cf6'; 
      const p2Color = '#f97316'; 

      const net = netRef.current || {};
      const isCoopActive = Boolean(net.channel);
      const isHost = Boolean(net.isHost) || !isCoopActive;

      const p1X = isHost ? (eng.p ? eng.p.x : W/3) : eng.p1Render.x;
      const p1Y = isHost ? (eng.p ? eng.p.y : H/2) : eng.p1Render.y;

      const p2X = (isCoopActive && !isHost && eng.p2Render) ? eng.p2Render.x : (eng.p2 ? eng.p2.x : W*2/3);
      const p2Y = (isCoopActive && !isHost && eng.p2Render) ? eng.p2Render.y : (eng.p2 ? eng.p2.y : H/2);

      if (eng.p && !eng.p.dead) {
        ctx.save();
        const fl = eng.p.inv > 0 && Math.sin(eng.p.inv * 25) > 0;
        const pr = eng.p.r;
        const c = fl ? '#ef4444' : p1Color;

        if (eng.p.skills?.arcaneInstinct?.duration > 0) {
          ctx.save();
          const auraTime = performance.now() * 0.004;
          for (let layer = 0; layer < 3; layer++) {
            ctx.beginPath();
            ctx.strokeStyle = layer % 2 === 0 ? 'rgba(232, 121, 249, 0.55)' : 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 2 + layer * 2;
            ctx.shadowColor = '#d946ef';
            ctx.shadowBlur = 18;

            for (let angleDeg = 0; angleDeg <= 360; angleDeg += 20) {
              const rad = (angleDeg * Math.PI) / 180;
              const offsetPulse = pr + 10 + Math.sin(auraTime + angleDeg) * 7;
              const fx = p1X + Math.cos(rad) * offsetPulse;
              const fy = p1Y + 3 + Math.sin(rad) * offsetPulse - (Math.random() * 8) - (layer * 3);
              if (angleDeg === 0) ctx.moveTo(fx, fy);
              else ctx.lineTo(fx, fy);
            }
            ctx.stroke();
          }
          ctx.restore();
        }

        ctx.shadowColor = c; ctx.shadowBlur = 22; ctx.fillStyle = c;
        ctx.beginPath(); ctx.arc(p1X, p1Y + 3, pr, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        
        if (eng.p.skills?.shield?.duration > 0 && eng.p.skills?.shield?.enabled !== false) {
          ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 3; ctx.shadowBlur = 15; ctx.shadowColor = '#38bdf8';
          ctx.beginPath(); ctx.arc(p1X, p1Y + 3, pr + 10, 0, Math.PI * 2); ctx.stroke(); ctx.shadowBlur = 0;
        }
        if (eng.p.skills?.berserk?.duration > 0 && eng.p.skills?.berserk?.enabled !== false) {
          ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2; ctx.beginPath();
          ctx.arc(p1X, p1Y + 3, pr + 5, 0, Math.PI * 2); ctx.stroke();
        }

        ctx.fillStyle = fl ? '#b91c1c' : '#5b21b6';
        ctx.beginPath(); ctx.moveTo(p1X, p1Y - pr * 1.8); ctx.lineTo(p1X + pr * 0.9, p1Y - pr * 0.2); ctx.lineTo(p1X - pr * 0.9, p1Y - pr * 0.2); ctx.closePath(); ctx.fill();
        ctx.fillStyle = fl ? '#fca5a5' : '#c4b5fd';
        ctx.beginPath(); ctx.ellipse(p1X, p1Y - pr * 0.2, pr * 1.15, pr * 0.28, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#030111'; ctx.beginPath(); ctx.arc(p1X - pr * 0.32, p1Y + 2, pr * 0.18, 0, Math.PI * 2); ctx.arc(p1X + pr * 0.32, p1Y + 2, pr * 0.18, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        if (eng.p.chatBubble && eng.p.chatBubble.life > 0) {
          renderRpgChatBubble(p1X, p1Y, eng.p.chatBubble.text);
        }
      }

      // FIXED: Siguraduhing may umiiral na p2 object bago ito i-render (para kapag lumabas si P2, mawala ang character niya)
      if (isCoopActive && eng.p2 && !eng.p2.dead) {
        ctx.save();
        const fl = eng.p2.inv > 0 && Math.sin(eng.p2.inv * 25) > 0;
        const pr = eng.p2.r;
        const c = fl ? '#ef4444' : p2Color;

        if (eng.p2.skills?.arcaneInstinct?.duration > 0) {
          ctx.save();
          const auraTime2 = performance.now() * 0.004;
          for (let layer = 0; layer < 3; layer++) {
            ctx.beginPath();
            ctx.strokeStyle = layer % 2 === 0 ? 'rgba(232, 121, 249, 0.55)' : 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 2 + layer * 2;
            ctx.shadowColor = '#d946ef';
            ctx.shadowBlur = 18;

            for (let angleDeg = 0; angleDeg <= 360; angleDeg += 20) {
              const rad = (angleDeg * Math.PI) / 180;
              const offsetPulse = pr + 10 + Math.sin(auraTime2 + angleDeg) * 7;
              const fx = p2X + Math.cos(rad) * offsetPulse;
              const fy = p2Y + 3 + Math.sin(rad) * offsetPulse - (Math.random() * 8) - (layer * 3);
              if (angleDeg === 0) ctx.moveTo(fx, fy);
              else ctx.lineTo(fx, fy);
            }
            ctx.stroke();
          }
          ctx.restore();
        }

        ctx.shadowColor = c; ctx.shadowBlur = 22; ctx.fillStyle = c;
        ctx.beginPath(); ctx.arc(p2X, p2Y + 3, pr, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        
        if (eng.p2.skills?.shield?.duration > 0 && eng.p2.skills?.shield?.enabled !== false) {
          ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 3; ctx.shadowBlur = 15; ctx.shadowColor = '#38bdf8';
          ctx.beginPath(); ctx.arc(p2X, p2Y + 3, pr + 10, 0, Math.PI * 2); ctx.stroke(); ctx.shadowBlur = 0;
        }
        if (eng.p2.skills?.berserk?.duration > 0 && eng.p2.skills?.berserk?.enabled !== false) {
          ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2; ctx.beginPath();
          ctx.arc(p2X, p2Y + 3, pr + 5, 0, Math.PI * 2); ctx.stroke();
        }

        ctx.fillStyle = fl ? '#b91c1c' : '#c2410c';
        ctx.beginPath(); ctx.moveTo(p2X, p2Y - pr * 1.8); ctx.lineTo(p2X + pr * 0.9, p2Y - pr * 0.2); ctx.lineTo(p2X - pr * 0.9, p2Y - pr * 0.2); ctx.closePath(); ctx.fill();
        ctx.fillStyle = fl ? '#fca5a5' : '#ffedd5';
        ctx.beginPath(); ctx.ellipse(p2X, p2Y - pr * 0.2, pr * 1.15, pr * 0.28, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#030111'; ctx.beginPath(); ctx.arc(p2X - pr * 0.32, p2Y + 2, pr * 0.18, 0, Math.PI * 2); ctx.arc(p2X + pr * 0.32, p2Y + 2, pr * 0.18, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        if (eng.p2.chatBubble && eng.p2.chatBubble.life > 0) {
          renderRpgChatBubble(p2X, p2Y, eng.p2.chatBubble.text);
        }
      }

      ctx.restore(); 
      renderAnimId = requestAnimationFrame(renderLoop);
    };
    renderAnimId = requestAnimationFrame(renderLoop);

    const down = (e) => { 
      eng.keys[e.key] = true; 
      
      // PINALITAN: Bukod sa Escape, gagana na rin ang letrang 'P' o 'p' para mag-pause
      if ((e.key === 'Escape' || e.key === 'p' || e.key === 'P') && screen === 'playing') {
        const isCoopActive = Boolean(netRef.current && netRef.current.channel);
        
        // Tanging host lang o solo player ang pwedeng mag-pause
        if (!isCoopActive || netRef.current.isHost) {
          if (window.executeNetworkPauseAction) {
            window.executeNetworkPauseAction();
          }
        }
      }
      
      if ((e.key === 'k' || e.key === 'K' || e.key === 't' || e.key === 'T') && screen === 'playing') {
        setIsTreeOpen(prev => !prev);
      }
      
      if (screen === 'playing') {
        if (e.key === '1') window.learnSkillTreeTech('bodyCutter');
        if (e.key === '2') window.learnSkillTreeTech('shootingStar');
        if (e.key === '3') window.learnSkillTreeTech('cubeBash');
        if (e.key === '4') window.learnSkillTreeTech('vacuumSlash');
        if (e.key === '5') window.castArcaneCollapseUltimate();
        if (e.key === '6') window.castArcaneInstinctUltimate(); 
      }
    };

    const up = (e) => { eng.keys[e.key] = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);

    return () => {
      worker.postMessage('stop');
      worker.terminate();
      URL.revokeObjectURL(workerURL);
      cancelAnimationFrame(renderAnimId);
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [screen]);

  window.runUpgrade = (choice, forcedTarget = null) => {
    const eng = engineRef.current;
    if (!eng || !eng.p) return;
    
    const isCoopActive = Boolean(netRef.current && netRef.current.channel);
    let target = (isCoopActive && !netRef.current.isHost) ? eng.p2 : eng.p;
    if (forcedTarget === 'p2') target = eng.p2;
    if (forcedTarget === 'p1') target = eng.p;
    
    if (!target) return;
    
    const token = String(choice || '').toLowerCase().trim();
    console.log(`🔮 Applying Arcane Upgrade:`, token);
    
    if (token.includes('hp') || token.includes('vitality') || token.includes('max')) {
      target.maxHp += 25; 
      target.hp = target.maxHp; 
    }
    else if (token.includes('damage') || token.includes('might') || token.includes('increase')) {
      target.dmg = (target.dmg || 0) + 14; 
    }
    else if (token.includes('rate') || token.includes('rapid') || token.includes('fire')) {
      target.shootRate = Math.max(0.15, target.shootRate - 0.1); 
    }
    else if (token.includes('multi') || token.includes('shot') || token.includes('split')) {
      target.multiShot += 1; 
    }
  };

  const isNetworked = Boolean(netRef.current && netRef.current.channel);
  const isHostInstance = !isNetworked || Boolean(netRef.current?.isHost);

  return (
    <div id="wrap">
      <style>{focusStyles}</style>
      <div className="game-container">
        <canvas ref={canvasRef} id="gameCanvas" />

{/* TOP STATUS HUD */}
        {screen === 'playing' && (
          <div className="game-hud-top" style={{ pointerEvents: 'auto' }}>
            <div>SCORE: <span ref={scoreValueRef}>0</span></div>
            
            {/* Clickable Pause para sa Host / Solo Player */}
            {isHostInstance && (
              <button 
                onClick={() => {
                  // FIXED: Kapag may network action (Co-op Host), tawagin ito. Kapag wala (Solo Play), mag-pause agad locally.
                  if (window.executeNetworkPauseAction && isNetworked) {
                    window.executeNetworkPauseAction();
                  } else {
                    setScreen('pause');
                  }
                }}
                style={{
                  background: 'rgba(27, 16, 59, 0.6)', // Transparent dark purple katulad ng panel sa itaas
                  border: '1px solid #4c2d82', // Manipis at swaktong violet border
                  color: '#a78bfa', // Light violet text color para malinis tingnan
                  fontFamily: 'Georgia, serif',
                  fontSize: '0.75rem',
                  fontWeight: '800',
                  letterSpacing: '0.05em',
                  padding: '6px 16px',
                  borderRadius: '20px', // Rounded pill shape para tugma sa profile header
                  cursor: 'pointer',
                  boxShadow: '0 0 10px rgba(124, 58, 237, 0.25)', // Subtle purple glow
                  transition: 'all 0.2s ease-in-out',
                  pointerEvents: 'auto'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(44, 26, 92, 0.8)';
                  e.currentTarget.style.borderColor = '#6d28d9';
                  e.currentTarget.style.boxShadow = '0 0 14px rgba(167, 139, 250, 0.45)';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(27, 16, 59, 0.6)';
                  e.currentTarget.style.borderColor = '#4c2d82';
                  e.currentTarget.style.boxShadow = '0 0 10px rgba(124, 58, 237, 0.25)';
                  e.currentTarget.style.color = '#a78bfa';
                }}
              >
                ⏸ PAUSE GAME
              </button>
            )}

            <div ref={waveValueRef}>WAVE 1 | 30s</div>
          </div>
        )}


        {screen === 'playing' && activeBuffsList.length > 0 && (
          <div className="rpg-buff-container">
            {activeBuffsList.map((buff, idx) => (
              <div key={idx} className={`rpg-buff-badge ${buff.type}`}>
                <span>{buff.icon}</span>
                <span>{buff.name} ({Math.ceil(buff.life)}s)</span>
              </div>
            ))}
          </div>
        )}

        {screen === 'playing' && (
          <div className="game-hud-bottom">
            <button 
              className="stats-toggle-btn" 
              onClick={() => setIsStatsOpen(prev => !prev)}
            >
              {isStatsOpen ? "▼ Hide Stats Panel" : "▲ Show Character Stats"}
            </button>

            {isStatsOpen && (
              <div className="rpg-stats-panel">
                <div className="stats-header">⚔️ HERO STATUS ATTRIBUTES</div>
                <div className="stats-row">
                  <span className="stats-label">Character Name:</span>
                  <span className="stats-value" style={{ color: '#a855f7' }}>
                    {playerName || (isHostInstance ? "Player 1" : "Player 2")}
                  </span>
                </div>
                <div className="stats-row">
                  <span className="stats-label">Attack Power:</span>
                  <span ref={statAtkRef} className="stats-value">22</span>
                </div>
                <div className="stats-row">
                  <span className="stats-label">Attack Rate:</span>
                  <span ref={statCdRef} className="stats-value">0.60s</span>
                </div>
                <div className="stats-row">
                  <span className="stats-label">Defense Block:</span>
                  <span ref={statDefRef} className="stats-value">0%</span>
                </div>
                <div className="stats-row">
                  <span className="stats-label">Crit Chance:</span>
                  <span ref={statCritRef} className="stats-value">0%</span>
                </div>
                <div className="stats-row">
                  <span className="stats-label">Movement Speed:</span>
                  <span ref={statSpdRef} className="stats-value">200 IPS</span>
                </div>
              </div>
            )}

            <div className="hud-bar-container">
              <div ref={hpFillRef} className="hud-bar-fill" style={{ background: '#ef4444', width: '100%' }}></div>
              <div ref={hpTextRef} className="hud-bar-text">HP 100/100</div>
            </div>
            <div className="hud-bar-container">
              <div ref={xpFillRef} className="hud-bar-fill" style={{ background: '#3b82f6', width: '0%' }}></div>
              <div ref={xpTextRef} className="hud-bar-text">LV{playerLevel} XP 0/80</div>
            </div>
          </div>
        )}

        {screen === 'playing' && playerLevel >= 10 && (
          <div className="mmo-hotbar-container">
            <div 
              className={`mmo-hotbar-slot ${!skillsState.bodyCutter?.learned ? 'not-learned' : (skillsState.bodyCutter.enabled ? 'learned' : 'disabled-toggle')}`}
              onClick={() => skillsState.bodyCutter?.learned && window.learnSkillTreeTech('bodyCutter')}
            >
              <span className="hotbar-key-bind">1</span>
              <span className="hotbar-icon">🩸</span>
              <span className="hotbar-name">B.Cutter</span>
              {skillsState.bodyCutter?.learned && (
                <span className={`hotbar-status-dot ${skillsState.bodyCutter.enabled ? 'on' : 'off'}`}>
                  {skillsState.bodyCutter.enabled ? 'ON' : 'OFF'}
                </span>
              )}
            </div>

            <div 
              className={`mmo-hotbar-slot ${!skillsState.shootingStar?.learned ? 'not-learned' : (skillsState.shootingStar.enabled ? 'learned' : 'disabled-toggle')}`}
              onClick={() => skillsState.shootingStar?.learned && window.learnSkillTreeTech('shootingStar')}
            >
              <span className="hotbar-key-bind">2</span>
              <span className="hotbar-icon">🌠</span>
              <span className="hotbar-name">S.Star</span>
              {skillsState.shootingStar?.learned && (
                <>
                  <span className={`hotbar-status-dot ${skillsState.shootingStar.enabled ? 'on' : 'off'}`}>
                    {skillsState.shootingStar.enabled ? 'ON' : 'OFF'}
                  </span>
                  {skillsState.shootingStar.enabled && skillsState.shootingStar.cd > 0 && (
                    <div className="hotbar-cooldown-overlay">{Math.ceil(skillsState.shootingStar.cd)}s</div>
                  )}
                </>
              )}
            </div>

            <div 
              className={`mmo-hotbar-slot ${!skillsState.cubeBash?.learned ? 'not-learned' : (skillsState.cubeBash.enabled ? 'learned' : 'disabled-toggle')}`}
              onClick={() => skillsState.cubeBash?.learned && window.learnSkillTreeTech('cubeBash')}
            >
              <span className="hotbar-key-bind">3</span>
              <span className="hotbar-icon">📦</span>
              <span className="hotbar-name">C.Bash</span>
              {skillsState.cubeBash?.learned && (
                <>
                  <span className={`hotbar-status-dot ${skillsState.cubeBash.enabled ? 'on' : 'off'}`}>
                    {skillsState.cubeBash.enabled ? 'ON' : 'OFF'}
                  </span>
                  {skillsState.cubeBash.enabled && skillsState.cubeBash.cd > 0 && (
                    <div className="hotbar-cooldown-overlay">{Math.ceil(skillsState.cubeBash.cd)}s</div>
                  )}
                </>
              )}
            </div>

            <div 
              className={`mmo-hotbar-slot ${!skillsState.vacuumSlash?.learned ? 'not-learned' : (skillsState.vacuumSlash.enabled ? 'learned' : 'disabled-toggle')}`}
              onClick={() => skillsState.vacuumSlash?.learned && window.learnSkillTreeTech('vacuumSlash')}
            >
              <span className="hotbar-key-bind">4</span>
              <span className="hotbar-icon">🌀</span>
              <span className="hotbar-name">V.Slash</span>
              {skillsState.vacuumSlash?.learned && (
                <>
                  <span className={`hotbar-status-dot ${skillsState.vacuumSlash.enabled ? 'on' : 'off'}`}>
                    {skillsState.vacuumSlash.enabled ? 'ON' : 'OFF'}
                  </span>
                  {skillsState.vacuumSlash.enabled && skillsState.vacuumSlash.cd > 0 && (
                    <div className="hotbar-cooldown-overlay">{Math.ceil(skillsState.vacuumSlash.cd)}s</div>
                  )}
                </>
              )}
            </div>

            {playerLevel >= 12 && (
              <>
                <div 
                  className="mmo-hotbar-ult-slot"
                  onClick={() => window.castArcaneCollapseUltimate()}
                  title="Arcane Collapse: Judgment of the Wizard Council"
                >
                  <span className="hotbar-key-bind">5</span>
                  <span className="hotbar-icon">🌌</span>
                  <span className="hotbar-name">A.Collapse</span>
                  {skillsState.arcaneCollapse?.cd > 0 && (
                    <div className="hotbar-cooldown-overlay">{Math.ceil(skillsState.arcaneCollapse.cd)}s</div>
                  )}
                </div>

                <div 
                  className="mmo-hotbar-ult-slot"
                  style={{ border: '3px solid #e879f9', background: 'radial-gradient(circle, #4c0519 0%, #0c0004 100%)' }}
                  onClick={() => window.castArcaneInstinctUltimate()}
                  title="Arcane Instinct: Transcendent State"
                >
                  <span className="hotbar-key-bind">6</span>
                  <span className="hotbar-icon">⚡</span>
                  <span className="hotbar-name">A.Instinct</span>
                  {skillsState.arcaneInstinct?.cd > 0 && (
                    <div className="hotbar-cooldown-overlay">{Math.ceil(skillsState.arcaneInstinct.cd)}s</div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {screen === 'playing' && playerLevel >= 5 && (
          <button 
            className="skill-tree-toggle-btn" 
            onClick={() => setIsTreeOpen(prev => !prev)}
          >
            {isTreeOpen ? "Hide Skills [K]" : "Show Skills [K]"}
          </button>
        )}

        {screen === 'playing' && playerLevel >= 5 && isTreeOpen && (
          <div className="skill-tree-container">
            <div className="skill-tree-title-row">
              <span className="skill-tree-title">✨ DEFENSIVE SKILLS (LV 5+)</span>
              <button className="skill-tree-close-x" onClick={() => setIsTreeOpen(false)}>✕</button>
            </div>
            
            <button 
              className={`skill-row-btn ${skillsState.berserk?.learned ? (skillsState.berserk.enabled ? 'learned' : 'disabled-toggle') : ''}`}
              onClick={() => window.learnSkillTreeTech('berserk')}
            >
              <span>🔥 Berserk Aura {skillsState.berserk?.learned ? (skillsState.berserk.enabled ? '[ON]' : '[OFF]') : ''}</span>
              {skillsState.berserk?.learned && (
                <span className="skill-cd-text">
                  {skillsState.berserk.duration > 0 ? `Active ${Math.ceil(skillsState.berserk.duration)}s` : `CD ${Math.ceil(skillsState.berserk.cd)}s`}
                </span>
              )}
            </button>
            <div className="skill-node-desc">Cuts your active shooting interval directly in half and increases bolt damage output by +50%.</div>

            <button 
              className={`skill-row-btn ${skillsState.haste?.learned ? (skillsState.haste.enabled ? 'learned' : 'disabled-toggle') : ''}`}
              onClick={() => window.learnSkillTreeTech('haste')}
            >
              <span>canny Massive Haste {skillsState.haste?.learned ? (skillsState.haste.enabled ? '[ON]' : '[OFF]') : ''}</span>
              {skillsState.haste?.learned && (
                <span className="skill-cd-text">
                  {skillsState.haste.duration > 0 ? `Active ${Math.ceil(skillsState.haste.duration)}s` : `CD ${Math.ceil(skillsState.haste.cd)}s`}
                </span>
              )}
            </button>
            <div className="skill-node-desc">Increases character movement velocity by +45% to easily kite massive groups of enemies.</div>

            <button 
              className={`skill-row-btn ${skillsState.fortify?.learned ? (skillsState.fortify.enabled ? 'learned' : 'disabled-toggle') : ''}`}
              onClick={() => window.learnSkillTreeTech('fortify')}
            >
              <span>🛡️ Fortify {skillsState.fortify?.learned ? (skillsState.fortify.enabled ? '[ON]' : '[OFF]') : ''}</span>
              {skillsState.fortify?.learned && <span className="skill-cd-text">PERMANENT</span>}
            </button>
            <div className="skill-node-desc">Hardens your wizard robes to grant a flat, permanent 25% damage reduction from all sources.</div>

            <button 
              className={`skill-row-btn ${skillsState.shield?.learned ? (skillsState.shield.enabled ? 'learned' : 'disabled-toggle') : ''}`}
              onClick={() => window.learnSkillTreeTech('shield')}
            >
              <span>🔮 Rigid's Defender {skillsState.shield?.learned ? (skillsState.shield.enabled ? '[ON]' : '[OFF]') : ''}</span>
              {skillsState.shield?.learned && (
                <span className="skill-cd-text">
                  {skillsState.shield.duration > 0 ? `Active ${Math.ceil(skillsState.shield.duration)}s` : `CD ${Math.ceil(skillsState.shield.cd)}s`}
                </span>
              )}
            </button>
            <div className="skill-node-desc">Spawns a glowing energy bubble around you that completely blocks oncoming damage.</div>

            {playerLevel >= 10 && (
              <>
                <div className="skill-tree-title-row" style={{ marginTop: '12px' }}>
                  <span className="skill-tree-title" style={{ color: '#f43f5e' }}>⚔️ OFFENSIVE SKILLS (LV 10+)</span>
                </div>

                <button 
                  className={`skill-row-btn ${skillsState.bodyCutter?.learned ? (skillsState.bodyCutter.enabled ? 'learned' : 'disabled-toggle') : ''}`}
                  onClick={() => window.learnSkillTreeTech('bodyCutter')}
                >
                  <span>🩸 Body Cutter {skillsState.bodyCutter?.learned ? (skillsState.bodyCutter.enabled ? '[ON]' : '[OFF]') : ''}</span>
                  {skillsState.bodyCutter?.learned && <span className="skill-cd-text">PASSIVE</span>}
                </button>
                <div className="skill-node-desc">Applies stigma/debuff and damage-over-time effects to your enemies.</div>

                <button 
                  className={`skill-row-btn ${skillsState.shootingStar?.learned ? (skillsState.shootingStar.enabled ? 'learned' : 'disabled-toggle') : ''}`}
                  onClick={() => window.learnSkillTreeTech('shootingStar')}
                >
                  <span>🌠 Shooting Star {skillsState.shootingStar?.learned ? (skillsState.shootingStar.enabled ? '[ON]' : '[OFF]') : ''}</span>
                  {skillsState.shootingStar?.learned && <span className="skill-cd-text">AUTO</span>}
                </button>
                <div className="skill-node-desc">Summons explosive cube effects for area damage.</div>

                <button 
                  className={`skill-row-btn ${skillsState.cubeBash?.learned ? (skillsState.cubeBash.enabled ? 'learned' : 'disabled-toggle') : ''}`}
                  onClick={() => window.learnSkillTreeTech('cubeBash')}
                >
                  <span>📦 Cube Bash {skillsState.cubeBash?.learned ? (skillsState.cubeBash.enabled ? '[ON]' : '[OFF]') : ''}</span>
                  {skillsState.cubeBash?.learned && <span className="skill-cd-text">AUTO</span>}
                </button>
                <div className="skill-node-desc">Cube-based control attack that can disable or stun enemies.</div>

                <button 
                  className={`skill-row-btn ${skillsState.vacuumSlash?.learned ? (skillsState.vacuumSlash.enabled ? 'learned' : 'disabled-toggle') : ''}`}
                  onClick={() => window.learnSkillTreeTech('vacuumSlash')}
                >
                  <span>🌀 Vacuum Slash {skillsState.vacuumSlash?.learned ? (skillsState.vacuumSlash.enabled ? '[ON]' : '[OFF]') : ''}</span>
                  {skillsState.vacuumSlash?.learned && <span className="skill-cd-text">AUTO</span>}
                </button>
                <div className="skill-node-desc">Powerful attack by slashing the air generating massive force to damage the enemy.</div>
              </>
            )}

            {playerLevel >= 12 && (
              <>
                <div className="skill-tree-title-row" style={{ marginTop: '12px' }}>
                  <span className="skill-tree-title" style={{ color: '#d946ef' }}>🌌 ULTIMATE SKILLS (LV 12+)</span>
                </div>

                <button 
                  className="skill-row-btn learned"
                  onClick={() => window.castArcaneCollapseUltimate()}
                >
                  <span>🌌 Arcane Collapse [Press 5]</span>
                  <span className="skill-cd-text">30s CD</span>
                </button>
                <div className="skill-node-desc" style={{ borderColor: '#d946ef' }}>
                  Shatters reality! Casts Time Lock (4s freeze), Temporal Slow, Arcane Burn DoT, Void Exhaustion, and 50% extra skill damage vulnerability onto all targets.
                </div>

                <button 
                  className="skill-row-btn learned"
                  style={{ border: '1px solid #e879f9' }}
                  onClick={() => window.castArcaneInstinctUltimate()}
                >
                  <span>⚡ Arcane Instinct [Press 6]</span>
                  <span className="skill-cd-text">45s CD</span>
                </button>
                <div className="skill-node-desc" style={{ borderColor: '#e879f9' }}>
                  Bypasses reality casting parameters! Freezes all screen targets (2s), triggers rapid consecutive offensive skills burst auto-casts (3s), and magnifies ALL hero stats by +250% (10s).
                </div>
              </>
            )}
          </div>
        )}

        {screen === 'playing' && !hasStarted && (
          <div className="hud-start-overlay">
            <div className="hud-start-modal">
              <h2>{isHostInstance ? "MOVE TO START GAME" : "WAITING FOR HOST"}</h2>
              <p>
                {isHostInstance 
                  ? "Press WASD or Arrow Keys to begin battle." 
                  : "The arena will initialize once the match host begins moving."}
              </p>
            </div>
          </div>
        )}

        {/* FIXED: Display static message banner for Player 2 when Host pauses the session room */}
        {screen === 'pause' && isNetworked && !netRef.current.isHost && (
          <div className="hud-start-overlay" style={{ zIndex: 110 }}>
            <div className="hud-start-modal" style={{ borderColor: '#a78bfa' }}>
              <h2>MATCH PAUSED</h2>
              <p>The Host has paused the session. Standing by for resumption...</p>
            </div>
          </div>
        )}

        {/* FIXED: Display reconnection auto-boot alert banner overlay window */}
        {hostExitedCountdown !== null && (
          <div className="hud-start-overlay" style={{ zIndex: 120 }}>
            <div className="hud-start-modal" style={{ borderColor: '#ef4444' }}>
              <h2>HOST EXITED THE ROOM</h2>
              <p style={{ fontSize: '1.2rem', color: '#f87171', fontWeight: 'bold', margin: '10px 0' }}>
                Exiting to main menu in {hostExitedCountdown}s...
              </p>
            </div>
          </div>
        )}

        {/* FIXED: LALABAS NA ITO SA POV NG HOST KAPAG NAG-EXIT SI PLAYER 2 */}
        {guestExitedAlert && (
          <div style={{
            position: 'absolute',
            top: '100px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(11, 8, 38, 0.96)',
            border: '2px solid #ef4444',
            boxShadow: '0 0 25px rgba(239, 68, 68, 0.6)',
            padding: '14px 28px',
            borderRadius: '8px',
            color: '#ffffff',
            fontFamily: 'monospace',
            zIndex: 9999,
            textAlign: 'center',
            pointerEvents: 'none'
          }}>
            <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: '#ef4444', letterSpacing: '1px' }}>
              ⚠️ ALLY LEFT THE MATCH
            </div>
            <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '4px' }}>
              Player 2 has disconnected. You can continue defending the realm alone!
            </div>
          </div>
        )}

        {screen === 'gameover' && isNetworked && (
          <div className="hud-start-overlay">
            <div className="hud-start-modal" style={{ borderColor: '#fbbf24' }}>
              <h2>RESTART MATCH VOTING</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: '1.5rem 0', fontSize: '1.1rem', textAlign: 'left', alignItems: 'center' }}>
                <div style={{ color: p1VotedRestart ? '#34d399' : '#f87171', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Player 1 (Host):</span>
                  <span>{p1VotedRestart ? "READY ✓" : "WAITING ⋯"}</span>
                </div>
                <div style={{ color: p2VotedRestart ? '#34d399' : '#f87171', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Player 2 (Guest):</span>
                  <span>{p2VotedRestart ? "READY ✓" : "WAITING ⋯"}</span>
                </div>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#9ca3af', lineHeight: '1.4' }}>
                Click your 'Play Again' button to cast or change your vote. Both players must agree to restart!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}