import React, { useState, useEffect, useRef } from 'react';

const UPGRADES_DB = [
  { id: 'hp', name: 'Vitality Core', desc: '+15 Max HP per level', statValue: 15, statSuffix: ' Max HP', baseCost: 50, costMult: 1.5, maxLevel: 20 },
  { id: 'dmg', name: 'Arcane Amplifier', desc: '+3 Base Damage per level', statValue: 3, statSuffix: ' Base Damage', baseCost: 75, costMult: 1.6, maxLevel: 20 },
  { id: 'def', name: 'Aegis Plating', desc: '+2 Armor Rating per level', statValue: 2, statSuffix: ' Armor Rating', baseCost: 60, costMult: 1.5, maxLevel: 15 },
  { id: 'crit', name: 'Fatal Precision', desc: '+1% Crit Chance per level', statValue: 1, statSuffix: '% Crit Chance', baseCost: 100, costMult: 1.8, maxLevel: 10 },
  { id: 'speed', name: 'Windwalker', desc: '+5 Move Speed per level', statValue: 5, statSuffix: ' Move Speed', baseCost: 40, costMult: 1.4, maxLevel: 10 },
]

export const SKINS_DB = [
  { id: 'default', name: 'Apprentice Robes', desc: 'The humble attire worn by aspiring mages beginning their journey into the arcane arts.', cost: 0, glow: '#a855f7', colors: { c: '#8b5cf6', robe: '#5b21b6', brim: '#c4b5fd' } },
  { id: 'shadow', name: 'Harbinger of the Void Realm', desc: 'A master of forbidden sorcery who draws power from the endless depths of the Void.', cost: 38500, glow: '#ef4444', colors: { c: '#991b1b', robe: '#450a0a', brim: '#7f1d1d' } },
  { id: 'igris', name: 'Abyssal Dreadlord', desc: 'A feared commander born from the endless abyss, clad in cursed armor and wreathed in crimson darkness.', cost: 38500, glow: '#dc2626', colors: { c: '#262626', robe: '#0a0a0a', brim: '#171717' } },
  { id: 'pyro', name: 'Demon of the Ashen Flare', desc: 'An infernal entity forged within primordial flames, leaving only ash in its wake.', cost: 40000, glow: '#f97316', colors: { c: '#ef4444', robe: '#7f1d1d', brim: '#fca5a5' } },
  { id: 'archmage', name: 'The Arcane Archon', desc: 'A legendary master of magic whose command over the arcane eclipses all mortal understanding.', cost: 40000, glow: '#fbbf24', colors: { c: '#fef08a', robe: '#b45309', brim: '#fef9c3' } },
  { id: 'sakura', name: 'Roseheart Sovereign', desc: 'Commands an endless storm of enchanted petals.', cost: 42000, glow: '#ec4899', colors: { c: '#f472b6', robe: '#ec4899', brim: '#fdf2f8' } },
  { id: 'pink_wings', name: 'Seraph of the Pink Eclipse', desc: 'A celestial sovereign whose wings paint the heavens in radiant pink light.', cost: 42000, glow: '#fb7185', colors: { c: '#fb7185', robe: '#f472b6', brim: '#fff5fa' } },
  { id: 'remembrance', name: 'Starlit Elegy', desc: 'Beyond time, beyond fate. The supreme manifestation of ancient elven magic and eternal memories.', cost: 45000, glow: '#60a5fa', colors: { c: '#f8fafc', robe: '#1e1b4b', brim: '#e0f2fe' } },
  { id: 'emperor', name: 'The Black Monarch', desc: 'A legendary tyrant whose shadow eclipsed the heavens themselves.', cost: 45000, glow: '#dc2626', colors: { c: '#171717', robe: '#0a0a0a', brim: '#050505' } },
  { id: 'infernal', name: 'Infernal Eclipse Sovereign', desc: 'The supreme ruler of the Eternal Eclipse. Cloaked in abyssal flames, every step bends darkness itself to their command.', cost: 45000, glow: '#e11d48', colors: { c: '#1f101a', robe: '#09050e', brim: '#1f0510' } },
  { id: 'empress', name: 'Empress of the Blushing Petals', desc: 'A divine guardian shrouded in radiant petals. Entire battlefields fall silent beneath her breathtaking grace.', cost: 50000, glow: '#fb7185', colors: { c: '#ffe4e6', robe: '#ffffff', brim: '#fda4af' } },
  { id: 'leviathan', name: 'Leviathan Empress of the Sacred Tide', desc: 'A divine Valkyrie chosen by Leviathan. Surrounded by celestial oceans, floating crystals, and holy tides that embody absolute grace and overwhelming power.', cost: 50000, glow: '#38bdf8', colors: { c: '#e0f2fe', robe: '#ffffff', brim: '#0284c7' } },
  { id: 'frieren', name: 'Mirrored Lotus: Eternal Remembrance', desc: 'A celestial relic born from mirrored lotus petals and drifting forget-me-not blossoms, reflecting an endless cycle of eternal promises and undying love.', cost: 50000, glow: '#60a5fa', colors: { c: '#f8fafc', robe: '#0f172a', brim: '#e0f2fe' } },
];

export const FAMILIARS_DB = [
   { 
    id: 'voidling', evolutions: { 1: '🌌 Voidling', 5: '🌌 Void Walker', 10: '🌌 Abyssal Maw' },
    type: 'Utility / Looter', desc: 'Creates a gravitational vacuum that automatically loots distant gems and potions.', 
    getStats: (lvl) => `+${lvl * 35} Vacuum Radius`,
    baseCost: 500, upgBase: 200, upgMult: 1.7, maxLevel: 10, color: '#d946ef' 
  },
  { 
    id: 'fairy', evolutions: { 1: '🧚 Sylvan Fairy', 5: '🧚 Forest Sprite', 10: '🧚 Nature Queen' },
    type: 'Support / Healer', desc: 'Passively heals the player. Healing output scales with your Max HP.', 
    getStats: (lvl) => `+${lvl * 6} Base Heal`,
    baseCost: 600, upgBase: 250, upgMult: 1.75, maxLevel: 10, color: '#86efac' 
  },
  { 
    id: 'wisp', evolutions: { 1: '🔥 Ignis Wisp', 5: '🔥 Blaze Spirit', 10: '🔥 Inferno Lord' },
    type: 'Summon / Mage', desc: 'Fires realistic chaotic fire orbs. Damage scales with Level & Wave.', 
    getStats: (lvl) => `+${lvl * 30} Damage | ${lvl >= 10 ? '3 Orbs' : (lvl >= 5 ? '2 Orbs' : '1 Orb')}`,
    baseCost: 600, upgBase: 250, upgMult: 1.75, maxLevel: 10, color: '#ef4444' 
  },
  { 
    id: 'frost', evolutions: { 1: '❄️ Frost Sprite', 5: '❄️ Winter Wraith', 10: '❄️ Glacial Sovereign' },
    type: 'AoE / Control', desc: 'Summons a glowing cyan snowflake blizzard that slows and damages enemies.', 
    getStats: (lvl) => `+${lvl * 5} Radius | -${(lvl * 0.15).toFixed(2)}s Cooldown`,
    baseCost: 800, upgBase: 300, upgMult: 1.8, maxLevel: 10, color: '#22d3ee' 
  },
  { 
    id: 'wind', evolutions: { 1: '🦅 Zephyr Falcon', 5: '🦅 Gale Gryphon', 10: '🦅 Tempest Roc' },
    type: 'AoE / Sweep', desc: 'Summons dynamic green wind vortex tornados that sweep through the map and shred enemies.', 
    getStats: (lvl) => `+${lvl * 25} Damage | +${lvl * 5} Radius | ${lvl >= 5 ? '2 Tornados' : '1 Tornado'}`,
    baseCost: 900, upgBase: 350, upgMult: 1.85, maxLevel: 10, color: '#10b981' 
  },
  { 
    id: 'golem', evolutions: { 1: '🪨 Stone Golem', 5: '🪨 Earth Titan', 10: '🪨 Mountain Colossus' },
    type: 'Heavy / Stun', desc: 'Smashes the ground creating a massive crater, lava cracks, and 3D stone spikes.', 
    getStats: (lvl) => `+${lvl * 50} Damage | +${lvl * 8} Radius`,
    baseCost: 900, upgBase: 350, upgMult: 1.85, maxLevel: 10, color: '#f59e0b' 
  },
  { 
    id: 'thunder', evolutions: { 1: '⚡ Spark Fox', 5: '⚡ Storm Wolf', 10: '⚡ Raiju' },
    type: 'Chain Lightning', desc: 'Unleashes erratic violet plasma chain lightning that branches to multiple targets.', 
    getStats: (lvl) => `+${lvl * 45} Damage | -${(lvl * 0.1).toFixed(1)}s Cooldown`,
    baseCost: 1000, upgBase: 400, upgMult: 1.9, maxLevel: 10, color: '#c084fc' 
  },
  { 
    id: 'shadow', evolutions: { 1: '🦇 Umbral Bat', 5: '🦇 Night Terror', 10: '🦇 Vampire Lord' },
    type: 'Burst / Physical', desc: 'Fires high-speed crimson shadow blades. Can critically hit and scales with Player Buffs.', 
    getStats: (lvl) => `+${lvl * 60} Damage | -${(lvl * 0.1).toFixed(1)}s Cooldown`,
    baseCost: 1200, upgBase: 500, upgMult: 2.0, maxLevel: 10, color: '#e11d48' 
  },
  { 
    id: 'light', evolutions: { 1: '👼 Holy Seraph', 5: '👼 Divine Valkyrie', 10: '👼 Archangel' },
    type: 'Defense / Shield', desc: 'Grants a Divine Absorption Shield with golden wings. Shield capacity scales heavily with Wave.', 
    getStats: (lvl) => `+${lvl * 250} Shield HP | -${(lvl * 1.0).toFixed(1)}s Cooldown`,
    baseCost: 1200, upgBase: 500, upgMult: 2.0, maxLevel: 10, color: '#fde047' 
  }
];

const drawAdvancedSkinAura = (ctx, x, y, radius, skinId, time, eng) => {
    if (!skinId || skinId === 'default') return;
    
    // --- HELPER 1: DYNAMIC LIGHTNING GENERATOR ---
    const drawLightning = (startX, startY, endX, endY, color, glowColor, segments = 5, branches = false) => {
        ctx.strokeStyle = color; ctx.shadowBlur = 15; ctx.shadowColor = glowColor; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(startX, startY);
        let currX = startX, currY = startY;
        for (let i = 1; i <= segments; i++) {
            const progress = i / segments;
            const targetX = startX + (endX - startX) * progress;
            const targetY = startY + (endY - startY) * progress;
            const jitterX = (Math.random() - 0.5) * 20;
            const jitterY = (Math.random() - 0.5) * 20;
            currX = targetX + jitterX; currY = targetY + jitterY;
            ctx.lineTo(currX, currY);
            
            if (branches && Math.random() < 0.3) {
                const bx = currX + (Math.random() - 0.5) * 30;
                const by = currY + (Math.random() - 0.5) * 30;
                ctx.moveTo(currX, currY); ctx.lineTo(bx, by); ctx.moveTo(currX, currY);
            }
        }
        ctx.stroke();
    };

    // --- HELPER 2: SHATTERED MAGIC SEAL ---
    const drawShatteredSeal = (cx, cy, r, rotation, color) => {
        ctx.save(); ctx.translate(cx, cy + 5); ctx.scale(1, 0.35); ctx.rotate(rotation);
        ctx.strokeStyle = color; ctx.shadowBlur = 20; ctx.shadowColor = color; ctx.lineWidth = 3;
        for(let i=0; i<8; i++) {
            if (Math.random() > 0.2) {
                ctx.beginPath(); ctx.arc(0, 0, r, (i*Math.PI)/4, ((i+0.8)*Math.PI)/4); ctx.stroke();
            }
        }
        ctx.setLineDash([15, 10, 5, 20]); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(0, 0, r * 0.8, 0, Math.PI*2); ctx.stroke();
        ctx.restore();
    };

    if (skinId === 'shadow') {
        ctx.globalCompositeOperation = 'source-over';
        const twitch = Math.random() > 0.8 ? 5 : 0; 
        const grad = ctx.createRadialGradient(x, y+3, 0, x, y+3, radius*3 + twitch);
        grad.addColorStop(0, '#000000'); grad.addColorStop(0.3, 'rgba(100, 0, 0, 0.9)'); grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(x, y+3, radius*3.5, 0, Math.PI*2); ctx.fill();

        ctx.fillStyle = 'rgba(10, 0, 0, 0.8)';
        for(let i=0; i<6; i++) {
            const clawAng = time*0.001 + (i * Math.PI/3) + Math.sin(time*0.005+i)*0.5;
            ctx.beginPath(); ctx.moveTo(x, y+5);
            ctx.quadraticCurveTo(x + Math.cos(clawAng+0.5)*radius*3, y+5 + Math.sin(clawAng+0.5)*radius*1.5, x + Math.cos(clawAng)*radius*5, y+5 + Math.sin(clawAng)*radius*2.5);
            ctx.quadraticCurveTo(x + Math.cos(clawAng-0.2)*radius*2, y+5 + Math.sin(clawAng-0.2)*radius*1, x, y+5);
            ctx.fill();
        }

        if (!eng.demonEyes) eng.demonEyes = [];
        if (Math.random() < 0.1 && eng.demonEyes.length < 5) eng.demonEyes.push({ox: (Math.random()-0.5)*100, oy: (Math.random()-0.5)*80 - 20, life: 1, blink: 0});
        eng.demonEyes.forEach((eye, i) => {
            eye.life -= 0.02; eye.blink += 0.2;
            if (eye.life <= 0) { eng.demonEyes.splice(i, 1); return; }
            ctx.save(); ctx.translate(x + eye.ox, y + eye.oy);
            const eyeOpen = Math.abs(Math.sin(eye.blink)) * 6; 
            ctx.shadowBlur = 15; ctx.shadowColor = '#ff0000';
            ctx.fillStyle = `rgba(180, 0, 0, ${eye.life})`; ctx.beginPath(); ctx.ellipse(0, 0, 10, eyeOpen, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = `rgba(0, 0, 0, ${eye.life})`; ctx.beginPath(); ctx.ellipse(0, 0, 2, eyeOpen*0.8, 0, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        });

        ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
        for(let i=0; i<8; i++) {
            if(Math.random() > 0.5) ctx.fillRect(x + (Math.random()-0.5)*radius*5, y + (Math.random()-0.5)*radius*6, Math.random()*15, Math.random()*3);
        }
    }

    else if (skinId === 'pyro') {
        ctx.globalCompositeOperation = 'source-over'; 
        drawShatteredSeal(x, y, radius * 5, time * 0.001, '#ff0000');
        if (Math.random() < 0.2) {
            const lx = x + (Math.random()-0.5)*radius*8;
            const ly = y + 10 + (Math.random()-0.5)*radius*4;
            drawLightning(x, y-radius*2, lx, ly, '#ffffff', '#ff0000', 4, true);
            drawLightning(x, y-radius*2, lx, ly, '#ff0000', '#ff0000', 4, false); 
        }

        if (!eng.pyroSmoke) eng.pyroSmoke = [];
        if (eng.pyroSmoke.length < 25) {
            eng.pyroSmoke.push({
                ox: (Math.random()-0.5)*60, oy: 10 + Math.random()*10,
                vy: 1 + Math.random()*2, size: 15 + Math.random()*20, life: 1, 
                isFire: Math.random() > 0.6 
            });
        }
        eng.pyroSmoke.forEach((s, i) => {
            s.oy -= s.vy; s.ox += Math.sin(time*0.005 + i); s.life -= 0.015; s.size += 0.2;
            if (s.life <= 0) { eng.pyroSmoke.splice(i, 1); return; }
            
            ctx.beginPath(); ctx.arc(x + s.ox, y + s.oy, s.size, 0, Math.PI*2);
            if (s.isFire) {
                ctx.fillStyle = `rgba(255, 50, 0, ${s.life * 0.6})`;
                ctx.shadowBlur = 20; ctx.shadowColor = '#ff0000';
            } else {
                ctx.fillStyle = `rgba(10, 5, 5, ${s.life * 0.8})`; 
                ctx.shadowBlur = 10; ctx.shadowColor = '#000000';
            }
            ctx.fill();
        });

        ctx.globalCompositeOperation = 'lighter'; 
        const heatGrad = ctx.createRadialGradient(x, y, 0, x, y, radius * 4);
        heatGrad.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        heatGrad.addColorStop(0.2, 'rgba(255, 50, 0, 0.6)');
        heatGrad.addColorStop(1, 'rgba(255, 0, 0, 0)');
        ctx.fillStyle = heatGrad; ctx.beginPath(); ctx.arc(x, y, radius*4, 0, Math.PI*2); ctx.fill();

        ctx.fillStyle = '#ffaa00'; ctx.shadowBlur = 10; ctx.shadowColor = '#ffaa00';
        for(let i=0; i<10; i++) {
            const ex = x + Math.sin(time*0.01 + i)*radius*4;
            const ey = y - (time*0.1 + i*20)%80;
            ctx.beginPath(); ctx.arc(ex, ey, Math.random()*3, 0, Math.PI*2); ctx.fill();
        }
    }

    else if (skinId === 'archmage') {
        ctx.globalCompositeOperation = 'source-over'; 
        if (!eng.stormClouds) eng.stormClouds = [];
        if (eng.stormClouds.length < 20) {
            eng.stormClouds.push({
                ang: Math.random() * Math.PI * 2, dist: radius + Math.random()*radius*4,
                size: 20 + Math.random()*25, speed: 0.02 + Math.random()*0.03, life: 1,
                yOff: (Math.random()-0.5)*60
            });
        }
        eng.stormClouds.forEach((cloud, i) => {
            cloud.ang += cloud.speed; cloud.life -= 0.01;
            if (cloud.life <= 0) { eng.stormClouds.splice(i, 1); return; }
            
            const cx = x + Math.cos(cloud.ang) * cloud.dist;
            const cy = y + cloud.yOff + Math.sin(time*0.002 + i)*10;
            
            const cloudGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cloud.size);
            cloudGrad.addColorStop(0, `rgba(20, 0, 40, ${cloud.life * 0.9})`); 
            cloudGrad.addColorStop(0.5, `rgba(70, 0, 150, ${cloud.life * 0.5})`); 
            cloudGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            ctx.fillStyle = cloudGrad; ctx.shadowBlur = 0;
            ctx.beginPath(); ctx.arc(cx, cy, cloud.size, 0, Math.PI*2); ctx.fill();
        });

        ctx.globalCompositeOperation = 'lighter'; 
        drawShatteredSeal(x, y, radius * 5.5, time * -0.002, '#00ffff');
        drawShatteredSeal(x, y, radius * 3.5, time * 0.003, '#c084fc');

        const lightningColors = [ { c: '#ffffff', g: '#00ffff' }, { c: '#ffffff', g: '#c084fc' } ];
        for(let i=0; i<2; i++) {
            if (Math.random() < 0.6) { 
                const startX = x + (Math.random()-0.5)*radius*2;
                const startY = y - radius*3 + (Math.random()-0.5)*radius*2;
                const endX = x + (Math.random()-0.5)*radius*10;
                const endY = y + 15 + (Math.random()-0.5)*radius*4;
                const theme = lightningColors[Math.floor(Math.random()*lightningColors.length)];
                drawLightning(startX, startY, endX, endY, theme.c, theme.g, 5, true);
            }
        }

        const stormCore = ctx.createRadialGradient(x, y, 0, x, y, radius * 4);
        stormCore.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        stormCore.addColorStop(0.3, 'rgba(0, 255, 255, 0.4)');
        stormCore.addColorStop(1, 'rgba(168, 85, 247, 0)');
        ctx.fillStyle = stormCore; ctx.beginPath(); ctx.arc(x, y, radius*4, 0, Math.PI*2); ctx.fill();

        for(let i=0; i<4; i++) {
            const ang = time * 0.004 + (i * Math.PI/2);
            const px = x + Math.cos(ang) * radius * 4.5;
            const py = y - radius + Math.sin(ang * 2) * 15;
            
            ctx.save(); ctx.translate(px, py); ctx.rotate(time*0.01 + i);
            ctx.fillStyle = '#ffffff'; ctx.shadowBlur = 20; ctx.shadowColor = '#00ffff';
            ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(6, 0); ctx.lineTo(0, 8); ctx.lineTo(-6, 0); ctx.fill();
            ctx.restore();
            
            if (Math.random() > 0.5) drawLightning(x, y, px, py, '#ffffff', '#00ffff', 2, false);
        }
    }

    else if (skinId === 'sakura') {
        ctx.globalCompositeOperation = 'lighter'; 
        const pulse = Math.sin(time * 0.003);
        ctx.save(); ctx.translate(x, y + 5); ctx.scale(1, 0.4); ctx.rotate(time * 0.0005);
        ctx.strokeStyle = `rgba(236, 72, 153, ${0.6 + pulse * 0.2})`; 
        ctx.shadowColor = '#f472b6'; ctx.shadowBlur = 15; ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            ctx.rotate(Math.PI / 4);
            ctx.quadraticCurveTo(radius * 3, radius * 3, radius * 6, 0);
            ctx.quadraticCurveTo(radius * 3, -radius * 3, 0, 0);
        }
        ctx.stroke(); ctx.restore();

        ctx.globalCompositeOperation = 'source-over'; 
        if (!eng.pinkSmoke) eng.pinkSmoke = [];
        if (eng.pinkSmoke.length < 15 && Math.random() < 0.2) {
            eng.pinkSmoke.push({
                ox: (Math.random()-0.5)*radius*6, oy: (Math.random()-0.5)*radius*3,
                vy: 0.3 + Math.random()*0.7, size: 10 + Math.random()*15, life: 1
            });
        }
        eng.pinkSmoke.forEach((s, i) => {
            s.oy -= s.vy; s.ox += Math.sin(time*0.002 + i)*0.5; s.life -= 0.01; s.size += 0.2;
            if (s.life <= 0) { eng.pinkSmoke.splice(i, 1); return; }
            
            const smokeGrad = ctx.createRadialGradient(x+s.ox, y+s.oy, 0, x+s.ox, y+s.oy, s.size);
            smokeGrad.addColorStop(0, `rgba(253, 164, 175, ${s.life * 0.6})`); 
            smokeGrad.addColorStop(1, 'rgba(255, 228, 230, 0)');
            
            ctx.fillStyle = smokeGrad; ctx.beginPath(); ctx.arc(x+s.ox, y+s.oy, s.size, 0, Math.PI*2); ctx.fill();
        });

        ctx.globalCompositeOperation = 'lighter'; 
        if (!eng.sakuraParticles) eng.sakuraParticles = [];
        if (eng.sakuraParticles.length < 20 && Math.random() < 0.1) {
            eng.sakuraParticles.push({
                ox: (Math.random() - 0.5) * 60, y: -60, 
                vy: 0.5 + Math.random() * 1.0, rot: Math.random() * Math.PI * 2, rs: (Math.random() - 0.5) * 0.05,
                size: 2 + Math.random() * 3, life: 1
            });
        }
        eng.sakuraParticles.forEach((p, i) => {
            p.y += p.vy; p.rot += p.rs; p.life -= 0.008;
            if (p.life <= 0 || p.y > 10) { eng.sakuraParticles.splice(i, 1); return; }

            ctx.save(); ctx.translate(x + p.ox, y + p.y); ctx.rotate(p.rot);
            ctx.fillStyle = `rgba(251, 207, 232, ${p.life})`; 
            ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size * 2, 0, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        });

        if (!eng.sakuraHearts) eng.sakuraHearts = [];
        if (eng.sakuraHearts.length < 25 && Math.random() < 0.2) {
            eng.sakuraHearts.push({
                ox: (Math.random() - 0.5) * radius * 3.5, y: radius, 
                vy: 0.5 + Math.random() * 0.8, 
                size: 3 + Math.random() * 5, life: 1,
                rot: Math.random() * Math.PI, rs: (Math.random()-0.5)*0.02 
            });
        }
        eng.sakuraHearts.forEach((h, i) => {
            h.y -= h.vy; h.life -= 0.005; h.rot += h.rs;
            if (h.life <= 0) { eng.sakuraHearts.splice(i, 1); return; }

            ctx.save(); ctx.translate(x + h.ox, y + h.y); ctx.rotate(h.rot);
            const hSize = h.size * (1 + Math.sin(time * 0.005 + i) * 0.2); 
            const hColor = `rgba(236, 72, 153, ${h.life * 0.9})`; 

            ctx.beginPath(); ctx.moveTo(0, -hSize * 0.3);
            ctx.bezierCurveTo(-hSize * 0.5, -hSize * 0.8, -hSize * 1.0, -hSize * 0.3, 0, hSize * 1.0); 
            ctx.bezierCurveTo(hSize * 1.0, -hSize * 0.3, hSize * 0.5, -hSize * 0.8, 0, -hSize * 0.3);
            ctx.fillStyle = hColor; ctx.shadowBlur = 15; ctx.shadowColor = '#ec4899';
            ctx.fill(); ctx.restore();
        });

        ctx.fillStyle = '#ffffff'; ctx.shadowBlur = 10; ctx.shadowColor = '#fdf2f8';
        for(let i=0; i<10; i++) {
            if(Math.random()>0.5) {
                const ex = x + Math.sin(time*0.01 + i)*radius*3;
                const ey = y - (time*0.05 + i*20)%100;
                ctx.beginPath(); ctx.arc(ex, ey, 1+Math.random()*2, 0, Math.PI*2); ctx.fill();
            }
        }

        const pinkGrad = ctx.createRadialGradient(x, y, 0, x, y, radius * 3.5);
        pinkGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)'); 
        pinkGrad.addColorStop(0.3, 'rgba(251, 207, 232, 0.5)'); 
        pinkGrad.addColorStop(1, 'rgba(236, 72, 153, 0)');     
        ctx.fillStyle = pinkGrad; ctx.beginPath(); ctx.arc(x, y, radius * 3.5, 0, Math.PI * 2); ctx.fill();
    }

    else if (skinId === 'pink_wings') {
        ctx.globalCompositeOperation = 'lighter';
        const pulse = Math.sin(time * 0.003);

        ctx.save(); 
        ctx.translate(x, y + 5); 
        ctx.scale(1, 0.35); 
        ctx.rotate(time * 0.0005);
        
        const poolGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 5);
        poolGrad.addColorStop(0, 'rgba(251, 207, 232, 0.6)');
        poolGrad.addColorStop(1, 'rgba(236, 72, 153, 0)');
        ctx.fillStyle = poolGrad; ctx.beginPath(); ctx.arc(0, 0, radius*5, 0, Math.PI*2); ctx.fill();

        ctx.strokeStyle = `rgba(255, 255, 255, ${0.6 + pulse * 0.2})`;
        ctx.shadowColor = '#f472b6'; ctx.shadowBlur = 15; ctx.lineWidth = 4;
        ctx.setLineDash([15, 10, 5, 10]); 
        ctx.beginPath(); ctx.arc(0, 0, radius * 4.5, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);

        ctx.rotate(time * -0.001);
        ctx.strokeStyle = '#f472b6'; ctx.lineWidth = 3;
        ctx.fillStyle = `rgba(244, 114, 182, 0.3)`;
        ctx.beginPath();
        const hs = radius * 2.5;
        ctx.moveTo(0, -hs * 0.3);
        ctx.bezierCurveTo(-hs * 0.5, -hs * 0.8, -hs * 1.0, -hs * 0.3, 0, hs * 1.0); 
        ctx.bezierCurveTo(hs * 1.0, -hs * 0.3, hs * 0.5, -hs * 0.8, 0, -hs * 0.3);
        ctx.fill(); ctx.stroke();
        
        ctx.rotate(time * 0.002);
        ctx.fillStyle = 'rgba(253, 224, 71, 0.8)';
        ctx.shadowColor = '#fde047'; ctx.beginPath();
        for(let i=0; i<5; i++) {
            ctx.lineTo(Math.cos((18+i*72)*Math.PI/180)*radius*1.5, -Math.sin((18+i*72)*Math.PI/180)*radius*1.5);
            ctx.lineTo(Math.cos((54+i*72)*Math.PI/180)*radius*0.6, -Math.sin((54+i*72)*Math.PI/180)*radius*0.6);
        }
        ctx.closePath(); ctx.fill();
        ctx.restore();

        for (let w = -1; w <= 1; w += 2) {
            ctx.save(); ctx.translate(x, y - radius); ctx.scale(w, 1);
            const flap = Math.sin(time * 0.005) * 0.25 + 0.1;
            ctx.rotate(flap);

            const wingGrad = ctx.createLinearGradient(0, 0, radius*6, -radius*4);
            wingGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
            wingGrad.addColorStop(0.5, 'rgba(251, 207, 232, 0.8)');
            wingGrad.addColorStop(1, 'rgba(236, 72, 153, 0)');

            ctx.fillStyle = wingGrad; ctx.shadowBlur = 20; ctx.shadowColor = '#f472b6';
            ctx.beginPath();
            ctx.moveTo(radius, 0);
            ctx.bezierCurveTo(radius*2, -radius*4, radius*5, -radius*3, radius*6 + Math.sin(time*0.005)*5, -radius*1);
            ctx.quadraticCurveTo(radius*4, -radius*0.5, radius*5, radius*1);
            ctx.quadraticCurveTo(radius*3, radius*0.5, radius*4, radius*2);
            ctx.quadraticCurveTo(radius*2, radius*1, radius, radius*0.5);
            ctx.fill();
            ctx.restore();
        }

        if (!eng.sakuraHearts) eng.sakuraHearts = [];
        if (eng.sakuraHearts.length < 20 && Math.random() < 0.2) {
            eng.sakuraHearts.push({
                ox: (Math.random() - 0.5) * radius * 4, oy: radius, 
                vy: 0.7 + Math.random(), size: 5 + Math.random() * 5, life: 1, rot: Math.random() * Math.PI
            });
        }
        eng.sakuraHearts.forEach((h, i) => {
            h.oy -= h.vy; h.life -= 0.005;
            if (h.life <= 0) { eng.sakuraHearts.splice(i, 1); return; }
            ctx.save(); ctx.translate(x + h.ox, y + h.oy);
            const hSize = h.size;
            
            ctx.beginPath(); ctx.moveTo(0, -hSize * 0.3);
            ctx.bezierCurveTo(-hSize * 0.6, -hSize, -hSize * 1.2, -hSize * 0.3, 0, hSize * 1.2); 
            ctx.bezierCurveTo(hSize * 1.2, -hSize * 0.3, hSize * 0.6, -hSize, 0, -hSize * 0.3);
            ctx.fillStyle = `rgba(236, 72, 153, ${h.life})`; ctx.shadowBlur = 10; ctx.shadowColor = '#ec4899';
            ctx.fill();

            ctx.fillStyle = `rgba(255, 255, 255, ${h.life * 0.8})`;
            ctx.beginPath(); ctx.ellipse(-hSize*0.3, -hSize*0.3, hSize*0.2, hSize*0.3, Math.PI/4, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        });

        if (!eng.sakuraParticles) eng.sakuraParticles = [];
        if (eng.sakuraParticles.length < 20 && Math.random() < 0.2) {
            eng.sakuraParticles.push({ ox: (Math.random()-0.5)*70, y: -70, vy: 0.5+Math.random(), size: 3+Math.random()*2, life: 1 });
        }
        eng.sakuraParticles.forEach((p, i) => {
            p.y += p.vy; p.life -= 0.005;
            ctx.fillStyle = `rgba(251, 207, 232, ${p.life})`;
            ctx.beginPath(); ctx.ellipse(x+p.ox, y+p.y, p.size, p.size*1.5, 0, 0, Math.PI*2); ctx.fill();
        });

        const pinkGrad = ctx.createRadialGradient(x, y, 0, x, y, radius * 3);
        pinkGrad.addColorStop(0, 'rgba(255, 255, 255, 0.8)'); 
        pinkGrad.addColorStop(0.3, 'rgba(244, 114, 182, 0.4)'); 
        pinkGrad.addColorStop(1, 'rgba(236, 72, 153, 0)');     
        ctx.fillStyle = pinkGrad; ctx.beginPath(); ctx.arc(x, y, radius * 3, 0, Math.PI * 2); ctx.fill();
    }

    else if (skinId === 'remembrance') {
        ctx.globalCompositeOperation = 'lighter';
        const pulse = Math.sin(time * 0.002);
        const floatY = Math.sin(time * 0.0015) * 6;

        ctx.save(); 
        ctx.translate(x, y + 5 + floatY); ctx.scale(1, 0.35); 
        
        const starGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 6.5);
        starGrad.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        starGrad.addColorStop(0.3, 'rgba(96, 165, 250, 0.5)'); 
        starGrad.addColorStop(0.7, 'rgba(30, 27, 75, 0.4)'); 
        starGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = starGrad; ctx.beginPath(); ctx.arc(0, 0, radius*6.5, 0, Math.PI*2); ctx.fill();

        for(let i=0; i<3; i++) {
            const rippleRad = ((time * 0.05) + (i * radius*3)) % (radius * 8);
            ctx.strokeStyle = `rgba(224, 242, 254, ${1 - (rippleRad/(radius*8))})`;
            ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, rippleRad, 0, Math.PI*2); ctx.stroke();
        }

        ctx.rotate(time * 0.0005);
        ctx.strokeStyle = `rgba(186, 230, 253, ${0.6 + pulse * 0.2})`; 
        ctx.shadowColor = '#7dd3fc'; ctx.shadowBlur = 15; ctx.lineWidth = 2;
        
        ctx.beginPath(); ctx.arc(0, 0, radius * 4.5, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([5, 10]); ctx.beginPath(); ctx.arc(0, 0, radius * 5.2, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        
        ctx.save();
        ctx.rotate(time * 0.001);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -radius * 4); ctx.stroke();
        ctx.rotate(time * 0.0002);
        ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(radius * 2.5, 0); ctx.stroke();
        ctx.restore();
        ctx.restore();

        for (let w = -1; w <= 1; w += 2) {
            ctx.save(); ctx.translate(x, y - radius + floatY); ctx.scale(w, 1);
            const capeSway = Math.sin(time * 0.002) * 0.15;
            ctx.rotate(capeSway + 0.1);

            const capeGradient = ctx.createLinearGradient(0, 0, radius*7, radius*5);
            capeGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
            capeGradient.addColorStop(0.3, 'rgba(56, 189, 248, 0.8)');
            capeGradient.addColorStop(1, 'rgba(30, 27, 75, 0)');

            ctx.fillStyle = capeGradient; ctx.shadowBlur = 20; ctx.shadowColor = '#38bdf8';
            ctx.beginPath();
            ctx.moveTo(radius, 0);
            ctx.bezierCurveTo(radius*3, -radius*2, radius*5, -radius*1, radius*7 + Math.sin(time*0.003)*3, radius*3);
            ctx.quadraticCurveTo(radius*5, radius*5, radius*3, radius*6);
            ctx.quadraticCurveTo(radius*2, radius*3, radius, radius);
            ctx.fill();

            ctx.fillStyle = '#ffffff'; ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'; ctx.lineWidth = 1; ctx.shadowBlur = 5;
            const starPoints = [ {px: 20, py: 10}, {px: 35, py: 5}, {px: 40, py: 25}, {px: 25, py: 30} ];
            ctx.beginPath();
            starPoints.forEach((pt, i) => {
                ctx.moveTo(starPoints[i].px, starPoints[i].py);
                const next = starPoints[(i+1)%starPoints.length];
                ctx.lineTo(next.px, next.py);
            });
            ctx.stroke();
            starPoints.forEach(pt => {
                ctx.beginPath(); ctx.arc(pt.px, pt.py, 1.5, 0, Math.PI*2); ctx.fill();
            });
            ctx.restore();
        }

        ctx.globalCompositeOperation = 'source-over';
        const orbCount = 3;
        for(let i=0; i<orbCount; i++) {
            const bAng = time*0.0015 + (i*Math.PI*2/orbCount);
            const bX = x + Math.cos(bAng)*radius*4.5;
            const bY = y - radius*2 + floatY + Math.sin(bAng*2)*radius*1.5;
            
            ctx.save(); ctx.translate(bX, bY);
            ctx.translate(0, Math.sin(time*0.004 + i)*5); 
            
            ctx.shadowBlur = 15; ctx.shadowColor = '#7dd3fc';
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI*2); ctx.fill();
            
            ctx.strokeStyle = '#fde047';
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.ellipse(0, 0, 8, 12, time*0.003 + i, 0, Math.PI*2); ctx.stroke();
            ctx.beginPath(); ctx.ellipse(0, 0, 8, 12, -time*0.002 + i + Math.PI/2, 0, Math.PI*2); ctx.stroke();
            ctx.restore();

            ctx.strokeStyle = `rgba(253, 224, 71, 0.2)`; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(x, y - radius + floatY); ctx.lineTo(bX, bY); ctx.stroke();
        }

        ctx.globalCompositeOperation = 'lighter';
        if (!eng.astralParticles) eng.astralParticles = [];
        if (eng.astralParticles.length < 35 && Math.random() < 0.5) {
            const type = Math.random();
            eng.astralParticles.push({
                ox: (Math.random() - 0.5) * radius * 9, 
                oy: (Math.random() - 0.5) * radius * 8,
                vx: (Math.random() - 0.5) * 1.5,
                vy: -0.5 - Math.random(),
                size: (type > 0.9) ? 3+Math.random()*3 : 1.5+Math.random()*1.5, 
                life: 1, rot: Math.random()*Math.PI*2, rs: (Math.random()-0.5)*0.05, type: type
            });
        }
        eng.astralParticles.forEach((p, i) => {
            p.oy += p.vy; p.ox += p.vx + Math.sin(time*0.002 + i)*0.5;
            p.rot += p.rs; p.life -= 0.005;
            if (p.life <= 0) { eng.astralParticles.splice(i, 1); return; }

            ctx.save(); ctx.translate(x + p.ox, y + p.oy + floatY); ctx.rotate(p.rot);
            
            if (p.type > 0.9) {
                ctx.fillStyle = `rgba(186, 230, 253, ${p.life})`;
                ctx.shadowBlur = 10; ctx.shadowColor = '#0ea5e9';
                ctx.beginPath();
                ctx.moveTo(0, -p.size);
                ctx.quadraticCurveTo(p.size, 0, 0, p.size);
                ctx.quadraticCurveTo(-p.size, 0, 0, -p.size);
                ctx.fill();
            } else if (p.type > 0.3) {
                ctx.fillStyle = `rgba(96, 165, 250, ${p.life})`;
                ctx.shadowBlur = 5; ctx.shadowColor = '#38bdf8';
                ctx.beginPath();
                ctx.moveTo(0, -p.size); ctx.lineTo(p.size/2, 0); ctx.lineTo(0, p.size); ctx.lineTo(-p.size/2, 0);
                ctx.closePath(); ctx.fill();
            } else {
                ctx.fillStyle = `rgba(248, 250, 252, ${p.life})`; ctx.shadowBlur = 5; ctx.shadowColor = '#ffffff';
                ctx.beginPath(); ctx.arc(0, 0, 1+Math.random(), 0, Math.PI*2); ctx.fill();
            }
            ctx.restore();
        });

        ctx.save(); ctx.translate(x, y - radius*3.5 + floatY);
        ctx.scale(1, 0.3); ctx.rotate(time * 0.001);
        
        ctx.strokeStyle = 'rgba(253, 224, 71, 0.8)';
        ctx.lineWidth = 2; ctx.shadowBlur = 15; ctx.shadowColor = '#fde047';
        ctx.beginPath(); ctx.arc(0, 0, radius*2.5, 0, Math.PI*2); ctx.stroke();
        ctx.setLineDash([4, 8]); ctx.beginPath(); ctx.arc(0, 0, radius*3, 0, Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
        
        for(let i=0; i<4; i++) {
            ctx.rotate(Math.PI*2/4);
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.moveTo(-2, -radius*2.5); ctx.lineTo(2, -radius*2.5); ctx.lineTo(0, -radius*4); ctx.fill();
        }
        ctx.restore();

        const astralGrad = ctx.createRadialGradient(x, y - radius + floatY, 0, x, y - radius + floatY, radius * 4.5);
        astralGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)'); 
        astralGrad.addColorStop(0.3, 'rgba(96, 165, 250, 0.5)'); 
        astralGrad.addColorStop(1, 'rgba(30, 27, 75, 0)');     
        ctx.fillStyle = astralGrad; ctx.beginPath(); ctx.arc(x, y - radius + floatY, radius * 4.5, 0, Math.PI * 2); ctx.fill();
    }

    else if (skinId === 'igris') {
        ctx.globalCompositeOperation = 'source-over';
        const pulse = Math.sin(time * 0.004);

        ctx.save(); ctx.translate(x, y + 5); ctx.scale(1, 0.35); ctx.rotate(time * -0.0005);
        ctx.strokeStyle = `rgba(220, 38, 38, ${0.5 + pulse * 0.2})`; 
        ctx.shadowColor = '#dc2626'; ctx.shadowBlur = 20; ctx.lineWidth = 4;
        
        ctx.beginPath(); ctx.arc(0, 0, radius * 4.5, 0, Math.PI * 2); ctx.stroke();
        
        ctx.beginPath();
        for(let i=0; i<8; i++) {
            ctx.rotate(Math.PI / 4);
            ctx.moveTo(0, radius*2);
            ctx.lineTo(radius*1.5, radius*4.5);
            ctx.lineTo(-radius*1.5, radius*4.5);
        }
        ctx.stroke(); ctx.restore();

        ctx.save(); ctx.translate(x, y - radius);
        const capeSway = Math.sin(time * 0.003) * 15;
        const capeRipple = Math.cos(time * 0.005) * 8;
        
        const capeGrad = ctx.createLinearGradient(0, 0, 0, radius*6);
        capeGrad.addColorStop(0, '#991b1b'); 
        capeGrad.addColorStop(0.5, '#7f1d1d');
        capeGrad.addColorStop(1, 'rgba(0, 0, 0, 0)'); 
        
        ctx.fillStyle = capeGrad; ctx.shadowBlur = 15; ctx.shadowColor = '#dc2626';
        ctx.beginPath();
        ctx.moveTo(-radius*1.5, 0); 
        ctx.quadraticCurveTo(-radius*4, radius*3 + capeRipple, -radius*2 + capeSway, radius*6.5); 
        ctx.quadraticCurveTo(capeSway/2, radius*7, radius*2 + capeSway, radius*6.5); 
        ctx.quadraticCurveTo(radius*4, radius*3 - capeRipple, radius*1.5, 0); 
        ctx.fill();
        
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.moveTo(-radius + capeSway, radius*6.5);
        ctx.lineTo(-radius*0.5 + capeSway, radius*4.5);
        ctx.lineTo(capeSway, radius*6.8);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();

        ctx.save(); ctx.translate(x, y - radius*1.5);
        ctx.strokeStyle = 'rgba(220, 38, 38, 0.9)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.shadowBlur = 15; ctx.shadowColor = '#ff0000';
        ctx.beginPath();
        for(let i=0; i<6; i++) {
            ctx.moveTo(0,0);
            const swayX = Math.cos(time*0.003 + i)*15;
            const swayY = Math.sin(time*0.004 + i)*10;
            ctx.quadraticCurveTo(radius + swayX, -radius*2 - i*2, radius*2.5 + swayX, -radius*0.5 + swayY);
        }
        ctx.stroke(); ctx.restore();

        if (!eng.igrisSmoke) eng.igrisSmoke = [];
        if (eng.igrisSmoke.length < 20 && Math.random() < 0.4) {
            eng.igrisSmoke.push({
                ox: (Math.random()-0.5)*radius*6, oy: radius + Math.random()*5,
                vy: 0.5 + Math.random(), size: 6 + Math.random()*8, life: 1,
                isRed: Math.random() > 0.7
            });
        }
        eng.igrisSmoke.forEach((s, i) => {
            s.oy -= s.vy; s.ox += Math.sin(time*0.005 + i)*0.5; s.life -= 0.015; s.size -= 0.05;
            if (s.life <= 0) { eng.igrisSmoke.splice(i, 1); return; }
            
            ctx.fillStyle = s.isRed ? `rgba(220, 38, 38, ${s.life*0.6})` : `rgba(10, 10, 10, ${s.life*0.8})`;
            ctx.shadowBlur = s.isRed ? 15 : 0; ctx.shadowColor = '#dc2626';
            ctx.beginPath(); ctx.arc(x+s.ox, y+s.oy, s.size, 0, Math.PI*2); ctx.fill();
        });

        ctx.globalCompositeOperation = 'lighter';
        if (Math.random() < 0.25) {
            const lx = x + (Math.random()-0.5)*radius*10;
            const ly = y - radius*3 + (Math.random()-0.5)*radius*8;
            ctx.strokeStyle = `rgba(255, 50, 50, ${0.5 + Math.random()*0.5})`; 
            ctx.lineWidth = 2 + Math.random()*2; ctx.shadowBlur = 20; ctx.shadowColor = '#ff0000';
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(lx, ly); ctx.stroke();
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.stroke(); 
        }

        const coreGrad = ctx.createRadialGradient(x, y-2, 0, x, y-2, radius*3.5);
        coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)'); 
        coreGrad.addColorStop(0.2, 'rgba(220, 38, 38, 0.8)'); 
        coreGrad.addColorStop(1, 'rgba(150, 0, 0, 0)');
        ctx.fillStyle = coreGrad; ctx.beginPath(); ctx.arc(x, y-2, radius*3.5, 0, Math.PI*2); ctx.fill();
    }

    else if (skinId === 'emperor') {
        ctx.globalCompositeOperation = 'source-over'; 
        const pulse = Math.sin(time * 0.004);

        ctx.save(); ctx.translate(x, y + 5); ctx.scale(1, 0.35); 
        const poolGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 6);
        poolGrad.addColorStop(0, 'rgba(10, 0, 0, 0.9)'); poolGrad.addColorStop(0.6, 'rgba(127, 29, 29, 0.2)'); poolGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = poolGrad; ctx.beginPath(); ctx.arc(0, 0, radius*6, 0, Math.PI*2); ctx.fill();

        const shockRadius = (time * 0.15) % (radius * 8); 
        ctx.strokeStyle = `rgba(220, 38, 38, ${1 - (shockRadius / (radius * 8))})`; 
        ctx.lineWidth = 3; ctx.shadowBlur = 15; ctx.shadowColor = '#dc2626';
        ctx.beginPath(); ctx.arc(0, 0, shockRadius, 0, Math.PI * 2); ctx.stroke();

        ctx.rotate(time * -0.001); ctx.strokeStyle = `rgba(153, 27, 27, ${0.5 + pulse * 0.3})`; ctx.lineWidth = 2.5; ctx.setLineDash([10, 5]);
        ctx.beginPath();
        for(let i=0; i<12; i++) {
            const ang = (i * Math.PI*2)/12;
            ctx.moveTo(Math.cos(ang)*radius*3.5, Math.sin(ang)*radius*3.5); ctx.lineTo(Math.cos(ang)*radius*5.5, Math.sin(ang)*radius*5.5);
        }
        ctx.stroke(); ctx.setLineDash([]); ctx.restore();

        ctx.save(); ctx.translate(x, y - radius);
        const capeSway = Math.sin(time * 0.003) * 20; const capeRipple = Math.cos(time * 0.006) * 10;
        const capeGrad = ctx.createLinearGradient(0, 0, 0, radius*8);
        capeGrad.addColorStop(0, `rgba(153, 27, 27, ${0.6 + pulse * 0.1})`); capeGrad.addColorStop(0.5, `rgba(127, 29, 29, 0.3)`); capeGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = capeGrad; ctx.globalAlpha = 0.8 + pulse * 0.1; ctx.shadowBlur = 30; ctx.shadowColor = '#dc2626'; 
        ctx.beginPath(); ctx.moveTo(-radius*1.5, 0); 
        ctx.quadraticCurveTo(-radius*4, radius*3 + capeRipple, -radius*2.5 + capeSway, radius*8.5); 
        ctx.quadraticCurveTo(capeSway, radius*10, radius*2.5 + capeSway, radius*8.5); 
        ctx.quadraticCurveTo(radius*4, radius*3 - capeRipple, radius*1.5, 0); ctx.fill();
        
        ctx.globalCompositeOperation = 'destination-out'; 
        ctx.beginPath();
        for(let i=-2; i<=2; i++) {
            const cutX = (i*radius*0.6) + capeSway;
            ctx.moveTo(cutX, radius*9); ctx.lineTo(cutX - 4, radius*6 + Math.random()*15); ctx.lineTo(cutX + 4, radius*9);
        }
        ctx.fill(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1.0; ctx.restore();

        for(let i=0; i<4; i++) {
            const shardAng = time*0.002 + (i*Math.PI/2); const sX = x + Math.cos(shardAng)*radius*5.5; const sY = y - radius*1.5 + Math.sin(shardAng*2)*radius*2;
            ctx.save(); ctx.translate(sX, sY); ctx.rotate(time*0.005 + i);
            ctx.fillStyle = '#171717'; ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 1.5; ctx.shadowBlur = 15; ctx.shadowColor = '#dc2626';
            ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(6, 0); ctx.lineTo(0, 18); ctx.lineTo(-6, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.strokeStyle = '#ffb3b3'; ctx.lineWidth = 1.5; ctx.shadowBlur = 0; ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(0, 10); ctx.stroke(); ctx.restore();
            ctx.strokeStyle = `rgba(220, 38, 38, 0.2)`; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(x, y-radius); ctx.lineTo(sX, sY); ctx.stroke();
        }

        for(let w=-1; w<=1; w+=2) {
            ctx.save(); ctx.translate(x + (radius*1.4*w), y - radius*0.8);
            ctx.fillStyle = '#0a0a0a'; ctx.strokeStyle = '#991b1b'; ctx.lineWidth = 2.5; ctx.shadowBlur = 15; ctx.shadowColor = '#000000';
            ctx.beginPath(); ctx.moveTo(0, radius*0.5); ctx.lineTo(radius*2.2*w, -radius*0.8); ctx.lineTo(radius*1.2*w, radius*1.2); ctx.lineTo(0, radius*1.2);
            ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
        }

        ctx.save(); ctx.translate(x, y - radius*1.8);
        for(let i=0; i<8; i++) {
            const plumeX = Math.cos(time*0.004 + i*0.5)*18; const plumeY = Math.sin(time*0.005 + i*0.5)*12;
            ctx.strokeStyle = i < 3 ? 'rgba(255, 150, 150, 0.9)' : 'rgba(220, 38, 38, 0.7)';
            ctx.lineWidth = 5 - i*0.4; ctx.lineCap = 'round'; ctx.shadowBlur = i===0 ? 20 : 0; ctx.shadowColor = '#ff0000';
            ctx.beginPath(); ctx.moveTo(0,0); ctx.quadraticCurveTo(radius + plumeX, -radius*2.5 - i*4, radius*3.5 + plumeX*1.5, -radius + plumeY); ctx.stroke();
        }
        ctx.restore();

        if (!eng.igrisSmoke) eng.igrisSmoke = [];
        if (eng.igrisSmoke.length < 20 && Math.random() < 0.4) eng.igrisSmoke.push({ ox: (Math.random()-0.5)*radius*6, oy: radius + Math.random()*5, vy: 0.5 + Math.random(), size: 6 + Math.random()*8, life: 1, isRed: Math.random() > 0.8 });
        eng.igrisSmoke.forEach((s, i) => {
            s.oy -= s.vy; s.ox += Math.sin(time*0.005 + i)*0.5; s.life -= 0.015; s.size -= 0.05;
            if (s.life <= 0) { eng.igrisSmoke.splice(i, 1); return; }
            ctx.fillStyle = s.isRed ? `rgba(220, 38, 38, ${s.life * 0.5})` : `rgba(10, 10, 10, ${s.life * 0.8})`;
            ctx.shadowBlur = s.isRed ? 15 : 0; ctx.shadowColor = '#dc2626';
            ctx.beginPath(); ctx.arc(x+s.ox, y+s.oy, s.size, 0, Math.PI*2); ctx.fill();
        });

        ctx.globalCompositeOperation = 'lighter';
        const coreGrad = ctx.createRadialGradient(x, y-2, 0, x, y-2, radius*3.5);
        coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)'); coreGrad.addColorStop(0.3, 'rgba(220, 38, 38, 0.8)'); coreGrad.addColorStop(1, 'rgba(150, 0, 0, 0)');
        ctx.fillStyle = coreGrad; ctx.beginPath(); ctx.arc(x, y-2, radius*3.5, 0, Math.PI*2); ctx.fill();
    }

    else if (skinId === 'empress') {
        ctx.globalCompositeOperation = 'lighter'; 
        const pulse = Math.sin(time * 0.002);

        ctx.save(); 
        ctx.translate(x, y + 5); ctx.scale(1, 0.35); 
        
        const lotusGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 6);
        lotusGrad.addColorStop(0, 'rgba(255, 228, 230, 0.8)'); 
        lotusGrad.addColorStop(0.4, 'rgba(244, 63, 94, 0.4)'); 
        lotusGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = lotusGrad; ctx.beginPath(); ctx.arc(0, 0, radius*6, 0, Math.PI*2); ctx.fill();

        ctx.rotate(time * 0.0005);
        ctx.strokeStyle = `rgba(253, 164, 175, ${0.5 + pulse * 0.2})`; 
        ctx.shadowColor = '#f43f5e'; ctx.shadowBlur = 15; ctx.lineWidth = 2;
        
        for(let i=0; i<12; i++) {
            ctx.save();
            ctx.rotate((i * Math.PI*2)/12);
            ctx.translate(radius*2.5, 0); 
            ctx.beginPath(); ctx.arc(0, 0, radius*2.5, 0, Math.PI*2); ctx.stroke();
            ctx.restore();
        }
        ctx.strokeStyle = 'rgba(253, 224, 71, 0.6)'; 
        ctx.setLineDash([10, 15, 2, 15]); ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, radius * 5.5, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]); ctx.restore();

        const swordCount = 5;
        for(let i=0; i<swordCount; i++) {
            const sAng = time*0.002 + (i*Math.PI*2/swordCount);
            const sX = x + Math.cos(sAng)*radius*4.5;
            const sY = y - radius*2 + Math.sin(sAng*1.5)*radius*1.5; 
            
            ctx.save(); ctx.translate(sX, sY); 
            ctx.rotate(sAng + Math.PI/4 + Math.sin(time*0.003 + i)*0.2); 
            
            ctx.fillStyle = '#ffffff'; 
            ctx.shadowBlur = 15; ctx.shadowColor = '#f43f5e';
            ctx.beginPath(); 
            ctx.moveTo(0, -25); 
            ctx.lineTo(3, -5); ctx.lineTo(1, 8); 
            ctx.lineTo(-1, 8); ctx.lineTo(-3, -5); 
            ctx.closePath(); ctx.fill();
            
            ctx.strokeStyle = '#fde047'; ctx.lineWidth = 2; ctx.shadowBlur = 10; ctx.shadowColor = '#fbbf24';
            ctx.beginPath(); ctx.moveTo(-6, -5); ctx.quadraticCurveTo(0, -8, 6, -5); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(0, 14); ctx.stroke(); 
            ctx.restore();

            ctx.strokeStyle = `rgba(253, 164, 175, 0.2)`; ctx.lineWidth = 1; ctx.shadowBlur = 0;
            ctx.beginPath(); ctx.moveTo(x, y - radius*2); ctx.lineTo(sX, sY); ctx.stroke();
        }

        ctx.lineWidth = 5; ctx.lineCap = 'round';
        for(let i=0; i<2; i++) {
            ctx.strokeStyle = i === 0 ? 'rgba(255, 255, 255, 0.8)' : 'rgba(244, 63, 94, 0.6)';
            ctx.shadowBlur = 20; ctx.shadowColor = i === 0 ? '#fda4af' : '#e11d48';
            ctx.beginPath();
            for(let j=0; j<=20; j++) {
                const rAng = (time * -0.002) + (i * Math.PI) + (j * 0.25); 
                const rDist = radius * 3 + Math.sin(time*0.004 + j)*4;
                const rx = x + Math.cos(rAng) * rDist;
                const ry = y + radius - (j * 4) + Math.sin(rAng)*6;
                if(j===0) ctx.moveTo(rx, ry); else ctx.lineTo(rx, ry);
            }
            ctx.stroke();
        }

        if (!eng.empressParticles) eng.empressParticles = [];
        if (eng.empressParticles.length < 35 && Math.random() < 0.4) {
            const type = Math.random(); 
            eng.empressParticles.push({
                ox: (Math.random() - 0.5) * radius * 8, 
                oy: (Math.random() - 0.5) * radius * 6 - radius,
                vy: (type > 0.9) ? -0.5 - Math.random() : 0.5 + Math.random(), 
                size: (type > 0.9) ? 4+Math.random()*4 : 2+Math.random()*3, 
                life: 1, rot: Math.random()*Math.PI*2, rs: (Math.random()-0.5)*0.05,
                type: type
            });
        }
        eng.empressParticles.forEach((p, i) => {
            p.oy += p.vy; p.ox += Math.sin(time*0.003 + i)*0.6; p.rot += p.rs; p.life -= 0.006;
            if (p.life <= 0) { eng.empressParticles.splice(i, 1); return; }

            ctx.save(); ctx.translate(x + p.ox, y + p.oy); ctx.rotate(p.rot);
            
            if (p.type > 0.9) {
                const s = p.size;
                ctx.scale(1 + Math.sin(p.life*Math.PI)*0.2, 1 + Math.sin(p.life*Math.PI)*0.2);
                ctx.strokeStyle = `rgba(255, 255, 255, ${p.life})`; ctx.lineWidth = 1.5;
                ctx.shadowBlur = 15; ctx.shadowColor = '#f43f5e';
                ctx.beginPath(); ctx.moveTo(0, -s*0.3);
                ctx.bezierCurveTo(-s*0.6, -s, -s*1.2, -s*0.3, 0, s*1.2); 
                ctx.bezierCurveTo(s*1.2, -s*0.3, s*0.6, -s, 0, -s*0.3);
                ctx.stroke();
                
                ctx.fillStyle = `rgba(253, 164, 175, ${p.life * 0.3})`; 
                ctx.fill();
            } else if (p.type > 0.3) {
                ctx.fillStyle = `rgba(255, 255, 255, ${p.life})`; 
                ctx.shadowBlur = 10; ctx.shadowColor = '#fb7185'; 
                ctx.beginPath(); ctx.moveTo(0, p.size);
                ctx.bezierCurveTo(p.size, p.size, p.size*1.5, 0, 0, -p.size); ctx.lineTo(0, -p.size*0.4); 
                ctx.lineTo(0, -p.size); ctx.bezierCurveTo(-p.size*1.5, 0, -p.size, p.size, 0, p.size); ctx.fill();
            } else {
                ctx.fillStyle = `rgba(253, 224, 71, ${p.life})`; ctx.shadowBlur = 5; ctx.shadowColor = '#fbbf24';
                ctx.beginPath(); ctx.arc(0, 0, 1+Math.random(), 0, Math.PI*2); ctx.fill();
            }
            ctx.restore();
        });

        const empressGrad = ctx.createRadialGradient(x, y-radius, 0, x, y-radius, radius * 4);
        empressGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)'); 
        empressGrad.addColorStop(0.3, 'rgba(251, 113, 133, 0.5)'); 
        empressGrad.addColorStop(1, 'rgba(225, 29, 72, 0)');     
        ctx.fillStyle = empressGrad; ctx.beginPath(); ctx.arc(x, y-radius, radius * 4, 0, Math.PI * 2); ctx.fill();
    }

    else if (skinId === 'infernal') {
        ctx.globalCompositeOperation = 'source-over';
        const pulse = Math.sin(time * 0.003);
        const floatY = Math.sin(time * 0.002) * 4; 

        ctx.save();
        ctx.translate(x, y + 5 + floatY);
        ctx.scale(1, 0.35); 

        const poolGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 7);
        poolGrad.addColorStop(0, 'rgba(10, 0, 15, 0.95)'); 
        poolGrad.addColorStop(0.4, 'rgba(153, 15, 61, 0.6)'); 
        poolGrad.addColorStop(0.8, 'rgba(76, 29, 149, 0.3)'); 
        poolGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = poolGrad; ctx.beginPath(); ctx.arc(0, 0, radius*7, 0, Math.PI*2); ctx.fill();

        const shockRadius = (time * 0.2) % (radius * 9);
        ctx.strokeStyle = `rgba(139, 92, 246, ${1 - (shockRadius / (radius * 9))})`; 
        ctx.lineWidth = 4; ctx.shadowBlur = 15; ctx.shadowColor = '#8b5cf6';
        ctx.beginPath(); ctx.arc(0, 0, shockRadius, 0, Math.PI * 2); ctx.stroke();

        ctx.rotate(time * -0.0005);
        ctx.strokeStyle = `rgba(225, 29, 72, ${0.6 + pulse * 0.3})`; 
        ctx.lineWidth = 2.5; ctx.shadowColor = '#e11d48';
        ctx.beginPath();
        for(let i=0; i<6; i++) {
            const ang = (i * Math.PI*2)/6;
            ctx.lineTo(Math.cos(ang)*radius*5, Math.sin(ang)*radius*5);
            ctx.lineTo(Math.cos(ang + Math.PI/6)*radius*2.5, Math.sin(ang + Math.PI/6)*radius*2.5);
        }
        ctx.closePath(); ctx.stroke();
        
        ctx.setLineDash([12, 8, 4, 8]);
        ctx.beginPath(); ctx.arc(0, 0, radius * 6, 0, Math.PI*2); ctx.stroke();
        ctx.setLineDash([]); ctx.restore();

        ctx.save(); ctx.translate(x, y - radius + floatY);
        const flapAngle = Math.sin(time * 0.004) * 0.2;
        
        ctx.save(); ctx.scale(-1, 1); ctx.rotate(flapAngle - 0.1);
        const demonGrad = ctx.createLinearGradient(0, 0, radius*7, -radius*5);
        demonGrad.addColorStop(0, 'rgba(20, 5, 10, 0.9)');
        demonGrad.addColorStop(1, 'rgba(153, 15, 30, 0.7)');
        ctx.fillStyle = demonGrad; ctx.shadowBlur = 20; ctx.shadowColor = '#9f1239';
        
        ctx.beginPath(); ctx.moveTo(radius, 0);
        ctx.quadraticCurveTo(radius*3, -radius*5, radius*7, -radius*4); 
        ctx.quadraticCurveTo(radius*5, -radius*1, radius*8, radius*2); 
        ctx.quadraticCurveTo(radius*4, radius*1, radius*5, radius*3); 
        ctx.quadraticCurveTo(radius*2.5, radius*1.5, radius*1, radius*2); 
        ctx.fill();
        
        ctx.strokeStyle = 'rgba(225, 29, 72, 0.8)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(radius, 0); ctx.quadraticCurveTo(radius*3, -radius*5, radius*7, -radius*4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(radius*2.5, -radius*2.5); ctx.lineTo(radius*8, radius*2); ctx.stroke();
        ctx.restore();

        ctx.save(); ctx.scale(1, 1); ctx.rotate(flapAngle + 0.1);
        ctx.globalCompositeOperation = 'lighter';
        const celestGrad = ctx.createLinearGradient(0, 0, radius*7, -radius*5);
        celestGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)'); 
        celestGrad.addColorStop(0.4, 'rgba(139, 92, 246, 0.8)'); 
        celestGrad.addColorStop(1, 'rgba(225, 29, 72, 0)'); 
        ctx.fillStyle = celestGrad; ctx.shadowBlur = 25; ctx.shadowColor = '#8b5cf6';
        
        ctx.beginPath(); ctx.moveTo(radius, 0);
        ctx.bezierCurveTo(radius*3, -radius*5, radius*6, -radius*3, radius*8 + Math.sin(time*0.01)*3, -radius*2);
        ctx.quadraticCurveTo(radius*6, 0, radius*7, radius*1);   
        ctx.quadraticCurveTo(radius*5, radius*0.5, radius*5.5, radius*2.5); 
        ctx.quadraticCurveTo(radius*4, radius*1, radius*4, radius*3);   
        ctx.quadraticCurveTo(radius*2, radius*1.5, radius*1, radius*2);
        ctx.fill(); ctx.restore();
        ctx.restore();

        ctx.globalCompositeOperation = 'source-over';
        ctx.save(); ctx.translate(x, y - radius + floatY);
        const cloakSway = Math.sin(time * 0.003) * 15;
        const cloakGrad = ctx.createLinearGradient(0, 0, 0, radius*8);
        cloakGrad.addColorStop(0, 'rgba(10, 0, 15, 0.9)');
        cloakGrad.addColorStop(0.6, 'rgba(139, 92, 246, 0.5)'); 
        cloakGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = cloakGrad; 
        
        ctx.beginPath(); ctx.moveTo(-radius*1.2, 0);
        ctx.quadraticCurveTo(-radius*3.5, radius*4, -radius*2 + cloakSway, radius*8);
        ctx.quadraticCurveTo(cloakSway, radius*9, radius*2 + cloakSway, radius*8);
        ctx.quadraticCurveTo(radius*3.5, radius*4, radius*1.2, 0);
        ctx.fill(); ctx.restore();

        const relicCount = 3;
        for(let i=0; i<relicCount; i++) {
            const rAng = time*0.002 + (i*Math.PI*2/relicCount);
            const rX = x + Math.cos(rAng)*radius*5;
            const rY = y - radius*1.5 + floatY + Math.sin(rAng*2)*radius*2;
            
            ctx.save(); ctx.translate(rX, rY); ctx.rotate(time*0.005 + i);
            ctx.fillStyle = '#0f0514'; ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth = 1.5;
            ctx.shadowBlur = 15; ctx.shadowColor = '#8b5cf6';
            ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(5, 0); ctx.lineTo(0, 15); ctx.lineTo(-5, 0); ctx.closePath();
            ctx.fill(); ctx.stroke();
            ctx.strokeStyle = '#e11d48'; ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(0, 8); ctx.stroke();
            ctx.restore();
            
            ctx.strokeStyle = `rgba(139, 92, 246, 0.2)`; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(x, y - radius + floatY); ctx.lineTo(rX, rY); ctx.stroke();
        }

        ctx.save(); ctx.translate(x, y - radius*3 + floatY);
        ctx.scale(1, 0.3); ctx.rotate(time * 0.002);
        ctx.strokeStyle = '#e11d48'; ctx.lineWidth = 3; ctx.shadowBlur = 20; ctx.shadowColor = '#be123c';
        ctx.beginPath(); ctx.arc(0, 0, radius*2.5, 0, Math.PI*2); ctx.stroke();
        for(let i=0; i<5; i++) {
            ctx.rotate(Math.PI*2/5);
            ctx.beginPath(); ctx.moveTo(radius*2.5, 0); ctx.lineTo(radius*4, 0); ctx.stroke();
        }
        ctx.restore();

        ctx.globalCompositeOperation = 'lighter';
        if (Math.random() < 0.3) {
            const lColor = Math.random() > 0.5 ? {c: '#ffffff', g: '#8b5cf6'} : {c: '#ffffff', g: '#e11d48'};
            drawLightning(x + (Math.random()-0.5)*radius*4, y - radius*4 + floatY, 
                          x + (Math.random()-0.5)*radius*10, y + 10 + (Math.random()-0.5)*radius*5, 
                          lColor.c, lColor.g, 4, true);
        }

        if (!eng.infernalSmoke) eng.infernalSmoke = [];
        if (eng.infernalSmoke.length < 30 && Math.random() < 0.5) {
            eng.infernalSmoke.push({
                ox: (Math.random()-0.5)*radius*7, oy: radius + Math.random()*10,
                vy: 0.6 + Math.random()*1.5, size: 5 + Math.random()*10, life: 1,
                isViolet: Math.random() > 0.5
            });
        }
        eng.infernalSmoke.forEach((s, i) => {
            s.oy -= s.vy; s.ox += Math.sin(time*0.003 + i)*0.6; s.life -= 0.015; s.size -= 0.05;
            if (s.life <= 0) { eng.infernalSmoke.splice(i, 1); return; }
            ctx.fillStyle = s.isViolet ? `rgba(139, 92, 246, ${s.life*0.6})` : `rgba(225, 29, 72, ${s.life*0.6})`;
            ctx.shadowBlur = 15; ctx.shadowColor = s.isViolet ? '#7c3aed' : '#be123c';
            ctx.beginPath(); ctx.arc(x+s.ox, y+s.oy + floatY, s.size, 0, Math.PI*2); ctx.fill();
        });

        const coreGrad = ctx.createRadialGradient(x, y - radius + floatY, 0, x, y - radius + floatY, radius*4.5);
        coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.6)'); 
        coreGrad.addColorStop(0.2, 'rgba(225, 29, 72, 0.8)'); 
        coreGrad.addColorStop(0.5, 'rgba(109, 40, 217, 0.4)'); 
        coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = coreGrad; ctx.beginPath(); ctx.arc(x, y - radius + floatY, radius*4.5, 0, Math.PI*2); ctx.fill();
    }

    else if (skinId === 'leviathan') {
        ctx.globalCompositeOperation = 'lighter'; 
        const pulse = Math.sin(time * 0.003);
        const floatY = Math.sin(time * 0.002) * 5; 

        ctx.save(); 
        ctx.translate(x, y + 5 + floatY); ctx.scale(1, 0.35); 
        
        const waterGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 6);
        waterGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)'); 
        waterGrad.addColorStop(0.3, 'rgba(56, 189, 248, 0.6)'); 
        waterGrad.addColorStop(0.8, 'rgba(2, 132, 199, 0.3)'); 
        waterGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = waterGrad; ctx.beginPath(); ctx.arc(0, 0, radius*6, 0, Math.PI*2); ctx.fill();

        ctx.rotate(time * 0.0008);
        ctx.strokeStyle = `rgba(56, 189, 248, ${0.6 + pulse * 0.2})`; 
        ctx.shadowColor = '#38bdf8'; ctx.shadowBlur = 15; ctx.lineWidth = 2.5;
        
        ctx.beginPath(); ctx.arc(0, 0, radius * 4.5, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath();
        for(let i=0; i<6; i++) {
            ctx.rotate(Math.PI * 2 / 6);
            ctx.moveTo(0, radius*2);
            ctx.quadraticCurveTo(radius*2, radius*4, 0, radius*5);
        }
        ctx.stroke();

        ctx.rotate(time * -0.0015);
        ctx.strokeStyle = 'rgba(253, 224, 71, 0.8)'; 
        ctx.lineWidth = 2; ctx.shadowColor = '#fde047'; ctx.shadowBlur = 10;
        ctx.setLineDash([15, 10, 5, 10]);
        ctx.beginPath(); ctx.arc(0, 0, radius * 5.5, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]); ctx.restore();

        ctx.save(); ctx.translate(x, y - radius + floatY);
        ctx.lineWidth = 12; ctx.lineCap = 'round';
        ctx.shadowBlur = 20; ctx.shadowColor = '#0ea5e9';
        
        ctx.beginPath();
        for(let j=0; j<=30; j++) {
            const sAng = (time * -0.002) + (j * 0.2); 
            const sDist = radius * 4.5 + Math.sin(time*0.004 + j)*2;
            const sx = Math.cos(sAng) * sDist;
            const sy = Math.sin(sAng) * sDist * 0.5 - (j * 1.5) + Math.sin(time*0.003 + j)*5; 
            if(j===0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
        }
        
        const spiritGrad = ctx.createLinearGradient(0, radius*2, 0, -radius*6);
        spiritGrad.addColorStop(0, 'rgba(2, 132, 199, 0)'); 
        spiritGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.5)'); 
        spiritGrad.addColorStop(1, 'rgba(255, 255, 255, 0.8)'); 
        
        ctx.strokeStyle = spiritGrad; ctx.stroke();
        ctx.lineWidth = 3; ctx.strokeStyle = '#ffffff'; ctx.shadowBlur = 0; ctx.stroke();
        ctx.restore();

        const flapAngle = Math.sin(time * 0.004) * 0.15;
        for (let w = -1; w <= 1; w += 2) {
            ctx.save(); ctx.translate(x, y - radius + floatY); ctx.scale(w, 1);
            ctx.rotate(flapAngle + 0.1);
            
            const wingGrad = ctx.createLinearGradient(0, 0, radius*7, -radius*5);
            wingGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)'); 
            wingGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.7)'); 
            wingGrad.addColorStop(1, 'rgba(2, 132, 199, 0)'); 

            ctx.fillStyle = wingGrad; ctx.shadowBlur = 15; ctx.shadowColor = '#38bdf8';
            
            ctx.beginPath();
            ctx.moveTo(radius, 0);
            ctx.lineTo(radius*3, -radius*2);
            ctx.lineTo(radius*6, -radius*4 + Math.sin(time*0.005)*3); 
            ctx.lineTo(radius*4.5, -radius*1);
            ctx.lineTo(radius*7, radius*1 + Math.sin(time*0.006)*2);  
            ctx.lineTo(radius*3.5, radius*1.5);
            ctx.lineTo(radius*4.5, radius*3); 
            ctx.lineTo(radius*1.5, radius*2);
            ctx.closePath(); ctx.fill();
            
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'; ctx.lineWidth = 1.5; ctx.shadowBlur = 0;
            ctx.beginPath(); ctx.moveTo(radius, 0); ctx.lineTo(radius*6, -radius*4); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(radius*2.5, -radius*0.5); ctx.lineTo(radius*7, radius*1); ctx.stroke();
            ctx.restore();
        }

        ctx.save(); ctx.translate(x, y - radius*3.5 + floatY);
        ctx.scale(1, 0.3); ctx.rotate(time * 0.002);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'; ctx.lineWidth = 3; ctx.shadowBlur = 20; ctx.shadowColor = '#38bdf8';
        ctx.beginPath(); ctx.arc(0, 0, radius*2.5, 0, Math.PI*2); ctx.stroke();
        ctx.strokeStyle = '#fde047'; ctx.lineWidth = 5; ctx.setLineDash([5, 15]);
        ctx.beginPath(); ctx.arc(0, 0, radius*2.5, 0, Math.PI*2); ctx.stroke();
        ctx.restore();

        if (Math.random() < 0.2) {
            drawLightning(x + (Math.random()-0.5)*radius*3, y - radius*3 + floatY, 
                          x + (Math.random()-0.5)*radius*10, y + 10 + (Math.random()-0.5)*radius*5, 
                          '#ffffff', '#0284c7', 3, true);
        }

        if (!eng.leviParticles) eng.leviParticles = [];
        if (eng.leviParticles.length < 35 && Math.random() < 0.5) {
            const isButterfly = Math.random() > 0.8;
            eng.leviParticles.push({
                ox: (Math.random() - 0.5) * radius * 8, 
                oy: radius * 2 + Math.random() * 5, 
                vy: 0.5 + Math.random() * 1.5, 
                size: isButterfly ? 3+Math.random()*2 : 1+Math.random()*3, 
                life: 1, rot: Math.random()*Math.PI*2,
                isButterfly: isButterfly
            });
        }
        eng.leviParticles.forEach((p, i) => {
            p.oy -= p.vy; 
            p.ox += Math.sin(time*0.003 + i)*0.8; p.rot += 0.05; p.life -= 0.01;
            if (p.life <= 0) { eng.leviParticles.splice(i, 1); return; }

            ctx.save(); ctx.translate(x + p.ox, y + p.oy + floatY); ctx.rotate(p.rot);
            
            if (p.isButterfly) {
                const flap = Math.abs(Math.sin(time * 0.02 + i));
                ctx.scale(flap, 1); 
                ctx.fillStyle = `rgba(255, 255, 255, ${p.life})`;
                ctx.shadowBlur = 10; ctx.shadowColor = '#38bdf8';
                ctx.beginPath(); ctx.ellipse(p.size, 0, p.size, p.size*1.5, Math.PI/4, 0, Math.PI*2); ctx.fill(); 
                ctx.beginPath(); ctx.ellipse(-p.size, 0, p.size, p.size*1.5, -Math.PI/4, 0, Math.PI*2); ctx.fill(); 
            } else {
                ctx.fillStyle = `rgba(224, 242, 254, ${p.life})`; ctx.shadowBlur = 10; ctx.shadowColor = '#0284c7';
                ctx.beginPath(); ctx.arc(0, 0, p.size, 0, Math.PI*2); ctx.fill();
            }
            ctx.restore();
        });

        const gemCount = 4;
        for(let i=0; i<gemCount; i++) {
            const gAng = time*0.003 + (i*Math.PI*2/gemCount);
            const gX = x + Math.cos(gAng)*radius*4;
            const gY = y - radius*1.5 + floatY + Math.sin(gAng*2)*radius*1.5;
            
            ctx.save(); ctx.translate(gX, gY); ctx.rotate(time*0.005 + i);
            ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#0284c7'; ctx.lineWidth = 1.5;
            ctx.shadowBlur = 15; ctx.shadowColor = '#38bdf8';
            ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(4, 0); ctx.lineTo(0, 6); ctx.lineTo(-4, 0); ctx.closePath();
            ctx.fill(); ctx.stroke();
            ctx.restore();
        }

        const holyGrad = ctx.createRadialGradient(x, y - radius + floatY, 0, x, y - radius + floatY, radius*4);
        holyGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)'); 
        holyGrad.addColorStop(0.3, 'rgba(56, 189, 248, 0.6)'); 
        holyGrad.addColorStop(1, 'rgba(2, 132, 199, 0)');     
        ctx.fillStyle = holyGrad; ctx.beginPath(); ctx.arc(x, y - radius + floatY, radius*4, 0, Math.PI * 2); ctx.fill();
    }

    else if (skinId === 'frieren') {
        ctx.globalCompositeOperation = 'lighter';
        const pulse = Math.sin(time * 0.002);
        const floatY = Math.sin(time * 0.001) * 6;

        ctx.save(); 
        ctx.translate(x, y - radius * 3 + floatY); 
        
        const moonGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 8);
        moonGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        moonGrad.addColorStop(0.4, 'rgba(96, 165, 250, 0.15)'); 
        moonGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = moonGrad; 
        ctx.beginPath(); ctx.arc(0, 0, radius * 8, 0, Math.PI * 2); ctx.fill();

        ctx.rotate(time * 0.0005);
        ctx.strokeStyle = `rgba(224, 242, 254, ${0.4 + pulse * 0.2})`; 
        ctx.lineWidth = 1.5; 
        ctx.shadowBlur = 15; ctx.shadowColor = '#38bdf8';
        
        for(let i=0; i<8; i++) {
            ctx.rotate(Math.PI * 2 / 8);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(radius * 3, -radius * 2, 0, -radius * 7); 
            ctx.quadraticCurveTo(-radius * 3, -radius * 2, 0, 0);          
            ctx.stroke();
        }
        
        ctx.rotate(time * -0.001); 
        ctx.strokeStyle = 'rgba(253, 224, 71, 0.4)'; 
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 12]);
        ctx.beginPath(); ctx.arc(0, 0, radius * 7.5, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        const himmelAlpha = Math.max(0, Math.sin(time * 0.0008) - 0.4) * 0.4; 
        if (himmelAlpha > 0) {
            ctx.save(); ctx.translate(x, y - radius*2);
            const himmelGrad = ctx.createLinearGradient(0, -radius*6, 0, radius*2);
            himmelGrad.addColorStop(0, `rgba(253, 224, 71, ${himmelAlpha})`); 
            himmelGrad.addColorStop(0.6, `rgba(96, 165, 250, ${himmelAlpha * 0.5})`); 
            himmelGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = himmelGrad; ctx.shadowBlur = 20; ctx.shadowColor = '#fde047';
            
            ctx.beginPath();
            ctx.moveTo(-radius*2.5, radius*2); 
            ctx.bezierCurveTo(-radius*2, -radius*3, -radius*1.5, -radius*5, 0, -radius*6); 
            ctx.bezierCurveTo(radius*1.5, -radius*5, radius*2, -radius*3, radius*2.5, radius*2); 
            ctx.fill(); ctx.restore();
        }

        ctx.save(); ctx.translate(x, y + 5 + floatY); ctx.scale(1, 0.35); 
        const voidGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 8);
        voidGrad.addColorStop(0, 'rgba(255, 255, 255, 0.8)'); 
        voidGrad.addColorStop(0.2, 'rgba(30, 27, 75, 0.8)'); 
        voidGrad.addColorStop(0.6, 'rgba(14, 165, 233, 0.4)'); 
        voidGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = voidGrad; ctx.beginPath(); ctx.arc(0, 0, radius*8, 0, Math.PI*2); ctx.fill();

        ctx.rotate(time * -0.0003);
        ctx.strokeStyle = `rgba(186, 230, 253, ${0.4 + pulse * 0.2})`; ctx.lineWidth = 1.5; ctx.shadowColor = '#38bdf8'; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(0, 0, radius * 6, 0, Math.PI*2); ctx.stroke();
        ctx.setLineDash([5, 15, 2, 10]); ctx.beginPath(); ctx.arc(0, 0, radius * 7, 0, Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
        
        for(let i=0; i<3; i++) {
            ctx.rotate(Math.PI*2/3);
            ctx.beginPath(); ctx.moveTo(-radius*7, 0); ctx.bezierCurveTo(-radius*3, radius*3, radius*3, -radius*3, radius*7, 0); ctx.stroke();
        }
        ctx.restore();

        const wingFlap = Math.sin(time * 0.002) * 0.15 + 0.1;
        for (let w = -1; w <= 1; w += 2) {
            ctx.save(); ctx.translate(x, y - radius + floatY); ctx.scale(w, 1); ctx.rotate(wingFlap);
            
            const wingGrad = ctx.createLinearGradient(0, 0, radius*8, -radius*5);
            wingGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
            wingGrad.addColorStop(0.4, 'rgba(14, 165, 233, 0.6)');
            wingGrad.addColorStop(1, 'rgba(30, 27, 75, 0)');
            ctx.fillStyle = wingGrad; ctx.shadowBlur = 20; ctx.shadowColor = '#0ea5e9';
            
            ctx.beginPath(); ctx.moveTo(radius, 0);
            ctx.bezierCurveTo(radius*3, -radius*5, radius*6, -radius*4, radius*9 + Math.sin(time*0.002)*4, -radius*2);
            ctx.quadraticCurveTo(radius*7, radius*1, radius*8, radius*3);
            ctx.quadraticCurveTo(radius*5, radius*2, radius*5, radius*4);
            ctx.quadraticCurveTo(radius*3, radius*2, radius, radius*1);
            ctx.fill();

            const stars = [ {x: radius*2, y: -radius*1}, {x: radius*4, y: -radius*3}, {x: radius*7, y: -radius*2}, {x: radius*5, y: radius*1}, {x: radius*3, y: radius*1.5} ];
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'; ctx.lineWidth = 1; ctx.shadowBlur = 5; ctx.shadowColor = '#ffffff';
            ctx.beginPath(); ctx.moveTo(stars[0].x, stars[0].y);
            for(let i=1; i<stars.length; i++) ctx.lineTo(stars[i].x, stars[i].y);
            ctx.stroke();
            
            ctx.fillStyle = '#fde047'; 
            stars.forEach(st => { ctx.beginPath(); ctx.arc(st.x, st.y, 1.5 + Math.random(), 0, Math.PI*2); ctx.fill(); });
            ctx.restore();
        }

        ctx.globalCompositeOperation = 'source-over';
        for(let i=0; i<2; i++) {
            const bAng = time*0.001 + (i*Math.PI);
            const bX = x + Math.cos(bAng)*radius*5.5;
            const bY = y - radius*2 + floatY + Math.sin(bAng*2)*radius*1.5;
            
            ctx.save(); ctx.translate(bX, bY); ctx.translate(0, Math.sin(time*0.003 + i)*4); 
            ctx.shadowBlur = 15; ctx.shadowColor = '#7dd3fc';
            ctx.fillStyle = '#0f172a'; ctx.fillRect(-10, -2, 20, 4); 
            
            ctx.fillStyle = '#f8fafc';
            const pageFlap = Math.abs(Math.sin(time*0.002 + i));
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-5, -5 * pageFlap, -10, -2); ctx.lineTo(-10, 2); ctx.lineTo(0, 2); ctx.fill();
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(5, -5 * (1-pageFlap), 10, -2); ctx.lineTo(10, 2); ctx.lineTo(0, 2); ctx.fill();
            ctx.restore();

            ctx.strokeStyle = i===0 ? 'rgba(253, 224, 71, 0.6)' : 'rgba(186, 230, 253, 0.6)'; 
            ctx.lineWidth = 2; ctx.beginPath();
            for(let j=0; j<=15; j++) {
                const rA = (time * -0.002) + (i * Math.PI) + (j * 0.3);
                const rD = radius * 3.5 + Math.sin(time*0.004 + j)*3;
                const rx = x + Math.cos(rA) * rD;
                const ry = y + radius - (j * 3) + Math.sin(rA)*5 + floatY;
                if(j===0) ctx.moveTo(rx, ry); else ctx.lineTo(rx, ry);
            }
            ctx.stroke();
        }

        ctx.globalCompositeOperation = 'lighter';
        if (!eng.eternityParticles) eng.eternityParticles = [];
        if (eng.eternityParticles.length < 45 && Math.random() < 0.6) {
            const type = Math.random(); 
            eng.eternityParticles.push({
                ox: (Math.random() - 0.5) * radius * 12, oy: (Math.random() - 0.5) * radius * 10,
                vx: (Math.random() - 0.5) * 1.5, vy: (type < 0.2) ? 0.5 + Math.random() : -0.5 - Math.random(), 
                size: (type > 0.8) ? 3+Math.random()*2 : 1.5+Math.random()*2, 
                life: 1, rot: Math.random()*Math.PI*2, rs: (Math.random()-0.5)*0.05, type: type
            });
        }
        eng.eternityParticles.forEach((p, i) => {
            if (p.type < 0.2) {
                p.ox -= Math.sign(p.ox) * 0.5; p.oy -= Math.sign(p.oy) * 0.5; 
            } else {
                p.oy += p.vy; p.ox += p.vx + Math.sin(time*0.002 + i)*0.8; 
            }
            p.rot += p.rs; p.life -= 0.004; 
            if (p.life <= 0 || Math.abs(p.ox) < 2) { eng.eternityParticles.splice(i, 1); return; }

            ctx.save(); ctx.translate(x + p.ox, y + p.oy + floatY); ctx.rotate(p.rot);
            
            if (p.type > 0.8) {
                ctx.fillStyle = `rgba(96, 165, 250, ${p.life})`; 
                ctx.shadowBlur = 10; ctx.shadowColor = '#38bdf8';
                for(let f=0; f<5; f++) {
                    const fAng = f * Math.PI * 2 / 5;
                    ctx.beginPath(); ctx.arc(Math.cos(fAng)*p.size, Math.sin(fAng)*p.size, p.size, 0, Math.PI*2); ctx.fill();
                }
                ctx.fillStyle = `rgba(253, 224, 71, ${p.life})`; 
                ctx.beginPath(); ctx.arc(0, 0, p.size*0.6, 0, Math.PI*2); ctx.fill();
            } else if (p.type > 0.6) {
                const flap = Math.abs(Math.sin(time * 0.02 + i)); ctx.scale(flap, 1);
                ctx.fillStyle = `rgba(186, 230, 253, ${p.life})`; ctx.shadowBlur = 10; ctx.shadowColor = '#0ea5e9';
                ctx.beginPath(); ctx.ellipse(p.size, 0, p.size, p.size*1.5, Math.PI/4, 0, Math.PI*2); ctx.fill(); 
                ctx.beginPath(); ctx.ellipse(-p.size, 0, p.size, p.size*1.5, -Math.PI/4, 0, Math.PI*2); ctx.fill(); 
            } else {
                ctx.fillStyle = `rgba(255, 255, 255, ${p.life})`; ctx.shadowBlur = 8; ctx.shadowColor = '#fde047';
                ctx.beginPath(); ctx.arc(0, 0, p.size*0.8, 0, Math.PI*2); ctx.fill();
            }
            ctx.restore();
        });

        ctx.save(); ctx.translate(x, y - radius*3.5 + floatY);
        ctx.scale(1, 0.3); ctx.rotate(time * 0.001);
        ctx.strokeStyle = 'rgba(224, 242, 254, 0.8)'; ctx.lineWidth = 2; ctx.shadowBlur = 15; ctx.shadowColor = '#7dd3fc';
        ctx.beginPath(); ctx.arc(0, 0, radius*2.5, 0, Math.PI*2); ctx.stroke();
        for(let i=0; i<6; i++) {
            ctx.rotate(Math.PI*2/6);
            ctx.fillStyle = '#60a5fa'; ctx.beginPath(); ctx.arc(radius*2.5, 0, 2.5, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.arc(radius*2.5, 0, 1, 0, Math.PI*2); ctx.fill();
        }
        ctx.restore();

        const eternalGrad = ctx.createRadialGradient(x, y - radius + floatY, 0, x, y - radius + floatY, radius * 5);
        eternalGrad.addColorStop(0, 'rgba(255, 255, 255, 1)'); 
        eternalGrad.addColorStop(0.3, 'rgba(96, 165, 250, 0.6)'); 
        eternalGrad.addColorStop(0.7, 'rgba(30, 27, 75, 0.2)'); 
        eternalGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');     
        ctx.fillStyle = eternalGrad; ctx.beginPath(); ctx.arc(x, y - radius + floatY, radius * 5, 0, Math.PI * 2); ctx.fill();
    }
};

export const LiveSkinPreview = ({ skin }) => {
  const canvasRef = useRef(null);
  const engRef = useRef({}); 
  const isVisibleRef = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
          isVisibleRef.current = entry.isIntersecting;
      },
      { rootMargin: '100px' } 
    );
    if (canvasRef.current) observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationId;
    let lastTime = 0;

    const render = (timestamp) => {
      animationId = requestAnimationFrame(render);
      
      if (!isVisibleRef.current) return;
      if (timestamp - lastTime < 40) return; 
      lastTime = timestamp;

      const time = performance.now();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const x = canvas.width / 2;
      const y = canvas.height / 2 + 10;
      const radius = 6; 
      const eng = engRef.current;

      drawAdvancedSkinAura(ctx, x, y, radius, skin.id, time, eng);

      if (skin.id === 'frieren') {
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = skin.colors.brim;
          ctx.beginPath(); ctx.ellipse(x, y - radius * 1.1, radius * 1.8, radius * 0.4, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = skin.colors.brim;
          ctx.beginPath(); ctx.moveTo(x, y - radius * 2); ctx.lineTo(x - radius * 2.2, y + radius * 1.5); ctx.lineTo(x + radius * 2.2, y + radius * 1.5); ctx.fill();
          ctx.fillStyle = skin.colors.robe;
          ctx.beginPath(); ctx.moveTo(x, y - radius * 1.8); ctx.lineTo(x - radius * 1.9, y + radius * 1.4); ctx.lineTo(x + radius * 1.9, y + radius * 1.4); ctx.fill();
          ctx.fillStyle = skin.colors.robe;
          ctx.beginPath(); ctx.moveTo(x, y - radius); ctx.lineTo(x - radius * 1.2, y + radius * 1.2); ctx.lineTo(x + radius * 1.2, y + radius * 1.2); ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.save(); ctx.translate(x - radius * 0.8, y - radius * 0.8); ctx.rotate(0.15); ctx.fillRect(-1.5, 0, 3, radius * 2); ctx.restore();
          ctx.save(); ctx.translate(x + radius * 0.8, y - radius * 0.8); ctx.rotate(-0.15); ctx.fillRect(-1.5, 0, 3, radius * 2);
          ctx.fillStyle = '#ef4444'; ctx.fillRect(-1, radius * 2, 2, 2.5); ctx.restore();
          ctx.fillStyle = skin.colors.c; ctx.shadowBlur = 10; ctx.shadowColor = skin.glow; 
          ctx.beginPath(); ctx.arc(x, y - radius * 0.5, radius * 0.9, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
          ctx.fillStyle = '#ffffff'; ctx.shadowBlur = 8; ctx.shadowColor = skin.glow;
          ctx.beginPath(); ctx.arc(x - 2.5, y - radius * 0.5, 1.2, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(x + 2.5, y - radius * 0.5, 1.2, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0;
      } else {
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = skin.colors.robe; ctx.beginPath();
          ctx.moveTo(x, y - radius); ctx.lineTo(x - radius * 1.5, y + radius * 1.5); ctx.lineTo(x + radius * 1.5, y + radius * 1.5); ctx.fill();
          ctx.fillStyle = skin.colors.c; ctx.shadowBlur = 15; ctx.shadowColor = skin.glow; ctx.beginPath(); ctx.arc(x, y - radius * 0.5, radius * 0.8, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
          ctx.fillStyle = '#030111'; ctx.beginPath(); ctx.arc(x - 2, y - radius * 0.5, 1, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(x + 2, y - radius * 0.5, 1, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = skin.colors.brim; ctx.beginPath(); ctx.ellipse(x, y - radius * 1.1, radius * 1.8, radius * 0.4, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = skin.colors.robe; ctx.beginPath(); ctx.moveTo(x - radius, y - radius * 1.1); ctx.lineTo(x, y - radius * 3); ctx.lineTo(x + radius, y - radius * 1.1); ctx.fill();
      }
    };
    
    animationId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationId);
  }, [skin]);

  return (
    <canvas 
      ref={canvasRef} 
      width={70} 
      height={70} 
      style={{
        background: 'rgba(0, 0, 0, 0.4)', borderRadius: '8px',
        border: `1px solid ${skin.glow}60`, boxShadow: `inset 0 0 15px ${skin.glow}30`,
        flexShrink: 0
      }}
    />
  );
};

// 🔥 NAKALABAS DITO ANG LIVE FAMILIAR PREVIEW (Para hindi mag-error)
export function LiveFamiliarPreview({ id, level }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const render = () => {
      const t = performance.now();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(2.5, 2.5); 

      const f = { id, level };

  if (f.id === 'wisp') {
  // --- 1. FAKE GLOW (Heat Aura) ---
  ctx.fillStyle = 'rgba(239, 68, 68, 0.15)'; 
  ctx.beginPath(); 
  ctx.arc(0, 0, 18, 0, Math.PI * 2); 
  ctx.fill();

  // --- 2. BURN EMBERS (Lumulutang na Sparks) ---
  // Mga baga na umaakyat pataas habang umiindayog
  ctx.fillStyle = '#fca5a5';
  for (let i = 0; i < 3; i++) {
    const ex = Math.sin(t * 0.02 + i) * 12; // Sway left and right
    const ey = 10 - ((t * 0.05 + i * 10) % 20); // Float upward reset logic
    ctx.beginPath(); 
    ctx.arc(ex, ey, 1.2, 0, Math.PI * 2); 
    ctx.fill();
  }

  // ✨ LEVEL 5 TRANSFORMATION: Bat-like Fiery Wings
  // Idodraw natin ang pakpak BAGO ang katawan para nasa likod ito
  if (f.level >= 5) {
    const wingFlap = Math.cos(t * 0.08) * 3;
    ctx.fillStyle = 'rgba(185, 28, 28, 0.8)'; // Dark red demonic wings
    
    // Kaliwang Pakpak (Matulis / Bat-style)
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.lineTo(-14, -8 - wingFlap);
    ctx.lineTo(-12, -2 - wingFlap);
    ctx.lineTo(-16, 4 - wingFlap);
    ctx.lineTo(-4, 5);
    ctx.fill();

    // Kanang Pakpak
    ctx.beginPath();
    ctx.moveTo(4, 0);
    ctx.lineTo(14, -8 - wingFlap);
    ctx.lineTo(12, -2 - wingFlap);
    ctx.lineTo(16, 4 - wingFlap);
    ctx.lineTo(4, 5);
    ctx.fill();
  }

  // --- 3. DEMON HORNS ---
  ctx.fillStyle = '#450a0a'; // Dark reddish-black
  // Kaliwang Sungay
  ctx.beginPath(); ctx.moveTo(-3, -4); ctx.quadraticCurveTo(-8, -10, -5, -14); ctx.quadraticCurveTo(-2, -8, -1, -5); ctx.fill();
  // Kanang Sungay
  ctx.beginPath(); ctx.moveTo(3, -4); ctx.quadraticCurveTo(8, -10, 5, -14); ctx.quadraticCurveTo(2, -8, 1, -5); ctx.fill();

  // --- 4. MAIN FLAME BODY (Demon Core) ---
  const breath = Math.sin(t * 0.05) * 2; // Pulsing/Breathing animation
  
  // Katawang Apoy (Orange)
  ctx.fillStyle = `rgba(249, 115, 22, ${0.8 + Math.sin(t * 0.01) * 0.2})`; 
  ctx.beginPath();
  ctx.moveTo(0, -10 - breath); // Apoy sa taas
  ctx.quadraticCurveTo(8, -2, 6, 6 + breath/2); 
  ctx.quadraticCurveTo(0, 10 + breath, -6, 6 + breath/2); 
  ctx.quadraticCurveTo(-8, -2, 0, -10 - breath); 
  ctx.fill();

  // Inner Yellow Heat (Gitna ng apoy)
  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  ctx.moveTo(0, -4 - breath);
  ctx.quadraticCurveTo(4, 2, 3, 5);
  ctx.quadraticCurveTo(0, 7, -3, 5);
  ctx.quadraticCurveTo(-4, 2, 0, -4 - breath);
  ctx.fill();

  // --- 5. DEMON EYES ---
  ctx.fillStyle = '#7f1d1d'; // Deep red eye sockets
  ctx.beginPath();
  ctx.ellipse(-2.5, 2, 1.5, 0.5, Math.PI/6, 0, Math.PI*2); // Left eye slanted
  ctx.ellipse(2.5, 2, 1.5, 0.5, -Math.PI/6, 0, Math.PI*2); // Right eye slanted
  ctx.fill();
  
  // Glowing yellow pupils
  ctx.fillStyle = '#fde047'; 
  ctx.beginPath(); ctx.arc(-2.5, 2, 0.6, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(2.5, 2, 0.6, 0, Math.PI*2); ctx.fill();

  // ✨ LEVEL 10 TRANSFORMATION: Orbiting Hellfires & Wild Embers
  if (f.level >= 10) {
    // Extra intense embers (Mas maraming umuumbok pataas)
    ctx.fillStyle = '#fde047'; // Yellow-hot embers
    for (let i = 3; i < 7; i++) {
      const ex = Math.sin(t * 0.03 + i * 5) * 16;
      const ey = 15 - ((t * 0.08 + i * 8) % 30);
      ctx.beginPath(); ctx.arc(ex, ey, 1.5, 0, Math.PI * 2); ctx.fill();
    }

    // 3 Umiikot na Hellfire Skulls/Orbs
    const orbit = t * 0.004;
    for(let i = 0; i < 3; i++) {
      const oA = orbit + (i * Math.PI * 2 / 3);
      const fx = Math.cos(oA) * 22;
      const fy = Math.sin(oA) * 22;

      // Mini Fake Glow
      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.beginPath(); ctx.arc(fx, fy, 6, 0, Math.PI*2); ctx.fill();

      // Mini Hellfire shape
      ctx.fillStyle = '#ea580c'; // Orange
      ctx.beginPath();
      ctx.moveTo(fx, fy - 6);
      ctx.quadraticCurveTo(fx + 4, fy, fx + 3, fy + 3);
      ctx.quadraticCurveTo(fx, fy + 5, fx - 3, fy + 3);
      ctx.quadraticCurveTo(fx - 4, fy, fx, fy - 6);
      ctx.fill();

      // Core ng mini hellfire
      ctx.fillStyle = '#fde047';
      ctx.beginPath(); ctx.arc(fx, fy + 2, 1.5, 0, Math.PI*2); ctx.fill();
    }
  }
} 
     else if (f.id === 'fairy') {
  ctx.save(); 

  // --- BASE FAIRY ---
  // Base Green Glow
  ctx.fillStyle = 'rgba(34, 197, 94, 0.3)'; 
  ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
  
  // Base Body
  ctx.fillStyle = '#86efac';
  ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();

  // Base Upper Wings
  const flap = Math.abs(Math.sin(t * 0.015)) * 6 + 1;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.beginPath(); ctx.ellipse(-5, -3, 8, flap, Math.PI/4, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(5, -3, 8, flap, -Math.PI/4, 0, Math.PI*2); ctx.fill();

  // --- LEVEL 5 UPGRADES (GLOWING HALO) ---
  if (f.level >= 5) {
    // Lower Wings
    const flapLower = Math.abs(Math.cos(t * 0.015)) * 4 + 1;
    ctx.fillStyle = 'rgba(200, 255, 200, 0.6)';
    ctx.beginPath(); ctx.ellipse(-3, 4, 6, flapLower, Math.PI/3, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(3, 4, 6, flapLower, -Math.PI/3, 0, Math.PI*2); ctx.fill();

    // Halo Animation Setup
    const haloPulse = Math.abs(Math.sin(t * 0.005)) * 2;
    const hX = 0;
    const hY = -14 - haloPulse; // Itinaas ng konti para sa crown mamaya
    const hRadiusX = 9 + (haloPulse / 2);
    const hRadiusY = 2.5;

    // LAYERED HALO GLOW (Neon Effect)
    // Layer 1: Makapal at Malabong Outer Glow
    ctx.strokeStyle = 'rgba(253, 224, 71, 0.2)';
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.ellipse(hX, hY, hRadiusX, hRadiusY, 0, 0, Math.PI*2); ctx.stroke();

    // Layer 2: Medium Glow
    ctx.strokeStyle = 'rgba(253, 224, 71, 0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(hX, hY, hRadiusX, hRadiusY, 0, 0, Math.PI*2); ctx.stroke();

    // Layer 3: Maliwanag na Core (White-Yellow)
    ctx.strokeStyle = '#fffbeb';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(hX, hY, hRadiusX, hRadiusY, 0, 0, Math.PI*2); ctx.stroke();
  }

  // --- LEVEL 10 UPGRADES (GLOWING CROWN & MINI FAERIES) ---
  if (f.level >= 10) {
    
    // PATH NG CROWN (Ginawang function para ma-reuse sa glow at core)
    const drawCrownPath = () => {
      ctx.beginPath();
      ctx.moveTo(-3, -5);   ctx.lineTo(-4.5, -9.5); ctx.lineTo(-1.5, -7.5); 
      ctx.lineTo(0, -11);   ctx.lineTo(1.5, -7.5);  ctx.lineTo(4.5, -9.5); 
      ctx.lineTo(3, -5);
      ctx.closePath();
    };

    // LAYERED CROWN GLOW
    ctx.lineJoin = 'round';
    
    // Layer 1: Malawak na Orange/Gold Glow sa likod
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
    ctx.lineWidth = 5;
    drawCrownPath(); ctx.stroke();

    // Layer 2: Mas matapang na Yellow Glow
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.8)';
    ctx.lineWidth = 2.5;
    drawCrownPath(); ctx.stroke();

    // Layer 3: Solid Gold Core Fill
    ctx.fillStyle = '#fef08a'; // Napakaliwanag na yellow/gold
    drawCrownPath(); ctx.fill();


    // ORBITING MINI FAERIES (May sarili ring mini-glow)
    for (let i = 0; i < 2; i++) {
      const offset = i * Math.PI; 
      const orbitRadius = 18;     
      const speed = t * 0.002;
      const miniX = Math.cos(speed + offset) * orbitRadius;
      const miniY = Math.sin(speed + offset) * orbitRadius;

      // Mini Fairy Glow
      ctx.fillStyle = 'rgba(103, 232, 249, 0.4)'; // Cyan glow
      ctx.beginPath(); ctx.arc(miniX, miniY, 6, 0, Math.PI*2); ctx.fill();

      // Mini Fairy Core Body
      ctx.fillStyle = '#e0f2fe';
      ctx.beginPath(); ctx.arc(miniX, miniY, 2.5, 0, Math.PI*2); ctx.fill();

      // Mini Fairy Wings
      const miniFlap = Math.abs(Math.sin(t * 0.03 + offset)) * 3 + 0.5;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath(); ctx.ellipse(miniX - 2.5, miniY - 1.5, 3.5, miniFlap, Math.PI/4, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(miniX + 2.5, miniY - 1.5, 3.5, miniFlap, -Math.PI/4, 0, Math.PI*2); ctx.fill();
    }
  }

  ctx.restore(); 
}
      else if (f.id === 'voidling') {
        const float = Math.sin(t * 0.005) * 4;
        ctx.shadowBlur = 10; ctx.shadowColor = '#a855f7';
        ctx.strokeStyle = 'rgba(217, 70, 239, 0.8)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(0, float, 12, 4 + Math.sin(t*0.01)*2, t*0.002, 0, Math.PI*2); ctx.stroke();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath(); ctx.arc(0, float, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f472b6';
        ctx.beginPath(); ctx.ellipse(0, float, 3, 5, 0, 0, Math.PI*2); ctx.fill();
        if (f.level >= 5) {
          ctx.strokeStyle = 'rgba(192, 132, 252, 0.5)';
          ctx.beginPath(); ctx.arc(0, float, 18, 0, Math.PI*2); ctx.stroke();
        }
        if (f.level >= 10) {
          ctx.fillStyle = '#e879f9';
          for(let i=0; i<4; i++) {
            const pA = t*0.003 + (i*Math.PI/2);
            ctx.beginPath(); ctx.arc(Math.cos(pA)*22, Math.sin(pA)*22 + float, 2, 0, Math.PI*2); ctx.fill();
          }
        }
      }
else if (f.id === 'frost') {
  // --- 1. FAKE GLOW (Ice Aura - Performance Friendly) ---
  ctx.fillStyle = 'rgba(56, 189, 248, 0.15)'; 
  ctx.beginPath(); 
  ctx.arc(0, 0, 18, 0, Math.PI * 2); 
  ctx.fill();

  // --- 2. SNOWFLAKE SA LIKOD (Background Layer) ---
  // Dito tayo magdo-draw ng umiikot na snowflake BAGO idraw yung fairy
  ctx.save();
  ctx.rotate(t * 0.002); // Mabagal na pag-ikot
  ctx.strokeStyle = 'rgba(186, 230, 253, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  // Paggawa ng 6-pointed snowflake
  for (let i = 0; i < 6; i++) {
    ctx.moveTo(0, 0); ctx.lineTo(0, -14); // Main line
    ctx.moveTo(0, -6); ctx.lineTo(-3, -10); // Kaliwang sanga
    ctx.moveTo(0, -6); ctx.lineTo(3, -10);  // Kanang sanga
    ctx.rotate(Math.PI / 3); // 60 degrees rotation per spoke
  }
  ctx.stroke();
  ctx.restore();

  // --- 3. ICE FAIRY WINGS (Matulis / Crystalline) ---
  const flap = Math.sin(t * 0.05) * 2;
  ctx.fillStyle = 'rgba(186, 230, 253, 0.8)';
  
  // Kaliwang Pakpak
  ctx.beginPath();
  ctx.moveTo(-2, -2); 
  ctx.lineTo(-10, -10 - flap); 
  ctx.lineTo(-14, -2 - flap); 
  ctx.lineTo(-4, 2);
  ctx.fill();
  
  // Kanang Pakpak
  ctx.beginPath();
  ctx.moveTo(2, -2); 
  ctx.lineTo(10, -10 - flap); 
  ctx.lineTo(14, -2 - flap); 
  ctx.lineTo(4, 2);
  ctx.fill();

  // --- 4. KATAWAN NG ICE FAIRY ---
  ctx.fillStyle = '#38bdf8'; // Icy blue dress
  ctx.beginPath();
  ctx.moveTo(0, -4); // Leeg
  ctx.lineTo(-4, 8); // Laylayan (Kaliwa)
  ctx.lineTo(0, 11); // Matulis na ilalim (parang icicle)
  ctx.lineTo(4, 8);  // Laylayan (Kanan)
  ctx.fill();

  // ULO
  ctx.fillStyle = '#e0f2fe'; // Pale white/blue face
  ctx.beginPath();
  ctx.arc(0, -6, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // ✨ LEVEL 5 TRANSFORMATION: Hexagon Ice Shield
  if (f.level >= 5) {
    ctx.strokeStyle = 'rgba(14, 165, 233, 0.8)'; // Darker cyan border
    ctx.lineWidth = 1.5;
    ctx.save();
    ctx.rotate(-t * 0.01); // Paatras na ikot kumpara sa likod
    ctx.beginPath();
    // Paggawa ng hugis Hexagon na parang crystal base
    for(let i = 0; i < 6; i++) {
      ctx.lineTo(Math.cos(i * Math.PI / 3) * 12, Math.sin(i * Math.PI / 3) * 12);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  // ✨ LEVEL 10 TRANSFORMATION: Orbiting Mini Snowflakes
  if (f.level >= 10) {
    const orbit = t * 0.003;
    
    for (let i = 0; i < 3; i++) {
      const a = orbit + (i * Math.PI * 2 / 3);
      const fx = Math.cos(a) * 22; // Orbit x
      const fy = Math.sin(a) * 22 + Math.cos(t * 0.05 + i) * 3; // Orbit y + konting pag-angat (bobbing)
      
      // Mini ice glow para lumitaw
      ctx.fillStyle = 'rgba(186, 230, 253, 0.4)';
      ctx.beginPath(); 
      ctx.arc(fx, fy, 5, 0, Math.PI * 2); 
      ctx.fill();

      // Pagguhit ng mabilis na umiikot na mini snowflakes
      ctx.save();
      ctx.translate(fx, fy);
      ctx.rotate(t * 0.05); // Fast spin
      ctx.strokeStyle = '#bae6fd';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for(let j = 0; j < 6; j++) {
        ctx.moveTo(0, 0); 
        ctx.lineTo(0, -4);
        ctx.rotate(Math.PI / 3);
      }
      ctx.stroke();
      ctx.restore();
    }
  }
}
else if (f.id === 'golem') {
        ctx.save();
        
        // 🚀 CONSTANTS
        const PI2 = 6.283;
        const float = Math.sin(t * 0.005) * 3; 

        // ✨ BASE FORM: ARCANE MECHA CORE & FLOATING ARMOR
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#06b6d4'; // High-tech Neon Cyan Glow

        // Central Energy Reactor (Ang "Puso" ng Automaton)
        ctx.fillStyle = '#cffafe';
        ctx.beginPath(); 
        ctx.arc(0, float, 4.5, 0, PI2); 
        ctx.fill();

        ctx.shadowBlur = 0; // Optimize performance

        // Obsidian Carapace (Floating Segmented Metal Armor)
        ctx.fillStyle = '#0f172a';   
        ctx.strokeStyle = '#fbbf24'; // Gold trims
        ctx.lineWidth = 1.5;

        // Top Crown / Mantle Armor 
        ctx.beginPath();
        ctx.moveTo(-10, -5 + float); ctx.lineTo(0, -14 + float);
        ctx.lineTo(10, -5 + float); ctx.lineTo(0, -9 + float);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // Bottom Chassis Armor 
        ctx.beginPath();
        ctx.moveTo(-8, 5 + float); ctx.lineTo(0, 14 + float);
        ctx.lineTo(8, 5 + float); ctx.lineTo(0, 9 + float);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // ✨ TRANSFORMATION: LEVEL 5 (Heavy Runic Gauntlets)
        if (f.level >= 5) {
          const sway = Math.cos(t * 0.005) * 4; 

          // Left Mechanical Gauntlet
          ctx.beginPath();
          ctx.moveTo(-18, -4 + sway); ctx.lineTo(-12, -2 + sway);
          ctx.lineTo(-10, 8 + sway); ctx.lineTo(-16, 12 + sway);
          ctx.lineTo(-20, 6 + sway);
          ctx.closePath();
          ctx.fill(); ctx.stroke();
          
          // Left Gauntlet Cyan Energy Vent
          ctx.fillStyle = '#22d3ee';
          ctx.fillRect(-17, 2 + sway, 3, 5);

          // Right Mechanical Gauntlet
          ctx.fillStyle = '#0f172a'; 
          ctx.beginPath();
          ctx.moveTo(18, -4 - sway); ctx.lineTo(12, -2 - sway);
          ctx.lineTo(10, 8 - sway); ctx.lineTo(16, 12 - sway);
          ctx.lineTo(20, 6 - sway);
          ctx.closePath();
          ctx.fill(); ctx.stroke();
          
          // Right Gauntlet Cyan Energy Vent
          ctx.fillStyle = '#22d3ee';
          ctx.fillRect(14, 2 - sway, 3, 5);
        }

        // ✨ TRANSFORMATION: LEVEL 10 (Hexagon Forcefield Only)
        if (f.level >= 10) {
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#06b6d4';

          // 1. Holographic Hexagon Shield (Sci-Fi Hex Grid)
          ctx.strokeStyle = 'rgba(6, 182, 212, 0.5)'; // Cyan color
          ctx.lineWidth = 1.5;
          const hexRot = t * 0.0015;
          ctx.beginPath();
          for (let i = 0; i <= 6; i++) {
            const a = hexRot + (i * 1.047); // 1.047 rad = 60 degrees
            const hx = Math.cos(a) * 26;
            const hy = float + Math.sin(a) * 26;
            if (i === 0) ctx.moveTo(hx, hy);
            else ctx.lineTo(hx, hy);
          }
          ctx.stroke();

          // 2. Inner Golden Tech-Triangle (Umiikot nang pabaliktad)
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)'; // Gold color
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let i = 0; i <= 3; i++) {
            const a = -hexRot + (i * 2.094); // 2.094 rad = 120 degrees
            const tx = Math.cos(a) * 16;
            const ty = float + Math.sin(a) * 16;
            if (i === 0) ctx.moveTo(tx, ty);
            else ctx.lineTo(tx, ty);
          }
          ctx.stroke();
        }

        ctx.restore();
      }
      else if (f.id === 'thunder') {
  // Mabilis na pulse para sa kuryente
  const pulse = Math.sin(t * 0.1) * 2; 

  // --- 1. FAKE GLOW (Neon Purple Aura) ---
  ctx.fillStyle = `rgba(217, 70, 239, ${0.15 + pulse * 0.02})`;
  ctx.beginPath(); 
  ctx.arc(0, 0, 20 + pulse, 0, Math.PI*2); 
  ctx.fill();

  // ✨ LEVEL 10 TRANSFORMATION: Electric Wings (Nasa likod kaya unang idinraw)
  if (f.level >= 10) {
    const flap = Math.cos(t * 0.15) * 4; // Mabilis na pagkampay
    ctx.strokeStyle = '#f0abfc'; // Bright pinkish-white
    ctx.lineWidth = 2;
    
    // Left Electric Wing (Zig-zag)
    ctx.beginPath();
    ctx.moveTo(-4, 0); 
    ctx.lineTo(-12, -8 - flap); 
    ctx.lineTo(-10, -4 - flap); 
    ctx.lineTo(-20, 2 - flap);
    ctx.stroke();
    
    // Right Electric Wing (Zig-zag)
    ctx.beginPath();
    ctx.moveTo(4, 0); 
    ctx.lineTo(12, -8 - flap); 
    ctx.lineTo(10, -4 - flap); 
    ctx.lineTo(20, 2 - flap);
    ctx.stroke();
  }

  // --- 2. LIGHTNING HORNS (Mga sungay na parang kidlat) ---
  ctx.fillStyle = '#fdf4ff'; // Bright neon white
  // Left Horn
  ctx.beginPath(); 
  ctx.moveTo(-3, -6); ctx.lineTo(-8, -12); ctx.lineTo(-5, -14); ctx.lineTo(-10, -20); ctx.lineTo(-2, -8); 
  ctx.fill();
  // Right Horn
  ctx.beginPath(); 
  ctx.moveTo(3, -6); ctx.lineTo(8, -12); ctx.lineTo(5, -14); ctx.lineTo(10, -20); ctx.lineTo(2, -8); 
  ctx.fill();

  // --- 3. DEMON CORE BODY (Angular / Mecha-Demon Face) ---
  ctx.fillStyle = '#701a75'; // Dark intense purple
  ctx.beginPath();
  ctx.moveTo(0, -8);  // Tuktok ng ulo
  ctx.lineTo(7, -2);  // Kanang pisngi
  ctx.lineTo(4, 8);   // Kanang panga
  ctx.lineTo(0, 12);  // Matulis na baba
  ctx.lineTo(-4, 8);  // Kaliwang panga
  ctx.lineTo(-7, -2); // Kaliwang pisngi
  ctx.fill();

  // --- 4. DEMON EYES (Nagniningning na neon slits) ---
  ctx.fillStyle = '#fdf4ff';
  ctx.beginPath();
  ctx.moveTo(-2, -1); ctx.lineTo(-6, -3); ctx.lineTo(-2, 1); ctx.fill(); // Left eye
  ctx.beginPath();
  ctx.moveTo(2, -1); ctx.lineTo(6, -3); ctx.lineTo(2, 1); ctx.fill(); // Right eye

  // ✨ LEVEL 5 TRANSFORMATION: Rotating Electric Halo (Atom-style)
  if (f.level >= 5) {
    ctx.strokeStyle = '#d946ef'; // Neon Magenta
    ctx.lineWidth = 1.5;
    ctx.save();
    ctx.rotate(t * 0.02); // Mabilis na pag-ikot
    // Dalawang nagkrus na ellipse parang electron orbit
    ctx.beginPath(); ctx.ellipse(0, 0, 16, 4, 0, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0, 16, 4, Math.PI/2, 0, Math.PI*2); ctx.stroke();
    ctx.restore();
  }

  // ✨ LEVEL 10 TRANSFORMATION: High Voltage Lightning Strikes
  if (f.level >= 10 && Math.random() < 0.4) { // Tumaas ang chance pumitik
    ctx.strokeStyle = '#ffffff'; 
    ctx.lineWidth = 1.5;
    ctx.beginPath(); 
    ctx.moveTo(0,0); 
    
    // Imbes na isang diretso, ginawa nating "zig-zag" ang kidlat para mas realistic!
    const midX = (Math.random() - 0.5) * 20;
    const midY = (Math.random() - 0.5) * 20;
    const endX = midX + (Math.random() - 0.5) * 25;
    const endY = midY + (Math.random() - 0.5) * 25;
    
    ctx.lineTo(midX, midY); // Unang pitik ng kidlat
    ctx.lineTo(endX, endY); // Pangalawang pitik ng kidlat
    ctx.stroke();
  }
}

else if (f.id === 'shadow') {
        ctx.save(); // I-save ang state para hindi madamay ang ibang drawing sa lag/glow

        // 🔥 BASE FORM: VAMPIRE DEMON (With GLOW & BLUR)
        ctx.shadowBlur = 15; 
        ctx.shadowColor = '#ef4444'; // Glowing red aura
        
        // Demon Wings
        const flap = Math.sin(t * 0.015) * 6; 
        ctx.fillStyle = '#3b0764'; // Deep dark purple
        
        ctx.beginPath(); 
        // Left Wing
        ctx.moveTo(-4, 0); ctx.lineTo(-16, -10 + flap); ctx.lineTo(-20, -2 + flap); ctx.lineTo(-10, 5); 
        // Right Wing
        ctx.moveTo(4, 0); ctx.lineTo(16, -10 + flap); ctx.lineTo(20, -2 + flap); ctx.lineTo(10, 5); 
        ctx.fill();

        // Demon Body & Horns
        ctx.fillStyle = '#111827'; 
        ctx.beginPath(); 
        ctx.arc(0, 0, 6, 0, Math.PI*2); // Body
        ctx.moveTo(-3, -4); ctx.lineTo(-6, -10); ctx.lineTo(-1, -5); // Left Horn
        ctx.moveTo(3, -4); ctx.lineTo(6, -10); ctx.lineTo(1, -5); // Right Horn
        ctx.fill();
        
        // Glowing Demonic Eyes
        ctx.fillStyle = '#ff2424'; 
        ctx.beginPath(); 
        ctx.arc(-2, -1, 1.5, 0, Math.PI*2); 
        ctx.arc(2, -1, 1.5, 0, Math.PI*2); 
        ctx.fill();

        // ✨ TRANSFORMATION: LEVEL 5
        if (f.level >= 5) {
          ctx.shadowBlur = 20;
          ctx.shadowColor = '#e11d48'; // Bright blood aura glow

          // Rotating Bloody Ritual Ring
          ctx.strokeStyle = 'rgba(225, 29, 72, 0.8)'; 
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]); 
          ctx.beginPath(); 
          ctx.arc(0, 0, 16, t * 0.003, (Math.PI * 2) + (t * 0.003)); 
          ctx.stroke();
          ctx.setLineDash([]); 
          
          // Dripping Blood Particle
          ctx.fillStyle = '#be123c';
          const drip = (t * 0.04) % 12; 
          ctx.beginPath(); 
          ctx.arc(0, 6 + drip, 1.5 - (drip * 0.1), 0, Math.PI*2); 
          ctx.fill();
        }

        // ✨ TRANSFORMATION: LEVEL 10
        if (f.level >= 10) {
          ctx.shadowBlur = 25;
          ctx.shadowColor = '#9f1239'; // Dark crimson glow para sa malaking ring

          // Solid Dark Crimson Ring
          ctx.strokeStyle = '#88042a'; 
          ctx.lineWidth = 3;
          ctx.beginPath(); 
          ctx.arc(0, 0, 24, 0, Math.PI * 2); 
          ctx.stroke();

          // Orbiting Small Bats
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#ef4444'; // Red glow sa paligid ng mga paniki
          ctx.fillStyle = '#030712'; // Black bats
          
          for(let i = 0; i < 3; i++) {
            const a = (t * 0.004) + (i * 2.094); 
            const bx = Math.cos(a) * 24; 
            const by = Math.sin(a) * 24;
            
            ctx.save();
            ctx.translate(bx, by);
            ctx.rotate(a + 1.57);
            
            const batFlap = Math.sin(t * 0.08) * 3.5;
            ctx.beginPath();
            ctx.arc(0, 0, 2, 0, Math.PI*2); // Bat Body
            ctx.moveTo(-1, 0); ctx.lineTo(-7, -4 + batFlap); ctx.lineTo(-4, 2); // Left Wing
            ctx.moveTo(1, 0); ctx.lineTo(7, -4 + batFlap); ctx.lineTo(4, 2); // Right Wing
            ctx.fill();
            
            ctx.restore();
          }
        }
        
        ctx.restore(); // I-reset pabalik sa normal ang canvas para walang blur 'yung ibang kalaban
      }
else if (f.id === 'light') {
        ctx.save();
        
        // 🚀 HIGH-PERFORMANCE CONSTANTS & TIMING
        const PI2 = 6.283;
        const floatY = Math.sin(t * 0.004) * 5; // Mas marangyang paglutang
        const wingFlap = Math.sin(t * 0.012);
        
        // 🎨 DIVINE GRADIENT (Pre-defined para mabilis i-render)
        // Gumagawa ng dahan-dahang nagpapalitang kulay mula ginto patungong pilak at puti
        let holyGrad = ctx.createLinearGradient(-20, floatY - 20, 20, floatY + 20);
        holyGrad.addColorStop(0, '#fffbeb'); // Platinum White
        holyGrad.addColorStop(0.5, '#fde047'); // Radiant Gold
        holyGrad.addColorStop(1, '#eab308'); // Deep Gold

        // ✨ BASE FORM: THE HOLY ARCHANGEL
        // Central Body: Elegant Robed Figure (Mala-kapa/ginto ang hugis)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(0, floatY - 8);         // Ulo/Korona
        ctx.bezierCurveTo(4, floatY - 4, 5, floatY + 4, 3, floatY + 10);  // Kanang bahagi ng katawan
        ctx.lineTo(-3, floatY + 10);       // Laylayan ng roba
        ctx.bezierCurveTo(-5, floatY + 4, -4, floatY - 4, 0, floatY - 8); // Kaliwang bahagi ng katawan
        ctx.fill();

        // Glowing Core Face (Isang maliit na ukit ng nakakasilaw na liwanag)
        ctx.fillStyle = '#fef08a';
        ctx.beginPath(); ctx.arc(0, floatY - 3, 2, 0, PI2); ctx.fill();

        // Primary Archangel Wings (Malalaki at matutulis na pakpak ng liwanag)
        ctx.fillStyle = holyGrad;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#fbbf24';
        
        ctx.beginPath();
        // Left Main Wing (Sweeping Curve papataas)
        ctx.moveTo(-2, floatY);
        ctx.quadraticCurveTo(-15, floatY - 18 + wingFlap * 4, -24, floatY - 10 + wingFlap * 2);
        ctx.quadraticCurveTo(-14, floatY + 2, -2, floatY + 4);
        // Right Main Wing
        ctx.moveTo(2, floatY);
        ctx.quadraticCurveTo(15, floatY - 18 + wingFlap * 4, 24, floatY - 10 + wingFlap * 2);
        ctx.quadraticCurveTo(14, floatY + 2, 2, floatY + 4);
        ctx.fill();

        // ✨ TRANSFORMATION: LEVEL 5 (Seraphim Form - 4 Wings & Crown of Light)
        if (f.level >= 5) {
          // Spiked Halo / Crown ( may apat na matutulis na sinag )
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, floatY - 12, 5, 0, PI2); // Halo Ring
          // Mga Spikes ng Korona
          ctx.moveTo(0, floatY - 17); ctx.lineTo(0, floatY - 21); // Top Spike
          ctx.moveTo(-5, floatY - 12); ctx.lineTo(-9, floatY - 12); // Left Spike
          ctx.moveTo(5, floatY - 12); ctx.lineTo(9, floatY - 12); // Right Spike
          ctx.stroke();

          // Secondary Lower Wings (4-Winged Seraphim State)
          ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
          ctx.beginPath();
          // Left Lower Wing (Nakaturo naman pababa para sa majestic framing)
          ctx.moveTo(-2, floatY + 3);
          ctx.quadraticCurveTo(-18, floatY + 4 - wingFlap * 2, -20, floatY + 14 - wingFlap * 3);
          ctx.quadraticCurveTo(-10, floatY + 12, -2, floatY + 5);
          // Right Lower Wing
          ctx.moveTo(2, floatY + 3);
          ctx.quadraticCurveTo(18, floatY + 4 - wingFlap * 2, 20, floatY + 14 - wingFlap * 3);
          ctx.quadraticCurveTo(10, floatY + 12, 2, floatY + 5);
          ctx.fill();

          // Shimmering Star Particles (Floating Cross-Stars na nag-fa-fade)
          ctx.fillStyle = '#ffffff';
          ctx.shadowBlur = 5;
          ctx.shadowColor = '#ffffff';
          for (let i = 0; i < 2; i++) {
            const pOffset = (t * 0.02 + i * 10) % 24;
            const px = Math.sin(t * 0.005 + i) * 14;
            const py = floatY + 10 - pOffset;
            
            // 4-pointed Star drawing
            ctx.beginPath();
            ctx.moveTo(px, py - 3); ctx.lineTo(px + 1, py - 1); ctx.lineTo(px + 3, py);
            ctx.lineTo(px + 1, py + 1); ctx.lineTo(px, py + 3); ctx.lineTo(px - 1, py + 1);
            ctx.lineTo(px - 3, py); ctx.lineTo(px - 1, py - 1);
            ctx.closePath();
            ctx.fill();
          }
        }

        // ✨ TRANSFORMATION: LEVEL 10 (Supreme Judgment Form - 6 Wings & Judgement Wheel)
        if (f.level >= 10) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#eab308';

          // Sacred Judgement Wheel (Napakagandang geometric mandala sa likod ng Archangel)
          ctx.strokeStyle = 'rgba(254, 240, 138, 0.25)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(0, floatY, 26, 0, PI2); // Outer thin ring
          ctx.arc(0, floatY, 18, 0, PI2); // Inner thin ring
          ctx.stroke();

          // Spokes of Judgment (Umiikot na sinag sa loob ng gulong ng langit)
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
          ctx.beginPath();
          const rot = t * 0.002;
          for (let a = 0; a < PI2; a += 0.523) { // 12 Sinag ng liwanag (0.523 = 30 degrees)
            ctx.moveTo(Math.cos(a + rot) * 18, floatY + Math.sin(a + rot) * 18);
            ctx.lineTo(Math.cos(a + rot) * 26, floatY + Math.sin(a + rot) * 26);
          }
          ctx.stroke();

          // 3rd Pair of Wings (6 Wings Total - God Tier / Supreme Archangel)
          ctx.fillStyle = holyGrad;
          ctx.beginPath();
          // Topmost Majestic Wings (Malalaki at nakabuka nang todo sa itaas)
          ctx.moveTo(-1, floatY - 4);
          ctx.quadraticCurveTo(-12, floatY - 28 + wingFlap * 2, -28, floatY - 24 + wingFlap * 3);
          ctx.quadraticCurveTo(-12, floatY - 12, -1, floatY - 2);
          // Right Topmost Wing
          ctx.moveTo(1, floatY - 4);
          ctx.quadraticCurveTo(12, floatY - 28 + wingFlap * 2, 28, floatY - 24 + wingFlap * 3);
          ctx.quadraticCurveTo(12, floatY - 12, 1, floatY - 2);
          ctx.fill();

          // Orbiting Blades of Light (Dalawang lumulutang na sagradong espada/relika ng liwanag)
          ctx.shadowBlur = 8;
          ctx.shadowColor = '#ffffff';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;

          const t004 = t * 0.004;
          for (let i = 0; i < 2; i++) {
            const angle = t004 + (i * 3.141);
            const bx = Math.cos(angle) * 32;
            const by = floatY + Math.sin(angle) * 10; // Ellistical orbit para sa Lalim/3D Effect

            ctx.save();
            ctx.translate(bx, by);
            ctx.rotate(angle + 1.57); // Laging nakaturong paitaas o paikot ang relic

            // Drawing a miniature glowing Light Blade/Rune
            ctx.beginPath();
            ctx.moveTo(0, -6);  // Tip ng blade
            ctx.lineTo(2, 2);   // Kanan ng talim
            ctx.lineTo(0, 5);   // Hilt/Hawakan
            ctx.lineTo(-2, 2);  // Kaliwa ng talim
            ctx.closePath();
            ctx.stroke();
            ctx.fillStyle = 'rgba(254, 240, 138, 0.7)';
            ctx.fill();

            ctx.restore();
          }
        }
        
        ctx.restore();
      }

      else if (f.id === 'wind') {
  // --- BASE SETUP ---
  ctx.shadowBlur = 10; 
  ctx.shadowColor = '#6ee7b7';

  // Animasyon para sa pagkampay ng pakpak (flapping)
  const wingFlap = Math.cos(t * 0.05) * 4;

  // --- PAKPAK NG FAIRY (Wings) ---
  ctx.fillStyle = 'rgba(167, 243, 208, 0.7)'; // Transparent na light green
  ctx.beginPath();
  // Kaliwang pakpak
  ctx.ellipse(-5, -4, 4, 10 + wingFlap, Math.PI / 6, 0, Math.PI * 2); 
  // Kanang pakpak
  ctx.ellipse(5, -4, 4, 10 + wingFlap, -Math.PI / 6, 0, Math.PI * 2); 
  ctx.fill();

  // --- KATAWAN NG FAIRY (Body & Dress) ---
  ctx.fillStyle = '#34d399'; // Emerald dress
  ctx.beginPath();
  ctx.moveTo(0, -5);  // Leeg
  ctx.lineTo(-5, 9);  // Laylayan (Kaliwa)
  ctx.quadraticCurveTo(0, 11, 5, 9); // Pakurbang ilalim ng dress
  ctx.fill();

  // --- ULO (Head) ---
  ctx.fillStyle = '#a7f3d0';
  ctx.beginPath();
  ctx.arc(0, -7, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // --- WEAPON: LYRE ---
  // Iguguhit natin sa bandang kaliwa ng fairy
  ctx.shadowBlur = 5;
  ctx.shadowColor = '#fef3c7'; // Glow ng lyre
  ctx.strokeStyle = '#fbbf24'; // Gold na kulay ng lyre frame
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-8, -2);
  ctx.quadraticCurveTo(-13, 4, -6, 8); // Hugis U ng lyre
  ctx.lineTo(-4, 8);
  ctx.stroke();
  
  // Strings ng Lyre
  ctx.strokeStyle = '#fef3c7'; // Light strings
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(-7.5, 0); ctx.lineTo(-5.5, 7.5);
  ctx.moveTo(-6.5, 0); ctx.lineTo(-4.5, 7.5);
  ctx.stroke();

  // Reset shadow para hindi magulo ang susunod na effects
  ctx.shadowBlur = 0;

  // ✨ LEVEL 5 TRANSFORMATION: Wind Aura & Cyclone Base
  if (f.level >= 5) {
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#34d399';
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.8)';
    ctx.lineWidth = 2;
    
    // Umiikot na cyclone sa paanan
    const wSway = t * 0.02;
    ctx.beginPath();
    ctx.ellipse(0, 11, 14, 3 + Math.sin(wSway) * 2, 0, 0, Math.PI*2);
    ctx.stroke();
    
    // Hanging dumadaloy sa paligid niya
    ctx.beginPath();
    ctx.moveTo(-10, 10);
    ctx.quadraticCurveTo(-16, 0, -4, -10);
    ctx.stroke();
  }

  // ✨ LEVEL 10 TRANSFORMATION: Little Fairy Companions
  if (f.level >= 10) {
    const orbitRadius = 22; // Gaano kalayo sa main fairy
    const orbitSpeed = t * 0.002;
    
    // Gumawa ng 3 maliliit na fairies na umiikot
    for (let i = 0; i < 3; i++) {
      const angle = orbitSpeed + (i * (Math.PI * 2 / 3));
      const fx = Math.cos(angle) * orbitRadius;
      // Dagdag "bobbing" effect pataas-pababa habang umiikot
      const fy = Math.sin(angle) * orbitRadius + Math.sin(t * 0.05 + i) * 4; 

      // Katawan ng maliit na fairy (Glowy Gold/Green)
      ctx.fillStyle = '#fef3c7'; 
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#fbbf24';
      ctx.beginPath();
      ctx.arc(fx, fy, 2, 0, Math.PI * 2);
      ctx.fill();

      // Pakpak ng maliliit na fairies
      const miniFlap = Math.cos(t * 0.1 + i) * 2;
      ctx.fillStyle = 'rgba(167, 243, 208, 0.8)';
      ctx.beginPath();
      // Kaliwang mini-pakpak
      ctx.ellipse(fx - 2, fy - 1, 1.5, 2.5 + miniFlap, Math.PI/4, 0, Math.PI*2);
      // Kanang mini-pakpak
      ctx.ellipse(fx + 2, fy - 1, 1.5, 2.5 + miniFlap, -Math.PI/4, 0, Math.PI*2);
      ctx.fill();
    }
  }
}

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [id, level]);

  return <canvas ref={canvasRef} width={90} height={90} style={{ background: 'rgba(15, 23, 42, 0.4)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }} />;
}

// 🔥 ITO ANG MAIN METASHOP COMPONENT
export default function MetaShop({ screen, setScreen }) {
  const [activeTab, setActiveTab] = useState('stats');
  const [crystals, setCrystals] = useState(0);
  const [upgrades, setUpgrades] = useState({});
  const [unlockedSkins, setUnlockedSkins] = useState(['default']);
  const [equippedSkin, setEquippedSkin] = useState('default');
  
  // NEW FAMILIAR STATES
const [unlockedFamiliars, setUnlockedFamiliars] = useState([]);
  const [equippedFamiliars, setEquippedFamiliars] = useState([]);
  const [familiarLevels, setFamiliarLevels] = useState({});

 // 🌌 Universal Transition State
  const [isTransitioning, setIsTransitioning] = useState(false);

  // 🪄 Helper function para sa Frieren effect
  const executeWithTransition = (callback) => {
    setIsTransitioning(true); // I-trigger ang animation
    setTimeout(() => {
      callback(); // Patakbuhin ang action pagkatapos ng 1 second
      setIsTransitioning(false); // I-reset
    }, 1000);
  };


  // ANTI-INSPECT AT ANTI-RIGHT CLICK SECURITY
  useEffect(() => {
    const handleContextMenu = (e) => e.preventDefault();
    const handleKeyDown = (e) => {
      if (
        e.keyCode === 123 || 
        (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) || 
        (e.ctrlKey && e.keyCode === 85)
      ) {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (screen === 'metashop') {
      setCrystals(parseInt(localStorage.getItem('arcane_void_crystals') || '0', 10));
      setUpgrades(JSON.parse(localStorage.getItem('arcane_upgrades') || '{}'));
      
      const savedSkins = JSON.parse(localStorage.getItem('arcane_unlocked_skins') || '["default"]');
      setUnlockedSkins(savedSkins);
      setEquippedSkin(localStorage.getItem('arcane_equipped_skin') || 'default');

      // LOAD FAMILIARS
      // LOAD FAMILIARS ARRAY
      setUnlockedFamiliars(JSON.parse(localStorage.getItem('arcane_unlocked_familiars') || '[]'));
      
      // Fallback para sa lumang save na iisa lang ang pet
      let savedEquipped = localStorage.getItem('arcane_equipped_familiars');
      if (!savedEquipped) {
         const oldFam = localStorage.getItem('arcane_equipped_familiar');
         savedEquipped = (oldFam && oldFam !== 'none') ? `["${oldFam}"]` : '[]';
      }
      setEquippedFamiliars(JSON.parse(savedEquipped));

      setFamiliarLevels(JSON.parse(localStorage.getItem('arcane_familiar_levels') || '{}'));
    }
  }, [screen]);

  const buyUpgrade = (upgradeId) => {
    const itemInfo = UPGRADES_DB.find(u => u.id === upgradeId);
    const currentLevel = upgrades[upgradeId] || 0;
    if (currentLevel >= itemInfo.maxLevel) return;

    const cost = Math.floor(itemInfo.baseCost * Math.pow(itemInfo.costMult, currentLevel));
    if (crystals >= cost) {
      const newCrystals = crystals - cost;
      const newUpgrades = { ...upgrades, [upgradeId]: currentLevel + 1 };
      
      setCrystals(newCrystals);
      setUpgrades(newUpgrades);
      localStorage.setItem('arcane_void_crystals', newCrystals);
      localStorage.setItem('arcane_upgrades', JSON.stringify(newUpgrades));
    }
  };

  const buyOrEquipSkin = (skin) => {
    const isUnlocked = unlockedSkins.includes(skin.id);

    if (isUnlocked) {
      setEquippedSkin(skin.id);
      localStorage.setItem('arcane_equipped_skin', skin.id);
    } else if (crystals >= skin.cost) {
      const newCrystals = crystals - skin.cost;
      const newUnlocked = [...unlockedSkins, skin.id];
      
      setCrystals(newCrystals);
      setUnlockedSkins(newUnlocked);
      setEquippedSkin(skin.id);
      
      localStorage.setItem('arcane_void_crystals', newCrystals);
      localStorage.setItem('arcane_unlocked_skins', JSON.stringify(newUnlocked));
      localStorage.setItem('arcane_equipped_skin', skin.id);
    }
  };

const buyOrEquipFamiliar = (fam) => {
    const isUnlocked = unlockedFamiliars.includes(fam.id);
    let newEquipped = [...equippedFamiliars];

    if (isUnlocked) {
      if (newEquipped.includes(fam.id)) {
        // 🔥 ITO ANG SIKRETO: Dito dapat matatanggal ang familiar
        newEquipped = newEquipped.filter(id => id !== fam.id);
        console.log("Removed familiar:", fam.id); // Debug check
      } else {
        // Equip logic
        if (newEquipped.length >= 3) {
          alert("Sanctum Limit: You can only equip up to 3 Familiars!");
          return;
        }
        newEquipped.push(fam.id);
      }
    } else if (crystals >= fam.baseCost) {
      // Buy logic (pareho pa rin)
      const newCrystals = crystals - fam.baseCost;
      const newUnlocked = [...unlockedFamiliars, fam.id];
      const newLevels = { ...familiarLevels, [fam.id]: 1 };
      
      setCrystals(newCrystals);
      setUnlockedFamiliars(newUnlocked);
      setFamiliarLevels(newLevels);
      if (newEquipped.length < 3) newEquipped.push(fam.id);
      
      localStorage.setItem('arcane_void_crystals', newCrystals);
      localStorage.setItem('arcane_unlocked_familiars', JSON.stringify(newUnlocked));
      localStorage.setItem('arcane_familiar_levels', JSON.stringify(newLevels));
    }

    // 🔥 SAVE ANG BAGONG ARRAY SA LOCAL STORAGE
    setEquippedFamiliars(newEquipped);
    localStorage.setItem('arcane_equipped_familiars', JSON.stringify(newEquipped));
  };

const upgradeFamiliar = (fam) => {
    const currentLevel = familiarLevels[fam.id] || 1;
    if (currentLevel >= fam.maxLevel) return;

    // Exponential cost calculation: Base * (Multiplier ^ Level)
    const cost = Math.floor(fam.upgBase * Math.pow(fam.upgMult, currentLevel));
    
    if (crystals >= cost) {
      const newCrystals = crystals - cost;
      const newLevels = { ...familiarLevels, [fam.id]: currentLevel + 1 };
      
      setCrystals(newCrystals);
      setFamiliarLevels(newLevels);
      localStorage.setItem('arcane_void_crystals', newCrystals);
      localStorage.setItem('arcane_familiar_levels', JSON.stringify(newLevels));
    }
  };

  if (screen !== 'metashop') return null;

  return (
    <>
      <style>
        {`
          .metashop-overlay { animation: fadeIn 0.25s ease-out forwards; }
          .metashop-panel { animation: popIn 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes popIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
          
          .shop-scroll-area::-webkit-scrollbar { width: 8px; }
          .shop-scroll-area::-webkit-scrollbar-track { background: rgba(11, 8, 38, 0.4); border-radius: 10px; }
          .shop-scroll-area::-webkit-scrollbar-thumb { background: rgba(167, 139, 250, 0.5); border-radius: 10px; }
          .shop-scroll-area::-webkit-scrollbar-thumb:hover { background: rgba(167, 139, 250, 0.9); }

          .shop-card { display: flex; justify-content: space-between; align-items: center; background: rgba(11, 8, 38, 0.6); padding: 16px; border-radius: 8px; transition: all 0.2s ease; }
          .shop-card:hover { transform: translateY(-2px); background: rgba(20, 15, 60, 0.8); box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3); }

          .shop-btn { transition: all 0.2s ease; min-width: 120px; }
          .shop-btn:hover:not(:disabled) { transform: scale(1.05); filter: brightness(1.2); }
          .shop-btn:active:not(:disabled) { transform: scale(0.95); }

          @media (max-width: 600px) {
            .shop-card { flex-direction: column; align-items: stretch; gap: 12px; }
            .shop-card-info { display: flex; flex-direction: row; align-items: center; gap: 12px; }
            .shop-btn { width: 100%; padding: 12px !important; font-size: 1rem !important; }
          }
        `}
      </style>

      <div className="overlay active metashop-overlay" style={{ zIndex: 200, position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(3, 1, 17, 0.9)' }}>
        <div className="panel wizard-panel metashop-panel" style={{ width: '650px', maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
          <div className="panel-corner pc-tl" />
          <div className="panel-corner pc-tr" />
          <div className="panel-corner pc-bl" />
          <div className="panel-corner pc-br" />

      <div style={{ flexShrink: 0 }}>
            <div className="section-title" style={{ fontFamily: 'Georgia, serif', color: '#d946ef', textAlign: 'center', fontSize: '1.5rem', textShadow: '0 0 15px rgba(217, 70, 239, 0.6)' }}>
              🌌 THE MAGE'S CODEX
            </div>
            
            <div style={{ textAlign: 'center', margin: '15px 0' }}>
              <div style={{ color: '#fef08a', fontSize: '1.2rem', fontWeight: 'bold', textShadow: '0 0 10px rgba(254, 240, 138, 0.5)' }}>
                💎 Void Crystals: {crystals.toLocaleString()}
              </div>
              <div style={{ color: '#cbd5e1', fontSize: '11px', fontStyle: 'italic', marginTop: '2px' }}>
                ✦ Slay bosses and claim Void Crystals. 💎
              </div>
              {/*  DEVELOPER TOOLS */}
              
              <button 
                onClick={() => {
                  const newC = crystals + 10000000;
                  setCrystals(newC);
                  localStorage.setItem('arcane_void_crystals', newC);
                }} 
                style={{ 
                  background: 'rgba(139, 92, 246, 0.2)', color: '#c084fc', border: '1px solid #8b5cf6', 
                  padding: '4px 10px', borderRadius: '4px', marginTop: '6px', cursor: 'pointer', 
                  fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 'bold' 
                }}>
                🛠️ +10M Crystals (Dev Mode)
              </button> 
             
            </div>

            <div className="council-tab-headers" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <button className={`council-tab-btn ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')} style={{ flex: 1, maxWidth: '200px' }}>🔮 Arcane Stats</button>
              <button className={`council-tab-btn ${activeTab === 'familiars' ? 'active' : ''}`} onClick={() => setActiveTab('familiars')} style={{ flex: 1, maxWidth: '200px' }}>🐾 Familiars</button>
              <button className={`council-tab-btn ${activeTab === 'skins' ? 'active' : ''}`} onClick={() => setActiveTab('skins')} style={{ flex: 1, maxWidth: '200px' }}>🧥 Wardrobe</button>
              
            </div>

            <div className="divider mystic-divider" style={{ margin: '10px 0' }} />
          </div>

          <div className="shop-scroll-area" style={{ flex: 1, overflowY: 'auto', paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {activeTab === 'stats' && (
              <>
                {UPGRADES_DB.map(item => {
                  const level = upgrades[item.id] || 0;
                  const isMax = level >= item.maxLevel;
                  const cost = Math.floor(item.baseCost * Math.pow(item.costMult, level));
                  const canAfford = crystals >= cost;

                  return (
                    <div key={item.id} className="shop-card" style={{ border: '1px solid rgba(139, 92, 246, 0.3)', flexDirection: 'column' }}>
                      
                      {/* Top Info Section */}
                      <div style={{ display: 'flex', width: '100%', gap: '15px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                          <span style={{ color: isMax ? '#fef08a' : '#fff', fontWeight: 'bold', fontFamily: 'Georgia, serif', fontSize: '1.2rem' }}>
                            {item.name} <span style={{ color: '#a78bfa', fontSize: '0.9rem' }}>[Lv. {level}/{item.maxLevel}]</span>
                          </span>
                          <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontFamily: 'monospace', marginTop: '4px' }}>
                            {item.desc}
                          </span>
                          <span style={{ 
                            color: '#34d399', 
                            fontSize: '0.80rem', 
                            fontWeight: 'bold', 
                            fontFamily: 'monospace', 
                            marginTop: '8px', 
                            background: 'rgba(52, 211, 153, 0.15)', 
                            border: '1px solid rgba(52, 211, 153, 0.3)', 
                            padding: '4px 8px', 
                            borderRadius: '4px', 
                            display: 'inline-block', // <-- Babaguhin ito
                            width: 'fit-content',      // <-- Babaguhin ito
                            boxShadow: '0 0 8px rgba(52, 211, 153, 0.2)',
                            alignSelf: 'center'      // <-- Babaguhin ito
                          }}>
                            📈 Total Bonus: {level > 0 ? `+${level * item.statValue}${item.statSuffix}` : 'None'}
                          </span>
                          <span style={{ 
                            color: '#64748b', 
                            fontSize: '0.5rem', 
                            fontStyle: 'italic', 
                            fontFamily: 'monospace', 
                            marginTop: '4px' 
                          }}>
                            *Note: Adds permanent bonuses to your core stats.
                          </span>
                        </div>
                      </div>

                      {/* Bottom Upgrade Section (Familiar Style) */}
                      <div style={{ width: '100%', marginTop: '12px', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '10px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <span style={{ color: '#94a3b8', fontSize: '0.8rem', marginRight: 'auto', fontFamily: 'monospace' }}>
                          Status: <span style={{color: isMax ? '#34d399' : '#fef08a'}}>{isMax ? 'Maximum Power' : 'Upgradeable'}</span>
                        </span>
                        
                        <button className="shop-btn" onClick={() => buyUpgrade(item.id)} disabled={isMax || !canAfford}
                          style={{
                            background: isMax ? 'transparent' : (canAfford ? 'linear-gradient(180deg, #047857 0%, #064e3b 100%)' : 'rgba(239, 68, 68, 0.1)'),
                            border: `1px solid ${isMax ? '#475569' : (canAfford ? '#34d399' : '#ef4444')}`,
                            color: isMax ? '#94a3b8' : (canAfford ? '#fff' : '#f87171'),
                            padding: '6px 14px', borderRadius: '4px', cursor: isMax || !canAfford ? 'not-allowed' : 'pointer',
                            fontFamily: 'monospace', fontWeight: 'bold', fontSize: '0.9rem'
                          }}>
                          {isMax ? 'MAX LEVEL' : `⏫ UPGRADE: 💎 ${cost.toLocaleString()}`}
                        </button>
                      </div>

                    </div>
                  );
                })}
              </>
            )}

            {activeTab === 'skins' && (
            <>
              {SKINS_DB.map(skin => {
                const isUnlocked = unlockedSkins.includes(skin.id);
                const isEquipped = equippedSkin === skin.id;
                const canAfford = crystals >= skin.cost;

                return (
                  <div key={skin.id} className="shop-card" style={{ 
                    display: 'flex',            // Ginawang flexbox ang card
                    flexDirection: 'row',       // Lahat ng laman (Preview, Text, Button) ay pahiga
                    alignItems: 'center',       // Center vertical alignment
                    border: `1px solid ${isEquipped ? skin.glow : 'rgba(139, 92, 246, 0.3)'}`, 
                    boxShadow: isEquipped ? `0 0 15px ${skin.glow}40` : 'none', 
                    textAlign: 'left',
                    padding: '12px',
                    marginBottom: '10px'
                  }}>
                    
                    {/* Main Info Wrapper (Preview + Text) */}
                    <div className="shop-card-info" style={{ 
                      display: 'flex', 
                      flexDirection: 'row', 
                      alignItems: 'center', 
                      flex: 1, 
                      gap: '15px' 
                    }}>
                      <LiveSkinPreview skin={skin} />

                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ 
                          color: isEquipped ? skin.glow : '#fff', 
                          fontWeight: 'bold', 
                          fontFamily: 'Georgia, serif', 
                          fontSize: '1.1rem', 
                          textShadow: isEquipped ? `0 0 8px ${skin.glow}` : 'none' 
                        }}>
                          {skin.name} {isEquipped && '✓'}
                        </span>
                        <span style={{ 
                          color: '#94a3b8', 
                          fontSize: '0.8rem', 
                          fontFamily: 'monospace', 
                          marginTop: '4px', 
                          lineHeight: '1.4',
                          textAlign: 'justify' 
                        }}>
                          {skin.desc}
                        </span>
                      </div>
                    </div>
                    
                    {/* Action Button */}
                    <button className="shop-btn" onClick={() => buyOrEquipSkin(skin)} disabled={isEquipped || (!isUnlocked && !canAfford)}
                      style={{
                        flexShrink: 0, // Para hindi ma-squish ang button
                        marginLeft: '15px',
                        background: isEquipped ? 'rgba(5, 2, 12, 0.8)' : (isUnlocked ? 'linear-gradient(180deg, #b45309 0%, #78350f 100%)' : (canAfford ? 'linear-gradient(180deg, #3b117b 0%, #1e0a45 100%)' : 'rgba(239, 68, 68, 0.1)')),
                        border: `1px solid ${isEquipped ? '#475569' : (isUnlocked ? '#fef08a' : (canAfford ? '#a78bfa' : '#ef4444'))}`,
                        color: isEquipped ? '#94a3b8' : (isUnlocked ? '#fef08a' : (canAfford ? '#fff' : '#f87171')),
                        padding: '10px 16px', borderRadius: '6px', cursor: isEquipped || (!isUnlocked && !canAfford) ? 'not-allowed' : 'pointer',
                        fontFamily: 'monospace', fontWeight: 'bold'
                      }}>
                      {isEquipped ? 'EQUIPPED' : (isUnlocked ? 'EQUIP' : `💎 ${skin.cost.toLocaleString()}`)}
                    </button>
                  </div>
                );
              })}
            </>
          )}
            {activeTab === 'familiars' && (
              <>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ color: '#fef08a', fontWeight: 'bold', fontFamily: 'monospace' }}>
                    Active Companions: {equippedFamiliars.length}/3
                  </span>
                  <button className="btn wizard-btn danger-theme" onClick={() => { setEquippedFamiliars([]); localStorage.setItem('arcane_equipped_familiars', '[]'); }} style={{ margin: 0, padding: '4px 10px' }}>
                    🚫 Unequip All
                  </button>
                </div>

                {FAMILIARS_DB.map(fam => {
                  const isUnlocked = unlockedFamiliars.includes(fam.id);
                  const isEquipped = equippedFamiliars.includes(fam.id);
                  const level = familiarLevels[fam.id] || 1;
                  const isMax = level >= fam.maxLevel;

                    const upgCost = Math.floor(fam.upgBase * Math.pow(fam.upgMult, level * 1.15));
                  const canAffordUnlock = crystals >= fam.baseCost;
                  const canAffordUpg = crystals >= upgCost;

                  let evoName = fam.evolutions[1];
                  if (level >= 10) evoName = fam.evolutions[10];
                  else if (level >= 5) evoName = fam.evolutions[5];

                  return (
                    <div key={fam.id} className="shop-card" style={{ border: `1px solid ${isEquipped ? fam.color : 'rgba(139, 92, 246, 0.3)'}`, boxShadow: isEquipped ? `0 0 15px ${fam.color}40` : 'none', flexDirection: 'column' }}>
                      
                      <div style={{ display: 'flex', width: '100%', gap: '15px', alignItems: 'center' }}>
                        <LiveFamiliarPreview id={fam.id} level={isUnlocked ? level : 1} />

                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                          <span style={{ color: isEquipped ? fam.color : '#fff', fontWeight: 'bold', fontFamily: 'Georgia, serif', fontSize: '1.2rem' }}>
                            {evoName} <span style={{ color: '#a78bfa', fontSize: '0.9rem' }}>[Lv. {isUnlocked ? level : 0}/{fam.maxLevel}]</span> {isEquipped && '✓'}
                          </span>
                          <span style={{ 
                            color: '#94a3b8', 
                            fontSize: '0.8rem', 
                            fontFamily: 'monospace', 
                            marginTop: '4px',
                            display: 'block',      // <-- Idinagdag para kumalat sa buong lapad
                            textAlign: 'justify'   // <-- Idinagdag para pumantay ang text
                          }}>
                            Type: {fam.type} | {fam.desc}
                          </span>
                          
                          {/* ✨ BAGONG UI: TOTAL BONUS STATS INDICATOR ✨ */}
                          <span style={{ 
                            color: '#34d399', 
                            fontSize: '0.80rem', 
                            fontWeight: 'bold', 
                            fontFamily: 'monospace', 
                            marginTop: '8px', 
                            background: 'rgba(52, 211, 153, 0.15)', 
                            border: '1px solid rgba(52, 211, 153, 0.3)',
                            padding: '4px 8px', 
                            borderRadius: '4px', 
                            display: 'block',          // Ginawang block para sakupin ang buong linya
                            width: '100%',             // Siniguradong 100% ang lapad
                            boxSizing: 'border-box',   // Para hindi lumampas ang box dahil sa padding
                            boxShadow: '0 0 8px rgba(52, 211, 153, 0.2)'
                          }}>
                            📈 Bonus Stats: {isUnlocked ? fam.getStats(level) : fam.getStats(0)}
                          </span>
                          <span style={{ 
                            color: '#64748b', 
                            fontSize: '0.5rem', 
                            fontStyle: 'italic', 
                            fontFamily: 'monospace', 
                            marginTop: '4px' 
                          }}>
                            *Note: Wave and level bonuses are not reflected in this total.
                          </span>
                        </div>
                        
                        <button 
                        className="shop-btn" 
                        onClick={() => buyOrEquipFamiliar(fam)} 
                        disabled={!isUnlocked && !canAffordUnlock}
                        style={{
                            // 🔥 DITO NAGBABAGO ANG KULAY: Kung Equipped, gawing RED (Danger Theme)
                            background: isEquipped 
                            ? 'linear-gradient(180deg, #7f1d1d 0%, #450a0a 100%)' // Crimson Red
                            : (isUnlocked ? 'linear-gradient(180deg, #b45309 0%, #78350f 100%)' : (canAffordUnlock ? 'linear-gradient(180deg, #3b117b 0%, #1e0a45 100%)' : 'rgba(239, 68, 68, 0.1)')),
                            
                            border: `1px solid ${isEquipped ? '#ef4444' : (isUnlocked ? '#fef08a' : (canAffordUnlock ? '#a78bfa' : '#ef4444'))}`,
                            color: isEquipped ? '#f87171' : (isUnlocked ? '#fef08a' : (canAffordUnlock ? '#fff' : '#f87171')),
                            
                            padding: '8px 14px', borderRadius: '6px', 
                            cursor: (!isUnlocked && !canAffordUnlock) ? 'not-allowed' : 'pointer',
                            fontFamily: 'monospace', fontWeight: 'bold', flexShrink: 0
                        }}>
                       {isEquipped ? 'UNEQUIP' : (isUnlocked ? 'EQUIP' : `💎 ${fam.baseCost.toLocaleString()}`)}
                        </button>
                      </div>

                      {isUnlocked && (
                        <div style={{ width: '100%', marginTop: '12px', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '10px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <span style={{ color: '#94a3b8', fontSize: '0.8rem', marginRight: 'auto', fontFamily: 'monospace' }}>
                            Next Evolution at: <span style={{color: '#fef08a'}}>Lv. 5 / Lv. 10</span>
                          </span>
                          <button className="shop-btn" onClick={() => upgradeFamiliar(fam)} disabled={isMax || !canAffordUpg}
                            style={{
                              background: isMax ? 'transparent' : (canAffordUpg ? 'linear-gradient(180deg, #047857 0%, #064e3b 100%)' : 'rgba(239, 68, 68, 0.1)'),
                              border: `1px solid ${isMax ? '#475569' : (canAffordUpg ? '#34d399' : '#ef4444')}`,
                              color: isMax ? '#94a3b8' : (canAffordUpg ? '#fff' : '#f87171'),
                              padding: '6px 14px', borderRadius: '4px', cursor: isMax || !canAffordUpg ? 'not-allowed' : 'pointer',
                              fontFamily: 'monospace', fontWeight: 'bold', fontSize: '0.9rem'
                            }}>
                            {isMax ? 'MAX LEVEL' : `⏫ UPGRADE: 💎 ${upgCost.toLocaleString()}`}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>

          <div style={{ flexShrink: 0, marginTop: 'auto' }}>
            <div className="divider mystic-divider" style={{ margin: '15px 0 10px 0' }} />
            <button className="btn wizard-btn danger-theme" style={{ marginTop: '10px' }} onClick={() => executeWithTransition(() => setScreen('menu'))}>← Leave Sanctum</button>
          </div>
        </div>
      </div>


            {/* ====================================================================
          🌌 UNIVERSAL TRANSITION (ARCANE / FRIEREN STYLE)
          ==================================================================== */}
      {isTransitioning && (
        <div className="arcane-idle-transition" style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999999,
          pointerEvents: 'all',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}>
          {/* Ethereal Spell Rings */}
          <div className="idle-magic-ring outer"></div>
          <div className="idle-magic-ring inner"></div>
          <div className="idle-magic-flash"></div>

          {/* Drifting Mana Particles */}
          <div className="mana-particle p1"></div>
          <div className="mana-particle p2"></div>
          <div className="mana-particle p3"></div>
          <div className="mana-particle p4"></div>
          <div className="mana-particle p5"></div>

          <style>{`
            /* 1. Deep Void Gradient Fade */
            .arcane-idle-transition {
              background: radial-gradient(circle at center, rgba(26, 11, 46, 0) 0%, rgba(3, 1, 7, 0) 100%);
              animation: voidFadeIn 1s cubic-bezier(0.4, 0, 0.2, 1) forwards;
            }

            /* 2. Expanding Ethereal Rings */
            .idle-magic-ring {
              position: absolute;
              border-radius: 50%;
              opacity: 0;
            }
            .idle-magic-ring.outer {
              width: 80px;
              height: 80px;
              border: 2px solid rgba(255, 230, 163, 0.9);
              box-shadow: 0 0 25px rgba(168, 85, 247, 0.6), inset 0 0 15px rgba(168, 85, 247, 0.4);
              animation: spellExpand 1s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
            }
            .idle-magic-ring.inner {
              width: 40px;
              height: 40px;
              border: 1px dashed rgba(192, 132, 252, 0.8);
              animation: spellExpandInner 1s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
              animation-delay: 0.05s;
            }

            /* 3. Central Flash */
            .idle-magic-flash {
              position: absolute;
              width: 4px;
              height: 4px;
              background: #fff;
              border-radius: 50%;
              box-shadow: 0 0 40px 20px rgba(255, 230, 163, 0.8);
              animation: starFlash 1s cubic-bezier(0.4, 0, 0.2, 1) forwards;
            }

            /* 4. Drifting Mana Particles */
            .mana-particle {
              position: absolute;
              background: #ffe6a3;
              border-radius: 50%;
              box-shadow: 0 0 8px #ffe6a3, 0 0 15px #a855f7;
              opacity: 0;
            }
            .p1 { width: 4px; height: 4px; top: 55%; left: 45%; animation: floatMana 0.8s ease-out 0.1s forwards; }
            .p2 { width: 6px; height: 6px; top: 60%; left: 52%; animation: floatMana 0.9s ease-out 0.15s forwards; }
            .p3 { width: 3px; height: 3px; top: 48%; left: 55%; animation: floatMana 0.7s ease-out 0.05s forwards; }
            .p4 { width: 5px; height: 5px; top: 65%; left: 48%; animation: floatMana 0.85s ease-out 0.2s forwards; }
            .p5 { width: 4px; height: 4px; top: 50%; left: 42%; animation: floatMana 0.75s ease-out 0.1s forwards; }

            /* ================= ANIMATIONS ================= */
            @keyframes voidFadeIn {
              0% { opacity: 0; background: radial-gradient(circle at center, rgba(26, 11, 46, 0) 0%, rgba(3, 1, 7, 0) 100%); }
              100% { opacity: 1; background: radial-gradient(circle at center, rgba(26, 11, 46, 1) 0%, rgba(3, 1, 7, 1) 100%); }
            }
            @keyframes spellExpand {
              0% { transform: scale(0.5) rotate(0deg); opacity: 1; border-width: 4px; }
              100% { transform: scale(15) rotate(180deg); opacity: 0; border-width: 0.5px; }
            }
            @keyframes spellExpandInner {
              0% { transform: scale(0.5) rotate(0deg); opacity: 1; }
              100% { transform: scale(10) rotate(-180deg); opacity: 0; }
            }
            @keyframes starFlash {
              0% { transform: scale(0); opacity: 1; }
              40% { transform: scale(2); opacity: 1; }
              100% { transform: scale(0); opacity: 0; }
            }
            @keyframes floatMana {
              0% { transform: translateY(0) scale(1); opacity: 1; }
              100% { transform: translateY(-80px) scale(0.2); opacity: 0; }
            }
          `}</style>
        </div>
      )}
      
    </>
  );
}