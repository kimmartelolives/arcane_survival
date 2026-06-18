import React, { useState, useEffect, useRef } from 'react';

// --- MONSTER DATABASE ---
const MONSTER_LOGBOOK = [
  { id: 'normal', name: 'SHADOW GHOUL', type: 'Evil Spirit', desc: 'A weak shadow-born spirit formed from lingering death and despair. Alone it is harmless, but in vast swarms it becomes overwhelming and relentless. Each wears a bone skull—an empty mockery of life itself.', drop: 'Common, Rare & Epic Equipment', hp: '25+', dmg: '15+', speed: '65', xp: '15+', r: '13', wave: 'Every Wave' },

  { id: 'fast', name: 'SCYTHE-WINGED PHANTOM', type: 'Fiend', desc: 'An unnaturally fast aerial fiend that moves like a distortion in the sky, barely visible until it strikes. Though fragile in form, it is lethally precise—if left unchecked, it becomes a relentless executioner. Its scythe-shaped wings can tear through steel and bone in a single passing arc.', drop: 'Common, Rare & Epic Equipment', hp: '15+', dmg: '25+', speed: '115', xp: '20+', r: '11', wave: 'Every Wave' },

  { id: 'tank', name: 'ARMORED VOID BEHEMOTH', type: 'Fiend', desc: 'A colossal void-forged fiend encased in heavy armor, sustained by an internal void furnace that feeds on destruction. Its shell is dense enough to endure most magical assaults, as if reality itself resists harming it.', drop: 'Common, Rare & Epic Equipment', hp: '120+', dmg: '35+', speed: '55', xp: '40+', r: '15', wave: 'Every Wave' },

  { id: 'miniBoss', name: 'ELDRITCH TERROR', type: 'Lesser Demon', desc: 'A horrifying mass of countless eyes and writhing tentacles, endlessly shifting as if reality itself rejects its form. It pulses with forbidden abyssal magic, warping space around it and whispering thoughts that fracture the mind of those who look upon it.', drop: 'Void Crystals, Common, Rare & Epic Equipment', hp: '600+', dmg: '80+', speed: '60', xp: '150+', r: '27', wave: 'Every 5 Waves' },

  { id: 'demonKnight', name: 'DRAXEN, VOID KNIGHT', type: 'Greater Demon', desc: 'A fallen knight reborn in the Void, Draxen serves as Zerath’s unstoppable blade on the battlefield. Once bound by honor, he surrendered his soul to the Abyss after witnessing the collapse of his kingdom. Now, clad in void-forged armor, he leads the first wave of destruction—silent, relentless, and unyielding.', drop: 'Void Crystals, Mythic & Legendary Equipment', hp: 'Scaleable', dmg: 'Massive', speed: '125', xp: 'High', r: '30', wave: 'Wave 15, 20, etc.' },

  { id: 'archdemon', name: 'ZERATH, VOID COMMANDER', type: 'Archdemon', desc: 'The commander of the Abyssal Legions. A conqueror whose wrath has shattered empires and extinguished countless worlds. Wherever Zerath’s gaze falls, hope dies, and the Void advances.', drop: 'Void Crystals, Mythic & Legendary Equipment', hp: 'Scaleable', dmg: 'Massive', speed: '110', xp: 'High', r: '35', wave: 'Wave 30, 40, etc.' },

  { id: 'primordial', name: 'VORZAK, KING OF THE VOID', type: 'Ancient', desc: 'Born before creation itself, Vorzak is an ancient ruler of the Void whose existence predates gods, time, and reality. He was sealed beyond existence after the first world was formed—but the seal is weakening. Now, his presence echoes through collapsing realms as the Void stirs once more.', drop: 'Void Crystals, Epic, Mythic & Legendary Equipment', hp: '?,???,???', dmg: '?,???', speed: '95', xp: '55,000+', r: '50', wave: 'Wave 50' },

  { id: 'abyss', name: 'THE ABYSS, WORLD EATER', type: 'Primordial God', desc: 'A god that devours not only worlds—but time itself. Every consumed realm is erased from history, as if it never existed. Magic, memory, and fate collapse within its endless hunger. Now it has evolved beyond its sealed form—awakening as the Oblivion itself, no longer merely consuming existence, but rewriting its absence across all time. Nothing escapes it. Not even when it happened.', drop: 'Void Crystals, Mythic & Legendary Equipment', hp: '?,???,???', dmg: '?,???', speed: '70', xp: '80,000+', r: '55', wave: 'Wave 75' },

  { id: 'abyss_awakened', name: 'THE ABYSS, AWAKENED OBLIVION', type: 'Primordial God', desc: 'A god that consumes entire worlds and devours the flow of time itself, unraveling reality from history, memory, and fate until nothing of its existence can be traced or remembered. Once known as the World Eater, it has awakened into Oblivion, where existence is not destroyed—but deleted across all timelines. Born before recorded time, the Abyss was sealed beyond existence for devouring entire worlds.', drop: 'Void Crystals, Mythic & Legendary Equipment', hp: '?,???,???', dmg: '?,???', speed: '70', xp: '150,000+', r: '60', wave: 'Wave 100' }

];

// --- OPTIMIZED RUNE DECODER GENERATOR ---
const RUNE_CHARS = "ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ✦✧";
const generateDecodingRunes = (count) => {
  const arr = [];
  for (let i = 0; i < count; i++) {
    arr.push({
      id: i,
      char: RUNE_CHARS[Math.floor(Math.random() * RUNE_CHARS.length)],
      delay: (Math.random() * 0.2).toFixed(2) + 's', 
      duration: (0.4 + Math.random() * 0.3).toFixed(2) + 's' 
    });
  }
  return arr;
};

// --- LIVE CANVAS PREVIEW COMPONENT ---
const MonsterPreview = ({ monster }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;

    const render = () => {
      const now = performance.now();
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const e = { type: monster.id, r: Number(monster.r) || 25, x: 0, y: 0, flash: 0 };
      const pi2 = Math.PI * 2;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.translate(0, Math.sin(now * 0.002) * 4); // Floating effect

      // --- RENDER LOGIC ---
      if (e.type === 'normal') {
            // ==================================================
            // 🧟 NORMAL MINION (Shadow Ghoul with Bone Mask)
            // ==================================================
            const now = performance.now();
            const isFlash = e.flash > 0;
            ctx.save();
            ctx.translate(e.x, e.y);
            ctx.rotate(Math.sin(now * 0.005 + e.x) * 0.1); // Wriggling motion

            // Organic, squishy blob body
            ctx.fillStyle = isFlash ? '#ffffff' : '#1e293b'; 
            ctx.beginPath();
            for(let i = 0; i < 12; i++) {
                let ang = (i / 12) * Math.PI * 2;
                let rad = e.r * (0.8 + Math.sin(now * 0.01 + i) * 0.2); // Umiiba ang hugis (Squishy)
                ctx.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
            }
            ctx.fill();

            // Bone Skull Mask sa ibabaw ng katawan
            ctx.fillStyle = isFlash ? '#000000' : '#cbd5e1';
            ctx.beginPath();
            ctx.arc(0, -e.r * 0.2, e.r * 0.6, Math.PI, 0); // Hugis bungo sa itaas
            ctx.quadraticCurveTo(e.r * 0.6, e.r * 0.5, e.r * 0.3, e.r * 0.5); // Kanang panga
            ctx.lineTo(-e.r * 0.3, e.r * 0.5); // Baba
            ctx.quadraticCurveTo(-e.r * 0.6, e.r * 0.5, -e.r * 0.6, -e.r * 0.2); // Kaliwang panga
            ctx.fill();

            // Sunken Glowing Red Eyes
            ctx.fillStyle = isFlash ? '#ffffff' : '#991b1b';
            ctx.beginPath(); ctx.ellipse(-e.r * 0.25, 0, e.r * 0.15, e.r * 0.2, 0.2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(e.r * 0.25, 0, e.r * 0.15, e.r * 0.2, -0.2, 0, Math.PI * 2); ctx.fill();
            ctx.restore();

        } else if (e.type === 'fast') {
            // ==================================================
            // 🦇 FAST MINION (Scythe-Winged Phantom)
            // ==================================================
            const now = performance.now();
            const isFlash = e.flash > 0;
            ctx.save();
            ctx.translate(e.x, e.y);
            ctx.rotate(now * 0.008); // Mabilis na spin

            // 3 Dark Scythe Wings (Parang paniki/shuriken)
            ctx.fillStyle = isFlash ? '#ffffff' : '#9a3412'; // Dark burnt orange
            ctx.strokeStyle = isFlash ? '#000000' : '#ea580c';
            ctx.lineWidth = 1.5;

            for(let i = 0; i < 3; i++) {
                ctx.rotate((Math.PI * 2) / 3);
                ctx.beginPath();
                ctx.moveTo(0, 0);
                // Matulis na kurbada ng pakpak
                ctx.quadraticCurveTo(e.r * 1.5, -e.r * 1.5, e.r * 2.5, 0); 
                ctx.quadraticCurveTo(e.r * 1.0, -e.r * 0.5, 0, e.r * 0.5);
                ctx.fill(); 
                ctx.stroke();
            }

            // Cluster ng Spider Eyes sa gitna
            ctx.fillStyle = isFlash ? '#000000' : '#fef08a';
            for(let i = 0; i < 3; i++) {
                let a = (i / 3) * Math.PI * 2 + (now * 0.005);
                ctx.beginPath(); 
                ctx.arc(Math.cos(a) * e.r * 0.4, Math.sin(a) * e.r * 0.4, e.r * 0.25, 0, Math.PI * 2); 
                ctx.fill();
            }
            ctx.restore();

        } else if (e.type === 'tank') {
            // ==================================================
            // 🪨 TANK MINION (Armored Void Behemoth)
            // ==================================================
            const now = performance.now();
            const isFlash = e.flash > 0;
            ctx.save();
            ctx.translate(e.x, e.y);
            
            // Mabigat na paglalakad (Stomping motion)
            let stomp = Math.abs(Math.sin(now * 0.003)) * (e.r * 0.15);
            ctx.translate(0, -stomp);

            // Dambuhalang Asymmetrical Carapace (Baluti)
            ctx.fillStyle = isFlash ? '#ffffff' : '#1e1b4b'; // Deepest indigo armor
            ctx.strokeStyle = isFlash ? '#000000' : '#4338ca';
            ctx.lineWidth = 2.5;

            ctx.beginPath();
            ctx.moveTo(-e.r * 1.2, e.r * 0.5); // Bottom left
            ctx.lineTo(-e.r * 1.5, -e.r * 0.2); // Left shoulder spike
            ctx.lineTo(-e.r * 0.6, -e.r * 1.2); // Top left ridge
            ctx.lineTo(0, -e.r * 0.8);          // Center dip (batok)
            ctx.lineTo(e.r * 0.6, -e.r * 1.2);   // Top right ridge
            ctx.lineTo(e.r * 1.5, -e.r * 0.2);   // Right shoulder spike
            ctx.lineTo(e.r * 1.2, e.r * 0.5);    // Bottom right
            ctx.lineTo(0, e.r * 0.8);            // Bottom center
            ctx.closePath();
            ctx.fill(); 
            ctx.stroke();

            // Glowing Internal Furnace (Tiyan na gawa sa Void Magma)
            let coreGlow = Math.sin(now * 0.005) * 0.5 + 0.5;
            ctx.fillStyle = isFlash ? '#000000' : `rgba(99, 102, 241, ${0.5 + coreGlow * 0.5})`;
            ctx.beginPath();
            ctx.arc(0, e.r * 0.2, e.r * 0.55, 0, Math.PI * 2);
            ctx.fill();

            // Iron Prison Bars sa ibabaw ng kumikinang na tiyan
            ctx.strokeStyle = isFlash ? '#ffffff' : '#0f172a';
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(-e.r * 0.7, e.r * 0.2); ctx.lineTo(e.r * 0.7, e.r * 0.2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-e.r * 0.3, -e.r * 0.3); ctx.lineTo(-e.r * 0.3, e.r * 0.7); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(e.r * 0.3, -e.r * 0.3); ctx.lineTo(e.r * 0.3, e.r * 0.7); ctx.stroke();
            ctx.restore();

        } else if (e.type === 'miniBoss') {
            // ==================================================
            // 👁️ GENERIC MINI-BOSS (Eldritch Tentacle Terror)
            // ==================================================
            const now = performance.now();
            const isFlash = e.flash > 0;
            ctx.save();
            ctx.translate(e.x, e.y);

            // Abyssal Glow Aura
            let auraGlow = ctx.createRadialGradient(0, 0, e.r, 0, 0, e.r * 3);
            auraGlow.addColorStop(0, `rgba(217, 119, 6, 0.4)`); // Amber aura
            auraGlow.addColorStop(1, 'transparent');
            ctx.fillStyle = auraGlow;
            ctx.beginPath(); ctx.arc(0, 0, e.r * 3, 0, Math.PI * 2); ctx.fill();

            // 8 Writhing Tentacles (Gumagalaw na galamay)
            ctx.strokeStyle = isFlash ? '#ffffff' : '#78350f'; // Dark amber
            ctx.lineCap = 'round';
            for(let i = 0; i < 8; i++) {
                let a = (i / 8) * Math.PI * 2;
                let wave = Math.sin(now * 0.002 + i) * (e.r * 0.8);
                ctx.lineWidth = e.r * 0.3;
                
                ctx.beginPath();
                ctx.moveTo(0, 0);
                // Curve magic para sa galamay
                let cp1x = Math.cos(a) * e.r * 1.5 - Math.sin(a) * wave;
                let cp1y = Math.sin(a) * e.r * 1.5 + Math.cos(a) * wave;
                let endX = Math.cos(a) * e.r * 2.5 + Math.sin(a) * wave * 1.5;
                let endY = Math.sin(a) * e.r * 2.5 - Math.cos(a) * wave * 1.5;
                ctx.quadraticCurveTo(cp1x, cp1y, endX, endY);
                ctx.stroke();
            }

            // Deformed Fleshy Main Body
            ctx.fillStyle = isFlash ? '#ffffff' : '#b45309';
            ctx.beginPath();
            for(let i = 0; i < 16; i++) {
                let a = (i / 16) * Math.PI * 2;
                let pulse = Math.sin(now * 0.005 + i * 2) * (e.r * 0.15); // Pulsating mass
                ctx.lineTo(Math.cos(a) * (e.r * 1.2 + pulse), Math.sin(a) * (e.r * 1.2 + pulse));
            }
            ctx.fill();

            // Asymmetrical Blinking Eyes (Maraming mata na kumukurap)
            ctx.fillStyle = isFlash ? '#000000' : '#fef3c7'; 
            let pupilColor = isFlash ? '#ffffff' : '#000000';
            const eyes = [
                {x: 0, y: 0, size: 0.5},       // Main center eye
                {x: -0.6, y: -0.4, size: 0.25}, // Top left
                {x: 0.6, y: -0.3, size: 0.2},   // Top right
                {x: -0.3, y: 0.6, size: 0.3},   // Bottom left
                {x: 0.5, y: 0.5, size: 0.25}    // Bottom right
            ];

            eyes.forEach((eye, idx) => {
                let isBlinking = Math.sin(now * 0.001 + idx * 5) > 0.95; // Random blink timing
                
                if (!isBlinking) {
                    // Sclera (Puti ng mata)
                    ctx.beginPath(); ctx.arc(eye.x * e.r, eye.y * e.r, eye.size * e.r, 0, Math.PI * 2); ctx.fill();
                    // Pupil (Itim ng mata)
                    ctx.fillStyle = pupilColor;
                    ctx.beginPath(); ctx.arc(eye.x * e.r, eye.y * e.r, eye.size * e.r * 0.4, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = isFlash ? '#000000' : '#fef3c7'; // Reset para sa next eye
                } else {
                    // Closed Eye Slit (Pag nakapikit)
                    ctx.strokeStyle = isFlash ? '#000000' : '#78350f';
                    ctx.lineWidth = 2;
                    ctx.beginPath(); 
                    ctx.moveTo(eye.x * e.r - eye.size * e.r, eye.y * e.r); 
                    ctx.lineTo(eye.x * e.r + eye.size * e.r, eye.y * e.r); 
                    ctx.stroke();
                }
            });

            ctx.restore();

        } else if (e.type === 'demonKnight') {
          // ==================================================
          // ⚔️ DRAXEN, VOID KNIGHT (The Unstoppable Blade)
          // ==================================================
          const isFlash = e.flash > 0;
          const pTime = performance.now();
          const pi2 = 6.283185307; // Math.PI * 2 cache

          ctx.save();
          ctx.translate(e.x, e.y);

          // --- 1. TATTERED ABYSSAL CAPE (Umuwagas na kapa sa likod) ---
          ctx.save();
          const wave = Math.sin(pTime * 0.002) * (e.r * 0.5);
          const wave2 = Math.cos(pTime * 0.0015) * (e.r * 0.4);
          ctx.fillStyle = isFlash ? '#ffffff' : 'rgba(15, 23, 42, 0.8)'; // Dark slate gray
          ctx.beginPath();
          ctx.moveTo(-e.r * 0.8, 0);
          // Kurbadang kapa na gumagalaw
          ctx.quadraticCurveTo(-e.r * 1.5 + wave, e.r * 2.5, -e.r * 0.5 + wave2, e.r * 3.5);
          ctx.lineTo(e.r * 0.5 + wave, e.r * 3.5);
          ctx.quadraticCurveTo(e.r * 1.5 + wave2, e.r * 2.5, e.r * 0.8, 0);
          ctx.fill();
          ctx.restore();

          // --- 2. CRUSHING GRAVITY AURA (Mabigat na Void Energy) ---
          const pulse = Math.sin(pTime * 0.004) * 0.2;
          const auraGrad = ctx.createRadialGradient(0, 0, e.r * 0.2, 0, 0, e.r * 3.0);
          
          // Palette: Vantablack -> Emerald Void -> Cyan Corrupted Edge
          const coreColor = isFlash ? '255, 255, 255' : '16, 185, 129'; // Emerald Green
          const edgeColor = isFlash ? '200, 200, 200' : '6, 78, 59'; // Dark Forest Void
          
          auraGrad.addColorStop(0, `rgba(${coreColor}, ${0.5 + pulse})`);
          auraGrad.addColorStop(0.5, `rgba(${edgeColor}, 0.4)`);
          auraGrad.addColorStop(1, 'transparent');
          
          ctx.fillStyle = auraGrad;
          ctx.beginPath(); 
          ctx.arc(0, 0, e.r * 3.0, 0, pi2); 
          ctx.fill();

          // --- 3. ORBITING VOID GREATSWORDS (Malalaking Espada na Umiikot) ---
          ctx.save();
          ctx.rotate(pTime * 0.0015); // Mabagal pero mabigat na ikot
          ctx.fillStyle = isFlash ? '#ffffff' : '#0f172a'; // Pitch black blades
          ctx.strokeStyle = isFlash ? '#000000' : '#10b981'; // Glowing green edges
          ctx.lineWidth = 2.5;

          for (let i = 0; i < 3; i++) {
              ctx.rotate(pi2 / 3);
              ctx.beginPath();
              
              // Crossguard
              ctx.moveTo(-e.r * 0.5, e.r * 1.2);
              ctx.lineTo(e.r * 0.5, e.r * 1.2);
              ctx.lineTo(e.r * 0.35, e.r * 1.4);
              
              // Gigantic Blade Tip
              ctx.lineTo(0, e.r * 3.2); 
              ctx.lineTo(-e.r * 0.35, e.r * 1.4);
              ctx.closePath();
              ctx.fill(); 
              ctx.stroke();
              
              // Glowing Runes sa gitna ng mga espada
              ctx.fillStyle = isFlash ? '#000000' : '#34d399';
              ctx.beginPath(); 
              ctx.arc(0, e.r * 1.8, e.r * 0.08, 0, pi2); 
              ctx.fill();
          }
          ctx.restore();

          // --- 4. HEAVY VOID-FORGED ARMOR (Katawan at Pauldrons) ---
          const floatY = Math.sin(pTime * 0.003) * (e.r * 0.15); // Breathing heavy
          ctx.translate(0, floatY);

          // Pauldrons (Malapad na balikat ng Knight)
          ctx.fillStyle = isFlash ? '#ffffff' : '#1e293b'; // Slate Tungsten armor
          ctx.strokeStyle = isFlash ? '#000000' : '#059669'; // Dark green outlines
          ctx.lineWidth = 3;

          ctx.beginPath();
          // Left Pauldron
          ctx.moveTo(-e.r * 0.6, -e.r * 0.5);
          ctx.lineTo(-e.r * 2.0, -e.r * 0.8); // Matulis na balikat
          ctx.lineTo(-e.r * 2.2, 0);
          ctx.lineTo(-e.r * 1.3, e.r * 0.7);
          
          // Chest point (Gitna)
          ctx.lineTo(0, e.r * 1.3);
          
          // Right Pauldron
          ctx.lineTo(e.r * 1.3, e.r * 0.7);
          ctx.lineTo(e.r * 2.2, 0);
          ctx.lineTo(e.r * 2.0, -e.r * 0.8); // Matulis na balikat
          ctx.lineTo(e.r * 0.6, -e.r * 0.5);
          ctx.closePath();
          ctx.fill(); 
          ctx.stroke();

          // --- 5. THE HOLLOW SOUL (Butas sa dibdib na puro Void Energy) ---
          ctx.fillStyle = isFlash ? '#ffffff' : '#022c22'; // Dark abyss inside chest
          ctx.beginPath();
          ctx.moveTo(0, e.r * 0.2);
          ctx.lineTo(e.r * 0.45, e.r * 0.55);
          ctx.lineTo(0, e.r * 0.9);
          ctx.lineTo(-e.r * 0.45, e.r * 0.55);
          ctx.closePath();
          ctx.fill();
          
          // Inner glowing core (Yung natitirang corrupt na kaluluwa niya)
          ctx.shadowColor = isFlash ? 'transparent' : '#34d399';
          ctx.shadowBlur = isFlash ? 0 : 20;
          ctx.fillStyle = isFlash ? '#000000' : '#a7f3d0';
          ctx.beginPath();
          ctx.arc(0, e.r * 0.55, e.r * 0.18, 0, pi2);
          ctx.fill();
          
          ctx.shadowBlur = 0; // Reset shadow

          // --- 6. THE MERCILESS HELM (Faceless Knight Visor) ---
          ctx.fillStyle = isFlash ? '#ffffff' : '#0f172a'; // Pitch black face
          ctx.strokeStyle = isFlash ? '#000000' : '#10b981';
          ctx.lineWidth = 2.5;

          ctx.beginPath();
          ctx.moveTo(0, -e.r * 1.3); // Top of helm
          ctx.lineTo(e.r * 0.8, -e.r * 0.9); // Right temple
          ctx.lineTo(e.r * 0.6, e.r * 0.2); // Right cheek
          ctx.lineTo(0, e.r * 0.5); // Chin/Beak
          ctx.lineTo(-e.r * 0.6, e.r * 0.2); // Left cheek
          ctx.lineTo(-e.r * 0.8, -e.r * 0.9); // Left temple
          ctx.closePath();
          ctx.fill(); 
          ctx.stroke();

          // --- 7. GLOWING CROSS VISOR (Tanda ng pagiging Fallen Knight) ---
          ctx.shadowColor = isFlash ? 'transparent' : '#6ee7b7';
          ctx.shadowBlur = isFlash ? 0 : 25; // Matinding glow
          ctx.strokeStyle = isFlash ? '#000000' : '#6ee7b7';
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          
          ctx.beginPath();
          // Horizontal slit (Mata)
          ctx.moveTo(-e.r * 0.45, -e.r * 0.2);
          ctx.lineTo(e.r * 0.45, -e.r * 0.2);
          // Vertical slit (Ilong pababa)
          ctx.moveTo(0, -e.r * 0.7);
          ctx.lineTo(0, e.r * 0.3);
          ctx.stroke();
          
          ctx.shadowBlur = 0; // Reset
          ctx.lineCap = 'butt'; // Reset

          ctx.restore();
        }

  else if (e.type === 'archdemon') {
          // ==================================================
          // 🌌 ZERATH, VOID COMMANDER (Abyssal Conqueror)
          // ==================================================
          const isFlash = e.flash > 0;
          const pTime = performance.now();
          const pi2 = 6.283185307; // Math.PI * 2 cache

          ctx.save();
          ctx.translate(e.x, e.y);

          // --- 1. THE EVENT HORIZON (Pulsing Void Aura) ---
          const pulse = Math.sin(pTime * 0.003) * 0.3;
          const auraGrad = ctx.createRadialGradient(0, 0, e.r * 0.1, 0, 0, e.r * 3.2);
          
          // Palette: Pitch Black -> Deep Abyssal Purple -> Piercing Cyan
          const coreColor = isFlash ? '255, 255, 255' : '5, 5, 10'; 
          const midColor = isFlash ? '200, 200, 255' : '88, 28, 135'; 
          const edgeColor = isFlash ? '100, 100, 255' : '6, 182, 212'; 
          
          auraGrad.addColorStop(0, `rgba(${coreColor}, 1)`);
          auraGrad.addColorStop(0.3 - pulse * 0.1, `rgba(${midColor}, 0.8)`);
          auraGrad.addColorStop(0.7, `rgba(${edgeColor}, ${0.4 + pulse * 0.2})`);
          auraGrad.addColorStop(1, 'transparent');
          
          ctx.fillStyle = auraGrad;
          ctx.beginPath(); 
          ctx.arc(0, 0, e.r * 3.2, 0, pi2); 
          ctx.fill();

          // --- 2. ORBITING ABYSSAL SHARDS (World-Shattering Fragments) ---
          ctx.save();
          ctx.rotate(-pTime * 0.002); // Umiikot pakaliwa (counter-clockwise)
          ctx.fillStyle = isFlash ? '#ffffff' : '#111827'; // Dark matter shards
          ctx.strokeStyle = isFlash ? '#000000' : '#c026d3'; // Neon Magenta outline
          ctx.lineWidth = 2;
          
          for (let i = 0; i < 6; i++) {
              ctx.rotate(pi2 / 6);
              ctx.beginPath();
              // Matatalim na lumulutang na fragments
              ctx.moveTo(e.r * 1.5, -e.r * 0.3);
              ctx.lineTo(e.r * 2.8, -e.r * 0.1); // Dulo ng patalim
              ctx.lineTo(e.r * 2.2, e.r * 0.2);
              ctx.lineTo(e.r * 1.5, e.r * 0.1);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
          }
          ctx.restore();

          // --- 3. THE EXTINGUISHER SEAL (Complex Void Geometry) ---
          ctx.save();
          ctx.rotate(pTime * 0.001); // Umiikot pakanan (clockwise)
          ctx.strokeStyle = isFlash ? '#000000' : 'rgba(6, 182, 212, 0.6)'; // Cyan geometric lines
          ctx.lineWidth = 1.5;
          
          // Overlapping Octagram (8-pointed star)
          ctx.beginPath();
          for(let i = 0; i < 8; i++) {
              let hAng1 = (i * pi2) / 8;
              let hAng2 = ((i + 3) * pi2) / 8; // Tumatalon ng 3 points para sa star shape
              ctx.moveTo(Math.cos(hAng1) * e.r * 1.8, Math.sin(hAng1) * e.r * 1.8);
              ctx.lineTo(Math.cos(hAng2) * e.r * 1.8, Math.sin(hAng2) * e.r * 1.8);
          }
          ctx.stroke();
          ctx.restore();

          // --- 4. THE ABYSSAL CROWN / ARMOR CORE ---
          const floatY = Math.sin(pTime * 0.004) * (e.r * 0.25);
          ctx.translate(0, floatY);

          ctx.fillStyle = isFlash ? '#ffffff' : '#030712'; // Pitch black abyss armor
          ctx.strokeStyle = isFlash ? '#000000' : '#8b5cf6'; // Violet glow trims
          ctx.lineWidth = 2.5;

          ctx.beginPath();
          ctx.moveTo(0, e.r * 1.4); // Matulis na baba (Chin)
          ctx.lineTo(e.r * 0.9, e.r * 0.5); // Kanang Jawline
          
          // Kanang jagged horns
          ctx.lineTo(e.r * 1.6, 0); 
          ctx.lineTo(e.r * 1.0, -e.r * 0.5);
          ctx.lineTo(e.r * 1.8, -e.r * 1.5); // Higanteng sungay sa kanan
          ctx.lineTo(e.r * 0.5, -e.r * 1.2);
          
          // Crown Center (Gitna ng ulo)
          ctx.lineTo(0, -e.r * 1.9);
          
          // Kaliwang jagged horns (Mirror)
          ctx.lineTo(-e.r * 0.5, -e.r * 1.2);
          ctx.lineTo(-e.r * 1.8, -e.r * 1.5); // Higanteng sungay sa kaliwa
          ctx.lineTo(-e.r * 1.0, -e.r * 0.5);
          ctx.lineTo(-e.r * 1.6, 0);
          ctx.lineTo(-e.r * 0.9, e.r * 0.5); // Kaliwang Jawline
          
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // --- 5. THE DEATH GAZE (Multiple Piercing Void Eyes) ---
          // Main Central Eye (Vertical Diamond)
          ctx.fillStyle = isFlash ? '#000000' : '#22d3ee'; // Neon Cyan
          ctx.shadowColor = isFlash ? 'transparent' : '#22d3ee';
          ctx.shadowBlur = isFlash ? 0 : 20; // Intense glow effect

          ctx.beginPath();
          ctx.moveTo(0, -e.r * 0.4);
          ctx.lineTo(e.r * 0.25, e.r * 0.1);
          ctx.lineTo(0, e.r * 0.7);
          ctx.lineTo(-e.r * 0.25, e.r * 0.1);
          ctx.closePath();
          ctx.fill();

          // Secondary Demonic Eyes (Smaller, looking outward)
          ctx.fillStyle = isFlash ? '#000000' : '#c026d3'; // Neon Magenta
          ctx.shadowColor = isFlash ? 'transparent' : '#c026d3';
          ctx.shadowBlur = isFlash ? 0 : 15;
          
          // Right cluster
          ctx.beginPath(); ctx.arc(e.r * 0.5, -e.r * 0.2, e.r * 0.12, 0, pi2); ctx.fill();
          ctx.beginPath(); ctx.arc(e.r * 0.75, e.r * 0.15, e.r * 0.08, 0, pi2); ctx.fill();
          
          // Left cluster
          ctx.beginPath(); ctx.arc(-e.r * 0.5, -e.r * 0.2, e.r * 0.12, 0, pi2); ctx.fill();
          ctx.beginPath(); ctx.arc(-e.r * 0.75, e.r * 0.15, e.r * 0.08, 0, pi2); ctx.fill();

          // Reset ang shadow para hindi madamay yung susunod na drawing sa canvas
          ctx.shadowBlur = 0;

          ctx.restore();
        } else if (e.type === 'primordial') {
                // ==================================================
                // 🌌 PRIMORDIAL DEMON (King of the Void / World Ender)
                // ==================================================
                const isFlash = e.flash > 0;
                
                // --- 1. APOCALYPTIC FAUX GLOW (Fiery Void Aura) ---
                const glowColor = isFlash ? '255, 255, 255' : '220, 20, 60'; // Crimson Core
                const glowColor2 = isFlash ? '255, 255, 255' : '255, 100, 0'; // Fiery Orange Edge
                const blurSize = isFlash ? 120 : 200;
                const maxGlowRadius = e.r * 3.5 + blurSize;
                
                const grad = ctx.createRadialGradient(0, 0, e.r * 0.5, 0, 0, maxGlowRadius);
                grad.addColorStop(0, `rgba(${glowColor}, 0.9)`);
                grad.addColorStop(0.35, `rgba(${glowColor2}, 0.5)`);
                grad.addColorStop(1, `rgba(${glowColor2}, 0)`);
                
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(0, 0, maxGlowRadius, 0, Math.PI * 2);
                ctx.fill();

                // 🛑 I-OFF ANG HARDWARE SHADOW PARA DI MAG-LAG
                ctx.shadowBlur = 0;

                // --- 2. ANCIENT KING'S SEAL (ROTATING TEXT) ---
                ctx.save();
                ctx.rotate(-now / 2000); // Mabagal na ikot counter-clockwise
                ctx.fillStyle = isFlash ? '#ffffff' : 'rgba(255, 150, 0, 0.8)';
                ctx.font = `bold ${e.r * 0.6}px "Courier New", monospace`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const runes = ['ᛞ','ᛟ','ᚢ','ᛗ','ᛚ','ᚲ','ᚷ','ᚹ','ᚺ','ᚾ','ᛒ','ᛖ', '✦', '✧'];
                
                for (let i = 0; i < 14; i++) {
                    let a = (i / 14) * Math.PI * 2;
                    let dist = e.r * 4.2; // Mas malawak na radius para sa text
                    ctx.save();
                    ctx.translate(Math.cos(a) * dist, Math.sin(a) * dist);
                    ctx.rotate(a + Math.PI / 2);
                    ctx.fillText(runes[i], 0, 0);
                    ctx.restore();
                }
                
                // Inner spinning magical ring (Clockwise)
                ctx.rotate(now / 1000);
                ctx.strokeStyle = isFlash ? '#ffffff' : 'rgba(220, 20, 60, 0.6)';
                ctx.lineWidth = 3;
                ctx.setLineDash([20, 15, 5, 15]);
                ctx.beginPath();
                ctx.arc(0, 0, e.r * 3.5, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.restore();

                // --- 3. FIRE EMBERS LOGIC (Lumilipad paitaas sa gilid) ---
                ctx.fillStyle = isFlash ? '#ffffff' : '#ffaa00';
                for (let i = 0; i < 24; i++) {
                    // X position nagwe-wave sa gilid
                    let emberX = Math.cos(now * 0.001 + i) * (e.r * 2.5 + (i % 3) * e.r);
                    // Y position umaakyat at naglu-loop
                    let emberY = e.r * 3 - ((now * 0.06 + i * 35) % (e.r * 6));
                    let emberSize = 1.5 + Math.sin(now * 0.01 + i) * 1.5; // Pumipintig na laki
                    
                    ctx.beginPath();
                    ctx.arc(emberX, emberY, Math.max(0.1, emberSize), 0, Math.PI * 2);
                    ctx.fill();
                }

                // --- 4. REALITY SHATTER (Fiery Cracks) ---
                ctx.strokeStyle = isFlash ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 80, 0, 0.8)';
                ctx.lineWidth = 2.5;
                for (let i = 0; i < 8; i++) {
                    let ang = (i * Math.PI / 4) + (Math.sin(now * 0.002) * 0.1); // Swaying cracks
                    let crackLength = e.r * (7 + Math.random() * 4); 
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    let currX = 0, currY = 0;
                    for (let j = 0; j < 4; j++) {
                        currX += Math.cos(ang) * (crackLength / 4) + (Math.random() * 20 - 10);
                        currY += Math.sin(ang) * (crackLength / 4) + (Math.random() * 20 - 10);
                        ctx.lineTo(currX, currY);
                    }
                    ctx.stroke();
                }

                // --- 5. THE VOID KING'S BODY (Pulsing Black Hole with fiery crust) ---
                ctx.fillStyle = isFlash ? '#ffffff' : '#050005';
                ctx.strokeStyle = isFlash ? '#000000' : '#ff3300';
                ctx.lineWidth = 4;
                ctx.beginPath();
                for (let i = 0; i < 36; i++) {
                    let ang = (Math.PI * 2 / 36) * i + (now / 200); 
                    // Nade-deform ang katawan niya
                    let pulse = Math.sin(now * 0.01 + i * 2) * 0.15;
                    let dist = e.r * (0.9 + pulse); 
                    ctx.lineTo(Math.cos(ang) * dist, Math.sin(ang) * dist);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // --- 6. THE WORLD-ENDER CROWN ---
                // Lumulutang sa taas ng ulo na may gold/orange edges
                let crownY = -e.r * 1.1 + Math.sin(now * 0.005) * 6; // Float effect
                let crownW = e.r * 1.3;
                
                ctx.fillStyle = isFlash ? '#ffffff' : '#0a0000';
                ctx.strokeStyle = isFlash ? '#000000' : '#ffaa00'; 
                ctx.lineWidth = 2.5;
                
                ctx.beginPath();
                ctx.moveTo(-crownW, crownY);
                ctx.lineTo(-crownW * 1.4, crownY - e.r * 1.3); // Outer left spike
                ctx.lineTo(-crownW * 0.5, crownY - e.r * 0.4); 
                ctx.lineTo(0, crownY - e.r * 1.8);             // Center highest spike
                ctx.lineTo(crownW * 0.5, crownY - e.r * 0.4);  
                ctx.lineTo(crownW * 1.4, crownY - e.r * 1.3);  // Outer right spike
                ctx.lineTo(crownW, crownY);
                ctx.quadraticCurveTo(0, crownY + e.r * 0.4, -crownW, crownY); // Curved bottom
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Crown Jewel (Glowing Center)
                ctx.fillStyle = isFlash ? '#000000' : '#ff0000';
                ctx.beginPath();
                ctx.arc(0, crownY - e.r * 0.6, e.r * 0.25, 0, Math.PI * 2);
                ctx.fill();

                // --- 7. TERRIFYING OMNIPRESENT EYES ---
                ctx.fillStyle = isFlash ? '#000000' : '#ffea00'; // Glowing yellow/orange eyes
                ctx.shadowColor = '#ff0000';
                ctx.shadowBlur = 40; // Buhayin saglit ang shadow para sa mata
                
                let eyeGlitch = Math.random() > 0.9 ? 5 : 0; 
                
                // Giant Center Eye
                ctx.beginPath(); 
                ctx.ellipse(0, -e.r * 0.1 + eyeGlitch, e.r * 0.55, e.r * 0.25, 0, 0, Math.PI * 2);
                ctx.fill();
                
                // Main Pupil (Reptilian slit)
                ctx.fillStyle = isFlash ? '#ffffff' : '#ff0000';
                ctx.beginPath();
                ctx.ellipse(0, -e.r * 0.1 + eyeGlitch, e.r * 0.1, e.r * 0.25, 0, 0, Math.PI * 2);
                ctx.fill();

                // 4 Smaller Sub-eyes (Biblically Accurate Demon Vibe)
                ctx.fillStyle = isFlash ? '#000000' : '#ffaa00';
                // Top Angled Eyes
                ctx.beginPath(); ctx.ellipse(-e.r * 0.65, -e.r * 0.4, e.r * 0.2, e.r * 0.08, -Math.PI/5, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(e.r * 0.65, -e.r * 0.4, e.r * 0.2, e.r * 0.08, Math.PI/5, 0, Math.PI * 2); ctx.fill();
                
                // Bottom Angled Eyes
                ctx.beginPath(); ctx.ellipse(-e.r * 0.55, e.r * 0.35, e.r * 0.15, e.r * 0.06, Math.PI/5, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(e.r * 0.55, e.r * 0.35, e.r * 0.15, e.r * 0.06, -Math.PI/5, 0, Math.PI * 2); ctx.fill();

                ctx.shadowBlur = 0; // I-reset ang shadow pabalik sa normal
            } else if (e.type === 'abyss') {
        // ==================================================
        // 🌋 PRIMORDIAL DEMON (World-Ending God of Destruction)
        // ==================================================
        
        const hpRatio = (e.hp !== undefined && e.maxHp !== undefined) ? (e.hp / e.maxHp) : 1;
        const isEnraged = hpRatio <= 0.25;
        const isFlash = e.flash > 0;
        
        const enrageScale = isEnraged ? 1.5 : 1;
        const baseR = e.r * 1.4; 
        const coreR = baseR * enrageScale;
        const pi2 = 6.283185307; // Fast Math.PI * 2
        
        ctx.save();
        
        // 💥 REALITY DISTORTION / ENRAGE SCREEN SHAKE
        if (isEnraged) {
            const intensity = 3 + Math.random() * 4;
            ctx.translate((Math.random() - 0.5) * intensity, (Math.random() - 0.5) * intensity);
        }

        // 0. APOCALYPTIC ENVIRONMENT (Optimized: Removed massive fillRect, used Arc)
        const distPulse = Math.sin(now * 0.00666) * 0.15; // now / 150
        const envGrad = ctx.createRadialGradient(0, 0, coreR * 2, 0, 0, coreR * 15);
        envGrad.addColorStop(0, 'transparent');
        envGrad.addColorStop(0.6, `rgba(153, 27, 27, ${0.1 + distPulse})`); 
        envGrad.addColorStop(1, `rgba(69, 10, 10, ${0.3 + distPulse})`);
        ctx.fillStyle = envGrad;
        ctx.beginPath();
        ctx.arc(0, 0, coreR * 15, 0, pi2);
        ctx.fill();

        // 1. MULTI-LAYERED APOCALYPTIC AURA
        const auraPulse = Math.abs(Math.sin(now * 0.005));
        const auraRadius = coreR * (isEnraged ? 6 + auraPulse * 2 : 4 + auraPulse);
        
        const aura = ctx.createRadialGradient(0, 0, coreR * 0.5, 0, 0, auraRadius);
        aura.addColorStop(0, '#ffffff'); 
        aura.addColorStop(0.2, '#facc15'); 
        aura.addColorStop(0.4, '#ea580c'); 
        aura.addColorStop(0.7, '#7f1d1d'); 
        aura.addColorStop(1, 'transparent'); 
        
        ctx.fillStyle = isFlash ? '#ffffff' : aura;
        ctx.globalAlpha = 0.8;
        ctx.beginPath(); ctx.arc(0, 0, auraRadius, 0, pi2); ctx.fill();
        ctx.globalAlpha = 1.0;

        // Swirling Infernal Vortexes (Optimized: Built-in ellipse rotation)
        const vortRot1 = now * 0.005;
        const vortRot2 = vortRot1 + 1.570796; // + Math.PI / 2
        
        ctx.lineWidth = coreR * 0.4;
        ctx.strokeStyle = `rgba(234, 88, 12, ${0.3 + distPulse})`;
        ctx.beginPath(); ctx.ellipse(0, 0, coreR * 3, coreR * 3, vortRot1, 0, Math.PI); ctx.stroke();
        
        ctx.strokeStyle = `rgba(153, 27, 27, ${0.2 + distPulse})`;
        ctx.beginPath(); ctx.ellipse(0, 0, coreR * 4, coreR * 4, vortRot2, 0, Math.PI); ctx.stroke();

        // 2. GYROSCOPIC INFERNAL SIGILS 
        const sigilSpeedMult = isEnraged ? 0.00666 : 0.00333; 
        const outRot = now * -sigilSpeedMult;
        
        ctx.strokeStyle = 'rgba(153, 27, 27, 0.6)';
        ctx.lineWidth = 4;
        ctx.setLineDash([20, 15, 5, 15]);
        ctx.beginPath(); ctx.ellipse(0, 0, coreR * 5.5, coreR * 5.5, outRot, 0, pi2); ctx.stroke();

        const inRot = now * (sigilSpeedMult * 1.25); 
        ctx.strokeStyle = 'rgba(234, 88, 12, 0.8)';
        ctx.lineWidth = 2;
        ctx.setLineDash([40, 20]);
        ctx.beginPath(); ctx.ellipse(0, 0, coreR * 4.5, coreR * 4.5, inRot, 0, pi2); ctx.stroke();
        
        ctx.font = `${coreR * 0.6}px "Courier New", monospace`;
        ctx.fillStyle = '#facc15';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const charBase = 0x16A0;
        for (let i = 0; i < 12; i++) {
            let ang = (i * 0.523598) + inRot; 
            let rune = String.fromCharCode(charBase + (i % 20)); 
            ctx.fillText(rune, Math.cos(ang) * coreR * 4.5, Math.sin(ang) * coreR * 4.5);
        }
        
        ctx.setLineDash([]);
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
            ctx.ellipse(0, 0, coreR * 4.2, coreR * 0.8, (i * 0.785398), 0, pi2);
        }
        ctx.stroke();

        // 3. 12 WINGS (Optimized Matrix Math -> 1 Batched Path)
        const wingFlap = Math.cos(now * 0.00666) * 0.4;
        const wingLen = isEnraged ? coreR * 8 : coreR * 5;
        
        // Shadow Wings (Background Layer)
        ctx.fillStyle = isFlash ? '#ffffff' : '#09090b';
        ctx.strokeStyle = '#4c1d95'; 
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            let rot = (1.047197 * i) + wingFlap * 0.8 + 0.2; 
            let cR = Math.cos(rot), sR = Math.sin(rot);
            let tX = (x, y) => x * cR - y * sR;
            let tY = (x, y) => x * sR + y * cR;

            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(tX(-coreR * 2, -coreR * 2), tY(-coreR * 2, -coreR * 2), tX(-wingLen * 1.1, -wingLen * 0.9), tY(-wingLen * 1.1, -wingLen * 0.9));
            ctx.lineTo(tX(-coreR * 3, -coreR * 1), tY(-coreR * 3, -coreR * 1));
            ctx.lineTo(tX(-wingLen * 0.8, 0), tY(-wingLen * 0.8, 0));
            ctx.lineTo(0, 0);
        }
        ctx.fill(); ctx.stroke();

        // Hellfire Wings (Foreground Layer)
        ctx.fillStyle = isFlash ? '#ffffff' : '#7c2d12';
        ctx.strokeStyle = '#fef08a'; 
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            let rot = (1.047197 * i) - wingFlap;
            let cR = Math.cos(rot), sR = Math.sin(rot);
            let tX = (x, y) => x * cR - y * sR;
            let tY = (x, y) => x * sR + y * cR;

            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(tX(coreR * 2, -coreR * 2.5), tY(coreR * 2, -coreR * 2.5), tX(wingLen, -wingLen * 0.8), tY(wingLen, -wingLen * 0.8)); 
            ctx.lineTo(tX(coreR * 2.5, -coreR * 1.5), tY(coreR * 2.5, -coreR * 1.5));
            ctx.lineTo(tX(wingLen * 0.7, -coreR * 0.5), tY(wingLen * 0.7, -coreR * 0.5));
            ctx.lineTo(0, 0);
        }
        ctx.fill(); ctx.stroke();

        // 4. COLOSSAL TITAN CARAPACE
        const corePulse = Math.sin(now * 0.0125) * 0.3; 
        const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR * (1.3 + corePulse));
        coreGrad.addColorStop(0, '#ffffff'); 
        coreGrad.addColorStop(0.3, '#facc15'); 
        coreGrad.addColorStop(0.7, '#b91c1c'); 
        coreGrad.addColorStop(1, 'transparent');
        
        ctx.fillStyle = isFlash ? '#ffffff' : coreGrad;
        ctx.beginPath(); ctx.arc(0, 0, coreR * 1.4, 0, pi2); ctx.fill();

        // Floating Obsidian Armor Plates (Optimized Batched Path with Faux Glow)
        const armorGlow = ctx.createRadialGradient(0, 0, coreR * 0.5, 0, 0, coreR * 2.5);
        armorGlow.addColorStop(0.5, 'rgba(234, 88, 12, 0.5)'); // #ea580c glow
        armorGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = armorGlow;
        ctx.beginPath(); ctx.arc(0, 0, coreR * 2.5, 0, pi2); ctx.fill();

        ctx.fillStyle = isFlash ? '#ffffff' : '#0c0a09';
        ctx.strokeStyle = '#dc2626'; 
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            let pAng = (i * 1.047197) + (now * 0.002); 
            let breathe = Math.sin((now * 0.00666) + i) * 0.15; 
            let pDist = coreR * (0.5 + breathe); 
            
            let cx = Math.cos(pAng) * pDist;
            let cy = Math.sin(pAng) * pDist;
            let cR = Math.cos(pAng), sR = Math.sin(pAng);
            let tX = (x, y) => (x * cR - y * sR) + cx;
            let tY = (x, y) => (x * sR + y * cR) + cy;
            
            ctx.moveTo(tX(0, -coreR * 0.6), tY(0, -coreR * 0.6));
            ctx.quadraticCurveTo(tX(coreR * 1.6, -coreR * 0.2), tY(coreR * 1.6, -coreR * 0.2), tX(coreR * 1.6, 0), tY(coreR * 1.6, 0));
            ctx.quadraticCurveTo(tX(coreR * 1.6, coreR * 0.2), tY(coreR * 1.6, coreR * 0.2), tX(0, coreR * 0.6), tY(0, coreR * 0.6));
            ctx.quadraticCurveTo(tX(coreR * 0.6, 0), tY(coreR * 0.6, 0), tX(0, -coreR * 0.6), tY(0, -coreR * 0.6));
        }
        ctx.fill(); ctx.stroke();

        // 5. OMNIPRESENT EYES (Body & Main)
        const eyeColors = ['#ffffff', '#facc15', '#dc2626', '#09090b'];
        const flickerColor = eyeColors[Math.floor((now * 0.01) % eyeColors.length)];
        
        // Main Eye with Faux Glow
        const eyeGlowGrad = ctx.createRadialGradient(0, -coreR * 0.3, coreR * 0.1, 0, -coreR * 0.3, coreR * 1.5);
        let fcRGB = flickerColor === '#ffffff' ? '255,255,255' : flickerColor === '#facc15' ? '250,204,21' : flickerColor === '#dc2626' ? '220,38,38' : '9,9,11';
        eyeGlowGrad.addColorStop(0, `rgba(${fcRGB}, 0.8)`);
        eyeGlowGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = eyeGlowGrad;
        ctx.beginPath(); ctx.ellipse(0, -coreR * 0.3, coreR * 1.5, coreR * 0.6, 0, 0, pi2); ctx.fill();
        
        ctx.fillStyle = isFlash ? '#000000' : flickerColor;
        ctx.beginPath(); ctx.ellipse(0, -coreR * 0.3, coreR * 0.6, coreR * 0.2, 0, 0, pi2); ctx.fill();
        
        // Additional body eyes 
        const eyeCount = isEnraged ? 8 : 4;
        for (let i = 0; i < eyeCount; i++) {
            let eAng = (i / eyeCount) * pi2 + Math.PI;
            let eDist = coreR * 0.9;
            let eScale = (i % 2 === 0) ? 0.2 : 0.15;
            ctx.fillStyle = eyeColors[Math.floor(((now + i * 50) * 0.01) % eyeColors.length)];
            ctx.beginPath(); 
            ctx.ellipse(Math.cos(eAng) * eDist, Math.sin(eAng) * eDist, coreR * eScale, coreR * (eScale * 0.4), eAng, 0, pi2); 
            ctx.fill();
        }

        // 6. FLOATING INFERNAL CROWN (Matrix Math)
        const crownY = -coreR * 2 + Math.sin(now * 0.00666) * 15;
        
        ctx.fillStyle = '#0c0a09';
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            let cAng = (now * -0.005) + (i * 1.256637); 
            let cDist = coreR * 1.2;
            let cx = Math.cos(cAng) * cDist;
            let cy = Math.sin(cAng) * cDist * 0.3 + crownY; 
            let rot = now * 0.01;
            
            let cR = Math.cos(rot), sR = Math.sin(rot);
            let tX = (x, y) => x * cR - y * sR + cx;
            let tY = (x, y) => x * sR + y * cR + cy;

            ctx.moveTo(tX(0, -coreR * 0.4), tY(0, -coreR * 0.4)); 
            ctx.quadraticCurveTo(tX(coreR * 0.1, 0), tY(coreR * 0.1, 0), tX(coreR * 0.2, 0), tY(coreR * 0.2, 0)); 
            ctx.quadraticCurveTo(tX(coreR * 0.1, coreR * 0.2), tY(coreR * 0.1, coreR * 0.2), tX(0, coreR * 0.4), tY(0, coreR * 0.4)); 
            ctx.quadraticCurveTo(tX(-coreR * 0.1, coreR * 0.2), tY(-coreR * 0.1, coreR * 0.2), tX(-coreR * 0.2, 0), tY(-coreR * 0.2, 0));
            ctx.quadraticCurveTo(tX(-coreR * 0.1, 0), tY(-coreR * 0.1, 0), tX(0, -coreR * 0.4), tY(0, -coreR * 0.4));
        }
        ctx.fill(); ctx.stroke();
        
        // Burning Crown Runes (Inner Ring) - Removed ShadowBlur
        ctx.fillStyle = '#ea580c';
        ctx.font = `${coreR * 0.4}px "Georgia"`;
        ctx.textAlign = 'center';
        for (let i = 0; i < 3; i++) {
            let rAng = (now * 0.00666) + (i * 2.094395); 
            ctx.fillText("✦", Math.cos(rAng) * coreR * 0.7, Math.sin(rAng) * coreR * 0.2 + crownY);
        }

        // 7. PARTICLES (Lava Embers, Ash, Sparks - Optimized Batched Paths)
        let parts = [[], [], []];
        for (let k = 0; k < 40; k++) {
            let pType = k % 3; 
            let pX = (Math.random() - 0.5) * coreR * 20;
            let pY = (Math.random() - 0.5) * coreR * 20 - ((now / (pType === 1 ? 5 : 15)) + k * 80) % (coreR * 15);
            parts[pType].push({x: pX, y: pY});
        }
        
        // Type 0: Ash
        ctx.fillStyle = 'rgba(87, 83, 78, 0.8)';
        ctx.beginPath();
        for (let p of parts[0]) { ctx.moveTo(p.x, p.y); ctx.arc(p.x, p.y, Math.random() * 2 + 1, 0, pi2); }
        ctx.fill();

        // Type 1: Embers with Faux Glow
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        for (let p of parts[1]) { ctx.moveTo(p.x, p.y); ctx.arc(p.x, p.y, Math.random() * 3 + 1, 0, pi2); }
        ctx.fill();
        ctx.fillStyle = 'rgba(234, 88, 12, 0.4)';
        ctx.beginPath();
        for (let p of parts[1]) { ctx.moveTo(p.x, p.y); ctx.arc(p.x, p.y, 6, 0, pi2); }
        ctx.fill();

        // Type 2: Obsidian Fragments
        ctx.fillStyle = '#0c0a09';
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let p of parts[2]) { ctx.moveTo(p.x, p.y); ctx.arc(p.x, p.y, 2.5, 0, pi2); }
        ctx.fill(); ctx.stroke();

        ctx.restore();
      } else if (e.type === 'abyss_awakened') {
                // ==================================================
                // 👁️ THE ABYSS AWAKENED (The Sovereign of Annihilation)
                // ==================================================
                
                const hpRatio = (e.hp !== undefined && e.maxHp !== undefined) ? (e.hp / e.maxHp) : 1;
                const isEnraged = hpRatio <= 0.3;
                const isFlash = e.flash > 0;
                
                const enrageMult = isEnraged ? 1.5 : 1;
                const coreR = e.r * 1.5;
                const pi2 = 6.283185307; // Pre-calculate Math.PI * 2
                
                ctx.save();

                // ==================================================
                // 1. GLOBAL MAP AURA & SHOCKWAVES
                // ==================================================
                const auraPulse = Math.sin(now * 0.00125) * 0.1; // now / 800
                const auraRadius = coreR * (40 + auraPulse * 10); 
                
                const mapAuraGrad = ctx.createRadialGradient(0, 0, coreR * 5, 0, 0, auraRadius);
                mapAuraGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
                mapAuraGrad.addColorStop(0.3, `rgba(153, 27, 27, ${0.15 + auraPulse})`);
                mapAuraGrad.addColorStop(0.7, `rgba(10, 0, 10, ${0.4 + auraPulse})`);
                mapAuraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                
                ctx.fillStyle = mapAuraGrad;
                ctx.beginPath();
                ctx.arc(0, 0, auraRadius, 0, pi2);
                ctx.fill();

                // APOCALYPTIC SHOCKWAVES 
                const swTime = (now / (isEnraged ? 400 : 800)) % 1;
                const swRadius = coreR * (5 + swTime * 20);
                ctx.beginPath();
                ctx.arc(0, 0, swRadius, 0, pi2);
                ctx.strokeStyle = `rgba(239, 68, 68, ${0.8 * (1 - swTime)})`;
                ctx.lineWidth = isEnraged ? 15 * (1 - swTime) : 5 * (1 - swTime);
                ctx.stroke();

                // ==================================================
                // 2. NEW: ANNIHILATION ARRAY & ASCENDING EMBERS
                // ==================================================
                
                // --- Outer Rotating Geometric Array (Optimized to 1 path) ---
                const outerRot = now / 6000;
                ctx.save(); // Needed for lineDash and rotation isolation
                ctx.strokeStyle = isEnraged ? `rgba(239, 68, 68, ${0.3 + Math.abs(auraPulse)})` : `rgba(153, 27, 27, ${0.15 + Math.abs(auraPulse)})`;
                ctx.lineWidth = isEnraged ? 3 : 1;
                ctx.rotate(outerRot); 
                
                ctx.beginPath();
                ctx.arc(0, 0, coreR * 5.5, 0, pi2);
                // Hexagram pattern batching
                const hexRad = coreR * 5.5;
                for(let i=0; i<6; i++) {
                    let a1 = i * 1.04719755; // Math.PI / 3
                    let a2 = (i + 2) * 1.04719755;
                    ctx.moveTo(Math.cos(a1) * hexRad, Math.sin(a1) * hexRad);
                    ctx.lineTo(Math.cos(a2) * hexRad, Math.sin(a2) * hexRad);
                }
                ctx.stroke(); // 1 stroke for circle + hexagram!
                ctx.restore();

                // --- Inner Reverse Rotating Ring ---
                ctx.save();
                ctx.strokeStyle = isEnraged ? `rgba(239, 68, 68, ${0.5 + Math.abs(auraPulse)})` : `rgba(153, 27, 27, ${0.3 + Math.abs(auraPulse)})`;
                ctx.lineWidth = 2;
                ctx.rotate(now / -3000); 
                ctx.setLineDash([coreR * 0.8, coreR * 0.4]);
                ctx.beginPath();
                ctx.arc(0, 0, coreR * 4.2, 0, pi2);
                ctx.stroke();
                ctx.restore();

                // --- Ascending Void Embers ---
                ctx.fillStyle = isEnraged ? '#ffffff' : '#ef4444';
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#ef4444';
                const numEmbers = isEnraged ? 40 : 20;
                const totalHeight = coreR * 11;
                
                for (let i = 0; i < numEmbers; i++) {
                    let emberX = (Math.sin(i * 123.45) * coreR * 6); 
                    let speed = 1 + (i % 3); 
                    let emberY = (coreR * 5) - ((now / (10 * speed) + i * 80) % totalHeight); 
                    
                    let fade = 1 - (Math.abs(emberY) / (coreR * 5.5));
                    if (fade > 0) {
                        ctx.globalAlpha = fade;
                        ctx.beginPath();
                        ctx.arc(emberX, emberY, isEnraged ? Math.random() * 3 + 1 : 1.5, 0, pi2);
                        ctx.fill();
                    }
                }
                ctx.globalAlpha = 1.0;
                ctx.shadowBlur = 0; // Turn off immediately to save performance

                // ==================================================
                // 3. LEVITATION & ENTITY JITTER 
                // ==================================================
                let shakeX = 0, shakeY = 0;
                if (isEnraged) {
                    shakeX = (Math.random() - 0.5) * (coreR * 0.25);
                    shakeY = (Math.random() - 0.5) * (coreR * 0.25);
                }
                const floatY = Math.sin(now * 0.000833) * (coreR * 0.4) + shakeY; // now/1200
                ctx.translate(shakeX, floatY);

                // 4. THE ECLIPSE HALO (Optimized with Faux Glow instead of shadowBlur 150)
                const haloGlowSz = isEnraged ? 150 : 50;
                const fauxGlowRad = coreR * 3.5 + haloGlowSz;
                
                const haloGlowGrad = ctx.createRadialGradient(0, -coreR * 0.5, coreR * 3.5 - 10, 0, -coreR * 0.5, fauxGlowRad);
                haloGlowGrad.addColorStop(0, 'rgba(220, 38, 38, 1)'); // shadowColor
                haloGlowGrad.addColorStop(1, 'rgba(220, 38, 38, 0)');
                
                ctx.fillStyle = haloGlowGrad;
                ctx.beginPath(); ctx.arc(0, -coreR * 0.5, fauxGlowRad, 0, pi2); ctx.fill();

                ctx.fillStyle = isFlash ? '#ffffff' : '#000000';
                ctx.strokeStyle = `rgba(220, 38, 38, ${0.5 + Math.sin(now * 0.005) * 0.4})`;
                ctx.lineWidth = coreR * 0.4;
                ctx.beginPath(); ctx.arc(0, -coreR * 0.5, coreR * 3.5, 0, pi2); ctx.fill(); ctx.stroke();
                
                const eclipseGrad = ctx.createRadialGradient(0, -coreR * 0.5, coreR * 3.5, 0, -coreR * 0.5, coreR * 6);
                eclipseGrad.addColorStop(0, 'rgba(153, 27, 27, 0.8)');
                eclipseGrad.addColorStop(0.5, 'rgba(45, 10, 70, 0.3)');
                eclipseGrad.addColorStop(1, 'transparent');
                ctx.fillStyle = eclipseGrad;
                ctx.beginPath(); ctx.arc(0, -coreR * 0.5, coreR * 6.5, 0, pi2); ctx.fill();

                // 5. AWAKENED CROWN (Optimized Math: No ctx.save/rotate loop!)
                const crownSpeed = isEnraged ? 800 : 2500;
                const crownRot = now / crownSpeed;
                
                ctx.save();
                ctx.translate(0, -coreR * 0.5);
                ctx.rotate(crownRot);
                ctx.strokeStyle = '#ef4444';
                ctx.lineWidth = isEnraged ? 4 : 2;
                ctx.setLineDash([coreR * 0.8, coreR * 1.2]);
                ctx.beginPath(); ctx.arc(0, 0, coreR * 3.8, 0, pi2); ctx.stroke();
                ctx.restore();

                // Pre-calculate diamond points rotation
                const dSin = Math.sin(now * 0.002) * 12; // now / 500
                const dCos = Math.cos(now * 0.002) * 12;
                
                ctx.fillStyle = '#ef4444';
                ctx.beginPath();
                for(let i=0; i<4; i++) {
                    let gAng = (i * 1.5707963) + crownRot; // Math.PI / 2
                    let cx = Math.cos(gAng) * (coreR * 3.8);
                    let cy = Math.sin(gAng) * (coreR * 3.8) - coreR * 0.5; // Offset by translate Y
                    
                    // Direct math rotation (Fastest rendering)
                    ctx.moveTo(cx + dSin, cy - dCos);
                    ctx.lineTo(cx + dCos, cy + dSin);
                    ctx.lineTo(cx - dSin, cy + dCos);
                    ctx.lineTo(cx - dCos, cy - dSin);
                }
                ctx.fill();

                // 6. REALITY RIBBONS (Optimized to 1 Batched Path)
                ctx.strokeStyle = isEnraged ? '#ef4444' : 'rgba(153, 27, 27, 0.9)';
                ctx.lineWidth = isEnraged ? 6 : 4;
                ctx.setLineDash([]);
                
                ctx.beginPath();
                let ribbonDots = [];
                for(let i=0; i<4; i++) {
                    let rAng = (now * -0.0005) + (i * 1.5707963);
                    let flow = coreR * (3 + Math.sin(now * 0.0025 + i) * 2);
                    let cCos = Math.cos(rAng);
                    let cSin = Math.sin(rAng);

                    // Math rotation for quadraticCurve
                    let cx = cCos * (coreR * 2.5) - cSin * coreR;
                    let cy = cSin * (coreR * 2.5) + cCos * coreR;
                    let ex = cCos * flow - cSin * (-coreR * 2.5);
                    let ey = cSin * flow + cCos * (-coreR * 2.5);

                    ctx.moveTo(0, 0);
                    ctx.quadraticCurveTo(cx, cy, ex, ey);
                    ribbonDots.push({x: ex, y: ey});
                }
                ctx.stroke(); // 1 Stroke pass for all 4 ribbons!

                ctx.fillStyle = '#ffffff';
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#ef4444';
                ctx.beginPath();
                for(let i=0; i<4; i++) {
                    ctx.moveTo(ribbonDots[i].x + 4, ribbonDots[i].y);
                    ctx.arc(ribbonDots[i].x, ribbonDots[i].y, 4, 0, pi2);
                }
                ctx.fill();
                ctx.shadowBlur = 0; // Reset

                // 7. DARK SERAPH WINGS (Matrix Math Optimization -> 1 fill, 1 stroke)
                const wingFlap = Math.cos(now / (isEnraged ? 600 : 1000)) * 0.2 * enrageMult; 
                ctx.fillStyle = isFlash ? '#ffffff' : '#030303';
                ctx.strokeStyle = isEnraged ? '#ef4444' : '#991b1b';
                ctx.lineWidth = 3;
                
                const wingAngles = [-0.8, -0.3, 0.2, 0.7]; 
                ctx.beginPath();
                for (let j = 0; j < 2; j++) { 
                    let flip = j === 0 ? 1 : -1;
                    for (let i = 0; i < 4; i++) {
                        let rot = wingAngles[i] + wingFlap * (i % 2 === 0 ? 1 : -1);
                        let cosR = Math.cos(rot), sinR = Math.sin(rot);
                        let wLen = coreR * (isEnraged ? 8 : 6) - (i * coreR);
                        
                        // Matrix translation instead of expensive ctx.save/rotate
                        let tX = (x, y) => (x * cosR - y * sinR) * flip;
                        let tY = (x, y) => (x * sinR + y * cosR);

                        ctx.moveTo(0, 0);
                        ctx.lineTo(tX(coreR * 1.8, -wLen * 0.5), tY(coreR * 1.8, -wLen * 0.5));
                        ctx.lineTo(tX(coreR * 0.6, -wLen), tY(coreR * 0.6, -wLen));
                        ctx.lineTo(tX(-coreR * 0.6, -wLen * 0.7), tY(-coreR * 0.6, -wLen * 0.7));
                        ctx.closePath();
                    }
                }
                ctx.fill(); ctx.stroke(); // All 8 wings rendered in one go!

                // 8. SOVEREIGN CARAPACE (Batched Subpaths)
                ctx.fillStyle = isFlash ? '#ffffff' : '#09090b'; 
                ctx.strokeStyle = '#ef4444'; 
                ctx.lineWidth = isEnraged ? 3 : 2;
                
                const breathe = Math.sin(now * 0.0025) * (coreR * 0.15);
                ctx.beginPath(); 
                // Right
                ctx.moveTo(coreR * 1.2 + breathe, -coreR); ctx.lineTo(coreR * 2.8 + breathe, -coreR * 1.6); ctx.lineTo(coreR * 1.8 + breathe, -coreR * 0.2); ctx.closePath();
                // Left
                ctx.moveTo(-coreR * 1.2 - breathe, -coreR); ctx.lineTo(-coreR * 2.8 - breathe, -coreR * 1.6); ctx.lineTo(-coreR * 1.8 - breathe, -coreR * 0.2); ctx.closePath();
                // Center
                ctx.moveTo(0, -coreR * 2.8); ctx.lineTo(coreR * 1.6, -coreR * 0.8); ctx.lineTo(coreR * 0.9, coreR * 2.0); 
                ctx.lineTo(0, coreR * 3.0); ctx.lineTo(-coreR * 0.9, coreR * 2.0); ctx.lineTo(-coreR * 1.6, -coreR * 0.8); ctx.closePath();
                ctx.fill(); ctx.stroke();

                // 9. SOUL VORTEX / DEBRIS
                ctx.fillStyle = '#ef4444';
                for(let i=0; i<8; i++) {
                    let pTime = ((now / (isEnraged ? 300 : 600)) + (i * 0.125)) % 1; // i / 8
                    let pAngle = (i * 0.785398) + (now * 0.002); // i * Math.PI / 4
                    let pRadius = coreR * 5 * (1 - pTime); 
                    
                    ctx.globalAlpha = Math.sin(pTime * Math.PI); 
                    ctx.beginPath(); 
                    ctx.arc(Math.cos(pAngle) * pRadius, Math.sin(pAngle) * pRadius, coreR * 0.15, 0, pi2); 
                    ctx.fill();
                }
                ctx.globalAlpha = 1.0;

                // 10. THE BLACK STAR CORE (Replaced heavy shadowBlur with Faux Glow)
                const coreBeat = Math.sin(now / (isEnraged ? 100 : 250)) * (isEnraged ? 0.3 : 0.2);
                const innerCoreR = coreR * (0.8 + coreBeat);
                const coreGlowSz = isEnraged ? 80 : 40;
                
                const coreGlowGrad = ctx.createRadialGradient(0, 0, innerCoreR * 0.5, 0, 0, innerCoreR * 1.8 + coreGlowSz);
                coreGlowGrad.addColorStop(0, 'rgba(239, 68, 68, 1)'); 
                coreGlowGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
                ctx.fillStyle = coreGlowGrad;
                ctx.beginPath(); ctx.arc(0, 0, innerCoreR * 1.8 + coreGlowSz, 0, pi2); ctx.fill();
                
                ctx.fillStyle = isFlash ? '#ffffff' : '#ef4444';
                ctx.beginPath();
                for(let i=0; i<8; i++) { 
                    let ang = (i * 0.785398) + (now/ (isEnraged ? 500 : 1000));
                    let dist = i % 2 === 0 ? innerCoreR * 1.8 : innerCoreR * 0.8;
                    ctx.lineTo(Math.cos(ang) * dist, Math.sin(ang) * dist);
                }
                ctx.fill();
                
                ctx.fillStyle = isFlash ? '#ffffff' : '#000000';
                ctx.beginPath(); ctx.arc(0, 0, innerCoreR * 0.7, 0, pi2); ctx.fill();

                // 11. THE ZENITH EYE (Replaced heavy shadowBlur with Faux Glow)
                const eyeY = -coreR * 3.8; 
                const eyeBlink = isEnraged ? 1 : Math.max(0.1, Math.sin(now / 1200)); 
                const eyeHeight = coreR * 1.0 * eyeBlink;
                const eyeGlowSz = isEnraged ? 80 : 40;
                
                const eyeGlowGrad = ctx.createRadialGradient(0, eyeY, coreR * 0.5, 0, eyeY, coreR * 1.6 + eyeGlowSz);
                eyeGlowGrad.addColorStop(0, 'rgba(239, 68, 68, 1)');
                eyeGlowGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
                ctx.fillStyle = eyeGlowGrad;
                ctx.beginPath(); ctx.ellipse(0, eyeY, coreR * 1.6 + eyeGlowSz, eyeHeight + eyeGlowSz, 0, 0, pi2); ctx.fill();
                
                ctx.fillStyle = '#050505';
                ctx.beginPath(); ctx.ellipse(0, eyeY, coreR * 1.6, eyeHeight, 0, 0, pi2); ctx.fill(); 
                
                if (eyeBlink > 0.2) { 
                    const pupilTrackX = Math.sin(now / 800) * (coreR * 0.5);
                    
                    ctx.fillStyle = isEnraged ? '#ffffff' : '#ef4444'; 
                    ctx.beginPath(); ctx.ellipse(pupilTrackX, eyeY, coreR * 0.6, eyeHeight * 0.6, 0, 0, pi2); ctx.fill(); 
                    
                    ctx.fillStyle = '#000000';
                    ctx.beginPath(); ctx.ellipse(pupilTrackX, eyeY, coreR * 0.15, eyeHeight * 0.5, 0, 0, pi2); ctx.fill();
                    
                    ctx.fillStyle = '#ef4444';
                    for(let i=0; i<5; i++) {
                        let dropY = eyeY + eyeHeight + ((now / (isEnraged ? 15 : 20) + i * 25) % (isEnraged ? 80 : 50));
                        ctx.globalAlpha = 1 - ((dropY - eyeY) / (isEnraged ? 80 : 50));
                        ctx.beginPath(); ctx.arc(pupilTrackX + (i-2)*6, dropY, isEnraged ? 3 : 2, 0, pi2); ctx.fill();
                    }
                    ctx.globalAlpha = 1.0;
                }

                ctx.restore();
            } 

      ctx.restore();
      animationId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationId);
  }, [monster]);

  // CIRCULAR PREVIEW WITH ANCIENT SEAL BORDER
  return (
    <div style={{ position: 'relative', width: '240px', height: '240px', margin: '0 auto', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <svg width="240" height="240" viewBox="0 0 240 240" style={{ position: 'absolute', inset: 0, animation: 'grimoire-spin 15s linear infinite', zIndex: 3, pointerEvents: 'none' }}>
        <circle cx="120" cy="120" r="115" fill="none" stroke="#ffe6a3" strokeWidth="1.5" opacity="0.6" strokeDasharray="8 4" />
        <circle cx="120" cy="120" r="106" fill="none" stroke="#c5a059" strokeWidth="1.2" />
        <circle cx="120" cy="120" r="95" fill="none" stroke="#a0784a" strokeWidth="2" strokeDasharray="2 6" />
        <polygon points="120,5 125,15 115,15" fill="#ffe6a3" />
        <polygon points="120,235 125,225 115,225" fill="#ffe6a3" />
        <polygon points="5,120 15,115 15,125" fill="#ffe6a3" />
        <polygon points="235,120 225,115 225,125" fill="#ffe6a3" />
      </svg>
      <div style={{ width: '200px', height: '200px', borderRadius: '50%', overflow: 'hidden', position: 'relative', zIndex: 2, background: 'radial-gradient(circle at 50% 50%, #1e1b4b 0%, #030107 100%)', boxShadow: 'inset 0 0 30px rgba(0,0,0,0.9), 0 0 20px rgba(197, 160, 89, 0.3)' }}>
        <canvas ref={canvasRef} width={200} height={200} style={{ display: 'block' }} />
      </div>
    </div>
  );
};

// --- MAIN BESTIARY SPREAD COMPONENT ---
export default function Bestiary() {
  const [pageIndex, setPageIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [decodingRunes, setDecodingRunes] = useState([]);

  const handlePageTurn = (direction) => {
    if (isTransitioning) return;
    
    let newIndex = pageIndex;
    if (direction === 'next' && pageIndex < MONSTER_LOGBOOK.length - 1) {
      newIndex = pageIndex + 1;
    } else if (direction === 'prev' && pageIndex > 0) {
      newIndex = pageIndex - 1;
    } else {
      return; 
    }

    setIsTransitioning(true);
    
    // Generate fewer, larger runes to prevent lag
    setDecodingRunes(generateDecodingRunes(60)); 

    // Wait until the fade reaches its peak (300ms)
    setTimeout(() => {
      setPageIndex(newIndex);
    }, 300);

    // End transition & clear runes smoothly
    setTimeout(() => {
      setIsTransitioning(false);
      setDecodingRunes([]); 
    }, 800);
  };

  const monster = MONSTER_LOGBOOK[pageIndex];

  return (
    <>
      <style>{`
        /* OPTIMIZED FADE FOR PERFORMANCE */
        .grimoire-fade-content {
          transition: opacity 0.3s ease, transform 0.3s ease;
          opacity: 1;
          transform: scale(1);
          will-change: opacity, transform; /* GPU Hint */
        }
        .grimoire-fade-content.hidden {
          opacity: 0;
          transform: scale(0.96);
        }

        /* STRICT BOUNDARY FOR RUNES */
        .rune-bounds {
          position: absolute;
          inset: 5px;
          overflow: hidden;
          border-radius: 4px;
          z-index: 50;
          pointer-events: none;
        }

        /* CONTAINER FOR INDIVIDUAL RUNES */
        .rune-decoding-container {
          position: absolute;
          inset: -5%;
          display: flex;
          flex-wrap: wrap;
          align-content: center;
          justify-content: center;
          gap: 10px;
          padding: 8%;
          pointer-events: none;
          
          /* Radial mask para dahan-dahang nawawala ang runes sa gilid ng libro */
          mask-image: radial-gradient(circle at center, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 90%);
          -webkit-mask-image: radial-gradient(circle at center, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 90%);
        }

        /* INDIVIDUAL 3D FLIPPING RUNE (Decoding Effect) */
        .rune-char {
          display: inline-block;
          font-family: 'Courier New', monospace;
          font-size: 2.2rem; /* Larger font size, less DOM elements needed */
          font-weight: bold;
          opacity: 0;
          color: transparent;
          animation-name: decodeRuneAnim;
          animation-timing-function: linear; /* Smoother rendering */
          animation-fill-mode: forwards;
          will-change: transform, opacity, color; /* GPU Hinting */
        }

        /* OPTIMIZED "HACKING / DECODING" ANIMATION KEYFRAMES (Removed Blur) */
        @keyframes decodeRuneAnim {
          0%   { opacity: 0; transform: perspective(400px) rotateY(-90deg) scale(1.2); color: transparent; text-shadow: none; }
          20%  { opacity: 1; transform: perspective(400px) rotateY(0deg) scale(1); color: #ffffff; text-shadow: 0 0 10px #ffe6a3; }
          50%  { transform: perspective(400px) rotateY(180deg) scale(1.1); color: #ffe6a3; text-shadow: 0 0 15px #c5a059; }
          80%  { opacity: 1; transform: perspective(400px) rotateY(360deg) scale(1); color: #ffffff; text-shadow: 0 0 10px #ffe6a3; }
          100% { opacity: 0; transform: perspective(400px) rotateY(450deg) scale(1.2); color: transparent; text-shadow: none; }
        }

        /* WHITE-GOLD ETHEREAL FLASH */
        .rune-flash {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center, rgba(255, 230, 163, 0.4) 0%, transparent 70%);
          opacity: 0;
          transition: opacity 0.4s ease-out;
          mix-blend-mode: overlay;
          z-index: 49;
          pointer-events: none;
        }
        .rune-flash.active {
          opacity: 1;
        }
      `}</style>

      {/* ── LEFT PAGE (PREVIEW & NAME) ── */}
      <div className="grimoire-page grimoire-left">
        
        {/* 🔥 THE STRICT RUNE CONTAINER FOR LEFT PAGE */}
        <div className="rune-bounds">
          <div className={`rune-flash ${isTransitioning ? 'active' : ''}`}></div>
          <div className="rune-decoding-container">
            {isTransitioning && decodingRunes.map(r => (
              <span key={`l-${r.id}`} className="rune-char" style={{ animationDelay: r.delay, animationDuration: r.duration }}>
                {r.char}
              </span>
            ))}
          </div>
        </div>

        <div className={`grimoire-page-inner grimoire-fade-content ${isTransitioning ? 'hidden' : ''}`} style={{ justifyContent: 'center', alignItems: 'center' }}>
          
          <div className="grimoire-rune-strip" style={{ position: 'absolute', top: 12, width: '100%' }}>
            ᚠ ᚢ ᚦ ᚨ ᚱ ᚲ ᚷ ᚹ ᚺ ᚾ ᛁ ᛃ ᛇ ᛈ ᛉ ᛊ ᛏ ᛒ ᛖ ᛗ ᛚ ᛟ
          </div>

          <div style={{ textAlign: 'center', width: '100%', position: 'relative', zIndex: 10 }}>
            <div style={{ fontSize: '0.6rem', letterSpacing: '0.35em', color: '#a0784a', fontFamily: 'Georgia, serif', textTransform: 'uppercase', marginBottom: 4 }}>
              Entity Classification: {monster.type}
            </div>
            <div style={{
              fontFamily: 'Georgia, serif', fontSize: '1.4rem', color: '#ef4444', fontWeight: 'bold',
              textShadow: '0 0 12px rgba(239, 68, 68, 0.4)', lineHeight: 1.2, letterSpacing: '0.05em', marginBottom: 30
            }}>
              {monster.name}
            </div>
            
            <MonsterPreview monster={monster} />
          </div>

          <div className="grimoire-rune-strip" style={{ position: 'absolute', bottom: 12, width: '100%' }}>
            ᛟ ✦ ᛞ ᛜ ᛚ ᛗ ᛖ ᛒ ᛏ ᛊ ᛉ ᛈ ᛇ ᛃ ᛁ ᚾ ᚺ ᚹ ✦ ᛟ
          </div>
          <div className="grimoire-page-num" style={{ position: 'absolute', bottom: 30, width: '100%' }}>
            Entity {pageIndex + 1}
          </div>
        </div>
      </div>

      {/* ── SPINE ── */}
      <div className="grimoire-spine">
        <div className="grimoire-spine-inner">
          <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', letterSpacing: '0.2em', fontSize: '0.55rem', color: '#a0784a', fontFamily: 'Georgia, serif', whiteSpace: 'nowrap' }}>
            ✦ BESTIARY ✦
          </div>
        </div>
      </div>

      {/* ── RIGHT PAGE (STATS, LORE, & CONTROLS) ── */}
      <div className="grimoire-page grimoire-right">

        {/* 🔥 THE STRICT RUNE CONTAINER FOR RIGHT PAGE */}
        <div className="rune-bounds">
          <div className={`rune-flash ${isTransitioning ? 'active' : ''}`}></div>
          <div className="rune-decoding-container">
            {isTransitioning && decodingRunes.map(r => (
              <span key={`r-${r.id}`} className="rune-char" style={{ animationDelay: r.delay, animationDuration: r.duration }}>
                {r.char}
              </span>
            ))}
          </div>
        </div>

        <div className={`grimoire-page-inner grimoire-fade-content ${isTransitioning ? 'hidden' : ''}`}>
          
          <div className="grimoire-rune-strip" style={{ marginBottom: 10 }}>
            ᚠ ᚢ ᛁ ᛃ ᛇ ᚱ ᚲ ᚷ ✦ ᛊ ᛏ ᛒ ᛖ ᛗ ᛚ ᛟ ᛞ ᛜ ✦ ᚦ
          </div>

          <div style={{
            textAlign: 'center', fontFamily: 'Georgia, serif', fontSize: '0.75rem', letterSpacing: '0.25em', color: '#e9c47a',
            textTransform: 'uppercase', marginBottom: 10, textShadow: '0 0 8px rgba(233,196,122,0.3)',
          }}>
            ✦ Arcane Analysis ✦
          </div>

          <div className="grimoire-divider" />

          {/* LORE DESCRIPTION */}
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '0.75rem', color: '#c9a96e', lineHeight: 1.6, textAlign: 'justify', marginBottom: 15, minHeight: '60px', position: 'relative', zIndex: 10 }}>
            <em>"{monster.desc}"</em>
          </div>

          {/* STATS GRID */}
          <div style={{ 
            background: 'rgba(0,0,0,0.4)', border: '1px dashed rgba(197,160,89,0.3)', borderRadius: '6px', 
            padding: '10px 15px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', 
            fontFamily: 'monospace', fontSize: '0.7rem', color: '#cbd5e1', position: 'relative', zIndex: 10 
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#a0784a' }}>Health:</span> <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{monster.hp}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#a0784a' }}>Damage:</span> <span style={{ color: '#fb923c', fontWeight: 'bold' }}>{monster.dmg}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#a0784a' }}>Speed:</span> <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>{monster.speed}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#a0784a' }}>Size (r):</span> <span style={{ color: '#a78bfa', fontWeight: 'bold' }}>{monster.r}</span>
            </div>
            <div style={{ gridColumn: '1 / -1', borderTop: '1px solid rgba(197,160,89,0.2)', paddingTop: '6px', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#a0784a' }}>Encountered:</span> <span style={{ color: '#cbd5e1' }}>{monster.wave}</span>
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#a0784a' }}>Known Drop:</span> <span style={{ color: '#facc15', fontWeight: 'bold', textShadow: '0 0 5px rgba(250,204,21,0.5)' }}>{monster.drop}</span>
            </div>
          </div>

          <div className="grimoire-divider" style={{ marginTop: 'auto' }} />

          {/* ── STYLIZED NAVIGATION BUTTONS ── */}
          <div style={{ 
            display: 'flex', justifyContent: 'space-between', marginTop: '20px', 
            paddingTop: '10px', borderTop: '1px solid rgba(197, 160, 89, 0.3)',
            zIndex: 10, position: 'relative' 
          }}>
            <button 
              onClick={(e) => { e.stopPropagation(); handlePageTurn('prev'); }}
              disabled={pageIndex === 0 || isTransitioning}
              style={{
                background: pageIndex === 0 ? 'rgba(0,0,0,0.2)' : 'linear-gradient(180deg, #2a1a06 0%, #1a0e03 100%)',
                color: pageIndex === 0 ? '#444' : '#e9c47a',
                border: '1px solid #c5a059',
                padding: '8px 16px',
                fontFamily: 'Georgia, serif',
                fontSize: '0.7rem',
                cursor: pageIndex === 0 ? 'not-allowed' : 'pointer',
                borderRadius: '4px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => e.target.style.boxShadow = '0 0 10px rgba(197, 160, 89, 0.5)'}
              onMouseLeave={(e) => e.target.style.boxShadow = 'none'}
            >
              &#8592; Prev
            </button>
            
            <button 
              onClick={(e) => { e.stopPropagation(); handlePageTurn('next'); }}
              disabled={pageIndex === MONSTER_LOGBOOK.length - 1 || isTransitioning}
              style={{
                background: pageIndex === MONSTER_LOGBOOK.length - 1 ? 'rgba(0,0,0,0.2)' : 'linear-gradient(180deg, #2a1a06 0%, #1a0e03 100%)',
                color: pageIndex === MONSTER_LOGBOOK.length - 1 ? '#444' : '#e9c47a',
                border: '1px solid #c5a059',
                padding: '8px 16px',
                fontFamily: 'Georgia, serif',
                fontSize: '0.7rem',
                cursor: pageIndex === MONSTER_LOGBOOK.length - 1 ? 'not-allowed' : 'pointer',
                borderRadius: '4px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => e.target.style.boxShadow = '0 0 10px rgba(197, 160, 89, 0.5)'}
              onMouseLeave={(e) => e.target.style.boxShadow = 'none'}
            >
              Next &#8594;
            </button>
          </div>

          <div className="grimoire-rune-strip" style={{ marginTop: 8 }}>
            ᛟ ✦ ᛞ ᛜ ᛚ ᛗ ᛖ ᛒ ᛏ ᛊ ᛉ ᛈ ᛇ ᛃ ᛁ ᚾ ᚺ ᚹ ✦ ᛟ
          </div>
          <div className="grimoire-page-num">III</div>
        </div>
      </div>
    </>
  );
}