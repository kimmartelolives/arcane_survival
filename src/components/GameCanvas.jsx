import React, { useEffect, useRef } from 'react';

const W = 900;
const H = 560;

const ET = [
  { r: 13, speed: 65,  hp: 30,  dmg: 8,  xp: 15,  color: '#e2e8f0', glow: '#94a3b8', boss: false },
  { r: 11, speed: 105, hp: 20,  dmg: 12, xp: 20,  color: '#fb923c', glow: '#f97316', boss: false },
  { r: 14, speed: 135, hp: 55,  dmg: 20, xp: 35,  color: '#818cf8', glow: '#6366f1', boss: false },
  { r: 27, speed: 50,  hp: 260, dmg: 30, xp: 100, color: '#fbbf24', glow: '#f59e0b', boss: true },
];

export default function GameCanvas({ 
  gameState, 
  isCoop, 
  isHost, 
  coopChannel, 
  coopName, 
  p2Name, 
  onStateUpdate, 
  onGameOver,
  onLevelUpOffer
}) {
  const canvasRef = useRef(null);
  const keysRef = useRef({});
  const touchDirRef = useRef({ x: 0, y: 0 });
  const touchStartRef = useRef(null);
  
  // Game instance state stored outside React updates to ensure 60 FPS performance
  const engineRef = useRef({
    score: 0, wave: 1, waveT: 0, waveLen: 30, spawnT: 0, spawnRate: 2, boltDmg: 22,
    p: null, p2: null, bullets: [], enemies: [], particles: [], gems: [], ambs: [],
    p2Input: { x: 0, y: 0 }, p2Target: { x: 600, y: 280, hp: 100, maxHp: 100, inv: 0, dead: false },
    p2Render: { x: 600, y: 280, hp: 100, maxHp: 100, inv: 0 },
    inputSendT: 0, syncT: 0, floorPat: null
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

  useEffect(() => {
    const engine = engineRef.current;
    
    // Bind global messages arriving through Supabase to the canvas coordinates
    if (coopChannel && !isHost) {
      const handleSync = (event, payload) => {
        if (event === 'state_sync') {
          engine.enemies = payload.enemies || [];
          engine.gems = payload.gems || [];
          engine.bullets = payload.bullets || [];
          engine.score = payload.score ?? engine.score;
          engine.wave = payload.wave ?? engine.wave;
          engine.waveT = payload.waveT ?? engine.waveT;
          engine.waveLen = payload.waveLen ?? engine.waveLen;
          engine.boltDmg = payload.boltDmg ?? engine.boltDmg;
          if (payload.p1) engine.p2Target = payload.p1;
          if (payload.p2 && engine.p) {
            engine.p.hp = payload.p2.hp;
            engine.p.maxHp = payload.p2.maxHp;
            engine.p.dead = payload.p2.dead || false;
          }
          onStateUpdate({ score: engine.score, wave: engine.wave, waveT: engine.waveT, waveLen: engine.waveLen, p: engine.p, p2: engine.p2 });
        }
        if (event === 'offer_levelup') {
          onLevelUpOffer(payload.ups);
        }
      };
      
      // Wire up updates incoming from the host to the local network loop
      engine.onGuestMsg = handleSync;
    }
  }, [coopChannel, isHost]);

  // Handle Game Loops & Canvas Context Initialization
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = W; 
    canvas.height = H;

    // Build floor pattern
    const oc = document.createElement('canvas');
    oc.width = oc.height = 60;
    const ox = oc.getContext('2d');
    ox.fillStyle = '#0a061e'; ox.fillRect(0,0,60,60);
    ox.strokeStyle = 'rgba(139,92,246,0.07)'; ox.lineWidth = 0.5; ox.strokeRect(0,0,60,60);
    engineRef.current.floorPat = ctx.createPattern(oc, 'repeat');

    // Create ambience layers
    engineRef.current.ambs = Array.from({ length: 55 }, () => ({
      x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.8 + 0.4,
      vx: (Math.random() - 0.5) * 12, vy: -(Math.random() * 18 + 4),
      a: Math.random() * 0.5 + 0.15, t: Math.random(),
      c: ['#c4b5fd', '#818cf8', '#a78bfa', '#7c3aed'][Math.floor(Math.random() * 4)]
    }));

    // Setup initial player instances
    engineRef.current.p = { x: isCoop ? W / 3 : W / 2, y: H / 2, r: 16, speed: 200, hp: 100, maxHp: 100, xp: 0, xpNext: 80, level: 1, shootCd: 0, shootRate: 0.6, multiShot: 1, inv: 0, dead: false };
    if (isCoop) {
      engineRef.current.p2 = { x: W * 2 / 3, y: H / 2, r: 16, speed: 200, hp: 100, maxHp: 100, xp: 0, xpNext: 80, level: 1, shootCd: 0, shootRate: 0.6, multiShot: 1, inv: 0, dead: false };
    }

    let lastTime = performance.now();
    let animId;

    const gameLoop = (ts) => {
      const dt = Math.min((ts - lastTime) / 1000, 0.05);
      lastTime = ts;

      if (gameState === 'playing' || gameState === 'levelup') {
        updateEngine(dt);
      }
      renderEngine(ctx);
      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, isCoop]);

  const updateEngine = (dt) => {
    const eng = engineRef.current;
    if (gameState === 'levelup') {
      updateWorldOnly(dt);
      return;
    }

    eng.waveT += dt;
    eng.spawnT += dt;

    // Process waves & Spawning mechanics
    if (!isCoop || isHost) {
      if (eng.spawnT >= eng.spawnRate) {
        eng.spawnT = 0;
        eng.spawnRate = Math.max(0.35, 2 - eng.wave * 0.12);
        const pool = eng.wave < 2 ? [0] : eng.wave < 4 ? [0, 1] : [0, 1, 2];
        spawnEnemy(pool[Math.floor(Math.random() * pool.length)]);
      }
      if (eng.waveT >= eng.waveLen) {
        eng.waveT = 0;
        eng.wave++;
        eng.waveLen = Math.max(15, 30 - eng.wave * 0.8);
        if (eng.wave % 3 === 0) spawnEnemy(3);
      }
    }

    // Capture Local Controls
    let mx = 0, my = 0;
    const K = keysRef.current;
    if (K['ArrowLeft'] || K['a'] || K['A']) mx -= 1;
    if (K['ArrowRight'] || K['d'] || K['D']) mx += 1;
    if (K['ArrowUp'] || K['w'] || K['W']) my -= 1;
    if (K['ArrowDown'] || K['s'] || K['S']) my += 1;
    mx += touchDirRef.current.x;
    my += touchDirRef.current.y;

    const ml = Math.hypot(mx, my);
    if (ml > 1) { mx /= ml; my /= ml; }

    if (!eng.p.dead) {
      eng.p.x = Math.max(eng.p.r, Math.min(W - eng.p.r, eng.p.x + mx * eng.p.speed * dt));
      eng.p.y = Math.max(eng.p.r, Math.min(H - eng.p.r, eng.p.y + my * eng.p.speed * dt));
      if (eng.p.inv > 0) eng.p.inv -= dt;
    }

    // Process Multiplayer Network Synced Loops
    if (isCoop && eng.p2 && isHost && !eng.p2.dead) {
      eng.p2.x = Math.max(eng.p2.r, Math.min(W - eng.p2.r, eng.p2.x + eng.p2Input.x * eng.p2.speed * dt));
      eng.p2.y = Math.max(eng.p2.r, Math.min(H - eng.p2.r, eng.p2.y + eng.p2Input.y * eng.p2.speed * dt));
      if (eng.p2.inv > 0) eng.p2.inv -= dt;
    }

    if (isCoop && !isHost && eng.p2) {
      const lerpF = Math.min(1, dt * 16);
      eng.p2Render.x += (eng.p2Target.x - eng.p2Render.x) * lerpF;
      eng.p2Render.y += (eng.p2Target.y - eng.p2Render.y) * lerpF;
      eng.p2Render.hp += (eng.p2Target.hp - eng.p2Render.hp) * lerpF;
      eng.p2Render.maxHp = eng.p2Target.maxHp;
      eng.p2Render.inv = eng.p2Target.inv;
      
      eng.p2.x = eng.p2Render.x; eng.p2.y = eng.p2Render.y;
      eng.p2.hp = eng.p2Render.hp; eng.p2.maxHp = eng.p2Render.maxHp;
      eng.p2.inv = eng.p2Render.inv; eng.p2.dead = eng.p2Target.dead;
    }

    // Outbound real-time updates data sync handlers
    if (isCoop && !isHost && coopChannel) {
      eng.inputSendT -= dt;
      if (eng.inputSendT <= 0) {
        eng.inputSendT = 0.04;
        coopChannel.send('guest_input', { x: mx, y: my });
      }
    }

    if (isCoop && isHost && coopChannel) {
      eng.inputSendT -= dt;
      if (eng.inputSendT <= 0) {
        eng.inputSendT = 0.05;
        coopChannel.send('state_sync', {
          enemies: eng.enemies.map(e => ({ x: e.x, y: e.y, r: e.r, hp: e.hp, maxHp: e.maxHp, color: e.color, glow: e.glow, boss: e.boss, flash: e.flash, dmg: e.dmg, xp: e.xp, speed: e.speed })),
          gems: eng.gems.map(g => ({ x: g.x, y: g.y, r: g.r, xp: g.xp, life: g.life })),
          bullets: eng.bullets.map(b => ({ x: b.x, y: b.y, vx: b.vx, vy: b.vy, r: b.r, life: b.life, p2: b.p2 || false })),
          score: eng.score, wave: eng.wave, waveT: eng.waveT, waveLen: eng.waveLen, boltDmg: eng.boltDmg,
          p1: { x: eng.p.x, y: eng.p.y, hp: eng.p.hp, maxHp: eng.p.maxHp, inv: eng.p.inv, dead: eng.p.dead || false },
          p2: eng.p2 ? { hp: eng.p2.hp, maxHp: eng.p2.maxHp, dead: eng.p2.dead || false } : null
        });
      }
    }

    updateWorldOnly(dt);
    onStateUpdate({ score: eng.score, wave: eng.wave, waveT: eng.waveT, waveLen: eng.waveLen, p: eng.p, p2: eng.p2 });
  };

  const updateWorldOnly = (dt) => {
    const eng = engineRef.current;
    
    // Auto-fire checks
    if (!eng.p.dead && (!isCoop || isHost)) {
      eng.p.shootCd -= dt;
      if (eng.p.shootCd <= 0 && eng.enemies.length > 0) {
        let near = null, nd = Infinity;
        for (const e of eng.enemies) {
          const d = Math.hypot(e.x - eng.p.x, e.y - eng.p.y);
          if (d < nd) { nd = d; near = e; }
        }
        if (near) {
          eng.p.shootCd = eng.p.shootRate;
          const ba = Math.atan2(near.y - eng.p.y, near.x - eng.p.x);
          const sp = (eng.p.multiShot - 1) * 0.18;
          for (let i = 0; i < eng.p.multiShot; i++) {
            const a = ba + (i - (eng.p.multiShot - 1) / 2) * sp;
            eng.bullets.push({ x: eng.p.x, y: eng.p.y, vx: Math.cos(a) * 370, vy: Math.sin(a) * 370, r: 5, life: 2 });
          }
          emitParticles(eng.p.x, eng.p.y, '#c4b5fd', 4, 70, 0.25);
        }
      }
    }

    // Bullet movement collision sweeps
    if (!isCoop || isHost) {
      for (let i = eng.bullets.length - 1; i >= 0; i--) {
        const b = eng.bullets[i]; b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
        if (b.life <= 0) { eng.bullets.splice(i, 1); continue; }
        
        let hit = false;
        for (let j = eng.enemies.length - 1; j >= 0; j--) {
          const e = eng.enemies[j];
          if (Math.hypot(b.x - e.x, b.y - e.y) < b.r + e.r) {
            e.hp -= eng.boltDmg; e.flash = 0.1;
            emitParticles(b.x, b.y, e.color, 6, 90, 0.35);
            eng.bullets.splice(i, 1); hit = true;
            if (e.hp <= 0) {
              emitParticles(e.x, e.y, e.glow, 14, 140, 0.65);
              eng.gems.push({ x: e.x, y: e.y, r: 7, xp: e.xp, life: 10 });
              eng.score += e.boss ? 500 * eng.wave : 100;
              eng.enemies.splice(j, 1);
            }
            break;
          }
        }
        if (hit) continue;
      }
    }

    // Enemy movement and damage handling loops
    if (!isCoop || isHost) {
      for (const e of eng.enemies) {
        let tx = eng.p.dead ? null : eng.p;
        if (isCoop && eng.p2 && !eng.p2.dead) {
          const dp = eng.p.dead ? Infinity : Math.hypot(e.x - eng.p.x, e.y - eng.p.y);
          const dp2 = Math.hypot(e.x - eng.p2.x, e.y - eng.p2.y);
          if (dp2 < dp) tx = eng.p2;
        }
        if (!tx) continue;
        const a = Math.atan2(tx.y - e.y, tx.x - e.x);
        e.x += Math.cos(a) * e.speed * dt; e.y += Math.sin(a) * e.speed * dt;
        if (e.flash > 0) e.flash -= dt;

        if (!eng.p.dead && eng.p.inv <= 0 && Math.hypot(e.x - eng.p.x, e.y - eng.p.y) < e.r + eng.p.r) {
          eng.p.hp -= e.dmg; eng.p.inv = 0.8;
          emitParticles(eng.p.x, eng.p.y, '#ef4444', 8, 110, 0.45);
          if (eng.p.hp <= 0) { eng.p.dead = true; checkMatchEnd(); }
        }
        if (isCoop && eng.p2 && !eng.p2.dead && eng.p2.inv <= 0 && Math.hypot(e.x - eng.p2.x, e.y - eng.p2.y) < e.r + eng.p2.r) {
          eng.p2.hp -= e.dmg; eng.p2.inv = 0.8;
          emitParticles(eng.p2.x, eng.p2.y, '#ef4444', 8, 110, 0.45);
          if (eng.p2.hp <= 0) { eng.p2.dead = true; checkMatchEnd(); }
        }
      }
    }

    // Collect experience crystals
    if (!isCoop || isHost) {
      for (let i = eng.gems.length - 1; i >= 0; i--) {
        const g = eng.gems[i]; g.life -= dt;
        let tx = eng.p.x, ty = eng.p.y;
        if (isCoop && eng.p2 && !eng.p2.dead) {
          if (Math.hypot(eng.p2.x - g.x, eng.p2.y - g.y) < Math.hypot(eng.p.x - g.x, eng.p.y - g.y)) {
            tx = eng.p2.x; ty = eng.p2.y;
          }
        }
        const d = Math.hypot(tx - g.x, ty - g.y);
        if (d < 90 || g.life < 2) {
          const a = Math.atan2(ty - g.y, tx - g.x);
          g.x += Math.cos(a) * (d < 50 ? 280 : 140) * dt;
          g.y += Math.sin(a) * (d < 50 ? 280 : 140) * dt;
        }

        if (!eng.p.dead && Math.hypot(eng.p.x - g.x, eng.p.y - g.y) < eng.p.r + g.r) {
          eng.p.xp += g.xp; eng.gems.splice(i, 1);
          if (eng.p.xp >= eng.p.xpNext) {
            eng.p.xp -= eng.p.xpNext; eng.p.xpNext = Math.ceil(eng.p.xpNext * 1.45); eng.p.level++;
            onGameOver('levelup'); // Hook triggers level choice routing
          }
          continue;
        }
      }
    }

    // Particle lifecycle ticking elements
    for (let i = eng.particles.length - 1; i >= 0; i--) {
      const pt = eng.particles[i]; pt.x += pt.vx * dt; pt.y += pt.vy * dt;
      pt.vx *= 0.92; pt.vy *= 0.92; pt.life -= dt;
      if (pt.life <= 0) eng.particles.splice(i, 1);
    }
    for (const a of eng.ambs) {
      a.x += a.vx * dt; a.y += a.vy * dt; a.t -= dt * 0.25;
      if (a.t <= 0 || a.y < -10) { a.x = Math.random() * W; a.y = H + 10; a.t = 1; }
    }
  };

  const spawnEnemy = (ti) => {
    const eng = engineRef.current;
    const t = ET[ti]; const side = Math.floor(Math.random() * 4); let ex, ey;
    if (side === 0) { ex = Math.random() * W; ey = -30; }
    else if (side === 1) { ex = W + 30; ey = Math.random() * H; }
    else if (side === 2) { ex = Math.random() * W; ey = H + 30; }
    else { ex = -30; ey = Math.random() * H; }
    eng.enemies.push({ x: ex, y: ey, r: t.r, speed: t.speed + (eng.wave - 1) * 5, hp: t.hp + (eng.wave - 1) * 10, maxHp: t.hp + (eng.wave - 1) * 10, dmg: t.dmg, xp: t.xp, color: t.color, glow: t.glow, boss: t.boss, flash: 0 });
  };

  const emitParticles = (x, y, color, n, spd, life) => {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2; const s = (0.5 + Math.random() * 0.5) * spd;
      engineRef.current.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, color, life, ml: life, r: Math.random() * 3 + 1 });
    }
  };

  const checkMatchEnd = () => {
    const eng = engineRef.current;
    if (eng.p.dead && (!isCoop || !eng.p2 || eng.p2.dead)) {
      if (coopChannel) coopChannel.send('game_over', {});
      onGameOver('gameover');
    }
  };

  const renderEngine = (ctx) => {
    const eng = engineRef.current;
    ctx.fillStyle = '#030111'; ctx.fillRect(0, 0, W, H);
    if (eng.floorPat) { ctx.fillStyle = eng.floorPat; ctx.fillRect(0, 0, W, H); }

    // Ambience layer particles
    for (const a of eng.ambs) {
      ctx.save(); ctx.globalAlpha = a.a * a.t; ctx.fillStyle = a.c;
      ctx.shadowColor = a.c; ctx.shadowBlur = 6; ctx.beginPath();
      ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }

    // Render logic components map loops (Enemies, Gems, Bullets)
    for (const g of eng.gems) {
      ctx.save(); ctx.shadowColor = '#34d399'; ctx.shadowBlur = 13; ctx.fillStyle = '#34d399';
      ctx.beginPath(); ctx.moveTo(g.x, g.y - g.r); ctx.lineTo(g.x + g.r * 0.65, g.y);
      ctx.lineTo(g.x, g.y + g.r); ctx.lineTo(g.x - g.r * 0.65, g.y); ctx.closePath(); ctx.fill(); ctx.restore();
    }

    for (const b of eng.bullets) {
      ctx.save(); ctx.shadowColor = b.p2 ? '#fb923c' : '#e879f9'; ctx.shadowBlur = 20;
      ctx.fillStyle = b.p2 ? '#fed7aa' : '#f5d0fe'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }

    for (const e of eng.enemies) {
      ctx.save(); ctx.fillStyle = e.flash > 0 ? '#fff' : e.color; ctx.shadowColor = e.flash > 0 ? '#fff' : e.glow; ctx.shadowBlur = e.boss ? 24 : 13;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = '#030111'; ctx.beginPath(); ctx.arc(e.x - e.r * 0.35, e.y - e.r * 0.05, e.r * 0.2, 0, Math.PI * 2); ctx.arc(e.x + e.r * 0.35, e.y - e.r * 0.05, e.r * 0.2, 0, Math.PI * 2); ctx.fill();
      if (e.boss || e.hp < e.maxHp) {
        const bw = e.r * 2.6; const bh = 4; const bx = e.x - bw / 2; const by = e.y - e.r - 11;
        ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = e.boss ? '#fbbf24' : '#ef4444'; ctx.fillRect(bx, by, bw * (e.hp / e.maxHp), bh);
      }
      ctx.restore();
    }

    // Wizards Draw Loops
    if (isCoop && eng.p2 && !eng.p2.dead) {
      ctx.save(); const fl = eng.p2.inv > 0 && Math.sin(eng.p2.inv * 25) > 0;
      ctx.shadowColor = fl ? '#ef4444' : '#f97316'; ctx.shadowBlur = fl ? 32 : 22; ctx.fillStyle = fl ? '#ef4444' : '#f97316';
      ctx.beginPath(); ctx.arc(eng.p2.x, eng.p2.y + 3, eng.p2.r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    if (!eng.p.dead) {
      ctx.save(); const fl = eng.p.inv > 0 && Math.sin(eng.p.inv * 25) > 0;
      ctx.shadowColor = fl ? '#ef4444' : '#8b5cf6'; ctx.shadowBlur = fl ? 32 : 22; ctx.fillStyle = fl ? '#ef4444' : '#8b5cf6';
      ctx.beginPath(); ctx.arc(eng.p.x, eng.p.y + 3, eng.p.r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
  };

  // Capture event binding handlers
  useEffect(() => {
    const down = (e) => { keysRef.current[e.key] = true; };
    const up = (e) => { keysRef.current[e.key] = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  return <div id="wrap"><canvas ref={canvasRef} id="c" /></div>;
}