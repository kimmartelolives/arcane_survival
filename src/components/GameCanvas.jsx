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

  /* --- TOGGLE BUTTON OVERLAY FOR SKILL TREE --- */
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

  /* --- SKILL TREE LOWER RIGHT SIDE PANEL UI --- */
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

  /* --- MMO ACTION HOTBAR (LOWER MIDDLE) --- */
  .mmo-hotbar-container {
    position: absolute;
    bottom: 14px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 10px;
    background: rgba(11, 8, 38, 0.9);
    border: 2px solid #8b5cf6;
    padding: 6px 12px;
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
  .hotbar-icon {
    font-size: 1.3rem;
    margin-bottom: -1px;
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
  .hotbar-key-bind {
    position: absolute;
    top: 2px;
    left: 4px;
    font-size: 0.55rem;
    color: #fbbf24;
    font-weight: bold;
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
    background: rgba(0, 0, 0, 0.72);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fef08a;
    font-size: 1.1rem;
    font-weight: bold;
    pointer-events: none;
  }
`;

export default function GameCanvas({ screen, setScreen, hudRef, netRef, onLevelUpOffer }) {
  const canvasRef = useRef(null);
  const workerRef = useRef(null);
  
  const scoreValueRef = useRef(null);
  const waveValueRef = useRef(null);
  const hpFillRef = useRef(null);
  const hpTextRef = useRef(null);
  const xpFillRef = useRef(null);
  const xpTextRef = useRef(null);
  const audioCtxRef = useRef(null);

  const [hasStarted, setHasStarted] = useState(false);
  const [isWindowBlurred, setIsWindowBlurred] = useState(false);

  const [p1VotedRestart, setP1VotedRestart] = useState(false);
  const [p2VotedRestart, setP2VotedRestart] = useState(false);

  // States to control tree toggle visibility on screen 
  const [isTreeOpen, setIsTreeOpen] = useState(true);

  const [playerLevel, setPlayerLevel] = useState(1);
  
  const initSkills = () => ({
    berserk: { learned: false, enabled: true, cd: 0, duration: 0 },
    haste: { learned: false, enabled: true, cd: 0, duration: 0 },
    fortify: { learned: false, enabled: true },
    shield: { learned: false, enabled: true, cd: 0, duration: 0 },
    bodyCutter: { learned: false, enabled: true },
    shootingStar: { learned: false, enabled: true, cd: 0 },
    cubeBash: { learned: false, enabled: true, cd: 0 },
    vacuumSlash: { learned: false, enabled: true, cd: 0 }
  });

  const [skillsState, setSkillsState] = useState(initSkills());

  const engineRef = useRef({
    score: 0, wave: 1, waveT: 0, waveLen: 30, spawnT: 0, spawnRate: 2, boltDmg: 22,
    gameStarted: false, 
    p: null, p2: null, bullets: [], enemies: [], particles: [], gems: [], ambs: [],
    slashes: [], cubeBashes: [], stars: [],
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
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
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

  useEffect(() => {
    const net = netRef.current;
    if (!net) return;

    net.onCanvasMsg = (event, payload) => {
      const eng = engineRef.current;
      if (!eng) return;

      if (event === 'state_sync' && !net.isHost) {
        if (payload.gameStarted !== undefined) {
          eng.gameStarted = payload.gameStarted;
          setHasStarted(payload.gameStarted);
        }

        if (!eng.p) {
          eng.p = { x: W / 3, y: H / 2, r: 16, speed: 200, hp: 100, maxHp: 100, xp: 0, xpNext: 80, level: 1, shootCd: 0, shootRate: 0.6, multiShot: 1, inv: 0, dead: false };
        }
        if (!eng.p2) {
          eng.p2 = { x: W * 2 / 3, y: H / 2, r: 16, speed: 200, hp: 100, maxHp: 100, xp: 0, xpNext: 80, level: 1, shootCd: 0, shootRate: 0.6, multiShot: 1, inv: 0, dead: false };
        }

        eng.enemies = (payload.enemies || []).map(e => ({
          x: e.x, y: e.y, r: e.r, speed: e.speed, hp: e.hp, maxHp: e.maxHp,
          dmg: e.dmg, xp: e.xp, color: e.color, glow: e.glow, boss: e.boss, flash: e.flash || 0,
          stunnedTime: e.stunnedTime || 0, stigmaTime: e.stigmaTime || 0
        }));

        eng.gems = (payload.gems || []).map(g => ({ x: g.x, y: g.y, r: g.r, xp: g.xp, life: g.life }));
        eng.bullets = (payload.bullets || []).map(b => ({ x: b.x, y: b.y, vx: b.vx, vy: b.vy, r: b.r, life: b.life, p2: b.p2 }));
        
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
          if (payload.p1_skills) eng.p.skills = payload.p1_skills;
        }

        if (payload.p2 && eng.p2) {
          eng.p2.hp = payload.p2.hp;
          eng.p2.maxHp = payload.p2.maxHp;
          eng.p2.dead = payload.p2.dead;
          eng.p2.inv = payload.p2.inv ?? eng.p2.inv;
          eng.p2.level = payload.p2_level || eng.p2.level;
          eng.p2.xp = payload.p2_xp || eng.p2.xp;
          eng.p2.xpNext = payload.p2_xpNext || eng.p2.xpNext;
          if (payload.p2_skills) eng.p2.skills = payload.p2_skills;
          
          const hts = payload.ts || Date.now();
          eng.p2History.push({ t: hts, x: payload.p2.x, y: payload.p2.y });
          const now = Date.now();
          while (eng.p2History.length > 20) eng.p2History.shift();
          eng.p2History = eng.p2History.filter(s => (now - s.t) < 2000);
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
        if (window.runUpgrade) {
          window.runUpgrade(payload.choice, 'p2');
        }
      }

      if (event === 'guest_learned_skill' && net.isHost) {
        if (window.learnSkillTreeTech) {
          window.learnSkillTreeTech(payload.skillId, 'p2');
        }
      }
      
      if (event === 'offer_levelup' && !net.isHost) {
        onLevelUpOffer(payload.ups);
        setScreen('levelup');
      }
      
      if (event === 'game_over') {
        setScreen('gameover');
      }

      if (event === 'player_voted_restart') {
        if (net.isHost) {
          setP2VotedRestart(payload.voted);
        } else {
          setP1VotedRestart(payload.voted);
        }
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

  useEffect(() => {
    const eng = engineRef.current;
    if (screen === 'menu' || screen === 'lobby' || screen === 'playing') {
      
      setP1VotedRestart(false);
      setP2VotedRestart(false);
      setPlayerLevel(1);
      setIsTreeOpen(true); // reset tree panel visible on new matches
      setSkillsState(initSkills());

      if (screen === 'playing' && eng.gameStarted && eng.p && !eng.p.dead) {
        return;
      }

      const isCoop = Boolean(netRef.current && netRef.current.channel);
      
      eng.score = 0; eng.wave = 1; eng.waveT = 0; eng.waveLen = 30; eng.spawnT = 0; eng.spawnRate = 2; eng.boltDmg = 22;
      eng.bullets = []; eng.enemies = []; eng.particles = []; eng.gems = [];
      eng.slashes = []; eng.cubeBashes = []; eng.stars = [];
      eng.gameStarted = false; 
      setHasStarted(false);     
      
      eng.p = { x: isCoop ? W / 3 : W / 2, y: H / 2, r: 16, speed: 200, hp: 100, maxHp: 100, xp: 0, xpNext: 80, level: 1, shootCd: 0, shootRate: 0.6, multiShot: 1, inv: 0, dead: false, skills: initSkills() };
      eng.p1Target = { x: eng.p.x, y: eng.p.y, hp: 100, maxHp: 100, inv: 0, dead: false };
      eng.p1Render = { x: eng.p.x, y: eng.p.y };

      if (isCoop) {
        eng.p2 = { x: W * 2 / 3, y: H / 2, r: 16, speed: 200, hp: 100, maxHp: 100, xp: 0, xpNext: 80, level: 1, shootCd: 0, shootRate: 0.6, multiShot: 1, inv: 0, dead: false, skills: initSkills() };
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

  useEffect(() => {
    window.triggerRestartVote = () => {
      const net = netRef.current;
      const isCoop = Boolean(net && net.channel);

      if (!isCoop) {
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
  }, [p1VotedRestart, p2VotedRestart, setScreen, netRef]);

  useEffect(() => {
    window.learnSkillTreeTech = (skillId, forcedTarget = null) => {
      const eng = engineRef.current;
      if (!eng) return;
      
      const isCoop = Boolean(netRef.current && netRef.current.channel);
      let target = (isCoop && !netRef.current.isHost) ? eng.p2 : eng.p;
      if (forcedTarget === 'p2') target = eng.p2;
      if (forcedTarget === 'p1') target = eng.p;

      if (!target || target.dead) return;

      const baseSkills = ['berserk', 'haste', 'fortify', 'shield'];
      const attackSkills = ['bodyCutter', 'shootingStar', 'cubeBash', 'vacuumSlash'];
      
      if (baseSkills.includes(skillId) && target.level < 5) return; 
      if (attackSkills.includes(skillId) && target.level < 10) return;

      if (!target.skills) {
        target.skills = initSkills();
      }

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
      } else {
        // Toggle on/off state logic
        target.skills[skillId].enabled = !target.skills[skillId].enabled;
      }

      if (isCoop && !forcedTarget) {
        if (!netRef.current.isHost) {
          netRef.current.channel.send('guest_learned_skill', { skillId });
        }
      }

      if (target === ((isCoop && !netRef.current.isHost) ? eng.p2 : eng.p)) {
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
      const isCoop = Boolean(net.channel);
      const isHost = Boolean(net.isHost) || !isCoop;

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

        if (eng.gameStarted) {
          eng.waveT += dt;
          eng.spawnT += dt;

          if (!isCoop || isHost) {
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
              eng.enemies.push({ x: ex, y: ey, r: t.r, speed: t.speed + (eng.wave - 1) * 5, hp: t.hp + (eng.wave - 1) * 10, maxHp: t.hp + (eng.wave - 1) * 10, dmg: t.dmg, xp: t.xp, color: t.color, glow: t.glow, boss: t.boss, flash: 0, stunnedTime: 0, stigmaTime: 0 });
            }
            if (eng.waveT >= eng.waveLen) {
              eng.waveT = 0; eng.wave++;
              eng.waveLen = Math.max(15, 30 - eng.wave * 0.8);
              if (eng.wave % 3 === 0) {
                const t = ET[3];
                eng.enemies.push({ x: W/2, y: -40, r: t.r, speed: t.speed, hp: t.hp + eng.wave*20, maxHp: t.hp + eng.wave*20, dmg: t.dmg, xp: t.xp, color: t.color, glow: t.glow, boss: true, flash: 0, stunnedTime: 0, stigmaTime: 0 });
              }
            }
          }
        }

        const tickPlayerSkillTrackers = (playerObj) => {
          if (!playerObj || playerObj.dead) return;
          if (!playerObj.skills) {
            playerObj.skills = initSkills();
          }

          // Berserk Aura
          if (playerObj.skills.berserk?.learned) {
            if (playerObj.skills.berserk.cd > 0) playerObj.skills.berserk.cd -= dt;
            if (playerObj.skills.berserk.duration > 0) {
              playerObj.skills.berserk.duration -= dt;
            } else if (playerObj.skills.berserk.cd <= 0 && playerObj.skills.berserk.enabled !== false) {
              playerObj.skills.berserk.duration = 6; 
              playerObj.skills.berserk.cd = 15;      
            }
          }

          // Massive Haste
          if (playerObj.skills.haste?.learned) {
            if (playerObj.skills.haste.cd > 0) playerObj.skills.haste.cd -= dt;
            if (playerObj.skills.haste.duration > 0) {
              playerObj.skills.haste.duration -= dt;
            } else if (playerObj.skills.haste.cd <= 0 && playerObj.skills.haste.enabled !== false) {
              playerObj.skills.haste.duration = 6; 
              playerObj.skills.haste.cd = 15;      
            }
          }

          // Rigid's Defender Shield
          if (playerObj.skills.shield?.learned) {
            if (playerObj.skills.shield.cd > 0) playerObj.skills.shield.cd -= dt;
            if (playerObj.skills.shield.duration > 0) {
              playerObj.skills.shield.duration -= dt;
            } else if (playerObj.skills.shield.cd <= 0 && playerObj.skills.shield.enabled !== false) {
              playerObj.skills.shield.duration = 5; 
              playerObj.skills.shield.cd = 18;      
            }
          }

          // Shooting Star (AoE Explosive Cubes)
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

          // Cube Bash (Control field stun ring)
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

          // Vacuum Slash (Wide crescent penetrating slashes)
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

        if (isHost || !isCoop) {
          if (eng.p && !eng.p.dead) {
            tickPlayerSkillTrackers(eng.p);

            let calculatedSpeed = 200;
            if (eng.p.skills?.haste?.duration > 0 && eng.p.skills?.haste?.enabled !== false) calculatedSpeed *= 1.45; 

            eng.p.x = Math.max(eng.p.r, Math.min(W - eng.p.r, eng.p.x + mx * calculatedSpeed * dt));
            eng.p.y = Math.max(eng.p.r, Math.min(H - eng.p.r, eng.p.y + my * calculatedSpeed * dt));
            if (eng.p.inv > 0) eng.p.inv -= dt;
          }
          if (isCoop && eng.p2 && !eng.p2.dead && eng.gameStarted) {
            tickPlayerSkillTrackers(eng.p2);

            let calculatedSpeedp2 = 200;
            if (eng.p2.skills?.haste?.duration > 0 && eng.p2.skills?.haste?.enabled !== false) calculatedSpeedp2 *= 1.45;

            eng.p2.x = Math.max(eng.p2.r, Math.min(W - eng.p2.r, eng.p2.x + eng.p2Input.x * calculatedSpeedp2 * dt));
            eng.p2.y = Math.max(eng.p2.r, Math.min(H - eng.p2.r, eng.p2.y + eng.p2Input.y * calculatedSpeedp2 * dt));
            if (eng.p2.inv > 0) eng.p2.inv -= dt;
          }
        } else {
          if (eng.p2 && !eng.p2.dead) {
            tickPlayerSkillTrackers(eng.p2);

            let calculatedSpeedp2 = 200;
            if (eng.p2.skills?.haste?.duration > 0 && eng.p2.skills?.haste?.enabled !== false) calculatedSpeedp2 *= 1.45;

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

        const localTrackedObj = (isCoop && !isHost) ? eng.p2 : eng.p;
        if (localTrackedObj) {
          setPlayerLevel(localTrackedObj.level);
          if (localTrackedObj.skills) {
            setSkillsState({ ...localTrackedObj.skills });
          }
        }

        if (isCoop && netRef.current.channel) {
          syncTimer -= dt;
          if (syncTimer <= 0) {
            syncTimer = 0.033;
            if (!isHost) {
              netRef.current.channel.send('guest_input', { x: mx, y: my });
            } else {
              netRef.current.channel.send('state_sync', {
                gameStarted: eng.gameStarted, 
                enemies: eng.enemies.map(e => ({ x: Math.round(e.x), y: Math.round(e.y), r: e.r, speed: e.speed, hp: e.hp, maxHp: e.maxHp, dmg: e.dmg, xp: e.xp, color: e.color, glow: e.glow, boss: e.boss, flash: e.flash, stunnedTime: e.stunnedTime, stigmaTime: e.stigmaTime })),
                gems: eng.gems.map(g => ({ x: Math.round(g.x), y: Math.round(g.y), r: g.r, xp: g.xp, life: Math.round(g.life) })),
                bullets: eng.bullets.map(b => ({ x: Math.round(b.x), y: Math.round(b.y), vx: Math.round(b.vx), vy: Math.round(b.vy), r: b.r, life: b.life, p2: b.p2 })),
                score: eng.score, wave: eng.wave, waveT: eng.waveT, waveLen: eng.waveLen, boltDmg: eng.boltDmg,
                p1: eng.p ? { x: eng.p.x, y: eng.p.y, hp: eng.p.hp, maxHp: eng.p.maxHp, inv: eng.p.inv, dead: eng.p.dead } : null,
                p2: eng.p2 ? { x: eng.p2.x, y: eng.p2.y, hp: eng.p2.hp, maxHp: eng.p2.maxHp, inv: eng.p2.inv, dead: eng.p2.dead } : null,
                p1_skills: eng.p ? eng.p.skills : null,
                p2_skills: eng.p2 ? eng.p2.skills : null,
                ts: Date.now(),
                p2_level: eng.p2 ? eng.p2.level : 1, p2_xp: eng.p2 ? eng.p2.xp : 0, p2_xpNext: eng.p2 ? eng.p2.xpNext : 80
              });
            }
          }
        }

        // Processing Ultimate Attack Projectiles
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
            // Penetrating hits logic
            for (const enemy of eng.enemies) {
              if (Math.hypot(enemy.x - sl.x, enemy.y - sl.y) < enemy.r + 28) {
                if (!sl.hits.has(enemy)) {
                  sl.hits.add(enemy);
                  enemy.hp -= 42; 
                  enemy.flash = 0.15;
                  if (enemy.hp <= 0) {
                    enemy.deadTrigger = true;
                  }
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
              // Explode area trigger splash
              for (const enemy of eng.enemies) {
                if (Math.hypot(enemy.x - star.x, enemy.y - star.targetY) <= star.radius) {
                  enemy.hp -= 70;
                  enemy.flash = 0.2;
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
                  const activeRate = (eng.p.skills?.berserk?.duration > 0 && eng.p.skills?.berserk?.enabled !== false) ? (eng.p.shootRate * 0.5) : eng.p.shootRate;
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

            if (isCoop && eng.p2 && !eng.p2.dead) {
              eng.p2.shootCd -= dt;
              if (eng.p2.shootCd <= 0) {
                let near = null, nd = Infinity;
                for (const e of eng.enemies) {
                  const d = Math.hypot(e.x - eng.p2.x, e.y - eng.p2.y);
                  if (d < nd) { nd = d; near = e; }
                }
                if (near) {
                  const activeRatep2 = (eng.p2.skills?.berserk?.duration > 0 && eng.p2.skills?.berserk?.enabled !== false) ? (eng.p2.shootRate * 0.5) : eng.p2.shootRate;
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

          if (!isCoop || isHost) {
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
                  const isBerserkActive = b.p2 ? (eng.p2?.skills?.berserk?.duration > 0 && eng.p2?.skills?.berserk?.enabled !== false) : (eng.p?.skills?.berserk?.duration > 0 && eng.p?.skills?.berserk?.enabled !== false);
                  const calculatedDmg = isBerserkActive ? Math.ceil(eng.boltDmg * 1.5) : eng.boltDmg;

                  e.hp -= calculatedDmg; e.flash = 0.1;
                  
                  // Body Cutter Stigma application
                  const hasBodyCutter = b.p2 ? (eng.p2?.skills?.bodyCutter?.learned && eng.p2?.skills?.bodyCutter?.enabled !== false) : (eng.p?.skills?.bodyCutter?.learned && eng.p?.skills?.bodyCutter?.enabled !== false);
                  if (hasBodyCutter) {
                    e.stigmaTime = 4.0;
                  }

                  for(let k=0; k<5; k++) {
                    const pa = Math.random()*Math.PI*2; const ps = Math.random()*80+40;
                    eng.particles.push({ x: b.x, y: b.y, vx: Math.cos(pa)*ps, vy: Math.sin(pa)*ps, color: e.color, life: 0.3, ml: 0.3, r: 2 });
                  }
                  eng.bullets.splice(i, 1); hit = true;
                  if (e.hp <= 0) {
                    eng.score += e.boss ? 1500 : 100;
                    eng.gems.push({ x: e.x, y: e.y, r: 7, xp: e.xp, life: 12 });
                    eng.enemies.splice(j, 1);
                  }
                  break;
                }
              }
              if (hit) continue;
            }

            for (let j = eng.enemies.length - 1; j >= 0; j--) {
              const e = eng.enemies[j];

              // Handle Stigma DoT ticks
              if (e.stigmaTime > 0) {
                e.stigmaTime -= dt;
                e.hp -= 20 * dt; 
                if (Math.random() < 0.15) {
                  eng.particles.push({ x: e.x + (Math.random() - 0.5) * 10, y: e.y + (Math.random() - 0.5) * 10, vx: 0, vy: -15, color: '#f43f5e', life: 0.25, ml: 0.25, r: 1.5 });
                }
                if (e.hp <= 0) e.deadTrigger = true;
              }

              // Post-projectile verification state updates
              if (e.deadTrigger) {
                eng.score += e.boss ? 1500 : 100;
                eng.gems.push({ x: e.x, y: e.y, r: 7, xp: e.xp, life: 12 });
                eng.enemies.splice(j, 1);
                continue;
              }

              // Cube Bash movement suppression
              if (e.stunnedTime > 0) {
                e.stunnedTime -= dt;
              } else {
                let tx = (eng.p && !eng.p.dead) ? eng.p : null;
                if (isCoop && eng.p2 && !eng.p2.dead) {
                  const d1 = (!eng.p || eng.p.dead) ? Infinity : Math.hypot(e.x - eng.p.x, e.y - eng.p.y);
                  const d2 = Math.hypot(e.x - eng.p2.x, e.y - eng.p2.y);
                  if (d2 < d1) tx = eng.p2;
                }
                if (tx) {
                  const ea = Math.atan2(tx.y - e.y, tx.x - e.x);
                  e.x += Math.cos(ea) * e.speed * dt; e.y += Math.sin(ea) * e.speed * dt;
                }
              }
              
              if (e.flash > 0) e.flash -= dt;

              if (eng.p && !eng.p.dead && eng.p.inv <= 0 && Math.hypot(e.x - eng.p.x, e.y - eng.p.y) < e.r + eng.p.r) {
                let damageTaken = e.dmg;
                if (eng.p.skills?.shield?.duration > 0 && eng.p.skills?.shield?.enabled !== false) {
                  damageTaken = 0; 
                } else if (eng.p.skills?.fortify?.learned && eng.p.skills?.fortify?.enabled !== false) {
                  damageTaken *= 0.75; 
                }

                eng.p.hp -= damageTaken; eng.p.inv = 0.7;
                if (eng.p.hp <= 0) { eng.p.dead = true; if(!isCoop || !eng.p2 || eng.p2.dead) { if(isCoop) netRef.current.channel.send('game_over',{}); setScreen('gameover'); } }
              }
              if (isCoop && eng.p2 && !eng.p2.dead && eng.p2.inv <= 0 && Math.hypot(e.x - eng.p2.x, e.y - eng.p2.y) < e.r + eng.p2.r) {
                let damageTakenp2 = e.dmg;
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
              if (isCoop && eng.p2 && !eng.p2.dead) {
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
                if (isCoop && targetPlayer === eng.p2) {
                  eng.p2.xp += g.xp;
                  if (eng.p2.xp >= eng.p2.xpNext) {
                    eng.p2.xp -= eng.p2.xpNext; eng.p2.xpNext = Math.ceil(eng.p2.xpNext * 1.45); eng.p2.level++;
                    netRef.current.channel.send('offer_levelup', { ups: rollUpgradeOptions() });
                  }
                } else if (eng.p) {
                  eng.p.xp += g.xp;
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

          if (!isHost && isCoop) {
            for (let i = eng.bullets.length - 1; i >= 0; i--) {
              const b = eng.bullets[i]; b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
              if (b.life <= 0 || b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) {
                eng.bullets.splice(i, 1);
              }
            }
          }
        }

        const localTarget = (isCoop && !isHost) ? eng.p2 : eng.p;
        if (localTarget) {
          hudRef.current = { 
            score: eng.score, wave: eng.wave, waveT: eng.waveT, waveLen: eng.waveLen, 
            p: localTarget, p2: (isCoop && isHost) ? eng.p2 : eng.p,
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

    const renderLoop = () => {
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
      for (const b of eng.bullets) {
        ctx.save(); ctx.shadowColor = b.p2 ? '#fb923c' : '#e879f9'; ctx.shadowBlur = 16;
        ctx.fillStyle = b.p2 ? '#fed7aa' : '#f5d0fe'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }

      // Drawing custom Active Slashes
      if (eng.slashes) {
        for (const sl of eng.slashes) {
          ctx.save();
          ctx.translate(sl.x, sl.y);
          ctx.rotate(sl.angle);
          ctx.strokeStyle = 'rgba(168, 85, 247, 0.85)';
          ctx.lineWidth = 4;
          ctx.shadowBlur = 14;
          ctx.shadowColor = '#a855f7';
          ctx.beginPath();
          ctx.arc(0, 0, 26, -Math.PI / 2, Math.PI / 2);
          ctx.stroke();
          ctx.restore();
        }
      }

      // Drawing custom Cosmic Stars indicators
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

      // Drawing custom Cube Bashes
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

      for (const e of eng.enemies) {
        ctx.save(); ctx.fillStyle = e.flash > 0 ? '#fff' : e.color; ctx.shadowColor = e.flash > 0 ? '#fff' : e.glow; ctx.shadowBlur = e.boss ? 22 : 12;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        
        // Stun ice indicator halo
        if (e.stunnedTime > 0) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.strokeRect(e.x - e.r - 2, e.y - e.r - 2, (e.r * 2) + 4, (e.r * 2) + 4);
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
      const isCoop = Boolean(net.channel);
      const isHost = Boolean(net.isHost) || !isCoop;

      const p1X = isHost ? (eng.p ? eng.p.x : W/3) : eng.p1Render.x;
      const p1Y = isHost ? (eng.p ? eng.p.y : H/2) : eng.p1Render.y;

      const p2X = (isCoop && !isHost && eng.p2Render) ? eng.p2Render.x : (eng.p2 ? eng.p2.x : W*2/3);
      const p2Y = (isCoop && !isHost && eng.p2Render) ? eng.p2Render.y : (eng.p2 ? eng.p2.y : H/2);

      if (eng.p && !eng.p.dead) {
        ctx.save();
        const fl = eng.p.inv > 0 && Math.sin(eng.p.inv * 25) > 0;
        const pr = eng.p.r;
        const c = fl ? '#ef4444' : p1Color;
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
      }

      if (isCoop && eng.p2 && !eng.p2.dead) {
        ctx.save();
        const fl = eng.p2.inv > 0 && Math.sin(eng.p2.inv * 25) > 0;
        const pr = eng.p2.r;
        const c = fl ? '#ef4444' : p2Color;
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
      }

      renderAnimId = requestAnimationFrame(renderLoop);
    };
    renderAnimId = requestAnimationFrame(renderLoop);

    const down = (e) => { 
      eng.keys[e.key] = true; 
      if (e.key === 'Escape' && screen === 'playing') {
        setScreen('pause');
      }
      if ((e.key === 'k' || e.key === 'K' || e.key === 't' || e.key === 'T') && screen === 'playing') {
        setIsTreeOpen(prev => !prev);
      }
      // Added MMO hotkeys mapping for level 10 attack triggers
      if (screen === 'playing') {
        if (e.key === '1') window.learnSkillTreeTech('bodyCutter');
        if (e.key === '2') window.learnSkillTreeTech('shootingStar');
        if (e.key === '3') window.learnSkillTreeTech('cubeBash');
        if (e.key === '4') window.learnSkillTreeTech('vacuumSlash');
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
    
    const isCoop = Boolean(netRef.current && netRef.current.channel);
    let target = (isCoop && !netRef.current.isHost) ? eng.p2 : eng.p;
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
      eng.boltDmg += 14; 
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
          <div className="game-hud-top">
            <div>SCORE: <span ref={scoreValueRef}>0</span></div>
            <div ref={waveValueRef}>WAVE 1 | 30s</div>
          </div>
        )}

        {/* BOTTOM VITAL STATUS HUDS */}
        {screen === 'playing' && (
          <div className="game-hud-bottom">
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

        {/* --- MMO ACTION HOTBAR (LOWER MIDDLE) --- */}
        {screen === 'playing' && playerLevel >= 10 && (
          <div className="mmo-hotbar-container">
            {/* Body Cutter Slot */}
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

            {/* Shooting Star Slot */}
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

            {/* Cube Bash Slot */}
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

            {/* Vacuum Slash Slot */}
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
          </div>
        )}

        {/* --- TOGGLE BUTTON IN THE LOWER RIGHT CORNER --- */}
        {screen === 'playing' && playerLevel >= 5 && (
          <button 
            className="skill-tree-toggle-btn" 
            onClick={() => setIsTreeOpen(prev => !prev)}
          >
            {isTreeOpen ? "Hide Skills [K]" : "Show Skills [K]"}
          </button>
        )}

        {/* --- INTERACTIVE LOWER RIGHT SIDE SKILL TREE PANEL WITH DESCRIPTIONS --- */}
        {screen === 'playing' && playerLevel >= 5 && isTreeOpen && (
          <div className="skill-tree-container">
            <div className="skill-tree-title-row">
              <span className="skill-tree-title">✨ ELITE SKILL TREE (LV 5+)</span>
              <button className="skill-tree-close-x" onClick={() => setIsTreeOpen(false)}>✕</button>
            </div>
            
            {/* Berserk Aura */}
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

            {/* Massive Haste */}
            <button 
              className={`skill-row-btn ${skillsState.haste?.learned ? (skillsState.haste.enabled ? 'learned' : 'disabled-toggle') : ''}`}
              onClick={() => window.learnSkillTreeTech('haste')}
            >
              <span>👟 Massive Haste {skillsState.haste?.learned ? (skillsState.haste.enabled ? '[ON]' : '[OFF]') : ''}</span>
              {skillsState.haste?.learned && (
                <span className="skill-cd-text">
                  {skillsState.haste.duration > 0 ? `Active ${Math.ceil(skillsState.haste.duration)}s` : `CD ${Math.ceil(skillsState.haste.cd)}s`}
                </span>
              )}
            </button>
            <div className="skill-node-desc">Increases character movement velocity by +45% to easily kite massive groups of enemies.</div>

            {/* Fortify */}
            <button 
              className={`skill-row-btn ${skillsState.fortify?.learned ? (skillsState.fortify.enabled ? 'learned' : 'disabled-toggle') : ''}`}
              onClick={() => window.learnSkillTreeTech('fortify')}
            >
              <span>🛡️ Fortify {skillsState.fortify?.learned ? (skillsState.fortify.enabled ? '[ON]' : '[OFF]') : ''}</span>
              {skillsState.fortify?.learned && <span className="skill-cd-text">PERMANENT</span>}
            </button>
            <div className="skill-node-desc">Hardens your wizard robes to grant a flat, permanent 25% damage reduction from all sources.</div>

            {/* Rigid's Defender */}
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
            <div className="skill-node-desc">Spawns a glowing energy bubble around you that completely negates and blocks oncoming enemy damage.</div>

            {/* --- LEVEL 10 ATTACK SKILLS SUBSECTION --- */}
            {playerLevel >= 10 && (
              <>
                <div className="skill-tree-title-row" style={{ marginTop: '12px' }}>
                  <span className="skill-tree-title" style={{ color: '#f43f5e' }}>⚔️ ULTIMATE ATTACK SKILLS (LV 10+)</span>
                </div>

                {/* Body Cutter */}
                <button 
                  className={`skill-row-btn ${skillsState.bodyCutter?.learned ? (skillsState.bodyCutter.enabled ? 'learned' : 'disabled-toggle') : ''}`}
                  onClick={() => window.learnSkillTreeTech('bodyCutter')}
                >
                  <span>🩸 Body Cutter {skillsState.bodyCutter?.learned ? (skillsState.bodyCutter.enabled ? '[ON]' : '[OFF]') : ''}</span>
                  {skillsState.bodyCutter?.learned && <span className="skill-cd-text">PASSIVE</span>}
                </button>
                <div className="skill-node-desc">Applies stigma/debuff and damage-over-time effects to your enemies.</div>

                {/* Shooting Star */}
                <button 
                  className={`skill-row-btn ${skillsState.shootingStar?.learned ? (skillsState.shootingStar.enabled ? 'learned' : 'disabled-toggle') : ''}`}
                  onClick={() => window.learnSkillTreeTech('shootingStar')}
                >
                  <span>🌠 Shooting Star {skillsState.shootingStar?.learned ? (skillsState.shootingStar.enabled ? '[ON]' : '[OFF]') : ''}</span>
                  {skillsState.shootingStar?.learned && <span className="skill-cd-text">AUTO</span>}
                </button>
                <div className="skill-node-desc">Summons explosive cube effects for area damage.</div>

                {/* Cube Bash */}
                <button 
                  className={`skill-row-btn ${skillsState.cubeBash?.learned ? (skillsState.cubeBash.enabled ? 'learned' : 'disabled-toggle') : ''}`}
                  onClick={() => window.learnSkillTreeTech('cubeBash')}
                >
                  <span>📦 Cube Bash {skillsState.cubeBash?.learned ? (skillsState.cubeBash.enabled ? '[ON]' : '[OFF]') : ''}</span>
                  {skillsState.cubeBash?.learned && <span className="skill-cd-text">AUTO</span>}
                </button>
                <div className="skill-node-desc">Cube-based control attack that can disable or stun enemies.</div>

                {/* Vacuum Slash */}
                <button 
                  className={`skill-row-btn ${skillsState.vacuumSlash?.learned ? (skillsState.vacuumSlash.enabled ? 'learned' : 'disabled-toggle') : ''}`}
                  onClick={() => window.learnSkillTreeTech('vacuumSlash')}
                >
                  <span>🌀 Vacuum Slash {skillsState.vacuumSlash?.learned ? (skillsState.vacuumSlash.enabled ? '[ON]' : '[OFF]') : ''}</span>
                  {skillsState.vacuumSlash?.learned && <span className="skill-cd-text">AUTO</span>}
                </button>
                <div className="skill-node-desc">Powerful attack by slashing the air generating massive force to damage the enemy[cite: 3].</div>
              </>
            )}
          </div>
        )}

        {/* INITIALIZATION OVERLAY SCREEN */}
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

        {/* CO-OP RESTART VOTING OVERLAY STATUS FALLBACK */}
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