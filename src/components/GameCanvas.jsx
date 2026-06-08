import React, { useEffect, useRef } from 'react';

const W = 900;
const H = 560;

const ET = [
  { r: 13, speed: 65,  hp: 30,  dmg: 8,  xp: 15,  color: '#e2e8f0', glow: '#94a3b8', boss: false },
  { r: 11, speed: 105, hp: 20,  dmg: 12, xp: 20,  color: '#fb923c', glow: '#f97316', boss: false },
  { r: 14, speed: 135, hp: 55,  dmg: 20, xp: 35,  color: '#818cf8', glow: '#6366f1', boss: false },
  { r: 27, speed: 50,  hp: 260, dmg: 30, xp: 100, color: '#fbbf24', glow: '#f59e0b', boss: true },
];

export default function GameCanvas({ screen, setScreen, hudRef, netRef, onLevelUpOffer }) {
  const canvasRef = useRef(null);
  
  const scoreValueRef = useRef(null);
  const waveValueRef = useRef(null);
  const hpFillRef = useRef(null);
  const hpTextRef = useRef(null);
  const xpFillRef = useRef(null);
  const xpTextRef = useRef(null);

  const engineRef = useRef({
    score: 0, wave: 1, waveT: 0, waveLen: 30, spawnT: 0, spawnRate: 2, boltDmg: 22,
    p: null, p2: null, bullets: [], enemies: [], particles: [], gems: [], ambs: [],
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

  // 📡 Central Canvas Interceptor Pipeline
  useEffect(() => {
    const net = netRef.current;
    if (!net) return;

    net.onCanvasMsg = (event, payload) => {
      const eng = engineRef.current;
      if (!eng) return;
      
      if (event === 'state_sync' && !net.isHost) {
        if (!eng.p) {
          eng.p = { x: W / 3, y: H / 2, r: 16, speed: 200, hp: 100, maxHp: 100, xp: 0, xpNext: 80, level: 1, shootCd: 0, shootRate: 0.6, multiShot: 1, inv: 0, dead: false };
        }
        if (!eng.p2) {
          eng.p2 = { x: W * 2 / 3, y: H / 2, r: 16, speed: 200, hp: 100, maxHp: 100, xp: 0, xpNext: 80, level: 1, shootCd: 0, shootRate: 0.6, multiShot: 1, inv: 0, dead: false };
        }

        eng.enemies = (payload.enemies || []).map(e => ({
          x: e.x, y: e.y, r: e.r, speed: e.speed, hp: e.hp, maxHp: e.maxHp,
          dmg: e.dmg, xp: e.xp, color: e.color, glow: e.glow, boss: e.boss, flash: e.flash || 0
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
        }

        if (payload.p2 && eng.p2) {
          eng.p2.hp = payload.p2.hp;
          eng.p2.maxHp = payload.p2.maxHp;
          eng.p2.dead = payload.p2.dead;
          eng.p2.level = payload.p2_level || eng.p2.level;
          eng.p2.xp = payload.p2_xp || eng.p2.xp;
          eng.p2.xpNext = payload.p2_xpNext || eng.p2.xpNext;
          // Push authoritative update into history for interpolation on guest
          const hts = payload.ts || Date.now();
          eng.p2History.push({ t: hts, x: payload.p2.x, y: payload.p2.y });
          // keep history short and recent
          const now = Date.now();
          while (eng.p2History.length > 20) eng.p2History.shift();
          // also drop very old entries
          eng.p2History = eng.p2History.filter(s => (now - s.t) < 2000);
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
      
      if (event === 'offer_levelup' && !net.isHost) {
        onLevelUpOffer(payload.ups);
        setScreen('levelup');
      }
      
      if (event === 'game_over') {
        setScreen('gameover');
      }
    };

    return () => {
      net.onCanvasMsg = null;
    };
  }, [onLevelUpOffer, setScreen, netRef]);

  useEffect(() => {
    if (screen === 'menu' || screen === 'lobby') {
      const eng = engineRef.current;
      const isCoop = Boolean(netRef.current && netRef.current.channel);
      
      eng.score = 0; eng.wave = 1; eng.waveT = 0; eng.waveLen = 30; eng.spawnT = 0; eng.spawnRate = 2; eng.boltDmg = 22;
      eng.bullets = []; eng.enemies = []; eng.particles = []; eng.gems = [];
      
      eng.p = { x: isCoop ? W / 3 : W / 2, y: H / 2, r: 16, speed: 200, hp: 100, maxHp: 100, xp: 0, xpNext: 80, level: 1, shootCd: 0, shootRate: 0.6, multiShot: 1, inv: 0, dead: false };
      eng.p1Target = { x: eng.p.x, y: eng.p.y, hp: 100, maxHp: 100, inv: 0, dead: false };
      eng.p1Render = { x: eng.p.x, y: eng.p.y };

      if (isCoop) {
        eng.p2 = { x: W * 2 / 3, y: H / 2, r: 16, speed: 200, hp: 100, maxHp: 100, xp: 0, xpNext: 80, level: 1, shootCd: 0, shootRate: 0.6, multiShot: 1, inv: 0, dead: false };
        eng.p2Target = { x: eng.p2.x, y: H / 2, hp: 100, maxHp: 100, inv: 0, dead: false };
        eng.p2Render = { x: eng.p2.x, y: H / 2 };
      } else {
        eng.p2 = null;
      }
    }
  }, [screen, netRef]);

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
    let animId;
    let syncTimer = 0;

    const rollUpgradeOptions = () => {
      const fullPool = ['Vitality', 'Arcane Might', 'Rapid Fire', 'Gain Multi-Shot'];
      return [...fullPool].sort(() => 0.5 - Math.random()).slice(0, 3);
    };

    const loop = (ts) => {
      const dt = Math.min((ts - lastTime) / 1000, 0.05);
      lastTime = ts;

      // Determine host/co-op state robustly: if there's no network channel treat as host (solo)
      const net = netRef.current || {};
      const isCoop = Boolean(net.channel);
      const isHost = Boolean(net.isHost) || !isCoop;

      if (screen === 'playing' || screen === 'levelup') {
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
            eng.enemies.push({ x: ex, y: ey, r: t.r, speed: t.speed + (eng.wave - 1) * 5, hp: t.hp + (eng.wave - 1) * 10, maxHp: t.hp + (eng.wave - 1) * 10, dmg: t.dmg, xp: t.xp, color: t.color, glow: t.glow, boss: t.boss, flash: 0 });
          }
          if (eng.waveT >= eng.waveLen) {
            eng.waveT = 0; eng.wave++;
            eng.waveLen = Math.max(15, 30 - eng.wave * 0.8);
            if (eng.wave % 3 === 0) {
              const t = ET[3];
              eng.enemies.push({ x: W/2, y: -40, r: t.r, speed: t.speed, hp: t.hp + eng.wave*20, maxHp: t.hp + eng.wave*20, dmg: t.dmg, xp: t.xp, color: t.color, glow: t.glow, boss: true, flash: 0 });
            }
          }
        }

        let mx = 0, my = 0;
        if (eng.keys['ArrowLeft'] || eng.keys['a'] || eng.keys['A']) mx -= 1;
        if (eng.keys['ArrowRight'] || eng.keys['d'] || eng.keys['D']) mx += 1;
        if (eng.keys['ArrowUp'] || eng.keys['w'] || eng.keys['W']) my -= 1;
        if (eng.keys['ArrowDown'] || eng.keys['s'] || eng.keys['S']) my += 1;
        const ml = Math.hypot(mx, my);
        if (ml > 1) { mx /= ml; my /= ml; }

        if (isHost || !isCoop) {
          if (eng.p && !eng.p.dead) {
            eng.p.x = Math.max(eng.p.r, Math.min(W - eng.p.r, eng.p.x + mx * eng.p.speed * dt));
            eng.p.y = Math.max(eng.p.r, Math.min(H - eng.p.r, eng.p.y + my * eng.p.speed * dt));
            if (eng.p.inv > 0) eng.p.inv -= dt;
          }
          if (isCoop && eng.p2 && !eng.p2.dead) {
            eng.p2.x = Math.max(eng.p2.r, Math.min(W - eng.p2.r, eng.p2.x + eng.p2Input.x * eng.p2.speed * dt));
            eng.p2.y = Math.max(eng.p2.r, Math.min(H - eng.p2.r, eng.p2.y + eng.p2Input.y * eng.p2.speed * dt));
            if (eng.p2.inv > 0) eng.p2.inv -= dt;
          }
        } else {
          // GUEST SIDE LOGIC: Client-side prediction for P2 + smooth reconcile
            if (eng.p2 && !eng.p2.dead) {
              // Predict immediate movement locally
              eng.p2.x = Math.max(eng.p2.r, Math.min(W - eng.p2.r, eng.p2.x + mx * eng.p2.speed * dt));
              eng.p2.y = Math.max(eng.p2.r, Math.min(H - eng.p2.r, eng.p2.y + my * eng.p2.speed * dt));

              // Simpler approach: fast-follow prediction and gentle reconcile to authoritative state
              const predFactor = Math.min(1, dt * 18);
              eng.p2Render.x += (eng.p2.x - eng.p2Render.x) * predFactor;
              eng.p2Render.y += (eng.p2.y - eng.p2Render.y) * predFactor;

              if (eng.p2Target) {
                const reconcileFactor = 0.06; // gentle corrections
                const dx = eng.p2Target.x - eng.p2Render.x;
                const dy = eng.p2Target.y - eng.p2Render.y;
                const dist = Math.hypot(dx, dy);
                if (dist > 60) {
                  // snap on large divergence to avoid long visible drift
                  eng.p2Render.x = eng.p2Target.x;
                  eng.p2Render.y = eng.p2Target.y;
                } else {
                  eng.p2Render.x += dx * reconcileFactor;
                  eng.p2Render.y += dy * reconcileFactor;
                }
              }
            }

            // Keep Player1 render interpolation as before
            const f = Math.min(1, dt * 14);
            eng.p1Render.x += (eng.p1Target.x - eng.p1Render.x) * f;
            eng.p1Render.y += (eng.p1Target.y - eng.p1Render.y) * f;
        }

        if (isCoop && netRef.current.channel) {
          syncTimer -= dt;
          if (syncTimer <= 0) {
            syncTimer = 0.033; // INCREASED: Sends updates roughly 30 times a second
            if (!isHost) {
              netRef.current.channel.send('guest_input', { x: mx, y: my });
            } else {
              netRef.current.channel.send('state_sync', {
                enemies: eng.enemies.map(e => ({ x: Math.round(e.x), y: Math.round(e.y), r: e.r, speed: e.speed, hp: e.hp, maxHp: e.maxHp, dmg: e.dmg, xp: e.xp, color: e.color, glow: e.glow, boss: e.boss, flash: e.flash })),
                gems: eng.gems.map(g => ({ x: Math.round(g.x), y: Math.round(g.y), r: g.r, xp: g.xp, life: Math.round(g.life) })),
                bullets: eng.bullets.map(b => ({ x: Math.round(b.x), y: Math.round(b.y), vx: Math.round(b.vx), vy: Math.round(b.vy), r: b.r, life: b.life, p2: b.p2 })),
                score: eng.score, wave: eng.wave, waveT: eng.waveT, waveLen: eng.waveLen, boltDmg: eng.boltDmg,
                // Send precise player positions (floats) to avoid quantization jitter on clients
                p1: eng.p ? { x: eng.p.x, y: eng.p.y, hp: eng.p.hp, maxHp: eng.p.maxHp, inv: eng.p.inv, dead: eng.p.dead } : null,
                p2: eng.p2 ? { x: eng.p2.x, y: eng.p2.y, hp: eng.p2.hp, maxHp: eng.p2.maxHp, inv: eng.p2.inv, dead: eng.p2.dead } : null,
                ts: Date.now(),
                p2_level: eng.p2 ? eng.p2.level : 1, p2_xp: eng.p2 ? eng.p2.xp : 0, p2_xpNext: eng.p2 ? eng.p2.xpNext : 80
              });
            }
          }
        }

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
                eng.p.shootCd = eng.p.shootRate;
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
                eng.p2.shootCd = eng.p2.shootRate;
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
                e.hp -= eng.boltDmg; e.flash = 0.1;
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

          for (const e of eng.enemies) {
            let tx = (eng.p && !eng.p.dead) ? eng.p : null;
            if (isCoop && eng.p2 && !eng.p2.dead) {
              const d1 = (!eng.p || eng.p.dead) ? Infinity : Math.hypot(e.x - eng.p.x, e.y - eng.p.y);
              const d2 = Math.hypot(e.x - eng.p2.x, e.y - eng.p2.y);
              if (d2 < d1) tx = eng.p2;
            }
            if (!tx) continue;
            const ea = Math.atan2(tx.y - e.y, tx.x - e.x);
            e.x += Math.cos(ea) * e.speed * dt; e.y += Math.sin(ea) * e.speed * dt;
            if (e.flash > 0) e.flash -= dt;

            if (eng.p && !eng.p.dead && eng.p.inv <= 0 && Math.hypot(e.x - eng.p.x, e.y - eng.p.y) < e.r + eng.p.r) {
              eng.p.hp -= e.dmg; eng.p.inv = 0.7;
              if (eng.p.hp <= 0) { eng.p.dead = true; if(!isCoop || !eng.p2 || eng.p2.dead) { if(isCoop) netRef.current.channel.send('game_over',{}); setScreen('gameover'); } }
            }
            if (isCoop && eng.p2 && !eng.p2.dead && eng.p2.inv <= 0 && Math.hypot(e.x - eng.p2.x, e.y - eng.p2.y) < e.r + eng.p2.r) {
              eng.p2.hp -= e.dmg; eng.p2.inv = 0.7;
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

        const localTarget = (isCoop && !isHost) ? eng.p2 : eng.p;
        if (localTarget) {
          hudRef.current = { score: eng.score, wave: eng.wave, waveT: eng.waveT, waveLen: eng.waveLen, p: localTarget, p2: (isCoop && isHost) ? eng.p2 : eng.p };
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
      for (const e of eng.enemies) {
        ctx.save(); ctx.fillStyle = e.flash > 0 ? '#fff' : e.color; ctx.shadowColor = e.flash > 0 ? '#fff' : e.glow; ctx.shadowBlur = e.boss ? 22 : 12;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
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

      const p1X = isHost ? (eng.p ? eng.p.x : W/3) : eng.p1Render.x;
      const p1Y = isHost ? (eng.p ? eng.p.y : H/2) : eng.p1Render.y;

      // FIX: Ensure Guest's local P2 render relies on the fast-predicted `p2Render` to eliminate input lag
      const p2X = (isCoop && !isHost && eng.p2Render) ? eng.p2Render.x : (eng.p2 ? eng.p2.x : W*2/3);
      const p2Y = (isCoop && !isHost && eng.p2Render) ? eng.p2Render.y : (eng.p2 ? eng.p2.y : H/2);

      // Draw Player 1 (Violet)
      if (eng.p && !eng.p.dead) {
        ctx.save();
        const fl = eng.p.inv > 0 && Math.sin(eng.p.inv * 25) > 0;
        const pr = eng.p.r;
        const c = fl ? '#ef4444' : p1Color;
        ctx.shadowColor = c; ctx.shadowBlur = 22; ctx.fillStyle = c;
        ctx.beginPath(); ctx.arc(p1X, p1Y + 3, pr, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        ctx.fillStyle = fl ? '#b91c1c' : '#5b21b6';
        ctx.beginPath(); ctx.moveTo(p1X, p1Y - pr * 1.8); ctx.lineTo(p1X + pr * 0.9, p1Y - pr * 0.2); ctx.lineTo(p1X - pr * 0.9, p1Y - pr * 0.2); ctx.closePath(); ctx.fill();
        ctx.fillStyle = fl ? '#fca5a5' : '#c4b5fd';
        ctx.beginPath(); ctx.ellipse(p1X, p1Y - pr * 0.2, pr * 1.15, pr * 0.28, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#030111'; ctx.beginPath(); ctx.arc(p1X - pr * 0.32, p1Y + 2, pr * 0.18, 0, Math.PI * 2); ctx.arc(p1X + pr * 0.32, p1Y + 2, pr * 0.18, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      // Draw Player 2 (Orange)
      if (isCoop && eng.p2 && !eng.p2.dead) {
        ctx.save();
        const fl = eng.p2.inv > 0 && Math.sin(eng.p2.inv * 25) > 0;
        const pr = eng.p2.r;
        const c = fl ? '#ef4444' : p2Color;
        ctx.shadowColor = c; ctx.shadowBlur = 22; ctx.fillStyle = c;
        ctx.beginPath(); ctx.arc(p2X, p2Y + 3, pr, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        ctx.fillStyle = fl ? '#b91c1c' : '#c2410c';
        ctx.beginPath(); ctx.moveTo(p2X, p2Y - pr * 1.8); ctx.lineTo(p2X + pr * 0.9, p2Y - pr * 0.2); ctx.lineTo(p2X - pr * 0.9, p2Y - pr * 0.2); ctx.closePath(); ctx.fill();
        ctx.fillStyle = fl ? '#fca5a5' : '#ffedd5';
        ctx.beginPath(); ctx.ellipse(p2X, p2Y - pr * 0.2, pr * 1.15, pr * 0.28, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#030111'; ctx.beginPath(); ctx.arc(p2X - pr * 0.32, p2Y + 2, pr * 0.18, 0, Math.PI * 2); ctx.arc(p2X + pr * 0.32, p2Y + 2, pr * 0.18, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);

    const down = (e) => { 
      eng.keys[e.key] = true; 
      if (e.key === 'Escape' && screen === 'playing') {
        setScreen('pause');
      }
    };
    const up = (e) => { eng.keys[e.key] = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);

    return () => {
      cancelAnimationFrame(animId);
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
    console.log(`🔮 Applying Arcane Upgrade [Target: ${forcedTarget || 'Local'}]:`, token);
    
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

  return (
    <div id="wrap">
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <canvas ref={canvasRef} id="gameCanvas" />

        {(screen === 'playing' || screen === 'levelup') && (
          <div className="hud-layer">
            <div id="ping-display" className="hud-ping-overlay">PING: --ms</div>
            
            <div className="hud-pause-hint">[ESC] PAUSE</div>

            <div className="hud-score-module">
              <div className="hud-label">Score</div>
              <div ref={scoreValueRef} className="hud-score-value">0</div>
              <div ref={waveValueRef} className="hud-wave-value">WAVE 1 | 30s</div>
            </div>

            <div className="hud-status-bars">
              <div className="hud-bar-wrapper hp-bar">
                <div ref={hpFillRef} className="hud-bar-fill" style={{ width: '100%' }}></div>
                <div ref={hpTextRef} className="hud-bar-text">HP 100/100</div>
              </div>
              <div className="hud-bar-wrapper xp-bar">
                <div ref={xpFillRef} className="hud-bar-fill" style={{ width: '0%' }}></div>
                <div ref={xpTextRef} className="hud-bar-text">LV1 XP 0/80</div>
              </div>
            </div>

            <div className="hud-controls-hint">
              WASD/Arrows to move &nbsp;&middot;&nbsp; Auto-attacks nearest target &nbsp;&middot;&nbsp; Collect green gems for XP
            </div>
          </div>
        )}
      </div>
    </div>
  );
}