import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import LoadingScreen from './LoadingScreen';
// SPELL DAMAGE LOGIC search para sa tornados at waves

//CHEAT CODES / DEV
// ==========================================================================
// 🔥 BULLETPROOF AUDIO POOL MANAGER
// ==========================================================================
class SoundManager {
  constructor() {
    this.pools = {
      collapse: [],
      instinct: [],
      revival: [],
      flare: [],
      wave: [],
      fissure: [],
      lightning: [],
      ice: [],
      heal: [],
      freeze: [],
      nuke: [],
      equip: [],
      unequip: [],
      delete: [],
      dash: [],
      choir: [],
    };
    this.unlocked = false;

    const SFX_MAP = {
      collapse: '/collapse.mp3',
      instinct: '/arcane.mp3',
      revival: '/resu.mp3',
      flare: '/flare.mp3',
      wave: '/wave.mp3',
      fissure: '/fissure.mp3',
      lightning: '/lightning.mp3',
      ice: '/ice.mp3',
      heal: '/heal.mp3',
      freeze: '/freeze.mp3',
      nuke: '/nuke.mp3',
      equip: '/equip.mp3',
      unequip: '/unequip.mp3',
      delete: '/delete.mp3',
      dash: '/dash.wav',
      choir: '/choir.mp3'
    };

    if (typeof window !== 'undefined') {
      for (const [key, src] of Object.entries(SFX_MAP)) {
        for (let i = 0; i < 3; i++) {
          const audio = new Audio(src);
          audio.load();
          this.pools[key].push(audio);
        }
      }
    }
  }

  unlockAll() {
    if (this.unlocked) return;
    this.unlocked = true;

    // 🔥 iOS FIX (was the cause of "sabay-sabay lahat ng SFX" + dead audio after):
    // 1) iOS Safari IGNORES `audio.volume` on <audio> elements — Apple reserves
    //    volume control for the hardware buttons only. The old code set
    //    volume=0 to silently unlock, but on iOS that did nothing, so every
    //    pooled sound played out loud the moment the player first touched the
    //    screen. `.muted` IS respected on iOS, so we use that instead.
    // 2) iOS only allows audio.play() to start when it's called SYNCHRONOUSLY
    //    inside the user-gesture call stack (pointerdown/keydown handler).
    //    Wrapping each play() in setTimeout (even 0/15ms) breaks that
    //    association, so iOS silently blocked almost every pooled sound from
    //    ever truly unlocking — which is why SFX stopped working entirely
    //    once gameplay started. Unlocking everything in one synchronous loop
    //    (no setTimeout) keeps every call tied to the original gesture.
    //
    // 🔥 LAG FIX: Dati, sabay-sabay na nino-notify ang 48 Audio elements (16 sounds x 3 pool)
    // sa iisang synchronous loop — nagdudulot ng malaking main thread spike sa first gesture.
    // Solusyon: I-unlock lang ang UNANG audio ng bawat sound type (16 calls lang) para
    // ma-satisfy ang browser gesture requirement, tapos i-defer ang natitirang 32 sa
    // microtask queue (Promise chain) para hindi nila ma-block ang first frame ng gameplay.
    const allPools = Object.values(this.pools);

    const unlockOne = (audio) => {
      audio.muted = true;
      const p = audio.play();
      if (p !== undefined) {
        p.then(() => { audio.pause(); audio.currentTime = 0; audio.muted = false; })
         .catch(() => { audio.muted = false; });
      } else {
        audio.muted = false;
      }
    };

    // Pass 1 (synchronous, sa loob ng gesture): pool[0] lang ng bawat sound (16 calls)
    allPools.forEach(pool => { if (pool.length) unlockOne(pool[0]); });

    // Pass 2 (deferred microtask): pool[1] at pool[2] — hindi na naka-block sa first frame
    Promise.resolve().then(() => {
      allPools.forEach(pool => {
        for (let i = 1; i < pool.length; i++) unlockOne(pool[i]);
      });
    });
  }

  play(type) {
    if (typeof window === 'undefined' || localStorage.getItem('arcane_muted') === 'true') return;
    const pool = this.pools[type];
    if (pool) {
      let audio = pool.find(a => a.paused || a.ended);
      if (!audio) audio = pool[0]; 

      audio.currentTime = 0;
      audio.volume = 1.0;
      audio.play().catch(e => console.warn("Browser blocked SFX:", e));
    }
  }
}

window.ArcaneSoundManager = window.ArcaneSoundManager || new SoundManager();
const playSfx = (type) => window.ArcaneSoundManager.play(type);

const W = 1280;
const H = 720;

const formatLargeNumber = (num) => {
  if (!num) return "0";
  if (num >= 1e21) return (num / 1e21).toFixed(2) + 'Sx'; // Sextillion
  if (num >= 1e18) return (num / 1e18).toFixed(2) + 'Qi'; // Quintillion
  if (num >= 1e15) return (num / 1e15).toFixed(2) + 'Qa'; // Quadrillion
  if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';  // Trillion
  if (num >= 1e9)  return (num / 1e9).toFixed(2) + 'B';   // Billion
  if (num >= 1e6)  return (num / 1e6).toFixed(2) + 'M';   // Million
  if (num >= 1e3)  return (num / 1e3).toFixed(2) + 'K';   // Thousand
  return Math.floor(num).toLocaleString();
};

const ET = [
  // 1. Normal Minion -> type: 'normal'
  { r: 13, speed: 65,  hp: 25,  dmg: 15,  xp: 15,  color: '#e2e8f0', glow: '#94a3b8', boss: false, type: 'normal' },
  
  // 2. Fast/Assassin Minion -> type: 'fast'
  { r: 11, speed: 115, hp: 15,  dmg: 25,  xp: 20,  color: '#fb923c', glow: '#f97316', boss: false, type: 'fast' },
  
  // 3. Tanky/Elite Minion -> type: 'tank'
  { r: 15, speed: 55,  hp: 120, dmg: 35,  xp: 40,  color: '#818cf8', glow: '#6366f1', boss: false, type: 'tank' },
  
  // 4. Generic Mini-Boss -> type: 'miniBoss' (Walang binago)
  { r: 27, speed: 60,  hp: 600, dmg: 80, xp: 150, color: '#fbbf24', glow: '#f59e0b', boss: true, type: 'miniBoss' },
];

// =========================================================================
// 🚀 SPRITE CACHING PARA SA NORMAL MINIONS (ANTI-LAG SYSTEM)
// =========================================================================
const SPRITE_SIZE = 50; 
const SPRITE_R = 13; // Ang size radius ng normal minion

const createNormalSprite = (isFlash) => {
  const canvas = document.createElement('canvas');
  canvas.width = SPRITE_SIZE;
  canvas.height = SPRITE_SIZE;
  const ctx = canvas.getContext('2d');
  
  ctx.translate(SPRITE_SIZE / 2, SPRITE_SIZE / 2); // Igitna ang drawing
  
  // Katawan
  ctx.fillStyle = isFlash ? '#ffffff' : '#1e293b'; 
  ctx.beginPath();
  for(let i = 0; i < 12; i++) {
      let ang = i * (Math.PI / 6);
      let rad = SPRITE_R * 0.8; 
      ctx.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
  }
  ctx.closePath();
  ctx.fill();

  // Bone Skull Mask
  const topY = -SPRITE_R * 0.2;
  const maskR = SPRITE_R * 0.6;
  const jawY = SPRITE_R * 0.5;
  const jawX = SPRITE_R * 0.3;

  ctx.fillStyle = isFlash ? '#000000' : '#cbd5e1';
  ctx.beginPath();
  ctx.arc(0, topY, maskR, Math.PI, 0); 
  ctx.quadraticCurveTo(maskR, jawY, jawX, jawY); 
  ctx.lineTo(-jawX, jawY); 
  ctx.quadraticCurveTo(-maskR, jawY, -maskR, topY); 
  ctx.fill();

  // Mata
  ctx.fillStyle = isFlash ? '#ffffff' : '#991b1b';
  const eyeX = SPRITE_R * 0.25;
  const eyeRX = SPRITE_R * 0.15;
  const eyeRY = SPRITE_R * 0.2;

  ctx.beginPath(); 
  ctx.ellipse(-eyeX, 0, eyeRX, eyeRY, 0.2, 0, Math.PI * 2); 
  const startX = eyeX + eyeRX * Math.cos(-0.2);
  const startY = eyeRY * Math.sin(-0.2);
  ctx.moveTo(startX, startY);
  ctx.ellipse(eyeX, 0, eyeRX, eyeRY, -0.2, 0, Math.PI * 2); 
  ctx.fill();

  return canvas;
};

// I-save natin sa memory yung mga pre-rendered images
// Gagawin lang ito isang beses tuwing maglo-load ang page!
const normalMinionImage = createNormalSprite(false);
const normalMinionFlashImage = createNormalSprite(true);

// =========================================================================
// 🚀 SPRITE CACHING PARA SA FAST AT TANK MINIONS
// =========================================================================
const CACHE_R = 40; // Gagamit tayo ng malaking Radius (40) para malinaw (HD) ang sprite

const createFastSprite = (isFlash) => {
    const size = CACHE_R * 6; // Ang wingspan ng fast minion ay umaabot sa 2.5x radius
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.translate(size / 2, size / 2); // Gitna

    const thirdPI = (Math.PI * 2) / 3;
    ctx.fillStyle = isFlash ? '#ffffff' : '#9a3412'; 
    ctx.strokeStyle = isFlash ? '#000000' : '#ea580c';
    ctx.lineWidth = 2.5;

    // Wings
    ctx.beginPath(); 
    for(let i = 0; i < 3; i++) {
        ctx.rotate(thirdPI);
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(CACHE_R * 1.5, -CACHE_R * 1.5, CACHE_R * 2.5, 0); 
        ctx.quadraticCurveTo(CACHE_R * 1.0, -CACHE_R * 0.5, 0, CACHE_R * 0.5);
    }
    ctx.fill(); ctx.stroke();

    // Eyes
    ctx.fillStyle = isFlash ? '#000000' : '#fef08a';
    const eyeDist = CACHE_R * 0.4;
    const eyeSize = CACHE_R * 0.25;
    ctx.beginPath(); 
    for(let i = 0; i < 3; i++) {
        let a = i * thirdPI;
        let ex = Math.cos(a) * eyeDist;
        let ey = Math.sin(a) * eyeDist;
        ctx.moveTo(ex + eyeSize, ey);
        ctx.arc(ex, ey, eyeSize, 0, Math.PI * 2); 
    }
    ctx.fill();
    return canvas;
};

const createTankSprite = (isFlash) => {
    const size = CACHE_R * 4; 
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.translate(size / 2, size / 2);

    // Carapace (Baluti)
    ctx.fillStyle = isFlash ? '#ffffff' : '#1e1b4b'; 
    ctx.strokeStyle = isFlash ? '#000000' : '#4338ca';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-CACHE_R * 1.2, CACHE_R * 0.5); 
    ctx.lineTo(-CACHE_R * 1.5, -CACHE_R * 0.2); 
    ctx.lineTo(-CACHE_R * 0.6, -CACHE_R * 1.2); 
    ctx.lineTo(0, -CACHE_R * 0.8);          
    ctx.lineTo(CACHE_R * 0.6, -CACHE_R * 1.2);   
    ctx.lineTo(CACHE_R * 1.5, -CACHE_R * 0.2);   
    ctx.lineTo(CACHE_R * 1.2, CACHE_R * 0.5);    
    ctx.lineTo(0, CACHE_R * 0.8);             
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // Furnace Glow (Naka-fix sa 0.75 opacity imbes na pumipintig)
    if (isFlash) {
        ctx.fillStyle = '#000000';
    } else {
        ctx.fillStyle = '#6366f1'; 
        ctx.globalAlpha = 0.75; 
    }
    ctx.beginPath();
    ctx.arc(0, CACHE_R * 0.2, CACHE_R * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1; // Reset

    // Prison Bars
    ctx.strokeStyle = isFlash ? '#ffffff' : '#0f172a';
    ctx.lineWidth = 5;
    ctx.beginPath(); 
    ctx.moveTo(-CACHE_R * 0.7, CACHE_R * 0.2); ctx.lineTo(CACHE_R * 0.7, CACHE_R * 0.2); 
    ctx.moveTo(-CACHE_R * 0.3, -CACHE_R * 0.3); ctx.lineTo(-CACHE_R * 0.3, CACHE_R * 0.7); 
    ctx.moveTo(CACHE_R * 0.3, -CACHE_R * 0.3); ctx.lineTo(CACHE_R * 0.3, CACHE_R * 0.7); 
    ctx.stroke(); 

    return canvas;
};

// I-cache ang images sa memory (1 beses lang tatakbo)
const fastImg = createFastSprite(false);
const fastFlashImg = createFastSprite(true);
const tankImg = createTankSprite(false);
const tankFlashImg = createTankSprite(true);



const RARITY_COLORS = {
  common: '#e2e8f0',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#fbbf24',
  mythic: '#ef4444'
};

// ── Custom Arcane Line-Icon Set (replaces generic emoji for hotbar/sigils) ──
const ArcaneIcon = ({ type, size = 22, style, className }) => {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', style: { verticalAlign: 'middle', flexShrink: 0, ...style }, className };
  switch (type) {
    case 'bodyCutter': // B.Cutter — crimson slash blade
      return (
        <svg {...common}>
          <path d="M4 19 L17 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M13 6 L19 4 L17 10 Z" fill="currentColor" opacity="0.9" />
          <path d="M6 17 Q4.5 19 4 21 Q5.8 20.3 7 19" fill="#ef4444" opacity="0.85" />
        </svg>
      );
    case 'shootingStar': // S.Star — comet with trail
      return (
        <svg {...common}>
          <path d="M3 21 L11 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.55" />
          <path d="M6.5 17.5 L13 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.8" />
          <path d="M16 8 L17.4 11.1 L20.7 11.5 L18.3 13.8 L18.9 17.1 L16 15.5 L13.1 17.1 L13.7 13.8 L11.3 11.5 L14.6 11.1 Z" fill="currentColor" />
        </svg>
      );
    case 'cubeBash': // C.Bash — impacting cube
      return (
        <svg {...common}>
          <path d="M12 3 L20 7 V16 L12 20 L4 16 V7 Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M4 7 L12 11 L20 7" stroke="currentColor" strokeWidth="1.4" />
          <path d="M12 11 V20" stroke="currentColor" strokeWidth="1.4" />
          <path d="M1.5 11 L4 9.5 M1.5 13 L4 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.7" />
        </svg>
      );
    case 'vacuumSlash': // V.Slash — vortex swirl
      return (
        <svg {...common}>
          <path d="M12 4 C16.5 4 20 7 20 11 C20 14.5 17 16.5 14 16 C11.5 15.6 10 13.8 10.6 12 C11.1 10.5 13 10 14 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M5 13 C5 17 8.2 20 12.5 20" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.6" />
          <circle cx="14" cy="11" r="1.3" fill="currentColor" />
        </svg>
      );
    case 'arcaneCollapse': // A.Collapse — converging singularity
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" fill="currentColor" />
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.2" opacity="0.4" />
          {[0, 60, 120, 180, 240, 300].map(a => {
            const r1 = 11, r2 = 6.5;
            const rad = (a * Math.PI) / 180;
            return (
              <line key={a}
                x1={12 + Math.cos(rad) * r1} y1={12 + Math.sin(rad) * r1}
                x2={12 + Math.cos(rad) * r2} y2={12 + Math.sin(rad) * r2}
                stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            );
          })}
        </svg>
      );
    case 'arcaneInstinct': // A.Instinct — bolt within an eye/diamond
      return (
        <svg {...common}>
          <path d="M12 2 L21 12 L12 22 L3 12 Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" opacity="0.55" />
          <path d="M13 6 L8.5 13 H12 L11 18 L16 11 H12.5 Z" fill="currentColor" />
        </svg>
      );
    case 'arcaneResurrect': // A.Resurrect — rising rune staff
      return (
        <svg {...common}>
          <circle cx="12" cy="6" r="3.3" stroke="currentColor" strokeWidth="1.6" />
          <path d="M12 9.3 V21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M7 14 L12 11.5 L17 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8.5 18 L12 16.3 L15.5 18" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
        </svg>
      );
    case 'berserk': // Berserk Aura — crossed slashes with a flaring core
      return (
        <svg {...common}>
          <path d="M5 5 L19 19 M19 5 L5 19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.75" />
          <path d="M12 6.5c1.1 2.2 2.3 3 2.3 5.3a2.5 2.5 0 1 1-5 0c0-.85.3-1.4.75-1.9.1.6.5 1 .9 1-.35-1.6.2-2.7 1.05-4.4Z" fill="currentColor" />
        </svg>
      );
    case 'haste': // Massive Haste — forward speed chevrons
      return (
        <svg {...common}>
          <path d="M4 7 L10 12 L4 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M11 7 L17 12 L11 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.7" />
          <path d="M17.5 12 H21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
        </svg>
      );
    case 'fortify': // Fortify — hardened heater shield
      return (
        <svg {...common}>
          <path d="M12 2 L20 5.5 V11 C20 16.5 16.5 20.5 12 22 C7.5 20.5 4 16.5 4 11 V5.5 Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="none" />
          <path d="M6.2 10 H17.8 M6.2 14 H17.8" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
          <path d="M12 6.2 V18" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
        </svg>
      );
    case 'shield': // Rigid's Defender — layered energy bubble
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7" opacity="0.9" />
          <circle cx="12" cy="12" r="4.6" stroke="currentColor" strokeWidth="1.1" opacity="0.5" />
          <circle cx="9.3" cy="8.8" r="1.3" fill="currentColor" opacity="0.75" />
        </svg>
      );
    case 'fire':
      return (
        <svg {...common}>
          <path d="M12 2.5c1 3 4 4 4 8a4 4 0 1 1-8 0c0-1.2.4-2 1-2.7.2 1 .9 1.7 1.7 1.7-.5-2.2.3-3.8 1.3-7Z" fill="currentColor" />
        </svg>
      );
    case 'water':
      return (
        <svg {...common}>
          <path d="M3 11c2-1.5 3.5-1.5 5.5 0s3.5 1.5 5.5 0 3.5-1.5 5.5 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M3 16c2-1.5 3.5-1.5 5.5 0s3.5 1.5 5.5 0 3.5-1.5 5.5 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />
          <path d="M12 2c-2.5 3-4 5.3-4 7.2a4 4 0 0 0 8 0C16 7.3 14.5 5 12 2Z" fill="currentColor" opacity="0.85" />
        </svg>
      );
    case 'earth':
      return (
        <svg {...common}>
          <path d="M12 3 L21 19 H3 Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M9 19 L13 11 L11 11 L16 19" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="none" />
          <path d="M9 19 L13 11 L11 11 L16 19 Z" fill="currentColor" opacity="0.35" />
        </svg>
      );
    case 'lightning':
      return (
        <svg {...common}>
          <path d="M13 2 L5 14 H11 L9.5 22 L19 9 H13 Z" fill="currentColor" />
        </svg>
      );
    case 'ice':
      return (
        <svg {...common}>
          <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M12 2 V22" /><path d="M3.5 7 L20.5 17" /><path d="M3.5 17 L20.5 7" />
            <path d="M12 5 L9.5 7 M12 5 L14.5 7" /><path d="M12 19 L9.5 17 M12 19 L14.5 17" />
          </g>
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        </svg>
      );
    case 'nature':
      return (
        <svg {...common}>
          <path d="M12 21c0-7 .5-12 7-16-1 6-1.5 11-7 16Z" fill="currentColor" />
          <path d="M12 21c0-7-.5-12-7-16 1 6 1.5 11 7 16Z" fill="currentColor" opacity="0.7" />
          <path d="M12 21 V12" stroke="currentColor" strokeWidth="1.3" opacity="0.6" />
        </svg>
      );
    case 'ultimateSeal': // Ultimate Spells header — void sigil with orbiting stars (replaces 🌌)
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.1" opacity="0.45" />
          <circle cx="12" cy="12" r="5.6" stroke="currentColor" strokeWidth="1.3" opacity="0.7" />
          <circle cx="12" cy="12" r="1.8" fill="currentColor" />
          <path d="M5.2 6.2 L6.5 7.5 M17.5 7.5 L18.8 6.2 M5.2 17.8 L6.5 16.5 M18.8 17.8 L17.5 16.5"
            stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.6" />
          <path d="M21 5 L21.6 6.6 L23.2 7.2 L21.6 7.8 L21 9.4 L20.4 7.8 L18.8 7.2 L20.4 6.6 Z" fill="currentColor" opacity="0.85" />
          <path d="M4 17 L4.5 18.2 L5.7 18.7 L4.5 19.2 L4 20.4 L3.5 19.2 L2.3 18.7 L3.5 18.2 Z" fill="currentColor" opacity="0.7" />
        </svg>
      );
    default:
      return null;
  }
};

// ── Lightweight Canvas Debuff Icons ──────────────────────────────────────
// Drawn with plain paths/arcs (no ctx.font, no emoji glyph lookups).
// Emoji fillText forces the browser to resolve a fallback emoji font on
// every draw call; with many enemies on screen each frame, that glyph
// lookup is the actual lag source. Vector shapes are nearly free by
// comparison and stay crisp at any zoom.
const DEBUFF_ICON_COLORS = {
  burn:   '#fb923c', // Arcane Burn (was 💥)
  slow:   '#67e8f9', // Temporal Slow (was ❄️)
  stun:   '#38bdf8', // Stunned (was 💫)
  bleed:  '#f87171', // Stigma (was 🩸)
  void:   '#c084fc', // Void Exhaustion (was 🌌)
  instab: '#f472b6', // Instability (was 💔)
};

function drawDebuffIcon(ctx, type, cx, cy, s) {
  const color = DEBUFF_ICON_COLORS[type] || '#e2e8f0';
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.4;
  switch (type) {
    case 'burn': // teardrop flame
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.quadraticCurveTo(s * 0.62, -s * 0.15, s * 0.34, s * 0.32);
      ctx.quadraticCurveTo(s * 0.34, s * 0.82, 0, s * 0.95);
      ctx.quadraticCurveTo(-s * 0.34, s * 0.82, -s * 0.34, s * 0.32);
      ctx.quadraticCurveTo(-s * 0.62, -s * 0.15, 0, -s);
      ctx.fill();
      break;
    case 'slow': // snowflake spokes
      ctx.beginPath();
      ctx.arc(0, 0, s, 0, Math.PI * 2);
      ctx.stroke();
      for (let a = 0; a < 6; a++) {
        const rad = (a * Math.PI) / 3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(rad) * s, Math.sin(rad) * s);
        ctx.stroke();
      }
      break;
    case 'stun': // three orbiting stars
      for (let i = 0; i < 3; i++) {
        const a = (i * 2 * Math.PI) / 3 - Math.PI / 2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * s * 0.55, Math.sin(a) * s * 0.55, s * 0.26, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'bleed': // blood drop
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.quadraticCurveTo(s * 0.72, s * 0.15, 0, s * 0.95);
      ctx.quadraticCurveTo(-s * 0.72, s * 0.15, 0, -s);
      ctx.fill();
      break;
    case 'void': // eclipse ring
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.38, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'instab': // cracked X
      ctx.beginPath();
      ctx.moveTo(-s * 0.7, -s * 0.5); ctx.lineTo(s * 0.7, s * 0.5);
      ctx.moveTo(-s * 0.7, s * 0.5); ctx.lineTo(s * 0.7, -s * 0.5);
      ctx.stroke();
      break;
    default:
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.7, 0, Math.PI * 2);
      ctx.fill();
  }
  ctx.restore();
}

const EQUIPMENT_DB = [
  // WANDS
  { id: 'w1', name: "Apprentice's Willow Wand", rarity: 'common', type: 'wand', stats: { atk: 3, rate: 0.1 }, desc: "Favored by novice spellcasters." },
  { id: 'w2', name: "Emberwood Wand", rarity: 'common', type: 'wand', stats: { atk: 4, rate: 0.2 }, desc: "Infused with faint fire magic." },
  { id: 'w3', name: "Arcane Scholar's Wand", rarity: 'rare', type: 'wand', stats: { atk: 7, rate: 0.3, crit: 1 }, desc: "Used by academy mages." },
  { id: 'w4', name: "Crystal Focus Wand", rarity: 'rare', type: 'wand', stats: { atk: 8, rate: 0.2, crit: 2 }, desc: "Improves spell precision." },
  { id: 'w5', name: "Stormcaller Wand", rarity: 'epic', type: 'wand', stats: { atk: 14, rate: 0.5, crit: 4, critDmg: 5 }, desc: "Enchant: Fatal Strike I" },
  { id: 'w6', name: "Moonveil Wand", rarity: 'epic', type: 'wand', stats: { atk: 15, rate: 0.4, crit: 8 }, desc: "Enchant: Arcane Precision" },
  { id: 'w7', name: "Celestial Sage Wand", rarity: 'legendary', type: 'wand', stats: { atk: 22, rate: 0.7, crit: 8, critDmg: 10 }, desc: "Legendary artifact of old." },
  { id: 'w8', name: "Voidheart Wand", rarity: 'legendary', type: 'wand', stats: { atk: 39, rate: 0.6, crit: 10 }, desc: "Enchant: Arcane Overload" },
  { id: 'w9', name: "Astral Dominion Wand", rarity: 'mythic', type: 'wand', stats: { atk: 35, rate: 1.0, crit: 15, critDmg: 20 }, desc: "Mythic: Astral Burst" },
  { id: 'w10', name: "Eternity Nexus Wand", rarity: 'mythic', type: 'wand', stats: { atk: 63, rate: 0.8, crit: 18 }, desc: "Mythic: Infinite Manaflow" },

  // ROBES
  { id: 'r1', name: "Novice Mage Robe", rarity: 'common', type: 'robe', stats: { def: 8, hp: 10 }, desc: "Standard apprentice robes." },
  { id: 'r2', name: "Arcane Cloth Robe", rarity: 'common', type: 'robe', stats: { def: 10, hp: 15 }, desc: "Woven with magical threads." },
  { id: 'r3', name: "Runic Adept Robe", rarity: 'rare', type: 'robe', stats: { def: 18, hp: 25, lifesteal: 1 }, desc: "Embroidered with protective runes." },
  { id: 'r4', name: "Mystic Silk Robe", rarity: 'rare', type: 'robe', stats: { def: 20, hp: 30, lifesteal: 2 }, desc: "Favored by traveling spellcasters." },
  { id: 'r5', name: "Frostwoven Robe", rarity: 'epic', type: 'robe', stats: { def: 35, hp: 50, lifesteal: 3, dmgReduction: 3 }, desc: "Enchant: Iron Plating I" },
  { id: 'r6', name: "Shadowweave Robe", rarity: 'epic', type: 'robe', stats: { def: 32, hp: 45, speed: 5 }, desc: "Enchant: Swift Stride I" },
  { id: 'r7', name: "Archmage Robe", rarity: 'legendary', type: 'robe', stats: { def: 55, hp: 80, lifesteal: 5, dmgReduction: 8 }, desc: "Enchant: Iron Plating II" },
  { id: 'r8', name: "Starforged Robe", rarity: 'legendary', type: 'robe', stats: { def: 75, hp: 90, lifesteal: 6 }, desc: "Enchant: Arcane Barrier" },
  { id: 'r9', name: "Eternal Archon Robe", rarity: 'mythic', type: 'robe', stats: { def: 90, hp: 150, lifesteal: 10, dmgReduction: 15 }, desc: "Mythic: Mana Shield" },
  { id: 'r10', name: "Cosmic Sovereign Robe", rarity: 'mythic', type: 'robe', stats: { def: 125, hp: 180, lifesteal: 12 }, desc: "Mythic: Arcane Rebirth" },

  // BOOTS
  { id: 'b1', name: "Wanderer's Boots", rarity: 'common', type: 'boots', stats: { speed: 12, def: 1 }, desc: "Lightweight adventure boots." },
  { id: 'b2', name: "Leather Mystic Boots", rarity: 'common', type: 'boots', stats: { speed: 15, def: 2 }, desc: "Durable mobility boots." },
  { id: 'b3', name: "Runebound Boots", rarity: 'rare', type: 'boots', stats: { speed: 22, crit: 1, def: 4 }, desc: "Engraved with speed runes." },
  { id: 'b4', name: "Windstep Boots", rarity: 'rare', type: 'boots', stats: { speed: 25, crit: 2, def: 6 }, desc: "Enchanted with wind magic." },
  { id: 'b5', name: "Swiftstride Boots", rarity: 'epic', type: 'boots', stats: { speed: 43, crit: 3, def: 15 }, desc: "Enchant: Swift Stride I" },
  { id: 'b6', name: "Thunderdash Boots", rarity: 'epic', type: 'boots', stats: { speed: 48, crit: 4, def: 12 }, desc: "Enchant: Lightning Sprint" },
  { id: 'b7', name: "Tempest Walker", rarity: 'legendary', type: 'boots', stats: { speed: 70, crit: 5, def: 20 }, desc: "Enchant: Swift Stride II" },
  { id: 'b8', name: "Voidrunner Boots", rarity: 'legendary', type: 'boots', stats: { speed: 80, crit: 6, def: 22 }, desc: "Enchant: Phantom Step" },
  { id: 'b9', name: "Chrono Walker", rarity: 'mythic', type: 'boots', stats: { speed: 110, crit: 8, def: 25 }, desc: "Mythic: Blinkstep" },
  { id: 'b10', name: "Celestial Ascension", rarity: 'mythic', type: 'boots', stats: { speed: 120, crit: 10, def: 24 }, desc: "Mythic: Phase Walk" }
];

const focusStyles = `
#wrap {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    width: 100%;
    height: 100vh;
    height: -webkit-fill-available;
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
    position: fixed !important;
    inset: 0 !important; 
    display: flex !important;
    align-items: center !important;    
    justify-content: center !important; 
    background: rgba(12, 10, 20, 0.35) !important;
    z-index: 99999 !important;
    padding: 12px !important; /* Safe zone padding */
    box-sizing: border-box !important;
    overflow: hidden !important; 
  }

  .hud-start-modal {
    width: 100% !important;
    max-width: 340px !important;
    box-sizing: border-box !important; 
    margin: auto !important; 
    
    /* TINANGGAL ANG OVERFLOW AT MAX-HEIGHT DITO */
    overflow: hidden !important; 
    
    padding: 1.5rem !important;
    text-align: center !important;
    background: rgba(26, 20, 50, 0.45) !important;
    backdrop-filter: blur(5px) !important;
    -webkit-backdrop-filter: blur(5px) !important;
    border: 0.5px solid rgba(127, 119, 221, 0.35) !important;
    border-radius: 12px !important;
    box-shadow: 0 0 30px rgba(0,0,0,0.5) !important;
    
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important; /* Binalik sa center */
  }

  /* =========================================================================
     📱 COMPACT VIEW PARA SA MOBILE LANDSCAPE (Iwas putol, walang scroll)
     ========================================================================= */
  @media (max-height: 480px) {
    .hud-start-modal { 
      padding: 0.8rem 1rem !important; 
    }
    .hud-rune-row { 
      margin-bottom: 0.4rem !important; 
    }
    .hud-rune-row span { 
      font-size: 14px !important; 
    }
    .hud-sigil { 
      width: 28px !important; 
      height: 28px !important; 
      margin: 0 auto 0.4rem !important; 
    }
    .hud-divider, .hud-divider-sm { 
      margin: 0.4rem 0 !important; 
    }
    .hud-start-modal h2 { 
      font-size: 13px !important; 
    }
    .hud-start-modal p { 
      font-size: 10.5px !important; 
      margin: 0 0 0.5rem !important; 
      line-height: 1.3 !important; 
    }
    .hud-touch-hint, .hud-wasd-hint { 
      margin: 0 0 0.4rem !important; 
    }
    .hud-touch-zone { 
      width: 40px !important; 
      height: 40px !important; 
    }
    .hud-rune-footer {
      margin-top: 0 !important;
    }
  }

  /* corner brackets */
  .hud-corner {
    position: absolute;
    width: 22px;
    height: 22px;
    animation: hud-corner-glow 2.5s ease-in-out infinite;
  }
  .hud-corner-tl { top: -1px; left: -1px; border-top: 1.5px solid #7F77DD; border-left: 1.5px solid #7F77DD; }
  .hud-corner-tr { top: -1px; right: -1px; border-top: 1.5px solid #7F77DD; border-right: 1.5px solid #7F77DD; animation-delay: .6s; }
  .hud-corner-bl { bottom: -1px; left: -1px; border-bottom: 1.5px solid #7F77DD; border-left: 1.5px solid #7F77DD; animation-delay: 1.2s; }
  .hud-corner-br { bottom: -1px; right: -1px; border-bottom: 1.5px solid #7F77DD; border-right: 1.5px solid #7F77DD; animation-delay: 1.8s; }

  @keyframes hud-corner-glow {
    0%, 100% { opacity: .5; }
    50%      { opacity: 1; }
  }

  /* floating rune row */
  .hud-rune-row {
    display: flex;
    justify-content: center;
    gap: 10px;
    margin-bottom: 1.1rem;
    font-family: serif;
  }
  .hud-rune-row span {
    font-size: 18px;
    color: #AFA9EC;
    animation: hud-rune-drift 4s ease-in-out infinite;
  }
  .hud-rune-row span:nth-child(1) { animation-delay: 0s; }
  .hud-rune-row span:nth-child(2) { animation-delay: .5s; }
  .hud-rune-row span:nth-child(3) { animation-delay: 1s; }
  .hud-rune-row span:nth-child(4) { animation-delay: 1.5s; }
  .hud-rune-row span:nth-child(5) { animation-delay: 2s; }

  @keyframes hud-rune-drift {
    0%, 100% { opacity: .2; transform: translateY(0); }
    50%      { opacity: .5; transform: translateY(-5px); }
  }

  /* center sigil */
  .hud-sigil {
    width: 40px;
    height: 40px;
    margin: 0 auto 1.1rem;
    display: block;
  }

  /* dividers */
  .hud-divider {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 1rem 0;
    animation: hud-border-pulse 3s ease-in-out infinite;
  }
  .hud-divider span {
    flex: 1;
    height: 0.5px;
    background: #534AB7;
    opacity: .6;
  }
  .hud-divider i {
    font-size: 11px;
    color: #7F77DD;
    font-family: serif;
    font-style: normal;
  }
  .hud-divider-sm { margin: .85rem 0; }

  @keyframes hud-border-pulse {
    0%, 100% { opacity: .4; }
    50%      { opacity: .9; }
  }

  /* title */
  .hud-start-modal h2 {
    font-family: 'Cinzel', serif;
    font-size: 15px;
    font-weight: 700;
    color: #EEEDFE;
    letter-spacing: 3px;
    text-transform: uppercase;
    margin: 0;
    line-height: 1.4;
    animation: hud-shimmer 3s ease-in-out infinite;
  }

  @keyframes hud-shimmer {
    0%, 100% { opacity: .85; }
    50%      { opacity: 1; }
  }

  /* body text */
  .hud-start-modal p {
    font-family: 'Cinzel', serif;
    font-size: 11.5px;
    font-weight: 400;
    color: #AFA9EC;
    line-height: 1.85;
    letter-spacing: .5px;
    margin: 0 0 1.1rem;
  }

  /* touch drag hint (mobile) */
  .hud-touch-hint {
    display: flex;
    justify-content: center;
    margin: 0 0 1.25rem;
  }
  .hud-touch-zone {
    position: relative;
    width: 56px;
    height: 56px;
  }
  .hud-touch-ring {
    position: absolute;
    inset: 0;
    border: 1px solid #7F77DD;
    border-radius: 50%;
    opacity: 0;
    animation: hud-touch-ripple 1.8s ease-out infinite;
  }
  .hud-touch-dot {
    position: absolute;
    width: 14px;
    height: 14px;
    left: 50%;
    top: 50%;
    border-radius: 50%;
    background: #AFA9EC;
    box-shadow: 0 0 0 2px rgba(127,119,221,0.3);
    animation: hud-touch-drag 1.8s ease-in-out infinite;
  }

  @keyframes hud-touch-drag {
    0%   { transform: translate(-50%, -50%) translateX(-16px); opacity: .5; }
    40%  { transform: translate(-50%, -50%) translateX(16px); opacity: 1; }
    60%  { transform: translate(-50%, -50%) translateX(16px); opacity: 1; }
    100% { transform: translate(-50%, -50%) translateX(-16px); opacity: .5; }
  }

  @keyframes hud-touch-ripple {
    0%   { transform: scale(0.5); opacity: .6; }
    100% { transform: scale(1.6); opacity: 0; }
  }

  /* WASD key hint (desktop) */
  .hud-wasd-hint {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    margin: 0 0 1.25rem;
  }
  .hud-key-row {
    display: flex;
    gap: 4px;
  }
  .hud-key {
    width: 26px;
    height: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Cinzel', serif;
    font-size: 11px;
    font-weight: 600;
    color: #AFA9EC;
    border: 0.5px solid rgba(127,119,221,0.5);
    border-radius: 4px;
    background: rgba(83,74,183,0.12);
    animation: hud-key-press 2.4s ease-in-out infinite;
  }
  .hud-key-w { animation-delay: 0s; }
  .hud-key-a { animation-delay: .6s; }
  .hud-key-s { animation-delay: 1.2s; }
  .hud-key-d { animation-delay: 1.8s; }

  @keyframes hud-key-press {
    0%, 70%, 100% {
      background: rgba(83,74,183,0.12);
      border-color: rgba(127,119,221,0.5);
      color: #AFA9EC;
      transform: scale(1);
    }
    15% {
      background: rgba(127,119,221,0.45);
      border-color: #AFA9EC;
      color: #EEEDFE;
      transform: scale(0.92);
    }
  }

  /* footer runes */
  .hud-rune-footer {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    margin-top: .25rem;
    font-family: serif;
  }
  .hud-rune-footer span {
    width: 40px;
    height: 0.5px;
    background: #3C3489;
    opacity: .7;
  }
  .hud-rune-footer i {
    font-size: 12px;
    color: #534AB7;
    font-style: normal;
  }

  @media (max-width: 480px) {
    .hud-start-modal { padding: 1.5rem 1.25rem 1.25rem; }
    .hud-start-modal h2 { font-size: 13px; letter-spacing: 2px; }
    .hud-start-modal p { font-size: 11px; }
    .stats-toggle-btn {
      font-size: 0.5rem !important;
      padding: 2px 5px !important;
    }
  }
  .game-hud-top {
    position: absolute;
    top: 4px; 
    left: 12px;
    right: 12px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    font-family: monospace;
    font-size: 1.1rem;
    color: #fff;
    text-shadow: 0 0 6px rgba(255,255,255,0.6);
    pointer-events: none;
    z-index: 10;
  }

  .hud-score-block {
    flex-shrink: 0;
    margin-top: 2px;
  }

  /* ── Pause Button — absolutely pinned top-center, never affects SCORE/WAVE ── */
  .hud-pause-btn {
    position: absolute;
    top: 4px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 11;
    background: linear-gradient(180deg, rgba(18, 10, 45, 0.82) 0%, rgba(8, 4, 22, 0.88) 100%);
    border: none;
    border-top: 1px solid rgba(167, 139, 250, 0.55);
    border-bottom: 1px solid rgba(76, 45, 130, 0.45);
    border-left: 1px solid rgba(100, 65, 190, 0.35);
    border-right: 1px solid rgba(100, 65, 190, 0.35);
    color: rgba(196, 181, 253, 0.9);
    font-family: 'Cinzel', 'Georgia', serif;
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.18em;
    padding: 5px 16px;
    clip-path: polygon(6px 0%, 100% 0%, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0% 100%, 0% 6px);
    cursor: pointer;
    pointer-events: auto;
    box-shadow:
      0 0 10px rgba(100, 50, 200, 0.18),
      inset 0 0 12px rgba(2, 1, 12, 0.55);
    transition: all 0.18s ease;
    display: inline-flex;
    align-items: center;
    white-space: nowrap;
  }
  .hud-pause-btn:hover, .hud-pause-btn:active {
    background: linear-gradient(180deg, rgba(30, 14, 80, 0.92) 0%, rgba(12, 5, 35, 0.95) 100%);
    border-top-color: rgba(216, 180, 254, 0.75);
    color: #e9d5ff;
    box-shadow:
      0 0 16px rgba(139, 92, 246, 0.32),
      inset 0 0 12px rgba(2, 1, 12, 0.55);
  }
  .game-hud-bottom {
    position: absolute;
    bottom: 12px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: row;
    align-items: stretch;
    gap: 10px;
    font-family: monospace;
    pointer-events: none;
    z-index: 10;
  }
  /* Bars stay stacked (HP on top, XP below) inside their own column */
  .hud-bars-stack {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }
  /* ── Lv. badge — sits to the LEFT of the HP/XP bars, stretched to match
     their combined height (HP bar + gap + XP bar) for a clean, even look ── */
  .hud-level-badge {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1px;
    padding: 0 10px;
    background: rgba(4, 2, 18, 0.88);
    border: 1px solid rgba(100, 70, 200, 0.28);
    border-top-color: rgba(139, 92, 246, 0.45);
    border-bottom-color: rgba(60, 30, 120, 0.5);
    clip-path: polygon(0% 0%, calc(100% - 4px) 0%, 100% 4px, 100% 100%, 4px 100%, 0% calc(100% - 4px));
    box-shadow:
      inset 0 1px 0 rgba(139, 92, 246, 0.1),
      inset 0 0 12px rgba(2, 1, 10, 0.7);
    white-space: nowrap;
  }
  .hud-level-label {
    font-size: 0.55rem;
    color: rgba(167, 139, 250, 0.85);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-family: 'Cinzel', 'Georgia', serif;
    line-height: 1;
  }
  .hud-level-value {
    font-size: 0.85rem;
    color: #fbbf24;
    font-weight: 800;
    font-family: 'Cinzel', 'Georgia', serif;
    text-shadow: 0 0 8px rgba(251, 191, 36, 0.5);
    line-height: 1;
  }
  /* ── HP / XP Bars — BDO Center Style ── */
  .hud-bar-container {
    width: 300px;
    background: rgba(4, 2, 18, 0.88);
    border: 1px solid rgba(100, 70, 200, 0.28);
    border-top-color: rgba(139, 92, 246, 0.45);
    border-bottom-color: rgba(60, 30, 120, 0.5);
    /* Subtle angular clip on right corner — arcane seal mark */
    clip-path: polygon(0% 0%, calc(100% - 5px) 0%, 100% 5px, 100% 100%, 5px 100%, 0% calc(100% - 5px));
    position: relative;
    height: 20px;
    overflow: hidden;
    box-shadow:
      inset 0 1px 0 rgba(139, 92, 246, 0.1),
      inset 0 0 12px rgba(2, 1, 10, 0.7);
  }
  .hud-bar-fill {
    height: 100%;
    width: 100%;
    transition: width 0.12s linear;
  }

  .hud-bar-text {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    text-align: center;
    font-size: 0.68rem;
    line-height: 18px;
    color: rgba(226, 217, 243, 0.92);
    font-weight: bold;
    font-family: 'Cinzel', 'Georgia', serif;
    letter-spacing: 0.4px;
    text-shadow: 0 1px 3px rgba(0,0,0,0.9);
    white-space: nowrap;
    overflow: hidden;
  }

  /* ── Stats Toggle Button — Arcane Codex Tab ── */
  .stats-toggle-btn {
    background:
      linear-gradient(180deg, rgba(14, 9, 42, 0.97) 0%, rgba(6, 3, 20, 0.99) 100%);
    border: 1px solid rgba(139, 92, 246, 0.35);
    border-top-color: rgba(167, 139, 250, 0.55);
    color: rgba(196, 181, 253, 0.88);
    font-family: 'Cinzel', 'Georgia', serif;
    font-size: 0.65rem;
    font-weight: bold;
    letter-spacing: 0.6px;
    padding: 4px 10px;
    clip-path: polygon(4px 0%, 100% 0%, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0% 100%, 0% 4px);
    cursor: pointer;
    align-self: flex-start;
    pointer-events: auto;
    box-shadow:
      0 0 8px rgba(109, 60, 220, 0.15),
      inset 0 0 10px rgba(2, 1, 12, 0.6);
    transition: all 0.18s ease;
  }
  .stats-toggle-btn:hover {
    background: linear-gradient(180deg, rgba(30, 16, 80, 0.97) 0%, rgba(12, 6, 35, 0.99) 100%);
    border-color: rgba(192, 132, 252, 0.6);
    color: #e9d5ff;
    box-shadow: 0 0 14px rgba(139, 92, 246, 0.3);
  }

  /* ── BDO-style top-right menu icon buttons ── */
  .bdo-menu-icon-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    background: linear-gradient(180deg, rgba(14, 9, 42, 0.92) 0%, rgba(6, 3, 20, 0.96) 100%);
    border: 1px solid rgba(139, 92, 246, 0.4);
    border-top-color: rgba(167, 139, 250, 0.6);
    color: rgba(196, 181, 253, 0.9);
    font-family: 'Cinzel', 'Georgia', serif;
    font-size: 0.5rem;
    font-weight: bold;
    letter-spacing: 0.5px;
    padding: 5px 8px;
    border-radius: 3px;
    cursor: pointer;
    pointer-events: auto;
    transition: all 0.15s ease;
    box-shadow: 0 0 6px rgba(109, 60, 220, 0.15), inset 0 0 8px rgba(2, 1, 12, 0.5);
    clip-path: polygon(3px 0%, 100% 0%, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0% 100%, 0% 3px);
    min-width: 38px;
  }
  .bdo-menu-icon-btn:hover {
    background: linear-gradient(180deg, rgba(30, 16, 80, 0.95) 0%, rgba(12, 6, 35, 0.98) 100%);
    border-color: rgba(192, 132, 252, 0.7);
    color: #e9d5ff;
    box-shadow: 0 0 12px rgba(139, 92, 246, 0.3);
  }
  .bdo-menu-icon-btn:active { transform: scale(0.94); }

  /* ── RPG Stats Panel — positioned to not overlap when open ── */
  .rpg-stats-panel {
    position: absolute;
    top: 60px;
    right: 12px;
    z-index: 90;
  }
.rpg-stats-panel {
  width: 260px;
  background:
    linear-gradient(180deg, rgba(6, 3, 24, 0.4) 0%, rgba(4, 2, 16, 0.42) 100%) !important;
  backdrop-filter: blur(4px) !important;
  -webkit-backdrop-filter: blur(4px) !important;
  border: 1px solid rgba(100, 65, 190, 0.32) !important;
  border-top-color: rgba(139, 92, 246, 0.52) !important;
  clip-path: polygon(0% 0%, calc(100% - 8px) 0%, 100% 8px, 100% 100%, 8px 100%, 0% calc(100% - 8px));
  padding: 10px;
  color: #e2d9f3;
  font-family: 'Cinzel', 'Georgia', serif;
  display: flex;
  flex-direction: column;
  gap: 4px;
  box-shadow:
    0 0 12px rgba(80, 40, 180, 0.15),
    inset 0 0 20px rgba(3, 1, 14, 0.35);
  pointer-events: auto;
}
  .stats-header {
    font-size: 0.78rem;
    font-weight: bold;
    color: #e9d5ff;
    border-bottom: 1px solid rgba(109, 60, 220, 0.3);
    padding-bottom: 5px;
    margin-bottom: 2px;
    letter-spacing: 1px;
    text-transform: uppercase;
    text-shadow: 0 0 8px rgba(139, 92, 246, 0.4);
  }
  .stats-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.78rem;
  }
  .stats-label { color: #c9bfe0; letter-spacing: 0.3px; }
  .stats-value { color: #6ee7b7; font-weight: bold; text-shadow: 0 0 6px rgba(52, 211, 153, 0.4); }

  .rpg-buff-container {
    position: absolute;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    max-width: 70vw;
    gap: 14px;
    z-index: 80;
    font-family: 'Cinzel', 'Georgia', serif;
    pointer-events: none;
  }

  /* ── Rune Buff Medallion — Frieren-style arcane sigil, replaces flat badge ── */
  .rune-buff {
    position: relative;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .rune-buff-ring {
    position: absolute;
    top: 0; left: 0;
    filter: drop-shadow(0 0 5px var(--buff-color));
  }
  .rune-buff-glyphs {
    transform-origin: 20px 20px;
    animation: rune-orbit 9s linear infinite;
  }
  .rune-buff-sweep {
    transition: stroke-dashoffset 0.3s linear;
    filter: drop-shadow(0 0 3px var(--buff-color));
  }
  .rune-buff-core {
    position: relative;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: radial-gradient(circle, rgba(20,12,40,0.95) 0%, rgba(8,4,20,0.98) 75%);
    box-shadow: 0 0 8px var(--buff-color), inset 0 0 6px rgba(0,0,0,0.6);
    animation: rune-core-pulse 2.4s ease-in-out infinite;
  }
  .rune-buff-timer {
    position: absolute;
    bottom: -13px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 0.62rem;
    font-weight: bold;
    letter-spacing: 0.3px;
    text-shadow: 0 0 6px currentColor, 0 1px 2px rgba(0,0,0,0.9);
    white-space: nowrap;
  }
  .rune-buff-label {
    position: absolute;
    top: -15px;
    left: 50%;
    transform: translateX(-50%) scale(0.62);
    transform-origin: top center;
    font-size: 0.62rem;
    font-weight: bold;
    letter-spacing: 0.6px;
    color: #d8cdf0;
    text-shadow: 0 0 6px rgba(167, 139, 250, 0.7), 0 1px 2px rgba(0,0,0,0.9);
    white-space: nowrap;
    opacity: 0.9;
  }
  .rune-buff-low .rune-buff-core { animation: rune-core-pulse-urgent 0.6s ease-in-out infinite; }
  .rune-buff-low .rune-buff-timer { animation: rune-timer-flash 0.6s ease-in-out infinite; }

  @keyframes rune-orbit {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes rune-core-pulse {
    0%, 100% { box-shadow: 0 0 6px var(--buff-color), inset 0 0 6px rgba(0,0,0,0.6); }
    50% { box-shadow: 0 0 12px var(--buff-color), inset 0 0 6px rgba(0,0,0,0.6); }
  }
  @keyframes rune-core-pulse-urgent {
    0%, 100% { box-shadow: 0 0 6px var(--buff-color), inset 0 0 6px rgba(0,0,0,0.6); transform: scale(1); }
    50% { box-shadow: 0 0 16px var(--buff-color), inset 0 0 6px rgba(0,0,0,0.6); transform: scale(1.08); }
  }
  @keyframes rune-timer-flash {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }


/* ── Inventory & Skill Tree Toggle Buttons — Arcane Tome Tabs ── */
.inventory-toggle-btn, .skill-tree-toggle-btn {
  background:
    linear-gradient(180deg, rgba(10, 6, 32, 0.98) 0%, rgba(5, 3, 18, 0.99) 100%);
  border: 1px solid rgba(180, 140, 40, 0.35);
  border-top-color: rgba(234, 179, 8, 0.55);
  color: rgba(253, 230, 138, 0.88);
  font-family: 'Cinzel', 'Georgia', serif;
  font-size: 0.68rem;
  font-weight: bold;
  letter-spacing: 0.5px;
  padding: 0 12px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  clip-path: polygon(4px 0%, 100% 0%, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0% 100%, 0% 4px);
  cursor: pointer;
  pointer-events: auto;
  box-shadow:
    0 0 8px rgba(180, 130, 0, 0.1),
    inset 0 0 10px rgba(2, 1, 10, 0.6);
  transition: all 0.18s ease;
  box-sizing: border-box;
}

.skill-tree-toggle-btn {
  background:
    linear-gradient(180deg, rgba(16, 8, 48, 0.98) 0%, rgba(7, 3, 22, 0.99) 100%);
  border-color: rgba(100, 65, 190, 0.35);
  border-top-color: rgba(139, 92, 246, 0.6);
  color: rgba(196, 181, 253, 0.9);
  box-shadow:
    0 0 8px rgba(100, 50, 200, 0.15),
    inset 0 0 10px rgba(2, 1, 12, 0.6);
}

  .skill-tree-toggle-btn:hover {
    background: linear-gradient(180deg, rgba(30, 14, 80, 0.98) 0%, rgba(12, 5, 35, 0.99) 100%);
    border-color: rgba(167, 139, 250, 0.65);
    color: #e9d5ff;
    box-shadow: 0 0 14px rgba(109, 60, 220, 0.28);
    transform: translateY(-1px);
  }

/* ── Skill Tree Container — Grimoire Spellbook Panel ── */
.skill-tree-container {
  position: absolute;
  bottom: 46px;
  right: 12px;
  background:
    linear-gradient(180deg, rgba(6, 3, 24, 0.4) 0%, rgba(4, 2, 16, 0.42) 100%) !important;
  backdrop-filter: blur(4px) !important;
  -webkit-backdrop-filter: blur(4px) !important;
  border: 1px solid rgba(100, 65, 190, 0.32) !important;
  border-top-color: rgba(139, 92, 246, 0.5) !important;
  clip-path: polygon(0% 0%, calc(100% - 10px) 0%, 100% 10px, 100% 100%, 10px 100%, 0% calc(100% - 10px));
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  z-index: 50;
  font-family: 'Cinzel', 'Georgia', serif;
  color: #e2d9f3;
  width: 250px;
  max-height: 480px;
  overflow-y: auto;
  box-shadow:
    0 0 16px rgba(80, 40, 180, 0.18),
    inset 0 0 24px rgba(3, 1, 14, 0.35);
  touch-action: pan-y !important;
}

.skill-tree-container .skill-row-btn {
  touch-action: pan-y !important;
}

  .skill-tree-title-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(100, 60, 200, 0.25);
    padding-bottom: 6px;
    margin-bottom: 4px;
  }
  .skill-tree-title {
    font-size: 0.78rem;
    font-weight: bold;
    color: #e9d5ff;
    letter-spacing: 1px;
    text-transform: uppercase;
    text-shadow: 0 0 8px rgba(139, 92, 246, 0.4);
  }
  .skill-tree-close-x {
    background: transparent;
    border: 1px solid rgba(244, 63, 94, 0.3);
    color: rgba(248, 113, 113, 0.7);
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: bold;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    clip-path: polygon(3px 0%, 100% 0%, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0% 100%, 0% 3px);
    transition: all 0.15s;
  }
  .skill-tree-close-x:hover {
    color: #fca5a5;
    background: rgba(239, 68, 68, 0.12);
    border-color: rgba(244, 63, 94, 0.6);
  }
  /* ── Skill Row Buttons ── */
  .skill-row-btn {
    background:
      linear-gradient(135deg, rgba(18, 10, 50, 0.97) 0%, rgba(6, 3, 18, 0.98) 100%);
    border: 1px solid rgba(80, 40, 160, 0.4);
    border-top-color: rgba(109, 60, 220, 0.5);
    clip-path: polygon(4px 0%, 100% 0%, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0% 100%, 0% 4px);
    padding: 7px 8px;
    color: #e1dcf5;
    font-size: 0.76rem;
    font-family: 'Cinzel', 'Georgia', serif;
    text-align: left;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition: all 0.18s;
    position: relative;
  }
  .skill-row-btn:hover:not(:disabled) {
    border-color: rgba(167, 139, 250, 0.6);
    border-top-color: rgba(196, 181, 253, 0.75);
    background: linear-gradient(135deg, rgba(36, 16, 90, 0.97) 0%, rgba(12, 5, 32, 0.98) 100%);
    color: #f5f0ff;
    box-shadow: 0 0 8px rgba(109, 60, 220, 0.2);
  }
  .skill-row-btn:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
  .skill-row-btn.learned {
    border-color: rgba(16, 185, 129, 0.4);
    border-top-color: rgba(52, 211, 153, 0.55);
    background: linear-gradient(135deg, rgba(4, 50, 35, 0.95) 0%, rgba(2, 20, 14, 0.97) 100%);
    color: #6ee7b7;
  }
  .skill-row-btn.disabled-toggle {
    border-color: rgba(244, 63, 94, 0.4);
    border-top-color: rgba(251, 100, 120, 0.55);
    background: linear-gradient(135deg, rgba(50, 4, 18, 0.97) 0%, rgba(18, 1, 6, 0.98) 100%);
    color: #fca5a5;
  }
  .skill-cd-text {
    font-size: 0.66rem;
    color: #fde68a;
    font-weight: bold;
    letter-spacing: 0.3px;
  }
  .skill-node-desc {
    font-size: 0.7rem;
    color: #cdc3e8;
    line-height: 1.45;
    background: rgba(3, 1, 14, 0.7);
    padding: 5px 7px;
    border-left: 2px solid rgba(139, 92, 246, 0.55);
    margin-top: -2px;
    margin-bottom: 4px;
    letter-spacing: 0.2px;
  }

  /* MOBILE VIEW ADJUSTMENTS */
@media (max-width: 840px) {

.bdo-panel {
    transform: scale(0.65) !important; /* Dati 0.75, mas pinaliit pa natin */
    transform-origin: top right !important; /* Siguradong papunta sa kanan */
    top: 40px !important; /* Mas idinikit sa ilalim ng menu buttons */
    right: 15px !important; /* Inilinya sa kanan */
    left: auto !important;
    bottom: auto !important;
  }

  /* Pinaliit ang specific na lapad para hindi sakop ang buong screen */
  .bdo-stats-panel {
    width: 240px !important; /* Dati ay 280px */
  }

  .bdo-skill-tree-panel {
    width: 260px !important; /* Dati ay 320px kaya umaabot sa gitna */
  }

  .bdo-inventory-panel {
    width: 240px !important;
  }

.bdo-top-menu-btns {
    gap: 4px !important; /* Mas pinadikit ang agwat ng tatlong buttons */
  }

  .bdo-menu-icon-btn {
    padding: 3px 6px !important; /* Pinaliit ang padding para numipis ang button */
    font-size: 0.5rem !important; /* Pinaliit ang text */
    border-width: 1px !important; /* Pinanipis ang border */
    min-height: 20px !important; /* Mas mababang height */
  }

  .bdo-menu-icon-btn svg {
    width: 10px !important; /* Pinaliit ang icon (mula 14px) */
    height: 10px !important; 
    margin-right: 2px !important; /* Pinaliit ang agwat ng icon sa text */
  }

  /* NOTE: width/padding for .skill-tree-container, and the font-size/padding
     for .skill-tree-title / .skill-row-btn / .skill-node-desc, are all set
     once in the consolidated mobile panel rules further down (grouped with
     .rpg-stats-panel / .coop-party-panel) — this rule only carries the
     properties unique to the skill tree panel's position & shape. */
.skill-tree-container {
    max-height: 50vh !important;
    max-height: 50dvh !important; /* dvh = real visible viewport, avoids overflow on iOS Safari's toolbar */
    bottom: 80px !important;
    right: 12px !important;
    left: auto !important;
    transform: none !important;
    clip-path: polygon(0% 0%, calc(100% - 8px) 0%, 100% 8px, 100% 100%, 8px 100%, 0% calc(100% - 8px)) !important;
  }

  .skill-row-btn {
    clip-path: polygon(3px 0%, 100% 0%, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0% 100%, 0% 3px) !important;
  }
}

/* ELEMENTAL SIGILS CONTAINER — Frieren Arcane Grimoire Style */
/* BDO-style radial skill layout — sigils + ultimates orbit around dash */
.elemental-sigils-container {
  position: absolute;
  /* center of the orbital cluster, bottom-right */
  right: 90px;
  bottom: 90px;
  width: 0;
  height: 0;
  background: none;
  padding: 5px;
  border: none;
  box-shadow: none;
  z-index: 45;
  pointer-events: none;
  outline: none;
}
.elemental-sigils-container::before,
.elemental-sigils-container::after { display: none; }
/* ── Dash Button — BDO-style center sword button ── */
  .dash-btn-container {
    position: absolute;
    bottom: 60px;
    right: 60px;
    width: 104px;
    height: 104px;
    background: radial-gradient(circle at 50% 35%, rgba(20, 10, 55, 0.97) 0%, rgba(4, 2, 18, 0.99) 100%);
    border: 3px solid rgba(94, 234, 212, 0.5);
    border-top-color: rgba(94, 234, 212, 0.8);
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 46;
    box-shadow:
      0 0 24px rgba(45, 212, 191, 0.28),
      0 0 50px rgba(20, 150, 140, 0.14),
      inset 0 0 18px rgba(2, 30, 28, 0.7),
      inset 0 1px 0 rgba(94, 234, 212, 0.14);
    user-select: none;
    touch-action: none;
    transition: transform 0.12s ease, box-shadow 0.2s ease;
  }
  /* Outer arcane ring */
  .dash-btn-container::before {
    content: '';
    position: absolute;
    inset: -8px;
    border-radius: 50%;
    border: 1px solid rgba(45, 212, 191, 0.18);
    pointer-events: none;
  }
  .dash-btn-container:active {
    transform: scale(0.88);
    box-shadow:
      0 0 6px rgba(45, 212, 191, 0.2),
      inset 0 0 18px rgba(0, 0, 0, 0.8);
    background: radial-gradient(circle, rgba(3, 20, 20, 0.98) 0%, rgba(2, 1, 10, 0.99) 100%);
  }

  .dash-icon {
    font-size: 0;
    line-height: 1;
    margin-top: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    filter: drop-shadow(0 0 8px rgba(94, 234, 212, 0.65));
  }

  .dash-label {
    font-size: 0.6rem;
    color: rgba(153, 246, 228, 0.85);
    font-family: 'Cinzel', 'Georgia', serif;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    margin-top: 3px;
    text-shadow: 0 0 6px rgba(45, 212, 191, 0.5);
  }

  .dash-cd-overlay {
    position: absolute;
    inset: -1px;
    background: rgba(1, 0, 10, 0.85);
    border-radius: 50%;
    display: none;
    align-items: center;
    justify-content: center;
    color: #c4b5fd;
    font-size: 1.4rem;
    font-weight: bold;
    font-family: 'Cinzel', 'Georgia', serif;
    letter-spacing: 0.3px;
    text-shadow: 0 0 8px rgba(167, 139, 250, 0.6);
    border: 1px solid rgba(45, 212, 191, 0.15);
  }

  /* 📱 MOBILE VIEW — kasama na ang landscape big-phones (hal. iPhone Pro Max @932px),
     para tugma ito sa JS isMobileLayout breakpoint at hindi mag-mismatch ang
     button size (CSS) laban sa orbit radius/position (JS). */
  @media (max-width: 840px), (max-width: 932px) and (orientation: landscape) {
    .dash-btn-container {
      width: 60px !important;      /* Dati: 88px */
      height: 60px !important;     /* Dati: 88px */
      bottom: 50px !important;     /* Mas ibinaba */
      right: 50px !important;      /* Mas inilapit sa gilid */
    }
    .dash-label {
      font-size: 0.4rem !important; 
      margin-top: 1px !important;
    }
    .dash-cd-overlay { font-size: 0.9rem !important; }
  }

  /* ── Ultimate Spell Buttons (left-side diagonal stack) ── */
  .bdo-ult-btn {
    position: absolute;
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    user-select: none;
    touch-action: none;
    transition: transform 0.12s ease, box-shadow 0.18s ease;
    pointer-events: auto;
    z-index: 45;
  }
  .bdo-ult-btn:active { transform: scale(0.9); }
  .bdo-ult-btn:hover  { transform: scale(1.07); }

  .bdo-ult-collapse {
    width: 72px; height: 72px;
    background: radial-gradient(circle, #1a0630 0%, #070010 100%);
    border: 3px solid #7c3aed;
    border-top-color: #a78bfa;
    box-shadow: 0 0 18px rgba(139, 92, 246, 0.38), inset 0 0 16px rgba(2,0,12,0.8);
  }
  .bdo-ult-instinct {
    width: 72px; height: 72px;
    background: radial-gradient(circle, #4c0519 0%, #0c0004 100%);
    border: 3px solid #be185d;
    border-top-color: #f472b6;
    box-shadow: 0 0 18px rgba(244,114,182,0.32), inset 0 0 16px rgba(12,0,4,0.8);
  }
  .bdo-ult-resurrect {
    width: 72px; height: 72px;
    background: radial-gradient(circle, #064e3b 0%, #022c22 100%);
    border: 3px solid #059669;
    border-top-color: #34d399;
    box-shadow: 0 0 18px rgba(52, 211, 153, 0.32), inset 0 0 16px rgba(2,12,8,0.8);
  }
  .bdo-ult-label {
    font-size: 0.58rem;
    font-family: 'Cinzel', 'Georgia', serif;
    font-weight: 700;
    letter-spacing: 0.4px;
    text-transform: uppercase;
    margin-top: 3px;
    white-space: nowrap;
  }
  .bdo-ult-key {
    position: absolute;
    top: 5px; left: 5px;
    font-size: 0.56rem;
    color: rgba(255,255,255,0.45);
    font-family: monospace;
    font-weight: bold;
    line-height: 1;
  }
  .bdo-ult-cd {
    position: absolute;
    inset: -2px;
    border-radius: 50%;
    display: none;
    align-items: center;
    justify-content: center;
    background: rgba(2, 1, 12, 0.78);
    font-size: 1.3rem;
    font-weight: bold;
    font-family: 'Cinzel', 'Georgia', serif;
    letter-spacing: 0.3px;
    z-index: 2;
  }
  .bdo-ult-btn svg { filter: drop-shadow(0 0 5px currentColor); }

  /* 📱 Mobile — ultimates shrink so the left stack fits on small screens.
     Kasama na rin ang landscape big-phones (932px), tugma sa JS isMobileLayout. */
  @media (max-width: 840px), (max-width: 932px) and (orientation: landscape) {
    .bdo-ult-collapse,
    .bdo-ult-instinct,
    .bdo-ult-resurrect {
      width: 46px !important;      /* Dati: 70px */
      height: 46px !important;     /* Dati: 70px */
      border-width: 1.5px !important;
    }
    .bdo-ult-label { font-size: 0.38rem !important; margin-top: 1px !important; }
    .bdo-ult-key { font-size: 0.4rem !important; top: 2px !important; left: 2px !important; }
    .bdo-ult-cd { font-size: 0.8rem !important; }
}

  /* Orbital ring hub (the invisible anchor that positions everything) */
  .bdo-skill-hub {
    position: absolute;
    width: 0; height: 0;
    pointer-events: none;
    z-index: 44;
  }

  /* ── Sigil Button — BDO-style circular orbital ── */
  .sigil-btn {
    position: absolute;
    width: 54px;
    height: 54px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border: 2px solid rgba(139, 92, 246, 0.55);
    background: radial-gradient(circle at 50% 30%, rgba(30, 18, 70, 0.92) 0%, rgba(5, 3, 20, 0.98) 100%);
    transition: all 0.18s ease;
    box-shadow:
      inset 0 0 10px rgba(0, 0, 0, 0.9),
      0 0 10px rgba(99, 60, 200, 0.25),
      0 0 0 1px rgba(99,60,200,0.1);
    pointer-events: auto;
    transform: translate(-50%, -50%);
  }
  @media (max-width: 840px), (max-width: 932px) and (orientation: landscape) {
    .sigil-btn { 
      width: 34px !important;      /* Dati: 44px */
      height: 34px !important;     /* Dati: 44px */
    }
    .sigil-cd-overlay { font-size: 0.6rem !important; }
  }
  .sigil-btn svg {
    filter: drop-shadow(0 0 5px currentColor);
  }
  .sigil-btn::before {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: 50%;
    border: 1px solid rgba(139, 92, 246, 0.18);
    pointer-events: none;
  }
  .sigil-btn:hover { transform: translate(-50%, -50%) scale(1.12); }
  .sigil-btn:active { transform: translate(-50%, -50%) scale(0.92); }
  /* Rune-corner dots */
  .sigil-btn::after { display: none; }

  /* Element-specific sigil colors — ancient seal palette */
  .sigil-fire {
    color: #f87171;
    border-color: rgba(239, 100, 68, 0.55);
  }
  .sigil-fire::before {
    background: radial-gradient(ellipse at center, rgba(239, 68, 68, 0.18) 0%, transparent 70%);
  }
  .sigil-water {
    color: #60a5fa;
    border-color: rgba(59, 130, 246, 0.55);
  }
  .sigil-water::before {
    background: radial-gradient(ellipse at center, rgba(59, 130, 246, 0.18) 0%, transparent 70%);
  }
  .sigil-earth {
    color: #f59e0b;
    border-color: rgba(180, 130, 40, 0.55);
  }
  .sigil-earth::before {
    background: radial-gradient(ellipse at center, rgba(245, 158, 11, 0.15) 0%, transparent 70%);
  }
  .sigil-lightning {
    color: #c084fc;
    border-color: rgba(192, 132, 252, 0.6);
  }
  .sigil-lightning::before {
    background: radial-gradient(ellipse at center, rgba(192, 132, 252, 0.2) 0%, transparent 70%);
  }
  .sigil-ice {
    color: #38bdf8;
    border-color: rgba(56, 189, 248, 0.55);
  }
  .sigil-ice::before {
    background: radial-gradient(ellipse at center, rgba(56, 189, 248, 0.16) 0%, transparent 70%);
  }
  .sigil-nature {
    color: #4ade80;
    border-color: rgba(34, 197, 94, 0.55);
  }
  .sigil-nature::before {
    background: radial-gradient(ellipse at center, rgba(34, 197, 94, 0.15) 0%, transparent 70%);
  }

  /* Cooldown overlay - circular radial sweep */
  .sigil-cd-overlay {
    position: absolute;
    inset: -2px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #c4b5fd;
    font-weight: bold;
    font-family: 'Cinzel', 'Georgia', serif;
    font-size: 0.75rem;
    letter-spacing: 0.3px;
    text-shadow: 0 0 8px rgba(167, 139, 250, 0.8);
    background: rgba(2, 1, 12, 0.72);
    border: 1px solid rgba(139, 92, 246, 0.25);
    clip-path: none;
    z-index: 2;
  }

  /* Tooltip title */
  .sigil-title {
    font-size: 0.45rem;
    position: absolute;
    bottom: -16px;
    left: 50%;
    transform: translateX(-50%);
    color: #e2d9f3;
    white-space: nowrap;
    font-family: 'Cinzel', 'Georgia', serif;
    text-align: center;
    background: rgba(4, 2, 18, 0.92);
    border: 1px solid rgba(139, 92, 246, 0.3);
    padding: 1px 5px;
    border-radius: 2px;
    letter-spacing: 0.4px;
    opacity: 0;
    transition: opacity 0.2s;
    pointer-events: none;
    z-index: 100;
  }
  .sigil-btn:hover .sigil-title { opacity: 1; }

  /* ── Circular Skill-Timer Ring (sigils + ultimates) — same language as the active-buff rune rings ── */
  .skill-cd-ring-svg {
    position: absolute;
    inset: -5px;
    width: calc(100% + 10px);
    height: calc(100% + 10px);
    pointer-events: none;
    z-index: 3;
  }
  .skill-cd-ring-track { opacity: 0.9; }
  .skill-cd-ring-sweep {
    transition: stroke-dashoffset 0.3s linear;
  }

  /* ── Ultimate "READY" Magic Circle — Frieren-style layered arcane sigil ── */
  .ult-ready-fx {
    position: absolute;
    inset: -18px;
    border-radius: 50%;
    pointer-events: none;
    z-index: 2;
  }
  .ult-ready-glow {
    position: absolute;
    inset: 8px;
    border-radius: 50%;
    box-shadow: 0 0 18px 3px var(--fx-color), inset 0 0 12px var(--fx-color);
    animation: urc-glow-pulse 2.4s ease-in-out infinite;
  }
  @keyframes urc-glow-pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.6; } }

  /* Layered rune circle — same skeleton for all 3 ultimates, only color/speed differs */
  .ult-ready-circle-svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
    filter: drop-shadow(0 0 3px var(--fx-color));
  }
  .urc-outer-ring, .urc-mid-ring, .urc-inner-ring {
    transform-box: fill-box;
    transform-origin: 50% 50%;
  }
  .urc-outer-ring { animation: urc-spin-cw 16s linear infinite; }
  .urc-mid-ring   { animation: urc-spin-ccw 22s linear infinite; }
  .urc-inner-ring { animation: urc-spin-ccw 9s linear infinite; }
  @keyframes urc-spin-cw  { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes urc-spin-ccw { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
  .urc-core-dot { animation: urc-core-pulse 1.8s ease-in-out infinite; }
  @keyframes urc-core-pulse {
    0%, 100% { opacity: 0.5; r: 2; }
    50%      { opacity: 1;   r: 2.8; }
  }

  /* Rising smoke / dust wisps — replaces the old orbiting dots; the elemental "exhaust" once ready */
  .ult-smoke-container {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  .ult-smoke-wisp {
    position: absolute;
    top: 50%; left: 50%;
    width: 15px; height: 15px;
    border-radius: 46% 54% 64% 36% / 55% 45% 58% 42%;
    background: radial-gradient(circle at 40% 38%, rgba(255,255,255,0.4) 0%, rgba(var(--fx-rgb), 0.45) 32%, rgba(var(--fx-rgb), 0.14) 62%, rgba(var(--fx-rgb), 0) 80%);
    opacity: 0;
    transform: translate(var(--p-x), var(--p-y)) scale(0.45);
    animation: ult-smoke-rise 3.4s ease-out infinite;
    animation-delay: var(--p-delay);
  }
  @keyframes ult-smoke-rise {
    0%   { opacity: 0;    transform: translate(var(--p-x), var(--p-y)) scale(0.4) rotate(0deg); }
    14%  { opacity: 0.5; }
    55%  { opacity: 0.3;  transform: translate(calc(var(--p-x) + var(--p-sway)), calc(var(--p-y) - 26px)) scale(1.15) rotate(20deg); }
    100% { opacity: 0;    transform: translate(calc(var(--p-x) - var(--p-sway)), calc(var(--p-y) - 48px)) scale(1.75) rotate(-15deg); }
  }

  /* AURA — Arcane Collapse: slow, large, ethereal violet smoke that drifts gently */
  .ult-ready-aura .ult-smoke-container { animation: urc-spin-ccw 24s linear infinite; }
  .ult-ready-aura .ult-smoke-wisp {
    width: 17px; height: 17px;
    filter: blur(3.5px);
    animation-duration: 4.6s;
  }

  /* DUST EMBER — Arcane Instinct: small, quick, sparkly pink motes of dust */
  .ult-ready-ember .ult-smoke-container { animation: urc-spin-cw 14s linear infinite; }
  .ult-ready-ember .ult-smoke-wisp {
    width: 10px; height: 10px;
    filter: blur(1.6px);
    animation-duration: 2.1s;
    animation-timing-function: ease-in-out;
  }

  /* APOY / FIRE — Arcane Resurrection: warm-cored, turbulent smoke with a hot white-gold center */
  .ult-ready-fire .ult-smoke-container { animation: urc-spin-ccw 10s linear infinite; }
  .ult-ready-fire .ult-smoke-wisp {
    width: 14px; height: 14px;
    filter: blur(2.4px);
    animation-duration: 1.6s;
    background: radial-gradient(circle at 42% 36%, rgba(255,250,225,0.6) 0%, rgba(var(--fx-rgb), 0.55) 30%, rgba(40,30,15,0.22) 62%, rgba(var(--fx-rgb), 0) 82%);
  }

  @media (max-width: 840px) {
    .ult-ready-fx { inset: -12px; }
  }

.mmo-hotbar-container {
  position: absolute;
  bottom: 14px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  /* Deep arcane tome panel */
  background:
    linear-gradient(180deg, rgba(6, 3, 25, 0.98) 0%, rgba(4, 2, 18, 0.99) 100%);
  border: 1px solid rgba(139, 92, 246, 0.28);
  border-top-color: rgba(167, 139, 250, 0.45);
  padding: 8px 16px;
  border-radius: 3px;
  box-shadow:
    0 0 0 1px rgba(80, 40, 160, 0.10),
    0 0 20px rgba(109, 60, 220, 0.18),
    0 0 50px rgba(80, 30, 160, 0.10),
    inset 0 1px 0 rgba(167, 139, 250, 0.08),
    inset 0 0 30px rgba(4, 2, 16, 0.8);
  z-index: 55;
  font-family: 'Cinzel', 'Georgia', serif;
  backdrop-filter: blur(8px);
  max-width: 65vw;
  overflow-x: auto;
  white-space: nowrap;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* ADDED: Para itago ang visual scrollbar sa Chrome/Safari pero scrollable pa rin */
.mmo-hotbar-container::-webkit-scrollbar {
  display: none;
}

  /* ADD THIS INSIDE focusStyles */
  .hp-vignette {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 5; /* Above canvas, below UI */
    transition: opacity 0.3s ease;
    opacity: 0;
  }
  .hp-vignette.warning {
    opacity: 1;
    animation: pulse-warning 1.5s infinite alternate;
  }
  .hp-vignette.danger {
    opacity: 1;
    animation: pulse-danger 0.5s infinite alternate;
  }
  @keyframes pulse-warning {
    0% { box-shadow: inset 0 0 50px rgba(245, 158, 11, 0.1); }
    100% { box-shadow: inset 0 0 120px rgba(245, 158, 11, 0.45); }
  }
  @keyframes pulse-danger {
    0% { 
      box-shadow: inset 0 0 80px rgba(239, 68, 68, 0.3); 
      border: 2px solid rgba(239, 68, 68, 0); 
      background: rgba(239, 68, 68, 0); 
    }
    100% { 
      box-shadow: inset 0 0 180px rgba(239, 68, 68, 0.7); 
      border: 4px solid rgba(239, 68, 68, 0.5); 
      background: rgba(239, 68, 68, 0.1); 
    }
  }

@media (max-width: 840px) {
  /* HOTBAR: Hidden (moved to skill tree auto) */
  .mmo-hotbar-container {
    display: none !important;
  }

  /* Buffs above HP bar, smaller gap on mobile */
  .rpg-buff-container {
    bottom: 72px !important;
    gap: 10px !important;
  }

  /* HP bars narrower on mobile */
  .hud-bar-container {
    width: 200px !important;
  }

  .hud-level-badge {
    padding: 3px 7px !important;
  }
  .hud-level-label {
    font-size: 0.52rem !important;
  }
  .hud-level-value {
    font-size: 0.78rem !important;
  }
}


  /* ── MMO Hotbar Slot — Frieren Ancient Seal Style ── */
  .mmo-hotbar-slot {
    position: relative;
    width: 58px;
    height: 58px;
    background:
      radial-gradient(circle at 50% 20%, rgba(22, 12, 55, 0.95) 0%, rgba(5, 3, 18, 0.98) 100%);
    border: 1px solid rgba(91, 33, 182, 0.45);
    border-top-color: rgba(139, 92, 246, 0.6);
    border-radius: 2px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    user-select: none;
    transition: all 0.18s ease;
    clip-path: polygon(4px 0%, 100% 0%, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0% 100%, 0% 4px);
    box-shadow: inset 0 0 10px rgba(0,0,0,0.7);
  }
  .mmo-hotbar-slot:hover:not(.not-learned) {
    border-color: rgba(192, 132, 252, 0.8);
    border-top-color: rgba(216, 180, 254, 0.9);
    background: radial-gradient(circle at 50% 20%, rgba(45, 20, 100, 0.95) 0%, rgba(12, 6, 35, 0.98) 100%);
    transform: translateY(-3px);
    box-shadow:
      0 0 12px rgba(139, 92, 246, 0.35),
      inset 0 0 12px rgba(80, 30, 180, 0.15);
  }
  .mmo-hotbar-slot.disabled-toggle {
    border-color: rgba(244, 63, 94, 0.5);
    border-top-color: rgba(251, 100, 120, 0.7);
    background: radial-gradient(circle, rgba(49, 4, 19, 0.97) 0%, rgba(10, 2, 8, 0.99) 100%);
  }
  .mmo-hotbar-slot.learned {
    border-color: rgba(16, 185, 129, 0.45);
    border-top-color: rgba(52, 211, 153, 0.6);
  }
  .mmo-hotbar-slot.not-learned {
    border-color: rgba(55, 65, 81, 0.35);
    background: rgba(8, 6, 20, 0.9);
    opacity: 0.38;
    cursor: not-allowed;
  }
  
  /* ── Ultimate Slot — Arcane Sigil Circle ── */
  .mmo-hotbar-ult-slot {
    position: relative;
    width: 72px;
    height: 72px;
    background:
      radial-gradient(circle at 50% 35%, rgba(55, 15, 110, 0.92) 0%, rgba(8, 3, 28, 0.98) 100%);
    border: 1px solid rgba(192, 100, 240, 0.5);
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    user-select: none;
    transition: all 0.22s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    box-shadow:
      0 0 16px rgba(167, 70, 220, 0.35),
      0 0 32px rgba(130, 50, 200, 0.15),
      inset 0 0 14px rgba(120, 40, 200, 0.25),
      inset 0 1px 0 rgba(216, 180, 254, 0.12);
    margin-left: 8px;
  }
  /* Outer arcane ring */
  .mmo-hotbar-ult-slot::before {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    border: 1px solid rgba(167, 139, 250, 0.15);
    pointer-events: none;
  }
  .mmo-hotbar-ult-slot:hover:not(.not-learned) {
    border-color: rgba(216, 120, 255, 0.75);
    box-shadow:
      0 0 24px rgba(200, 100, 255, 0.55),
      0 0 50px rgba(160, 60, 230, 0.25),
      inset 0 0 18px rgba(150, 50, 220, 0.4);
    transform: scale(1.09) translateY(-4px);
  }
  .mmo-hotbar-ult-slot.not-learned {
    border-color: rgba(75, 85, 99, 0.35);
    background: rgba(8, 6, 20, 0.9);
    box-shadow: none;
    opacity: 0.32;
    cursor: not-allowed;
  }
  
  /* ── Hotbar sub-elements ── */
  .hotbar-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #c4b5fd;
    margin-bottom: -1px;
    filter: drop-shadow(0 0 4px rgba(139, 92, 246, 0.45));
  }
  .mmo-hotbar-ult-slot .hotbar-icon {
    color: #e9d5ff;
    filter: drop-shadow(0 0 8px rgba(192, 100, 250, 0.7));
  }
  .hotbar-name {
    font-size: 0.48rem;
    color: #b8a8d8;
    text-align: center;
    max-width: 54px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-family: 'Cinzel', 'Georgia', serif;
    letter-spacing: 0.3px;
  }
  .mmo-hotbar-ult-slot .hotbar-name {
    font-size: 0.46rem;
    color: #d4b8f0;
    font-weight: bold;
    max-width: 64px;
    letter-spacing: 0.5px;
  }
  .hotbar-key-bind {
    position: absolute;
    top: 3px;
    left: 4px;
    font-size: 0.5rem;
    color: rgba(251, 191, 36, 0.75);
    font-weight: bold;
    font-family: 'Cinzel', 'Georgia', serif;
    letter-spacing: 0.3px;
  }
  .mmo-hotbar-ult-slot .hotbar-key-bind {
    top: 5px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 0.58rem;
    color: rgba(196, 181, 253, 0.7);
  }
  .hotbar-status-dot {
    position: absolute;
    bottom: 3px;
    right: 4px;
    font-size: 0.48rem;
    font-weight: bold;
  }
  .hotbar-status-dot.on  { color: rgba(52, 211, 153, 0.85); text-shadow: 0 0 5px rgba(52,211,153,0.5); }
  .hotbar-status-dot.off { color: rgba(244, 63, 94, 0.8);   text-shadow: 0 0 5px rgba(244,63,94,0.4); }

  /* Cooldown overlay */
  .hotbar-cooldown-overlay {
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    background: rgba(1, 0, 10, 0.8);
    border-radius: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #c4b5fd;
    font-size: 1rem;
    font-weight: bold;
    font-family: 'Cinzel', 'Georgia', serif;
    pointer-events: none;
    letter-spacing: 0.5px;
    text-shadow: 0 0 8px rgba(167, 139, 250, 0.7);
    clip-path: polygon(4px 0%, 100% 0%, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0% 100%, 0% 4px);
  }
  .mmo-hotbar-ult-slot .hotbar-cooldown-overlay {
    border-radius: 50%;
    font-size: 1.25rem;
    color: #ddd6fe;
    text-shadow: 0 0 10px rgba(192, 132, 252, 0.8);
    clip-path: none;
  }

  .game-hud-right-group {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 1px;
    background: transparent;
    padding: 2px 6px 4px 6px;
    border-radius: 6px;
  }

  .hud-menu-title {
    font-family: 'Cinzel Decorative', serif !important;
    font-size: 1.15rem;
    font-weight: 900;
    line-height: 1.05;
    text-align: right;
    margin-top: 0px;
    -webkit-font-smoothing: antialiased;
  }
  
  .hud-menu-title span.arc {
    background: linear-gradient(110deg, #a78bfa 42%, #ffffff 50%, #a78bfa 58%);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 5px #8b5cf6) drop-shadow(0 0 15px rgba(139, 92, 246, 0.8));
    display: inline-block;
    animation: hudGlassShine 4s ease-in-out infinite;
  }
  
  .hud-menu-title span.sur {
    background: linear-gradient(110deg, #fbbf24 42%, #ffffff 50%, #fbbf24 58%);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 5px #f59e0b) drop-shadow(0 0 15px rgba(251, 191, 36, 0.8));
    display: inline-block;
    animation: hudGlassShine 4s ease-in-out infinite;
    animation-delay: 0.15s;
  }
  
  .hud-menu-sub {
    font-family: 'Georgia', serif;
    font-size: 0.44rem;
    letter-spacing: 0.285em;
    margin-right: -0.285em;
    color: #a78bfa;
    text-transform: uppercase;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
    opacity: 0.9;
    text-align: right;
    display: block;
    width: 100%;
  }

  @keyframes hudGlassShine {
    0% { background-position: -100% center; }
    18% { background-position: 100% center; }
    100% { background-position: 100% center; }
  }

  .coop-party-panel {
    position: absolute;
    top: 110px;
    right: 12px;
    width: 220px;
    background: rgba(9, 6, 28, 0.88);
    border: 1px solid #7c3aed;
    border-radius: 6px;
    padding: 10px;
    color: #fff;
    font-family: monospace;
    font-size: 0.9rem;
    z-index: 20;
    pointer-events: none;
    backdrop-filter: blur(6px);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.6), inset 0 0 10px rgba(124, 58, 237, 0.2);
  }
  .coop-party-row {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .coop-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .coop-name { 
    font-size: 0.9rem; 
    font-weight: bold; 
    color: #fbbf24;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
  }
  .coop-lvl-badge {
    font-size: 0.65rem;
    background: #7c3aed;
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.5);
  }
  .coop-hp-container {
    position: relative;
    width: 100%;
    height: 14px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 4px;
    overflow: hidden;
    box-shadow: inset 0 1px 3px rgba(0,0,0,0.5);
  }
  .coop-hp-fill {
    height: 100%;
    background: linear-gradient(90deg, #ef4444 0%, #dc2626 100%);
    box-shadow: 0 0 8px rgba(239, 68, 68, 0.4);
    transition: width 0.15s ease-out;
  }
  .coop-hp-text {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 0.65rem;
    font-weight: bold;
    color: #ffffff;
    text-shadow: 1px 1px 1px #000;
  }
  .coop-xp-text { 
    font-size: 0.65rem;
    color: #9ca3af; 
    text-align: right;
    letter-spacing: 0.5px;
  }

  .orientation-warning {
    display: none;
    position: fixed;
    inset: 0;
    background: #030111;
    z-index: 999999;
    color: #fff;
    font-family: 'Georgia', serif;
    text-align: center;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 20px;
  }

  @media (orientation: portrait) {
    .orientation-warning {
      display: flex;
    }
  }

  canvas, .mmo-hotbar-slot, .mmo-hotbar-ult-slot, .skill-row-btn, .lu-card {
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
    -webkit-tap-highlight-color: transparent;
  }

@media (max-width: 932px) and (orientation: landscape) {

.bdo-menu-icon-btn {
    padding: 2px 6px !important;    /* Pinaliit ang loob */
    font-size: 0.5rem !important;   /* Pinaliit ang font */
    height: 22px !important;        /* Pinaliit ang taas */
  }

  .bdo-menu-icon-btn svg {
    width: 10px !important;         /* Pinaliit ang icon */
    height: 10px !important;
    margin-right: 2px !important;
  }
  
  .bdo-top-menu-btns {
    gap: 3px !important;            /* Pinaliit ang agwat ng buttons */
  }

    .game-hud-top {
      top: 16px !important;
      left: 24px !important;
      right: 24px !important;
      font-size: 0.9rem !important;
    }

    .hud-pause-btn {
      top: 16px !important;
      font-size: 0.55rem !important;
      padding: 4px 12px !important;
    }

    /* 👇 TINAASAN NATIN YUNG BOTTOM VALUE (Gagawing 85px) */
    .rpg-buff-container {
      top: auto !important;
      bottom: 85px !important; 
    }

    @supports (-webkit-touch-callout: none) {
      .game-hud-top {
        top: 56px !important; 
      }

      .hud-pause-btn {
        top: 56px !important;
      }

      /* 👇 TINAASAN DIN PARA SA IPHONE/IOS (Gagawing 95px) */
      .rpg-buff-container {
        top: auto !important;
        bottom: 95px !important; 
      }
    }

    /* ── Skill tree / co-op panel (mobile landscape) ──────────────────────
       FIX: anchor BOTH top and bottom instead of relying on a fixed
       max-height. That makes the panel's height whatever space is actually
       left on screen, so it can no longer overflow past the bottom edge.
       max-height is kept only as a safety cap, using dvh (dynamic
       viewport height) instead of vh. On iOS Safari, vh is sized as if
       the address bar / home-indicator chrome were already hidden, so the
       panel overflows whenever that chrome is actually showing — this is
       exactly why it clips on notched iPhones but looks fine elsewhere.
       dvh tracks the real visible viewport, fixing that. This now applies
       to every mobile-landscape browser (not gated behind the old
       @supports iOS check above), so the behavior is consistent rather
       than relying on browser sniffing. */

    .skill-tree-container, .coop-party-panel {
      top: 90px !important;
      bottom: 8px !important;
      max-height: 60vh !important;  /* fallback for browsers without dvh support */
      max-height: 60dvh !important;
    }

    .hud-menu-title, 
    .hud-menu-sub {
      display: none !important;
    }

    .game-hud-right-group div {
      font-size: 0.85rem !important;
    }

    .inventory-toggle-btn, .skill-tree-toggle-btn {
    font-size: 0.55rem !important;
    padding: 0 8px !important;
    height: 24px !important;
  }
  }

  @media (max-width: 840px) {
    .hud-start-overlay {
      align-items: flex-start !important; 
      padding-top: 12vh !important; 
    }
    .hud-start-modal {
      padding: 1.2rem !important;
      max-width: 280px !important; 
    }
    .hud-start-modal h2 {
      font-size: 1.2rem !important; 
    }
    .hud-start-modal p {
      font-size: 0.75rem !important; 
    }

    .hud-pause-btn {
      font-size: 0.5rem !important;  
      padding: 3px 10px !important;
      top: 4px !important;
    }

    .hud-bar-container {
      width: 120px !important; 
      height: 8px !important;  
    }
    .hud-bar-text {
      font-size: 0.5rem !important;
      line-height: 8px !important;
    }
    .hud-level-badge {
      padding: 2px 5px !important;
    }
    .hud-level-label {
      font-size: 0.42rem !important;
    }
    .hud-level-value {
      font-size: 0.6rem !important;
    }

    .rpg-buff-container {
      top: auto !important; 
      bottom: 75px !important; /* Itutulak nito ang buffs pataas ng HP bar */
      gap: 10px !important;
      transform: translateX(-50%) scale(0.6) !important; 
      transform-origin: bottom center !important; 
    }

    .mmo-hotbar-container {
      gap: 3px !important;
      padding: 3px 4px !important;
      bottom: 4px !important;
      border-radius: 2px !important;
    }
    .mmo-hotbar-slot {
      width: 28px !important;
      height: 28px !important;
      clip-path: polygon(3px 0%, 100% 0%, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0% 100%, 0% 3px) !important;
    }
    .mmo-hotbar-ult-slot {
      width: 36px !important;
      height: 36px !important;
    }
    .hotbar-icon {
      font-size: 0.8rem !important;
    }
    .mmo-hotbar-ult-slot .hotbar-icon {
      font-size: 0.95rem !important;
    }
    .hotbar-key-bind {
      font-size: 0.4rem !important;
      top: 1px !important;
      left: 2px !important;
    }
    .mmo-hotbar-ult-slot .hotbar-key-bind {
      font-size: 0.45rem !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
    }
    .hotbar-status-dot {
      font-size: 0.35rem !important;
    }
    .hotbar-cooldown-overlay {
      font-size: 0.7rem !important;
      clip-path: polygon(3px 0%, 100% 0%, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0% 100%, 0% 3px) !important;
    }
    .mmo-hotbar-ult-slot .hotbar-cooldown-overlay {
      font-size: 0.85rem !important;
    }

    /* Single source of truth for width/padding/gap on these three panels
       at this breakpoint — see the earlier .skill-tree-container rule for
       its position/shape-only overrides (max-height, clip-path, etc). */
    .rpg-stats-panel, .skill-tree-container, .coop-party-panel {
      width: 150px !important; 
      padding: 5px !important;
      gap: 2px !important;
    }
    .stats-header, .skill-tree-title {
      font-size: 0.68rem !important;
      padding-bottom: 2px !important;
      margin-bottom: 2px !important;
    }
    .stats-row, .skill-row-btn, .coop-name {
      font-size: 0.64rem !important; 
    }
    .skill-row-btn {
      padding: 4px 5px !important;
    }
    .skill-node-desc {
      font-size: 0.6rem !important;
      padding: 3px 4px !important;
    }
    
    .stats-toggle-btn, .skill-tree-toggle-btn {
      font-size: 0.58rem !important;
      padding: 3px 7px !important;
    }
    .stats-toggle-btn {
      font-size: 0.55rem !important;
      padding: 2px 6px !important;
      letter-spacing: 0.3px !important;
    }
  }
/* =========================================================================
   🔮 PREMIUM CYBER-FANTASY INVENTORY STYLES (PC & Mobile Ready)
   ========================================================================= */

.inventory-toggle-btn:hover {
  background: linear-gradient(180deg, rgba(22, 12, 5, 0.98) 0%, rgba(8, 4, 2, 0.99) 100%);
  border-color: rgba(253, 230, 138, 0.65);
  border-top-color: rgba(254, 240, 138, 0.8);
  color: #fef9c3;
  box-shadow: 0 0 12px rgba(180, 130, 0, 0.2);
}

/* ── Inventory Modal — Arcane Grimoire Tome ── */
.inventory-modal {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 360px;
  background:
    linear-gradient(160deg, rgba(7, 4, 26, 0.4) 0%, rgba(4, 2, 16, 0.42) 100%) !important;
  backdrop-filter: blur(5px) !important;
  -webkit-backdrop-filter: blur(5px) !important;
  border: 1px solid rgba(100, 65, 190, 0.32) !important;
  border-top-color: rgba(139, 92, 246, 0.52) !important;
  border-radius: 10px;
  outline: 1px solid rgba(139, 92, 246, 0.15);
  outline-offset: -4px;
  overflow: visible !important;
  padding: 16px;
  z-index: 100;
  color: #e2d9f3;
  font-family: 'Cinzel', 'Georgia', serif;
  box-shadow:
    0 12px 40px rgba(0, 0, 0, 0.5),
    0 0 20px rgba(80, 40, 180, 0.12),
    inset 0 0 20px rgba(3, 1, 14, 0.3);
  pointer-events: auto;
}

/* Header Row */
.inventory-modal > div:first-child {
  display: flex !important;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(100, 60, 200, 0.22);
  padding-bottom: 8px;
  margin-bottom: 12px !important;
}

/* X Close Button */
.inventory-modal > div:first-child button {
  background: rgba(239, 68, 68, 0.12) !important;
  border: 1.5px solid rgba(239, 68, 68, 0.55) !important;
  color: #fca5a5 !important;
  border-radius: 4px !important;
  width: 24px !important;
  height: 24px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-weight: bold !important;
  font-size: 0.9rem !important;
  transition: all 0.15s ease !important;
}
.inventory-modal > div:first-child button:hover {
  background: rgba(239, 68, 68, 0.3) !important;
  border-color: rgba(244, 63, 94, 0.8) !important;
  color: #ffffff !important;
}

/* ── Help Modal — Hotkeys & How To Play ── */
.help-modal {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 460px;
  max-width: 92vw;
  max-height: 86vh;
  background:
    linear-gradient(160deg, rgba(7, 4, 26, 0.4) 0%, rgba(4, 2, 16, 0.42) 100%) !important;
  backdrop-filter: blur(5px) !important;
  -webkit-backdrop-filter: blur(5px) !important;
  border: 1px solid rgba(100, 65, 190, 0.32) !important;
  border-top-color: rgba(139, 92, 246, 0.52) !important;
  border-radius: 10px;
  outline: 1px solid rgba(139, 92, 246, 0.15);
  outline-offset: -4px;
  padding: 22px;
  z-index: 100;
  color: #e2d9f3;
  font-family: 'Cinzel', 'Georgia', serif;
  box-shadow:
    0 12px 40px rgba(0, 0, 0, 0.5),
    0 0 20px rgba(80, 40, 180, 0.12),
    inset 0 0 20px rgba(3, 1, 14, 0.3);
  pointer-events: auto;
  display: flex;
  flex-direction: column;
}

.help-modal > div:first-child {
  display: flex !important;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(100, 60, 200, 0.22);
  padding-bottom: 8px;
  margin-bottom: 10px !important;
  flex-shrink: 0;
}

.help-modal > div:first-child button {
  background: rgba(239, 68, 68, 0.12) !important;
  border: 1.5px solid rgba(239, 68, 68, 0.55) !important;
  color: #fca5a5 !important;
  border-radius: 4px !important;
  width: 24px !important;
  height: 24px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-weight: bold !important;
  font-size: 0.9rem !important;
  transition: all 0.15s ease !important;
}
.help-modal > div:first-child button:hover {
  background: rgba(239, 68, 68, 0.3) !important;
  border-color: rgba(244, 63, 94, 0.8) !important;
  color: #ffffff !important;
}

.help-modal-body {
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
}

.help-section-title {
  font-size: 0.76rem;
  font-weight: bold;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: #fbbf24;
  margin: 16px 0 7px;
  border-bottom: 1px solid rgba(251, 191, 36, 0.22);
  padding-bottom: 4px;
}
.help-section-title:first-child {
  margin-top: 0;
}
.help-section-title em {
  font-style: normal;
  color: rgba(226, 217, 243, 0.55);
  font-size: 0.66rem;
  text-transform: none;
  letter-spacing: 0;
}

.help-text {
  font-size: 0.8rem;
  line-height: 1.6;
  color: rgba(226, 217, 243, 0.85);
  margin: 0 0 4px;
  font-family: 'Georgia', serif;
}

.help-key-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 5px 2px;
  border-bottom: 1px solid rgba(100, 60, 200, 0.12);
}
.help-key-row:last-of-type {
  border-bottom: none;
}

.help-key-combo {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.help-key {
  min-width: 26px;
  height: 26px;
  padding: 0 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Cinzel', serif;
  font-size: 0.7rem;
  font-weight: 600;
  color: #d8d2f5;
  border: 0.5px solid rgba(127, 119, 221, 0.5);
  border-radius: 4px;
  background: rgba(83, 74, 183, 0.18);
  box-shadow: 0 0 6px rgba(80, 40, 180, 0.15);
}
.help-key-wide {
  min-width: 56px;
  padding: 0 10px;
}
.help-key-icon {
  padding: 0 7px;
}
.help-key-or {
  font-size: 0.64rem;
  color: rgba(226, 217, 243, 0.45);
  font-style: italic;
  margin: 0 1px;
}

.help-key-desc {
  font-size: 0.74rem;
  color: rgba(226, 217, 243, 0.85);
  text-align: right;
}
.help-key-desc em {
  font-style: normal;
  color: rgba(251, 191, 36, 0.75);
  font-size: 0.64rem;
}

/* Equipment Section */
.equip-section {
  display: flex;
  justify-content: space-around;
  background: rgba(4, 2, 18, 0.5);
  padding: 10px;
  border: 1px solid rgba(80, 50, 160, 0.2);
  border-top-color: rgba(100, 65, 200, 0.3);
  border-radius: 6px;
  margin-bottom: 14px;
}
.equip-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  font-size: 0.6rem;
  color: rgba(167, 139, 250, 0.8);
  font-weight: bold;
  letter-spacing: 0.4px;
}
.equip-section .inv-slot {
  width: 52px !important;
  height: 52px !important;
}

/* Backpack Text Header */
.inventory-modal > div:nth-child(3) {
  font-weight: bold;
  letter-spacing: 0.8px;
  margin-bottom: 6px;
  color: rgba(148, 130, 190, 0.65);
  font-size: 0.6rem;
  text-transform: uppercase;
}

/* Main Items Grid */
.inv-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

/* ── Individual Item Slots ── */
.inv-slot {
  aspect-ratio: 1 / 1;
  background: rgba(6, 3, 22, 0.8) !important;
  border: 1px solid rgba(70, 40, 130, 0.45) !important;
  border-radius: 6px;
  outline: 1px solid rgba(139, 92, 246, 0.18);
  outline-offset: -3px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  transition: all 0.15s ease;
  box-shadow: inset 0 0 8px rgba(0,0,0,0.6);
}
.inv-slot:hover {
  transform: scale(1.06);
  z-index: 50;
  background: rgba(18, 8, 50, 0.9) !important;
  border-color: rgba(251, 191, 36, 0.65) !important;
  outline-color: rgba(251, 191, 36, 0.35);
  box-shadow:
    0 0 10px rgba(180, 130, 0, 0.2),
    inset 0 0 8px rgba(0,0,0,0.5) !important;
}

/* Rarity Color Accents */
.inv-slot[data-rarity="common"]    { border-color: rgba(100, 116, 139, 0.45) !important; }
.inv-slot[data-rarity="rare"]      { border-color: rgba(59, 130, 246, 0.55) !important;  box-shadow: inset 0 0 8px rgba(59, 130, 246, 0.12) !important; }
.inv-slot[data-rarity="epic"]      { border-color: rgba(168, 85, 247, 0.55) !important;  box-shadow: inset 0 0 8px rgba(168, 85, 247, 0.15) !important; }
.inv-slot[data-rarity="legendary"] { border-color: rgba(251, 191, 36, 0.55) !important;  box-shadow: inset 0 0 8px rgba(251, 191, 36, 0.12) !important; }
.inv-slot[data-rarity="mythic"]    { border-color: rgba(239, 68, 68, 0.55) !important;   box-shadow: inset 0 0 10px rgba(239, 68, 68, 0.18) !important; }

/* Item Tooltips */
.item-tooltip {
  position: absolute;
  bottom: 115%;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(4, 2, 18, 0.97);
  border: 1px solid rgba(100, 65, 190, 0.5);
  border-top: 1.5px solid rgba(139, 92, 246, 0.7);
  padding: 9px;
  width: max-content;
  max-width: 190px;
  font-size: 0.72rem;
  font-family: 'Georgia', serif;
  border-radius: 4px;
  z-index: 60;
  pointer-events: none;
  opacity: 0;
  box-shadow:
    0 6px 18px rgba(0,0,0,0.8),
    0 0 10px rgba(80, 40, 180, 0.12);
  transition: opacity 0.15s ease;
  letter-spacing: 0.2px;
}
.inv-slot:hover .item-tooltip { opacity: 1; }

/* Delete Button */
.delete-btn {
  position: absolute;
  top: -5px;
  right: -5px;
  width: 18px !important;
  height: 18px !important;
  font-size: 11px !important;
  background: rgba(185, 28, 28, 0.95) !important;
  color: #ffffff !important;
  border-radius: 50% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-weight: bold !important;
  cursor: pointer !important;
  border: 1.5px solid rgba(254, 202, 202, 0.8) !important;
  z-index: 25 !important;
  transition: all 0.1s ease;
  box-shadow: 0 0 6px rgba(239, 68, 68, 0.4);
}
.delete-btn:hover {
  transform: scale(1.18) !important;
  background: #ef4444 !important;
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.5) !important;
}

/* Clear All Button */
  .backpack-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    width: 100%;
    margin-top: 10px;
    margin-bottom: 5px;
  }

  .clear-all-btn {
    background: rgba(180, 28, 28, 0.18);
    border: 1.5px solid rgba(239, 68, 68, 0.6);
    border-top-color: rgba(248, 113, 113, 0.75);
    color: #fecaca;
    font-family: 'Cinzel', 'Georgia', serif;
    font-size: 0.7rem;
    letter-spacing: 0.4px;
    padding: 4px 10px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
    font-weight: bold;
  }

  .clear-all-btn:hover {
    background: rgba(239, 68, 68, 0.3);
    color: #ffffff;
    border-color: rgba(244, 63, 94, 0.85);
    box-shadow: 0 0 8px rgba(239, 68, 68, 0.3);
  }

  /* Item Plus Badge */
  .item-plus-badge {
    position: absolute;
    bottom: 2px;
    right: 2px;
    background: rgba(0, 0, 0, 0.85);
    color: rgba(251, 191, 36, 0.88);
    font-size: 0.6rem;
    font-weight: bold;
    padding: 1px 4px;
    clip-path: polygon(2px 0%, 100% 0%, 100% calc(100% - 2px), calc(100% - 2px) 100%, 0% 100%, 0% 2px);
    pointer-events: none;
    font-family: 'Cinzel', 'Georgia', serif;
    z-index: 10;
    text-shadow: 0 1px 2px rgba(0,0,0,0.9);
    letter-spacing: 0.2px;
  }
/* =========================================================================
   📱 INTERACTIVE MOBILE LANDSCAPE CONFIGURATION (Fixed Tooltips)
   ========================================================================= */
@media (max-height: 550px), (max-width: 950px) and (orientation: landscape) {
  
  .help-modal {
    width: 340px !important;
    max-height: 90vh !important;
    padding: 10px 12px !important;
  }
  .help-text, .help-key-desc {
    font-size: 0.62rem !important;
  }

  .inventory-toggle-btn {
    font-size: 0.55rem;
    padding: 3px 8px;
  }

  .clear-all-btn {
      font-size: 0.5rem !important;
      padding: 2px 5px !important;
    }

  .inventory-modal {
    display: grid !important;
    grid-template-columns: 110px 1fr !important;
    column-gap: 14px !important;
    row-gap: 2px !important;
    width: 395px !important;
    max-width: 95vw !important;
    max-height: 96vh !important;
    padding: 10px 12px !important;
    /* 1️⃣ BINALIK SA VISIBLE PARA HINDI MAPUTOL ANG TOOLTIP */
    overflow: visible !important; 
    align-items: center !important;
  }

  .inventory-modal > div:first-child {
    grid-column: 1 / span 2 !important;
    grid-row: 1 !important;
    margin-bottom: 2px !important;
    padding-bottom: 4px !important;
  }
  .inventory-modal span {
    font-size: 0.65rem !important;
  }

  .equip-section {
    grid-column: 1 !important;
    grid-row: 2 / span 2 !important; 
    display: flex !important;
    flex-direction: column !important; 
    justify-content: center !important;
    gap: 5px !important;
    margin-bottom: 0 !important;
    padding: 6px !important;
    height: 100% !important;
    background: rgba(255, 255, 255, 0.02) !important;
  }

  .equip-box {
    flex-direction: row !important;
    justify-content: space-between !important;
    width: 100% !important;
    font-size: 0.52rem !important;
  }
  
  .equip-section .inv-slot {
    width: 30px !important;
    height: 30px !important;
  }

  .inventory-modal > div:nth-child(3) {
    grid-column: 2 !important;
    grid-row: 2 !important;
    margin-bottom: 0 !important;
    font-size: 0.6rem !important;
  }

  .inv-grid {
    grid-column: 2 !important;
    grid-row: 3 !important;
    grid-template-columns: repeat(4, 38px) !important; 
    gap: 4px !important;
    margin-top: 0 !important;
  }

  .inv-grid .inv-slot {
    width: 38px !important;
    height: 38px !important;
    border-radius: 5px !important;
  }

  /* 2️⃣ INAYOS NA TOOLTIP POSITION PARA SA MOBILE (Tulad ng sa Desktop) */
  .item-tooltip {
    bottom: 115% !important;
    top: auto !important;
    left: 50% !important;
    right: auto !important; 
    transform: translateX(-50%) !important;
    max-width: 150px !important;
    z-index: 9999 !important; /* Para laging nasa ibabaw ng lahat */
  }
  
  .delete-btn {
    width: 12px !important;
    height: 12px !important;
    font-size: 8px !important;
    top: -2px !important;
    right: -2px !important;
  }
}
  /* =========================================================================
     📱 ULTRA-COMPACT MOBILE LANDSCAPE FIX (No scroll, perfectly centered)
     ========================================================================= */
  @media (max-height: 480px) and (orientation: landscape) {
    .hud-start-overlay {
      align-items: center !important;  /* Ino-override yung flex-start ng portrait mobile */
      padding-top: 0 !important;       /* Tinatanggal yung 12vh push down */
    }
    
    .hud-start-modal {
      padding: 12px 16px !important;
      max-width: 320px !important;
    }
    
    /* Itago ang mga purely decorative na runes at lines para malaki ang matipid sa vertical space */
    .hud-rune-row,
    .hud-divider,
    .hud-divider-sm,
    .hud-rune-footer {
      display: none !important;
    }
    
    .hud-sigil {
      width: 30px !important;
      height: 30px !important;
      margin: 0 auto 6px !important;
    }
    
    .hud-start-modal h2 {
      font-size: 14px !important;
      margin-bottom: 6px !important;
    }
    
    .hud-start-modal p {
      font-size: 10.5px !important;
      line-height: 1.3 !important;
      margin-bottom: 8px !important;
    }
    
    .hud-touch-hint, .hud-wasd-hint {
      margin-bottom: 0 !important;
    }
    
    .hud-touch-zone {
      width: 40px !important;
      height: 40px !important;
    }
  } 
`;

export default function GameCanvas({ screen, setScreen, hudRef, netRef, onLevelUpOffer, playerName, allyName, isCoop }) {
  const canvasRef = useRef(null);
  const workerRef = useRef(null);
  const vignetteRef = useRef(null);

  const joyBaseRef = useRef(null);
  const joyKnobRef = useRef(null);
  
  const [showPartyList, setShowPartyList] = useState(true);
  
  const scoreValueRef = useRef(null);
  const waveValueRef = useRef(null);
  const hpFillRef = useRef(null);
  const hpTextRef = useRef(null);
  const xpFillRef = useRef(null);
  const xpTextRef = useRef(null);

  const dashCdRef = useRef(null);

  const audioCtxRef = useRef(null);
  const statAtkRef = useRef(null);
  const statDefRef = useRef(null);
  const statCritRef = useRef(null);
  const statSpdRef = useRef(null);
  const statCdRef = useRef(null);
  const statLifestealRef = useRef(null);

  // hasStarted: ginagamit para ipakita/itago ang start overlay at dash button
  // Gumagamit ng visibility/opacity CSS imbes na unmount para walang re-render lag
  const [hasStarted, setHasStarted] = useState(false);

  // 🔮 isPreloading: ipinapakita ang arcane LoadingScreen BAGO lumabas ang
  // "MOVE TO START GAME" prompt. Binibigyan nito ng 3-4 segundo ang heavy
  // canvas/particle/sprite setup (yung VOID/FRIEREN map baking, ambient
  // particles, atbp.) para matapos sa background habang naka-cover ang
  // loading screen — kaya hindi na naramdaman ang stutter sa unang
  // movement frame ng player. Ginagamit din ang isPreloadingRef sa loob ng
  // game loop (worker.onmessage closure) dahil hindi laging sigurado na
  // fresh ang `screen`/state closure doon — ref ang laging up-to-date.
  const [isPreloading, setIsPreloading] = useState(true);
  const isPreloadingRef = useRef(true);
  useEffect(() => { isPreloadingRef.current = isPreloading; }, [isPreloading]);

  const [isWindowBlurred, setIsWindowBlurred] = useState(false);
  const [p1VotedRestart, setP1VotedRestart] = useState(false);
  const [p2VotedRestart, setP2VotedRestart] = useState(false);

  const [isTreeOpen, setIsTreeOpen] = useState(true);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [playerLevel, setPlayerLevel] = useState(1);
  const playerLevelRef = useRef(1);
  const [activeBuffsList, setActiveBuffsList] = useState([]);
  // Tracks the peak duration seen per buff "type" key, kasi nag-iiba ang max
  // duration depende sa source (potion vs skill vs ultimate). Ginagamit ito
  // para tama ang radial sweep ng rune medallion (life / peak), hindi fixed guess.
  const buffPeakDurationRef = useRef({});
  const [guestExitedAlert, setGuestExitedAlert] = useState(false);
  const [hostExitedCountdown, setHostExitedCountdown] = useState(null);
  const exitTimerRef = useRef(null);
  const [showInventory, setShowInventory] = useState(false);

  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [invTrigger, setInvTrigger] = useState(0);
  const lastInvAction = useRef(0);

  // 🔥 RELIABLE TOUCH/MOBILE DETECTION: Hindi pwede umasa lang sa 'ontouchstart' in window,
  // kasi false ito sa mobile-preview/resized desktop browsers (walang totoong touch hardware).
  // Idinagdag ang width check (tulad ng ginagamit na sa ibang parte ng file) bilang fallback,
  // at nag-liliisten din sa unang totoong touchstart event para mag-upgrade agad kung mali ang unang guess.
  const computeIsTouchDevice = () => {
    if (typeof window === 'undefined') return false;
    // Gamitin ang MAS MALIIT sa width/height, hindi lang width — kasi pag naka-landscape
    // ang malalaking phone (hal. iPhone Pro Max), lumalampas ang width sa karaniwang
    // mobile breakpoint kahit phone pa rin talaga ito. Ang "narrow dimension" ang
    // tamang sukatan dahil 'yun ang nananatiling maliit kahit anong orientation.
    const narrowSide = Math.min(window.innerWidth, window.innerHeight);
    // pointer:coarse + hover:none = totoong touch-primary input device, gumagana
    // 'to kahit malaki ang screen (tablets, malalaking phone sa landscape, atbp.)
    const isCoarsePointer =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(pointer: coarse)').matches;
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      isCoarsePointer ||
      narrowSide <= 500
    );
  };

  const [isTouchDevice, setIsTouchDevice] = useState(computeIsTouchDevice);

  useEffect(() => {
    const checkTouch = () => setIsTouchDevice(computeIsTouchDevice());
    checkTouch();
    window.addEventListener('resize', checkTouch);
    window.addEventListener('orientationchange', checkTouch);
    // Kapag may totoong touch event na natanggap, sigurado na touch device ito
    window.addEventListener('touchstart', checkTouch, { once: true, passive: true });
    return () => {
      window.removeEventListener('resize', checkTouch);
      window.removeEventListener('orientationchange', checkTouch);
      window.removeEventListener('touchstart', checkTouch);
    };
  }, []);

  const screenRef = useRef(screen);

  // 🔥 ORIENTATION-AWARE LAYOUT BREAKPOINT: dating "window.innerWidth <= 840" lang ang
  // ginagamit ng elemental sigils / dash / ultimate buttons para mag-decide ng radius,
  // anchor offset, at icon size. Pero may existing CSS na "(max-width: 932px) and
  // (orientation: landscape)" para sa malalaking phone na naka-landscape (hal. iPhone
  // Pro Max). Dahil hindi tugma ang dalawa, naging "desktop-sized" ang mga skill
  // buttons (mas malaking radius/icons) kahit "mobile" na ang CSS sa paligid nila —
  // kaya lumalabas na sobrang laki/misaligned ang mga ito sa landscape phones.
  // Ginawa itong IISANG shared check na eksaktong sumasalamin sa parehong CSS rules.
  const computeIsMobileLayout = () => {
    if (typeof window === 'undefined') return false;
    const isLandscape =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(orientation: landscape)').matches;
    return window.innerWidth <= 840 || (isLandscape && window.innerWidth <= 932);
  };

  const [isMobileLayout, setIsMobileLayout] = useState(computeIsMobileLayout);

  useEffect(() => {
    const checkLayout = () => setIsMobileLayout(computeIsMobileLayout());
    checkLayout();
    window.addEventListener('resize', checkLayout);
    window.addEventListener('orientationchange', checkLayout);
    return () => {
      window.removeEventListener('resize', checkLayout);
      window.removeEventListener('orientationchange', checkLayout);
    };
  }, []);

// I-sync ang ref sa state tuwing nagbabago ang screen
useEffect(() => {
  screenRef.current = screen;
}, [screen]);


  // BLOCK INSPECT ELEMENT & KEYBOARD SHORTCUTS
  useEffect(() => {
    const blockKeys = (e) => {
      if (
        e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) || 
        (e.ctrlKey && e.key === 'U')
      ) {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', blockKeys);
    return () => window.removeEventListener('keydown', blockKeys);
  }, []);


  // 🔥 GLOBAL JOYSTICK RESET: Para hindi ma-stuck kapag nag-slide palabas ng phone screen
  useEffect(() => {
    const globalPointerUp = (e) => {
      const eng = engineRef.current;
      if (eng && eng.joystick && eng.joystick.active) {
        if (e.pointerId === eng.joystick.pointerId) {
          eng.joystick.active = false;
          eng.joystick.mx = 0;
          eng.joystick.my = 0;
          if (joyBaseRef.current) joyBaseRef.current.style.display = 'none';
          if (joyKnobRef.current) joyKnobRef.current.style.display = 'none';
        }
      }
    };
    window.addEventListener('pointerup', globalPointerUp);
    window.addEventListener('pointercancel', globalPointerUp);
    return () => {
      window.removeEventListener('pointerup', globalPointerUp);
      window.removeEventListener('pointercancel', globalPointerUp);
    };
  }, []);

  const getEquipmentStats = (playerObj) => {
  const totals = { atk: 0, rate: 0, crit: 0, def: 0, hp: 0, speed: 0, lifesteal: 0 };
  if (!playerObj || !playerObj.equipment) return totals;

  Object.values(playerObj.equipment).forEach(item => {
    if (item && item.stats) {
      totals.atk += item.stats.atk || 0;
      totals.rate += item.stats.rate || 0;
      totals.crit += item.stats.crit || 0;
      totals.def += item.stats.def || 0;
      totals.hp += item.stats.hp || 0;
      totals.speed += item.stats.speed || 0;
      totals.lifesteal += item.stats.lifesteal || 0;
    }
  });
  totals.rate = Math.round(totals.rate * 100) / 100;
  return totals;
};


// 1. Helper function para makuha ang total value ng stats ng isang item (e.g., hp + dmg)
  const getStatTotal = (item) => {
    if (!item || !item.stats) return 0;
    // Pinag-a-add nito lahat ng stats (halimbawa kung may hp: 10, dmg: 5 = 15 total)
    return Object.values(item.stats).reduce((sum, val) => sum + (Number(val) || 0), 0);
  };

  // 2. Logic para malaman kung ang item ay ang "Best in Slot"
  const isItemBiS = (invItem, playerTarget) => {
    if (!playerTarget || !invItem) return false;
    
    const itemStat = getStatTotal(invItem);
    const equippedItem = playerTarget.equipment[invItem.type];
    const equippedStat = getStatTotal(equippedItem);

    // Kapag parehas lang o mas mababa ang stats sa naka-equip, hindi lalabas ang BiS
    if (itemStat <= equippedStat) return false;

    // I-check kung may iba pa bang item sa inventory na mas malakas pa kaysa dito
    const hasBetterInInventory = playerTarget.inventory.some(otherItem => {
      if (otherItem.type !== invItem.type) return false;
      return getStatTotal(otherItem) > itemStat;
    });

    // Kung walang mas mataas na item sa inventory, siya ang tunay na BiS!
    return !hasBetterInInventory;
  };

// Equip logic
const equipItem = (item, index) => {

  if (Date.now() - lastInvAction.current < 400) return;
  lastInvAction.current = Date.now();
  const eng = engineRef.current;

  const target = (isCoop && !netRef.current.isHost) ? eng.p2 : eng.p;
  if (!target || target.dead) return;

  const currentEquipped = target.equipment[item.type];
  
// const hpPercent = target.maxHp > 0 ? (target.hp / target.maxHp) : 1;

if (currentEquipped?.stats?.hp) {
    target.maxHp -= currentEquipped.stats.hp;
  }
  
  // Add stats of the new item
  if (item.stats?.hp) {
    target.maxHp += item.stats.hp;
  }
  
  // Cap current HP just in case removing the old item made their max HP lower than current HP
  target.hp = Math.min(target.hp, target.maxHp);
  
  // Re-apply the percentage to the new Max HP
  // target.hp = target.maxHp * hpPercent;

  // Swap
  target.equipment[item.type] = item;
  target.inventory.splice(index, 1);
  if (currentEquipped) {
    target.inventory.push(currentEquipped);
  }
  
  setInvTrigger(prev => prev + 1);
  playSfx('equip'); // A nice 'equip' sound
};

const unequipItem = (type) => {
  const eng = engineRef.current;

  const target = (isCoop && !netRef.current.isHost) ? eng.p2 : eng.p;
  if (!target || target.dead || target.inventory.length >= 16) return;

  const item = target.equipment[type];
  if (!item) return;

if (item.stats?.hp) {
    target.maxHp -= item.stats.hp;
    // Ensure their current HP doesn't overflow their new, lower Max HP
    target.hp = Math.min(target.hp, target.maxHp);
  }

  target.inventory.push(item);
  target.equipment[type] = null;
  setInvTrigger(prev => prev + 1);
  playSfx('unequip'); // A nice 'unequip' sound
};

const deleteItem = (index) => {

  lastInvAction.current = Date.now();
  const eng = engineRef.current;

  const target = (isCoop && !netRef.current.isHost) ? eng.p2 : eng.p;
  if (!target || !target.inventory[index]) return;

  // Tanggalin ang item sa inventory
  target.inventory.splice(index, 1);
  
  // Mag-force update ng UI
  setInvTrigger(prev => prev + 1);
  
  // Optional: Play a "delete/trash" sound if you have one, or reuse a sound
  playSfx('delete'); 
};

const clearAllInventory = () => {
    lastInvAction.current = Date.now();
    const eng = engineRef.current;

    const target = (isCoop && !netRef.current.isHost) ? eng.p2 : eng.p;
    
    // Check kung may laman ang inventory
    if (!target || !target.inventory || target.inventory.length === 0) return;

    // Tanggalin lahat ng item
    target.inventory = [];
    
    // I-update ang UI
    setInvTrigger(prev => prev + 1);
    
    // Play delete sound effect (reusing the delete sfx)
    playSfx('delete'); 
  };

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
    arcaneInstinct: { learned: false, enabled: true, cd: 0, duration: 0, autoTimer: 0 },
    arcaneResurrection: { learned: false, enabled: true, cd: 0 },
    flareInferno: { learned: true, enabled: true, cd: 0 },
    tidalWave: { learned: true, enabled: true, cd: 0 },
    fissureSlam: { learned: true, enabled: true, cd: 0 },
    lightningSurge: { learned: true, enabled: true, cd: 0 },
    iceStorm: { learned: true, enabled: true, cd: 0 },
    natureRecovery: { learned: true, enabled: true, cd: 0 }
  });

  const [skillsState, setSkillsState] = useState(initSkills());

const engineRef = useRef({
    score: 0, wave: 1, waveT: 0, waveLen: 30, spawnT: 0, spawnRate: 0.9, boltDmg: 22,
    gameStarted: false, screenShake: 0, endlessTransitionTimer: 0,
    p: null, p2: null, bullets: [], enemies: [], particles: [], gems: [], ambs: [],
    slashes: [], cubeBashes: [], stars: [], collapses: [], potions: [],
    tornados: [], waves: [], fissures: [], lightnings: [], iceStorms: [], aoeZones: [], // 🔥 DINAGDAG: aoeZones
    floatingTexts: [],
    pendingSigilCasts: [], // 🔥 FIX: dt-synced na cast queue (kapalit ng setTimeout) — naka-pause-aware, walang stale orphan timers, may stagger sa sabay-sabay na cast
    keys: {}, floorPat: null, floorBaked: null, staticBg: null, p2Input: { x: 0, y: 0 },
    bossIntro: {
        active: false,
        timer: 0,
        maxDuration: 720, // Kung 60fps ang laro mo, 180 = 3 seconds
        bossName: ""
      },
    p1Target: { x: 300, y: 280, hp: 100, maxHp: 100, inv: 0, dead: false },
    p2Target: { x: 600, y: 280, hp: 100, maxHp: 100, inv: 0, dead: false },
    p1Render: { x: 300, y: 280 },
    p2Render: { x: 600, y: 280 },
    p2History: [],
    joystick: { active: false, startX: 0, startY: 0, curX: 0, curY: 0, mx: 0, my: 0 }
  });

  const learnSkillTreeTech = (skillId, forcedTarget = null) => {
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
    if (['arcaneCollapse', 'arcaneInstinct', 'arcaneResurrection'].includes(skillId) && target.level < 13) return; 

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
      if (['arcaneCollapse', 'arcaneInstinct', 'arcaneResurrection'].includes(skillId)) {
        target.skills[skillId].cd = 0;
      }
    } else {
      if (!['arcaneCollapse', 'arcaneInstinct', 'arcaneResurrection'].includes(skillId)) {
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

// 💥 FLOATING COMBAT TEXT HELPER
  const spawnFCT = (eng, x, y, amount, type, isCrit = false) => {
    if (!eng.floatingTexts) eng.floatingTexts = [];
    if (eng.floatingTexts.length > 100) eng.floatingTexts.shift(); // Cap sa 100 para iwas lag
    
    let textDisplay = Math.ceil(amount).toString(); // Gawing string agad yung number
    
    if (type === 'shield') textDisplay = `Shield -${Math.ceil(amount)}`; // 💥 Para malinaw ang bawas sa shield
    if (type === 'damageTaken') textDisplay = `-${Math.ceil(amount)}`; // 💥 Minus sign sa damage na pumapasok
    if (type === 'miss') textDisplay = 'Miss';
    
    // 🔥 INALIS NA NATIN ANG SALITANG "CRITICAL" DITO
    // Dahil sa rendering na natin siya idinadagdag! Number na lang ang iiwan natin.
    // if (isCrit) textDisplay = `CRITICAL ${Math.ceil(amount)}`; <--- BINURA NA ITO

    eng.floatingTexts.push({
      x: x + (Math.random() * 30 - 15), // Random horizontal scatter
      y: y + (Math.random() * 10 - 5),
      text: textDisplay,
      type: type, 
      isCrit: isCrit,
      life: 1.0, // 1 second bago mawala
      vy: isCrit ? 90 : 45 // Bounce speed (mas mabilis pag crit)
    });
  };

  // =========================================================================
  // 🔥 FIX: SPELL RESOLUTION — inalis sa setTimeout, ginawang plain function
  // para matawag ito ng dt-synced queue (pendingSigilCasts) sa main game loop.
  // Dahil dito: (1) naka-sync na sa pause state, (2) walang orphan timers
  // pag nag-restart/unmount, (3) consistent sa internal game clock.
  // =========================================================================
  const resolveSigilCast = (currentEng, target, sigilType) => {
    if (!currentEng || !target || target.dead) return; // Wag ituloy kung napatay si player habang nagchachant

    currentEng.screenShake = 0.8; // Malakas na shake pag pumutok na yung spell!

    if (!currentEng.tornados) currentEng.tornados = [];
    if (!currentEng.waves) currentEng.waves = [];
    if (!currentEng.fissures) currentEng.fissures = [];
    if (!currentEng.lightnings) currentEng.lightnings = [];
    if (!currentEng.iceStorms) currentEng.iceStorms = [];

    if (sigilType === 'flareInferno') {
      target.chatBubble = { text: "FLARE INFERNO!", life: 1.5 };

      // 🔥 AUTO-AIM LOGIC: Hanapin ang pinakamalapit na kalaban
      let targetEnemy = null;
      let minDist = Infinity;
      for (const e of currentEng.enemies) {
        // Wag isama ang mga patay na o wala pa sa screen (unless malaking boss)
        const isBigBoss = e.boss || e.type === 'abyss' || e.type === 'abyss_awakened' || e.type === 'primordial';
        if (e.hp <= 0 || (e.y < -50 && !isBigBoss)) continue; 
        
        let d = Math.hypot(e.x - target.x, e.y - target.y);
        if (d < minDist) { minDist = d; targetEnemy = e; }
      }
      
      // Compute ang angle papunta sa target. Kung walang kalaban, random na lang.
      let angle = Math.random() * Math.PI * 2; 
      if (targetEnemy) {
        angle = Math.atan2(targetEnemy.y - target.y, targetEnemy.x - target.x);
      }

      // I-spawn ang tornado papunta sa calculated angle
      currentEng.tornados.push({ 
          x: target.x, 
          y: target.y, 
          life: 5.0, 
          vx: Math.cos(angle) * 150, // 150 ang speed ng tornado
          vy: Math.sin(angle) * 150, 
          r: 80 
      });
    } else if (sigilType === 'tidalWave') {
      target.chatBubble = { text: "TIDAL WAVE!", life: 1.5 };
      currentEng.waves.push({ x: -200, y: H/2, vx: 450, life: 5.0, width: 300 });

    } else if (sigilType === 'fissureSlam') {
      target.chatBubble = { text: "FISSURE SLAM!", life: 1.5 };
      // --- AUTO-AIM LOGIC ---
      let closestEnemy = null;
      let minDistance = Infinity;

      // Hanapin ang pinakamalapit na buhay na kalaban
      for (let i = 0; i < currentEng.enemies.length; i++) {
          const e = currentEng.enemies[i];
          if (e.hp <= 0) continue; // Wag pansinin ang mga patay na

          const dist = Math.hypot(e.x - target.x, e.y - target.y);
          if (dist < minDistance) {
              minDistance = dist;
              closestEnemy = e;
          }
      }

      // Kung may kalaban, dun itutok ang skill. Kung wala, gawing random.
      let angle;
      if (closestEnemy) {
          angle = Math.atan2(closestEnemy.y - target.y, closestEnemy.x - target.x);
      } else {
          angle = Math.random() * Math.PI * 2;
      }
      // ----------------------

      const fLength = 800; 
      currentEng.fissures.push({ x: target.x, y: target.y, angle, length: fLength, life: 1.5 });

      // =======================================================
      // 💥 FISSURE SLAM TRAIL DECALS (Linya ng mga basag sa lupa)
      // =======================================================
      if (!currentEng.decals) currentEng.decals = [];
      
      // Gagawa ng lamat kada 60 pixels kasunod ng direksyon ng angle
      for (let dist = 0; dist < fLength; dist += 60) {
        currentEng.decals.push({ 
          x: target.x + Math.cos(angle) * dist, 
          y: target.y + Math.sin(angle) * dist, 
          r: 35 + Math.random() * 20, // Random ang laki para mukhang natural na basag
          life: 6.0, 
          maxLife: 6.0 
        });
      }
      // =======================================================

      const fissureDmg = 150 + ((currentEng.wave || 1) * 15) + ((target.dmg || 0) * 3.0);
      const cosAng = Math.cos(angle);
      const sinAng = Math.sin(angle);

      for (const e of currentEng.enemies) {
        const dx = e.x - target.x, dy = e.y - target.y;
        const proj = dx * cosAng + dy * sinAng; 
        const perp = Math.abs(dx * sinAng - dy * cosAng)
        if (proj > 0 && perp < 60) {
           e.hp -= fissureDmg; 
           window.recordArcaneDamage('Fissure Slam', fissureDmg);
           spawnFCT(currentEng, e.x, e.y, fissureDmg, 'damage', false); // 💥 ADDED FCT
           e.stunnedTime = 5.0;
           e.flash = 0.5;
           if(e.hp <= 0) e.deadTrigger = true;
        }
      }
    } else if (sigilType === 'lightningSurge') {
      target.chatBubble = { text: "LIGHTNING SURGE!", life: 1.5 };
      let pts = [{x: target.x, y: target.y}];
      let current = target;
      let hits = new Set();
      
      const lightningDmg = 200 + ((currentEng.wave || 1) * 20) + ((target.dmg || 0) * 3.5);

      for (let i = 0; i < 8; i++) {
        let best = null, minDistSq = 160000; // ✅ 400 * 400 (Squared max distance)
        for (const e of currentEng.enemies) {
          if (!hits.has(e)) {
            const dx = e.x - current.x;
            const dy = e.y - current.y;
            const distSq = (dx * dx) + (dy * dy); // ✅ MAS MABILIS SA CPU
            if (distSq < minDistSq) { minDistSq = distSq; best = e; }
          }
        }
        if (best) {
          hits.add(best);
          pts.push({x: best.x, y: best.y});
          current = best;
          best.hp -= lightningDmg; 
          window.recordArcaneDamage('Lightning Surge', lightningDmg);
          // 💥 ITO YUNG PARA SA LIGHTNING SURGE (Paso ng kuryente kung saan tinamaan yung kalaban)
          if (!currentEng.decals) currentEng.decals = [];
          currentEng.decals.push({ 
            x: best.x, 
            y: best.y, 
            r: 25, 
            life: 4.0, 
            maxLife: 4.0 
          });
          spawnFCT(currentEng, best.x, best.y, lightningDmg, 'damage', false); // 💥 ADDED FCT
          best.stunnedTime = 1.0;
          best.flash = 0.5;
          if (best.hp <= 0) best.deadTrigger = true;
        } else break;
      }
      if (pts.length > 1) currentEng.lightnings.push({ pts, life: 0.6 });
    }
    
    else if (sigilType === 'iceStorm') {
      target.chatBubble = { text: "ICE STORM!", life: 1.5 };
      currentEng.iceStorms.push({ x: target.x, y: target.y, radius: 250, life: 6.0 });
    }
  };

  const castElementalSigil = (sigilType, forcedTarget = null) => {
    const eng = engineRef.current;
    if (!eng) return;
    const isCoopActive = Boolean(netRef.current && netRef.current.channel);
    let target = (isCoopActive && !netRef.current.isHost) ? eng.p2 : eng.p;
    if (forcedTarget === 'p2') target = eng.p2;
    if (forcedTarget === 'p1') target = eng.p;
    if (!target || target.dead || target.level < 8) return;

    if (!target.skills) target.skills = initSkills();
    if (!target.skills[sigilType]) target.skills[sigilType] = { learned: true, enabled: true, cd: 0 };
    if (target.skills[sigilType].cd > 0) return;

    // 1. I-apply agad ang cooldown para hindi ma-spam habang nag-ca-cast
    target.skills[sigilType].cd = 30.0;

    // 2. 🔥 PLAY ELEMENTAL SOUND EFFECT AGAD
    const sigilSfxMap = {
      flareInferno: 'flare',
      tidalWave: 'wave',
      fissureSlam: 'fissure',
      lightningSurge: 'lightning',
      iceStorm: 'ice'
    };
    if (sigilSfxMap[sigilType]) {
      playSfx(sigilSfxMap[sigilType]);
    }

    // 3. ✨ CASTING INDICATOR: Ipakita na nag-iipon ng energy bago pumutok!
    target.chatBubble = { text: "CHANTING...", life: 4.5 };
    eng.screenShake = 0.1; // Maliit na panginginig ng screen habang nag-chacharge

    // 4. ⏱️ FIX: dt-synced na queue kapalit ng setTimeout.
    //    - Naka-pause-aware: hindi tatakbo habang naka-pause dahil sa dt loop mismo ang nag-de-decrement.
    //    - Walang orphan timers: kapag nag-restart/unmount, sapat lang i-clear ang array, walang
    //      "zombie" na setTimeout na pumuputok pagkatapos matapos ang match.
    //    - Stagger sa sabay-sabay na cast: random jitter (0-150ms) para hindi lahat ng pending
    //      spells sumabog sa EKSAKTONG parehong animation frame kapag pinindot lahat ng 1-6 keys
    //      nang magkakasunod — ito yung dating nagiging lag SPIKE (compressed sa isang frame)
    //      sa halip na steady-state cost.
    if (!eng.pendingSigilCasts) eng.pendingSigilCasts = [];
    eng.pendingSigilCasts.push({
      sigilType,
      target,
      timeLeft: 4.5 + (Math.random() * 0.15) // 4.5s base + hanggang 150ms jitter
    });

    if (isCoopActive && !forcedTarget && !netRef.current.isHost) {
      netRef.current.channel.send('guest_cast_sigil', { sigilType });
    }

    if (target === ((isCoopActive && !netRef.current.isHost) ? eng.p2 : eng.p)) {
      setSkillsState({ ...target.skills });
    }
  };



  const castHealingSigil = (forcedTarget = null) => {
    const eng = engineRef.current;
    if (!eng) return;
    const isCoopActive = Boolean(netRef.current && netRef.current.channel);
    let target = (isCoopActive && !netRef.current.isHost) ? eng.p2 : eng.p;
    if (forcedTarget === 'p2') target = eng.p2;
    if (forcedTarget === 'p1') target = eng.p;
    if (!target || target.dead || target.level < 12) return;

    if (!target.skills) target.skills = initSkills();
    if (!target.skills.natureRecovery) target.skills.natureRecovery = { learned: true, enabled: true, cd: 0 };
    if (target.skills.natureRecovery.cd > 0) return;

    target.skills.natureRecovery.cd = 45.0;

    playSfx('heal');
    target.chatBubble = { text: "NATURE'S RECOVERY!", life: 1.5 };

    // Heal 50% of CURRENT HP (If you want 50% of Max HP instead, change 'target.hp' to 'target.maxHp' in the math below)
    const healAmount = target.maxHp * 0.5;
    target.hp = Math.min(target.maxHp, target.hp + healAmount);
    spawnFCT(eng, target.x, target.y, healAmount, 'heal');

    // Apply Regen Buff for 10 seconds
    if (!target.potBuffs) target.potBuffs = { power: 0, defense: 0, crit: 0, regen: 0, xpBoost: 0 };
    target.potBuffs.regen = 10.0; 

    // Visual Particles
    for (let k = 0; k < 30; k++) {
      const pa = Math.random() * Math.PI * 2;
      const ps = Math.random() * 120 + 30;
      eng.particles.push({
        x: target.x, y: target.y,
        vx: Math.cos(pa) * ps, vy: Math.sin(pa) * ps,
        color: '#22c55e',
        life: 1.5, ml: 1.5, r: Math.random() * 4 + 2
      });
    }

    // Network Sync for Co-op
    if (isCoopActive && !forcedTarget && !netRef.current.isHost) {
      netRef.current.channel.send('guest_cast_healing', {});
    }

    if (target === ((isCoopActive && !netRef.current.isHost) ? eng.p2 : eng.p)) {
      setSkillsState({ ...target.skills });
    }
  };

const castArcaneCollapseUltimate = (forcedTarget = null) => {
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

    playSfx('collapse');

    target.skills.arcaneCollapse.cd = 50.0; 
    eng.screenShake = 2.0; 
    target.chatBubble = { text: "ARCANE COLLAPSE!!!", life: 1.8 };

    if (!eng.collapses) eng.collapses = [];
    
    eng.collapses.push(
      { x: target.x, y: target.y, radius: 10, maxRadius: 1500, life: 3.0, pulseTimer: 0, pulseCount: 0, speed: 2500 },
      { x: target.x, y: target.y, radius: -350, maxRadius: 1500, life: 3.0, pulseTimer: 0, pulseCount: 0, speed: 2500 }
    );
    
    // --- OPTIMIZATION 1: HOISTING ---
    // Pre-calculate everything that DOES NOT change per enemy outside the loop.
    const wave = eng?.wave || 1;
    const playerDmg = target.dmg || 0;
    const basePulseDmg = 400 + (wave * 35) + (playerDmg * 5.0);
    
    let baseMultiplier = 1.0;
    if (target.potBuffs?.power > 0) baseMultiplier *= 1.4; 
    if (target.skills?.arcaneInstinct?.duration > 0) baseMultiplier *= 2.0;

    const totalCritChance = ((target.baseCrit || 0) + (target.potBuffs?.crit > 0 ? 35 : 0)) / 100;
    // --------------------------------

    for (let i = 0; i < eng.enemies.length; i++) {
      const enemy = eng.enemies[i];
      
      // Apply base damage and multiplier, then add enemy-specific multipliers
      let colPulseDmg = basePulseDmg * baseMultiplier;
      if (enemy.instabTime > 0) colPulseDmg *= 1.5;

      const isCrit = Math.random() < totalCritChance;
      if (isCrit) {
        colPulseDmg *= 2;
        enemy.flash = 0.5;
      } else {
        enemy.flash = 0.35;
      }

      enemy.hp -= colPulseDmg;
      spawnFCT(eng, enemy.x, enemy.y, colPulseDmg, 'damage', isCrit); 
      
      enemy.stunnedTime = enemy.boss ? 1.5 : 8.0;     
      enemy.temporalSlowTime = enemy.boss ? 2.0 : 8.0; 
      enemy.arcaneBurnTime = 8.0;
      enemy.voidExhaustTime = 8.0;   
      enemy.instabTime = 8.0;        

      if (enemy.hp <= 0) enemy.deadTrigger = true;
    }

    // --- OPTIMIZATION 2: DYNAMIC PARTICLES & MATH CACHING ---
    // Reduce particle count on smaller screens (mobile) to save rendering & GC overhead
    const isMobile = window.innerWidth <= 768; 
    const particleCount = isMobile ? 40 : 150; 
    const PI2 = Math.PI * 2; // Cache expensive math

    for (let k = 0; k < particleCount; k++) {
      const pa = Math.random() * PI2;
      const ps = Math.random() * 400 + 100;
      eng.particles.push({
        x: target.x, y: target.y,
        vx: Math.cos(pa) * ps, vy: Math.sin(pa) * ps,
        color: Math.random() < 0.5 ? '#d946ef' : '#ffffff',
        life: 0.8, ml: 0.8, r: Math.random() * 4 + 2
      });
    }

    if (isCoopActive && !forcedTarget && !netRef.current.isHost) {
      netRef.current.channel.send('guest_cast_ultimate', {});
    }

    if (target === ((isCoopActive && !netRef.current.isHost) ? eng.p2 : eng.p)) {
      setSkillsState({ ...target.skills });
    }
};

 const castArcaneInstinctUltimate = (forcedTarget = null) => {
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

    playSfx('instinct');

    target.skills.arcaneInstinct.cd = 55.0; 
    target.skills.arcaneInstinct.duration = 15.0; 
    target.skills.arcaneInstinct.autoTimer = 0.5;
    eng.screenShake = 1.2; 

    target.chatBubble = { text: "ARCANE INSTINCT!!!", life: 1.8 };
    
    // 1. Standard FOR loop para mas mabilis kaysa sa for...of
    for (let i = 0; i < eng.enemies.length; i++) {
      eng.enemies[i].stunnedTime = 2.0;
      eng.enemies[i].flash = 0.4;
    }

    // 2. I-cache ang Math.PI * 2 sa labas ng loop
    const PI2 = Math.PI * 2;
    
    for (let k = 0; k < 45; k++) {
      const pa = Math.random() * PI2;
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

    const castArcaneResurrectionUltimate = (forcedTarget = null) => {
    const eng = engineRef.current;
    if (!eng) return;

    const isCoopActive = Boolean(netRef.current && netRef.current.channel);
    
    if (!isCoopActive) {
       if (eng.p) eng.p.chatBubble = { text: "CO-OP ONLY SPELL!", life: 1.5 };
       return;
    }

    let caster = (isCoopActive && !netRef.current.isHost) ? eng.p2 : eng.p;
    let ally = (isCoopActive && !netRef.current.isHost) ? eng.p : eng.p2;

    if (forcedTarget === 'p2') { caster = eng.p2; ally = eng.p; }
    if (forcedTarget === 'p1') { caster = eng.p; ally = eng.p2; }

    if (!caster || caster.dead) return;

    if (isCoopActive && !forcedTarget && !netRef.current.isHost) {
      netRef.current.channel.send('guest_cast_resurrection', {});
    }

    if (!ally || !ally.dead) {
      caster.chatBubble = { text: "ALLY IS NOT DEAD!", life: 1.5 };
      return;
    }

    if (caster.level < 12) {
      caster.chatBubble = { text: "LEVEL TOO LOW!", life: 1.5 };
      return;
    }

    if (!caster.skills) caster.skills = initSkills();
    if (!caster.skills.arcaneResurrection) {
      caster.skills.arcaneResurrection = { learned: true, enabled: true, cd: 0 };
    }
    
    if (caster.skills.arcaneResurrection.cd > 0) return;

    playSfx('revival');

    caster.skills.arcaneResurrection.cd = 300.0;
    caster.level = Math.max(1, caster.level - 1);
    caster.xp = caster.xp / 2;
    eng.screenShake = 1.5;
    caster.chatBubble = { text: "FORBIDDEN: RESURRECTION!!!", life: 2.5 };

    ally.dead = false;
    ally.hp = ally.maxHp * 0.70;
    spawnFCT(eng, ally.x, ally.y, ally.maxHp * 0.70, 'heal'); 
    
    if (!ally.skills) ally.skills = initSkills();
    if (!ally.skills.shield) ally.skills.shield = { learned: true, enabled: true, cd: 0, duration: 0 };
    ally.skills.shield.learned = true;
    ally.skills.shield.duration = 10.0;

    for (let k = 0; k < 60; k++) {
      const pa = Math.random() * Math.PI * 2;
      const ps = Math.random() * 200 + 50;
      eng.particles.push({
        x: ally.x, y: ally.y,
        vx: Math.cos(pa) * ps, vy: Math.sin(pa) * ps,
        color: Math.random() < 0.5 ? '#10b981' : '#fef08a', 
        life: 2.0, ml: 2.0, r: Math.random() * 5 + 2
      });
    }

    if (caster === ((isCoopActive && !netRef.current.isHost) ? eng.p2 : eng.p)) {
      setSkillsState({ ...caster.skills });
      setPlayerLevel(caster.level);
      playerLevelRef.current = caster.level;
    }
};

const runUpgrade = (choice, forcedTarget = null) => {
    const eng = engineRef.current;
    if (!eng || !eng.p) return;
    
    const isCoopActive = Boolean(netRef.current && netRef.current.channel);
    let target = (isCoopActive && !netRef.current.isHost) ? eng.p2 : eng.p;
    if (forcedTarget === 'p2') target = eng.p2;
    if (forcedTarget === 'p1') target = eng.p;
    
    if (!target) return;

    // 🔥 KUNIN ANG CURRENT WAVE AT I-COMPUTE ANG BOOST
    const currentWave = eng.wave || 1;
    const dmgBoost = 14 + Math.floor(currentWave * 1.5);
    const hpBoost = 50 + Math.floor(currentWave * 4.0);
    const spdBoost = 10 + Math.floor(currentWave * 1.2);
    const critBoost = 5 + Math.floor(currentWave * 0.2);
    const defBoost = 4 + Math.floor(currentWave * 0.2);
    const lifestealBoost = 5 + Math.floor(currentWave * 0.2);

    const token = String(choice || '').toLowerCase().trim();
    if (token.includes('hp') || token.includes('vitality') || token.includes('max')) {
      target.maxHp += hpBoost; 
      target.hp = target.maxHp;
    }
    else if (token.includes('damage') || token.includes('might') || token.includes('increase')) {
      target.dmg = (target.dmg || 0) + dmgBoost; 
    }
    else if (token.includes('swift') || token.includes('speed') || token.includes('stride')) {
      const MAX_SPEED = 800;
      target.speed = Math.min(MAX_SPEED, (target.speed || 200) + spdBoost);
    }
    else if (token.includes('rate') || token.includes('rapid') || token.includes('fire')) {
      let newRate = (target.shootRate || 0.6) - 0.1;
      newRate = Math.round(newRate * 10) / 10;
      target.shootRate = Math.max(0.15, newRate);
    }
    else if (token.includes('multi') || token.includes('shot') || token.includes('split')) {
      const MAX_PROJECTILES = 20;
      target.multiShot = Math.min(MAX_PROJECTILES, (target.multiShot || 1) + 1);
    }
    else if (token.includes('crit') || token.includes('fatal') || token.includes('strike')) {
      const MAX_CRIT = 60;
      target.baseCrit = Math.min(MAX_CRIT, (target.baseCrit || 0) + critBoost);
    }
    else if (token.includes('def') || token.includes('armor') || token.includes('plating')) {
      // 🔥 TINANGGAL ANG CAP (UNLIMITED SCALING ARMOR)
      target.baseDef = (target.baseDef || 0) + defBoost; 
    }
    else if (token.includes('vampiric') || token.includes('aura')) {
      target.lifeSteal = (target.lifeSteal || 0) + lifestealBoost; 
    }

    // 🔥 FIX: I-reset lang ang flag, hahayaan na natin ang Global Loop ang mag-trigger sa susunod na level up
    if (forcedTarget === 'p2' && isCoopActive && netRef.current.isHost) {
        target.isLevelingUp = false;
    } else if (target === ((isCoopActive && !netRef.current.isHost) ? eng.p2 : eng.p)) {
        target.isLevelingUp = false;
    }
  };

  const triggerDash = (forcedTarget = null) => {
    const eng = engineRef.current;
    if (!eng || !eng.gameStarted) return;
    const isCoopActive = Boolean(netRef.current && netRef.current.channel);
    let target = (isCoopActive && !netRef.current.isHost) ? eng.p2 : eng.p;
    if (forcedTarget === 'p2') target = eng.p2;
    if (forcedTarget === 'p1') target = eng.p;
    if (!target || target.dead || target.dashCd > 0) return;

    // 💨 Trigger Dash State at I-Frames
    target.isDashing = true;
    target.dashTimer = 0.2; // 200ms dash duration
    target.dashCd = 3.5;    // 3.5s cooldown
    target.inv = 0.3;       // 300ms Invincibility Frame (I-frames)

    let mx = 0, my = 0;
    if (target === eng.p) {
       if (eng.joystick.active) { mx = eng.joystick.mx; my = eng.joystick.my; }
       if (eng.keys['ArrowLeft'] || eng.keys['a'] || eng.keys['A']) mx -= 1;
       if (eng.keys['ArrowRight'] || eng.keys['d'] || eng.keys['D']) mx += 1;
       if (eng.keys['ArrowUp'] || eng.keys['w'] || eng.keys['W']) my -= 1;
       if (eng.keys['ArrowDown'] || eng.keys['s'] || eng.keys['S']) my += 1;
    } else if (target === eng.p2 && isCoopActive && netRef.current.isHost) {
       mx = eng.p2Input.x; my = eng.p2Input.y;
    }

    if (mx === 0 && my === 0) mx = 1; // Kung nakatayo, mag-dash pakanan
    target.dashAngle = Math.atan2(my, mx);

    // Audio Cue
    playSfx('dash'); // Re-use the wind-like sound

    // Sync sa Co-op
    if (isCoopActive && !forcedTarget && !netRef.current.isHost) {
      netRef.current.channel.send('guest_dash', {});
    }
  };

  useEffect(() => {
    window.triggerDash = triggerDash;
    window.learnSkillTreeTech = learnSkillTreeTech;
    window.castArcaneCollapseUltimate = castArcaneCollapseUltimate;
    window.castArcaneInstinctUltimate = castArcaneInstinctUltimate;
    window.castArcaneResurrectionUltimate = castArcaneResurrectionUltimate;
    window.castElementalSigil = castElementalSigil;
    window.castHealingSigil = castHealingSigil;
    window.runUpgrade = runUpgrade;
  }, [netRef]);

  useEffect(() => {
const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const winW = window.visualViewport ? window.visualViewport.width : window.innerWidth;
      const winH = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      
      const sx = (winW - 12) / W;
      const sy = (winH - 12) / H;
      const s = Math.min(sx, sy, 1.8);

      if (winW <= 932) {
        canvas.style.width = winW + 'px';
        canvas.style.height = winH + 'px';
        canvas.style.borderRadius = '0px';
      } else {
        canvas.style.width = Math.round(W * s) + 'px';
        canvas.style.height = Math.round(H * s) + 'px';
        canvas.style.borderRadius = '4px';
      }

      const wrap = document.getElementById('wrap');
      if (wrap) {
        wrap.style.height = `${winH}px`;
      }
    };

    const handleGlobalGuestExit = () => {
      const eng = engineRef.current;
      if (eng) eng.p2 = null; 
      
      setGuestExitedAlert(true); 
      
      setTimeout(() => {
        setGuestExitedAlert(false);
      }, 4000);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('network_guest_exited_trigger', handleGlobalGuestExit);
    
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      window.visualViewport.addEventListener('scroll', handleResize);
    }
    
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('network_guest_exited_trigger', handleGlobalGuestExit);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
        window.visualViewport.removeEventListener('scroll', handleResize);
      }
    };
  }, []);

  const activateAudioKeepAlive = () => {
    if (audioCtxRef.current) return;
    
    // 🔥 Inilipat sa background execution para iwas lag spike
    setTimeout(() => { 
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
      }
    }, 100);
  };;

  // Awtomatikong isasara ang inventory kapag hindi 'playing' ang screen
useEffect(() => {
  if (screen !== 'playing') {
    setIsInventoryOpen(false);
  }
}, [screen]);

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

      if (event === 'host_paused' && !net.isHost) {
        setScreen('pause');
        return;
      }

      if (event === 'host_resumed' && !net.isHost) {
        setScreen('playing');
        return;
      }

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

      if (event === 'guest_exited' && net.isHost) {
        eng.p2 = null;
        return;
      }

      if (event === 'sync_void_crystals' && !net.isHost) {
        const currentBank = parseInt(localStorage.getItem('arcane_void_crystals') || '0', 10);
        localStorage.setItem('arcane_void_crystals', currentBank + payload.amount);
        
        const eng = engineRef.current;
        if (eng && eng.p2) {
           eng.p2.voidCrystals = (eng.p2.voidCrystals || 0) + payload.amount;
        }
      }

      if (event === 'state_sync' && !net.isHost) {
        if (payload.gameStarted !== undefined) {
          eng.gameStarted = payload.gameStarted;
          setHasStarted(payload.gameStarted);
        }

        if (!eng.p) {
          eng.p = { x: W / 3, y: H / 2, r: 16, speed: 200, hp: 100, maxHp: 100, xp: 0, xpNext: 80, level: 1, shootCd: 0, shootRate: 0.6, multiShot: 1, inv: 0, dead: false, dmg: 0, chatBubble: null, name: allyName };
        }
        
        if (payload.p2 && eng.p2 !== null) {
          if (!eng.p2) {
            eng.p2 = { x: W * 2 / 3, y: H / 2, r: 16, speed: 200, hp: 100, maxHp: 100, xp: 0, xpNext: 80, level: 1, shootCd: 0, shootRate: 0.6, multiShot: 1, inv: 0, dead: false, dmg: 0, chatBubble: null, name: playerName };
          }

          if (eng.p2.dead === true && payload.p2.dead === false) {
            for (let k = 0; k < 60; k++) {
              const pa = Math.random() * Math.PI * 2;
              const ps = Math.random() * 200 + 50;
              eng.particles.push({
                x: payload.p2.x, y: payload.p2.y,
                vx: Math.cos(pa) * ps, vy: Math.sin(pa) * ps,
                color: Math.random() < 0.5 ? '#10b981' : '#fef08a', 
                life: 2.0, ml: 2.0, r: Math.random() * 5 + 2
              });
            }
          }

          eng.p2.hp = payload.p2.hp;
          eng.p2.maxHp = payload.p2.maxHp;
          eng.p2.dead = payload.p2.dead;
          eng.p2.inv = payload.p2.inv ?? eng.p2.inv;
          eng.p2.dmg = payload.p2.dmg ?? eng.p2.dmg;
          eng.p2.shootRate = payload.p2.shootRate ?? eng.p2.shootRate;

          eng.p2.speed = payload.p2.speed ?? eng.p2.speed;
          eng.p2.baseCrit = payload.p2.baseCrit ?? eng.p2.baseCrit;
          eng.p2.baseDef = payload.p2.baseDef ?? eng.p2.baseDef;
          eng.p2.multiShot = payload.p2.multiShot ?? eng.p2.multiShot;
          if (payload.p2.chatBubble !== undefined) {
              eng.p2.chatBubble = payload.p2.chatBubble;
          }
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
          voidExhaustTime: e.voidExhaustTime || 0, instabTime: e.instabTime || 0,
          type: e.type, nameTag: e.nameTag, abyssShieldTimer: e.abyssShieldTimer || 0
        }));
        eng.gems = (payload.gems || []).map(g => ({ x: g.x, y: g.y, r: g.r, xp: g.xp, life: g.life }));
        eng.bullets = (payload.bullets || []).map(b => ({ x: b.x, y: b.y, vx: b.vx, vy: b.vy, r: b.r, life: b.life, p2: b.p2, isEnemy: b.isEnemy, dmg: b.dmg }));
        eng.potions = (payload.potions || []).map(p => ({ x: p.x, y: p.y, r: p.r, type: p.type, life: p.life }));
        eng.collapses = (payload.collapses || []).map(c => ({ x: c.x, y: c.y, radius: c.radius, maxRadius: c.maxRadius, life: c.life, speed: c.speed }));
        
        eng.tornados = payload.tornados || [];
        eng.waves = payload.waves || [];
        eng.fissures = payload.fissures || [];
        eng.lightnings = payload.lightnings || [];
        eng.iceStorms = payload.iceStorms || [];
        
        eng.score = payload.score ?? eng.score;
        eng.wave = payload.wave ?? eng.wave;
        eng.waveT = payload.waveT ?? eng.waveT;
        eng.waveLen = payload.waveLen ?? eng.waveLen;
        eng.boltDmg = payload.boltDmg ?? eng.boltDmg;
        eng.screenShake = payload.screenShake ?? eng.screenShake;

        if (payload.bossIntro !== undefined) eng.bossIntro = payload.bossIntro;
        if (payload.showVictoryCinematic !== undefined && payload.showVictoryCinematic > 0) {
            window.showVictoryCinematic = payload.showVictoryCinematic;
        }

        if (payload.p1) eng.p1Target = payload.p1;
        if (payload.p2) eng.p2Target = payload.p2;
        
        if (payload.p1 && eng.p) {

          if (eng.p.dead === true && payload.p1.dead === false) {
            for (let k = 0; k < 60; k++) {
              const pa = Math.random() * Math.PI * 2;
              const ps = Math.random() * 200 + 50;
              eng.particles.push({
                x: payload.p1.x, y: payload.p1.y,
                vx: Math.cos(pa) * ps, vy: Math.sin(pa) * ps,
                color: Math.random() < 0.5 ? '#10b981' : '#fef08a', 
                life: 2.0, ml: 2.0, r: Math.random() * 5 + 2
              });
            }
          }

          eng.p.hp = payload.p1.hp;
          eng.p.maxHp = payload.p1.maxHp;
          eng.p.dead = payload.p1.dead;
          eng.p.dmg = payload.p1.dmg ?? eng.p.dmg;
          eng.p.shootRate = payload.p1.shootRate ?? eng.p.shootRate;

          eng.p.speed = payload.p1.speed ?? eng.p.speed;
          eng.p.baseCrit = payload.p1.baseCrit ?? eng.p.baseCrit;
          eng.p.baseDef = payload.p1.baseDef ?? eng.p.baseDef;
          eng.p.multiShot = payload.p1.multiShot ?? eng.p.multiShot;
          eng.p.hasContinued = payload.p1.hasContinued ?? eng.p.hasContinued;

          eng.p.x = payload.p1.x;
          eng.p.y = payload.p1.y;
          eng.p.chatBubble = payload.p1.chatBubble;
          eng.p.name = payload.p1.name || allyName;

          if (payload.p1_skills) eng.p.skills = payload.p1_skills;
          if (payload.p1_potBuffs) eng.p.potBuffs = payload.p1_potBuffs;
          eng.p.level = payload.p1_level || eng.p.level;
          eng.p.xp = payload.p1_xp || eng.p.xp;
          eng.p.xpNext = payload.p1_xpNext || eng.p.xpNext;
        }

        if (eng.p2) {
          setPlayerLevel(eng.p2.level);
          playerLevelRef.current = eng.p2.level;
          if (eng.p2.skills) setSkillsState({ ...eng.p2.skills });
        } else if (eng.p) {
          setPlayerLevel(eng.p.level);
          playerLevelRef.current = eng.p.level;
          if (eng.p.skills) setSkillsState({ ...eng.p.skills });
        }
      }
      
      if (event === 'guest_input' && net.isHost) {
        eng.p2Input = payload || { x: 0, y: 0 };
      }

      if (event === 'guest_dash' && net.isHost) {
        if (window.triggerDash) window.triggerDash('p2');
      }

      if (event === 'guest_levelup_choice' && net.isHost) {
        runUpgrade(payload.choice, 'p2');
      }

      if (event === 'guest_learned_skill' && net.isHost) {
        learnSkillTreeTech(payload.skillId, 'p2');
      }

      if (event === 'guest_cast_ultimate' && net.isHost) {
        castArcaneCollapseUltimate('p2');
      }

      if (event === 'guest_cast_instinct' && net.isHost) {
        castArcaneInstinctUltimate('p2');
      }
      
      if (event === 'guest_cast_resurrection' && net.isHost) {
        castArcaneResurrectionUltimate('p2');
      }

      if (event === 'guest_cast_sigil' && net.isHost) {
        castElementalSigil(payload.sigilType, 'p2');
      }

      if (event === 'guest_cast_healing' && net.isHost) {
        castHealingSigil('p2');
      }
      
      if (event === 'offer_levelup' && !net.isHost) {
        onLevelUpOffer(payload.ups);
        setScreen('levelup');
      }

 // 🔥 NEW: Catching Host Continuing
      if (event === 'host_player_continued' && !net.isHost) {
        if (eng.p) {
          eng.p.dead = false;
          eng.p.hp = eng.p.maxHp;
          eng.p.inv = 4.0; // Gawin nating 4.0 para parehas sa main logic
          eng.p.hasContinued = true; // 🔥 LOCK
          
          // 🔥 SYNC ANG VISUAL SHIELD SA GUEST SCREEN
          if (!eng.p.skills) eng.p.skills = initSkills();
          if (!eng.p.skills.shield) eng.p.skills.shield = { learned: true, enabled: true, cd: 0, duration: 0 };
          eng.p.skills.shield.learned = true;
          eng.p.skills.shield.duration = 4.0;

          if (window.ArcaneSoundManager) window.ArcaneSoundManager.play('revival');
          for (let k = 0; k < 60; k++) {
            const pa = Math.random() * Math.PI * 2;
            const ps = Math.random() * 200 + 50;
            eng.particles.push({
              x: eng.p.x, y: eng.p.y,
              vx: Math.cos(pa) * ps, vy: Math.sin(pa) * ps,
              color: '#d946ef', life: 2.0, ml: 2.0, r: Math.random() * 5 + 2
            });
          }
        }
      }

      // 🔥 NEW: Catching Guest Continuing
      if (event === 'guest_player_continued' && net.isHost) {
        if (eng.p2) {
          eng.p2.dead = false;
          eng.p2.hp = eng.p2.maxHp;
          eng.p2.inv = 4.0; // Gawin nating 4.0
          eng.p2.hasContinued = true; // 🔥 LOCK
          
          // 🔥 SYNC ANG VISUAL SHIELD SA HOST SCREEN
          if (!eng.p2.skills) eng.p2.skills = initSkills();
          if (!eng.p2.skills.shield) eng.p2.skills.shield = { learned: true, enabled: true, cd: 0, duration: 0 };
          eng.p2.skills.shield.learned = true;
          eng.p2.skills.shield.duration = 4.0;

          if (window.ArcaneSoundManager) window.ArcaneSoundManager.play('revival');
          for (let k = 0; k < 60; k++) {
            const pa = Math.random() * Math.PI * 2;
            const ps = Math.random() * 200 + 50;
            eng.particles.push({
              x: eng.p2.x, y: eng.p2.y,
              vx: Math.cos(pa) * ps, vy: Math.sin(pa) * ps,
              color: '#d946ef', life: 2.0, ml: 2.0, r: Math.random() * 5 + 2
            });
          }
        }
      }

      // Ito yung original na susundan:
      if (event === 'game_over') {
        setScreen('gameover');
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
       setTimeout(() => {
           net.channel.send('restart_game', {}); 
           setScreen('playing');
        }, 1000);
      }
    }
  }, [p1VotedRestart, p2VotedRestart, setScreen, netRef]);

  // 🔮 useLayoutEffect (HINDI useEffect): kailangan ma-commit ang
  // isPreloading=true BAGO mag-paint ang browser ng bagong frame. Yung
  // canvas ay laging naka-mount at tuloy-tuloy gumagawa (rAF loop), kaya
  // kung useEffect lang ito (na async/pagkatapos ng paint), may 1+ frame
  // na "nakakalusot" kung saan screen === 'playing' na pero isPreloading
  // ref/state ay hindi pa updated — dito nanggagaling yung "nakikita ng
  // mabilis ang laro" bago pa lumabas ang LoadingScreen. Sa
  // useLayoutEffect, naka-sync ito sa parehong commit/paint cycle.
  useLayoutEffect(() => {
    const eng = engineRef.current;

    if (screen === 'playing') {
      if (eng.gameStarted && eng.p && !eng.p.dead) {
        return;
      }
    }

    if (screen === 'menu' || screen === 'lobby' || screen === 'playing') {
      setP1VotedRestart(false);
      setP2VotedRestart(false);
      setPlayerLevel(1);
      playerLevelRef.current = 1;
      setIsTreeOpen(true); 
      setSkillsState(initSkills());
      setActiveBuffsList([]);
      buffPeakDurationRef.current = {};
      if (exitTimerRef.current) clearInterval(exitTimerRef.current);
      setHostExitedCountdown(null);

      const isCoopActive = Boolean(netRef.current && netRef.current.channel);
      
      eng.score = 0; eng.wave = 1; eng.waveT = 0; eng.waveLen = 30; eng.spawnT = 0; eng.spawnRate = 0.9; eng.boltDmg = 22; eng.screenShake = 0;
      eng.bullets = []; eng.enemies = []; eng.particles = []; eng.gems = [];
      eng.slashes = []; eng.cubeBashes = []; eng.stars = []; eng.collapses = []; eng.potions = [];
      eng.tornados = []; eng.waves = []; eng.fissures = []; eng.lightnings = []; eng.iceStorms = [];
      eng.floatingTexts = [];
      eng.pendingSigilCasts = []; // 🔥 FIX: i-clear ang mga "chanting" pa sa restart, para walang spell na pumutok pagkatapos mag-reset
      eng.cachedPoolWave = undefined; eng.cachedScaleWave = undefined; // ⚡ FIX: i-force ang re-compute ng spawn cache sa unang spawn ng bagong match
      eng.gameStarted = false; 
      setHasStarted(false);

      // 🔮 Bagong simula ng laro (fresh start o restart pagkatapos ng
      // gameover) → ipakita ulit ang LoadingScreen bago lumabas ang
      // "MOVE TO START" prompt. Direktang i-set ang ref dito (hindi lang
      // ang state) para walang 1-render-delay na puwang kung saan pwedeng
      // makapasok ang isang movement tick bago ma-sync ang ref sa bagong
      // state — ito mismo ang dating dahilan kung bakit minsan "nakakalusot"
      // ang paggalaw sa simula pa lang ng loading screen.
      isPreloadingRef.current = true;
      setIsPreloading(true);

      // 🔥 RESET DAMAGE TRACKER FOR NEW RUN
      window.arcaneDamageMetrics = {}; 
      window.arcaneDamageTaken = 0; 
      
      // 👇 DAGDAG ITO PARA SA MGA UTILITY PETS (HEAL, SHIELD, LOOT)
      window.arcaneUtilityMetrics = { 'Fairy Heal': 0, 'Light Shield': 0, 'Voidling Loot': 0 };
      window.recordArcaneUtility = (type, amount) => {
        if (!window.arcaneUtilityMetrics[type]) window.arcaneUtilityMetrics[type] = 0;
        window.arcaneUtilityMetrics[type] += amount;
      };

      window.recordArcaneDamage = (source, amount) => {
        if (isNaN(amount) || amount <= 0) return;
        if (!window.arcaneDamageMetrics[source]) window.arcaneDamageMetrics[source] = 0;
        window.arcaneDamageMetrics[source] += amount;
      };

      const eqFamsStr = localStorage.getItem('arcane_equipped_familiars');
      let eqFamsArray = [];
      if (eqFamsStr) {
         eqFamsArray = JSON.parse(eqFamsStr);
      } else {
         const old = localStorage.getItem('arcane_equipped_familiar');
         if (old && old !== 'none') eqFamsArray = [old];
      }
      const famLevels = JSON.parse(localStorage.getItem('arcane_familiar_levels') || '{}');

      const initFamiliarsObjArray = eqFamsArray.map(id => ({ 
        id: id, level: famLevels[id] || 1, 
        x: isCoopActive ? W / 3 : W / 2, y: H / 2, cd: 0 
      }));

      // 🟢 ADD THIS BEFORE eng.p = { ... }
      const metaUpgrades = JSON.parse(localStorage.getItem('arcane_upgrades') || '{}');
      const myEquippedSkin = localStorage.getItem('arcane_equipped_skin') || 'default';
      const bonusHp = (metaUpgrades.hp || 0) * 15;
      const bonusDmg = (metaUpgrades.dmg || 0) * 3;
      const bonusDef = (metaUpgrades.def || 0) * 2;
      const bonusCrit = (metaUpgrades.crit || 0) * 1;
      const bonusSpeed = (metaUpgrades.speed || 0) * 5;

      eng.droppedItems = [];
      eng.p = { 
      // 🟢 UPDATE THESE VALUES IN YOUR eng.p INITIALIZATION
      x: isCoopActive ? W / 3 : W / 2, y: H / 2, r: 16, 
      skin: myEquippedSkin,
      speed: 200 + bonusSpeed,                // <-- Updated
      hp: 100 + bonusHp,                      // <-- Updated
      maxHp: 100 + bonusHp,                   // <-- Updated
      xp: 0, xpNext: 80, level: 1, shootCd: 0, shootRate: 0.6, multiShot: 1, inv: 0, dead: false, 
      dmg: 0 + bonusDmg,                      // <-- Updated
      baseDef: 0 + bonusDef,                  // <-- Added
      baseCrit: 0 + bonusCrit,                // <-- Added
      voidCrystals: 0,                        // <-- Added tracker
      hasContinued: false,
      chatBubble: null,
      familiars: initFamiliarsObjArray,
      dashCd: 0, isDashing: false, dashTimer: 0, dashAngle: 0, // 💨 DINAGDAG PARA SA DASH
      skills: initSkills(), 
      potBuffs: { power: 0, defense: 0, crit: 0, regen: 0, xpBoost: 0 },
      name: netRef.current?.isHost ? playerName : allyName,
      inventory: [],
      equipment: { wand: null, robe: null, boots: null }
      };

      eng.p1Target = { x: eng.p.x, y: eng.p.y, hp: 100, maxHp: 100, inv: 0, dead: false };
      eng.p1Render = { x: eng.p.x, y: eng.p.y };

      if (isCoopActive) {
        eng.p2 = { x: W * 2 / 3, y: H / 2, r: 16, speed: 200, hp: 100, maxHp: 100, xp: 0, xpNext: 80, level: 1, shootCd: 0, shootRate: 0.6, multiShot: 1, inv: 0, dead: false, dmg: 0,
        hasContinued: false,
        chatBubble: null, skills: initSkills(), potBuffs: { power: 0, defense: 0, crit: 0, regen: 0, xpBoost: 0 },
        name: netRef.current?.isHost ? allyName : playerName
        };
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

    window.executeNetworkPauseAction = () => {
      const net = netRef.current;
      if (net && net.channel && net.isHost) {
        setScreen('pause');
        net.channel.send('host_paused', {});
      }
    };

    window.executeNetworkResumeAction = () => {
      const net = netRef.current;
      const isCoopActive = Boolean(net && net.channel);

      setScreen('playing');
      if (isCoopActive && net.isHost) {
        net.channel.send('host_resumed', {});
      }
    };

    

    window.executeNetworkExitAction = () => {
      const net = netRef?.current;
      const isCoopActive = Boolean(net && net.channel);

      if (isCoopActive) {
        try {
          if (net.isHost) {
            net.channel.send('host_exited', {});
          } else {
            net.channel.send('guest_exited', {});
          }
        } catch (err) {}
      }

      setTimeout(() => {
        if (workerRef.current) {
          workerRef.current.postMessage('stop');
        }
        setScreen('menu');
      }, 100);
    };

    window.executeContinueAction = () => {
      const eng = engineRef.current;
      const net = netRef.current || {};
      const isCoopActive = Boolean(net.channel);
      const isHost = Boolean(net.isHost) || !isCoopActive;

      const localTarget = (isCoopActive && !isHost) ? eng.p2 : eng.p;

      if (localTarget) {
        localTarget.dead = false;
        localTarget.hp = localTarget.maxHp;
        localTarget.inv = 4.0; // Invincibility window to avoid immediate death
        localTarget.hasContinued = true;

        // 🔥 IDAGDAG ITO: I-trigger ang visual Shield skill na tatagal ng 4 seconds
        if (!localTarget.skills) localTarget.skills = initSkills();
        if (!localTarget.skills.shield) localTarget.skills.shield = { learned: true, enabled: true, cd: 0, duration: 0 };
        localTarget.skills.shield.learned = true;
        localTarget.skills.shield.duration = 4.0;

        if (window.ArcaneSoundManager) window.ArcaneSoundManager.play('revival');
        for (let k = 0; k < 60; k++) {
          const pa = Math.random() * Math.PI * 2;
          const ps = Math.random() * 200 + 50;
          eng.particles.push({
            x: localTarget.x, y: localTarget.y,
            vx: Math.cos(pa) * ps, vy: Math.sin(pa) * ps,
            color: '#d946ef', 
            life: 2.0, ml: 2.0, r: Math.random() * 5 + 2
          });
        }
      }

      // Tell the other player we continued our run
      if (isCoopActive) {
        if (isHost) {
          net.channel.send('host_player_continued', {});
        } else {
          net.channel.send('guest_player_continued', {});
        }
      }
    };

  }, [p1VotedRestart, p2VotedRestart, setScreen, netRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = W; canvas.height = H;
    const eng = engineRef.current;

    // ═══════════════════════════════════════════════════════════════════
    // VOID / FRIEREN MMORPG MAP — Pre-baked static layer + live particles
    // All heavy drawing done ONCE at init → single drawImage() per frame
    // ═══════════════════════════════════════════════════════════════════

    // ── HELPER: seeded pseudo-random (deterministic per-tile) ──────────
    const seededRand = (seed) => {
      let s = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
      return s - Math.floor(s);
    };

    // ── 1. FLOOR — multi-variant stone tiles, every tile uniquely seeded ──
    // (Frieren-style ancient dungeon floor. No single tile is ever repeated
    //  identically — each cell gets its own hue jitter, crack layout, joint
    //  shape and stain placement, so the floor reads as worn natural
    //  flagstone instead of an obviously copy-pasted grid.)
    const TILE = 160;
    const cols = Math.ceil(W / TILE) + 1;
    const rows = Math.ceil(H / TILE) + 1;
    const fc = document.createElement('canvas');
    fc.width = W; fc.height = H;
    const fx = fc.getContext('2d');

    const drawStoneTile = (g, px, py, s, seed) => {
      const rnd = (n) => seededRand(seed * 91.7 + n * 13.3);
      g.save();
      g.translate(px, py);
      g.beginPath(); g.rect(0, 0, s, s); g.clip();

      // A. Darker ancient stone base — every tile gets its own hue/brightness
      // jitter so adjacent tiles never read as identical copies.
      const jitter = rnd(1) * 10 - 5;
      const warmShift = rnd(2) * 8 - 4;
      const base = g.createLinearGradient(0, 0, s, s);
      base.addColorStop(0,    `rgb(${24+warmShift+jitter},${20+jitter},${16+jitter})`);
      base.addColorStop(0.5,  `rgb(${17+jitter},${14+jitter},${11+jitter})`);
      base.addColorStop(1,    `rgb(${10+jitter},${8+jitter},${6+jitter})`);
      g.fillStyle = base;
      g.fillRect(0, 0, s, s);

      // Subtle worn-center variation
      const stoneVar = g.createRadialGradient(s*0.5, s*0.5, 0, s*0.5, s*0.5, s*0.62);
      stoneVar.addColorStop(0,   `rgba(60,50,40,${0.16 + rnd(3)*0.10})`);
      stoneVar.addColorStop(0.55,'rgba(20,16,13,0.14)');
      stoneVar.addColorStop(1,   'rgba(0,0,0,0.40)');
      g.fillStyle = stoneVar; g.fillRect(0, 0, s, s);

      // Fine stone grain noise — count varies per tile
      const grainN = 16 + Math.floor(rnd(4) * 14);
      for (let gi = 0; gi < grainN; gi++) {
        const gx = rnd(gi*7.3+5) * s, gy = rnd(gi*11.7+6) * s;
        const ga = rnd(gi*3.1+7) * 0.05 + 0.01;
        const gr = rnd(gi*5.9+8) * 4.5 + 1.5;
        const grainG = g.createRadialGradient(gx, gy, 0, gx, gy, gr);
        const isLight = rnd(gi*17.3+9) > 0.5;
        grainG.addColorStop(0, isLight ? `rgba(90,76,60,${ga*2})` : `rgba(4,3,2,${ga*2.2})`);
        grainG.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grainG; g.fillRect(gx-gr, gy-gr, gr*2, gr*2);
      }

      // B. Irregular flagstone joints — wavy hand-cut lines, not a clean grid.
      // Drawn faint + jittered so two adjacent tiles never line up into an
      // obvious repeating rectangle.
      if (rnd(11) > 0.2) {
        g.strokeStyle = `rgba(2,2,1,${0.30 + rnd(10)*0.18})`;
        g.lineWidth = 1.2 + rnd(12)*1.2;
        g.beginPath();
        let jx = 0, jy = rnd(13) * s * 0.4;
        g.moveTo(jx, jy);
        for (let i = 0; i < 4; i++) { jx += s/4; jy += (rnd(14+i)-0.5)*14; g.lineTo(jx, jy); }
        g.stroke();
      }
      if (rnd(20) > 0.2) {
        g.strokeStyle = `rgba(2,2,1,${0.28 + rnd(20.5)*0.16})`;
        g.lineWidth = 1.0 + rnd(21)*1.1;
        g.beginPath();
        let jx2 = rnd(22) * s * 0.4, jy2 = 0;
        g.moveTo(jx2, jy2);
        for (let i = 0; i < 4; i++) { jy2 += s/4; jx2 += (rnd(23+i)-0.5)*14; g.lineTo(jx2, jy2); }
        g.stroke();
      }
      // Faint warm catch-light on a random edge (keeps a hint of directionality
      // without forming a uniform lit-border grid)
      g.strokeStyle = `rgba(80,68,54,${0.06 + rnd(24)*0.07})`;
      g.lineWidth = 0.7;
      g.beginPath();
      if (rnd(25) > 0.5) { g.moveTo(2, s-2); g.lineTo(2, 2); g.lineTo(s-2, 2); }
      else { g.moveTo(s-2, 2); g.lineTo(s-2, s-2); g.lineTo(2, s-2); }
      g.stroke();

      // C. Cracks — count + shape + glow color randomized per tile, so the
      // floor never shows the same fracture pattern twice.
      const crackCount = 1 + Math.floor(rnd(30) * 2.2);
      for (let c = 0; c < crackCount; c++) {
        const sx = rnd(31+c*9)*s, sy = rnd(32+c*9)*s;
        let cx2 = sx, cy2 = sy, a2 = rnd(33+c*9)*Math.PI*2;
        const pts = [[cx2, cy2]];
        const segs = 3 + Math.floor(rnd(34+c)*3);
        for (let i = 0; i < segs; i++) {
          a2 += (rnd(35+c*5+i) - 0.5) * 1.3;
          cx2 += Math.cos(a2) * (s*0.12);
          cy2 += Math.sin(a2) * (s*0.12);
          pts.push([cx2, cy2]);
        }
        const drawPath = () => { g.beginPath(); pts.forEach(([px2,py2],i)=> i===0?g.moveTo(px2,py2):g.lineTo(px2,py2)); };
        g.strokeStyle = 'rgba(3,2,1,0.75)'; g.lineWidth = 1.5; drawPath(); g.stroke();
        // Glow core — brighter than before so cracks actually read as glowing in the dark
        const isPurple = rnd(36+c) > 0.55;
        g.shadowBlur = 7;
        g.shadowColor = isPurple ? 'rgba(150,90,230,0.55)' : 'rgba(215,170,65,0.55)';
        g.strokeStyle = isPurple
          ? `rgba(160,110,235,${0.22 + rnd(37+c)*0.16})`
          : `rgba(210,165,65,${0.24 + rnd(38+c)*0.16})`;
        g.lineWidth = 0.9; drawPath(); g.stroke();
        g.shadowBlur = 0;
      }

      // D. Age stains — moisture damage / mineral deposits, randomized count+spot
      const stainCount = 1 + Math.floor(rnd(40) * 2.2);
      for (let st = 0; st < stainCount; st++) {
        const bx = rnd(41+st*7)*s, by = rnd(42+st*7)*s, br = 6 + rnd(43+st)*11;
        const warm = rnd(44+st) > 0.5;
        const sg = g.createRadialGradient(bx,by,0,bx,by,br);
        sg.addColorStop(0, warm ? `rgba(55,36,16,${0.14+rnd(45+st)*0.08})` : `rgba(0,0,0,${0.22+rnd(46+st)*0.12})`);
        sg.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = sg; g.fillRect(bx-br, by-br, br*2, br*2);
      }

      // E. Sparse rubble chip — only some tiles get one, never in a fixed spot
      if (rnd(50) > 0.72) {
        const rr = 3 + rnd(51)*3.5;
        const rx = rnd(52)*s, ry = rnd(53)*s, rot = rnd(54)*Math.PI*2;
        g.save(); g.translate(rx,ry); g.rotate(rot);
        g.fillStyle = 'rgba(0,0,0,0.32)';
        g.beginPath(); g.ellipse(0.8,0.8,rr*1.1,rr*0.7,0,0,Math.PI*2); g.fill();
        g.beginPath();
        g.moveTo(-rr,-rr*0.3); g.lineTo(-rr*0.2,-rr); g.lineTo(rr*0.8,-rr*0.4);
        g.lineTo(rr*0.7,rr*0.6); g.lineTo(-rr*0.6,rr*0.5); g.closePath();
        g.fillStyle = 'rgba(40,32,24,0.8)'; g.fill();
        g.strokeStyle = 'rgba(90,74,55,0.4)'; g.lineWidth = 0.6; g.stroke();
        g.restore();
      }

      // F. Very rare worn rune fragment — echoes the central seal's lost script,
      // appears on maybe 1 in 8 tiles so it feels discovered, not stamped.
      if (rnd(60) > 0.87) {
        const arx = rnd(61)*s*0.6 + s*0.2, ary = rnd(62)*s*0.6 + s*0.2;
        const a0 = rnd(63)*Math.PI*2;
        g.strokeStyle = 'rgba(190,150,60,0.18)';
        g.shadowBlur = 4; g.shadowColor = 'rgba(190,150,60,0.4)';
        g.lineWidth = 0.8;
        g.beginPath();
        g.arc(arx, ary, 13 + rnd(64)*8, a0, a0 + Math.PI*0.85);
        g.stroke();
        g.shadowBlur = 0;
      }

      g.restore();
    };

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        drawStoneTile(fx, c * TILE, r * TILE, TILE, r * cols + c + 1);
      }
    }

    eng.floorBaked = fc;


    // ── 2. STATIC FULL-SCREEN LAYER — baked ONCE, blitted per frame ────
    // Contains: large crack clusters, mana veins, central arcane seal
    const sbc = document.createElement('canvas');
    sbc.width = W; sbc.height = H;
    const sbx = sbc.getContext('2d');

    // A. Large crack clusters scattered across arena
    const bigCracks = [
      // [startX, startY, angle, length, segments, alpha]
      [W*0.12, H*0.18, 0.55, 180, 7, 0.18],
      [W*0.82, H*0.14, -0.3, 140, 6, 0.14],
      [W*0.25, H*0.72, 0.8,  160, 6, 0.16],
      [W*0.70, H*0.80, -0.6, 150, 6, 0.15],
      [W*0.48, H*0.35, 1.1,  120, 5, 0.12],
      [W*0.90, H*0.55, 0.2,  130, 5, 0.13],
      [W*0.05, H*0.45, -0.9, 100, 5, 0.11],
      [W*0.60, H*0.08, 0.4,  110, 4, 0.10],
    ];

    bigCracks.forEach(([sx,sy,ang,len,segs,al]) => {
      sbx.save();
      // Physical stone crack shadow (dark, wide)
      sbx.strokeStyle = `rgba(5,3,2,${al*3.0})`;
      sbx.lineWidth = 2.2;
      sbx.beginPath();
      let cx2=sx, cy2=sy, a2=ang;
      sbx.moveTo(cx2,cy2);
      const segLen = len/segs;
      for(let i=0;i<segs;i++){
        a2 += (seededRand(sx+i*13.7+sy)*0.9-0.45);
        cx2 += Math.cos(a2)*segLen*(0.7+seededRand(sy+i*7.3)*0.6);
        cy2 += Math.sin(a2)*segLen*(0.7+seededRand(sx+i*5.1)*0.6);
        sbx.lineTo(cx2,cy2);
        if(i===Math.floor(segs/2)){
          const ba = a2+(seededRand(sx+i)*1.2-0.6);
          const blen = segLen*(0.5+seededRand(sy+i*3.3)*0.8);
          sbx.moveTo(cx2,cy2);
          sbx.lineTo(cx2+Math.cos(ba)*blen, cy2+Math.sin(ba)*blen);
          sbx.moveTo(cx2,cy2);
        }
      }
      sbx.stroke();
      // Gold-amber magic glow core bleeding through crack
      sbx.strokeStyle = `rgba(200,155,50,${al*0.90})`;
      sbx.lineWidth = 0.8;
      sbx.stroke();
      // Purple arcane halo on crack (residual enchantment)
      sbx.strokeStyle = `rgba(150,100,240,${al*0.55})`;
      sbx.lineWidth = 2.5;
      sbx.globalAlpha = 0.5;
      sbx.stroke();
      sbx.globalAlpha = 1.0;
      sbx.restore();
    });

    // B. Mana vein network radiating from near-center — gold-purple hybrid
    const veinOrigins = [
      [W*0.42, H*0.50], [W*0.58, H*0.48], [W*0.50, H*0.38]
    ];
    veinOrigins.forEach(([vx,vy]) => {
      for(let v=0;v<6;v++){
        const vAng = (v/6)*Math.PI*2 + seededRand(vx+v)*0.5;
        const vLen = 90 + seededRand(vy+v*7)*110;
        sbx.save();
        // Dark crack under the vein
        sbx.strokeStyle = 'rgba(4,2,1,0.30)';
        sbx.lineWidth = 1.2;
        sbx.beginPath();
        let vxc=vx, vyc=vy, va=vAng;
        sbx.moveTo(vxc,vyc);
        for(let s=0;s<5;s++){
          va += (seededRand(vx+v*3+s)*0.6-0.3);
          vxc += Math.cos(va)*(vLen/5);
          vyc += Math.sin(va)*(vLen/5);
          sbx.lineTo(vxc,vyc);
        }
        sbx.stroke();
        // Gold-purple magic glow in vein
        sbx.strokeStyle = v % 2 === 0 ? 'rgba(190,145,45,0.14)' : 'rgba(109,40,217,0.11)';
        sbx.lineWidth = 0.7;
        sbx.stroke();
        sbx.restore();
      }
    });

    // C. Central arcane seal — an ancient, BROKEN magic circle (Frieren-style
    // forgotten grimoire mark). Gold-dominant, genuinely glowing, and
    // deliberately incomplete: gaps in the rings, a crack through the middle,
    // and a few of its surrounding runes worn away by time.
    const seal = { x: W*0.5, y: H*0.5 };
    sbx.save();
    sbx.translate(seal.x, seal.y);

    // Centuries of grime, soot and scorch stains baked into the stone around
    // the seal — sells the "forgotten, abused ruin" read before any rings are drawn
    const GRIME_SPOTS = [
      [-72,-58,36],[64,-74,28],[88,42,32],[-94,32,30],[12,86,24],[-34,-92,22],[40,2,18]
    ];
    GRIME_SPOTS.forEach(([gx,gy,gr], gi) => {
      const grimeGrad = sbx.createRadialGradient(gx,gy,0,gx,gy,gr);
      grimeGrad.addColorStop(0, `rgba(8,6,4,${0.32 + seededRand(gi*3.3)*0.16})`);
      grimeGrad.addColorStop(1, 'rgba(8,6,4,0)');
      sbx.fillStyle = grimeGrad;
      sbx.beginPath(); sbx.arc(gx,gy,gr,0,Math.PI*2); sbx.fill();
    });

    // Helper: stroke a ring but leave random gaps in it — sells the "broken seal" read
    const brokenRing = (radius, gapCount, color, width, glowColor, glowBlur) => {
      const gaps = [];
      for (let i = 0; i < gapCount; i++) {
        const ga = seededRand(radius*3.1 + i*7.7) * Math.PI * 2;
        const gw = 0.10 + seededRand(radius*5.3 + i*2.1) * 0.20;
        gaps.push([ga, ga + gw]);
      }
      const inGap = (a) => gaps.some(([g0, g1]) => {
        let aa = a; while (aa < g0) aa += Math.PI * 2;
        return aa < g1;
      });
      sbx.save();
      sbx.strokeStyle = color; sbx.lineWidth = width;
      if (glowColor) { sbx.shadowColor = glowColor; sbx.shadowBlur = glowBlur; }
      const steps = 160;
      let drawing = false;
      sbx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        if (inGap(a)) { drawing = false; continue; }
        const x = Math.cos(a) * radius, y = Math.sin(a) * radius;
        if (!drawing) { sbx.moveTo(x, y); drawing = true; }
        else sbx.lineTo(x, y);
      }
      sbx.stroke();
      sbx.restore();
    };

    // Shattered fragments — broken-off pieces of the containment ring, scattered
    // just outside it like shards that fell and never got swept away
    for (let i = 0; i < 6; i++) {
      const fa = seededRand(i*17.3) * Math.PI * 2;
      const fr = 100 + seededRand(i*22.1) * 24;
      const flen = 0.10 + seededRand(i*9.7) * 0.09;
      sbx.save();
      sbx.translate(Math.cos(fa)*fr, Math.sin(fa)*fr);
      sbx.rotate(fa + Math.PI/2 + (seededRand(i*5.5)-0.5)*0.6);
      sbx.strokeStyle = 'rgba(205,160,65,0.32)';
      sbx.lineWidth = 1.8;
      sbx.shadowColor = 'rgba(205,160,65,0.5)'; sbx.shadowBlur = 6;
      sbx.beginPath();
      sbx.arc(0, 0, 9 + seededRand(i*7.1)*6, 0, flen * Math.PI * 2);
      sbx.stroke();
      sbx.restore();
    }

    // Outer ring — broken gold containment band, glowing
    brokenRing(96, 3, 'rgba(225,180,80,0.55)', 2.2, 'rgba(225,180,80,0.9)', 14);
    brokenRing(96, 3, 'rgba(255,225,150,0.28)', 0.8, null, 0);
    // Middle ring — thinner, broken at different points than the outer ring
    brokenRing(68, 2, 'rgba(205,160,65,0.42)', 1.5, 'rgba(205,160,65,0.6)', 9);
    // Inner ring — mostly intact, the seal's last surviving "core" — cooler purple
    sbx.save();
    sbx.strokeStyle = 'rgba(155,110,235,0.32)';
    sbx.lineWidth = 1.0;
    sbx.shadowColor = 'rgba(155,110,235,0.6)'; sbx.shadowBlur = 10;
    sbx.beginPath(); sbx.arc(0, 0, 40, 0, Math.PI*2); sbx.stroke();
    sbx.restore();

    // Jagged inner ward spikes — an aggressive, claw-like accent ringing the core,
    // reading as the seal's last line of defense rather than a polite decoration
    sbx.save();
    sbx.beginPath();
    const wardSpikes = 10;
    for (let i = 0; i < wardSpikes; i++) {
      const sa = (i / wardSpikes) * Math.PI * 2;
      const outR = i % 2 === 0 ? 31 : 19;
      const px = Math.cos(sa) * outR, py = Math.sin(sa) * outR;
      if (i === 0) sbx.moveTo(px, py); else sbx.lineTo(px, py);
    }
    sbx.closePath();
    sbx.strokeStyle = 'rgba(225,180,80,0.22)';
    sbx.lineWidth = 0.8;
    sbx.shadowColor = 'rgba(225,180,80,0.45)'; sbx.shadowBlur = 6;
    sbx.stroke();
    sbx.restore();

    // 6-pointed rune star — also weathered unevenly (gold edge brighter than purple edge)
    [0,1].forEach(t => {
      sbx.beginPath();
      for (let i = 0; i < 3; i++) {
        const sa = (i/3)*Math.PI*2 + t*(Math.PI/3) - Math.PI/2;
        const sx2 = Math.cos(sa)*68, sy2 = Math.sin(sa)*68;
        if (i===0) sbx.moveTo(sx2,sy2); else sbx.lineTo(sx2,sy2);
      }
      sbx.closePath();
      sbx.strokeStyle = t === 0 ? 'rgba(225,180,80,0.24)' : 'rgba(150,105,235,0.16)';
      sbx.lineWidth = 0.8;
      sbx.stroke();
    });

    // Ancient runic script ringing the seal — real Elder Futhark glyphs, gold,
    // glowing — with several missing/faded to read as old and incomplete
    const SEAL_RUNES = ['ᚠ','ᚢ','ᚦ','ᚨ','ᚱ','ᚲ','ᚷ','ᚹ','ᚺ','ᚾ','ᛁ','ᛃ','ᛇ','ᛈ','ᛉ','ᛊ','ᛏ','ᛒ','ᛖ','ᛗ','ᛚ','ᛜ','ᛝ','ᛟ'];
    sbx.font = '13px serif';
    sbx.textAlign = 'center';
    sbx.textBaseline = 'middle';
    const runeRadius = 112;
    SEAL_RUNES.forEach((rune, i) => {
      const worn = seededRand(i*9.13) > 0.78; // some glyphs have eroded away entirely
      if (worn) return;
      const a = (i / SEAL_RUNES.length) * Math.PI * 2 - Math.PI/2;
      const rx = Math.cos(a) * runeRadius, ry = Math.sin(a) * runeRadius;
      const fade = 0.35 + seededRand(i*4.71) * 0.45;
      sbx.save();
      sbx.translate(rx, ry);
      sbx.rotate(a + Math.PI/2);
      sbx.shadowColor = 'rgba(230,190,90,0.9)';
      sbx.shadowBlur = 9;
      sbx.fillStyle = `rgba(230,190,100,${fade})`;
      sbx.fillText(rune, 0, 0);
      sbx.restore();
    });

    // The fracture that broke the seal — a physical crack cutting across it
    sbx.strokeStyle = 'rgba(5,3,2,0.55)';
    sbx.lineWidth = 2;
    sbx.beginPath();
    sbx.moveTo(-100,-30); sbx.lineTo(-50,-10); sbx.lineTo(-10,-40);
    sbx.lineTo(30,-5); sbx.lineTo(90,25);
    sbx.stroke();
    sbx.strokeStyle = 'rgba(225,180,80,0.28)';
    sbx.lineWidth = 0.8;
    sbx.beginPath();
    sbx.moveTo(-100,-30); sbx.lineTo(-50,-10); sbx.lineTo(-10,-40);
    sbx.lineTo(30,-5); sbx.lineTo(90,25);
    sbx.stroke();

    // Secondary splinter crack — a smaller branch off the main break, the kind
    // of detail that sells real structural failure instead of a single clean line
    sbx.strokeStyle = 'rgba(5,3,2,0.42)';
    sbx.lineWidth = 1.3;
    sbx.beginPath();
    sbx.moveTo(-10,-40); sbx.lineTo(-26,-64); sbx.lineTo(-16,-86);
    sbx.stroke();
    sbx.strokeStyle = 'rgba(150,100,240,0.22)';
    sbx.lineWidth = 0.6;
    sbx.stroke();

    // Center ember — the last spark of power still left in the broken seal
    sbx.shadowColor = 'rgba(225,180,80,0.85)'; sbx.shadowBlur = 13;
    sbx.fillStyle = 'rgba(230,195,110,0.6)';
    sbx.beginPath(); sbx.arc(0,0,4,0,Math.PI*2); sbx.fill();

    sbx.restore();

    // D. Scattered small rune glyphs (partial) around the arena
    const runeSpots = [
      [W*0.15,H*0.25,18,0.10], [W*0.85,H*0.30,14,0.09],
      [W*0.20,H*0.78,16,0.08], [W*0.78,H*0.72,15,0.09],
      [W*0.50,H*0.15,12,0.07], [W*0.50,H*0.88,12,0.07],
    ];
    runeSpots.forEach(([rx,ry,rr,ra]) => {
      sbx.save(); sbx.translate(rx,ry);
      sbx.strokeStyle = `rgba(109,40,217,${ra})`;
      sbx.lineWidth = 0.7;
      // Partial arc
      sbx.beginPath(); sbx.arc(0,0,rr, Math.PI*0.2, Math.PI*1.4); sbx.stroke();
      sbx.beginPath(); sbx.arc(0,0,rr*0.6, Math.PI*0.8, Math.PI*2.0); sbx.stroke();
      // Cross mark
      sbx.beginPath();
      sbx.moveTo(-rr*0.4,0); sbx.lineTo(rr*0.4,0);
      sbx.moveTo(0,-rr*0.4); sbx.lineTo(0,rr*0.4);
      sbx.stroke();
      sbx.restore();
    });

    // E. BROKEN SLAB PATCHES — large sunken/shattered floor sections,
    // like whole stone slabs that caved in or were blasted apart.
    // Kept clear of dead-center (player spawn / seal) so they read as
    // environmental detail, not obstacles in the main fight zone.
    const slabPatches = [
      { x: W*0.16, y: H*0.62, w: 110, h: 70, rot: -0.25 },
      { x: W*0.86, y: H*0.22, w: 95,  h: 60, rot: 0.35 },
      { x: W*0.10, y: H*0.15, w: 80,  h: 55, rot: 0.15 },
      { x: W*0.92, y: H*0.78, w: 100, h: 65, rot: -0.4 },
    ];
    slabPatches.forEach(({x,y,w,h,rot}) => {
      sbx.save();
      sbx.translate(x,y); sbx.rotate(rot);
      // Sunken depth shadow (broad, soft)
      const slabShadow = sbx.createRadialGradient(0,0,0,0,0, Math.max(w,h)*0.65);
      slabShadow.addColorStop(0,'rgba(0,0,0,0.35)');
      slabShadow.addColorStop(0.7,'rgba(0,0,0,0.16)');
      slabShadow.addColorStop(1,'rgba(0,0,0,0)');
      sbx.fillStyle = slabShadow;
      sbx.fillRect(-w*0.7,-h*0.7,w*1.4,h*1.4);

      // Jagged broken outline (irregular polygon, not a clean rectangle)
      const jag = (n, rx, ry) => {
        const pts = [];
        for (let i=0;i<n;i++){
          const ang = (i/n)*Math.PI*2;
          const jr = 0.78 + seededRand(x+y+i*9.1)*0.3;
          pts.push([Math.cos(ang)*rx*jr, Math.sin(ang)*ry*jr]);
        }
        return pts;
      };
      const slabPts = jag(9, w*0.5, h*0.5);
      sbx.beginPath();
      slabPts.forEach(([px,py],i)=> i===0 ? sbx.moveTo(px,py) : sbx.lineTo(px,py));
      sbx.closePath();
      sbx.fillStyle = 'rgba(2,1,8,0.45)';
      sbx.fill();
      // Lit broken-edge rim (light catching the fracture lip)
      sbx.strokeStyle = 'rgba(150,100,220,0.16)';
      sbx.lineWidth = 1.2;
      sbx.stroke();

      // A few thin secondary fractures radiating from the slab
      sbx.strokeStyle = 'rgba(120,60,200,0.13)';
      sbx.lineWidth = 0.7;
      for (let i=0;i<3;i++){
        const fa = seededRand(x+i*4.4)*Math.PI*2;
        const flen = (w+h)*0.22;
        sbx.beginPath();
        sbx.moveTo(Math.cos(fa)*w*0.4, Math.sin(fa)*h*0.4);
        sbx.lineTo(Math.cos(fa)*(w*0.4+flen), Math.sin(fa)*(h*0.4+flen));
        sbx.stroke();
      }
      sbx.restore();
    });

    // F. RUBBLE PILES — small clusters of broken stone debris resting in
    // the open floor, each chip independently shaded for a 3D-ish read.
    const rubblePiles = [
      { x: W*0.34, y: H*0.85, n: 6, spread: 26 },
      { x: W*0.66, y: H*0.12, n: 5, spread: 22 },
      { x: W*0.06, y: H*0.40, n: 4, spread: 18 },
      { x: W*0.95, y: H*0.45, n: 5, spread: 20 },
      { x: W*0.40, y: H*0.06, n: 4, spread: 16 },
      // ── extra piles for a denser, more lived-in arena floor ──
      { x: W*0.20, y: H*0.50, n: 5, spread: 20 },
      { x: W*0.78, y: H*0.62, n: 4, spread: 18 },
      { x: W*0.55, y: H*0.92, n: 5, spread: 22 },
      { x: W*0.88, y: H*0.08, n: 4, spread: 16 },
      { x: W*0.12, y: H*0.92, n: 4, spread: 18 },
    ];
    rubblePiles.forEach(({x,y,n,spread}) => {
      for (let i=0;i<n;i++){
        const ang = seededRand(x+i*3.3)*Math.PI*2;
        const dist = seededRand(y+i*5.7)*spread;
        const cx = x + Math.cos(ang)*dist;
        const cy = y + Math.sin(ang)*dist*0.6; // squash for floor perspective
        const cr = 3 + seededRand(x+y+i*7.1)*5;
        const crot = seededRand(x*2+i)*Math.PI*2;

        sbx.save();
        sbx.translate(cx,cy); sbx.rotate(crot);
        // contact shadow
        sbx.fillStyle = 'rgba(0,0,0,0.35)';
        sbx.beginPath(); sbx.ellipse(1.2,1.6,cr*1.15,cr*0.72,0,0,Math.PI*2); sbx.fill();
        // chip body — warm dark stone, irregular hexagon
        sbx.beginPath();
        sbx.moveTo(-cr,-cr*0.3);
        sbx.lineTo(-cr*0.2,-cr);
        sbx.lineTo(cr*0.8,-cr*0.4);
        sbx.lineTo(cr*0.9,cr*0.5);
        sbx.lineTo(0,cr*0.9);
        sbx.lineTo(-cr*0.8,cr*0.4);
        sbx.closePath();
        sbx.fillStyle = 'rgba(50,38,28,0.82)'; // warm dark stone
        sbx.fill();
        // Moonlit edge highlight (warm light from top)
        sbx.strokeStyle = 'rgba(100,82,60,0.40)';
        sbx.lineWidth = 0.7;
        sbx.stroke();
        // Tiny warm highlight catching directional moonlight
        sbx.fillStyle = 'rgba(130,108,78,0.18)';
        sbx.beginPath(); sbx.ellipse(-cr*0.3,-cr*0.35,cr*0.38,cr*0.22,0,0,Math.PI*2); sbx.fill();
        sbx.restore();
      }
    });

    // G. SCATTERED GLINTING DEBRIS — sparse loose shards (broken weapon
    // fragments, rune-glass splinters) catching a faint glow. Independent
    // of the rubble piles so debris reads as spread across the whole floor,
    // not just clumped in corners.
    const glintShards = Array.from({ length: 22 }, (_, i) => ({
      x: seededRand(i*17.3 + 1) * W,
      y: seededRand(i*23.9 + 2) * H,
      len: 5 + seededRand(i*11.1 + 3) * 7,
      rot: seededRand(i*7.7 + 4) * Math.PI * 2,
      gold: seededRand(i*5.5 + 5) > 0.5,
    }));
    glintShards.forEach(({x,y,len,rot,gold}) => {
      sbx.save();
      sbx.translate(x,y); sbx.rotate(rot);
      // shard silhouette
      sbx.beginPath();
      sbx.moveTo(-len*0.5, -1.1);
      sbx.lineTo(len*0.5, -0.3);
      sbx.lineTo(len*0.42, 1.0);
      sbx.lineTo(-len*0.45, 0.6);
      sbx.closePath();
      sbx.fillStyle = 'rgba(35,28,20,0.7)';
      sbx.fill();
      // thin glowing edge — sells "broken enchanted metal/glass" read
      sbx.strokeStyle = gold ? 'rgba(225,190,110,0.5)' : 'rgba(160,120,230,0.45)';
      sbx.shadowColor = gold ? 'rgba(225,190,110,0.7)' : 'rgba(160,120,230,0.65)';
      sbx.shadowBlur = 3;
      sbx.lineWidth = 0.6;
      sbx.beginPath(); sbx.moveTo(-len*0.5,-1.1); sbx.lineTo(len*0.5,-0.3); sbx.stroke();
      sbx.restore();
    });

    // H. HAIRLINE SPIDERWEB CRACKS — a finer, denser fracture network layered
    // over the big cracks so no two regions of the floor share the exact
    // same break pattern. Radiates from small random impact points instead
    // of running straight, for a more "shattered glass / aged stone" feel.
    const webOrigins = Array.from({ length: 7 }, (_, i) => ({
      x: seededRand(i*31.1 + 9) * W,
      y: seededRand(i*19.7 + 8) * H,
      arms: 5 + Math.floor(seededRand(i*13.3 + 6) * 3),
      reach: 26 + seededRand(i*9.9 + 7) * 30,
    }));
    webOrigins.forEach(({x,y,arms,reach}) => {
      sbx.save();
      for (let a = 0; a < arms; a++) {
        const baseAng = (a / arms) * Math.PI * 2 + seededRand(x+a*4.4)*0.6;
        let cx2 = x, cy2 = y, ang2 = baseAng;
        const segs = 3;
        sbx.beginPath(); sbx.moveTo(cx2, cy2);
        for (let s = 0; s < segs; s++) {
          ang2 += (seededRand(x+y+a*5+s*2.2) - 0.5) * 0.8;
          cx2 += Math.cos(ang2) * (reach/segs);
          cy2 += Math.sin(ang2) * (reach/segs);
          sbx.lineTo(cx2, cy2);
        }
        sbx.strokeStyle = 'rgba(4,2,1,0.30)';
        sbx.lineWidth = 0.8;
        sbx.stroke();
        sbx.strokeStyle = 'rgba(190,150,70,0.10)';
        sbx.lineWidth = 0.5;
        sbx.stroke();
      }
      sbx.restore();
    });

    eng.staticBg = sbc;

    // ── 3. AMBIENT PARTICLES: 4-tier void ecosystem ────────────────────

    // Tier A — small drifting rune sparks (warm gold + purple hybrid)
    const ambs_sparks = Array.from({ length: 36 }, () => ({
      kind: 'spark',
      x: Math.random()*W, y: Math.random()*H,
      r: Math.random()*1.1+0.3,
      vx: (Math.random()-0.5)*13,
      vy: -(Math.random()*20+5),
      a: Math.random()*0.5+0.2,
      t: Math.random(),
      c: ['#c4b5fd','#fbbf24','#e9d5ff','#fcd34d','#a78bfa','#f59e0b','#818cf8'][Math.floor(Math.random()*7)]
    }));

    // Tier B — large slow void orbs
    const ambs_orbs = Array.from({ length: 9 }, () => ({
      kind: 'orb',
      x: Math.random()*W, y: Math.random()*H,
      r: Math.random()*16+9,
      vx: (Math.random()-0.5)*5,
      vy: -(Math.random()*5+1.5),
      a: Math.random()*0.042+0.016,
      t: Math.random()*0.7+0.3,
      phase: Math.random()*Math.PI*2,
      c: ['#6d28d9','#4c1d95','#7c3aed','#5b21b6'][Math.floor(Math.random()*4)]
    }));

    // Tier C — horizontal mist wisps
    const ambs_wisps = Array.from({ length: 6 }, () => ({
      kind: 'wisp',
      x: Math.random()*W, y: Math.random()*H,
      w: Math.random()*140+70,
      h: Math.random()*7+3,
      vx: (Math.random()-0.5)*7,
      vy: (Math.random()-0.5)*3,
      a: Math.random()*0.038+0.01,
      t: Math.random()*0.8+0.2,
      phase: Math.random()*Math.PI*2,
    }));

    // Tier D — rune ember cross-sparks (gold + purple mix)
const ambs_embers = Array.from({ length: 32 }, () => ({ // dati 14, ngayon 32
  kind: 'ember',
  x: Math.random() * W,
  y: Math.random() * H,
  r: Math.random() * 3.5 + 2.0,        // dati 2.5+1.5, mas malalaki
  vx: (Math.random() - 0.5) * 4,       // konting hina ng horizontal drift
  vy: -(Math.random() * 7 + 2),        // mas mabagal paakyat para mas matagal kita
  a: Math.random() * 0.4 + 0.4,        // dati 0.45+0.15 (~0.15–0.6), ngayon ~0.4–0.8
  t: Math.random(),
  rot: Math.random() * Math.PI,
  c: ['#fbbf24','#a78bfa','#f59e0b','#c4b5fd','#fcd34d','#7c3aed'][Math.floor(Math.random() * 6)],
}));

    // Tier E — fine drifting dust motes (ground-haze, barely visible until
    // a light source — moonlight shaft or the player's own glow — passes
    // over them, which is what actually sells "dusty ancient dungeon air")
const ambs_dust = Array.from({ length: 110 }, () => ({ // dati 55, doble na
  kind: 'dust',
  x: Math.random() * W,
  y: Math.random() * H,
  r: Math.random() * 1.8 + 0.8,       // dati 1.0+0.4, mas malalaki ng konti
  vx: (Math.random() - 0.5) * 5,      // mas mabagal, hindi agad nagdi-disperse
  vy: (Math.random() - 0.5) * 4,
  a: Math.random() * 0.3 + 0.25,      // dati 0.16+0.04, ngayon ~0.25–0.55
  phase: Math.random() * Math.PI * 2,
}));

    // Tier F — soft drifting smoke/fog clouds. Kept deliberately sparse and
    // low-opacity (just enough volume to add depth/atmosphere) — large, slow,
    // ash-grey blobs that gently roll across the floor without ever reading
    // as a flat fog layer or hiding the floor detail underneath.
    const ambs_smoke = Array.from({ length: 16 }, () => ({
  kind: 'smoke',
  x: Math.random() * W,
  y: Math.random() * H,
  r: Math.random() * 80 + 70,          // mas malaki yung clouds
  vx: (Math.random() - 0.5) * 5,
  vy: (Math.random() - 0.5) * 3,
  a: Math.random() * 0.07 + 0.05,      // mas mataas base opacity
  phase: Math.random() * Math.PI * 2,
  driftSeed: Math.random() * 100,
}));

    eng.ambs = [...ambs_sparks, ...ambs_orbs, ...ambs_wisps, ...ambs_embers, ...ambs_dust, ...ambs_smoke];

    let lastTime = performance.now();
    let renderAnimId;
    let syncTimer = 0;
    let lastReactSync = 0;

      const rollUpgradeOptions = (playerObj) => {
      // ✅ Nilagay dito ang 4 na upgrades para laging available (walang cap)
      let pool = ['Vitality', 'Arcane Might', 'Vampiric Aura', 'Iron Plating']; 

      if (playerObj) {
        // I-add lang sa pool kung HINDI PA sagad sa cap
        if ((playerObj.shootRate || 0.6) > 0.151) pool.push('Rapid Fire');
        if ((playerObj.multiShot || 1) < 20) pool.push('Gain Multi-Shot');
        if ((playerObj.speed || 200) < 800) pool.push('Swift Stride');
        if ((playerObj.baseCrit || 0) < 60) pool.push('Fatal Strike');

      } else {

        pool.push('Rapid Fire', 'Gain Multi-Shot', 'Swift Stride', 'Fatal Strike');
      }

      return pool.sort(() => 0.5 - Math.random()).slice(0, 3);
    };

    // 🔥 NEW: GLOBAL REROLL FUNCTION
    window.requestLevelUpReroll = () => {
      const eng = engineRef.current;
      const net = netRef.current || {};
      const isCoopActive = Boolean(net.channel);
      const localTarget = (isCoopActive && !net.isHost) ? eng.p2 : eng.p;
      
      const newUps = rollUpgradeOptions(localTarget);
      onLevelUpOffer(newUps);
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
      
      if (screenRef.current === 'pause') {
        return;
      }

      if (eng.bossIntro && eng.bossIntro.active) {
        eng.bossIntro.timer--;
        if (eng.bossIntro.timer <= 0) eng.bossIntro.active = false;
        
        // 🔥 FIX: I-update ang UI Text manually para hindi i-reset ng React sa "Wave 1" at "100 HP"
        const net = netRef.current || {};
        const isCoopActive = Boolean(net.channel);
        const isHost = Boolean(net.isHost) || !isCoopActive;
        const localTarget = (isCoopActive && !isHost) ? eng.p2 : eng.p;
        
        if (scoreValueRef.current) scoreValueRef.current.textContent = formatLargeNumber(eng.score);
        if (waveValueRef.current) {
          const timeRem = Math.max(0, Math.ceil(eng.waveLen - eng.waveT));
          waveValueRef.current.textContent = `WAVE ${eng.wave} | ${timeRem}s`;
        }
        if (localTarget) {
          const hpPct = Math.max(0, Math.min(100, (localTarget.hp / localTarget.maxHp) * 100));
          if (hpFillRef.current) hpFillRef.current.style.width = `${hpPct}%`;
          if (hpTextRef.current) hpTextRef.current.textContent = `HP ${formatLargeNumber(Math.max(0, localTarget.hp))}/${formatLargeNumber(localTarget.maxHp)}`;
          
          const xpPct = Math.max(0, Math.min(100, (localTarget.xp / localTarget.xpNext) * 100));
          if (xpFillRef.current) xpFillRef.current.style.width = `${xpPct}%`;
          if (xpTextRef.current) xpTextRef.current.textContent = `XP ${formatLargeNumber(localTarget.xp)}/${formatLargeNumber(localTarget.xpNext)}`;
        }

        return; // Hihinto ang main physics/gameplay logic, pero updated at naka-freeze ang UI mo sa tamang values!
      }

// 🔥 FIX: Pause ALL gameplay logic during the Victory Cinematic
      if (window.showVictoryCinematic && window.showVictoryCinematic > 0) {
        window.showVictoryCinematic -= dt;
        
        // Kapag eksaktong natapos na ang cinematic timer (zero na)
        if (window.showVictoryCinematic <= 0) {
            window.showVictoryCinematic = 0; // I-lock sa 0 para di mag-negative
            
            // 🔥 DITO PAPASOK ANG POST-BOSS BGM
            if (window.arcaneAudio && window.arcaneAudio.postBossBgm) {
                if (window.arcaneAudio.postBossBgm.paused) {
                    // 1. Patayin ang lahat ng existing na BGM
                    window.arcaneAudio.stopAllBgm(); 
                    
                    // 2. 🚨 PINAKAMAHALAGA: I-update ang global state flags para alam ng App.jsx!
                    window.arcaneAudio.isBossActive = false; 
                    window.arcaneAudio.isPostBossActive = true; 

                    // 3. I-play ang kanta (kung hindi naka-mute ang player)
                    if (!window.arcaneAudio.isMuted) {
                        window.arcaneAudio.postBossBgm.volume = 1.0; // (Optional) lakas ng sounds
                        window.arcaneAudio.postBossBgm.play().catch(e => console.warn("Audio play blocked:", e));
                    }
                }
            }
        } else {
            return; // Freezes everything except the rendering text
        }
      }

      if (screenRef.current === 'playing' || screenRef.current === 'levelup') {
        let mx = 0, my = 0;

        if (eng.joystick.active) {
          mx = eng.joystick.mx;
          my = eng.joystick.my;
        }

        if (eng.keys['ArrowLeft'] || eng.keys['a'] || eng.keys['A']) mx -= 1;
        if (eng.keys['ArrowRight'] || eng.keys['d'] || eng.keys['D']) mx += 1;
        if (eng.keys['ArrowUp'] || eng.keys['w'] || eng.keys['W']) my -= 1;
        if (eng.keys['ArrowDown'] || eng.keys['s'] || eng.keys['S']) my += 1;
        const ml = Math.hypot(mx, my);
        if (ml > 1) { mx /= ml; my /= ml; }

        // NORMAL SPAWN LOGIC (UNCOMMENT BELOW TO ENABLE NORMAL SPAWNING)
        if (!eng.gameStarted && !isPreloadingRef.current && (mx !== 0 || my !== 0)) {
          if (isHost) {
            eng.gameStarted = true;
            // 🔥 LAG FIX: I-defer ang setHasStarted ng 16ms (isang frame) para
            // hindi ma-block ang unang movement tick ng player.
            // Ang overlay ay nakalagay na sa DOM (hindi mag-u-unmount), visibility lang
            // ang magbabago — kaya mabilis ang re-render kahit may setState.
            setTimeout(() => {
              setHasStarted(true);
            }, 16);
          }
        }

        if (eng.screenShake > 0) {
          eng.screenShake -= dt;
        }

        // 💥 FCT PHYSICS LOOP
        if (eng.floatingTexts) {
          for (let i = eng.floatingTexts.length - 1; i >= 0; i--) {
            const ft = eng.floatingTexts[i];
            ft.life -= dt;
            ft.y -= ft.vy * dt; // Float up
            ft.vy *= 0.92;      // Unti-unting babagal ang pag-angat
            if (ft.life <= 0) eng.floatingTexts.splice(i, 1);
          }
        }

if (eng.gameStarted) {
        // 1. Detect if The Abyss or Primordial is currently on the map
        const isMajorBossAlive = eng.enemies.some(e => e.boss && (e.type === 'abyss' || e.type === 'primordial' || e.type === 'abyss_awakened'));

        const isCinematicPlaying = eng.bossIntro && eng.bossIntro.active;
        const isBossEncounterActive = isMajorBossAlive || isCinematicPlaying;

        // 2. Handle Boss Music Transitions via App.jsx's Global Audio
        if (isMajorBossAlive && !eng.wasMajorBossAlive) {
            // Boss appeared!
            // 🔥 SAFETY LOCK: Tutugtog lang sa umpisa kung hindi pa ito tumutugtog
            if (window.arcaneAudio && !window.arcaneAudio.isBossActive) { 
                window.arcaneAudio.isBossActive = true; 
                if (!window.arcaneAudio.isMuted) {
                    window.arcaneAudio.gameBgm.pause();
                    window.arcaneAudio.bossBgm.currentTime = 0; // Umpisahan sa simula ang boss music
                    window.arcaneAudio.bossBgm.play().catch(()=>{});
                }
            }
        } else if (!isMajorBossAlive && eng.wasMajorBossAlive) {
            // Boss defeated!
            if (window.arcaneAudio) {
                window.arcaneAudio.isBossActive = false;
                if (!window.arcaneAudio.isMuted) {
                    window.arcaneAudio.bossBgm.pause();
                    window.arcaneAudio.gameBgm.play().catch(()=>{}); // Ituloy kung saan huminto ang normal game music
                }
            }
        }
        eng.wasMajorBossAlive = isMajorBossAlive;

        // 3. Pause Wave & Spawns
        if (!isMajorBossAlive) {
            eng.waveT += dt;
            eng.spawnT += dt;
        }

    if (!isCoopActive || isHost) {

// 🔥 MEMORY PROTECTION: Bawal mag-spawn ng normal minion kung lagpas 40 na ang kalaban sa screen
          if (eng.spawnT >= eng.spawnRate && eng.enemies.length < 40) {
              eng.spawnT = 0;
              
              // 🔥 PACED SWARM SCALING: Dahan-dahang bibilis hanggang Wave 45 (0.20s extreme cap)
              eng.spawnRate = Math.max(0.20, 2 - (eng.wave * 0.04));
              
              // 🔥 MINI-BOSS INCLUSION: Paunti-unting idadagdag ang mga malalakas na minions
              // ⚡ FIX: Ang array pool mismo ang cina-cache (hindi pinapalitan ng if/else chain
              // ng percentages), para zero risk na magbago ang drop-rate distribution. Kino-compute
              // lang ulit ito kapag nagbago ang wave — hindi kada spawn (5x/sec sa late game).
              if (eng.cachedPoolWave !== eng.wave) {
                  eng.cachedPoolWave = eng.wave;
                  let pool = [0];
                  if (eng.wave >= 2) pool = [0, 1];
                  if (eng.wave >= 4) pool = [0, 1, 2];
                  if (eng.wave >= 10) pool = [0, 1, 2, 2];
                  if (eng.wave >= 15) pool = [0, 1, 2, 2, 3];
                  eng.cachedSpawnPool = pool;
              }
              const ti = eng.cachedSpawnPool[Math.floor(Math.random() * eng.cachedSpawnPool.length)];
              const t = ET[ti]; 
              
              const side = Math.floor(Math.random() * 4); 
              let ex, ey;
              if (side === 0) { ex = Math.random() * W; ey = -30; }
              else if (side === 1) { ex = W + 30; ey = Math.random() * H; }
              else if (side === 2) { ex = Math.random() * W; ey = H + 30; }
              else { ex = -30; ey = Math.random() * H; }

              // ⚡ FIX: MATH CACHING — Math.pow() (3x dati) at ang ENDLESS SOFT-CAP scaling ay
              // kino-compute lang ISANG BESES kapag nagbago ang wave, hindi kada spawn.
              // 🎯 BALANCE: Wave 1-100 (designed na difficulty papunta sa final boss) ay
              // BYTE-IDENTICAL sa lumang formula — walang nagbabago dito. Pasado Wave 100
              // (endless mode), pinapagaan lang ang exponential terms (Math.pow 1.5 sa HP,
              // squared term sa DMG) para hindi sumabog ang numbers nang sobra-sobra sa
              // matagal na endless runs, pero patuloy pa ring tumataas ang difficulty
              // (hindi flat/stuck) — kalahati lang ng dating bilis ng pagtaas ng exponent base.
              if (eng.cachedScaleWave !== eng.wave) {
                  eng.cachedScaleWave = eng.wave;
                  const waveScale = Math.max(0, eng.wave - 1);
                  const ENDLESS_START = 100;

                  let hpExpBase = waveScale;
                  let dmgExpBase = waveScale;
                  if (eng.wave > ENDLESS_START) {
                      const excess = eng.wave - ENDLESS_START;
                      hpExpBase = Math.max(waveScale * 0.4, waveScale - (excess * 0.5));
                      dmgExpBase = Math.max(waveScale * 0.4, waveScale - (excess * 0.5));
                  }

                  eng.cachedWaveScale = waveScale;
                  eng.cachedDiffScale = Math.pow(1.025, Math.max(0, eng.wave - 30));
                  eng.cachedHpPowTerm = Math.pow(hpExpBase, 1.5) * 5;
                  eng.cachedDmgSqTerm = dmgExpBase * dmgExpBase * 0.05;
                  eng.cachedSpeedAdd = Math.min(250, waveScale * 2.5);
                  eng.cachedXpMult = Math.pow(1.08, waveScale);
              }

              // Apply cached math (parehong resulta sa Wave 1-100, mas controlled sa 101+)
              const calculatedHp = Math.floor((t.hp + (eng.cachedWaveScale * 35) + eng.cachedHpPowTerm) * eng.cachedDiffScale);
              const calculatedDmg = Math.floor((t.dmg + (eng.cachedWaveScale * 3) + eng.cachedDmgSqTerm) * eng.cachedDiffScale);

              eng.enemies.push({ 
                 x: ex, y: ey, r: t.r, 
                 speed: t.speed + eng.cachedSpeedAdd,
                 hp: calculatedHp, 
                 maxHp: calculatedHp, 
                 dmg: calculatedDmg, 
                 xp: Math.floor(t.xp * eng.cachedXpMult),
                 color: t.color, glow: t.glow, boss: t.boss, type: t.type, flash: 0, stunnedTime: 0, stigmaTime: 0, temporalSlowTime: 0, arcaneBurnTime: 0, voidExhaustTime: 0, instabTime: 0 
              });
          }

              if (eng.waveT >= eng.waveLen) {
              eng.waveT = 0;
              eng.wave++;
              eng.waveLen = Math.max(15, 30 - eng.wave * 0.8);
// =========================================================
            // 🟢 ADVANCED PROGRESSIVE BOSS SPAWN SYSTEM (SURE BALL SPAWN)
            // =========================================================
            const currentWave = eng.wave || 1;

            // Wag isama ang 'miniBoss' sa bilang para hindi pumigil sa main bosses
            const activeBosses = eng.enemies.filter(e => e.boss && e.type !== 'miniBoss').length;

            // 🔥 I-check kung Major Boss Wave na ba (50, 75, 100, at mga susunod na +10, +20, +25 waves)
            const isMajorBossWave = currentWave === 50 || 
                                    currentWave === 75 || 
                                    currentWave === 100 || 
                                    (currentWave > 100 && (currentWave % 10 === 0 || currentWave % 20 === 0 || currentWave % 25 === 0));

            // I-bypass ang limit na < 5 kung Major Boss Wave na para sure ball ang labas
            if (activeBosses < 5 || isMajorBossWave) {
                
                // 🔥 EXPONENTIAL MULTIPLIER: Starts scaling past Wave 30.
                const diffScale = Math.pow(1.025, Math.max(0, currentWave - 30)); 

                // ---------------------------------------------------------
                // 🏆 TIER 1: MAIN GOD-LEVEL BOSSES (Mutually Exclusive)
                // ---------------------------------------------------------
                if (currentWave === 100 || (currentWave > 100 && currentWave % 25 === 0)) {
                    eng.screenShake = 2.5; 

                    // 🔥 STEP 2: TRIGGER CANVAS CINEMATIC INTRO
                   
                    eng.bossIntro = { 
                        active: true, 
                        timer: 720, 
                        maxDuration: 720, 
                        bossName: "THE ABYSS, AWAKENED OBLIVION",
                        subtitle: "WHAT WAS SEALED IN ETERNITY HAS RETURNED" // <-- Dito mo ilalagay ang custom text
                    };

                    // 🔥 TRIGGER BOSS MUSIC AGAD (WITH POST-BOSS BGM FIX)
                    if (window.arcaneAudio) {
                        window.arcaneAudio.isBossActive = true;
                        window.arcaneAudio.isPostBossActive = false; // <-- PATAYIN ANG POST-BOSS BGM
                        if (!window.arcaneAudio.isMuted) {
                            if (window.arcaneAudio.stopAllBgm) window.arcaneAudio.stopAllBgm(); // <-- PATAHIMIKIN LAHAT
                            window.arcaneAudio.gameBgm.pause();
                            window.arcaneAudio.bossBgm.currentTime = 0;
                            window.arcaneAudio.bossBgm.play().catch(() => {});
                        }
                    }
                    
                    if (eng.p) eng.p.chatBubble = { text: "⚠️ THE VOID IS COLLAPSING!!!", life: 3.0 };
                    if (eng.p2) eng.p2.chatBubble = { text: "⚠️ THE VOID IS COLLAPSING!!!", life: 3.0 };
                    
                    const abyssHp = Math.floor((1500000 + (currentWave * 30000)) * diffScale);
                    const primHp = Math.floor((600000 + (currentWave * 12000)) * diffScale);

                    // 🔥 Spawn The Abyss (Awakened God Form) - Center
                    eng.enemies.push({ 
                        x: W/2, y: -200, r: 60, speed: 70, hp: abyssHp, maxHp: abyssHp, prevHpFrame: abyssHp,
                        dmg: Math.floor(2500 * diffScale), xp: 150000, color: '#1a0505', glow: '#dc2626', boss: true, 
                        type: 'abyss_awakened', nameTag: 'The Abyss, Awakened Oblivion', 
                        abyssShieldTimer: 0, abyssShieldCd: 5, abyssAttackTimer: 3, flash: 0, stunnedTime: 0, stigmaTime: 0, temporalSlowTime: 0, arcaneBurnTime: 0, voidExhaustTime: 0, instabTime: 0, summonTimer: 0, dashTimer: 0 
                    });
                    
                    // 🔥 Spawn TWO Primordial Demon Guards - Left & Right
                    eng.enemies.push({ 
                        x: W/2 - 400, y: -90, r: 50, speed: 75, hp: primHp, maxHp: primHp, dmg: Math.floor(1200 * diffScale), xp: 50000, 
                        color: '#000000', glow: '#ea580c', boss: true, type: 'primordial', nameTag: 'Vorzak, King of the Void', 
                        flash: 0, stunnedTime: 0, stigmaTime: 0, temporalSlowTime: 0, arcaneBurnTime: 0, voidExhaustTime: 0, instabTime: 0 
                    });
                    eng.enemies.push({ 
                        x: W/2 + 400, y: -90, r: 50, speed: 75, hp: primHp, maxHp: primHp, dmg: Math.floor(1200 * diffScale), xp: 50000, 
                        color: '#000000', glow: '#ea580c', boss: true, type: 'primordial', nameTag: 'Vorzak, King of the Void', 
                        flash: 0, stunnedTime: 0, stigmaTime: 0, temporalSlowTime: 0, arcaneBurnTime: 0, voidExhaustTime: 0, instabTime: 0 
                    });
                } 
                else if (currentWave === 75 || (currentWave > 100 && currentWave % 20 === 0)) {
                    eng.screenShake = 2.5;
                    eng.bossIntro = { active: true, timer: 720, maxDuration: 720, bossName: "THE ABYSS, WORLD EATER" };

                    // 🔥 BOSS MUSIC FIX PARA KAY THE ABYSS
                    if (window.arcaneAudio && !window.arcaneAudio.isBossActive) {
                        window.arcaneAudio.isBossActive = true;
                        window.arcaneAudio.isPostBossActive = false; // <-- PATAYIN ANG POST-BOSS BGM
                        if (!window.arcaneAudio.isMuted) {
                            if (window.arcaneAudio.stopAllBgm) window.arcaneAudio.stopAllBgm(); // <-- PATAHIMIKIN LAHAT
                            window.arcaneAudio.gameBgm.pause();
                            window.arcaneAudio.bossBgm.currentTime = 0; 
                            window.arcaneAudio.bossBgm.play().catch(()=>{});
                        }
                    }

                    const hpScale = Math.floor((1000000 + (currentWave * 15000)) * diffScale);
                    eng.enemies.push({ 
                        x: W/2, y: -60, r: 55, speed: 70, hp: hpScale, maxHp: hpScale, prevHpFrame: hpScale, dmg: Math.floor(1800 * diffScale), 
                        xp: 85000, color: '#1a0505', glow: '#f59e0b', boss: true, type: 'abyss', nameTag: 'The Abyss, World Eater', 
                        abyssShieldTimer: 0, abyssShieldCd: 7, abyssAttackTimer: 4, flash: 0, stunnedTime: 0, stigmaTime: 0, temporalSlowTime: 0, arcaneBurnTime: 0, voidExhaustTime: 0, instabTime: 0 
                    });
                } 
                else if (currentWave === 50 || (currentWave > 100 && currentWave % 10 === 0)) {
                    // 🔥 BOSS MUSIC FIX PARA KAY PRIMORDIAL DEMON
                    if (window.arcaneAudio && !window.arcaneAudio.isBossActive) {
                        window.arcaneAudio.isBossActive = true;
                        window.arcaneAudio.isPostBossActive = false; // <-- PATAYIN ANG POST-BOSS BGM
                        if (!window.arcaneAudio.isMuted) {
                            if (window.arcaneAudio.stopAllBgm) window.arcaneAudio.stopAllBgm(); // <-- PATAHIMIKIN LAHAT
                            window.arcaneAudio.gameBgm.pause();
                            window.arcaneAudio.bossBgm.currentTime = 0; 
                            window.arcaneAudio.bossBgm.play().catch(()=>{});
                        }
                    }

                    // 🔥 CINEMATIC SCENE (PARA SA WAVE 50 LANG)
                    if (currentWave === 50) {
                        eng.screenShake = 2.0; 
                        eng.bossIntro = { 
                            active: true, 
                            timer: 720, // 10 seconds duration (600 frames)
                            maxDuration: 720, 
                            bossName: "VORZAK, KING OF THE VOID", 
                            subtitle: "A KING BORN BEFORE CREATION RETURNS" // Custom text para sa demon
                        };
                    }

                    const hpScale = Math.floor((350000 + (currentWave * 8000)) * diffScale);
                    eng.enemies.push({ 
                        x: W/2, y: -50, r: 50, speed: 95, hp: hpScale, maxHp: hpScale, dmg: Math.floor(1000 * diffScale), 
                        xp: 55000, color: '#000000', glow: '#ffffff', boss: true, type: 'primordial', nameTag: 'Vorzak, King of the Void', 
                        flash: 0, stunnedTime: 0, stigmaTime: 0, temporalSlowTime: 0, arcaneBurnTime: 0, voidExhaustTime: 0, instabTime: 0 
                    });
                }

                // ---------------------------------------------------------
                // ⚔️ TIER 2: SUB-BOSSES (Independent Spawns)
                // ---------------------------------------------------------
                if (currentWave >= 30 && currentWave % 10 === 0) {
                    const hpScale = Math.floor((120000 + (currentWave * 3000)) * diffScale);
                    eng.enemies.push({ 
                        x: W/2 - 150, y: -45, r: 40, speed: 110, hp: hpScale, maxHp: hpScale, dmg: Math.floor(600 * diffScale), 
                        xp: 20000, color: '#7f1d1d', glow: '#dc2626', boss: true, type: 'archdemon', nameTag: 'Zerath, Void Commander', 
                        flash: 0, stunnedTime: 0, stigmaTime: 0, temporalSlowTime: 0, arcaneBurnTime: 0, voidExhaustTime: 0, instabTime: 0 
                    });
                } 
                else if (currentWave >= 15 && currentWave % 5 === 0) {
                    const baseHp = 45000 + (currentWave * 1500);
                    const hpScale = Math.floor(baseHp * (currentWave > 40 ? diffScale * 0.5 : 1)); 
                    eng.enemies.push({ 
                        x: W/2 + 150, y: -40, r: 30, speed: 125, hp: hpScale, maxHp: hpScale, dmg: 350 + (currentWave * 5), 
                        xp: 10000, color: '#4b5563', glow: '#ef4444', boss: true, type: 'demonKnight', nameTag: 'Draxen, Void Knight', 
                        flash: 0, stunnedTime: 0, stigmaTime: 0, temporalSlowTime: 0, arcaneBurnTime: 0, voidExhaustTime: 0, instabTime: 0 
                    });
                }
            }


            }
          }
        }
       
        // 🔥 FIX: PENDING SIGIL CASTS DRAIN — dt-synced kapalit ng setTimeout.
        // Ito ang nag-de-decrement ng "chanting" timer gamit ang parehong dt na
        // ginagamit ng ibang gameplay logic, kaya automatic na siyang naka-pause
        // (dahil naka-return na tayo sa itaas kapag screen === 'pause', hindi
        // pa man umaabot dito ang execution) at naka-sync sa internal game clock
        // sa halip na sa wall-clock time ng browser.
        if (eng.pendingSigilCasts && eng.pendingSigilCasts.length > 0) {
          for (let i = eng.pendingSigilCasts.length - 1; i >= 0; i--) {
            const pc = eng.pendingSigilCasts[i];
            pc.timeLeft -= dt;
            if (pc.timeLeft <= 0) {
              resolveSigilCast(eng, pc.target, pc.sigilType);
              eng.pendingSigilCasts.splice(i, 1);
            }
          }
        }

        // 💥 DECAL LIFECYCLE UPDATE (Unti-unting pagkawala ng burn marks)
        if (eng.decals) {
          for (let i = eng.decals.length - 1; i >= 0; i--) {
            eng.decals[i].life -= dt;
            if (eng.decals[i].life <= 0) eng.decals.splice(i, 1);
          }
        }

if (eng.tornados) {
  for (let i = eng.tornados.length - 1; i >= 0; i--) {
    const t = eng.tornados[i];
    if (!t) continue;
    t.life -= dt;
    t.x += (t.vx || 0) * dt; 
    t.y += (t.vy || 0) * dt;

    // 💥 OPTIMIZED FLARE INFERNO DECALS
    if (Math.random() < 0.15) { 
      if (!eng.decals) eng.decals = [];
      // ✅ HARD CAP: Limitahan ang decals sa screen para hindi ma-overwhelm ang memory
      if (eng.decals.length < 250) {
        eng.decals.push({ 
          // ✅ Gawaing Integer (Math.floor) para mas mabilis i-render ng HTML5 Canvas
          x: Math.floor(t.x + (Math.random() - 0.5) * 20), 
          y: Math.floor(t.y + (Math.random() - 0.5) * 20), 
          r: Math.floor(25 + Math.random() * 15), 
          life: 3.0, 
          maxLife: 3.0 
        });
      }
    } 

    if (t.life <= 0) {
      eng.tornados.splice(i, 1);
    }
  }
}

        if (eng.waves) {
          for (let i = eng.waves.length - 1; i >= 0; i--) {
            const waveObj = eng.waves[i];
            if (!waveObj) continue;
            waveObj.life -= dt;
            waveObj.x += (waveObj.vx || 0) * dt; 
            if (waveObj.life <= 0) {
              eng.waves.splice(i, 1);
            }
          }
        }

        if (eng.fissures) {
          for (let i = eng.fissures.length - 1; i >= 0; i--) {
            eng.fissures[i].life -= dt;
            if (eng.fissures[i].life <= 0) eng.fissures.splice(i, 1);
          }
        }

        if (eng.lightnings) {
          for (let i = eng.lightnings.length - 1; i >= 0; i--) {
            eng.lightnings[i].life -= dt;
            if (eng.lightnings[i].life <= 0) eng.lightnings.splice(i, 1);
          }
        }

        if (eng.iceStorms) {
          for (let i = eng.iceStorms.length - 1; i >= 0; i--) {
            const s = eng.iceStorms[i];
            s.life -= dt;
            if (s.life <= 0) {
              eng.iceStorms.splice(i, 1);
            }
          }
        }

        // =====================================================================
        // 🔥 FIX: MERGED HAZARD-DAMAGE PASS — isang loop na lang sa eng.enemies
        // sa halip na hiwalay na loop per hazard type (tornado/wave/iceStorm).
        // Dati: kapag 3 sigils magkasabay active, 3 buong pass sa enemies array
        // kada frame (O(hazards × enemies)). Ngayon: isang pass lang sa enemies,
        // tapos sa loob niyan saka tinitignan kung tama ba ang bawat active na
        // tornado/wave/iceStorm — parehong resulta, mas kaunting array traversal
        // overhead lalo na kapag malaki na ang enemies array (40-100+ minions).
        // Fissure at lightning hindi kasama dito dahil instant-hit sila sa cast
        // mismo (one-time, hindi per-frame continuous damage), kaya wala silang
        // per-frame enemy loop na dapat i-merge.
        // =====================================================================
        if (isHost || !isCoopActive) {
          const activeTornados = eng.tornados && eng.tornados.length > 0 ? eng.tornados : null;
          const activeWaves = eng.waves && eng.waves.length > 0 ? eng.waves : null;
          const activeIceStorms = eng.iceStorms && eng.iceStorms.length > 0 ? eng.iceStorms : null;

          if (activeTornados || activeWaves || activeIceStorms) {
            const dynamicBaseDmg = 1000 + ((eng.wave || 1) * 100);
            const casterDmg = (eng.boltDmg || 0) + (eng.p?.dmg || 0);
            const waveDps = activeWaves ? (dynamicBaseDmg * 1.5) + (casterDmg * 20) : 0;
            const iceDpsBase = activeIceStorms ? 800 + ((eng.wave || 1) * 120) + ((eng.p?.dmg || 0) * 4) : 0;

            for (const e of eng.enemies) {
              if (!e) continue;

              // --- TORNADO(S) ---
              if (activeTornados) {
                for (const t of activeTornados) {
                  const dx = e.x - t.x;
                  const dy = e.y - t.y;
                  const tornadoRadius = t.r || 50;
                  const maxDist = tornadoRadius + (e.r || 15);
                  const distSq = (dx * dx) + (dy * dy);
                  if (distSq < (maxDist * maxDist)) {
                    const tornadoDps = t.isFamiliar ? t.dmg : (1000 + ((eng.wave || 1) * 100) + ((eng.boltDmg || 0) + (eng.p?.dmg || 0)) * 10);
                    e.hp -= tornadoDps * dt;
                    window.recordArcaneDamage(t.isFamiliar ? 'Zephyr Falcon' : 'Flare Inferno', tornadoDps * dt);
                    e.arcaneBurnTime = Math.max(e.arcaneBurnTime || 0, 1.5);
                    if (Math.random() < 0.08) {
                      e.flash = 0.5;
                      spawnFCT(eng, e.x, e.y, Math.floor(tornadoDps * 0.15), 'damage', false);
                    }
                    if (e.hp <= 0) e.deadTrigger = true;
                  }
                }
              }

              // --- WAVE(S) ---
              if (activeWaves) {
                for (const waveObj of activeWaves) {
                  const wWidth = waveObj.width || 100;
                  if (e.x > waveObj.x - wWidth / 2 && e.x < waveObj.x + wWidth / 2) {
                    e.hp -= waveDps * dt;
                    window.recordArcaneDamage('Tidal Wave', waveDps * dt);
                    if (!e.boss) e.x += ((waveObj.vx || 0) * 0.4) * dt;
                    e.temporalSlowTime = Math.max(e.temporalSlowTime || 0, 2.0);
                    if (Math.random() < 0.15) {
                      e.flash = 0.5;
                      spawnFCT(eng, e.x, e.y, waveDps * 0.15, 'damage', false);
                    }
                    if (e.hp <= 0) e.deadTrigger = true;
                  }
                }
              }

              // --- ICE STORM(S) ---
              if (activeIceStorms) {
                for (const s of activeIceStorms) {
                  if (Math.hypot(e.x - s.x, e.y - s.y) < s.radius + e.r) {
                    const iceDps = s.isFamiliar ? s.dmg : iceDpsBase;
                    e.hp -= iceDps * dt;
                    window.recordArcaneDamage(s.isFamiliar ? 'Frost Sprite' : 'Ice Storm', iceDps * dt);
                    e.stigmaTime = 1.0;
                    e.temporalSlowTime = Math.max(e.temporalSlowTime, 1.0);
                    if (Math.random() < 0.1) {
                      e.flash = 0.5;
                      spawnFCT(eng, e.x, e.y, iceDps * 0.1, 'damage', false);
                    }
                    if (e.hp <= 0) e.deadTrigger = true;
                  }
                }
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
            // 🔥 PERCENTAGE REGEN: 2.5% ng Max HP per second para ramdam kahit gaano kataas ang buhay
            const regenAmount = playerObj.maxHp * 0.025 * dt;
            playerObj.hp = Math.min(playerObj.maxHp, playerObj.hp + regenAmount); 
          }

          if (playerObj.skills.arcaneCollapse?.cd > 0) playerObj.skills.arcaneCollapse.cd -= dt;
          if (playerObj.skills.arcaneInstinct?.cd > 0) playerObj.skills.arcaneInstinct.cd -= dt;
          if (playerObj.skills.arcaneResurrection?.cd > 0) playerObj.skills.arcaneResurrection.cd -= dt;
          
          if (playerObj.skills.flareInferno?.cd > 0) playerObj.skills.flareInferno.cd -= dt;
          if (playerObj.skills.tidalWave?.cd > 0) playerObj.skills.tidalWave.cd -= dt;
          if (playerObj.skills.fissureSlam?.cd > 0) playerObj.skills.fissureSlam.cd -= dt;
          if (playerObj.skills.lightningSurge?.cd > 0) playerObj.skills.lightningSurge.cd -= dt;
          if (playerObj.skills.iceStorm?.cd > 0) playerObj.skills.iceStorm.cd -= dt;

          if (playerObj.skills.natureRecovery?.cd > 0) playerObj.skills.natureRecovery.cd -= dt;

          // 🔥 BUFF/FIX: ARCANE INSTINCT RAIN LOGIC
          if (playerObj.skills.arcaneInstinct?.duration > 0) {
            playerObj.skills.arcaneInstinct.duration -= dt;
            
            // Fix natin yung delay placement
            if (playerObj.skills.arcaneInstinct.autoTimer > 0) {
              playerObj.skills.arcaneInstinct.autoTimer -= dt;
            } else {
              // TAPOS NA ANG DELAY, FIRE EVERYTHING DITO NA!!!
              if (!playerObj.skills.arcaneInstinct.burstTick) playerObj.skills.arcaneInstinct.burstTick = 0;
              playerObj.skills.arcaneInstinct.burstTick += dt;

              if (playerObj.skills.arcaneInstinct.burstTick >= 0.35) { // Faster burst tick!
                playerObj.skills.arcaneInstinct.burstTick = 0;
                
                // RAIN STARS: Spawn 4 Shooting Stars everywhere!
                for (let k = 0; k < 4; k++) {
                  let targetX = playerObj.x + (Math.random() - 0.5) * 600; // Malapad na sakop
                  let targetY = playerObj.y + (Math.random() - 0.5) * 600;
                  if (eng.enemies.length > 0 && Math.random() > 0.3) {
                    const randEnemy = eng.enemies[Math.floor(Math.random() * eng.enemies.length)];
                    targetX = randEnemy.x; targetY = randEnemy.y;
                  }
                  if (!eng.stars) eng.stars = [];
                  eng.stars.push({ x: targetX, y: targetY, currentY: targetY - 400, targetY: targetY, progress: 0, radius: 95, p2: playerObj === eng.p2 });
                }

                // RAIN SLASHES: Spawn 3 Vacuum Slashes in random directions!
                for (let k = 0; k < 3; k++) {
                   let angle = Math.random() * Math.PI * 2;
                   if (!eng.slashes) eng.slashes = [];
                   eng.slashes.push({ x: playerObj.x, y: playerObj.y, vx: Math.cos(angle) * 450, vy: Math.sin(angle) * 450, angle: angle, life: 1.5, hits: new Set(), p2: playerObj === eng.p2 });
                }

                // RANDOM CUBE BASHES sa buong screen
                if (!eng.cubeBashes) eng.cubeBashes = [];
                let cbX = playerObj.x + (Math.random()-0.5)*400;
                let cbY = playerObj.y + (Math.random()-0.5)*400;
                eng.cubeBashes.push({ x: cbX, y: cbY, radius: 10, maxRadius: 160, speed: 450 });
                
                // 🔥 SCALING: Arcane Instinct Cube Bash
                let cbDmg = 100 + ((eng.wave || 1) * 40) + ((playerObj.dmg || 0) * 1.5);
                cbDmg *= 2.0; // Instinct Multiplier
                for (const enemy of eng.enemies) {
                  if (Math.hypot(enemy.x - cbX, enemy.y - cbY) <= 160) {
                    enemy.stunnedTime = 1.6;
                    enemy.hp -= cbDmg;
                    window.recordArcaneDamage('Cube Bash', cbDmg);
                    spawnFCT(eng, enemy.x, enemy.y, cbDmg, 'damage', false); // 💥 ADDED FCT
                    if (enemy.hp <= 0) enemy.deadTrigger = true;
                  }
                }
              } // <--- Dulo ng Arcane Instinct burstTick block
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
                let targetEnemy = eng.enemies[Math.floor(Math.random() * eng.enemies.length)];
                let minDist = Infinity;
                for (const e of eng.enemies) {
                    if (e.y < -150 || e.hp <= 0) continue;
                    let d = Math.hypot(e.x - playerObj.x, e.y - playerObj.y) - (e.r || 15);
                    if (e.boss) d -= 10000; // 🔥 BOSS MAGNET!
                    if (d < minDist) { minDist = d; targetEnemy = e; }
                }
                if (targetEnemy) {
                    targetX = targetEnemy.x;
                    targetY = targetEnemy.y;
                }
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
                  let cbDmg = 100 + ((eng?.wave || 1) * 40) + ((playerObj?.dmg || 0) * 1.5);
                  if (playerObj?.potBuffs?.power > 0) cbDmg *= 1.4;
                  if (playerObj?.skills?.arcaneInstinct?.duration > 0) cbDmg *= 2.0;
                  if (enemy.instabTime > 0) cbDmg *= 1.5;
                  
                  let totalCrit = (playerObj?.baseCrit || 0) + (playerObj?.potBuffs?.crit > 0 ? 35 : 0);
                  let isCrit = false;
                  if (Math.random() < (totalCrit / 100)) {
                    cbDmg *= 2; enemy.flash = 0.5;
                    isCrit = true;
                  } else {
                    enemy.flash = 0.2;
                  }
                  
                  enemy.hp -= cbDmg;
                  spawnFCT(eng, enemy.x, enemy.y, cbDmg, 'damage', isCrit); // 💥 ADDED FCT
                  if (enemy.hp <= 0) enemy.deadTrigger = true;
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
                const isBigBoss = e.boss || e.type === 'abyss' || e.type === 'abyss_awakened' || e.type === 'primordial';
                if (e.hp <= 0 || (e.y < -50 && !isBigBoss)) continue; 
                
                let d = Math.hypot(e.x - playerObj.x, e.y - playerObj.y) - (e.r || 15);
                
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



// 🔥 RED ZONES (AOE ATTACKS) LOGIC & FAST MATH COLLISION 🔥
          if (eng.aoeZones && (isHost || !isCoopActive)) {
            for (let i = eng.aoeZones.length - 1; i >= 0; i--) {
                const aoe = eng.aoeZones[i];
                aoe.timer -= dt;
                if (aoe.timer <= 0) {
                    eng.screenShake = Math.max(eng.screenShake, 1.5);
                    for (const pTarget of [eng.p, isCoopActive ? eng.p2 : null]) {
                        if (pTarget && !pTarget.dead && pTarget.inv <= 0) {
                            // 🚀 FAST MATH: Walang Math.hypot() para sobrang bilis ng collision!
                            const dx = pTarget.x - aoe.x;
                            const dy = pTarget.y - aoe.y;
                            const safeDistance = aoe.radius + pTarget.r;
                            if ((dx * dx + dy * dy) < (safeDistance * safeDistance)) {

                                let damageTaken = aoe.dmg;
                                const defStat = pTarget.baseDef || 0;
                                let reduction = defStat / (100 + defStat);
                                reduction = Math.min(0.85, reduction); // Hard cap at 85% mitigation
                                damageTaken *= (1 - reduction);

                                // --- 👼 HOLY SERAPH: DIVINE ABSORPTION SHIELD ---
                                if (pTarget.divineShield && pTarget.divineShield.active) {
                                    if (pTarget.divineShield.hp >= damageTaken) {

                                    window.recordArcaneUtility('Light Shield', damageTaken)

                                    pTarget.divineShield.hp -= damageTaken;
                                    pTarget.divineShield.hitFlash = 0.2; 
                                    spawnFCT(eng, pTarget.x, pTarget.y, damageTaken, 'shield'); // 💥 TRIGGER
                                    damageTaken = 0;
                                    } else {

                                        window.recordArcaneUtility('Light Shield', pTarget.divineShield.hp);

                                        spawnFCT(eng, pTarget.x, pTarget.y, pTarget.divineShield.hp, 'shield'); // 💥 TRIGGER
                                        damageTaken -= pTarget.divineShield.hp;
                                        pTarget.divineShield.hp = 0;
                                        pTarget.divineShield.active = false;
                                        
                                        for(let k=0; k<40; k++) {
                                            const pa = Math.random() * Math.PI * 2;
                                            const ps = Math.random() * 350 + 100;
                                            eng.particles.push({ x: pTarget.x, y: pTarget.y, vx: Math.cos(pa)*ps, vy: Math.sin(pa)*ps, color: '#fef08a', life: 0.8, ml: 0.8, r: Math.random()*3+2 });
                                        }
                                    }
                                }
                                // -------------------------------------------------

                                if (pTarget.potBuffs?.defense > 0) damageTaken *= 0.65;

                                if (pTarget.skills?.shield?.duration > 0 && pTarget.skills?.shield?.enabled !== false) {
                                    damageTaken = 0;
                                } else if (pTarget.skills?.fortify?.learned && pTarget.skills?.fortify?.enabled !== false) {
                                    damageTaken *= 0.75;
                                }
                                pTarget.hp -= damageTaken;
                                const isCoopLocal = Boolean(netRef.current && netRef.current.channel) && !netRef.current.isHost ? eng.p2 : eng.p;
                                if (pTarget === isCoopLocal) window.arcaneDamageTaken = (window.arcaneDamageTaken || 0) + damageTaken;
                                pTarget.inv = 0.7;
                                if (pTarget.hp <= 0) {
                                    pTarget.dead = true;
                                    if (!isCoopActive || (eng.p?.dead && eng.p2?.dead)) {
                                        if (isCoopActive) netRef.current.channel.send('game_over', {});
                                        setScreen('gameover');
                                    }
                                }
                            }
                        }
                    }
                    // Visual explosion (Red blast)
                    for(let k=0; k<35; k++) {
                        const pa = Math.random()*Math.PI*2;
                        const ps = Math.random()*aoe.radius*1.5;
                        eng.particles.push({ x: aoe.x, y: aoe.y, vx: Math.cos(pa)*ps, vy: Math.sin(pa)*ps, color: '#ef4444', life: 0.5, ml: 0.5, r: Math.random()*4+2 });
                    }
                    eng.aoeZones.splice(i, 1);
                }
            }
          }
          // I-sync ang animation speed ng guest sa host
          if (eng.aoeZones && !isHost && isCoopActive) {
              for (let i = eng.aoeZones.length - 1; i >= 0; i--) {
                  eng.aoeZones[i].timer -= dt;
                  if(eng.aoeZones[i].timer <= 0) eng.aoeZones.splice(i, 1);
              }
          }

          // 💨 SHARED DASH & MOVEMENT LOGIC
          const applyPlayerDashAndMovement = (pObj, inX, inY, isP2) => {
            // 🔒 BAWAL GUMALAW HABANG NAKA-LOADING SCREEN PA: direktang
            // hinaharang dito ang actual position update (hindi lang yung
            // gameStarted flag) kaya kahit paano pa man na-trigger ang
            // gameStarted (host movement, o guest state_sync mula sa host),
            // walang epekto ang anumang WASD/joystick input habang nagloload.
            if (isPreloadingRef.current) return;

            tickPlayerSkillTrackers(pObj);
            let calcSpeed = pObj.speed || 200;
            if (pObj.skills?.haste?.duration > 0 && pObj.skills?.haste?.enabled !== false) calcSpeed *= 1.45;
            if (pObj.skills?.arcaneInstinct?.duration > 0) calcSpeed *= 2.0;

            // Safe fallback para iwas undefined error sa newly joined guest players
            if (pObj.dashCd === undefined) { pObj.dashCd = 0; pObj.isDashing = false; pObj.dashTimer = 0; pObj.dashAngle = 0; }
            if (pObj.dashCd > 0) pObj.dashCd -= dt;

            // 💨 DASH LOGIC
            if (pObj.isDashing) {
                pObj.x += Math.cos(pObj.dashAngle) * 1200 * dt; // Super speed!
                pObj.y += Math.sin(pObj.dashAngle) * 1200 * dt;
                
                // Mag-iwan ng Ghost Trail
                eng.particles.push({ x: pObj.x, y: pObj.y, vx: 0, vy: 0, color: isP2 ? '#f97316' : '#8b5cf6', life: 0.15, ml: 0.15, r: pObj.r, isGhost: true });
                
                pObj.dashTimer -= dt;
                if (pObj.dashTimer <= 0) pObj.isDashing = false;
            } else {
                pObj.x += inX * calcSpeed * dt;
                pObj.y += inY * calcSpeed * dt;
            }
            
            pObj.x = Math.max(pObj.r, Math.min(W - pObj.r, pObj.x));
            pObj.y = Math.max(pObj.r, Math.min(H - pObj.r, pObj.y));
            if (pObj.inv > 0) pObj.inv -= dt;
          };

          // ==========================================
          // APPLY HOST MOVEMENT
          // ==========================================
          if (isHost || !isCoopActive) {
            if (eng.p && !eng.p.dead) applyPlayerDashAndMovement(eng.p, mx, my, false);
            if (isCoopActive && eng.p2 && !eng.p2.dead && eng.gameStarted) {
                applyPlayerDashAndMovement(eng.p2, eng.p2Input.x, eng.p2Input.y, true);
            }
          } 
          // ==========================================
          // APPLY GUEST MOVEMENT
          // ==========================================
          else {
            if (eng.p2 && !eng.p2.dead) {
              applyPlayerDashAndMovement(eng.p2, mx, my, true);
              const predFactor = Math.min(1, dt * 18);
              eng.p2Render.x += (eng.p2.x - eng.p2Render.x) * predFactor;
              eng.p2Render.y += (eng.p2.y - eng.p2Render.y) * predFactor;

              if (eng.p2Target) {
                const reconcileFactor = 0.15;
                const dx = eng.p2Target.x - eng.p2Render.x;
                const dy = eng.p2Target.y - eng.p2Render.y;
                const dist = Math.hypot(dx, dy);
                if (dist > 60) {
                  const lerpFactor = 0.15;
                  eng.p2Render.x += (eng.p2Target.x - eng.p2Render.x) * lerpFactor;
                  eng.p2Render.y += (eng.p2Target.y - eng.p2Render.y) * lerpFactor;
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

// 💥 UNIVERSAL PLAYER DAMAGE TAKEN TRACKER (BULLETPROOF RED TEXT)
        for (const pObj of [eng.p, eng.p2]) {
          if (pObj) { // 🔥 FIXED: Tinanggal natin ang `!pObj.dead` para mabilang ang fatal hit!
            
            // I-check kung bumaba ang HP kumpara sa nakaraang frame
            if (pObj.prevHpFrame !== undefined && pObj.hp < pObj.prevHpFrame) {
                const damageDiff = pObj.prevHpFrame - pObj.hp;
                
                // Trigger lang kung malaki sa 0.5 ang bawas
                if (damageDiff > 0.5) { 
                    
                    // 🔥 FIXED: Inalis na dito ang window.arcaneDamageTaken
                    // Para iwas double-count. Dito na lang ang floating text!
                    if (eng.floatingTexts) {
                        eng.floatingTexts.push({
                          x: pObj.x + (Math.random() * 30 - 15),
                          y: pObj.y + (Math.random() * 10 - 5),
                          text: `-${Math.ceil(damageDiff)}`,
                          type: 'damageTaken', 
                          isCrit: false,
                          life: 1.0, 
                          vy: 45 
                        });
                    }
                }
            }
            // I-save ang current HP
            pObj.prevHpFrame = pObj.hp; 
          }
        }
        
        const localTrackedObj = (isCoopActive && !isHost) ? eng.p2 : eng.p;
        if (localTrackedObj) {
          
          // 🔥 THROTTLE REACT STATE UPDATES PARA DI MAG-LAG ANG LARO
          const nowMs = performance.now();
          if (nowMs - lastReactSync > 150) {
            lastReactSync = nowMs;
            
            setPlayerLevel(prev => prev !== localTrackedObj.level ? localTrackedObj.level : prev);
            playerLevelRef.current = localTrackedObj.level;
            
            if (localTrackedObj.skills) {
              setSkillsState({ ...localTrackedObj.skills });
            }

            const activeBuffs = [];
            // Gumamit ng Math.ceil para integer lang ang pumasok sa state at hindi laging nag-iiba
            const peaks = buffPeakDurationRef.current;
            const trackPeak = (key, life) => {
              // Kung mas mataas ang life kaysa stored peak (bagong cast / refresh),
              // i-update ang peak. Ginagamit ito ng radial sweep sa rune medallion.
              if (!peaks[key] || life > peaks[key]) peaks[key] = life;
              return peaks[key];
            };

            if (localTrackedObj.skills?.berserk?.duration > 0 && localTrackedObj.skills?.berserk?.enabled) {
              const life = Math.ceil(localTrackedObj.skills.berserk.duration);
              activeBuffs.push({ type: 'skill', name: 'BERSERK', icon: 'berserk', life, peak: trackPeak('berserk', life) });
            } else { delete peaks.berserk; }
            if (localTrackedObj.skills?.haste?.duration > 0 && localTrackedObj.skills?.haste?.enabled) {
              const life = Math.ceil(localTrackedObj.skills.haste.duration);
              activeBuffs.push({ type: 'skill', name: 'HASTE', icon: 'haste', life, peak: trackPeak('haste', life) });
            } else { delete peaks.haste; }
            if (localTrackedObj.skills?.shield?.duration > 0 && localTrackedObj.skills?.shield?.enabled) {
              const life = Math.ceil(localTrackedObj.skills.shield.duration);
              activeBuffs.push({ type: 'skill', name: 'SHIELD', icon: 'shield', life, peak: trackPeak('shield', life) });
            } else { delete peaks.shield; }
            if (localTrackedObj.skills?.arcaneInstinct?.duration > 0) {
              const life = Math.ceil(localTrackedObj.skills.arcaneInstinct.duration);
              activeBuffs.push({ type: 'skill-instinct', name: 'ARCANE INSTINCT', icon: 'arcaneInstinct', life, peak: trackPeak('arcaneInstinct', life) });
            } else { delete peaks.arcaneInstinct; }

            if (localTrackedObj.potBuffs) {
              if (localTrackedObj.potBuffs.power > 0) { const life = Math.ceil(localTrackedObj.potBuffs.power); activeBuffs.push({ type: 'pot-power', name: 'POWER', icon: 'fire', life, peak: trackPeak('pot-power', life) }); } else { delete peaks['pot-power']; }
              if (localTrackedObj.potBuffs.defense > 0) { const life = Math.ceil(localTrackedObj.potBuffs.defense); activeBuffs.push({ type: 'pot-defense', name: 'DEFENSE', icon: 'shield', life, peak: trackPeak('pot-defense', life) }); } else { delete peaks['pot-defense']; }
              if (localTrackedObj.potBuffs.crit > 0) { const life = Math.ceil(localTrackedObj.potBuffs.crit); activeBuffs.push({ type: 'pot-crit', name: 'CRIT', icon: 'shootingStar', life, peak: trackPeak('pot-crit', life) }); } else { delete peaks['pot-crit']; }
              if (localTrackedObj.potBuffs.regen > 0) { const life = Math.ceil(localTrackedObj.potBuffs.regen); activeBuffs.push({ type: 'pot-regen', name: 'REGEN', icon: 'nature', life, peak: trackPeak('pot-regen', life) }); } else { delete peaks['pot-regen']; }
              if (localTrackedObj.potBuffs.xpBoost > 0) { const life = Math.ceil(localTrackedObj.potBuffs.xpBoost); activeBuffs.push({ type: 'pot-xpBoost', name: 'XP BOOST', icon: 'arcaneInstinct', life, peak: trackPeak('pot-xpBoost', life) }); } else { delete peaks['pot-xpBoost']; }
            }
            
            // Check muna natin kung may nagbago bago mag-trigger ng re-render
            setActiveBuffsList(prev => {
              const prevStr = JSON.stringify(prev);
              const newStr = JSON.stringify(activeBuffs);
              return prevStr === newStr ? prev : activeBuffs;
            });
          }

          // ⚠️ DIRECT DOM UPDATES: (Hayaan lang ito sa labas dahil mabilis at walang VDOM delay)
          const equipBonuses = getEquipmentStats(localTrackedObj);

          let currentAtk = eng.boltDmg + (localTrackedObj.dmg || 0) + equipBonuses.atk;
          if (localTrackedObj.skills?.berserk?.duration > 0 && localTrackedObj.skills?.berserk?.enabled) currentAtk = Math.ceil(currentAtk * 1.5);
          if (localTrackedObj.potBuffs?.power > 0) currentAtk = Math.ceil(currentAtk * 1.4);
          if (localTrackedObj.skills?.arcaneInstinct?.duration > 0) currentAtk = Math.ceil(currentAtk * 2.0);

          let currentDef = (localTrackedObj.baseDef || 0) + equipBonuses.def;
          if (localTrackedObj.skills?.fortify?.learned && localTrackedObj.skills?.fortify?.enabled) currentDef += 25;
          if (localTrackedObj.potBuffs?.defense > 0) currentDef += 35;
          if (localTrackedObj.skills?.arcaneInstinct?.duration > 0) currentDef += 500;

          let currentCrit = (localTrackedObj.baseCrit || 0) + equipBonuses.crit;
          if (localTrackedObj.potBuffs?.crit > 0) currentCrit += 35;
          if (localTrackedObj.skills?.arcaneInstinct?.duration > 0) currentCrit += 500;

          let currentSpd = (localTrackedObj.speed || 200) + equipBonuses.speed;
          if (localTrackedObj.skills?.haste?.duration > 0 && localTrackedObj.skills?.haste?.enabled) currentSpd = Math.ceil(currentSpd * 1.45);
          if (localTrackedObj.skills?.arcaneInstinct?.duration > 0) currentSpd = Math.ceil(currentSpd * 2.0);
          
          let currentCd = (localTrackedObj.shootRate || 0.6) - equipBonuses.rate;
          currentCd = Math.max(0.15, currentCd);
          if (localTrackedObj.skills?.berserk?.duration > 0 && localTrackedObj.skills?.berserk?.enabled) currentCd *= 0.5;
          if (localTrackedObj.skills?.arcaneInstinct?.duration > 0) currentCd *= 0.15; 

          let currentLifesteal = (localTrackedObj.lifeSteal || 0) + equipBonuses.lifesteal;

          if (statAtkRef.current) statAtkRef.current.textContent = formatLargeNumber(currentAtk);
          if (statDefRef.current) {
            let uiReduction = currentDef / (100 + currentDef);
            uiReduction = Math.min(0.85, uiReduction);
            const damageBlockedPct = (uiReduction * 100).toFixed(1);
            statDefRef.current.textContent = `${currentDef} (${damageBlockedPct}% Block)`;
          }
          if (statCritRef.current) statCritRef.current.textContent = `${currentCrit}%`;
          if (statSpdRef.current) statSpdRef.current.textContent = `${currentSpd} IPS`;
          if (statCdRef.current) statCdRef.current.textContent = `${currentCd.toFixed(2)}s`;
          if (statLifestealRef.current) statLifestealRef.current.textContent = `${currentLifesteal} HP/Kill`;
        }

        if (isCoopActive && netRef.current.channel) {
          syncTimer -= dt;
          if (syncTimer <= 0) {
            syncTimer = 0.016;
            if (!isHost) {
              netRef.current.channel.send('guest_input', { x: mx, y: my });
            } else {
              netRef.current.channel.send('state_sync', {
                gameStarted: eng.gameStarted, 
                enemies: eng.enemies.map(e => ({ x: Math.round(e.x), y: Math.round(e.y), r: e.r, speed: e.speed, hp: e.hp, maxHp: e.maxHp, dmg: e.dmg, xp: e.xp, color: e.color, glow: e.glow, boss: e.boss, flash: e.flash, stunnedTime: e.stunnedTime, stigmaTime: e.stigmaTime, temporalSlowTime: e.temporalSlowTime, arcaneBurnTime: e.arcaneBurnTime, voidExhaustTime: e.voidExhaustTime, instabTime: e.instabTime, type: e.type, nameTag: e.nameTag, abyssShieldTimer: e.abyssShieldTimer })),
                gems: eng.gems.map(g => ({ x: Math.round(g.x), y: Math.round(g.y), r: g.r, xp: g.xp, life: Math.round(g.life) })),
                bullets: eng.bullets.map(b => ({ x: Math.round(b.x), y: Math.round(b.y), vx: Math.round(b.vx), vy: Math.round(b.vy), r: b.r, life: b.life, p2: b.p2, isEnemy: b.isEnemy, dmg: b.dmg })),
                potions: (eng.potions || []).map(p => ({ x: Math.round(p.x), y: Math.round(p.y), r: p.r, type: p.type, life: p.life })),
                collapses: (eng.collapses || []).map(c => ({ x: Math.round(c.x), y: Math.round(c.y), radius: Math.round(c.radius), maxRadius: c.maxRadius, life: c.life, speed: c.speed })),
                
                tornados: (eng.tornados || []).map(t => ({ x: Math.round(t.x), y: Math.round(t.y), vx: Math.round(t.vx || 0), vy: Math.round(t.vy || 0), r: t.r, life: t.life })),
                waves: (eng.waves || []).map(w => ({ x: Math.round(w.x), y: Math.round(w.y), vx: Math.round(w.vx || 0), width: w.width, life: w.life })),
                fissures: (eng.fissures || []).map(f => ({ x: Math.round(f.x), y: Math.round(f.y), angle: f.angle, length: f.length, life: f.life })),
                lightnings: (eng.lightnings || []).map(l => ({ pts: l.pts.map(p => ({x: Math.round(p.x), y: Math.round(p.y)})), life: l.life })),
                iceStorms: (eng.iceStorms || []).map(i => ({ x: Math.round(i.x), y: Math.round(i.y), radius: Math.round(i.radius), life: i.life })),

                score: eng.score, wave: eng.wave, waveT: eng.waveT, waveLen: eng.waveLen, boltDmg: eng.boltDmg,
                screenShake: eng.screenShake,
                bossIntro: eng.bossIntro,
                showVictoryCinematic: window.showVictoryCinematic || 0,
                p1: eng.p ? { 
                x: eng.p.x, 
                y: eng.p.y, 
                hp: eng.p.hp, 
                maxHp: eng.p.maxHp, 
                inv: eng.p.inv, 
                dead: eng.p.dead, 
                dmg: eng.p.dmg, 
                shootRate: eng.p.shootRate,
                speed: eng.p.speed,
                baseCrit: eng.p.baseCrit,
                baseDef: eng.p.baseDef,
                multiShot: eng.p.multiShot, 
                chatBubble: eng.p.chatBubble,
                name: playerName,
                hasContinued: eng.p.hasContinued
              } : null,
              p2: eng.p2 ? { 
                x: eng.p2.x, 
                y: eng.p2.y, 
                hp: eng.p2.hp, 
                maxHp: eng.p2.maxHp, 
                inv: eng.p2.inv, 
                dead: eng.p2.dead, 
                dmg: eng.p2.dmg, 
                shootRate: eng.p2.shootRate, 
                speed: eng.p2.speed,
                baseCrit: eng.p2.baseCrit,
                baseDef: eng.p2.baseDef,
                multiShot: eng.p2.multiShot,
                chatBubble: eng.p2.chatBubble, 
                name: isHost ? allyName : playerName, 
                hasContinued: eng.p2.hasContinued
              } : null,
                p1_skills: eng.p ? eng.p.skills : null,
                p2_skills: eng.p2 ? eng.p2.skills : null,
                p1_potBuffs: eng.p ? eng.p.potBuffs : null,
                p2_potBuffs: eng.p2 ? eng.p2.potBuffs : null,
                p1_level: eng.p ? eng.p.level : 1, p1_xp: eng.p ? eng.p.xp : 0, p1_xpNext: eng.p ? eng.p.xpNext : 80,
                p2_level: eng.p2 ? eng.p2.level : 1, p2_xp: eng.p2 ? eng.p2.xp : 0, p2_xpNext: eng.p2 ? eng.p2.xpNext : 80,
                ts: Date.now()
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
            
            // 🔥 Binalik natin ang nawalang loop at collision check!
            for (const enemy of eng.enemies) {
              if (Math.hypot(enemy.x - sl.x, enemy.y - sl.y) < enemy.r + 28) {
                if (!sl.hits.has(enemy)) {
                  sl.hits.add(enemy);
                  
                  const shooterObj = sl.p2 ? eng.p2 : eng.p;
                  
                  let baseSkillDmg = 42 + ((eng?.wave || 1) * 25) + ((shooterObj?.dmg || 0) * 1.5);
                  if (shooterObj?.potBuffs?.power > 0) baseSkillDmg *= 1.4;
                  if (shooterObj?.skills?.arcaneInstinct?.duration > 0) baseSkillDmg *= 2.0; 
                  if (enemy.instabTime > 0) baseSkillDmg *= 1.5;
                  
                  let totalCrit = (shooterObj?.baseCrit || 0) + (shooterObj?.potBuffs?.crit > 0 ? 35 : 0);
                  let isCrit = false;
                  if (Math.random() < (totalCrit / 100)) {
                    baseSkillDmg *= 2;
                    enemy.flash = 0.45;
                    isCrit = true;
                  } else {
                    enemy.flash = 0.15;
                  }

                  enemy.hp -= baseSkillDmg;
                  window.recordArcaneDamage('Vacuum Slash', baseSkillDmg);
                  spawnFCT(eng, enemy.x, enemy.y, baseSkillDmg, 'damage', isCrit); // 💥 ADDED FCT
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
              
              // 💥 ITO YUNG PARA SA SHOOTING STAR (Shockwave imbes na Crater)
              if (!eng.decals) eng.decals = [];
              eng.decals.push({ 
                type: 'shockwave', // 🔥 Flag para maging expanding ring sa renderer
                x: star.x, 
                y: star.targetY, 
                r: star.radius * 2.5, // Max radius kung hanggang saan aabot ang shockwave
                life: 0.5, // 0.5 seconds na mabilisang pag-expand
                maxLife: 0.5,
                color: '96, 165, 250' // Light blue Arcane energy (RGB)
              });

              for (const enemy of eng.enemies) {
                if (Math.hypot(enemy.x - star.x, enemy.y - star.targetY) <= star.radius) {
                  const shooterObj = star.p2 ? eng.p2 : eng.p;
                  
                  // 🔥 DYNAMIC SCALED DPS: Shooting Star
                  let splashDmg = 70 + ((eng?.wave || 1) * 40) + ((shooterObj?.dmg || 0) * 2.0);
                  
                  if (shooterObj?.potBuffs?.power > 0) splashDmg *= 1.4;
                  if (shooterObj?.skills?.arcaneInstinct?.duration > 0) splashDmg *= 2.0; 
                  if (enemy.instabTime > 0) splashDmg *= 1.5;
                  
                  let totalCrit = (shooterObj?.baseCrit || 0) + (shooterObj?.potBuffs?.crit > 0 ? 35 : 0);
                  let isCrit = false;
                  if (Math.random() < (totalCrit / 100)) {
                    splashDmg *= 2;
                    enemy.flash = 0.5;
                    isCrit = true;
                  } else {
                    enemy.flash = 0.2;
                  }

                  enemy.hp -= splashDmg;
                  window.recordArcaneDamage('Shooting Star', splashDmg);
                  spawnFCT(eng, enemy.x, enemy.y, splashDmg, 'damage', isCrit); 
                  if (enemy.hp <= 0) enemy.deadTrigger = true;
                }
              }
              
              // 💥 INTENSE PARTICLE BURST (Perfect Circle) PARA MAS FEEL ANG SHOCKWAVE
              for (let k = 0; k < 24; k++) {
                const pa = (k / 24) * Math.PI * 2; // Pantay-pantay na hugis bilog
                const ps = 150 + Math.random() * 50; // Mabilis na sabog
                eng.particles.push({ 
                    x: star.x, y: star.targetY, 
                    vx: Math.cos(pa) * ps, vy: Math.sin(pa) * ps, 
                    color: '#60a5fa', life: 0.4, ml: 0.4, r: 3.5 
                });
              }
              
              eng.stars.splice(sIdx, 1);
            }
          }
        }

       if (eng.cubeBashes) {
          for (let cbIdx = eng.cubeBashes.length - 1; cbIdx >= 0; cbIdx--) {
            const cb = eng.cubeBashes[cbIdx];
            cb.radius += cb.speed * dt;

            // 🔥 1. INITIALIZE HIT TRACKER: Para isang beses lang tamaan ang kalaban bawat Cube Bash
            if (!cb.hitEnemies) cb.hitEnemies = new Set();

            // 💥 2. COLLISION & DAMAGE SCALING LOGIC
            for (const enemy of eng.enemies) {
              // I-check kung buhay pa, pasok sa radius, at HINDI PA natatamaan ng bash na ito
              if (enemy.hp > 0 && !cb.hitEnemies.has(enemy)) {
                let dist = Math.hypot(enemy.x - cb.x, enemy.y - cb.y);
                
                if (dist <= cb.radius) {
                  cb.hitEnemies.add(enemy); // I-lista para di na ma-damage sa next frame

                  const shooterObj = cb.p2 ? eng.p2 : eng.p;
                  
                  // 🔥 3. DYNAMIC SCALED DPS
                  let bashDmg = 50 + ((eng.wave || 1) * 30) + ((shooterObj?.dmg || 0) * 1.5);
                  
                  // Buffs Multipliers
                  if (shooterObj?.potBuffs?.power > 0) bashDmg *= 1.4;
                  if (shooterObj?.skills?.arcaneInstinct?.duration > 0) bashDmg *= 2.0; 
                  if (enemy.instabTime > 0) bashDmg *= 1.5;
                  
                  // Critical Hit Logic
                  let totalCrit = (shooterObj?.baseCrit || 0) + (shooterObj?.potBuffs?.crit > 0 ? 35 : 0);
                  let isCrit = false;
                  if (Math.random() < (totalCrit / 100)) {
                    bashDmg *= 2;
                    enemy.flash = 0.5;
                    isCrit = true;
                  } else {
                    enemy.flash = 0.2;
                  }

                  // Apply Damage
                  enemy.hp -= bashDmg;
                  spawnFCT(eng, enemy.x, enemy.y, bashDmg, 'damage', isCrit);
                  window.recordArcaneDamage('Cube Bash', bashDmg); 
                  
                  if (enemy.hp <= 0) enemy.deadTrigger = true;
                }
              }
            }

            // 🗑️ 4. REMOVE KAPAG TAPOS NA MAG-EXPAND
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
            col.radius += col.speed * dt; // 🔥 FIX: Faster traveling wave
            
            if (col.pulseTimer >= 0.4 && col.pulseCount < 8) { // 🔥 BUFF: 8 pulses total, faster intervals
              col.pulseTimer = 0;
              col.pulseCount++;
              eng.screenShake = 1.0;

              if (!eng.decals) eng.decals = [];
              eng.decals.push({ x: col.x, y: col.y, r: col.radius, life: 5.0, maxLife: 5.0 });

              for (const enemy of eng.enemies) {
                let colPulseDmg = 200 + ((eng.wave || 1) * 25) + ((eng.p?.dmg || 0) * 3.5);
                if (enemy.instabTime > 0) colPulseDmg *= 1.5;
                enemy.hp -= colPulseDmg;
                window.recordArcaneDamage('Arcane Collapse', colPulseDmg);
                spawnFCT(eng, enemy.x, enemy.y, colPulseDmg, 'damage', false); // 💥 ADDED FCT
                enemy.flash = 0.35;
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
            if (pot.life <= 0) { eng.potions.splice(pIdx, 1); continue;
            }

            let tx = eng.p ? eng.p.x : W/2, ty = eng.p ? eng.p.y : H/2; let targetPlayer = eng.p;
            if (isCoopActive && eng.p2 && !eng.p2.dead) {
              const dP1 = eng.p ? Math.hypot(eng.p.x - pot.x, eng.p.y - pot.y) : Infinity;
              if (Math.hypot(eng.p2.x - pot.x, eng.p2.y - pot.y) < dP1) {
                tx = eng.p2.x;
                ty = eng.p2.y; targetPlayer = eng.p2;
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
                  // 🔥 PERCENTAGE HEAL: Maghe-heal ng 25% ng Max HP ng nakapulot
                  const healAmount = targetPlayer.maxHp * 0.25;
                  targetPlayer.hp = Math.min(targetPlayer.maxHp, targetPlayer.hp + healAmount);
                  spawnFCT(eng, targetPlayer.x, targetPlayer.y, healAmount, 'heal'); // 💥 TRIGGER
                } else if (pot.type === 'regen') {
                targetPlayer.potBuffs.regen = 10.0;
              } else if (pot.type === 'freeze') {
                // ❄️ CHRONO-CRYSTAL EFFECT
                playSfx('freeze'); // 🔊 SOUND EFFECT DITO LANG PARA SA FREEZE
                // eng.screenShake = 1.0;
                targetPlayer.chatBubble = { text: "TIME FREEZE!", life: 2.0 };
                for (const enemy of eng.enemies) {
                  enemy.stunnedTime = 8.0; 
                  enemy.temporalSlowTime = 8.0;
                  enemy.flash = 0.5;
                }
                } else if (pot.type === 'nuke') {
                // ☢️ ARCANE NUKE EFFECT - BALANCED PERCENTAGE
                playSfx('nuke'); 
                eng.screenShake = 1.0;
                targetPlayer.chatBubble = { text: "ARCANE NUKE!", life: 2.0 };
                
                for (const enemy of eng.enemies) {
                  if (!enemy.boss) {
                     // Normal minions: Bawas 80% ng Max HP nila (Hindi na guaranteed insta-kill kung full HP pa sila)
                     enemy.hp -= (enemy.maxHp * 0.80);
                  } else {
                    // Bosses: Bawas 15% ng Max HP, capped based on current wave to prevent late-game exploits
                     const maxBossNukeDmg = 5000 + ((eng.wave || 1) * 1500);
                     enemy.hp -= Math.min(enemy.maxHp * 0.15, maxBossNukeDmg);
                  }
                  
                  // Siguraduhing mamatay kung sumagad sa 0 ang HP
                  if (enemy.hp <= 0) {
                      enemy.hp = 0;
                      enemy.deadTrigger = true;
                  }
                  
                  enemy.flash = 1.0;
                }
                
                // Nuke explosion particles
                for(let k=0; k<100; k++) {
                   const pa = Math.random()*Math.PI*2;
                   const ps = Math.random()*400+100;
                   eng.particles.push({ x: pot.x, y: pot.y, vx: Math.cos(pa)*ps, vy: Math.sin(pa)*ps, color: '#fef08a', life: 1.0, ml: 1.0, r: Math.random()*4+2 });
                }
              } else {
                targetPlayer.potBuffs[pot.type] = 12.0;
              }
              // Normal particles para sa regular potions (hindi nuke)
              if (pot.type !== 'nuke') {
                for(let k=0; k<8; k++) {
                  eng.particles.push({ x: pot.x, y: pot.y, vx: (Math.random()-0.5)*120, vy: (Math.random()-0.5)*120, color: '#f472b6', life: 0.25, ml: 0.25, r: 2 });
                }
              }
              if (pot.isPulled) window.recordArcaneUtility('Voidling Loot', 1);
              eng.potions.splice(pot.type === 'xp' ? eng.potions.indexOf(pot) : pIdx, 1);
            }
          }
        }
// 🎒 EQUIPMENT PICKUP LOGIC (NO MAGNET VERSION)
        if (eng.droppedItems) {
          for (let i = eng.droppedItems.length - 1; i >= 0; i--) {
            const drop = eng.droppedItems[i];
            drop.life -= dt;
            if (drop.life <= 0) { 
              eng.droppedItems.splice(i, 1); 
              continue; 
            }

            // (Dito mo binura yung vacuum effect block)

            // Pickup collision (Dito lang siya papulot pag tinapakan na ng player)
            let tx = eng.p ? eng.p.x : W/2, ty = eng.p ? eng.p.y : H/2; 
            let targetPlayer = eng.p;
            
            // Check kung sino ang mas malapit sa item para sa pickup
            if (isCoopActive && eng.p2 && !eng.p2.dead) {
              const dP1 = eng.p ? Math.hypot(eng.p.x - drop.x, eng.p.y - drop.y) : Infinity;
              if (Math.hypot(eng.p2.x - drop.x, eng.p2.y - drop.y) < dP1) {
                targetPlayer = eng.p2;
              }
            }

            if (!targetPlayer) continue;

            // Collision check: Kailangan physical touch bago mapulot
            if (!targetPlayer.dead && Math.hypot(targetPlayer.x - drop.x, targetPlayer.y - drop.y) < targetPlayer.r + 20) {
              if (!targetPlayer.inventory) targetPlayer.inventory = [];
              if (targetPlayer.inventory.length < 16) { 
                targetPlayer.inventory.push(drop.item);
                
                // Notification bubble
                targetPlayer.chatBubble = { text: `+ ${drop.item.name}`, life: 2.0 };
                eng.droppedItems.splice(i, 1);
                
                // Update React UI
                setInvTrigger(prev => prev + 1); 
              } else {
                 // Option: Pwede mong lagyan ng chat bubble kung puno na bag
                 targetPlayer.chatBubble = { text: "Inventory Full!", life: 1.0 };
              }
            }
          }
        }

       if (eng.gameStarted) {
          if (eng.enemies.length > 0) {
            
            // ===============================================
            // 🔥 PLAYER 1 (HOST) BOSS MAGNET AUTO-AIM
            // ===============================================
            if (eng.p && !eng.p.dead) {
              eng.p.shootCd -= dt;
              if (eng.p.shootCd <= 0) {
                let near = null, nd = Infinity;
                for (const e of eng.enemies) {

                  const isBigBoss = e.boss || e.type === 'abyss' || e.type === 'abyss_awakened' || e.type === 'primordial';
                  if (e.hp <= 0 || (e.y < -50 && !isBigBoss)) continue;
                  let d = Math.hypot(e.x - eng.p.x, e.y - eng.p.y) - (e.r || 15);
                  
                  if (d < nd) { nd = d; near = e; }
                }
                if (near) {
                  let activeRate = (eng.p.skills?.berserk?.duration > 0 && eng.p.skills?.berserk?.enabled !== false) ?
                    (eng.p.shootRate * 0.5) : eng.p.shootRate;
                  if (eng.p.skills?.arcaneInstinct?.duration > 0) activeRate *= 0.15;

                  eng.p.shootCd = activeRate;
                  const ba = Math.atan2(near.y - eng.p.y, near.x - eng.p.x);
                  
                  // 🔥 FIX: TIGHTER SPREAD LOGIC PARA MAS TUMAMA
                  // Kung dati ay laging 0.18, ngayon ay liliit ang spread kapag dumami ang bullets
                  // para hindi sumabog kung saan-saan.
                  const sp = Math.max(0.05, 0.25 - (eng.p.multiShot * 0.015)); 
                  
                  for (let i = 0; i < eng.p.multiShot; i++) {
                    const a = ba + (i - (eng.p.multiShot - 1) / 2) * sp;
                    eng.bullets.push({ x: eng.p.x, y: eng.p.y, vx: Math.cos(a) * 390, vy: Math.sin(a) * 390, r: 5, life: 2, p2: false });
                  }
                }
              }
            }

            // ===============================================
            // 🔥 PLAYER 2 (GUEST) BOSS MAGNET AUTO-AIM
            // ===============================================
            if (isCoopActive && eng.p2 && !eng.p2.dead) {
              eng.p2.shootCd -= dt;
              if (eng.p2.shootCd <= 0) {
                let near = null, nd = Infinity;
                for (const e of eng.enemies) {
                  const isBigBoss = e.boss || e.type === 'abyss' || e.type === 'abyss_awakened' || e.type === 'primordial';
                  if (e.hp <= 0 || (e.y < -50 && !isBigBoss)) continue; 
                  
                  let d = Math.hypot(e.x - eng.p2.x, e.y - eng.p2.y) - (e.r || 15);
                  
                  if (d < nd) { nd = d; near = e; }
                }
                if (near) {
                  let activeRatep2 = (eng.p2.skills?.berserk?.duration > 0 && eng.p2.skills?.berserk?.enabled !== false) ?
                    (eng.p2.shootRate * 0.5) : eng.p2.shootRate;
                  if (eng.p2.skills?.arcaneInstinct?.duration > 0) activeRatep2 *= 0.15; 

                  eng.p2.shootCd = activeRatep2;
                  const ba = Math.atan2(near.y - eng.p2.y, near.x - eng.p2.x);
                  
                  // 🔥 FIX: TIGHTER SPREAD LOGIC PARA MAS TUMAMA (Gawin din sa P2)
                  const sp = Math.max(0.05, 0.25 - (eng.p2.multiShot * 0.015));

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

              if (b.isEnemy) {
                for (const pTarget of [eng.p, isCoopActive ? eng.p2 : null]) {
                  if (pTarget && !pTarget.dead && pTarget.inv <= 0 && Math.hypot(b.x - pTarget.x, b.y - pTarget.y) < b.r + pTarget.r) {

                    let damageTaken = b.dmg;
                    const defStat = pTarget.baseDef || 0;
                    let reduction = defStat / (100 + defStat);
                    reduction = Math.min(0.85, reduction);
                    damageTaken *= (1 - reduction);

                    // --- 👼 HOLY SERAPH: DIVINE ABSORPTION SHIELD ---
                    if (pTarget.divineShield && pTarget.divineShield.active) {
                        if (pTarget.divineShield.hp >= damageTaken) {

                            window.recordArcaneUtility('Light Shield', damageTaken);

                            pTarget.divineShield.hp -= damageTaken;
                            pTarget.divineShield.hitFlash = 0.2; 
                            spawnFCT(eng, pTarget.x, pTarget.y, damageTaken, 'shield'); // 💥 TRIGGER
                            damageTaken = 0;
                        } else {

                            window.recordArcaneUtility('Light Shield', pTarget.divineShield.hp);

                            spawnFCT(eng, pTarget.x, pTarget.y, pTarget.divineShield.hp, 'shield'); // 💥 TRIGGER
                            damageTaken -= pTarget.divineShield.hp;
                            pTarget.divineShield.hp = 0;
                            pTarget.divineShield.active = false;
                            
                            for(let k=0; k<40; k++) {
                                const pa = Math.random() * Math.PI * 2;
                                const ps = Math.random() * 350 + 100;
                                eng.particles.push({ x: pTarget.x, y: pTarget.y, vx: Math.cos(pa)*ps, vy: Math.sin(pa)*ps, color: '#fef08a', life: 0.8, ml: 0.8, r: Math.random()*3+2 });
                            }
                        }
                    }
                    // -------------------------------------------------

                    if (pTarget.potBuffs?.defense > 0) damageTaken *= 0.65;

                    if (pTarget.skills?.shield?.duration > 0 && pTarget.skills?.shield?.enabled !== false) {
                      if (damageTaken > 0) spawnFCT(eng, pTarget.x, pTarget.y, damageTaken, 'shield'); // 💥 LALABAS NA ANG SHIELD TEXT
                      damageTaken = 0;
                    } else if (pTarget.skills?.fortify?.learned && pTarget.skills?.fortify?.enabled !== false) {
                        damageTaken *= 0.75;
                    }
                    pTarget.hp -= damageTaken;
                    const isCoopLocal = Boolean(netRef.current && netRef.current.channel) && !netRef.current.isHost ? eng.p2 : eng.p;
                    if (pTarget === isCoopLocal) window.arcaneDamageTaken = (window.arcaneDamageTaken || 0) + damageTaken;
                    if (damageTaken > 0) spawnFCT(eng, pTarget.x, pTarget.y, damageTaken, 'damageTaken'); // 💥 TRIGGER
                    
                    pTarget.inv = 0.7;
                    if (pTarget.hp <= 0) {
                      pTarget.dead = true;

                      if (pTarget.voidCrystals > 0) {
                        const currentBank = parseInt(localStorage.getItem('arcane_void_crystals') || '0', 10);
                        localStorage.setItem('arcane_void_crystals', currentBank + pTarget.voidCrystals);
                        pTarget.voidCrystals = 0; // Reset to avoid double saving
                      }

                      if (!isCoopActive || (isCoopActive && eng.p && eng.p.dead && eng.p2 && eng.p2.dead)) {
                        // 🔥 FIX: I-check muna kung active ang co-op bago mag-send ng network signal!
                        if (isCoopActive && netRef.current?.channel) {
                           netRef.current.channel.send('game_over', {}); 
                        }
                        setScreen('gameover');
                      }
                    }
                    hit = true; eng.bullets.splice(i, 1); break;
                  }
                }
                continue;
              }

                for (let j = eng.enemies.length - 1; j >= 0; j--) {
                const e = eng.enemies[j];
                if (Math.hypot(b.x - e.x, b.y - e.y) < b.r + e.r) {
                  const shooterObj = b.p2 ? eng.p2 : eng.p;
                  const isBerserkActive = b.p2 ? (eng.p2?.skills?.berserk?.duration > 0 && eng.p2?.skills?.berserk?.enabled !== false) : (eng.p?.skills?.berserk?.duration > 0 && eng.p?.skills?.berserk?.enabled !== false);
                  // let calculatedDmg = isBerserkActive ? Math.ceil((eng.boltDmg + (shooterObj?.dmg || 0)) * 1.5) : (eng.boltDmg + (shooterObj?.dmg || 0));
                  let calculatedDmg = b.isFamiliar ? b.dmg : (isBerserkActive ? Math.ceil((eng.boltDmg + (shooterObj?.dmg || 0)) * 1.5) : (eng.boltDmg + (shooterObj?.dmg || 0)));
                  if (shooterObj?.potBuffs?.power > 0) calculatedDmg = Math.ceil(calculatedDmg * 1.4); 
                  if (shooterObj?.skills?.arcaneInstinct?.duration > 0) calculatedDmg = Math.ceil(calculatedDmg * 2.0); // 🔥 BUFF: Final bullet damage x5.0
                  if (e.instabTime > 0) calculatedDmg = Math.ceil(calculatedDmg * 1.5);

                  let totalCrit = (shooterObj?.baseCrit || 0) + (shooterObj?.potBuffs?.crit > 0 ? 35 : 0);
                  let isCrit = false;
                  if (Math.random() < (totalCrit / 100)) {
                    calculatedDmg *= 2;
                    e.flash = 0.45;
                    isCrit = true;
                  } else {
                    e.flash = 0.1;
                  }

                  e.hp -= calculatedDmg;
                  window.recordArcaneDamage(b.isFamiliar ? 'Ignis Wisp' : 'Basic Attack', calculatedDmg); // 👈 FIXED
                  spawnFCT(eng, e.x, e.y, calculatedDmg, 'damage', isCrit); // 💥 TRIGGER FCT

                  const hasBodyCutter = b.p2 ? (eng.p2?.skills?.bodyCutter?.learned && eng.p2?.skills?.bodyCutter?.enabled !== false) : (eng.p?.skills?.bodyCutter?.learned && eng.p?.skills?.bodyCutter?.enabled !== false);
                  if (hasBodyCutter) e.stigmaTime = 4.0;

                  for(let k=0; k<5; k++) {
                    const pa = Math.random()*Math.PI*2;
                    const ps = Math.random()*80+40;
                    eng.particles.push({ x: b.x, y: b.y, vx: Math.cos(pa)*ps, vy: Math.sin(pa)*ps, color: e.color, life: 0.3, ml: 0.3, r: 2 });
                  }
                  eng.bullets.splice(i, 1);
                  hit = true;
                  
                  // 🔥 THE FIX: Stop processing drops and splices here. 
                  // Let the main game loop's death handler process everything so it can trigger the cinematic.
                  if (e.hp <= 0) {
                    e.deadTrigger = true; 
                  }
                  break;
                }
              }
              if (hit) continue;
            }

            for (let j = eng.enemies.length - 1; j >= 0; j--) {
              const e = eng.enemies[j];
              
              if (e.flash > 0) e.flash -= dt;

              if (e.boss && ['demonKnight', 'archdemon', 'primordial', 'abyss', 'abyss_awakened'].includes(e.type)) {
                
                // =========================================================
                // 🔥 FIXED: ABYSS AWAKENED CUSTOM SKILLS (NASA LABAS NA!)
                // =========================================================
                if (e.type === 'abyss_awakened') {
                    e.summonTimer = (e.summonTimer || 0) + dt;
                    e.dashTimer = (e.dashTimer || 0) + dt;

                    // Skill 1: Summon Void Spawns
                    if (e.summonTimer >= 5.0) {
                        e.summonTimer = 0;
                        for (let k = 0; k < 4; k++) {
                            let spawnAngle = (Math.PI * 2 / 4) * k;
                            eng.enemies.push({
                                x: e.x + Math.cos(spawnAngle) * 100, 
                                y: e.y + Math.sin(spawnAngle) * 100,
                                r: 20, speed: 250, hp: 50000 * (eng.diffScale || 1), maxHp: 50000 * (eng.diffScale || 1), 
                                dmg: 1000 * (eng.diffScale || 1), xp: 5000, 
                                color: '#000000', glow: '#dc2626', type: 'void_spawn',
                                flash: 0, stunnedTime: 0, stigmaTime: 0, temporalSlowTime: 0, arcaneBurnTime: 0
                            });
                        }
                    }

                    // Skill 2: Abyssal Dash
                    if (e.dashTimer >= 8.0) {
                        e.speed = 450; 
                        if (e.dashTimer >= 9.5) {
                            e.speed = 75; 
                            e.dashTimer = 0;
                        }
                    }
                }
                // =========================================================

                if (e.skillTimer === undefined) e.skillTimer = 2.0;
                e.skillTimer -= dt;

                if (e.skillTimer <= 0) {
                  // Mabilis mag-cast ng skill pag Awakened (3.0s din gaya ng normal abyss)
                  e.skillTimer = (e.type === 'abyss' || e.type === 'abyss_awakened') ? 3.0 : 3.5; 
                  
                  let tx = eng.p ? eng.p.x : W/2, ty = eng.p ? eng.p.y : H/2;
                  if (isCoopActive && eng.p2 && !eng.p2.dead) {
                    const d1 = (!eng.p || eng.p.dead) ? Infinity : Math.hypot(e.x - eng.p.x, e.y - eng.p.y);
                    const d2 = Math.hypot(e.x - eng.p2.x, e.y - eng.p2.y);
                    if (d2 < d1) { tx = eng.p2.x; ty = eng.p2.y; }
                  }
                  const baseAngle = Math.atan2(ty - e.y, tx - e.x);

                  // 🔥 FIXED: ISINAMA SI AWAKENED SA RED ZONE (Mas malaki at mas masakit!)
                  const isVoidBoss = e.type === 'abyss' || e.type === 'abyss_awakened';
                  if ((isVoidBoss || e.type === 'primordial') && Math.random() < (e.type === 'abyss_awakened' ? 0.45 : e.type === 'abyss' ? 0.35 : 0.20)) {
                      if (!eng.aoeZones) eng.aoeZones = [];
                      
                      eng.aoeZones.push({ 
                          x: tx, y: ty, 
                          // 220 Radius kapag Awakened!
                          radius: e.type === 'abyss_awakened' ? 220 : e.type === 'abyss' ? 180 : 130, 
                          timer: 1.5, maxTimer: 1.5, 
                          dmg: e.type === 'abyss_awakened' ? 2500 : e.type === 'abyss' ? 1500 : 800 
                      });
                      
                      if (isVoidBoss) e.chatBubble = { text: "PERISH IN THE VOID!", life: 1.5 };
                      
                  } else {
                      // 🔫 FIXED: ISINAMA SI AWAKENED SA BULLET HELLS
                      if (e.type === 'abyss_awakened') {
                        // 30 Bullets na sobrang bibilis!
                        for (let k = 0; k < 30; k++) {
                          const angle = (Math.PI * 2 / 30) * k + (Math.random() * 0.2);
                          eng.bullets.push({ x: e.x, y: e.y, vx: Math.cos(angle)*380, vy: Math.sin(angle)*380, r: 12, life: 6, isEnemy: true, dmg: 300 });
                        }
                      } else if (e.type === 'abyss') {
                        for (let k = 0; k < 24; k++) {
                          const angle = (Math.PI * 2 / 24) * k + (Math.random() * 0.2);
                          eng.bullets.push({ x: e.x, y: e.y, vx: Math.cos(angle)*300, vy: Math.sin(angle)*300, r: 10, life: 6, isEnemy: true, dmg: 150 });
                        }
                      } else if (e.type === 'primordial') {
                        for (let k = 0; k < 12; k++) {
                          const angle = (Math.PI * 2 / 12) * k;
                          eng.bullets.push({ x: e.x, y: e.y, vx: Math.cos(angle)*250, vy: Math.sin(angle)*250, r: 8, life: 5, isEnemy: true, dmg: 80 });
                        }
                      } else if (e.type === 'archdemon') {
                        for (let k = -1; k <= 1; k++) {
                          const angle = baseAngle + (k * 0.3);
                          eng.bullets.push({ x: e.x, y: e.y, vx: Math.cos(angle)*350, vy: Math.sin(angle)*350, r: 6, life: 4, isEnemy: true, dmg: 50 });
                        }
                      } else if (e.type === 'demonKnight') {
                        eng.bullets.push({ x: e.x, y: e.y, vx: Math.cos(baseAngle)*450, vy: Math.sin(baseAngle)*450, r: 7, life: 4, isEnemy: true, dmg: 35 });
                      }
                  }
                }

                // 🛡️ THE ABYSS SHIELD LOGIC (Gagana na rin kay Awakened kung gusto mo)
                if (e.type === 'abyss' || e.type === 'abyss_awakened') {
                  if (e.abyssShieldCd > 0) e.abyssShieldCd -= dt;
                  if (e.abyssShieldCd <= 0) {
                    e.abyssShieldTimer = 2.0; 
                    e.abyssShieldCd = 12.0; 
                  }
                  if (e.abyssShieldTimer > 0) {
                    e.abyssShieldTimer -= dt;
                    if (e.hp < e.prevHpFrame) e.hp = e.prevHpFrame; // Invulnerable state
                  }
                  e.prevHpFrame = e.hp;
                }
              }
        if (e.stigmaTime > 0) {
          e.stigmaTime -= dt;
          const stigmaDps = 20 + ((eng?.wave || 1) * 15);
          e.hp -= stigmaDps * dt;
          window.recordArcaneDamage('Body Cutter', stigmaDps * dt);
          if (Math.random() < 0.1) spawnFCT(eng, e.x, e.y, stigmaDps * 0.1, 'damage', false); // 💥 ADDED FCT
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

          if (e.boss) {
                  let crystalYield = 0;
                  if (e.type === 'miniBoss') crystalYield = 1 + Math.floor(Math.random() * 2);
                  else if (e.type === 'demonKnight') crystalYield = 10 + Math.floor(Math.random() * 10);
                  else if (e.type === 'archdemon') crystalYield = 25 + Math.floor(Math.random() * 25);
                  else if (e.type === 'primordial') crystalYield = 100 + Math.floor(Math.random() * 50);
                  else if (e.type === 'abyss') crystalYield = 300 + Math.floor(Math.random() * 200);

               // 1. IBIGAY MUNA ANG REWARDS DEPENDE KUNG SINO ANG NAMATAY
          if (e.type === 'abyss_awakened') {
              console.log("🔥 THE ABYSS AWAKENED IS DEAD!");
              const waveScaling = Math.floor((eng.wave || 100) / 10) * 100;
              crystalYield = 500 + Math.floor(Math.random() * 200) + waveScaling;
          } 
          else if (e.type === 'primordial') {
              console.log("🔥 A PRIMORDIAL DEMON IS DEAD!");
              // (Panatilihin mo dito kung ano mang logic meron ka dati sa pagbibigay ng crystals/score para sa Primordial)
              crystalYield = 300; // Halimbawa lang ito
          }
          // ... (Iba pang bosses kung meron)


          // 2. 🔥 ANG UNIVERSAL WAVE 100 CINEMATIC TRIGGER
          // Ito ay tatakbo kapag may namatay na Abyss Awakened O Primordial sa Wave 100
          if (eng.wave === 100 && (e.type === 'abyss_awakened' || e.type === 'primordial')) {
              let remainingBosses = 0;
              
              // Bibilangin ng laro kung may natitira pang Primordial O Abyss na buhay
              for (let k = 0; k < eng.enemies.length; k++) {
                  const otherEnemy = eng.enemies[k];
                  if (otherEnemy !== e && 
                      (otherEnemy.type === 'abyss_awakened' || otherEnemy.type === 'primordial') && 
                      !otherEnemy.deadTrigger && 
                      otherEnemy.hp > 0) {
                      remainingBosses++;
                  }
              }

              // Kapag UBOS NA ang The Abyss Awakened AT ang dalawang Primordial Demons (0 ang natitira)
              if (remainingBosses === 0) {                  
              // 🎁 BONUS REWARD: Full Heal dahil na-clear na ang wave
              if (eng.p && !eng.p.dead) eng.p.hp = eng.p.maxHp;
              if (eng.p2 && !eng.p2.dead) eng.p2.hp = eng.p2.maxHp;
              
              // SCREEN WIPE: Patayin lahat ng maliliit na kalaban na naiwan
              for (let k = 0; k < eng.enemies.length; k++) {
                  if (eng.enemies[k] !== e) {
                      eng.enemies[k].deadTrigger = true; 
                  }
              }

              // Play Cinematic with DELAY
                if (!window.hasShownVictoryCinematic) {
                   window.hasShownVictoryCinematic = true;

                   // 🔥 STEP 1: PATAHIMIKIN ANG MUSIC BAGO MAG-CINEMATIC
                   if (window.arcaneAudio) {
                      window.arcaneAudio.stopAllBgm();
                   }

                   // 🔥 Maghihintay ng 2 segundo para sa smooth transition / breathing room
                   setTimeout(() => {
                      window.showVictoryCinematic = 12.0; // 12.0 SECONDS real time
                   }, 500);
                }
          } else {
              }
          }

                  for (const pTarget of [eng.p, eng.p2]) {
                    if (pTarget && !pTarget.dead) {
                      pTarget.voidCrystals = (pTarget.voidCrystals || 0) + crystalYield;
                      pTarget.chatBubble = { text: `+${crystalYield} Void Crystals!`, life: 2.5 };
                    }
                  }

                  // 🟢 BULLETPROOF AUTO-BANK LOGIC
                  const net = netRef.current || {};
                  const isCoopActive = Boolean(net.channel);
                  const isHost = Boolean(net.isHost) || !isCoopActive;
                  
                  // I-save agad sa LocalStorage ng Host 
                  if (isHost && eng.p && !eng.p.dead) {
                      const currentBank = parseInt(localStorage.getItem('arcane_void_crystals') || '0', 10);
                      localStorage.setItem('arcane_void_crystals', currentBank + crystalYield);
                  }
                  
                  // I-sync sa Player 2 (Guest) para mai-save din sa sarili nilang phone/PC
                  if (isHost && isCoopActive && net.channel && eng.p2 && !eng.p2.dead) {
                      net.channel.send('sync_void_crystals', { amount: crystalYield });
                  }
                }

                

                // --- 🩸 LIFESTEAL TRIGGER ---
                for (const pTarget of [eng.p, eng.p2]) {
                  if (pTarget && !pTarget.dead && pTarget.lifeSteal > 0) {
                    pTarget.hp = Math.min(pTarget.maxHp, pTarget.hp + pTarget.lifeSteal);
                  }
                }

                eng.gems.push({ x: e.x, y: e.y, r: 7, xp: e.xp, life: 12 });

                // --- 💎 UTILITY & NORMAL DROPS ---
                const dropRoll = Math.random();
                if (dropRoll < 0.03 || (e.boss && dropRoll < 0.50)) { 
                  const rareTypes = ['freeze', 'nuke'];
                  eng.potions.push({
                    x: e.x, y: e.y, r: 14,
                    type: rareTypes[Math.floor(Math.random() * rareTypes.length)],
                    life: 20.0 
                  });
                } else if (dropRoll < 0.22) { 
                  const types = ['power', 'defense', 'crit', 'health', 'regen', 'xp'];
                  eng.potions.push({
                    x: e.x, y: e.y, r: 8,
                    type: types[Math.floor(Math.random() * types.length)],
                    life: 14.0
                  });
                }

                // --- 🎒 ALGORITHMIC ENDLESS DROP LOGIC (FOR CONTINUOUS SPAWNS) ---
                const dropRollEq = Math.random();
                let droppedRarity = null;
                const currentWave = eng.wave || 1;

                // 📈 WAVE MULTIPLIER: Tumataas ang swerte tuwing nakakalampas ng 20 waves ang laro
                // Wave 75 = 0% bonus | Wave 100 = +12.5% | Wave 120 = +22.5% 
                const endlessBonus = Math.min(0.60, Math.max(0, (currentWave - 75) * 0.005));

                if (e.type === 'abyss_awakened') {

                    const finalMythicChance = Math.min(0.90, 0.10 + endlessBonus);
                     if (dropRollEq < finalMythicChance) droppedRarity = 'mythic';               
                     else droppedRarity = 'legendary'; // Laging Legendary ang fallback, walang tapon!
                
                }

                else if (e.type === 'abyss') {
                  // Sasagad ito sa max na 80% Mythic Chance kapag sobrang late game!
                  const finalMythicChance = Math.min(0.80, 0.20 + endlessBonus);
                  
                  if (dropRollEq < finalMythicChance) droppedRarity = 'mythic';               
                  else droppedRarity = 'legendary'; // Laging Legendary ang fallback, walang tapon!
                  
                } else if (e.type === 'primordial') {
                  // Base 15% Mythic sa simula, sasagad sa max na 60%
                  const finalMythicChance = Math.min(0.60, 0.15 + endlessBonus);
                  const finalLegendaryChance = 0.50; // Fixed 50% chance spread para sa Legendary
                  
                  if (dropRollEq < finalMythicChance) droppedRarity = 'mythic';               
                  else if (dropRollEq < finalMythicChance + finalLegendaryChance) droppedRarity = 'legendary';       
                  else droppedRarity = 'epic';                                   
                  
                } else if (['demonKnight', 'archdemon'].includes(e.type)) {
                  // Ang mga mid-tier bosses ay nagkakaroon din ng pakonti-konting Mythic chance sa late game (Max 15%)
                  const finalMythicChance = Math.min(0.15, endlessBonus * 0.2);
                  const finalLegendaryChance = Math.min(0.40, 0.05 + endlessBonus);
                  
                  if (dropRollEq < finalMythicChance) droppedRarity = 'mythic';
                  else if (dropRollEq < finalMythicChance + finalLegendaryChance) droppedRarity = 'legendary';            
                  else if (dropRollEq < 0.85) droppedRarity = 'epic';            
                  else droppedRarity = 'rare';
                  
                } else {
                  // Normal Mobs & Mini Bosses (May swerte scaling din ng konti sa Epic at Rare)
                  const normalBonus = Math.min(0.02, endlessBonus * 0.1);
                  if (dropRollEq < 0.005 + normalBonus) droppedRarity = 'epic';                
                  else if (dropRollEq < 0.025 + normalBonus) droppedRarity = 'rare';           
                  else if (dropRollEq < 0.085) droppedRarity = 'common';         
                }


                if (droppedRarity) {
                        const pool = EQUIPMENT_DB.filter(item => item.rarity === droppedRarity);
                        if (pool.length > 0) {
                          const baseItem = pool[Math.floor(Math.random() * pool.length)];
                          const scaledItem = JSON.parse(JSON.stringify(baseItem));
                          
                          // 🔥 DYNAMIC ITEM SCALING BASED ON WAVE
                          const waveMult = Math.max(1, Math.floor((eng.wave || 1) / 5));
                          
                          if (scaledItem.stats.atk) scaledItem.stats.atk += Math.floor(waveMult * 3);
                          if (scaledItem.stats.def) scaledItem.stats.def += Math.floor(waveMult * 2);
                          if (scaledItem.stats.hp) scaledItem.stats.hp += Math.floor(waveMult * 15);
                          if (scaledItem.stats.crit) scaledItem.stats.crit += Math.floor(waveMult * 0.5);
                          
                          // 🔥 STATS CAPS APPLIED HERE
                          if (scaledItem.stats.lifesteal) {
                              scaledItem.stats.lifesteal += Math.floor(waveMult * 0.5);
                          }
                          if (scaledItem.stats.speed) {
                              scaledItem.stats.speed += Math.floor(waveMult * 5);
                              scaledItem.stats.speed = Math.min(scaledItem.stats.speed, 80); // Cap to 80
                          }
                          if (scaledItem.stats.rate) {
                              scaledItem.stats.rate += (waveMult * 0.02);
                              scaledItem.stats.rate = Math.min(scaledItem.stats.rate, 0.4); // Cap to 0.4 reduction
                          }

                          scaledItem.name = scaledItem.name + (waveMult > 1 ? ` (+${waveMult})` : "");

                          if (!eng.droppedItems) eng.droppedItems = []; 
                          eng.droppedItems.push({
                            x: e.x + (Math.random()-0.5)*20, 
                            y: e.y + (Math.random()-0.5)*20, 
                            item: scaledItem, 
                            life: 25.0
                          });
                        }
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
                  e.x += Math.cos(ea) * runSpeed * dt;
                  e.y += Math.sin(ea) * runSpeed * dt;
                }
              }
              
              if (eng.p && !eng.p.dead && eng.p.inv <= 0 && Math.hypot(e.x - eng.p.x, e.y - eng.p.y) < e.r + eng.p.r) {

                let damageTaken = e.dmg;
                const defStatP1 = eng.p.baseDef || 0;
                let reductionP1 = defStatP1 / (100 + defStatP1);
                reductionP1 = Math.min(0.85, reductionP1);
                damageTaken *= (1 - reductionP1);

                // --- 👼 HOLY SERAPH: DIVINE ABSORPTION SHIELD (P1) ---
                if (eng.p.divineShield && eng.p.divineShield.active) {
                    if (eng.p.divineShield.hp >= damageTaken) {
                        window.recordArcaneUtility('Light Shield', damageTaken); // 👈 DAGDAG ITO
                        eng.p.divineShield.hp -= damageTaken;
                        eng.p.divineShield.hitFlash = 0.2; 
                        spawnFCT(eng, eng.p.x, eng.p.y, damageTaken, 'shield'); 
                        damageTaken = 0;
                    } else {
                        window.recordArcaneUtility('Light Shield', eng.p.divineShield.hp); // 👈 DAGDAG ITO
                        spawnFCT(eng, eng.p.x, eng.p.y, eng.p.divineShield.hp, 'shield'); 
                        damageTaken -= eng.p.divineShield.hp;
                        eng.p.divineShield.hp = 0;
                        eng.p.divineShield.active = false;
                        
                        for(let k=0; k<40; k++) {
                            const pa = Math.random() * Math.PI * 2;
                            const ps = Math.random() * 350 + 100;
                            eng.particles.push({ x: eng.p.x, y: eng.p.y, vx: Math.cos(pa)*ps, vy: Math.sin(pa)*ps, color: '#fef08a', life: 0.8, ml: 0.8, r: Math.random()*3+2 });
                        }
                    }
                }
                // -------------------------------------------------

                if (e.voidExhaustTime > 0) damageTaken *= 0.5; 
                if (eng.p.potBuffs?.defense > 0) damageTaken *= 0.65;

                if (eng.p.skills?.shield?.duration > 0 && eng.p.skills?.shield?.enabled !== false) {
                  if (damageTaken > 0) spawnFCT(eng, eng.p.x, eng.p.y, damageTaken, 'shield'); // 💥 LALABAS NA
                  damageTaken = 0;
                } else if (eng.p.skills?.fortify?.learned && eng.p.skills?.fortify?.enabled !== false) {
                  damageTaken *= 0.75;
                }

                eng.p.hp -= damageTaken;
                const isCoopLocal = Boolean(netRef.current && netRef.current.channel) && !netRef.current.isHost ? eng.p2 : eng.p;
                if (eng.p === isCoopLocal) window.arcaneDamageTaken = (window.arcaneDamageTaken || 0) + damageTaken;
                eng.p.inv = 0.7;
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
                const defStatP2 = eng.p2.baseDef || 0;
                let reductionP2 = defStatP2 / (100 + defStatP2);
                reductionP2 = Math.min(0.85, reductionP2);
                damageTakenp2 *= (1 - reductionP2);

                 // --- 👼 HOLY SERAPH: DIVINE ABSORPTION SHIELD (P2) ---
                    if (eng.p2.divineShield && eng.p2.divineShield.active) {
                        if (eng.p2.divineShield.hp >= damageTakenp2) {
                            window.recordArcaneUtility('Light Shield', damageTakenp2); // 👈 DAGDAG ITO
                            eng.p2.divineShield.hp -= damageTakenp2;
                            eng.p2.divineShield.hitFlash = 0.2; 
                            spawnFCT(eng, eng.p2.x, eng.p2.y, damageTakenp2, 'shield'); 
                            damageTakenp2 = 0;
                        } else {
                            window.recordArcaneUtility('Light Shield', eng.p2.divineShield.hp); // 👈 DAGDAG ITO
                            spawnFCT(eng, eng.p2.x, eng.p2.y, eng.p2.divineShield.hp, 'shield'); 
                            damageTakenp2 -= eng.p2.divineShield.hp;
                            eng.p2.divineShield.hp = 0;
                            eng.p2.divineShield.active = false;
                        
                        for(let k=0; k<40; k++) {
                            const pa = Math.random() * Math.PI * 2;
                            const ps = Math.random() * 350 + 100;
                            eng.particles.push({ x: eng.p2.x, y: eng.p2.y, vx: Math.cos(pa)*ps, vy: Math.sin(pa)*ps, color: '#fef08a', life: 0.8, ml: 0.8, r: Math.random()*3+2 });
                        }
                    }
                }
                // -------------------------------------------------

                if (e.voidExhaustTime > 0) damageTakenp2 *= 0.5;
                if (eng.p2.potBuffs?.defense > 0) damageTakenp2 *= 0.65;

                if (eng.p2.skills?.shield?.duration > 0 && eng.p2.skills?.shield?.enabled !== false) {
                  if (damageTakenp2 > 0) spawnFCT(eng, eng.p2.x, eng.p2.y, damageTakenp2, 'shield'); // 💥 LALABAS NA
                  damageTakenp2 = 0;
                } else if (eng.p2.skills?.fortify?.learned && eng.p2.skills?.fortify?.enabled !== false) {
                  damageTakenp2 *= 0.75;
                }

                eng.p2.hp -= damageTakenp2;
                const isCoopLocal = Boolean(netRef.current && netRef.current.channel) && !netRef.current.isHost ? eng.p2 : eng.p;
                if (eng.p2 === isCoopLocal) window.arcaneDamageTaken = (window.arcaneDamageTaken || 0) + damageTakenp2;
                eng.p2.inv = 0.7;
                if (eng.p2.hp <= 0) {
                  eng.p2.dead = true;
                  if(!eng.p || eng.p.dead) { netRef.current.channel.send('game_over',{}); setScreen('gameover'); } 
                }
              }
            }

            for (let i = eng.gems.length - 1; i >= 0; i--) {
              const g = eng.gems[i];
              g.life -= dt;
              if (g.life <= 0) { eng.gems.splice(i, 1); continue;
              }
              let tx = eng.p ? eng.p.x : W/2, ty = eng.p ? eng.p.y : H/2; let targetPlayer = eng.p;
              if (isCoopActive && eng.p2 && !eng.p2.dead) {
                const dP1 = eng.p ? Math.hypot(eng.p.x - g.x, eng.p.y - g.y) : Infinity;
                if (Math.hypot(eng.p2.x - g.x, eng.p2.y - g.y) < dP1) {
                  tx = eng.p2.x;
                  ty = eng.p2.y; targetPlayer = eng.p2;
                }
              }

              if (!targetPlayer) continue;
              const gd = Math.hypot(tx - g.x, ty - g.y);
              
              // 🔥 CO-OP AUTO-VACUUM SYSTEM (WITH SMOOTH ACCELERATION ANIMATION)
              const isWaveEnding = (eng.waveLen - eng.waveT) <= 2.0;
              const pullRadius = isWaveEnding ? 5000 : 150; 
              
              if (gd < pullRadius) {
                // Mag-i-inject tayo ng sariling speed multiplier bawat gem para sa animation
                if (g.pullSpeed === undefined) g.pullSpeed = 0;
                
                // Dahan-dahang nag-a-accelerate (Mas mabilis ang acceleration kapag end-wave na)
                const accelRate = isWaveEnding ? 4000 : 900;
                g.pullSpeed += accelRate * dt;
                
                // Limitahan ang maximum speed para hindi lumagpas sa screen ang physics
                const maxSpeed = isWaveEnding ? 3000 : 550;
                g.pullSpeed = Math.min(g.pullSpeed, maxSpeed);

                const ga = Math.atan2(ty - g.y, tx - g.x);
                g.x += Math.cos(ga) * g.pullSpeed * dt; 
                g.y += Math.sin(ga) * g.pullSpeed * dt;
              } else {
                // I-reset ang speed kapag nakalabas sa higop range (para smooth din ang tigil)
                g.pullSpeed = 0; 
              }

              if (!targetPlayer.dead && Math.hypot(targetPlayer.x - g.x, targetPlayer.y - g.y) < targetPlayer.r + g.r) {
                let distributedXp = g.xp;
                if (targetPlayer.potBuffs?.xpBoost > 0) distributedXp = Math.ceil(distributedXp * 1.5); 


              if (isCoopActive && targetPlayer === eng.p2) {
                  eng.p2.xp += distributedXp;
                  while (eng.p2.xp >= eng.p2.xpNext) {
                    eng.p2.xp -= eng.p2.xpNext;
                    // 🔥 BALANCED XP SCALING: Para posibleng umabot ng Level 100+
                    eng.p2.xpNext = Math.ceil(eng.p2.xpNext * 1.18) + 150; 
                    eng.p2.level++;
                    eng.p2.pendingLevelUps = (eng.p2.pendingLevelUps || 0) + 1;
                  }
                } else if (eng.p) {
                  eng.p.xp += distributedXp;
                  while (eng.p.xp >= eng.p.xpNext) {
                    eng.p.xp -= eng.p.xpNext;
                    // 🔥 BALANCED XP SCALING: Para posibleng umabot ng Level 100+
                    eng.p.xpNext = Math.ceil(eng.p.xpNext * 1.18) + 150; 
                    eng.p.level++;
                    eng.p.pendingLevelUps = (eng.p.pendingLevelUps || 0) + 1;
                  }
                }
                if (g.isPulled) window.recordArcaneUtility('Voidling Loot', 1)
                eng.gems.splice(i, 1);
              }
            }
          }

          if (!isHost && isCoopActive) {
            for (let i = eng.bullets.length - 1; i >= 0; i--) {
              const b = eng.bullets[i];
              b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
              if (b.life <= 0 || b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) {
                eng.bullets.splice(i, 1);
              }
            }
          }
        }

        // =========================================================================
        // 🔥 STEP 5: GLOBAL LEVEL UP QUEUE HANDLER (Ilagay dito)
        // =========================================================================
        if (eng.p && !eng.p.dead && eng.p.pendingLevelUps > 0 && screenRef.current === 'playing' && !eng.p.isLevelingUp) {
            eng.p.isLevelingUp = true;
            eng.p.pendingLevelUps--;
            onLevelUpOffer(rollUpgradeOptions(eng.p));
            setScreen('levelup');
        }
        if (isHost && isCoopActive && eng.p2 && !eng.p2.dead && eng.p2.pendingLevelUps > 0 && !eng.p2.isLevelingUp) {
            eng.p2.isLevelingUp = true;
            eng.p2.pendingLevelUps--;
            netRef.current.channel.send('offer_levelup', { ups: rollUpgradeOptions(eng.p2) });
        }
        // =========================================================================

        const localTarget = (isCoopActive && !isHost) ? eng.p2 : eng.p;
        if (localTarget) {
          hudRef.current = { 
            score: eng.score, wave: eng.wave, waveT: eng.waveT, waveLen: eng.waveLen, 
            p: localTarget, p2: (isCoopActive && isHost) ? eng.p2 : eng.p,
            p1VotedRestart, p2VotedRestart
          };
        }

        if (scoreValueRef.current) scoreValueRef.current.textContent = formatLargeNumber(eng.score);
        if (waveValueRef.current) {
          const timeRem = Math.max(0, Math.ceil(eng.waveLen - eng.waveT));
          waveValueRef.current.textContent = `WAVE ${eng.wave} | ${timeRem}s`;
        }

        if (dashCdRef.current && localTarget) {
            if (localTarget.dashCd > 0) {
                dashCdRef.current.style.display = 'flex';
                dashCdRef.current.textContent = localTarget.dashCd.toFixed(1) + 's';
            } else {
                dashCdRef.current.style.display = 'none';
            }
        }

if (localTarget) {
          const hpPct = Math.max(0, Math.min(100, (localTarget.hp / localTarget.maxHp) * 100));
          if (hpFillRef.current) hpFillRef.current.style.width = `${hpPct}%`;
          if (hpTextRef.current) hpTextRef.current.textContent = `HP ${formatLargeNumber(Math.max(0, localTarget.hp))}/${formatLargeNumber(localTarget.maxHp)}`;
          
          const xpPct = Math.max(0, Math.min(100, (localTarget.xp / localTarget.xpNext) * 100));
          if (xpFillRef.current) xpFillRef.current.style.width = `${xpPct}%`;
          if (xpTextRef.current) xpTextRef.current.textContent = `XP ${formatLargeNumber(localTarget.xp)}/${formatLargeNumber(localTarget.xpNext)}`;

          // 👇 IDAGDAG ANG BUONG BLOCK NA ITO PARA SA VIGNETTE GLOW
          if (vignetteRef.current) {
            const hpRatio = localTarget.hp / localTarget.maxHp;
            if (hpRatio <= 0.2 && !localTarget.dead) {
              if (vignetteRef.current.className !== 'hp-vignette danger') vignetteRef.current.className = 'hp-vignette danger';
            } else if (hpRatio <= 0.5 && !localTarget.dead) {
              if (vignetteRef.current.className !== 'hp-vignette warning') vignetteRef.current.className = 'hp-vignette warning';
            } else {
              if (vignetteRef.current.className !== 'hp-vignette') vignetteRef.current.className = 'hp-vignette';
            }
          }
          // 👆 HANGGANG DITO
        }


        for (const e of eng.enemies) {
            if (e.chatBubble) {
              ctx.save();
              ctx.textAlign = 'center';
              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 12px monospace';
              ctx.shadowColor = '#000';
              ctx.shadowBlur = 4;
              ctx.fillText(e.chatBubble.text, e.x, e.y - e.r - 15);
              ctx.restore();
            }
          }

// =========================================================
          // 🏆 GAME CLEARED TIMER UPDATE (LOGIC ONLY)
          // =========================================================
          if (eng.endlessTransitionTimer > 0) {
              eng.endlessTransitionTimer -= (dt * 60); 
          }
      
      }

    // 🔥 ANTI-LAG SYSTEM: I-cap ang particles sa 300 para hindi mag-crash ang browser sa late game
      if (eng.particles.length > 300) {
         eng.particles.splice(0, eng.particles.length - 300); 
      }

      for (let i = eng.particles.length - 1; i >= 0; i--) {
        const p = eng.particles[i];
        p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.93; p.vy *= 0.93; p.life -= dt;
        if (p.life <= 0) eng.particles.splice(i, 1);
      }
      for (const a of eng.ambs) {
        a.x += a.vx * dt;
        a.y += a.vy * dt;
        if (a.kind === 'spark') {
          a.t -= dt * 0.22;
          if (a.t <= 0 || a.y < -10) { a.x = Math.random() * W; a.y = H + 10; a.t = 1; }
        } else if (a.kind === 'ember') {
          a.t -= dt * 0.18;
          a.rot += dt * 1.2;
          if (a.t <= 0 || a.y < -10) { a.x = Math.random() * W; a.y = H + 10; a.t = 1; }
        } else if (a.kind === 'orb') {
          a.phase += dt * 0.6;
          if (a.x < -60) a.x = W + 60;
          if (a.x > W + 60) a.x = -60;
          if (a.y < -60) a.y = H + 60;
          if (a.y > H + 60) a.y = -60;
        } else if (a.kind === 'wisp') {
          a.phase += dt * 0.4;
          if (a.x < -200) a.x = W + 200;
          if (a.x > W + 200) a.x = -200;
          if (a.y < -40) a.y = H + 40;
          if (a.y > H + 40) a.y = -40;
        } else if (a.kind === 'dust') {
          a.phase += dt * 0.5;
          a.x += Math.sin(a.phase) * dt * 4;
          if (a.x < -10) a.x = W + 10;
          if (a.x > W + 10) a.x = -10;
          if (a.y < -10) a.y = H + 10;
          if (a.y > H + 10) a.y = -10;
        } else if (a.kind === 'smoke') {
          a.phase += dt * 0.25;
          if (a.x < -a.r) a.x = W + a.r;
          if (a.x > W + a.r) a.x = -a.r;
          if (a.y < -a.r) a.y = H + a.r;
          if (a.y > H + a.r) a.y = -a.r;
        }
      }


// 🔥 COMPANION / FAMILIAR AI & PHYSICS (NOW SUPPORTS UP TO 3 PETS)
const tickFamiliars = (pObj, isP2) => {
  if (!pObj || pObj.dead || !pObj.familiars) return;
  
  // 🛡️ NILABAS DITO: Isang beses lang mababawasan ang duration kada tick, kahit ilan ang familiars.
// 🛡️ SHIELD DURATION LOGIC
  if (pObj.divineShield) {
      pObj.divineShield.duration -= dt;
      if (pObj.divineShield.duration <= 0) {
          
          // Shatter explosion effect para kita mong nawala
          for(let k=0; k<20; k++) {
              const pa = Math.random() * Math.PI * 2;
              const ps = Math.random() * 150 + 50;
              eng.particles.push({ x: pObj.x, y: pObj.y, vx: Math.cos(pa)*ps, vy: Math.sin(pa)*ps, color: 'rgba(254, 240, 138, 0.5)', life: 0.5, ml: 0.5, r: Math.random()*2+1 });
          }

          // 🛑 ITO ANG SUSI: Burahin nang tuluyan ang shield object para mawala sa screen!
          pObj.divineShield = null; 
      }
  }
  
  pObj.familiars.forEach((f, index) => {
    // ❌ TINANGGAL DITO ang divineShield check para hindi mag-multiply ang bawas ng duration.

    // 1. Offsets para hindi magpatong ang 3 familiars
    let offsetX = -35, offsetY = -45;
    if (index === 1) { offsetX = 35; offsetY = -45; } // Right
    if (index === 2) { offsetX = 0; offsetY = -70; }  // Top Center

    const tX = pObj.x + offsetX;
    const tY = pObj.y + offsetY + Math.sin(performance.now() * 0.003 + index) * 8; 
    
    const fDist = Math.hypot(tX - f.x, tY - f.y);
    const fSpeed = fDist > 150 ? 8 : 4; 
    f.x += (tX - f.x) * dt * fSpeed;
    f.y += (tY - f.y) * dt * fSpeed;


    f.cd -= dt;
    if (f.cd <= 0) {
      if (f.id === 'wisp') {
        let near = null, ndSq = Infinity;
        const maxRangeSq = 450 * 450; // Pre-calculate ang limit
        for (const e of eng.enemies) {
          if (e.hp <= 0 || e.y < -50) continue;
          const dx = e.x - f.x;
          const dy = e.y - f.y;
          let distSq = (dx * dx) + (dy * dy); // Fast math! Walang Math.hypot
          
          if (distSq < ndSq && distSq < maxRangeSq) { 
              ndSq = distSq; 
              near = e; 
          }
        }
        if (near) {
          f.cd = Math.max(0.15, 0.8 - (f.level * 0.05)); 
          const a = Math.atan2(near.y - f.y, near.x - f.x);
          const famDmg = 50 + (f.level * 30) + ((eng.wave || 1) * 15);
          const projCount = f.level >= 10 ? 3 : (f.level >= 5 ? 2 : 1);
          for (let i = 0; i < projCount; i++) {
            const ang = a + (i - (projCount - 1) / 2) * 0.2;
            eng.bullets.push({ x: f.x, y: f.y, vx: Math.cos(ang) * 600, vy: Math.sin(ang) * 600, r: 8, life: 2, p2: isP2, dmg: famDmg, type: 'fire_orb', isFamiliar: true });
          }
        }
      }
        else if (f.id === 'voidling') {
        const vacRadius = 250 + (f.level * 35);
        const vacRadiusSq = vacRadius * vacRadius;
        
        // KONTROL NG BILIS: Binabaan natin sa 2.5 (mula 10.0). 
        // Kung gusto mo pa rin ng mas mabagal, gawin mong 1.5. Kung medyo mabilis, gawin mong 4.0.
        const higopSpeed = 2.5; 

        // HIGOP NG GEMS (Smooth & Relaxed LERP)
        if (eng.gems && eng.gems.length > 0) {
          for (const g of eng.gems) {
            const dx = pObj.x - g.x;
            const dy = pObj.y - g.y;
            const distSq = (dx * dx) + (dy * dy);
            
            if (distSq < vacRadiusSq) {
               g.x += dx * higopSpeed * dt; 
               g.y += dy * higopSpeed * dt;
               g.isPulled = true; // 👈 DAGDAG ITO
            }
          }
        }

        // HIGOP NG POTIONS (Smooth & Relaxed LERP)
        if (eng.potions && eng.potions.length > 0) {
          for (const p of eng.potions) {
            const dx = pObj.x - p.x;
            const dy = pObj.y - p.y;
            const distSq = (dx * dx) + (dy * dy);
            
            if (distSq < vacRadiusSq) {
               p.x += dx * higopSpeed * dt;
               p.y += dy * higopSpeed * dt;
               p.isPulled = true; // 👈 DAGDAG ITO
            }
          }
        }
      }
      
      
      else if (f.id === 'fairy') {
        f.cd = 3.0;
        const healAmount = 5 + (f.level * 4) + (pObj.maxHp * 0.01);
        pObj.hp = Math.min(pObj.maxHp, pObj.hp + healAmount);
        
        window.recordArcaneUtility('Fairy Heal', healAmount);
        
        spawnFCT(eng, pObj.x, pObj.y, healAmount, 'heal');
        for(let k=0; k<6; k++) eng.particles.push({ x: pObj.x + (Math.random()-0.5)*30, y: pObj.y + (Math.random()-0.5)*30, vx: 0, vy: -40 - Math.random()*20, color: '#86efac', life: 0.8, ml: 0.8, r: 2.5 });
      }
      else if (f.id === 'frost') {
        f.cd = Math.max(1.0, 3.0 - (f.level * 0.15)); 
        let target = null, minDistSq = Infinity;
        const rangeSq = 350 * 350; // Fast math range
        
        for (const e of eng.enemies) {
          if (e.hp <= 0 || e.y < -50) continue;
          const dx = e.x - f.x;
          const dy = e.y - f.y;
          let dSq = (dx * dx) + (dy * dy); // Walang Math.hypot
          
          if (dSq < minDistSq && dSq < rangeSq) { minDistSq = dSq; target = e; }
        }
        if (target) {
          const stormRadius = 80 + (f.level * 5); 
          if (!eng.iceStorms) eng.iceStorms = [];
          // eng.iceStorms.push({ x: target.x, y: target.y, radius: stormRadius, life: 2.0 });
          eng.iceStorms.push({ x: target.x, y: target.y, radius: stormRadius, life: 2.0, isFamiliar: true, dmg: 120 + (f.level * 40) });
        }
      }
      // 🪨 STONE GOLEM (Earth Spikes)
else if (f.id === 'golem') {
          f.cd = Math.max(1.5, 4.0 - (f.level * 0.2));
          let enemiesHit = 0;
          const smashRadius = 120 + (f.level * 8);
          const smashRadiusSq = smashRadius * smashRadius; // 🔥 OPTIMIZATION 1: Pre-calculate squared radius
          const smashDmg = 150 + (f.level * 50) + ((eng.wave || 1) * 20);
          let decalSpawned = false;
          
          for (const e of eng.enemies) {
            if (e.hp <= 0 || e.y < -50) continue;
            
            // 🔥 OPTIMIZATION 2: Fast Math Distance Check (Mas mabilis kaysa sa Math.hypot)
            const dx = e.x - f.x;
            const dy = e.y - f.y;
            const distSq = (dx * dx) + (dy * dy);
            
            if (distSq < smashRadiusSq) {
              if (!decalSpawned) {
                if (!eng.decals) eng.decals = [];
                // 🔥 OPTIMIZATION 3: Hard cap and Integer rounding para iwas memory bloat at render lag
                if (eng.decals.length < 250) {
                  eng.decals.push({ 
                    x: Math.floor(f.x), 
                    y: Math.floor(f.y + 10), 
                    r: Math.floor(smashRadius * 0.6), 
                    life: 4.0, 
                    maxLife: 4.0 
                  });
                }
                decalSpawned = true;
              }
              
              e.hp -= smashDmg;
              window.recordArcaneDamage('Familiar: Golem', smashDmg);
              
              // 🔥 OPTIMIZATION 4: FCT Throttling
              // Magpapakita lang ng damage text sa unang 6 na tinamaan, o kung suwertehin sa random (pampabawas text spam)
              if (enemiesHit < 6 || Math.random() < 0.15) {
                  spawnFCT(eng, e.x, e.y, smashDmg, 'damage', false); 
              }
              
              e.stunnedTime = Math.max(e.stunnedTime || 0, 1.5);
              e.flash = 0.5;
              if (e.hp <= 0) e.deadTrigger = true;
              enemiesHit++;
            }
          }
          
        if (enemiesHit > 0) {
          eng.screenShake = 1.0;
          if (!eng.earthSmashes) eng.earthSmashes = [];
          eng.earthSmashes.push({ x: f.x, y: f.y, radius: smashRadius, life: 1.2 });
        }
      }
      // ⚡ THUNDER FOX (Branching Lightning)
      else if (f.id === 'thunder') {
        f.cd = Math.max(0.3, 1.5 - (f.level * 0.1)); 
        let target = null, minDistSq = Infinity;
        const rangeSq = 450 * 450;
        
        for (const e of eng.enemies) {
          if (e.hp <= 0 || e.y < -50) continue;
          const dx = e.x - f.x;
          const dy = e.y - f.y;
          let dSq = (dx * dx) + (dy * dy);
          
          if (dSq < minDistSq && dSq < rangeSq) { minDistSq = dSq; target = e; }
        }
        if (target) {
          const boltDmg = 200 + (f.level * 45) + ((eng.wave || 1) * 25);
          target.hp -= boltDmg; 
          window.recordArcaneDamage('Spark Fox', boltDmg);
          spawnFCT(eng, target.x, target.y, boltDmg, 'damage', false); target.flash = 0.8; target.instabTime = Math.max(target.instabTime || 0, 2.0);
          if (target.hp <= 0) target.deadTrigger = true;
          if (!eng.lightnings) eng.lightnings = [];
          eng.lightnings.push({ pts: [{x: f.x, y: f.y}, {x: target.x, y: target.y}], life: 0.6, branching: true, isFamiliar: true });
        }
      }
      // 🦇 UMBRAL BAT (Shadow Blades)
      else if (f.id === 'shadow') {
        f.cd = Math.max(0.2, 1.2 - (f.level * 0.1)); 
        let target = null, minDistSq = Infinity;
        const rangeSq = 500 * 500;
        
        for (const e of eng.enemies) {
          if (e.hp <= 0 || e.y < -50) continue;
          const dx = e.x - f.x;
          const dy = e.y - f.y;
          let dSq = (dx * dx) + (dy * dy);
          
          if (dSq < minDistSq && dSq < rangeSq) { minDistSq = dSq; target = e; }
        }
        if (target) {
           const a = Math.atan2(target.y - f.y, target.x - f.x);
           if (!eng.shadowBlades) eng.shadowBlades = []; 
           eng.shadowBlades.push({ x: f.x, y: f.y, vx: Math.cos(a) * 1100, vy: Math.sin(a) * 1100, angle: a, life: 1.0, hits: new Set(), p2: isP2, dmg: 80 + (f.level*60) });
        }
      }
      else if (f.id === 'light') {
        // 🛑 BAGO: Siguraduhing may HP pa at hindi pa tapos ang duration!
        const hasValidShield = pObj.divineShield && pObj.divineShield.duration > 0 && pObj.divineShield.hp > 0;
        
        if (hasValidShield) {
            f.cd = 0.5; // Kung may buhay pang shield, pause muna yung cast timer ng familiar
        } else {
            // ✅ Kung wala na talaga, saka lang gagawa ng bago
            f.cd = Math.max(8.0, 20.0 - (f.level * 1.0)); 
            const shieldCapacity = 400 + (f.level * 250) + ((eng.wave || 1) * 50);
            pObj.divineShield = { hp: shieldCapacity, maxHp: shieldCapacity, active: true, hitFlash: 0, duration: 7.0 };
            for(let k=0; k<25; k++) {
                const pa = Math.random() * Math.PI * 2;
                const ps = Math.random() * 200 + 50;
                eng.particles.push({ x: pObj.x, y: pObj.y, vx: Math.cos(pa)*ps, vy: Math.sin(pa)*ps, color: '#fef08a', life: 1.0, ml: 1.0, r: Math.random()*4+2 });
            }
        }
      }
      else if (f.id === 'wind') {
        f.cd = Math.max(5.0, 6.5 - (f.level * 0.15));
        
        let target = null;
        let minDistSq = Infinity;
        const rangeSq = 600 * 600; // Pre-calculated fast math range
        
        for (const e of eng.enemies) {
          if (e.hp <= 0 || e.y < -50) continue;
          
          const dx = e.x - pObj.x; 
          const dy = e.y - pObj.y;
          let dSq = (dx * dx) + (dy * dy); // Walang Math.hypot
          
          if (dSq < minDistSq && dSq < rangeSq) { 
            minDistSq = dSq; 
            target = e; 
          }
        }

        const a = target ? Math.atan2(target.y - f.y, target.x - f.x) : Math.random() * Math.PI * 2;
        
        if (!eng.tornados) eng.tornados = [];
        const tornadoCount = f.level >= 5 ? 2 : 1;
        
        for (let i = 0; i < tornadoCount; i++) {
           const spreadA = a + (i * Math.PI);
           eng.tornados.push({ 
             x: f.x, 
             y: f.y, 
             vx: Math.cos(spreadA) * 150, 
             vy: Math.sin(spreadA) * 150, 
             life: 4.0, 
             r: 50 + (f.level * 5), 
             isFamiliar: true, 
             dmg: 40 + (f.level * 25) 
           });
        }
      }
    }
  });
};

if (isHost || !isCoopActive) {
  tickFamiliars(eng.p, false);
  if (isCoopActive) tickFamiliars(eng.p2, true);
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



      // ==========================================
      // 🌟 DYNAMIC EQUIPMENT AURA LOGIC 🌟
      // ==========================================
      const getEquipCounts = (playerObj) => {
        let mythic = 0, legendary = 0, epic = 0;
        if (!playerObj || !playerObj.equipment) return { mythic, legendary };
        
        Object.values(playerObj.equipment).forEach(item => {
          if (item) {
            if (item.rarity === 'mythic') mythic++;
            if (item.rarity === 'legendary') legendary++;
            if (item.rarity === 'epic') epic++;
          }
        });
        
        return { mythic, legendary, epic };
      };

// =========================================================
// ⚡ ORGANIC & CINEMATIC AURA LOGIC (v11 - Safe & Elegant)
// =========================================================
const drawEquipAura = (x, y, radius, counts) => {
  // SAFE VARIABLES (Bawal ang "?." para walang syntax error sa luma mong setup)
  // console.log("Aura Counts:", counts);
const eCount = (counts && counts.epic) ? counts.epic : 0;
  const lCount = (counts && counts.legendary) ? counts.legendary : 0;
  const mCount = (counts && counts.mythic) ? counts.mythic : 0;

  // Kung walang suot, wag mag-draw
  if (eCount === 0 && lCount === 0 && mCount === 0) return;

  const time = performance.now();
  ctx.save();
  ctx.translate(x, y + 3);

  const speedMult = 1 + (mCount * 0.2) + (lCount * 0.1) + (eCount * 0.05);
  const breath = 0.75 + Math.sin(time * 0.002 * speedMult) * 0.25; 
  
  const mScale = 1 + (mCount * 0.25);
  const lScale = 1 + (lCount * 0.25);

  // 0. DEEP VOID BACKGROUND (Para mas lumitaw ang kulay)
  ctx.globalCompositeOperation = 'source-over';
  ctx.beginPath();
  ctx.arc(0, 0, radius + 5 + (mCount * 3) + (eCount * 1), 0, Math.PI * 2);
  ctx.fillStyle = `rgba(0, 0, 0, ${0.4 * breath})`;
  ctx.shadowBlur = 20;
  ctx.shadowColor = 'black';
  ctx.fill();

 // =========================================================
  // 1. EPIC: PROGRESSIVE INTENSITY AURA
  // =========================================================
  if (eCount > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    
    // Intensity Multipliers (1x, 1.2x, 1.4x... depende sa dami)
    const intensity = 1 + (eCount * 0.2); 
    const speedMult = 1 + (eCount * 0.3);

    // A. PULSING RADIAL GLOW (Lumalaki at humahaba ang glow habang dumadami)
    const eRadius = (radius + 10) * intensity + (Math.sin(time * 0.002 * speedMult) * 5);
    const gradient = ctx.createRadialGradient(0, 0, radius * 0.3, 0, 0, eRadius + (eCount * 8));
    
    gradient.addColorStop(0, `rgba(168, 85, 247, ${0.4 * breath * intensity})`); 
    gradient.addColorStop(0.5, `rgba(192, 132, 252, ${0.2 * breath})`);
    gradient.addColorStop(1, `rgba(236, 72, 153, 0)`);
    
    ctx.beginPath();
    ctx.arc(0, 0, eRadius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // B. ROTATING ENERGY RINGS (Lumilitaw lang pag 2 pataas ang Epic)
    if (eCount >= 2) {
        ctx.beginPath();
        ctx.arc(0, 0, radius + 15 + (eCount * 5), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(236, 72, 153, ${0.2 * intensity})`;
        ctx.lineWidth = 1 + (eCount * 0.5);
        ctx.setLineDash([5, 10]); // Dashed effect
        ctx.lineDashOffset = -time * 0.01 * speedMult;
        ctx.stroke();
        ctx.setLineDash([]); // Reset
    }

    // C. DENSITY-BASED PARTICLES (Mas madami at mabilis habang dumadami)
    const dustCount = 8 + (eCount * 6); 
    for (let i = 0; i < dustCount; i++) {
        const angle = (time * 0.0008 * speedMult) + (i * (Math.PI * 2 / dustCount));
        const distance = (radius + 8) + (Math.sin(time * 0.001 * speedMult + i) * 10 * intensity);
        
        const dx = Math.cos(angle) * distance;
        const dy = Math.sin(angle) * distance;
        
        // Twinkle flicker
        const flicker = 0.5 + Math.sin(time * 0.005 + i) * 0.5;
        
        ctx.beginPath();
        ctx.arc(dx, dy, (1.2 + (flicker * 0.8)) * intensity, 0, Math.PI * 2);
        
        const isPink = i % 2 === 0;
        ctx.fillStyle = isPink ? `rgba(236, 72, 153, ${flicker})` : `rgba(192, 132, 252, ${flicker})`;
        ctx.fill();
    }
    
    ctx.restore();
  }

  // =========================================================
  // 2. LEGENDARY: MORPHING PLASMA FIRE
  // =========================================================
  if (lCount > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const layers = 2 + Math.min(lCount, 3); 

    for (let i = 0; i < layers; i++) {
      ctx.beginPath();
      const layerOffset = i * 1000; 
      
      for (let angle = 0; angle <= Math.PI * 2; angle += 0.1) {
        const wave1 = Math.sin(angle * 4 + (time * 0.003) + layerOffset) * 8;
        const wave2 = Math.cos(angle * 7 - (time * 0.002) + layerOffset) * 6;
        const chaoticSpike = Math.sin(angle * 13 + time * 0.005) * (4 * lCount); 
        
        const currentRadius = radius + 8 + (wave1 + wave2 + chaoticSpike) * lScale * breath;
        
        const px = Math.cos(angle) * currentRadius;
        const py = Math.sin(angle) * currentRadius;
        
        if (angle === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();

      ctx.lineWidth = 2 + (lCount * 0.5);
      const alpha = 0.3 + (i * 0.1) * breath;
      ctx.strokeStyle = `rgba(255, ${100 + i * 40}, 0, ${alpha})`;
      ctx.fillStyle = `rgba(255, 60, 0, ${0.1 * alpha})`;
      ctx.shadowBlur = 20 + (lCount * 5);
      ctx.shadowColor = '#ff6600';
      ctx.stroke();
      ctx.fill();
    }
    ctx.restore();
  }

  // =========================================================
  // 3. MYTHIC: DEMONIC DARKFIRE, ORBS, ICICLES & LIGHTNING
  // =========================================================
  if (mCount > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over'; 

    const mAlpha = Math.min(0.4 + (mCount * 0.15), 0.95);

    // A: VIOLENT DARKFIRE BURST
    ctx.beginPath();
    const spikes = 24 + (mCount * 6); 
    for (let i = 0; i <= spikes; i++) {
      const angle = (i / spikes) * Math.PI * 2;
      
      const isMajorSpike = i % 3 === 0;
      const spikePower = isMajorSpike ? (10 + mCount * 10) : (5 + mCount * 4);
      const violentJitter = Math.sin(time * 0.015 + i * 10) * (6 + mCount * 2); 
      
      const r = radius + 5 + (spikePower * breath) + violentJitter;
      const px = Math.cos(angle - time * 0.002) * r; 
      const py = Math.sin(angle - time * 0.002) * r;

      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();

    ctx.fillStyle = `rgba(10, 0, 0, ${mAlpha * breath})`;
    ctx.fill();

    ctx.lineWidth = 2 + (mCount * 0.8);
    ctx.strokeStyle = `rgba(255, 10, 10, ${mAlpha * breath})`;
    ctx.shadowBlur = 15 + (mCount * 5);
    ctx.shadowColor = '#ff0000';
    ctx.stroke();

    // B: ORBITING VOID ORBS
    const orbCount = 1 + mCount; 
    for (let i = 0; i < orbCount; i++) {
      const orbAngle = time * 0.003 + (i * ((Math.PI * 2) / orbCount));
      const orbRadius = radius + 30 + (mCount * 8) + Math.sin(time * 0.005 + i) * 10;
      
      const ox = Math.cos(orbAngle) * orbRadius;
      const oy = Math.sin(orbAngle) * orbRadius;

      ctx.beginPath();
      ctx.arc(ox, oy, 3 + (mCount * 1.5), 0, Math.PI * 2);
      
      ctx.fillStyle = '#000000';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ff0000'; 
      ctx.fill();
      
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = mCount > 2 ? '#ffffff' : '#ff4444'; 
      ctx.shadowBlur = 0;
      ctx.stroke();
    }

    // C: FLOATING VOID ICICLES
    const numIcicles = mCount; 
    for (let i = 0; i < numIcicles; i++) {
      const angle = -time * 0.0015 + (i * Math.PI * 2 / Math.max(1, numIcicles)); 
      const floatY = Math.sin(time * 0.003 + i) * 6;
      const r = radius + 20 + (mCount * 3);
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r + floatY;

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(angle + Math.PI / 2);

      ctx.beginPath();
      ctx.moveTo(0, -10 - (mCount * 2)); 
      ctx.lineTo(3, 0);                  
      ctx.lineTo(0, 5);                    
      ctx.lineTo(-3, 0);                 
      ctx.closePath();

      ctx.fillStyle = 'rgba(20, 0, 0, 0.9)'; 
      ctx.fill();
      ctx.strokeStyle = '#ff3333';           
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ff0000';
      ctx.stroke();
      ctx.restore();
    }

    // D: CRIMSON LIGHTNING STRIKES
    if (Math.random() < 0.02 + (mCount * 0.015)) {
      ctx.save();
      const startAngle = Math.random() * Math.PI * 2;
      let lx = Math.cos(startAngle) * (radius);
      let ly = Math.sin(startAngle) * (radius);

      ctx.beginPath();
      ctx.moveTo(lx, ly);

      let currentAngle = startAngle;
      const lightningSegments = 2 + Math.min(mCount, 4); 
      for (let j = 0; j < lightningSegments; j++) {
        currentAngle += (Math.random() - 0.5) * 2; 
        const step = 5 + Math.random() * 10;
        lx += Math.cos(currentAngle) * step;
        ly += Math.sin(currentAngle) * step;
        ctx.lineTo(lx, ly);
      }
      
      ctx.strokeStyle = '#ffffff'; 
      ctx.lineWidth = 1 + (Math.random() * 1.5);
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ff0000'; 
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }

  // =========================================================
  // 4. INTENSE GLOWING PARTICLES (Legendary/Mythic Only)
  // =========================================================
  if (lCount > 0 || mCount > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const particleCount = (lCount * 4) + (mCount * 6); 
    
    for (let i = 0; i < particleCount; i++) {
      const pLife = (time * 0.001 + i * 0.2) % 1; 
      const pRadius = radius + (pLife * 70 * speedMult); 
      const pAngle = (i * 1.5) + Math.sin(time * 0.002 + i) * 0.5; 
      
      const px = Math.cos(pAngle) * pRadius;
      const py = Math.sin(pAngle) * pRadius - (pLife * 50); 

      const pSize = (2 + (Math.random() * 2.5)) * (1 - pLife); 
      
      ctx.beginPath();
      ctx.arc(px, py, pSize, 0, Math.PI * 2);
      
      if (mCount > 0 && i % 2 === 0) {
        ctx.fillStyle = `rgba(255, 30, 30, ${1 - pLife})`; 
        ctx.shadowColor = '#ff0000';
      } else {
        ctx.fillStyle = `rgba(255, 200, 50, ${1 - pLife})`; 
        ctx.shadowColor = '#ff9900';
      }
      
      ctx.shadowBlur = 12;
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.restore();
};




      // ═══════════════════════════════════════════════════════════════
      // VOID / FRIEREN MMORPG ENVIRONMENT DRAW
      // Layer order: base → atmosphere → floor → staticBg → particles → vignette
      // ═══════════════════════════════════════════════════════════════

      // 1. Ancient stone base — darker warm-black void (not pure black, keeps a hint of warmth)
      ctx.fillStyle = '#110e0b';
      ctx.fillRect(0, 0, W, H);

      // 2. Atmospheric depth — warm ambient bounce + cool arcane shadow on opposite side
      const _t = performance.now() * 0.00018;
      // Warm amber-gold torchlight source — top-center (moonlight direction)
      const bg1 = ctx.createRadialGradient(W*0.5, H*(-0.15), 0, W*0.5, H*(-0.15), W*0.80);
      bg1.addColorStop(0,   'rgba(210,175,95,0.16)');  // warm moonlight
      bg1.addColorStop(0.4, 'rgba(140,110,55,0.07)');
      bg1.addColorStop(0.75,'rgba(60,44,20,0.03)');
      bg1.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = bg1; ctx.fillRect(0, 0, W, H);

      // Cool arcane blue-purple from bottom — mana seeping from floor runes
      const bg2 = ctx.createRadialGradient(W*0.50, H*1.10, 0, W*0.50, H*1.10, W*0.65);
      bg2.addColorStop(0,   'rgba(55,18,115,0.20)');
      bg2.addColorStop(0.5, 'rgba(28,7,65,0.09)');
      bg2.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = bg2; ctx.fillRect(0, 0, W, H);

      // Side fills — cool deep shadow corners
      const bg3 = ctx.createRadialGradient(W*0.72, H*0.60, 0, W*0.72, H*0.60, W*0.45);
      bg3.addColorStop(0,   'rgba(20,8,40,0.14)');
      bg3.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = bg3; ctx.fillRect(0, 0, W, H);

      // 3. Hand-baked stone floor — every tile uniquely seeded, no visible repeat
      if (eng.floorBaked) {
        ctx.drawImage(eng.floorBaked, 0, 0);
      } else if (eng.floorPat) {
        ctx.fillStyle = eng.floorPat;
        ctx.fillRect(0, 0, W, H);
      }

      // 3b. DRAMATIC DIRECTIONAL MOONLIGHT — top-down shaft hitting the arena floor
      // This is the "torchlight/moonlight nagbibigay direction ng light" pass
      // Soft wide moonlight cone from top-center
      {
        const moonG = ctx.createRadialGradient(W*0.50, -H*0.05, 0, W*0.50, H*0.55, W*0.62);
        moonG.addColorStop(0,   'rgba(220,205,170,0.16)'); // warm moonlight center
        moonG.addColorStop(0.30,'rgba(185,165,120,0.09)');
        moonG.addColorStop(0.60,'rgba(100,85,60,0.04)');
        moonG.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = moonG; ctx.fillRect(0, 0, W, H);
      }
      // Focused bright shaft — narrow column of direct moonlight
      {
        const shaftG = ctx.createRadialGradient(W*0.50, 0, 0, W*0.50, H*0.35, W*0.22);
        shaftG.addColorStop(0,   'rgba(240,225,185,0.13)');
        shaftG.addColorStop(0.5, 'rgba(190,170,120,0.05)');
        shaftG.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = shaftG; ctx.fillRect(W*0.20, 0, W*0.60, H*0.65);
      }
      // Shadow falloff on bottom — floor gets darker away from the light source
      {
        const shadowG = ctx.createLinearGradient(0, H*0.50, 0, H);
        shadowG.addColorStop(0, 'rgba(0,0,0,0)');
        shadowG.addColorStop(1, 'rgba(0,0,0,0.35)');
        ctx.fillStyle = shadowG; ctx.fillRect(0, H*0.50, W, H*0.50);
      }
      // Side shadow falloff — edges darker (creates depth framing)
      {
        const leftShadow = ctx.createLinearGradient(0, 0, W*0.22, 0);
        leftShadow.addColorStop(0, 'rgba(0,0,0,0.28)');
        leftShadow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = leftShadow; ctx.fillRect(0, 0, W*0.22, H);
        const rightShadow = ctx.createLinearGradient(W, 0, W*0.78, 0);
        rightShadow.addColorStop(0, 'rgba(0,0,0,0.28)');
        rightShadow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rightShadow; ctx.fillRect(W*0.78, 0, W*0.22, H);
      }

      // 4. Static pre-baked layer (big cracks, veins, seal) — ONE drawImage call
      if (eng.staticBg) {
        ctx.drawImage(eng.staticBg, 0, 0);

        // ⚡ LIVING SEAL OVERLAY — breathing glow + leaking embers drawn fresh
        // every frame so the ancient broken seal's "last spark" genuinely
        // pulses instead of sitting frozen in the baked background.
        {
          const sealX = W * 0.5, sealY = H * 0.5;
          const st = performance.now() * 0.001;
          const breathe = (Math.sin(st * 1.3) + 1) * 0.5; // 0..1 slow breathing

          ctx.save();
          ctx.globalCompositeOperation = 'lighter';

          // Breathing core glow bleeding up through the crack
          const coreGlowR = 50 + breathe * 18;
          const coreGrad = ctx.createRadialGradient(sealX, sealY, 0, sealX, sealY, coreGlowR);
          coreGrad.addColorStop(0, `rgba(255, 214, 120, ${0.18 + breathe * 0.16})`);
          coreGrad.addColorStop(0.5, `rgba(225, 180, 80, ${0.08 + breathe * 0.08})`);
          coreGrad.addColorStop(1, 'rgba(225,180,80,0)');
          ctx.fillStyle = coreGrad;
          ctx.beginPath(); ctx.arc(sealX, sealY, coreGlowR, 0, Math.PI * 2); ctx.fill();

          ctx.translate(sealX, sealY);

          // Slow rotating arc of residual power tracing the broken outer band
          ctx.rotate(st * 0.07);
          ctx.strokeStyle = `rgba(255, 225, 150, ${0.12 + breathe * 0.10})`;
          ctx.lineWidth = 1;
          ctx.shadowColor = 'rgba(225,180,80,0.8)';
          ctx.shadowBlur = 12;
          ctx.beginPath(); ctx.arc(0, 0, 100, 0, Math.PI * 1.4); ctx.stroke();

          // Embers leaking from the crack, drifting upward and fading out
          ctx.fillStyle = 'rgba(255, 205, 120, 0.85)';
          ctx.shadowBlur = 8;
          for (let i = 0; i < 7; i++) {
            const seed = i * 31.7;
            const cycle = (st * 0.25 + i * 0.37) % 1; // 0..1 loop
            const ex = Math.sin(seed) * 70;
            const ey = (Math.cos(seed * 1.3) * 20) - cycle * 60; // drift up
            ctx.globalAlpha = (1 - cycle) * (0.5 + breathe * 0.5);
            ctx.beginPath();
            ctx.arc(ex, ey, 1.4 + Math.sin(seed * 2) * 0.6, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
          ctx.restore();
        }
      }

      // 4b. LIVING GROUND LIGHT — a warm pool of light that travels with the
      // player(s), brightening the stone, cracks, dust and debris underfoot
      // as they walk (like a personal torch/aura lighting the floor). Drawn
      // with 'lighter' blending so it actually lifts the baked floor colors
      // instead of just painting a flat circle over them.
      {
        const drawGroundLight = (gx, gy, alive, radius, tint) => {
          if (!alive) return;
          const flick = 0.88 + 0.12 * Math.sin(_t * 5.2 + gx * 0.01);
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          const gl = ctx.createRadialGradient(gx, gy, 0, gx, gy, radius * flick);
          gl.addColorStop(0,    `rgba(${tint},0.30)`);
          gl.addColorStop(0.35, `rgba(${tint},0.16)`);
          gl.addColorStop(0.7,  `rgba(${tint},0.06)`);
          gl.addColorStop(1,    'rgba(0,0,0,0)');
          ctx.fillStyle = gl;
          ctx.beginPath(); ctx.arc(gx, gy, radius * flick, 0, Math.PI * 2); ctx.fill();
          ctx.restore();

          // Soft contact shadow pooling directly beneath, so the light reads
          // as grounded rather than floating
          ctx.save();
          const sh = ctx.createRadialGradient(gx, gy + radius * 0.08, 0, gx, gy + radius * 0.08, radius * 0.45);
          sh.addColorStop(0, 'rgba(0,0,0,0.22)');
          sh.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = sh;
          ctx.beginPath(); ctx.ellipse(gx, gy + radius * 0.08, radius * 0.45, radius * 0.22, 0, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        };

        if (eng.p) drawGroundLight(eng.p.x, eng.p.y, !eng.p.dead, 165, '225,195,140');
        if (eng.p2) drawGroundLight(eng.p2.x, eng.p2.y, !eng.p2.dead, 165, '195,170,235');
      }

      // 5. Central seal pulse — the broken seal breathes with its last gold-arcane power
      {
        const pulse = 0.5 + 0.5 * Math.sin(_t * 1.1);
        const cxS = W*0.5, cyS = H*0.5;
        // Gold outer glow — brighter now so it genuinely reads as "glowing" in the dark
        const sg = ctx.createRadialGradient(cxS, cyS, 0, cxS, cyS, 140);
        sg.addColorStop(0,    `rgba(225,180,80,${0.16 + pulse*0.14})`);  // gold center
        sg.addColorStop(0.30, `rgba(150,105,235,${0.08 + pulse*0.06})`); // purple mid — its last living core
        sg.addColorStop(0.65, `rgba(90,40,150,${0.03 + pulse*0.03})`);
        sg.addColorStop(1,    'rgba(0,0,0,0)');
        ctx.fillStyle = sg; ctx.fillRect(cxS-140, cyS-140, 280, 280);

        // Faint rotating gold shimmer tracing the broken outer ring — sells the
        // "still-active, incomplete" magic circle feel
        ctx.save();
        ctx.translate(cxS, cyS);
        ctx.rotate(_t * 0.6);
        ctx.strokeStyle = `rgba(235,200,110,${0.10 + pulse*0.12})`;
        ctx.lineWidth = 1.6;
        ctx.shadowColor = 'rgba(235,200,110,0.8)';
        ctx.shadowBlur = 16;
        ctx.setLineDash([14, 36, 6, 20]);
        ctx.beginPath(); ctx.arc(0, 0, 96, 0, Math.PI*1.5);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      // 6. Ambient particles
      for (const a of eng.ambs) {
        ctx.save();
        if (a.kind === 'spark') {
          ctx.globalAlpha = Math.min(1, a.a * a.t * 1.3);
          ctx.fillStyle = a.c;
          ctx.shadowColor = a.c;
          ctx.shadowBlur = 8;
          ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI*2); ctx.fill();

        } else if (a.kind === 'ember') {
          // Rune cross-spark — 4 short lines rotated
          ctx.globalAlpha = Math.min(1, a.a * a.t * 1.3);
          ctx.strokeStyle = a.c;
          ctx.shadowColor = a.c;
          ctx.shadowBlur = 9;
          ctx.lineWidth = 0.9;
          ctx.translate(a.x, a.y); ctx.rotate(a.rot);
          ctx.beginPath();
          ctx.moveTo(-a.r, 0); ctx.lineTo(a.r, 0);
          ctx.moveTo(0, -a.r); ctx.lineTo(0, a.r);
          ctx.stroke();
          // Diagonal arms (makes 8-point rune star)
          ctx.globalAlpha = a.a * a.t * 0.5;
          const d = a.r * 0.65;
          ctx.beginPath();
          ctx.moveTo(-d,-d); ctx.lineTo(d,d);
          ctx.moveTo(d,-d);  ctx.lineTo(-d,d);
          ctx.stroke();

        } else if (a.kind === 'orb') {
          const pulse = 0.5 + 0.5 * Math.sin(a.phase);
          ctx.globalAlpha = Math.min(1, a.a * pulse * 1.25);
          ctx.shadowColor = a.c;
          ctx.shadowBlur = 14;
          const og = ctx.createRadialGradient(a.x,a.y,0, a.x,a.y,a.r);
          og.addColorStop(0, a.c);
          og.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = og;
          ctx.beginPath(); ctx.arc(a.x,a.y,a.r,0,Math.PI*2); ctx.fill();

        } else if (a.kind === 'wisp') {
          const wAlpha = Math.min(1, a.a * (0.55 + 0.45*Math.sin(a.phase)) * 1.2);
          ctx.globalAlpha = wAlpha;
          ctx.shadowColor = 'rgba(124,58,237,0.7)';
          ctx.shadowBlur = 10;
          const wg = ctx.createLinearGradient(a.x-a.w/2, a.y, a.x+a.w/2, a.y);
          wg.addColorStop(0,   'rgba(109,40,217,0)');
          wg.addColorStop(0.3, 'rgba(109,40,217,0.55)');
          wg.addColorStop(0.7, 'rgba(124,58,237,0.55)');
          wg.addColorStop(1,   'rgba(109,40,217,0)');
          ctx.fillStyle = wg;
          ctx.beginPath();
          ctx.ellipse(a.x, a.y, a.w/2, a.h/2, 0, 0, Math.PI*2);
          ctx.fill();

        } else if (a.kind === 'dust') {
          // Dust is near-invisible by default — it only really shows up when
          // caught inside the player's own glow radius, like real motes lit
          // by a torch passing through them.
          let lightBoost = 0;
          if (eng.p && !eng.p.dead) {
            const dd = Math.hypot(a.x - eng.p.x, a.y - eng.p.y);
            lightBoost = Math.max(lightBoost, Math.max(0, 1 - dd / 150));
          }
          if (eng.p2 && !eng.p2.dead) {
            const dd2 = Math.hypot(a.x - eng.p2.x, a.y - eng.p2.y);
            lightBoost = Math.max(lightBoost, Math.max(0, 1 - dd2 / 150));
          }
          const shimmer = 0.6 + 0.4 * Math.sin(a.phase * 1.7);
          ctx.globalAlpha = Math.min(1, (a.a * shimmer) + lightBoost * 0.55);
          ctx.fillStyle = lightBoost > 0.05 ? 'rgba(235,220,190,0.9)' : 'rgba(180,165,140,0.7)';
          if (lightBoost > 0.05) { ctx.shadowColor = 'rgba(225,195,130,0.8)'; ctx.shadowBlur = 4 * lightBoost; }
          ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI*2); ctx.fill();

        } else if (a.kind === 'smoke') {
          // Soft ash-grey fog clouds — built from 3 overlapping soft blobs so
          // the silhouette never reads as a perfect circle, then breathing
          // very slowly in size/opacity so it feels like real drifting smoke
          // rather than a static png. Kept low-alpha on purpose: just enough
          // volume to add depth, never enough to fog out the floor.
          const breathe = 0.8 + 0.2 * Math.sin(a.phase);
          ctx.globalAlpha = a.a * breathe;
          const lobes = [
            [0, 0, 1.0],
            [a.r*0.5, -a.r*0.15, 0.65],
            [-a.r*0.45, a.r*0.2, 0.6],
          ];
          lobes.forEach(([lx,ly,scale]) => {
            const sg = ctx.createRadialGradient(a.x+lx, a.y+ly, 0, a.x+lx, a.y+ly, a.r*scale*breathe);
            sg.addColorStop(0,   'rgba(150,140,135,0.55)');
            sg.addColorStop(0.6, 'rgba(95,88,90,0.30)');
            sg.addColorStop(1,   'rgba(60,55,60,0)');
            ctx.fillStyle = sg;
            ctx.beginPath(); ctx.arc(a.x+lx, a.y+ly, a.r*scale*breathe, 0, Math.PI*2); ctx.fill();
          });
        }
        ctx.restore();
      }

      // 7. Edge vignette — deep stone shadow border pulls focus to lit arena center
      const vig = ctx.createRadialGradient(W/2, H/2, H*0.20, W/2, H/2, W*0.72);
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(0.65,'rgba(5,3,2,0.42)');  // warm dark brown mid
      vig.addColorStop(1, 'rgba(2,1,1,0.90)');    // deep warm shadow edge
      ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);
      for (const g of eng.gems) {
        ctx.save();
        ctx.shadowColor = '#34d399'; ctx.shadowBlur = 12; ctx.fillStyle = '#34d399';
        ctx.beginPath(); ctx.moveTo(g.x, g.y - g.r); ctx.lineTo(g.x + g.r * 0.6, g.y);
        ctx.lineTo(g.x, g.y + g.r); ctx.lineTo(g.x - g.r * 0.6, g.y); ctx.closePath(); ctx.fill(); ctx.restore();
      }

if (eng.potions) {
        for (const pot of eng.potions) {
          ctx.save();

          // ✨ 1. RARE UTILITY DROPS (With Floating Name Tag)
          if (pot.type === 'freeze' || pot.type === 'nuke') {
            const time = performance.now() * 0.005;
            const pulse = Math.abs(Math.sin(time)); // Oscillates between 0 and 1
            const bounce = Math.sin(time) * 4; // Floating up and down

            const baseColor = pot.type === 'freeze' ? '#bae6fd' : '#fde68a';
            const deepColor = pot.type === 'freeze' ? '#0ea5e9' : '#f59e0b';
            const glowColor = pot.type === 'freeze' ? '#38bdf8' : '#fbbf24';

            const cx = pot.x, cy = pot.y + bounce;

            // A. Draw glowing outer aura
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = 20 + (pulse * 25);
            ctx.fillStyle = `rgba(255, 255, 255, ${0.15 + (pulse * 0.25)})`; // White/Gold pulse
            ctx.beginPath();
            ctx.arc(cx, cy, pot.r * (1.2 + (pulse * 0.4)), 0, Math.PI * 2);
            ctx.fill();

            // B. Rotating arcane ward ring orbiting the crystal — dashed,
            // Frieren-style containment circle holding the magic in place
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(time * 0.6);
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.30 + pulse * 0.25})`;
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 4]);
            ctx.beginPath(); ctx.arc(0, 0, pot.r * 1.8, 0, Math.PI * 2); ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();

            // C. 🏷️ Draw Floating Name Tag (No spin, just bounce)
            const label = pot.type === 'freeze' ? 'TIME FREEZE' : 'ARCANE NUKE';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#000000'; // Dark shadow para mabasa kahit maliwanag ang background
            ctx.shadowBlur = 6;
            ctx.fillStyle = glowColor;
            ctx.fillText(label, pot.x, pot.y - pot.r - 14 + bounce);

            // D. Draw the faceted crystal gem (With Hover and Spin)
            ctx.save(); // Save ulit para yung rotation ay sa crystal lang
            ctx.translate(pot.x, pot.y + bounce);
            ctx.rotate(time * 0.4);

            const facetGrad = ctx.createLinearGradient(0, -pot.r, 0, pot.r);
            facetGrad.addColorStop(0, '#ffffff');
            facetGrad.addColorStop(0.45, baseColor);
            facetGrad.addColorStop(1, deepColor);
            ctx.fillStyle = facetGrad;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.6;

            // Elongated hex-cut crystal silhouette
            ctx.beginPath();
            ctx.moveTo(0, -pot.r);
            ctx.lineTo(pot.r * 0.62, -pot.r * 0.3);
            ctx.lineTo(pot.r * 0.5, pot.r * 0.85);
            ctx.lineTo(-pot.r * 0.5, pot.r * 0.85);
            ctx.lineTo(-pot.r * 0.62, -pot.r * 0.3);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Internal facet cut lines for a true gem sparkle
            ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(0, -pot.r); ctx.lineTo(0, pot.r * 0.85);
            ctx.moveTo(-pot.r * 0.62, -pot.r * 0.3); ctx.lineTo(pot.r * 0.62, -pot.r * 0.3);
            ctx.stroke();

            // Inner bright white core
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, 0, pot.r * 0.3, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore(); // Undo the rotation so it doesn't affect other items

            // E. Ambient particles — drifting frost motes for freeze, embers for nuke
            ctx.fillStyle = pot.type === 'freeze' ? 'rgba(224,242,254,0.9)' : 'rgba(253,230,138,0.9)';
            ctx.shadowBlur = 5;
            for (let i = 0; i < 5; i++) {
              const seed = i * 19.7;
              const cyc = (time * 0.4 + i * 0.3) % 1;
              const pAng = seed;
              const pd = pot.r * 1.6 + cyc * 14;
              const px = cx + Math.cos(pAng) * pd;
              const py = cy + Math.sin(pAng) * pd - cyc * 10;
              ctx.globalAlpha = 1 - cyc;
              ctx.beginPath(); ctx.arc(px, py, 1.2, 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalAlpha = 1;
          } 
          // 🔴 2. NORMAL POTION DROPS
          else {
            let color = '#ef4444';
            if (pot.type === 'power') color = '#f97316';
            if (pot.type === 'defense') color = '#3b82f6';
            if (pot.type === 'crit') color = '#eab308';
            if (pot.type === 'regen') color = '#22c55e';
            if (pot.type === 'xp') color = '#a855f7';

            const time = performance.now() * 0.004;
            const bob = Math.sin(time + pot.x * 0.05) * 3;
            const r = pot.r;

            ctx.translate(pot.x, pot.y + bob);

            // Soft ambient halo behind the gem
            ctx.shadowColor = color;
            ctx.shadowBlur = 14;
            ctx.fillStyle = color + '26';
            ctx.beginPath(); ctx.arc(0, 0, r * 1.4, 0, Math.PI * 2); ctx.fill();

            // Faceted crystal body (elongated gem cut, not a flat hexagon)
            ctx.shadowBlur = 12;
            ctx.fillStyle = color;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.3;
            ctx.beginPath();
            ctx.moveTo(0, -r);
            ctx.lineTo(r * 0.75, -r * 0.25);
            ctx.lineTo(r * 0.55, r * 0.85);
            ctx.lineTo(-r * 0.55, r * 0.85);
            ctx.lineTo(-r * 0.75, -r * 0.25);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Internal facet cut lines for that polished gem sparkle
            ctx.strokeStyle = 'rgba(255,255,255,0.45)';
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(0, -r); ctx.lineTo(0, r * 0.85);
            ctx.moveTo(-r * 0.75, -r * 0.25); ctx.lineTo(r * 0.75, -r * 0.25);
            ctx.stroke();

            // Bright top-left sparkle highlight
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(-r * 0.25, -r * 0.42, r * 0.16, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();
        }
      }


if (eng.decals) {
          // Stable randomizer para hindi mag-jitter ang mga bato at bitak
          const random = (seed) => {
            let x = Math.sin(seed) * 10000;
            return x - Math.floor(x);
          };

          while (eng.decals.length > 80) {
            eng.decals.shift();
          }

          for (const d of eng.decals) {
            const alpha = Math.max(0, d.life / d.maxLife);
            
            if (d.type === 'shockwave') {
              // 🔥 SHOCKWAVE RENDERER (Para ito sa Shooting Star)
              const currentRadius = d.r * (1 - alpha); 
              
              ctx.save();
              ctx.beginPath();
              ctx.arc(Math.floor(d.x), Math.floor(d.y), currentRadius, 0, Math.PI * 2);
              ctx.strokeStyle = `rgba(${d.color || '255, 255, 255'}, ${alpha})`;
              ctx.lineWidth = 8 * alpha;
              ctx.shadowBlur = 15;
              ctx.shadowColor = `rgba(${d.color || '255, 255, 255'}, ${alpha})`;
              ctx.stroke();
              ctx.restore();
            } else {
              // =========================================================
              // 🌋 ADVANCED EPIC CRATER RENDERER (Ito ang bago mong code!)
              // =========================================================
              ctx.save();
              
              const lifePct = d.life / d.maxLife;
              const invLife = 1.0 - lifePct;
              const stableSeed = d.x * 13.37 + d.y * 42.0; 
              const time = Date.now();
              const flicker = (Math.sin(time * 0.02 + stableSeed) + 1) / 2;

              // 💥 1. DOUBLE SONIC BOOM SHOCKWAVE (Super Saiyan style)
              if (lifePct > 0.8) {
                const shockPct = (lifePct - 0.8) / 0.2; 
                ctx.globalCompositeOperation = 'lighter';
                
                // Inner Heavy Ring
                ctx.beginPath();
                ctx.arc(d.x, d.y, d.r * (0.5 + invLife * 8), 0, Math.PI * 2);
                ctx.lineWidth = 3 + shockPct * 5;
                ctx.strokeStyle = `rgba(255, 200, 100, ${shockPct * 0.8})`; 
                ctx.stroke();

                // Outer Fast Ring (Chromatic / Energy feel)
                ctx.beginPath();
                ctx.arc(d.x, d.y, d.r * (1 + invLife * 12), 0, Math.PI * 2);
                ctx.lineWidth = 1 + shockPct * 2;
                ctx.strokeStyle = `rgba(100, 255, 255, ${shockPct * 0.5})`; 
                ctx.stroke();
              }

              // 🕳️ 2. BRUTAL SCORCHED GROUND (Mas dark, mas jagged)
              ctx.globalCompositeOperation = 'multiply'; 
              ctx.globalAlpha = Math.max(0, lifePct) * 0.9;

              const charGrad = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r * 1.2);
              charGrad.addColorStop(0, 'rgba(0, 0, 0, 1)');       // Pitch black ground zero
              charGrad.addColorStop(0.4, 'rgba(15, 10, 10, 0.9)'); // Sunog na lupa
              charGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
              
              ctx.fillStyle = charGrad;
              ctx.beginPath();
              const points = 14; // Mas maraming points, mas jagged
              for (let i = 0; i < points; i++) {
                const angle = (i / points) * Math.PI * 2;
                const noise = random(stableSeed + i) * 0.4 - 0.2; // +/- 20% distortion
                const rOffset = d.r * (1 + noise);
                const px = d.x + Math.cos(angle) * rOffset;
                const py = d.y + Math.sin(angle) * rOffset;
                i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
              }
              ctx.closePath();
              ctx.fill();

              ctx.globalCompositeOperation = 'source-over'; 

              // 🪨 3. SHATTERED DEBRIS (Mga basag na bato na TUMA-TALSIC/GUMAGALAW)
              ctx.globalAlpha = lifePct * 0.8;
              const numDebris = 4 + Math.floor(random(stableSeed + 100) * 4);
              for (let i = 0; i < numDebris; i++) {
                const debSeed = stableSeed + i * 50;
                const angle = random(debSeed) * Math.PI * 2;
                
                // DITO ANG MAGIC: Dinagdag ang pushDist para umabante ang bato base sa oras (invLife)
                const pushDist = invLife * d.r * random(debSeed + 3) * 0.8; 
                const dist = d.r * (0.7 + random(debSeed + 1) * 0.5) + pushDist;
                
                const bx = d.x + Math.cos(angle) * dist;
                const by = d.y + Math.sin(angle) * dist;
                const bSize = d.r * (0.1 + random(debSeed + 2) * 0.15);
                
                // Iikot din ang bato habang tumatalsik
                const rot = random(debSeed + 4) * Math.PI * (1 + invLife * 2);

                ctx.save();
                // Gamitin natin ang translate at rotate para mas madali i-draw ang umiikot na bato
                ctx.translate(bx, by);
                ctx.rotate(rot);

                // Shadow ng bato (naka-base na ngayon sa 0,0)
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.beginPath();
                ctx.arc(2, 2, bSize, 0, Math.PI * 2);
                ctx.fill();

                // Katawan ng bato (Jagged polygon)
                ctx.fillStyle = 'rgba(40, 35, 35, 1)';
                ctx.beginPath();
                ctx.moveTo(bSize, 0);
                ctx.lineTo(0, bSize);
                ctx.lineTo(-bSize * 0.5, 0);
                ctx.lineTo(0, -bSize * 0.8);
                ctx.closePath();
                ctx.fill();

                // Highlight ng bato (Fake 3D lighting sa taas)
                ctx.strokeStyle = 'rgba(100, 90, 90, 0.6)';
                ctx.lineWidth = 1;
                ctx.stroke();
                
                ctx.restore();
              }

              // ⚡ 4. GLOWING MAGMA FISSURES (Mga bitak na may apoy sa loob)
              const emberAlpha = Math.max(0, (lifePct - 0.3) / 0.7); 
              const numCracks = 4 + Math.floor(random(stableSeed + 200) * 3);
              
              for(let i = 0; i < numCracks; i++) {
                const crackSeed = stableSeed + i * 15;
                const angle = random(crackSeed) * Math.PI * 2;
                const length = d.r * (0.8 + random(crackSeed + 1) * 0.8);
                
                const startX = d.x + Math.cos(angle) * d.r * 0.1;
                const startY = d.y + Math.sin(angle) * d.r * 0.1;
                const midX = d.x + Math.cos(angle + 0.4) * length * 0.5;
                const midY = d.y + Math.sin(angle + 0.4) * length * 0.5;
                const endX = d.x + Math.cos(angle) * length;
                const endY = d.y + Math.sin(angle) * length;

                // Base Black Crack (Kahit patay na ang baga, nandito 'to)
                ctx.globalAlpha = lifePct * 0.7;
                ctx.strokeStyle = 'rgba(5, 0, 0, 0.9)';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(midX, midY);
                ctx.lineTo(endX, endY);
                ctx.stroke();

                // Inner Glowing Magma (Pumipintig at nawawala)
                if (emberAlpha > 0) {
                  ctx.globalCompositeOperation = 'lighter';
                  ctx.globalAlpha = emberAlpha * (0.6 + flicker * 0.4);
                  ctx.strokeStyle = 'rgba(255, 100, 0, 0.9)';
                  ctx.lineWidth = 1.2;
                  ctx.beginPath();
                  ctx.moveTo(startX, startY);
                  ctx.lineTo(midX, midY);
                  ctx.lineTo(endX, endY);
                  ctx.stroke();
                  ctx.globalCompositeOperation = 'source-over'; // Reset agad per line
                }
              }

              // 🔥 5. SUPERHEATED CORE & UPWARD PARTICLES
              if (emberAlpha > 0) {
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = emberAlpha * (0.8 + flicker * 0.2); 
                
                const coreR = d.r * 0.5;
                const emberGrad = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, coreR);
                emberGrad.addColorStop(0, 'rgba(255, 255, 200, 1)');   // Blinding white center
                emberGrad.addColorStop(0.3, 'rgba(255, 80, 0, 0.9)');  // Intense Orange
                emberGrad.addColorStop(0.8, 'rgba(100, 0, 0, 0.4)');   // Dark rim
                emberGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                
                ctx.fillStyle = emberGrad;
                ctx.beginPath();
                ctx.arc(d.x, d.y, coreR, 0, Math.PI * 2);
                ctx.fill();

                // ✨ Hyper-active Sparks (Umaakyat paitaas at nagfe-fade)
                ctx.globalAlpha = emberAlpha;
                ctx.fillStyle = 'rgba(255, 200, 50, 1)';
                for (let i = 0; i < 8; i++) {
                  const sparkSeed = stableSeed + i * 77;
                  const sAngle = random(sparkSeed) * Math.PI * 2;
                  const sDist = random(sparkSeed + 1) * d.r * 0.9;
                  const speedY = invLife * d.r * 3 * random(sparkSeed + 2);
                  
                  const sparkX = d.x + Math.cos(sAngle) * sDist + (Math.sin(time*0.01 + sparkSeed)*3); // Wave motion
                  const sparkY = d.y + Math.sin(sAngle) * sDist - speedY;

                  if (speedY < d.r * 2) {
                    ctx.beginPath();
                    ctx.arc(sparkX, sparkY, 0.5 + random(sparkSeed)*1.5, 0, Math.PI * 2);
                    ctx.fill();
                  }
                }
              }
              
              ctx.restore();
            }
          }
        }
// ==========================================
      // 🎒 EQUIPMENT RENDER LOGIC (MAANGAS EFFECTS: MYTHIC, LEGENDARY, EPIC)
      // ==========================================
      if (eng.droppedItems) {
        for (const drop of eng.droppedItems) {
          ctx.save();
          const rarity = drop.item.rarity;
          const color = RARITY_COLORS[rarity] || '#ffffff';
          const time = performance.now() * 0.005;
          const bounce = Math.sin(time) * 5;
          const cx = drop.x;
          const cy = drop.y + bounce;

          // ✨ 1. LEGENDARY EFFECT: DIVINE RINGS & STAR FLARE
          if (rarity === 'legendary') {
            ctx.globalCompositeOperation = 'lighter';
            const slowPulse = Math.sin(time * 2) * 0.5 + 0.5;

            // -- Spinning Magical Rings (Runes on the ground) --
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 15;
            ctx.strokeStyle = `rgba(251, 191, 36, ${0.4 + slowPulse * 0.4})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath(); 
            ctx.ellipse(cx, cy + 5, 22 + slowPulse * 3, 7 + slowPulse, time * 0.5, 0, Math.PI * 2); 
            ctx.stroke();
            
            ctx.strokeStyle = `rgba(254, 240, 138, ${0.3 + slowPulse * 0.3})`;
            ctx.beginPath(); 
            ctx.ellipse(cx, cy + 5, 14, 4, -time * 0.8, 0, Math.PI * 2); 
            ctx.stroke();

            // -- Cross Star Flare (Lens Flare effect) --
            const flareLen = 35 + slowPulse * 15;
            const flareWidth = 1.5;
            ctx.fillStyle = `rgba(254, 240, 138, ${0.6 + slowPulse * 0.4})`;
            ctx.shadowBlur = 20;
            ctx.beginPath(); ctx.ellipse(cx, cy, flareWidth, flareLen, 0, 0, Math.PI*2); ctx.fill(); // Vertical
            ctx.beginPath(); ctx.ellipse(cx, cy, flareWidth, flareLen, Math.PI/2, 0, Math.PI*2); ctx.fill(); // Horizontal

            // -- Floating Light Orbs --
            for (let k = 0; k < 6; k++) {
              const pTime = (time * 0.8 + k * 1.5) % 3;
              const progress = pTime / 3;
              const px = cx + Math.sin(time + k) * 18; // Slow sway
              const py = cy - progress * 45;
              ctx.fillStyle = `rgba(255, 255, 255, ${1 - progress})`;
              ctx.shadowBlur = 10;
              ctx.beginPath(); ctx.arc(px, py, 1.5, 0, Math.PI*2); ctx.fill();
            }
            ctx.globalCompositeOperation = 'source-over';
          }

          // 👹 2. MYTHIC EFFECT: UNSTABLE BLOOD AURA & LIGHTNING
          if (rarity === 'mythic') {
            ctx.globalCompositeOperation = 'lighter';
            const fastPulse = Math.sin(time * 8) * 0.5 + 0.5;

            // -- Jagged Energy Burst (Sumasabog na aura) --
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 25;
            ctx.fillStyle = `rgba(220, 38, 38, ${0.3 + fastPulse * 0.3})`;
            ctx.beginPath();
            for (let i = 0; i < 14; i++) {
                const angle = (i / 14) * Math.PI * 2 + (time * 1.5);
                const spikeLen = 18 + Math.random() * 12 * fastPulse; 
                ctx.lineTo(cx + Math.cos(angle) * spikeLen, cy + Math.sin(angle) * spikeLen);
            }
            ctx.closePath();
            ctx.fill();

            // -- Inner Core Glow --
            ctx.fillStyle = `rgba(252, 165, 165, ${0.4 + fastPulse * 0.4})`;
            ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI*2); ctx.fill();

            // -- Shooting Embers (Mabilis na sparks pataas) --
            for (let k = 0; k < 8; k++) {
              const pTime = (time * 2.5 + k) % 1.5; 
              const progress = pTime / 1.5;
              const px = cx + (Math.sin(k * 10) * 20); 
              const py = cy - progress * 55;
              
              ctx.strokeStyle = `rgba(252, 165, 165, ${1 - progress})`;
              ctx.lineWidth = 1.5;
              ctx.shadowBlur = 5;
              ctx.beginPath(); 
              ctx.moveTo(px, py); 
              ctx.lineTo(px, py - 8); 
              ctx.stroke();
            }

            // -- Chaotic Sharp Lightning --
            if (Math.random() < 0.45) {
              ctx.strokeStyle = Math.random() > 0.6 ? '#ffffff' : '#fca5a5';
              ctx.lineWidth = 1.5 + Math.random() * 1.5;
              ctx.shadowColor = '#dc2626';
              ctx.shadowBlur = 15;
              ctx.beginPath();
              
              let lx = cx, ly = cy;
              ctx.moveTo(lx, ly);
              
              let lAngle = -Math.PI / 2 + (Math.random() - 0.5) * 2; 
              for(let j = 0; j < 5; j++) {
                  lAngle += (Math.random() - 0.5) * 1.8; 
                  lx += Math.cos(lAngle) * (8 + Math.random() * 12);
                  ly += Math.sin(lAngle) * (8 + Math.random() * 12);
                  ctx.lineTo(lx, ly);
              }
              ctx.stroke();
            }
            ctx.globalCompositeOperation = 'source-over';
          }

          // 🌌 3. EPIC EFFECT: ARCANE GEOMETRY & ORBITING WISPS
          if (rarity === 'epic') {
            ctx.globalCompositeOperation = 'lighter';
            const medPulse = Math.sin(time * 4) * 0.5 + 0.5;

            // -- Expanding Geometric Base (Rotating Squares) --
            ctx.shadowColor = '#a855f7'; // Purple glow
            ctx.shadowBlur = 15;
            ctx.strokeStyle = `rgba(168, 85, 247, ${0.4 + medPulse * 0.4})`;
            ctx.lineWidth = 1.5;
            
            ctx.save();
            ctx.translate(cx, cy + 5);
            ctx.scale(1, 0.4); // Flatten out sa lapag para mukhang 3D
            
            // Unang umiikot na parisukat
            ctx.rotate(time * 1.2);
            ctx.strokeRect(-12 - medPulse * 2, -12 - medPulse * 2, 24 + medPulse * 4, 24 + medPulse * 4);
            
            // Pangalawang umiikot na parisukat (Paatras)
            ctx.rotate(-time * 2.5);
            ctx.strokeStyle = `rgba(216, 180, 254, ${0.5 + medPulse * 0.3})`; // Lighter purple
            ctx.strokeRect(-8, -8, 16, 16);
            ctx.restore();

            // -- Orbiting Magic Wisps (Umiikot at umaakyat na bola ng energy) --
            for (let k = 0; k < 3; k++) {
              const orbitTime = time * 3.5 + (k * ((Math.PI * 2) / 3)); 
              const progress = (time * 1.2 + k) % 2; // Pataas from 0 to 2 seconds
              
              const radius = 16 - progress * 6; // Lumiliit ang ikot habang umaakyat
              const px = cx + Math.cos(orbitTime) * radius; 
              const py = cy + 5 - (progress * 25) + Math.sin(orbitTime) * 3; // Helix motion
              
              ctx.fillStyle = `rgba(216, 180, 254, ${1 - (progress / 2)})`;
              ctx.shadowBlur = 12;
              ctx.shadowColor = '#c084fc';
              ctx.beginPath(); ctx.arc(px, py, 2.5 + medPulse, 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalCompositeOperation = 'source-over';
          }

          // 💎 4. BASE ITEM SHAPE RENDERING (Diamond — faceted gem cut)
          ctx.shadowColor = color;
          ctx.shadowBlur = 20 + Math.abs(Math.sin(time * 0.5)) * 10;
          
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.moveTo(cx, cy - 8);
          ctx.lineTo(cx + 6, cy);
          ctx.lineTo(cx, cy + 8);
          ctx.lineTo(cx - 6, cy);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.lineWidth = 1.2;
          ctx.stroke();

          // Facet cut lines for a genuine gem-cut sparkle
          ctx.shadowBlur = 0;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.moveTo(cx, cy - 8); ctx.lineTo(cx, cy + 8);
          ctx.moveTo(cx - 6, cy); ctx.lineTo(cx + 6, cy);
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(cx - 1.6, cy - 1.6, 1.8, 0, Math.PI * 2);
          ctx.fill();

          // 🏷️ 5. NAME TAG RENDERING
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center';
          ctx.shadowBlur = 0;
          ctx.lineWidth = 2.5;
          ctx.lineJoin = 'round';
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
          ctx.strokeText(drop.item.name, cx, cy - 18);
          ctx.fillStyle = color;
          ctx.fillText(drop.item.name, cx, cy - 18);

          ctx.restore();
        }
      }
      // ==========================================
      // 🔥 FIX: SIGIL GLOW SCALING — shadowBlur is one of the heaviest canvas
      // ops (not GPU-accelerated in most browsers), and each tornado/wave/
      // fissure/lightning/iceStorm draws its own blurred glow layers. Kapag
      // marami silang magkasabay na active, kino-compute lang natin ito
      // ISANG BESES bago ang lahat ng 5 render blocks sa halip na paulit-ulit,
      // at ginagamit para i-scale DOWN ang shadowBlur radius (hindi totally
      // i-off, para hindi biglang mawala ang glow — unti-unting lumiliit
      // lang habang dumarami ang sabay-sabay na effects).
      const _activeSigilHazardCount =
        (eng.tornados ? eng.tornados.length : 0) +
        (eng.waves ? eng.waves.length : 0) +
        (eng.fissures ? eng.fissures.length : 0) +
        (eng.lightnings ? eng.lightnings.length : 0) +
        (eng.iceStorms ? eng.iceStorms.length : 0);
      // 1 hazard = full blur (1.0). Each additional active hazard reduces blur
      // by 15%, floor of 0.35 so there's always SOME glow, never fully flat.
      const sigilGlowScale = _activeSigilHazardCount <= 1
        ? 1.0
        : Math.max(0.35, 1.0 - (_activeSigilHazardCount - 1) * 0.15);

 if (eng.tornados && eng.tornados.length > 0) {
  // 1. Kuhanin ang oras ISANG BESES lang bago mag-loop (Performance boost & sync)
  const currentTime = performance.now();
  const tTimeBase = currentTime * 0.015;
  const fTimeBase = currentTime * 0.02;

  for (const t of eng.tornados) {
    if (t.isFamiliar) {
      // ==========================================================
      // 🦅 ZEPHYR FALCON: TRUE GREEN WIND TORNADO VORTEX
      // ==========================================================
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.rotate(tTimeBase);
      ctx.globalAlpha = Math.min(1, t.life);
      
      // Layered green wind trails and airflow motion blur
      ctx.shadowBlur = 25 * sigilGlowScale;
      ctx.shadowColor = '#10b981';
      
      // Spiral vortex rings (Outer Layer)
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 4 + Math.sin(tTimeBase * 0.5) * 2;
      ctx.beginPath();
      ctx.arc(0, 0, t.r + Math.cos(tTimeBase * 0.8) * 10, 0, Math.PI * 1.5);
      ctx.stroke();

      // Gust bursts (Middle Layer)
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(0, 0, t.r * 0.7, Math.PI, Math.PI * 2.5);
      ctx.stroke();

      // 2. I-OFF ANG SHADOW BLUR PARA SA CORE AT DEBRIS (Massive FPS boost)
      // Hindi kailangan ng shadowBlur ang semi-transparent fills at particles.
      ctx.shadowBlur = 0; 

      // Swirling Energy Core
      ctx.fillStyle = 'rgba(16, 185, 129, 0.4)';
      ctx.beginPath(); 
      ctx.arc(0, 0, t.r * 0.4, 0, Math.PI * 2); 
      ctx.fill();

      // Flying Debris (Leaves, dust, and wind particles)
      ctx.fillStyle = '#065f46';
      for (let i = 0; i < 8; i++) {
          const debrisAng = tTimeBase * 2 + (i * Math.PI / 4);
          const debrisDist = t.r * (0.3 + 0.6 * Math.abs(Math.sin(tTimeBase + i)));
          const dx = Math.cos(debrisAng) * debrisDist;
          const dy = Math.sin(debrisAng) * debrisDist;
          
          ctx.save(); 
          ctx.translate(dx, dy); 
          ctx.rotate(debrisAng * 3);
          ctx.fillRect(-4, -2, 8, 4); 
          ctx.restore();
      }
      ctx.restore();

    } else {
      // ==========================================================
      // 🔥 PLAYER: FLARE INFERNO (REALISTIC BURNING FIRE ORB VORTEX)
      // ==========================================================
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.rotate(-fTimeBase); // Reverse spin
      ctx.globalAlpha = Math.min(1, t.life);

      // Strong Fire Simulation Glow & Heat Distortion
      ctx.shadowBlur = 35 * sigilGlowScale;
      ctx.shadowColor = '#ef4444';

      // Outer Chaotic Fire Layers (Flickering flames)
      const firePulse = Math.sin(fTimeBase * 0.5) * 8;
      ctx.strokeStyle = '#f97316'; 
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.arc(0, 0, t.r + firePulse, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#ef4444'; 
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(0, 0, t.r * 1.2 - firePulse, Math.PI / 2, Math.PI * 1.8);
      ctx.stroke();

      // 3. I-OFF ang shadow sa gradient core
      ctx.shadowBlur = 0; 

      // Glowing Fire Core
      const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, t.r * 0.6);
      coreGrad.addColorStop(0, '#ffffff'); 
      coreGrad.addColorStop(0.4, '#fef08a'); 
      coreGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(0, 0, t.r * 0.6, 0, Math.PI * 2);
      ctx.fill();

      // Lingering Embers & Ash Particles
      ctx.fillStyle = '#fde047';
      ctx.shadowBlur = 10 * sigilGlowScale;
      ctx.shadowColor = '#f97316';
      
      // 4. BATCH RENDERING: Ipunin muna ang mga embers bago i-fill
      ctx.beginPath(); 
      for (let i = 0; i < 6; i++) {
          const emberAng = (i * Math.PI / 3) + (fTimeBase * 0.5);
          const emberDist = t.r * (0.8 + Math.random() * 0.4);
          const ex = Math.cos(emberAng) * emberDist;
          const ey = Math.sin(emberAng) * emberDist - (Math.random() * 12); 
          
          // Gagamitin ang rect() imbes na fillRect() para isang lagpasan lang
          ctx.rect(ex, ey, 3, 3);
      }
      ctx.fill(); // Isang render lang ng shadow at kulay para sa lahat ng 6 embers!

      ctx.restore();
    }
  }
}

if (eng.waves && eng.waves.length > 0) {
  const tsuTime = performance.now() * 0.001;

  for (const w of eng.waves) {
    ctx.save();
    const dir = (w.vx || 0) >= 0 ? 1 : -1;
    const halfWidth = w.width / 2;
    const leadX = w.x + dir * halfWidth;   // crashing front edge
    const tailX = w.x - dir * halfWidth;   // receding wake edge
    const bandX0 = Math.min(tailX, leadX);

    // ── 1. DEEP BODY
    const bodyGrad = ctx.createLinearGradient(tailX, 0, leadX, 0);
    bodyGrad.addColorStop(0,    'rgba(7, 30, 48, 0)');
    bodyGrad.addColorStop(0.3,  'rgba(7, 70, 105, 0.55)');
    bodyGrad.addColorStop(0.68, 'rgba(14, 165, 233, 0.82)');
    bodyGrad.addColorStop(0.92, 'rgba(165, 243, 252, 0.92)');
    bodyGrad.addColorStop(1,    'rgba(255, 255, 255, 0.95)');
    
    ctx.fillStyle = bodyGrad;
    ctx.shadowBlur = 28 * sigilGlowScale;
    ctx.shadowColor = '#22d3ee';
    ctx.fillRect(bandX0, 0, w.width, H);

    // 🚨 FIX 1: I-OFF agad ang shadow blur! 
    // Yung mga internal streaks sa Step 2 ay namamana yung 28 blur mula sa Step 1 kaya sobrang lag.
    ctx.shadowBlur = 0;

    // ── 2. CHURNING CURRENT STREAKS
    ctx.save();
    ctx.beginPath();
    ctx.rect(bandX0, 0, w.width, H);
    ctx.clip();
    
    ctx.globalAlpha = 0.30;
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.7)';
    ctx.lineWidth = 2.4;
    
    // 🚨 FIX 2: BATCH RENDERING. Isang beginPath at isang stroke na lang para sa lahat ng linya.
    ctx.beginPath();
    for (let i = 0; i < 7; i++) {
      const sy = (i / 7) * H + Math.sin(tsuTime * 2 + i * 1.7) * 18;
      ctx.moveTo(tailX, sy);
      ctx.bezierCurveTo(
        tailX + dir * w.width * 0.32, sy + Math.sin(tsuTime * 3 + i) * 16,
        tailX + dir * w.width * 0.66, sy - Math.sin(tsuTime * 2.4 + i) * 16,
        leadX, sy
      );
    }
    ctx.stroke(); // Isang draw call na lang imbes na 7!
    ctx.restore(); // Babalik nito ang globalAlpha sa 1 at aalisin ang clip()

    // ── 3. CRASHING WHITECAP
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.shadowBlur = 16 * sigilGlowScale;
    ctx.shadowColor = '#e0f2fe';
    ctx.beginPath();
    const foamSeg = 22;
    
    // 🚨 FIX 3: Pre-calculate ang mga constant math values sa labas ng loop
    const tsuTime42 = tsuTime * 4.2;
    const tsuTime65 = tsuTime * 6.5;
    
    for (let i = 0; i <= foamSeg; i++) {
      const sy = (i / foamSeg) * H;
      const foam = Math.sin(sy * 0.05 + tsuTime42) * 9 + Math.sin(sy * 0.13 - tsuTime65) * 5;
      ctx.lineTo(leadX + dir * (6 + Math.max(0, foam)), sy);
    }
    for (let i = foamSeg; i >= 0; i--) {
      const sy = (i / foamSeg) * H;
      ctx.lineTo(leadX - dir * 5, sy);
    }
    ctx.closePath();
    ctx.fill();

    // ── 4. FLYING SPRAY
    ctx.shadowBlur = 4;
    
    // Ilabas ang Math.floor sa loop para hindi paulit-ulit icompute
    const sprayBaseTime = Math.floor(tsuTime * 3); 
    
    for (let i = 0; i < 12; i++) {
      const seed = i * 13.37 + sprayBaseTime;
      const sy = ((Math.sin(seed) * 0.5) + 0.5) * H;
      const spread = (Math.sin(seed * 1.7) + 1) * 0.5;
      const sx = leadX + dir * (10 + spread * 34);
      const dr = Math.max(0.6, 1 + Math.sin(seed * 3.1) * 1.2);
      
      // 🚨 FIX 4: Imbes na baguhin ang globalAlpha paulit-ulit, i-set na lang ang opacity via fillStyle.
      // Ang pagpapalit ng globalAlpha sa Canvas API ay mabigat na state change.
      ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + spread * 0.5})`;
      
      ctx.beginPath();
      ctx.arc(sx, sy, dr, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── 5. TRAILING MIST
    ctx.shadowBlur = 0;
    const mistGrad = ctx.createLinearGradient(tailX - dir * 30, 0, tailX, 0);
    mistGrad.addColorStop(0, 'rgba(125, 211, 252, 0)');
    mistGrad.addColorStop(1, 'rgba(125, 211, 252, 0.18)');
    ctx.fillStyle = mistGrad;
    ctx.fillRect(Math.min(tailX - dir * 30, tailX), 0, 30, H);

    ctx.restore();
  }
}

if (eng.fissures && eng.fissures.length > 0) {
  ctx.save(); // I-save ang state bago baguhin ang mga global settings
  
  // 1. ILABAS SA LOOP: Ang mga settings na hindi naman nagbabago per fissure
  ctx.lineCap = 'round';
  ctx.shadowColor = '#f59e0b';

  for (const f of eng.fissures) {
     ctx.save();
     ctx.translate(f.x, f.y);
     ctx.rotate(f.angle);
     
     // 2. GLOBAL ALPHA VS RGBA STRINGS: Mas mabilis ang hex colors + globalAlpha
     ctx.globalAlpha = f.life;
     
     // Outer thick fissure (Lava glow)
     ctx.strokeStyle = '#d97706'; // Equivalent ng rgb(217, 119, 6)
     ctx.lineWidth = 30 * f.life;
     ctx.shadowBlur = 20 * sigilGlowScale; 
     
     ctx.beginPath();
     ctx.moveTo(0, 0);
     ctx.lineTo(f.length, 0);
     ctx.stroke();
     
     // Inner bright core (Heat)
     ctx.strokeStyle = '#fef08a'; // Equivalent ng rgb(254, 240, 138)
     ctx.lineWidth = 8 * f.life;
     
     // 3. I-OFF ANG SHADOW: Hindi na kailangan ng inner stroke ng sariling shadow
     ctx.shadowBlur = 0; 
     
     ctx.beginPath();
     ctx.moveTo(0, 0);
     ctx.lineTo(f.length, 0);
     ctx.stroke();
     
     ctx.restore();
  }
  ctx.restore(); // I-reset ang lineCap at shadowColor para sa ibang skills
}

 // =========================================================================
        // 🦇 UMBRAL BAT: SHADOW BLADES RENDERER (CRASH & BUG FIX)
        // =========================================================================
        if (eng.shadowBlades) {
          const dt = 0.016; 
          
          // 🔧 FIX: Safe Host Check para maiwasan ang "isHost before initialization" error!
          let canDealDamage = true;
          try { 
              canDealDamage = (isHost || !isCoopActive); 
          } catch (e) {
              // Kung nag-error dahil nasa itaas ang code, babagsak siya rito nang ligtas
              canDealDamage = true; 
          }

          for (let i = eng.shadowBlades.length - 1; i >= 0; i--) {
            const sl = eng.shadowBlades[i];
            sl.x += sl.vx * dt; sl.y += sl.vy * dt; sl.life -= dt;
            if (sl.life <= 0) { eng.shadowBlades.splice(i, 1); continue; }

            // Collision Physics
            if (canDealDamage) {
                for (const enemy of eng.enemies) {
                    if (Math.hypot(enemy.x - sl.x, enemy.y - sl.y) < enemy.r + 24 && !sl.hits.has(enemy)) {
                        sl.hits.add(enemy); 
                        const shooterObj = sl.p2 ? eng.p2 : eng.p;
                        // let baseSkillDmg = (sl.dmg || 80) + ((eng?.wave || 1) * 20);
                        let baseSkillDmg = sl.dmg ? sl.dmg : (80 + ((eng?.wave || 1) * 20));
                        if (shooterObj?.potBuffs?.power > 0) baseSkillDmg *= 1.4;
                        if (shooterObj?.skills?.arcaneInstinct?.duration > 0) baseSkillDmg *= 2.0; 
                        if (enemy.instabTime > 0) baseSkillDmg *= 1.5;
                        let totalCrit = (shooterObj?.baseCrit || 0) + (shooterObj?.potBuffs?.crit > 0 ? 35 : 0);
                        let isCrit = false;
                        if (Math.random() < (totalCrit / 100)) { baseSkillDmg *= 2; enemy.flash = 0.5; } 
                        else { enemy.flash = 0.2; }
                        enemy.hp -= baseSkillDmg;
                        window.recordArcaneDamage('Umbral Bat', baseSkillDmg);
                        spawnFCT(eng, enemy.x, enemy.y, baseSkillDmg, 'damage', isCrit);
                        if (enemy.hp <= 0) enemy.deadTrigger = true;
                        
                        // Hit sparks
                        for (let k = 0; k < 6; k++) {
                            const pa = Math.random() * Math.PI * 2; const ps = Math.random() * 90 + 30;
                            eng.particles.push({ x: sl.x, y: sl.y, vx: Math.cos(pa) * ps, vy: Math.sin(pa) * ps, color: Math.random() > 0.5 ? '#000000' : '#e11d48', life: 0.3, ml: 0.3, r: Math.random() * 2 + 1 });
                        }
                    }
                }
            }

            // Visual Draw
            ctx.save(); ctx.translate(sl.x, sl.y); ctx.rotate(sl.angle);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'; ctx.beginPath(); ctx.arc(-20, 0, 15 * sl.life, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#9f1239'; ctx.shadowBlur = 20; ctx.shadowColor = '#e11d48'; ctx.beginPath();
            ctx.arc(0, 0, 24, -Math.PI / 1.5, Math.PI / 1.5); ctx.arc(-15, 0, 24, Math.PI / 1.5, -Math.PI / 1.5, true); 
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#000000'; ctx.beginPath(); ctx.arc(5, 0, 8, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
          }
        }

// =========================================================================
        // 🪨 STONE GOLEM: ULTRA ELEVATED EARTH IMPACT SYSTEM (OVERHAULED)
        // =========================================================================
if (eng.earthSmashes && eng.earthSmashes.length > 0) {
    const dt = 0.016; 
    
    // 1. ILABAS SA LOOP: Kunin ang oras at pulse multiplier nang isang beses lang
    const currentTime = performance.now();
    const pulse = 1 + Math.sin(currentTime * 0.015) * 0.15;

    for (let i = eng.earthSmashes.length - 1; i >= 0; i--) {
        const rock = eng.earthSmashes[i];
        rock.life -= dt;
        if (rock.life <= 0) { eng.earthSmashes.splice(i, 1); continue; }

        ctx.save(); 
        ctx.translate(rock.x, rock.y); 
        ctx.globalAlpha = Math.min(1, rock.life * 2.5); 

        // 1. 🕳️ DARK CRATER SHADOW
        ctx.fillStyle = `rgba(0, 0, 0, ${rock.life * 0.7})`;
        ctx.beginPath();
        ctx.ellipse(0, 0, rock.radius * 0.95, rock.radius * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. 🔥 PULSING MOLTEN SHOCKWAVE BURST
        ctx.save(); 
        ctx.globalCompositeOperation = 'lighter'; 
        ctx.strokeStyle = `rgba(245, 158, 11, ${rock.life * 0.8})`; 
        ctx.lineWidth = 30 * rock.life; 
        ctx.shadowBlur = 40; 
        ctx.shadowColor = '#f59e0b';
        ctx.beginPath(); 
        ctx.arc(0, 0, rock.radius * (1 - rock.life / 1.2) * pulse, 0, Math.PI * 2); 
        ctx.stroke(); 
        ctx.restore();

        // 3. ⚡ SEVERE GROUND CRACKS (BATCH RENDERING)
        ctx.shadowBlur = 0; 
        
        // I-compute muna ang posisyon ng cracks para magamit ng 3 layers nang walang loop-in-loop
        const cracks = [];
        for(let c = 0; c < 8; c++) {
            const cAng = (c * Math.PI * 2) / 8 + 0.1;
            cracks.push({
                jitterAng: cAng + (Math.random() * 0.15 - 0.075),
                cAng: cAng,
                midDist: rock.radius * 0.35,
                endDist: rock.radius * 0.9
            });
        }

        // Layer 1: Dark Base Crack (Isang draw call na lang para sa 8 linya)
        ctx.beginPath();
        for (const c of cracks) {
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(c.jitterAng) * c.midDist, Math.sin(c.jitterAng) * c.midDist);
            ctx.lineTo(Math.cos(c.cAng) * c.endDist, Math.sin(c.cAng) * c.endDist);
        }
        ctx.strokeStyle = '#1c1917'; ctx.lineWidth = 10; ctx.stroke();

        // Layer 2: Orange Lava Core
        ctx.beginPath();
        for (const c of cracks) {
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(c.jitterAng) * c.midDist, Math.sin(c.jitterAng) * c.midDist);
            ctx.lineTo(Math.cos(c.cAng) * c.endDist, Math.sin(c.cAng) * c.endDist);
        }
        ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 4; ctx.shadowBlur = 15; ctx.shadowColor = '#ef4444'; ctx.stroke();
        
        // Layer 3: White-Hot Center
        ctx.beginPath();
        for (const c of cracks) {
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(c.jitterAng) * c.midDist, Math.sin(c.jitterAng) * c.midDist);
            ctx.lineTo(Math.cos(c.cAng) * c.endDist, Math.sin(c.cAng) * c.endDist);
        }
        ctx.shadowBlur = 0; // I-off agad ang shadow
        ctx.strokeStyle = '#fef08a'; ctx.lineWidth = 1.5; ctx.stroke();

        // 4. ⛰️ MASSIVE 3D STONE SPIKES 
        // 🚨 MASSIVE FPS BOOST: Imbes na 20 separate shadows, gagawa tayo ng isang base shadow para sa ilalim ng lahat ng bato.
        ctx.shadowBlur = 35; 
        ctx.shadowColor = 'rgba(0,0,0,0.85)';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.beginPath();
        ctx.arc(0, 0, rock.radius * 0.6, 0, Math.PI * 2);
        ctx.fill(); // Isang shadow calculation lang!

        ctx.shadowBlur = 0; // Wala nang shadow yung bato mismo para hindi bumigat
        const spikeCount = 10; 
        for(let s = 0; s < spikeCount; s++) {
            const ang = (s * Math.PI * 2) / spikeCount; 
            const dist = rock.radius * 0.5; 
            ctx.save(); 
            ctx.translate(Math.cos(ang) * dist, Math.sin(ang) * dist); 
            ctx.rotate(ang + Math.PI / 2);
            
            const spikeHeight = 55 + (s % 3 * 25); 
            
            // Kanang bahagi
            ctx.fillStyle = '#292524'; ctx.beginPath(); ctx.moveTo(0, -spikeHeight); ctx.lineTo(24, 0); ctx.lineTo(0, 15); ctx.closePath(); ctx.fill();
            // Kaliwang bahagi
            ctx.fillStyle = '#57534e'; ctx.strokeStyle = '#f5f5f4'; ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.moveTo(0, -spikeHeight); ctx.lineTo(-24, 0); ctx.lineTo(0, 15); ctx.closePath(); ctx.fill(); ctx.stroke();
            
            ctx.restore();
        }

        // 5. ☄️ FLYING ROCK DEBRIS 
        ctx.fillStyle = '#44403c';
        ctx.strokeStyle = '#a8a29e';
        ctx.lineWidth = 1.5;
        // In-off ang shadow dito. Sobrang liit ng 12x12 debris para lagyan ng shadowBlur, sayang ang CPU.
        for (let b = 0; b < 6; b++) {
            const bAng = b * (Math.PI * 2 / 6) + rock.life;
            const bDist = rock.radius * (1.2 - rock.life); 
            ctx.save();
            ctx.translate(Math.cos(bAng) * bDist, Math.sin(bAng) * bDist - (rock.life * 50)); 
            ctx.rotate(rock.life * 15 + b); 
            ctx.beginPath(); ctx.rect(-6, -6, 12, 12); ctx.fill(); ctx.stroke();
            ctx.restore();
        }

        // 6. ✨ LINGERING SMOKE/DUST CLOUDS (BATCH RENDERING)
        ctx.fillStyle = `rgba(120, 113, 108, ${rock.life * 0.6})`;
        ctx.beginPath();
        const smokeRadius = 30 * (1.5 - rock.life);
        for(let d = 0; d < 8; d++) {
            const dAng = d * (Math.PI / 4) + (1 - rock.life);
            const rX = Math.cos(dAng) * (rock.radius * 0.6);
            const rY = Math.sin(dAng) * (rock.radius * 0.6);
            
            // Ginamit ang moveTo para hindi mag-konekta ang mga usok gamit ang linya
            ctx.moveTo(rX + smokeRadius, rY); 
            ctx.arc(rX, rY, smokeRadius, 0, Math.PI * 2);
        }
        ctx.fill(); // Isang fill call para sa 8 na bilog!

        ctx.restore();
    }
}

// =========================================================================
        // ⚡ SPARK FOX: VIOLET PLASMA CHAIN LIGHTNING (ULTRA DESIGN)
        // =========================================================================
if (eng.lightnings && eng.lightnings.length > 0) {
  // Global Setup na pwede gamitin ng lahat ng lightning (Tipid sa state changes)
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  for (const l of eng.lightnings) {
    if (l.isFamiliar) {
      ctx.save(); 
      ctx.globalAlpha = Math.min(1, l.life * 2.5);
      
      const startPt = l.pts[0];
      const endPt = l.pts[l.pts.length - 1];

      // BATCH PATHING: Gagawa tayo ng iisang path data tapos gagamitin ulit para sa lahat ng layers!
      // Ito yung pinakamalaking fps booster dahil hindi na ulit-ulit icocompute ng browser yung mga linya.
      const mainPath = new Path2D();
      mainPath.moveTo(startPt.x, startPt.y);
      for (let i = 1; i < l.pts.length; i++) {
        mainPath.lineTo(l.pts[i].x, l.pts[i].y);
      }

      // 1. Outer Massive Plasma Glow
      ctx.strokeStyle = 'rgba(192, 132, 252, 0.4)'; 
      ctx.lineWidth = 15;
      ctx.shadowBlur = 30 * sigilGlowScale; 
      ctx.shadowColor = '#d946ef';
      ctx.stroke(mainPath);

      // 2. Inner Heavy Lightning Core
      ctx.strokeStyle = '#d946ef'; 
      ctx.lineWidth = 6;
      ctx.shadowBlur = 15 * sigilGlowScale;
      ctx.stroke(mainPath);

      // 3. Blinding White Electric Center
      ctx.strokeStyle = '#ffffff'; 
      ctx.lineWidth = 2; 
      ctx.shadowBlur = 0; // Patayin ang shadow para sa puting linya, sapat na yung ilalim
      ctx.stroke(mainPath);

      // 4. Chaotic Zig-Zag Branching Sparks (BATCH RENDERING)
      if (l.branching) {
        ctx.strokeStyle = '#f0abfc'; 
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 10;
        
        ctx.beginPath(); // Isang beginPath lang para sa LAHAT ng sparks!
        
        for (let i = 0; i < l.pts.length - 1; i++) {
          if (Math.random() > 0.25) {
            const pt1 = l.pts[i];
            const pt2 = l.pts[i+1];
            const midX = (pt1.x + pt2.x) / 2; 
            const midY = (pt1.y + pt2.y) / 2;
            
            const branchX = midX + (Math.random() - 0.5) * 120; 
            const branchY = midY + (Math.random() - 0.5) * 120;
            const elbowX = midX + (branchX - midX) * 0.5 + (Math.random() - 0.5) * 30;
            const elbowY = midY + (branchY - midY) * 0.5 + (Math.random() - 0.5) * 30;
            
            ctx.moveTo(midX, midY); 
            ctx.lineTo(elbowX, elbowY);
            ctx.lineTo(branchX, branchY); 
          }
        }
        ctx.stroke(); // Isang stroke() call lang para i-draw lahat ng nag-branch!
      }

      // 5. Electric Impact Explosion & Shockwave Ring at Target
      ctx.fillStyle = '#ffffff'; 
      ctx.shadowBlur = 20;
      // ctx.shadowColor ay '#d946ef' na from layer 1, so no need palitan

      ctx.beginPath(); 
      ctx.arc(endPt.x, endPt.y, 8 + Math.random() * 6, 0, Math.PI * 2); 
      ctx.fill();

      // Shockwave ring
      // I-off na natin ang glow dito para malinis, tsaka malayo na sya sa impact core
      ctx.shadowBlur = 0;
      ctx.strokeStyle = `rgba(217, 70, 239, ${l.life})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); 
      ctx.arc(endPt.x, endPt.y, 35 * (1.5 - l.life), 0, Math.PI * 2); 
      ctx.stroke();

      ctx.restore();
      
    } else {
      // 🧑‍🚀 OLD PLAYER LIGHTNING (Optimized with Path2D caching)
      ctx.save(); 
      ctx.globalAlpha = l.life * 2;
      
      const oldPath = new Path2D();
      oldPath.moveTo(l.pts[0].x, l.pts[0].y); 
      for (let i = 1; i < l.pts.length; i++) {
        oldPath.lineTo(l.pts[i].x, l.pts[i].y);
      }
      
      // Layer 1: Glow
      ctx.strokeStyle = '#a78bfa'; // Gumamit ng hex imbes na rgba
      ctx.lineWidth = 8;
      ctx.shadowBlur = 20 * sigilGlowScale; 
      ctx.shadowColor = '#c084fc'; 
      ctx.lineJoin = 'miter'; 
      ctx.stroke(oldPath);
      
      // Layer 2: White Core
      ctx.strokeStyle = '#ffffff'; 
      ctx.lineWidth = 3; 
      ctx.shadowBlur = 0; // Off glow
      ctx.stroke(oldPath);
      
      ctx.restore();
    }
  }
  ctx.restore(); // I-reset ang outer save()
}

if (eng.iceStorms && eng.iceStorms.length > 0) {
  // ─── Deterministic noise helpers ───────────────────────────────────────
  const frostJ  = (seed) => { const x = Math.sin(seed * 12.9898) * 43758.5453; return x - Math.floor(x); };
  const frostJ2 = (seed) => { const x = Math.sin(seed * 78.233 + 43.21) * 43758.5453; return x - Math.floor(x); };

  for (const s of eng.iceStorms) {
    // ── One-time stable seed + particle initialisation ──────────────────
    if (typeof s._coreSeed !== 'number') {
      s._coreSeed    = Math.random() * 1000;
      s._blobSeed    = Math.random() * 1000;
      s._glacierSeed = Math.random() * 1000;
      s._particles = Array.from({ length: 40 }, (_, i) => ({
        angle:  frostJ(i * 17.3)  * Math.PI * 2,
        dist:   frostJ(i * 31.7)  * 0.9,
        speed:  0.00018 + frostJ(i * 43.1) * 0.00045,
        size:   0.8 + frostJ(i * 23.9) * 2.8,
        phase:  frostJ(i * 61.3)  * Math.PI * 2,
        sway:   (frostJ(i * 11.7) - 0.5) * 0.9,
      }));
      s._glaciers = Array.from({ length: 12 }, (_, i) => ({
        angle: (i / 12) * Math.PI * 2 + frostJ(1000 + i)  * 0.4,
        dist:  0.52 + frostJ(1000 + i * 7)  * 0.40,
        scale: 0.07 + frostJ(1000 + i * 13) * 0.11,
        rot:   frostJ(1000 + i * 19) * Math.PI,
        sides: 5 + Math.floor(frostJ(1000 + i * 29) * 3),
      }));
    }

    const isFam    = !!s.isFamiliar;
    const now2     = performance.now();
    const lifeR    = Math.min(1, s.life / 3.0);   

    const v = isFam ? {
      cloud:'rgba(34,211,238,',   edge:'rgba(8,47,73,',
      mist1:'rgba(186,230,253,',  mist2:'rgba(224,242,254,',
      vortex:'rgba(103,232,249,', wind:'rgba(165,243,252,0.65)',
      windSpeed:0.00045, windCount:5, vortexCount:3,
      shardColor:'rgba(200,240,255,0.92)', shardGlow:'#67e8f9',
      shardCount:22, flakeCount:9, sparkCount:6,
      glacierFill:'rgba(186,230,253,', glacierStroke:'#67e8f9',
      border:'rgba(165,243,252,0.75)', glow:'#0ea5e9', glow2:'#22d3ee',
      coreColor:'#e0f2fe', coreGlowIn:'rgba(224,242,254,0.97)', coreGlowOut:'rgba(14,165,233,0)',
      coreRotSpeed:0.0009, crackleChance:0.20,
    } : {
      cloud:'rgba(125,211,252,',  edge:'rgba(15,23,60,',
      mist1:'rgba(147,197,253,',  mist2:'rgba(191,219,254,',
      vortex:'rgba(147,197,253,', wind:'rgba(186,230,253,0.65)',
      windSpeed:-0.0004, windCount:6, vortexCount:4,
      shardColor:'rgba(225,239,255,0.96)', shardGlow:'#93c5fd',
      shardCount:30, flakeCount:13, sparkCount:11,
      glacierFill:'rgba(147,197,253,', glacierStroke:'#93c5fd',
      border:'rgba(191,219,254,0.80)', glow:'#2563eb', glow2:'#3b82f6',
      coreColor:'#ffffff', coreGlowIn:'rgba(255,255,255,0.98)', coreGlowOut:'rgba(37,99,235,0)',
      coreRotSpeed:-0.0006, crackleChance:0.26,
    };

    ctx.save();
    ctx.shadowBlur = 0; // Siguraduhing walang nakalusot na shadow sa start

    // ══════════════════════════════════════════════════════════════════
    // LAYER 1 ▸ DEEP ATMOSPHERIC COLD BASE
    // ══════════════════════════════════════════════════════════════════
    const outerG = ctx.createRadialGradient(s.x, s.y, s.radius * 0.45, s.x, s.y, s.radius * 1.08);
    outerG.addColorStop(0,   `${v.edge}0)`);
    outerG.addColorStop(0.55,`${v.edge}${0.14 * lifeR})`);
    outerG.addColorStop(1,   `${v.edge}${0.50 * lifeR})`);
    ctx.fillStyle = outerG;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.radius * 1.08, 0, Math.PI * 2); ctx.fill();

    for (let i = 0; i < 5; i++) {
      const seed  = s._blobSeed + i * 37.1;
      const bAng  = frostJ(seed) * Math.PI * 2 + Math.sin(now2 * 0.00032 + seed) * 0.65;
      const bDist = s.radius * (0.07 + frostJ(seed * 1.7) * 0.43);
      const bx    = s.x + Math.cos(bAng) * bDist;
      const by    = s.y + Math.sin(bAng) * bDist;
      const br    = s.radius * (0.52 + frostJ(seed * 2.3) * 0.30);
      const alpha = Math.min(0.30, s.life / 2.0) * lifeR;
      const cg = ctx.createRadialGradient(bx, by, 0, bx, by, br);
      cg.addColorStop(0,   `${v.cloud}${alpha})`);
      cg.addColorStop(0.6, `${v.cloud}${alpha * 0.45})`);
      cg.addColorStop(1,   `${v.edge}0)`);
      ctx.fillStyle = cg;
      ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
    }

    // ══════════════════════════════════════════════════════════════════
    // LAYER 2 ▸ ICE VAPOR / COLD MIST
    // ══════════════════════════════════════════════════════════════════
    const mistT = now2 * 0.00026;
    for (let m = 0; m < 7; m++) {
      const ms   = s._blobSeed + m * 83.7;
      const mDir = m % 2 === 0 ? 1 : -1;
      const mAng = frostJ2(ms) * Math.PI * 2 + mistT * mDir * (0.45 + m * 0.12);
      const mD   = s.radius * (0.10 + frostJ(ms * 1.3) * 0.57);
      const mx2  = s.x + Math.cos(mAng) * mD;
      const my2  = s.y + Math.sin(mAng) * mD;
      const mr   = s.radius * (0.26 + frostJ(ms * 2.1) * 0.24);
      const pulse= 0.5 + 0.5 * Math.sin(now2 * 0.0011 + ms);
      const mA   = (0.055 + pulse * 0.085) * lifeR;
      const mg2  = ctx.createRadialGradient(mx2, my2, 0, mx2, my2, mr);
      mg2.addColorStop(0,   `${m % 2 === 0 ? v.mist2 : v.mist1}${mA})`);
      mg2.addColorStop(0.5, `${v.mist1}${mA * 0.38})`);
      mg2.addColorStop(1,   `${v.mist1}0)`);
      ctx.fillStyle = mg2;
      ctx.beginPath(); ctx.arc(mx2, my2, mr, 0, Math.PI * 2); ctx.fill();
    }
    for (let cm = 0; cm < 4; cm++) {
      const cmp  = now2 * 0.00055 + cm * 1.57;
      const cmX  = s.x + Math.cos(cmp * 0.38 + cm) * s.radius * 0.18;
      const cmY  = s.y + Math.sin(cmp * 0.29 + cm) * s.radius * 0.18;
      const cmR  = s.radius * (0.22 + cm * 0.07);
      const cmG  = ctx.createRadialGradient(cmX, cmY, 0, cmX, cmY, cmR);
      const cmA  = (0.09 + 0.06 * Math.sin(cmp)) * lifeR;
      cmG.addColorStop(0, `${v.mist2}${cmA})`);
      cmG.addColorStop(1, `${v.mist2}0)`);
      ctx.fillStyle = cmG;
      ctx.beginPath(); ctx.arc(cmX, cmY, cmR, 0, Math.PI * 2); ctx.fill();
    }

    // ══════════════════════════════════════════════════════════════════
    // LAYER 3 ▸ SPIRAL VORTEX ARMS (BATCHED)
    // ══════════════════════════════════════════════════════════════════
    ctx.save();
    ctx.lineCap = 'round';
    ctx.shadowBlur = 14 * sigilGlowScale; ctx.shadowColor = v.glow2;
    
    ctx.globalAlpha = 0.30 * lifeR;
    ctx.strokeStyle = `${v.vortex}0.75)`;
    ctx.lineWidth = 2.8;
    
    ctx.beginPath(); // BATCH RENDERING: 1 Path for all arms
    for (let arm = 0; arm < v.vortexCount; arm++) {
      const armOff = (arm / v.vortexCount) * Math.PI * 2;
      const armT   = now2 * v.windSpeed * 0.65;
      for (let k = 0; k <= 45; k++) {
        const t   = k / 45;
        const sAng= armOff + armT + t * Math.PI * 1.7;
        const sR  = s.radius * (0.06 + t * 0.88);
        const wob = Math.sin(now2 * 0.0008 + arm * 1.4 + t * 5.5) * s.radius * 0.042;
        const px4 = s.x + Math.cos(sAng) * (sR + wob);
        const py4 = s.y + Math.sin(sAng) * (sR + wob);
        if (k === 0) ctx.moveTo(px4, py4); else ctx.lineTo(px4, py4);
      }
    }
    ctx.stroke(); // 1 Stroke

    // Classic wind arcs
    ctx.globalAlpha = 0.42 * lifeR;
    ctx.strokeStyle = v.wind;
    ctx.lineWidth = 2.6;
    
    ctx.beginPath(); // BATCH RENDERING: 1 Path for all wind arcs
    for (let w = 0; w < v.windCount; w++) {
      const wS  = s._blobSeed + w * 91.3;
      const wT  = now2 * v.windSpeed * (1 + w * 0.22);
      const rA  = s.radius * (0.22 + w * 0.15);
      const a0  = wT + frostJ(wS) * Math.PI * 2;
      const a1  = a0 + Math.PI * 0.62 + Math.sin(now2 * 0.0007 + wS) * 0.38;
      const wx0 = s.x + Math.cos(a0) * rA, wy0 = s.y + Math.sin(a0) * rA;
      const wx1 = s.x + Math.cos(a1) * rA, wy1 = s.y + Math.sin(a1) * rA;
      const wmA = (a0 + a1) / 2;
      const wmR = rA * (1 + Math.sin(now2 * 0.0012 + wS) * 0.24);
      const wmX = s.x + Math.cos(wmA) * wmR, wmY = s.y + Math.sin(wmA) * wmR;
      ctx.moveTo(wx0, wy0); ctx.quadraticCurveTo(wmX, wmY, wx1, wy1); 
    }
    ctx.stroke(); // 1 Stroke
    ctx.restore();

    // ══════════════════════════════════════════════════════════════════
    // LAYER 4 ▸ GLACIER FORMATIONS
    // ══════════════════════════════════════════════════════════════════
    ctx.save();
    ctx.shadowBlur = 16 * sigilGlowScale; ctx.shadowColor = v.glow;
    for (const g of s._glaciers) {
      const gRot = g.angle + now2 * v.windSpeed * 0.12;
      const gx   = s.x + Math.cos(gRot) * s.radius * g.dist;
      const gy   = s.y + Math.sin(gRot) * s.radius * g.dist;
      const gr   = s.radius * g.scale;
      const pulse= 0.88 + 0.12 * Math.sin(now2 * 0.0014 + g.angle * 2.7);
      
      ctx.save();
      ctx.translate(gx, gy);
      ctx.rotate(g.rot + now2 * v.coreRotSpeed * 0.28);
      ctx.scale(pulse, pulse);
      
      ctx.beginPath();
      for (let p = 0; p < g.sides; p++) {
        const pS   = s._glacierSeed + g.angle * 97 + p * 7.3;
        const pAng = (p / g.sides) * Math.PI * 2 + (frostJ(pS) - 0.5) * 0.52;
        const pR   = gr * (0.65 + frostJ(pS * 1.7) * 0.65);
        if (p === 0) ctx.moveTo(Math.cos(pAng) * pR, Math.sin(pAng) * pR);
        else         ctx.lineTo(Math.cos(pAng) * pR, Math.sin(pAng) * pR);
      }
      ctx.closePath();
      
      const gAlpha = (0.22 + frostJ(g.angle * 37) * 0.22) * lifeR;
      ctx.fillStyle = `${v.glacierFill}${gAlpha})`;
      ctx.shadowBlur = 16 * sigilGlowScale; // Shadow on fill ONLY
      ctx.fill();
      
      ctx.shadowBlur = 0; // FIX: Alisin ang shadow ng stroke para di mabigat
      ctx.globalAlpha = 0.55 * lifeR;
      ctx.strokeStyle = v.glacierStroke;
      ctx.lineWidth = 1.3;
      ctx.stroke();
      
      ctx.globalAlpha = 0.28 * lifeR;
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-gr * 0.28, -gr * 0.42); ctx.lineTo( gr * 0.18,  gr * 0.28);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    // ══════════════════════════════════════════════════════════════════
    // LAYER 5 ▸ JAGGED ICY BOUNDARY WALL
    // ══════════════════════════════════════════════════════════════════
    ctx.save();
    ctx.shadowBlur = 16 * sigilGlowScale; ctx.shadowColor = v.glow;
    ctx.globalAlpha = Math.min(0.90, s.life) * lifeR;
    
    ctx.strokeStyle = `${v.vortex}0.22)`; ctx.lineWidth = 12;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2); ctx.stroke();
    
    ctx.strokeStyle = `${v.vortex}0.40)`; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2); ctx.stroke();
    
    ctx.strokeStyle = v.border; ctx.lineWidth = 2.4;
    ctx.beginPath();
    const rimSeg = 64;
    for (let i = 0; i <= rimSeg; i++) {
      const ang  = (i / rimSeg) * Math.PI * 2;
      const jit  = (frostJ(s._coreSeed + i * 7.7) - 0.5) * s.radius * 0.055;
      const spk  = frostJ(s._coreSeed + i * 13.1) > 0.80 ? s.radius * 0.044 : 0;
      const rip  = Math.sin(now2 * 0.0014 + i * 1.35) * 2.5;
      const rr   = s.radius + jit + spk + rip;
      const px5  = s.x + Math.cos(ang) * rr, py5 = s.y + Math.sin(ang) * rr;
      if (i === 0) ctx.moveTo(px5, py5); else ctx.lineTo(px5, py5);
    }
    ctx.stroke();

    // Ice spike accents (BATCHED)
    ctx.shadowBlur = 0; // Di kailangan ng intense shadow ang maliit na spikes
    ctx.fillStyle = v.border;
    ctx.globalAlpha = 0.65 * lifeR;
    ctx.beginPath(); 
    for (let i = 0; i < 22; i++) {
      const sAng = (i / 22) * Math.PI * 2 + now2 * v.windSpeed * 0.04;
      const sH   = s.radius * (0.038 + frostJ(s._coreSeed + i * 23.1) * 0.055);
      const sW   = s.radius * 0.016;
      const bx5  = s.x + Math.cos(sAng) * s.radius;
      const by5  = s.y + Math.sin(sAng) * s.radius;
      ctx.moveTo(bx5 + Math.cos(sAng + Math.PI / 2) * sW, by5 + Math.sin(sAng + Math.PI / 2) * sW);
      ctx.lineTo(bx5 + Math.cos(sAng) * sH,               by5 + Math.sin(sAng) * sH);
      ctx.lineTo(bx5 + Math.cos(sAng - Math.PI / 2) * sW, by5 + Math.sin(sAng - Math.PI / 2) * sW);
    }
    ctx.fill(); // 1 Fill
    ctx.restore();

    // ══════════════════════════════════════════════════════════════════
    // LAYER 6 ▸ DENSE BLIZZARD SNOW STREAKS
    // ══════════════════════════════════════════════════════════════════
    ctx.save();
    ctx.shadowBlur = 5 * sigilGlowScale; ctx.shadowColor = v.shardGlow;
    ctx.strokeStyle = v.shardColor;
    ctx.lineCap = 'round';
    for (let i = 0; i < v.shardCount; i++) {
      const p   = s._particles[i % 40];
      const t   = now2 * p.speed * 2.0 + p.phase;
      const swrl= t * 0.65 + p.sway;
      const d   = s.radius * (p.dist * 0.88 + 0.07 * Math.sin(t * 1.4));
      const ang  = p.angle + swrl + Math.sin(t * 0.75) * 0.42;
      const px6 = s.x + Math.cos(ang) * d;
      const py6 = s.y + Math.sin(ang) * d;
      const len = 3.5 + p.size * 2.8;
      const dAng= ang + Math.PI * 0.38 + Math.sin(t * 2.1) * 0.48;
      ctx.globalAlpha = (0.32 + Math.abs(Math.sin(t * 1.8 + p.phase)) * 0.40) * lifeR;
      ctx.lineWidth = 0.65 + p.size * 0.38;
      ctx.beginPath();
      ctx.moveTo(px6, py6);
      ctx.lineTo(px6 + Math.cos(dAng) * len, py6 + Math.sin(dAng) * len);
      ctx.stroke();
    }
    ctx.restore();

    // ══════════════════════════════════════════════════════════════════
    // LAYER 7 ▸ PROPER 6-POINTED SNOWFLAKES (MASSIVE FPS FIX)
    // ══════════════════════════════════════════════════════════════════
    ctx.save();
    ctx.shadowBlur = 9 * sigilGlowScale; ctx.shadowColor = v.shardGlow;
    ctx.strokeStyle = 'rgba(215,240,255,0.92)';
    ctx.lineCap = 'round';
    
    for (let i = 0; i < v.flakeCount; i++) {
      const p    = s._particles[(i * 3 + 5) % 40];
      const t    = now2 * p.speed * 0.75 + p.phase;
      const fd   = s.radius * (0.08 + p.dist * 0.87);
      const fAng = p.angle + t * (isFam ? 0.48 : -0.48) + Math.sin(t * 0.52) * 0.35;
      const fx3  = s.x + Math.cos(fAng) * fd;
      const fy3  = s.y + Math.sin(fAng) * fd;
      const fsz  = 2.8 + p.size * 2.2;
      const fRot = t * 0.72;
      
      ctx.globalAlpha = (0.48 + 0.30 * Math.sin(t * 2.5)) * lifeR;
      ctx.lineWidth = 0.85 + p.size * 0.18;
      
      ctx.beginPath(); // FIX: Isang path para sa LAHAT ng linya ng isang snowflake
      for (let arm = 0; arm < 6; arm++) {
        const aRot = fRot + (arm / 6) * Math.PI * 2;
        const ax2  = fx3 + Math.cos(aRot) * fsz;
        const ay2  = fy3 + Math.sin(aRot) * fsz;
        ctx.moveTo(fx3, fy3); ctx.lineTo(ax2, ay2); 
        
        const brL = fsz * 0.40;
        const bM  = 0.52;
        const bmx = fx3 + Math.cos(aRot) * fsz * bM;
        const bmy = fy3 + Math.sin(aRot) * fsz * bM;
        for (const bDir of [1, -1]) {
          const bAng3 = aRot + bDir * (Math.PI / 3);
          ctx.moveTo(bmx, bmy);
          ctx.lineTo(bmx + Math.cos(bAng3) * brL, bmy + Math.sin(bAng3) * brL);
        }
      }
      ctx.stroke(); // 1 Stroke per snowflake (imbes na 18!)
      
      // Centre dot
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath(); ctx.arc(fx3, fy3, 0.9, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // ══════════════════════════════════════════════════════════════════
    // LAYER 8 ▸ FROST SPARKS & COLD MOTES
    // ══════════════════════════════════════════════════════════════════
    ctx.save();
    ctx.shadowBlur = 11 * sigilGlowScale; ctx.shadowColor = v.glow2;
    for (let i = 0; i < v.sparkCount + 5; i++) {
      const p   = s._particles[(i * 4 + 2) % 40];
      const t   = now2 * p.speed * 1.3 + p.phase * 1.5;
      const dd  = s.radius * (0.04 + p.dist * 0.92);
      const da  = p.angle + t * (i % 2 === 0 ? 1 : -1.35);
      const dx2 = s.x + Math.cos(da) * dd;
      const dy2 = s.y + Math.sin(da) * dd;
      const flk = 0.35 + 0.60 * Math.abs(Math.sin(t * 3.2 + i));
      ctx.globalAlpha = flk * 0.80 * lifeR;
      
      if (i % 3 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.97)';
        ctx.beginPath(); ctx.arc(dx2, dy2, 0.7 + p.size * 0.5, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = `${v.mist2}0.85)`;
        ctx.beginPath(); ctx.arc(dx2, dy2, 1.1 + p.size * 0.65, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();

    // ══════════════════════════════════════════════════════════════════
    // LAYER 9 ▸ FROST CORE 
    // ══════════════════════════════════════════════════════════════════
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(now2 * v.coreRotSpeed);

    const haloR  = s.radius * 0.38;
    const haloG  = ctx.createRadialGradient(0, 0, s.radius * 0.04, 0, 0, haloR);
    haloG.addColorStop(0,   `${v.mist2}${0.18 * lifeR})`);
    haloG.addColorStop(0.5, `${v.cloud}${0.08 * lifeR})`);
    haloG.addColorStop(1,   `${v.edge}0)`);
    ctx.fillStyle = haloG;
    ctx.beginPath(); ctx.arc(0, 0, haloR, 0, Math.PI * 2); ctx.fill();

    const coreR  = s.radius * 0.23;
    const coreG2 = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR);
    coreG2.addColorStop(0,   v.coreGlowIn);
    coreG2.addColorStop(0.38,`${v.mist2}0.65)`);
    coreG2.addColorStop(1,   v.coreGlowOut);
    ctx.fillStyle = coreG2;
    ctx.beginPath(); ctx.arc(0, 0, coreR, 0, Math.PI * 2); ctx.fill();

    // Primary asymmetric spikes (BATCHED)
    ctx.fillStyle   = v.coreColor;
    ctx.strokeStyle = v.coreColor;
    ctx.shadowBlur  = 22; ctx.shadowColor = v.glow;
    const spkCnt = 7;
    
    ctx.beginPath();
    for (let i = 0; i < spkCnt; i++) {
      const seed = s._coreSeed + i * 13.7;
      const ang  = (i / spkCnt) * Math.PI * 2 + (frostJ(seed) - 0.5) * 0.5;
      const len  = s.radius * (0.54 + frostJ(seed * 1.9) * 0.32);
      const wid  = 1.6 + frostJ(seed * 2.3) * 1.7;
      const tipX = Math.cos(ang) * len, tipY = Math.sin(ang) * len;
      const b1x  = Math.cos(ang + Math.PI / 2) * wid, b1y = Math.sin(ang + Math.PI / 2) * wid;
      const b2x  = Math.cos(ang - Math.PI / 2) * wid, b2y = Math.sin(ang - Math.PI / 2) * wid;
      const mLen = len * (0.42 + frostJ(seed * 3.1) * 0.18);
      const mX   = Math.cos(ang) * mLen, mY = Math.sin(ang) * mLen;
      ctx.moveTo(b1x, b1y); ctx.lineTo(mX, mY); ctx.lineTo(tipX, tipY);
      ctx.lineTo(mX, mY);   ctx.lineTo(b2x, b2y); 
    }
    ctx.fill(); // 1 Fill
    
    ctx.shadowBlur = 0; // Turn off shadow for sub-branches to prevent glowing lines overlap
    ctx.beginPath();
    ctx.lineWidth = 1.3;
    for (let i = 0; i < spkCnt; i++) {
      const seed = s._coreSeed + i * 13.7;
      const ang  = (i / spkCnt) * Math.PI * 2 + (frostJ(seed) - 0.5) * 0.5;
      const len  = s.radius * (0.54 + frostJ(seed * 1.9) * 0.32);
      const mLen = len * (0.42 + frostJ(seed * 3.1) * 0.18);
      const mX   = Math.cos(ang) * mLen, mY = Math.sin(ang) * mLen;
      if (frostJ(seed * 4.7) > 0.33) {
        const subA  = ang + (frostJ(seed * 5.3) - 0.5) * 1.3;
        const subL  = len * 0.37;
        ctx.moveTo(mX, mY);
        ctx.lineTo(mX + Math.cos(subA) * subL, mY + Math.sin(subA) * subL); 
        if (frostJ(seed * 6.1) > 0.48) {
          const subA2 = ang - (frostJ(seed * 7.3) - 0.5) * 1.3;
          ctx.moveTo(mX * 0.65, mY * 0.65);
          ctx.lineTo(mX * 0.65 + Math.cos(subA2) * subL * 0.65, mY * 0.65 + Math.sin(subA2) * subL * 0.65);
        }
      }
    }
    ctx.stroke(); // 1 Stroke

    // Counter-rotating secondary ring spikes (BATCHED)
    ctx.shadowBlur = 12; ctx.shadowColor = v.glow2;
    ctx.globalAlpha = 0.58 * lifeR;
    const revRot = -now2 * v.coreRotSpeed * 1.6;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const ang2 = (i / 6) * Math.PI * 2 + Math.PI / 6 + revRot;
      const len2 = s.radius * 0.24;
      ctx.moveTo(Math.cos(ang2) * s.radius * 0.06, Math.sin(ang2) * s.radius * 0.06);
      ctx.lineTo(Math.cos(ang2) * len2, Math.sin(ang2) * len2);
    }
    ctx.stroke();
    ctx.restore(); // Restores from translate/rotate

    // ══════════════════════════════════════════════════════════════════
    // LAYER 10 ▸ FROST CRACKLE 
    // ══════════════════════════════════════════════════════════════════
    ctx.save();
    if (Math.random() < v.crackleChance) {
      const nCracks = 1 + Math.floor(Math.random() * 3);
      for (let c = 0; c < nCracks; c++) {
        ctx.strokeStyle = 'rgba(224,242,254,0.92)';
        ctx.lineWidth   = 1.1 + Math.random() * 1.1;
        ctx.shadowBlur  = 16; ctx.shadowColor = v.glow;
        
        let clx = s.x, cly = s.y, clAng = Math.random() * Math.PI * 2; // FIX: translate isn't active here, must use s.x/s.y
        ctx.beginPath(); ctx.moveTo(clx, cly);
        const cSeg = 4 + Math.floor(Math.random() * 4);
        for (let k = 0; k < cSeg; k++) {
          clAng += (Math.random() - 0.5) * 1.9;
          clx   += Math.cos(clAng) * (s.radius * 0.13 + Math.random() * s.radius * 0.07);
          cly   += Math.sin(clAng) * (s.radius * 0.13 + Math.random() * s.radius * 0.07);
          ctx.lineTo(clx, cly);
        }
        ctx.stroke();
        
        ctx.shadowBlur = 0; // Turn off shadow for the echo
        ctx.globalAlpha = 0.28;
        ctx.lineWidth   = 4;
        ctx.stroke();
      }
    }
    ctx.restore();

    ctx.restore(); // Main save restore
  }
}

// =========================================================================
  // ⚡ OPTIMIZED AAA MYTHIC RENDERER (NO LAG, BALANCED COLORS)
  // =========================================================================
  const pTime = performance.now(); // 🚀 Kukunin lang ang oras nang isang beses para iwas CPU lag

  for (const b of eng.bullets) {
    if (b.type === 'fire_orb') {
      ctx.save();
      ctx.translate(b.x, b.y);
      // Fake Glow na magaan sa memory
      ctx.fillStyle = 'rgba(234, 88, 12, 0.4)'; 
      ctx.beginPath(); ctx.arc(0, 0, b.r * 2.5, 0, Math.PI * 2); ctx.fill();
      // Core shape
      ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
      ctx.beginPath(); ctx.arc(-5, Math.sin(pTime * 0.02) * 3, b.r * 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath(); ctx.arc(0, 0, b.r * 0.8, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      continue;
    }

    ctx.save();
    
    if (b.isEnemy) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.4)'; // Red fake glow
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
    } else if (b.isFamiliar) {
      ctx.fillStyle = b.color ? b.color.replace('rgb', 'rgba').replace(')', ', 0.4)') : 'rgba(255,255,255,0.4)';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
    } else {
      // 🌟 PLAYER SKIN LOGIC (OPTIMIZED)
      const skin = b.p2 ? (eng.p2?.skin || 'default') : (eng.p?.skin || 'default');
      const br = b.r;
      const angle = Math.atan2(b.vy, b.vx);
      
      ctx.translate(b.x, b.y);
      ctx.rotate(angle);

      // --- MGA SKINS ---
if (skin === 'shadow') {
        // 🌑 SHADOW: Black Red Distorted Design
        const wave1 = Math.sin(pTime * 0.04) * (br * 0.5);
        const wave2 = Math.cos(pTime * 0.06) * (br * 0.5);

        // Unstable Ethereal Crimson Aura (pumipintig at nade-deform)
        ctx.fillStyle = 'rgba(239, 68, 68, 0.25)'; 
        ctx.beginPath(); 
        ctx.ellipse(0, 0, br * 2.5 + wave1, br * 2 - wave1, pTime * 0.01, 0, Math.PI * 2); 
        ctx.fill();

        // Deep Blood Red Inner Glow
        ctx.fillStyle = 'rgba(153, 27, 27, 0.6)'; 
        ctx.beginPath(); 
        ctx.arc(0, 0, br * 1.5, 0, Math.PI * 2); 
        ctx.fill();

        // Distorted Pitch Black Void Tear (nag-iiba ang hugis habang lumilipad)
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.moveTo(br * 1.5 + wave2, 0); // Umiikot at nayuyuping dulo
        ctx.quadraticCurveTo(br * 0.5, br * 1.5 + wave1, -br * 2, br * 0.5 + wave2);
        ctx.lineTo(-br * 1.2, 0);
        ctx.lineTo(-br * 2, -br * 0.5 - wave1);
        ctx.quadraticCurveTo(br * 0.5, -br * 1.5 - wave2, br * 1.5 + wave2, 0);
        ctx.fill();

        // Piercing Red Singularity (Center)
        ctx.fillStyle = '#ef4444';
        ctx.beginPath(); 
        ctx.arc(wave2 * 0.5, wave1 * 0.5, br * 0.5, 0, Math.PI * 2); 
        ctx.fill();

        // Chaotic Trailing Dark Lightning/Tendrils
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-br * 2.5, br + wave1); ctx.lineTo(-br * 4, wave2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-br * 2.5, -br + wave2); ctx.lineTo(-br * 4, -wave1); ctx.stroke();
      } else if (skin === 'igris') {
        ctx.fillStyle = 'rgba(185, 28, 28, 0.3)'; // Crimson aura
        ctx.beginPath(); ctx.arc(0, 0, br * 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#7f1d1d';
        ctx.beginPath(); ctx.moveTo(br * 3.5, 0); ctx.lineTo(-br * 1.5, br * 1.2); ctx.lineTo(-br * 0.5, 0); ctx.lineTo(-br * 1.5, -br * 1.2); ctx.fill();
        ctx.fillStyle = '#ef4444'; 
        ctx.beginPath(); ctx.arc(0, 0, br * 0.8, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(br * 2, 0); ctx.lineTo(-br * 1.5, Math.sin(pTime * 0.05) * br * 2); ctx.stroke();

      } else if (skin === 'pyro') {
        ctx.fillStyle = 'rgba(234, 88, 12, 0.3)'; // Orange aura
        ctx.beginPath(); ctx.arc(0, 0, br * 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ea580c'; ctx.beginPath(); ctx.arc(0, 0, br + 1, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(0, 0, br * 0.6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
        ctx.beginPath(); ctx.moveTo(br, 0); ctx.quadraticCurveTo(-br, br * 2.5, -br * 3.5, Math.sin(pTime * 0.03) * br * 1.2); ctx.quadraticCurveTo(-br, -br * 2.5, br, 0); ctx.fill();

      } else if (skin === 'archmage') {
        ctx.fillStyle = 'rgba(6, 182, 212, 0.3)'; // Cyan aura
        ctx.beginPath(); ctx.arc(0, 0, br * 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#cffafe'; ctx.beginPath(); ctx.arc(0, 0, br, 0, Math.PI * 2); ctx.fill();
        ctx.rotate(pTime * 0.01);
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.arc(0, 0, br * 2.2, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]); ctx.rotate(-pTime * 0.01);
        ctx.fillStyle = 'rgba(96, 165, 250, 0.6)';
        ctx.beginPath(); ctx.ellipse(-br*2, Math.sin(pTime*0.02)*br, br*1.5, br*0.4, 0, 0, Math.PI*2); ctx.fill();

      } else if (skin === 'sakura') {
        ctx.fillStyle = 'rgba(244, 114, 182, 0.25)'; // Pink aura
        ctx.beginPath(); ctx.arc(0, 0, br * 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.rotate(pTime * 0.005);
        ctx.fillStyle = '#fbcfe8';
        for(let i = 0; i < 4; i++) { // Optimized to 4 petals
          ctx.rotate((Math.PI * 2) / 4);
          ctx.beginPath(); ctx.ellipse(br, 0, br * 1.5, br * 0.7, 0, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, br * 0.6, 0, Math.PI * 2); ctx.fill();

      } else if (skin === 'pink_wings') {
        ctx.fillStyle = 'rgba(244, 63, 94, 0.25)';
        ctx.beginPath(); ctx.arc(0, 0, br * 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffe4e6';
        ctx.beginPath(); ctx.moveTo(br * 1.5, 0); ctx.bezierCurveTo(0, br*2, -br*1.8, br*2, -br*0.5, 0); ctx.bezierCurveTo(-br*1.8, -br*2, 0, -br*2, br * 1.5, 0); ctx.fill();
        ctx.fillStyle = 'rgba(253, 164, 175, 0.85)';
        ctx.beginPath(); ctx.ellipse(-br*2.5, Math.sin(pTime*0.02)*br*1.5, br*0.8, br*0.4, -Math.PI/6, 0, Math.PI*2); ctx.fill();

      } else if (skin === 'remembrance') {
        ctx.fillStyle = 'rgba(253, 224, 71, 0.25)';
        ctx.beginPath(); ctx.arc(0, 0, br * 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, br, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(0, 0, br*2.5, br, pTime*0.008, 0, Math.PI*2); ctx.stroke();
        ctx.fillStyle = '#bfdbfe';
        ctx.beginPath(); ctx.arc(-br * 2.5, Math.sin(pTime*0.03)*br, br * 0.6, 0, Math.PI * 2); ctx.fill(); 

      } else if (skin === 'emperor') {
        ctx.fillStyle = 'rgba(185, 28, 28, 0.25)';
        ctx.beginPath(); ctx.arc(0, 0, br * 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000000'; ctx.beginPath(); ctx.arc(0, 0, br + 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(0, 0, br - 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2; 
        ctx.beginPath(); ctx.ellipse(0, 0, br*2.2, br*1.2, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.beginPath(); ctx.moveTo(br, 0); ctx.lineTo(-br*3, br*1.5); ctx.lineTo(-br*1.5, 0); ctx.lineTo(-br*3, -br*1.5); ctx.fill();

      } else if (skin === 'empress') {
        // 🌸 EMPRESS: Divine Ninja Dagger (Kunai) with Swirling Petals
        const wave1 = Math.sin(pTime * 0.03) * br * 0.5;

        // Divine Pink Ethereal Glow
        ctx.fillStyle = 'rgba(251, 113, 133, 0.2)'; 
        ctx.beginPath(); ctx.ellipse(0, 0, br * 3.5, br * 2, 0, 0, Math.PI * 2); ctx.fill();

        // ================================
        // 🗡️ NINJA DAGGER (KUNAI) DESIGN
        // ================================
        // 1. Kunai Ring (Pommel sa likod)
        ctx.strokeStyle = '#fda4af'; 
        ctx.lineWidth = br * 0.4;
        ctx.beginPath(); ctx.arc(-br * 2.5, 0, br * 0.5, 0, Math.PI * 2); ctx.stroke();

        // 2. Wrapped Handle (Hawakan)
        ctx.fillStyle = '#e11d48';
        ctx.beginPath(); ctx.moveTo(-br * 2, br * 0.3); ctx.lineTo(-br, br * 0.3); ctx.lineTo(-br, -br * 0.3); ctx.lineTo(-br * 2, -br * 0.3); ctx.fill();

        // 3. Handguard (Tsuba) - Hugis manipis na petal
        ctx.fillStyle = '#fb7185';
        ctx.beginPath(); ctx.ellipse(-br, 0, br * 0.4, br * 1.5, 0, 0, Math.PI * 2); ctx.fill();

        // 4. Main Blade (Matulis na Leaf/Diamond shape)
        ctx.fillStyle = '#ffffff'; // Radiant white steel
        ctx.beginPath();
        ctx.moveTo(br * 3.5, 0); // Matulis na dulo (Tip)
        ctx.quadraticCurveTo(br, br * 0.8, -br, br * 1.2); // Top curve ng blade
        ctx.lineTo(-br, -br * 1.2); // Base ng blade
        ctx.quadraticCurveTo(br, -br * 0.8, br * 3.5, 0); // Bottom curve ng blade
        ctx.fill();

        // 5. Blade Inner Ridge / Blood Groove
        ctx.fillStyle = '#ffe4e6';
        ctx.beginPath(); ctx.moveTo(br * 3, 0); ctx.lineTo(-br * 0.5, br * 0.3); ctx.lineTo(-br * 0.5, -br * 0.3); ctx.fill();

        // ================================
        // 🌪️ SWIRLING RADIANT PETALS
        // ================================
        for (let i = 0; i < 3; i++) {
          const angleOffset = (Math.PI * 2 / 3) * i;
          
          // Orbiting path sa paligid ng dagger
          const pX = Math.cos(pTime * 0.01 + angleOffset) * br * 2.5;
          const pY = Math.sin(pTime * 0.015 + angleOffset) * br * 2 + wave1;
          const petalRot = pTime * 0.02 + i; // Iba't ibang rotation per petal

          ctx.save();
          ctx.translate(pX, pY);
          ctx.rotate(petalRot);
          
          // Literal na hugis Sakura Petal na may hiwa (cleft)
          ctx.fillStyle = i % 2 === 0 ? '#fb7185' : '#fda4af';
          ctx.beginPath();
          ctx.moveTo(br * 0.8, 0); // Tip ng petal
          ctx.quadraticCurveTo(br * 0.4, br * 0.8, -br * 0.5, br * 0.4);
          ctx.lineTo(-br * 0.2, 0); // Hiwa sa likod (Cleft)
          ctx.lineTo(-br * 0.5, -br * 0.4);
          ctx.quadraticCurveTo(br * 0.4, -br * 0.8, br * 0.8, 0);
          ctx.fill();
          
          ctx.restore();
        }

        // Falling trailing micro-petals sa pinakalikod
        ctx.fillStyle = '#ffe4e6';
        ctx.beginPath(); ctx.arc(-br * 3.5, Math.sin(pTime * 0.02) * br * 1.5, br * 0.4, 0, Math.PI * 2); ctx.fill();

      } else if (skin === 'infernal') {
        ctx.fillStyle = 'rgba(217, 70, 239, 0.25)';
        ctx.beginPath(); ctx.arc(0, 0, br * 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#9f1239'; ctx.beginPath(); ctx.arc(0, 0, br + 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fdf4ff'; ctx.beginPath(); ctx.arc(0, 0, br - 1, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#c026d3'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(br, 0); ctx.quadraticCurveTo(-br, br * 3, -br * 3.5, Math.sin(pTime*0.06)*br*1.5); ctx.quadraticCurveTo(-br, -br * 3, br, 0); ctx.stroke();

      } else if (skin === 'leviathan') {
        // 🌊 LEVIATHAN: Badass Water Dragon / Sea Serpent Head
        const wave1 = Math.sin(pTime * 0.05) * (br * 0.5);
        const wave2 = Math.cos(pTime * 0.04) * (br * 0.4);

        // Sacred Tide Ethereal Glow
        ctx.fillStyle = 'rgba(56, 189, 248, 0.2)'; 
        ctx.beginPath(); ctx.ellipse(0, 0, br * 3.5, br * 2 + wave1, 0, 0, Math.PI * 2); ctx.fill();

        // Deep Ocean Blue Dragon Silhouette (Matulis na ulo at crest)
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.moveTo(br * 3.5, 0); // Matulis na nguso (Snout)
        ctx.quadraticCurveTo(br * 1.5, -br * 1.5, -br * 1.5, -br * 2.5 - wave1); // Upper crest/sungay
        ctx.lineTo(-br * 1.2, -br); // Leeg
        ctx.lineTo(-br * 3, 0); // Buntot / Likod ng ulo
        ctx.lineTo(-br * 1.2, br); // Leeg ibaba
        ctx.lineTo(-br * 1.5, br * 2.5 + wave2); // Lower jaw / fins
        ctx.quadraticCurveTo(br * 1.5, br * 1.5, br * 3.5, 0);
        ctx.fill();

        // Inner Rushing Water Current (Bright Cyan na dumadaloy sa loob)
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(br * 2.2, 0);
        ctx.quadraticCurveTo(br * 0.5, -br * 0.8, -br, -br - wave1 * 0.5);
        ctx.lineTo(-br * 1.8, 0);
        ctx.lineTo(-br, br + wave2 * 0.5);
        ctx.quadraticCurveTo(br * 0.5, br * 0.8, br * 2.2, 0);
        ctx.fill();

        // Fierce Dragon Eye (Matalim na puting mata)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(br * 1.2, -br * 0.4, br * 0.6, br * 0.15, -Math.PI / 8, 0, Math.PI * 2);
        ctx.fill();

        // Orbiting Floating Crystals (Gaya sa lore)
        ctx.fillStyle = '#e0f2fe';
        // Top Crystal
        ctx.beginPath(); ctx.moveTo(-br, -br * 2 + wave1); ctx.lineTo(-br * 0.5, -br * 2.8 + wave1); ctx.lineTo(-br * 1.5, -br * 2.8 + wave1); ctx.fill();
        // Bottom Crystal
        ctx.beginPath(); ctx.moveTo(-br, br * 2 + wave2); ctx.lineTo(-br * 0.5, br * 2.8 + wave2); ctx.lineTo(-br * 1.5, br * 2.8 + wave2); ctx.fill();

        // Trailing Splashing Water Drops
        ctx.fillStyle = 'rgba(224, 242, 254, 0.8)';
        ctx.beginPath(); ctx.arc(-br * 3.5, wave1, br * 0.6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(-br * 4.5, -wave2, br * 0.4, 0, Math.PI * 2); ctx.fill();

      } else if (skin === 'frieren') {
        ctx.fillStyle = 'rgba(96, 165, 250, 0.25)';
        ctx.beginPath(); ctx.arc(0, 0, br * 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#bfdbfe'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(br, 0, br*0.4, br*2.2, 0, 0, Math.PI*2); ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.moveTo(br * 4, 0); ctx.lineTo(-br * 1.5, br * 0.8); ctx.lineTo(-br, 0); ctx.lineTo(-br * 1.5, -br * 0.8); ctx.fill();
        ctx.fillStyle = '#93c5fd';
        ctx.fillRect(-br * 2.5, Math.sin(pTime * 0.02) * br * 1.5, 2, 2);

      } else {
        // UPGRADED BASE
        ctx.fillStyle = b.p2 ? 'rgba(251, 146, 60, 0.25)' : 'rgba(232, 121, 249, 0.25)';
        ctx.beginPath(); ctx.arc(0, 0, br * 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = b.p2 ? '#fed7aa' : '#f5d0fe';
        ctx.beginPath(); ctx.arc(0, 0, br + 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(0, 0, br - 1.5, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
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

      // 🔥 BUFF: HUGE VISUAL UPGRADE FOR ARCANE COLLAPSE
      if (eng.collapses) {
        for (const col of eng.collapses) {
          if (col.radius < 0) continue; // For trailing waves delay
          ctx.save();
          
          // Outer thick ring
          ctx.strokeStyle = `rgba(217, 70, 239, ${Math.max(0, col.life / 3.0)})`;
          ctx.lineWidth = 12;
          ctx.shadowBlur = 35;
          ctx.shadowColor = '#d946ef';
          ctx.beginPath();
          ctx.arc(col.x, col.y, col.radius % col.maxRadius, 0, Math.PI * 2);
          ctx.stroke();
          
          // Inner bright white ring
          ctx.strokeStyle = `rgba(255, 255, 255, ${Math.max(0, col.life / 3.0)})`;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(col.x, col.y, (col.radius * 0.9) % col.maxRadius, 0, Math.PI * 2);
          ctx.stroke();

          // Huge blurred background wave
          ctx.strokeStyle = `rgba(168, 85, 247, ${Math.max(0, col.life / 4.0)})`;
          ctx.lineWidth = 25;
          ctx.beginPath();
          ctx.arc(col.x, col.y, (col.radius * 1.1) % col.maxRadius, 0, Math.PI * 2);
          ctx.stroke();
          
          ctx.restore();
        }
      }

      if (eng.aoeZones) {
          for (const aoe of eng.aoeZones) {
              ctx.save();
              const progress = Math.min(1, Math.max(0, 1 - (aoe.timer / aoe.maxTimer)));
              
              // Outer thick red line
              ctx.strokeStyle = `rgba(239, 68, 68, ${0.4 + progress * 0.5})`;
              ctx.lineWidth = 3;
              ctx.setLineDash([10, 5]);
              ctx.lineDashOffset = -performance.now() * 0.05;
              ctx.beginPath(); ctx.arc(aoe.x, aoe.y, aoe.radius, 0, Math.PI*2); ctx.stroke();
              
              // Inner filling red blood zone
              ctx.fillStyle = `rgba(239, 68, 68, ${0.1 + progress * 0.35})`;
              ctx.beginPath(); ctx.arc(aoe.x, aoe.y, aoe.radius * progress, 0, Math.PI*2); ctx.fill();
              ctx.restore();
          }
      }


      for (const e of eng.enemies) {
        ctx.save();
        ctx.fillStyle = e.flash > 0 ? '#fff' : e.color; 
        ctx.shadowColor = e.flash > 0 ? '#fff' : e.glow;
        ctx.shadowBlur = e.boss ? 22 : 12;

        if (e.type === 'demonKnight') {
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
        } else if (e.type === 'normal') {
    // ==================================================
    // 🧟 NORMAL MINION (ULTRA-OPTIMIZED CACHED SPRITE)
    // ==================================================
    const now = performance.now();
    const isFlash = e.flash > 0;
    
    ctx.save();
    ctx.translate(e.x, e.y);
    
    // 1. I-retain natin ang wriggling motion (Wiggle effect)
    ctx.rotate(Math.sin(now * 0.005 + e.x) * 0.1); 
    
    // 2. FAKE SQUISH: Imbes na i-recompute yung mga dots ng katawan kada frame, 
    // i-sstretch/i-ssquash na lang natin yung naka-cache na picture!
    const squish = Math.sin(now * 0.01 + e.x) * 0.08;
    ctx.scale(1.0 + squish, 1.0 - squish); 
    
    // 3. 💥 DRAW IMAGE: Ito ang nagpapabilis ng rendering dahil isang hardware instruction na lang.
    const spriteToDraw = isFlash ? normalMinionFlashImage : normalMinionImage;
    ctx.drawImage(spriteToDraw, -25, -25); // Ang -25 ay galing sa kalahati ng SPRITE_SIZE (50 / 2) para gitna
    
    ctx.restore();
} else if (e.type === 'fast') {
    // ==================================================
    // 🦇 FAST MINION (ULTRA-OPTIMIZED CACHED SPRITE)
    // ==================================================
    const now = performance.now();
    const isFlash = e.flash > 0;
    
    ctx.save();
    ctx.translate(e.x, e.y);
    
    // 1. Mabilis na spin effect (Naiwan ang motion!)
    ctx.rotate(now * 0.008); 
    
    // 2. Dynamic Scaling: Kino-compute ang tamang size base sa e.r
    // Dahil gumamit tayo ng CACHE_R*6 sa pag-create, ang draw size dapat ay e.r*6
    const drawSize = e.r * 6;
    
    // 3. DRAW IMAGE
    const spriteToDraw = isFlash ? fastFlashImg : fastImg;
    ctx.drawImage(spriteToDraw, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
    
    ctx.restore();

} else if (e.type === 'tank') {
    // ==================================================
    // 🪨 TANK MINION (ULTRA-OPTIMIZED CACHED SPRITE)
    // ==================================================
    const now = performance.now();
    const isFlash = e.flash > 0;
    
    ctx.save();
    ctx.translate(e.x, e.y);
    
    // 1. Mabigat na paglalakad / Stomping motion (Naiwan ang motion!)
    const stomp = Math.abs(Math.sin(now * 0.003)) * (e.r * 0.15);
    ctx.translate(0, -stomp);

    // 2. Dynamic Scaling
    // Dahil gumamit tayo ng CACHE_R*4 sa pag-create, ang draw size dapat ay e.r*4
    const drawSize = e.r * 4;

    // 3. DRAW IMAGE
    const spriteToDraw = isFlash ? tankFlashImg : tankImg;
    ctx.drawImage(spriteToDraw, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
    
    ctx.restore();
} else if (e.type === 'miniBoss') {
    // ==================================================
    // 👁️ GENERIC MINI-BOSS (Eldritch Tentacle Terror)
    // ==================================================
    const now = performance.now();
    const isFlash = e.flash > 0;
    ctx.save();
    ctx.translate(e.x, e.y);

    // 1. Abyssal Glow Aura
    let auraGlow = ctx.createRadialGradient(0, 0, e.r, 0, 0, e.r * 3);
    auraGlow.addColorStop(0, `rgba(217, 119, 6, 0.4)`); // Amber aura
    auraGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = auraGlow;
    ctx.beginPath(); 
    ctx.arc(0, 0, e.r * 3, 0, Math.PI * 2); 
    ctx.fill();

    // 2. 8 Writhing Tentacles (BATCH RENDERING)
    ctx.strokeStyle = isFlash ? '#ffffff' : '#78350f'; 
    ctx.lineCap = 'round';
    ctx.lineWidth = e.r * 0.3; // Ilabas sa loop dahil pare-pareho lang naman ang kapal
    
    ctx.beginPath(); // Isang path lang para sa lahat ng galamay
    for(let i = 0; i < 8; i++) {
        let a = (i / 8) * Math.PI * 2;
        let wave = Math.sin(now * 0.002 + i) * (e.r * 0.8);
        
        ctx.moveTo(0, 0);
        let cp1x = Math.cos(a) * e.r * 1.5 - Math.sin(a) * wave;
        let cp1y = Math.sin(a) * e.r * 1.5 + Math.cos(a) * wave;
        let endX = Math.cos(a) * e.r * 2.5 + Math.sin(a) * wave * 1.5;
        let endY = Math.sin(a) * e.r * 2.5 - Math.cos(a) * wave * 1.5;
        
        ctx.quadraticCurveTo(cp1x, cp1y, endX, endY);
    }
    ctx.stroke(); // Isang draw call na lang imbes na 8!

    // 3. Deformed Fleshy Main Body
    ctx.fillStyle = isFlash ? '#ffffff' : '#b45309';
    ctx.beginPath();
    for(let i = 0; i < 16; i++) {
        let a = (i / 16) * Math.PI * 2;
        let pulse = Math.sin(now * 0.005 + i * 2) * (e.r * 0.15); 
        ctx.lineTo(Math.cos(a) * (e.r * 1.2 + pulse), Math.sin(a) * (e.r * 1.2 + pulse));
    }
    ctx.fill();

    // 4. Asymmetrical Blinking Eyes (BATCH RENDERING)
    // Ilabas ang static array declaration para hindi mabigat sa memory (mas maganda kung sa labas pa ito ng function)
    const eyes = [
        {x: 0, y: 0, size: 0.5},       // Main center eye
        {x: -0.6, y: -0.4, size: 0.25}, // Top left
        {x: 0.6, y: -0.3, size: 0.2},   // Top right
        {x: -0.3, y: 0.6, size: 0.3},   // Bottom left
        {x: 0.5, y: 0.5, size: 0.25}    // Bottom right
    ];

    // Paghiwalayin ang nakadilat at nakapikit para madaling i-batch
    const openEyes = [];
    const closedEyes = [];

    for (let idx = 0; idx < eyes.length; idx++) {
        if (Math.sin(now * 0.001 + idx * 5) > 0.95) {
            closedEyes.push(eyes[idx]);
        } else {
            openEyes.push(eyes[idx]);
        }
    }

    if (openEyes.length > 0) {
        // I-draw lahat ng Sclera (Puti ng mata) ng sabay-sabay
        ctx.fillStyle = isFlash ? '#000000' : '#fef3c7';
        ctx.beginPath();
        for (const eye of openEyes) {
            const ex = eye.x * e.r;
            const ey = eye.y * e.r;
            const eSize = eye.size * e.r;
            ctx.moveTo(ex + eSize, ey); // Para hindi magkonekta ang mga bilog ng linya
            ctx.arc(ex, ey, eSize, 0, Math.PI * 2);
        }
        ctx.fill();

        // I-draw lahat ng Pupil (Itim ng mata) ng sabay-sabay
        ctx.fillStyle = isFlash ? '#ffffff' : '#000000';
        ctx.beginPath();
        for (const eye of openEyes) {
            const ex = eye.x * e.r;
            const ey = eye.y * e.r;
            const pSize = eye.size * e.r * 0.4;
            ctx.moveTo(ex + pSize, ey);
            ctx.arc(ex, ey, pSize, 0, Math.PI * 2);
        }
        ctx.fill();
    }

    if (closedEyes.length > 0) {
        // I-draw lahat ng nakapikit na mata ng sabay-sabay
        ctx.strokeStyle = isFlash ? '#000000' : '#78350f';
        ctx.lineWidth = 2;
        ctx.beginPath(); 
        for (const eye of closedEyes) {
            const ex = eye.x * e.r;
            const ey = eye.y * e.r;
            const eSize = eye.size * e.r;
            ctx.moveTo(ex - eSize, ey); 
            ctx.lineTo(ex + eSize, ey); 
        }
        ctx.stroke();
    }

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
        } else if (e.type === 'abyss' || e.type === 'abyss_awakened' || e.type === 'primordial') {
            const now = performance.now();
            ctx.save();
            
            // Violent shaking/glitch effect pag boss
            let shakeStrength = e.type === 'abyss' ? 5 : (e.type === 'abyss_awakened' ? 3 : 2);
            let shakeX = (Math.random() * shakeStrength * 2 - shakeStrength);
            let shakeY = (Math.random() * shakeStrength * 2 - shakeStrength);
            ctx.translate(e.x + shakeX, e.y + shakeY);

            // ==================================================
            // 🔥 OVERWHELMING BOSS DOMAIN AURA (Massive background glow)
            // ==================================================
            ctx.globalCompositeOperation = 'lighter'; // Makes energies blend and glow intensely
            let auraRadius = e.r * (6 + Math.sin(now / 200)); // Breathing domain
            
            let auraGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, auraRadius);
            if (e.type === 'abyss') {
                auraGrad.addColorStop(0, 'rgba(126, 34, 206, 0.4)'); // Void Purple
                auraGrad.addColorStop(0.5, 'rgba(88, 28, 135, 0.1)');
            } else if (e.type === 'abyss_awakened') {
                auraGrad.addColorStop(0, 'rgba(153, 27, 27, 0.5)'); // Blood Cosmos
                auraGrad.addColorStop(0.5, 'rgba(69, 10, 10, 0.1)');
            } else if (e.type === 'primordial') {
                auraGrad.addColorStop(0, 'rgba(234, 88, 12, 0.5)'); // Hellfire
                auraGrad.addColorStop(0.5, 'rgba(124, 45, 18, 0.1)');
            }
            auraGrad.addColorStop(1, 'transparent');
            
            ctx.fillStyle = auraGrad;
            ctx.beginPath(); ctx.arc(0, 0, auraRadius, 0, Math.PI * 2); ctx.fill();
            ctx.globalCompositeOperation = 'source-over'; // Reset for solid bodies

if (e.type === 'primordial') {
    // ==================================================
    // 🌌 PRIMORDIAL DEMON (King of the Void / World Ender)
    // ==================================================
    const now = performance.now();
    const isFlash = e.flash > 0;
    
    // 1. PROPERTY CACHING: I-save sa local variable
    const r = e.r;

    // --- 1. APOCALYPTIC FAUX GLOW (Fiery Void Aura) ---
    const blurSize = isFlash ? 120 : 200;
    const maxGlowRadius = r * 3.5 + blurSize;
    
    const grad = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, maxGlowRadius);
    
    // BATCHED COLORS: Umiwas tayo sa template string parsing tulad ng `rgba(${glowColor}, 0.9)`
    if (isFlash) {
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.5)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    } else {
        grad.addColorStop(0, 'rgba(220, 20, 60, 0.9)');
        grad.addColorStop(0.35, 'rgba(255, 100, 0, 0.5)');
        grad.addColorStop(1, 'rgba(255, 100, 0, 0)');
    }
    
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, maxGlowRadius, 0, Math.PI * 2);
    ctx.fill();

    // 🛑 I-OFF ANG HARDWARE SHADOW PARA DI MAG-LAG
    ctx.shadowBlur = 0;

    // --- 2. ANCIENT KING'S SEAL (ROTATING TEXT) ---
    ctx.save();
    const sealRot = -now / 2000;
    ctx.rotate(sealRot); // Mabagal na ikot counter-clockwise
    ctx.fillStyle = isFlash ? '#ffffff' : 'rgba(255, 150, 0, 0.8)';
    ctx.font = `bold ${r * 0.6}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const runes = ['ᛞ','ᛟ','ᚢ','ᛗ','ᛚ','ᚲ','ᚷ','ᚹ','ᚺ','ᚾ','ᛒ','ᛖ', '✦', '✧'];
    const textDist = r * 4.2; 
    
    // INVERSE TRANSLATION (Massive FPS boost over save/restore in loop)
    for (let i = 0; i < 14; i++) {
        let a = (i / 14) * Math.PI * 2;
        let cx = Math.cos(a) * textDist;
        let cy = Math.sin(a) * textDist;
        let letterRot = a + Math.PI / 2;

        ctx.translate(cx, cy);
        ctx.rotate(letterRot);
        ctx.fillText(runes[i], 0, 0);
        
        // I-reverse ang transform imbes na tumawag ng ctx.restore()
        ctx.rotate(-letterRot);
        ctx.translate(-cx, -cy);
    }
    
    // Inner spinning magical ring (Clockwise)
    // Tandaan: May sealRot pa tayong nauna, kaya ia-add natin yun pabalik
    ctx.rotate((now / 1000) - sealRot); 
    ctx.strokeStyle = isFlash ? '#ffffff' : 'rgba(220, 20, 60, 0.6)';
    ctx.lineWidth = 3;
    ctx.setLineDash([20, 15, 5, 15]);
    ctx.beginPath();
    ctx.arc(0, 0, r * 3.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // --- 3. FIRE EMBERS LOGIC (BATCH RENDERING) ---
    ctx.fillStyle = isFlash ? '#ffffff' : '#ffaa00';
    ctx.beginPath(); // Isang path para sa lahat ng embers
    for (let i = 0; i < 24; i++) {
        let emberX = Math.cos(now * 0.001 + i) * (r * 2.5 + (i % 3) * r);
        let emberY = r * 3 - ((now * 0.06 + i * 35) % (r * 6));
        let emberSize = Math.max(0.1, 1.5 + Math.sin(now * 0.01 + i) * 1.5);
        
        ctx.moveTo(emberX + emberSize, emberY);
        ctx.arc(emberX, emberY, emberSize, 0, Math.PI * 2);
    }
    ctx.fill(); // Isang tawag lang imbes na 24!

    // --- 4. REALITY SHATTER (BATCH RENDERING) ---
    ctx.strokeStyle = isFlash ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 80, 0, 0.8)';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); // Isang path para sa lahat ng bitak
    
    const crackSway = Math.sin(now * 0.002) * 0.1;
    for (let i = 0; i < 8; i++) {
        let ang = (i * Math.PI / 4) + crackSway;
        let crackLength = r * (7 + Math.random() * 4); 
        let segLen = crackLength / 4;
        
        ctx.moveTo(0, 0);
        let currX = 0, currY = 0;
        for (let j = 0; j < 4; j++) {
            currX += Math.cos(ang) * segLen + (Math.random() * 20 - 10);
            currY += Math.sin(ang) * segLen + (Math.random() * 20 - 10);
            ctx.lineTo(currX, currY);
        }
    }
    ctx.stroke(); // Isang stroke call imbes na 8!

    // --- 5. THE VOID KING'S BODY ---
    ctx.fillStyle = isFlash ? '#ffffff' : '#050005';
    ctx.strokeStyle = isFlash ? '#000000' : '#ff3300';
    ctx.lineWidth = 4;
    
    const bodyStep = Math.PI / 18; // Pre-computed (Math.PI * 2 / 36)
    const bodyRot = now / 200;
    
    ctx.beginPath();
    for (let i = 0; i < 36; i++) {
        let ang = (bodyStep * i) + bodyRot; 
        let pulse = Math.sin(now * 0.01 + i * 2) * 0.15;
        let dist = r * (0.9 + pulse); 
        ctx.lineTo(Math.cos(ang) * dist, Math.sin(ang) * dist);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // --- 6. THE WORLD-ENDER CROWN ---
    let crownY = -r * 1.1 + Math.sin(now * 0.005) * 6; 
    let crownW = r * 1.3;
    
    ctx.fillStyle = isFlash ? '#ffffff' : '#0a0000';
    ctx.strokeStyle = isFlash ? '#000000' : '#ffaa00'; 
    ctx.lineWidth = 2.5;
    
    ctx.beginPath();
    ctx.moveTo(-crownW, crownY);
    ctx.lineTo(-crownW * 1.4, crownY - r * 1.3); 
    ctx.lineTo(-crownW * 0.5, crownY - r * 0.4); 
    ctx.lineTo(0, crownY - r * 1.8);            
    ctx.lineTo(crownW * 0.5, crownY - r * 0.4);  
    ctx.lineTo(crownW * 1.4, crownY - r * 1.3);  
    ctx.lineTo(crownW, crownY);
    ctx.quadraticCurveTo(0, crownY + r * 0.4, -crownW, crownY); 
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Crown Jewel
    ctx.fillStyle = isFlash ? '#000000' : '#ff0000';
    ctx.beginPath();
    ctx.arc(0, crownY - r * 0.6, r * 0.25, 0, Math.PI * 2);
    ctx.fill();

    // --- 7. TERRIFYING OMNIPRESENT EYES (BATCHED) ---
    ctx.fillStyle = isFlash ? '#000000' : '#ffea00'; 
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 40; 
    
    let eyeGlitch = Math.random() > 0.9 ? 5 : 0; 
    
    // Giant Center Eye
    ctx.beginPath(); 
    ctx.ellipse(0, -r * 0.1 + eyeGlitch, r * 0.55, r * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Main Pupil
    ctx.fillStyle = isFlash ? '#ffffff' : '#ff0000';
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.1 + eyeGlitch, r * 0.1, r * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();

    // 4 Smaller Sub-eyes (Biblically Accurate Demon Vibe)
    ctx.fillStyle = isFlash ? '#000000' : '#ffaa00';
    ctx.beginPath(); 
    
    // Top Left
    ctx.ellipse(-r * 0.65, -r * 0.4, r * 0.2, r * 0.08, -Math.PI/5, 0, Math.PI * 2);
    
    // Top Right (Exact moveTo para walang connecting line)
    ctx.moveTo(r * 0.65 + r * 0.2 * Math.cos(Math.PI/5), -r * 0.4 + r * 0.2 * Math.sin(Math.PI/5));
    ctx.ellipse(r * 0.65, -r * 0.4, r * 0.2, r * 0.08, Math.PI/5, 0, Math.PI * 2);
    
    // Bottom Left
    ctx.moveTo(-r * 0.55 + r * 0.15 * Math.cos(Math.PI/5), r * 0.35 + r * 0.15 * Math.sin(Math.PI/5));
    ctx.ellipse(-r * 0.55, r * 0.35, r * 0.15, r * 0.06, Math.PI/5, 0, Math.PI * 2);
    
    // Bottom Right
    ctx.moveTo(r * 0.55 + r * 0.15 * Math.cos(-Math.PI/5), r * 0.35 + r * 0.15 * Math.sin(-Math.PI/5));
    ctx.ellipse(r * 0.55, r * 0.35, r * 0.15, r * 0.06, -Math.PI/5, 0, Math.PI * 2);
    
    ctx.fill(); // Isang fill() call na lang para sa apat na maliliit na mata!

    ctx.shadowBlur = 0; 
} else if (e.type === 'abyss_awakened') {
    // ==================================================
    // 👁️ THE ABYSS AWAKENED (The Sovereign of Annihilation)
    // ==================================================
    
    const hpRatio = (e.hp !== undefined && e.maxHp !== undefined) ? (e.hp / e.maxHp) : 1;
    const isEnraged = hpRatio <= 0.3;
    const isFlash = e.flash > 0;
    
    const enrageMult = isEnraged ? 1.5 : 1;
    const coreR = e.r * 1.5;
    const pi2 = 6.283185307; 
    
    ctx.save();

    // ==================================================
    // 1. GLOBAL MAP AURA & SHOCKWAVES
    // ==================================================
    const auraPulse = Math.sin(now * 0.00125) * 0.1; 
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

    const swTime = (now / (isEnraged ? 400 : 800)) % 1;
    const swRadius = coreR * (5 + swTime * 20);
    ctx.beginPath();
    ctx.arc(0, 0, swRadius, 0, pi2);
    ctx.strokeStyle = `rgba(239, 68, 68, ${0.8 * (1 - swTime)})`;
    ctx.lineWidth = isEnraged ? 15 * (1 - swTime) : 5 * (1 - swTime);
    ctx.stroke();

    // ==================================================
    // 2. ANNIHILATION ARRAY & ASCENDING EMBERS
    // ==================================================
    
    const outerRot = now / 6000;
    ctx.save(); 
    ctx.strokeStyle = isEnraged ? `rgba(239, 68, 68, ${0.3 + Math.abs(auraPulse)})` : `rgba(153, 27, 27, ${0.15 + Math.abs(auraPulse)})`;
    ctx.lineWidth = isEnraged ? 3 : 1;
    ctx.rotate(outerRot); 
    
    ctx.beginPath();
    ctx.arc(0, 0, coreR * 5.5, 0, pi2);
    
    // 🚨 OPTIMIZATION: Pre-computed Hexagram Angles
    // Hindi na gagamit ng Math.cos at Math.sin sa loob ng loop para sa static na shape!
    const hexCos = [1, 0.5, -0.5, -1, -0.5, 0.5];
    const hexSin = [0, 0.866025, 0.866025, 0, -0.866025, -0.866025];
    const hexRad = coreR * 5.5;
    
    for(let i=0; i<6; i++) {
        let i2 = (i + 2) % 6; 
        ctx.moveTo(hexCos[i] * hexRad, hexSin[i] * hexRad);
        ctx.lineTo(hexCos[i2] * hexRad, hexSin[i2] * hexRad);
    }
    ctx.stroke(); 
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = isEnraged ? `rgba(239, 68, 68, ${0.5 + Math.abs(auraPulse)})` : `rgba(153, 27, 27, ${0.3 + Math.abs(auraPulse)})`;
    ctx.lineWidth = 2;
    ctx.rotate(now / -3000); 
    ctx.setLineDash([coreR * 0.8, coreR * 0.4]);
    ctx.beginPath();
    ctx.arc(0, 0, coreR * 4.2, 0, pi2);
    ctx.stroke();
    ctx.restore();

    // 🚨 OPTIMIZATION: Tinanggal ang shadowBlur at pinalitan ang globalAlpha ng RGBA
    ctx.shadowBlur = 0; 
    const numEmbers = isEnraged ? 40 : 20;
    const totalHeight = coreR * 11;
    const emberRGB = isEnraged ? '255, 255, 255' : '239, 68, 68';
    
    for (let i = 0; i < numEmbers; i++) {
        let emberX = (Math.sin(i * 123.45) * coreR * 6); 
        let speed = 1 + (i % 3); 
        let emberY = (coreR * 5) - ((now / (10 * speed) + i * 80) % totalHeight); 
        
        let fade = 1 - (Math.abs(emberY) / (coreR * 5.5));
        if (fade > 0) {
            // Mas mabilis ang string fillStyle kaysa globalAlpha state change
            ctx.fillStyle = `rgba(${emberRGB}, ${fade})`;
            ctx.beginPath();
            // Pinalitan ang Math.random() ng pseudo-random na i%3 para hindi mag-jitter ang size per frame
            ctx.arc(emberX, emberY, isEnraged ? (i % 3) + 1.5 : 1.5, 0, pi2);
            ctx.fill();
        }
    }

    // ==================================================
    // 3. LEVITATION & ENTITY JITTER 
    // ==================================================
    let shakeX = 0, shakeY = 0;
    if (isEnraged) {
        shakeX = (Math.random() - 0.5) * (coreR * 0.25);
        shakeY = (Math.random() - 0.5) * (coreR * 0.25);
    }
    const floatY = Math.sin(now * 0.000833) * (coreR * 0.4) + shakeY; 
    ctx.translate(shakeX, floatY);

    // ==================================================
    // 4. THE ECLIPSE HALO
    // ==================================================
    const haloGlowSz = isEnraged ? 150 : 50;
    const fauxGlowRad = coreR * 3.5 + haloGlowSz;
    
    const haloGlowGrad = ctx.createRadialGradient(0, -coreR * 0.5, coreR * 3.5 - 10, 0, -coreR * 0.5, fauxGlowRad);
    haloGlowGrad.addColorStop(0, 'rgba(220, 38, 38, 1)'); 
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

    // ==================================================
    // 5. AWAKENED CROWN 
    // ==================================================
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

    const dSin = Math.sin(now * 0.002) * 12; 
    const dCos = Math.cos(now * 0.002) * 12;
    
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    for(let i=0; i<4; i++) {
        let gAng = (i * 1.5707963) + crownRot; 
        let cx = Math.cos(gAng) * (coreR * 3.8);
        let cy = Math.sin(gAng) * (coreR * 3.8) - coreR * 0.5; 
        
        ctx.moveTo(cx + dSin, cy - dCos);
        ctx.lineTo(cx + dCos, cy + dSin);
        ctx.lineTo(cx - dSin, cy + dCos);
        ctx.lineTo(cx - dCos, cy - dSin);
    }
    ctx.fill();

    // ==================================================
    // 6. REALITY RIBBONS
    // ==================================================
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

        let cx = cCos * (coreR * 2.5) - cSin * coreR;
        let cy = cSin * (coreR * 2.5) + cCos * coreR;
        let ex = cCos * flow - cSin * (-coreR * 2.5);
        let ey = cSin * flow + cCos * (-coreR * 2.5);

        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(cx, cy, ex, ey);
        ribbonDots.push({x: ex, y: ey});
    }
    ctx.stroke(); 

    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ef4444';
    ctx.beginPath();
    for(let i=0; i<4; i++) {
        ctx.moveTo(ribbonDots[i].x + 4, ribbonDots[i].y);
        ctx.arc(ribbonDots[i].x, ribbonDots[i].y, 4, 0, pi2);
    }
    ctx.fill();
    ctx.shadowBlur = 0; 

    // ==================================================
    // 7. DARK SERAPH WINGS
    // ==================================================
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
            
            let tX = (x, y) => (x * cosR - y * sinR) * flip;
            let tY = (x, y) => (x * sinR + y * cosR);

            ctx.moveTo(0, 0);
            ctx.lineTo(tX(coreR * 1.8, -wLen * 0.5), tY(coreR * 1.8, -wLen * 0.5));
            ctx.lineTo(tX(coreR * 0.6, -wLen), tY(coreR * 0.6, -wLen));
            ctx.lineTo(tX(-coreR * 0.6, -wLen * 0.7), tY(-coreR * 0.6, -wLen * 0.7));
            ctx.closePath();
        }
    }
    ctx.fill(); ctx.stroke(); 

    // ==================================================
    // 8. SOVEREIGN CARAPACE
    // ==================================================
    ctx.fillStyle = isFlash ? '#ffffff' : '#09090b'; 
    ctx.strokeStyle = '#ef4444'; 
    ctx.lineWidth = isEnraged ? 3 : 2;
    
    const breathe = Math.sin(now * 0.0025) * (coreR * 0.15);
    ctx.beginPath(); 
    ctx.moveTo(coreR * 1.2 + breathe, -coreR); ctx.lineTo(coreR * 2.8 + breathe, -coreR * 1.6); ctx.lineTo(coreR * 1.8 + breathe, -coreR * 0.2); ctx.closePath();
    ctx.moveTo(-coreR * 1.2 - breathe, -coreR); ctx.lineTo(-coreR * 2.8 - breathe, -coreR * 1.6); ctx.lineTo(-coreR * 1.8 - breathe, -coreR * 0.2); ctx.closePath();
    ctx.moveTo(0, -coreR * 2.8); ctx.lineTo(coreR * 1.6, -coreR * 0.8); ctx.lineTo(coreR * 0.9, coreR * 2.0); 
    ctx.lineTo(0, coreR * 3.0); ctx.lineTo(-coreR * 0.9, coreR * 2.0); ctx.lineTo(-coreR * 1.6, -coreR * 0.8); ctx.closePath();
    ctx.fill(); ctx.stroke();

    // ==================================================
    // 9. SOUL VORTEX / DEBRIS
    // ==================================================
    // 🚨 OPTIMIZATION: Pinalitan ng dynamic string ang globalAlpha
    for(let i=0; i<8; i++) {
        let pTime = ((now / (isEnraged ? 300 : 600)) + (i * 0.125)) % 1; 
        let pAngle = (i * 0.785398) + (now * 0.002); 
        let pRadius = coreR * 5 * (1 - pTime); 
        let alpha = Math.max(0, Math.sin(pTime * Math.PI)); 
        
        ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`;
        ctx.beginPath(); 
        ctx.arc(Math.cos(pAngle) * pRadius, Math.sin(pAngle) * pRadius, coreR * 0.15, 0, pi2); 
        ctx.fill();
    }

    // ==================================================
    // 10. THE BLACK STAR CORE 
    // ==================================================
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

    // ==================================================
    // 11. THE ZENITH EYE 
    // ==================================================
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
        
        // 🚨 OPTIMIZATION: RGBA Blood Drops imbes na globalAlpha
        const dropLimit = isEnraged ? 80 : 50;
        for(let i=0; i<5; i++) {
            let dropY = eyeY + eyeHeight + ((now / (isEnraged ? 15 : 20) + i * 25) % dropLimit);
            let alpha = Math.max(0, 1 - ((dropY - eyeY) / dropLimit));
            ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`;
            ctx.beginPath(); 
            ctx.arc(pupilTrackX + (i-2)*6, dropY, isEnraged ? 3 : 2, 0, pi2); 
            ctx.fill();
        }
    }

    ctx.restore();
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
    
    // 🚨 OPTIMIZATION: Pseudo-random function para iwasan ang `Math.random()` lag sa loop
    const seededRandom = (seed) => {
        const x = Math.sin(seed * 9999) * 10000;
        return x - Math.floor(x);
    };
    
    ctx.save();
    
    // 💥 REALITY DISTORTION / ENRAGE SCREEN SHAKE (Optimized without Math.random)
    if (isEnraged) {
        // Gumamit tayo ng sine wave na nakabase sa time para smooth ang shake, hindi erratic jitter
        const shakeX = Math.sin(now * 0.05) * 5;
        const shakeY = Math.cos(now * 0.04) * 5;
        ctx.translate(shakeX, shakeY);
    }

    // 0. APOCALYPTIC ENVIRONMENT 
    const distPulse = Math.sin(now * 0.00666) * 0.15; 
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

    // Swirling Infernal Vortexes 
    const vortRot1 = now * 0.005;
    const vortRot2 = vortRot1 + 1.570796; 
    
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

    // 3. 12 WINGS 
    const wingFlap = Math.cos(now * 0.00666) * 0.4;
    const wingLen = isEnraged ? coreR * 8 : coreR * 5;
    
    // Shadow Wings
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

    // Hellfire Wings
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

    const armorGlow = ctx.createRadialGradient(0, 0, coreR * 0.5, 0, 0, coreR * 2.5);
    armorGlow.addColorStop(0.5, 'rgba(234, 88, 12, 0.5)'); 
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

    // 5. OMNIPRESENT EYES
    // 🚨 OPTIMIZATION: Inalis natin ang arrays sa loop para sa performance
    const eyePhase = Math.floor((now * 0.01) % 4);
    const flickerColor = eyePhase === 0 ? '#ffffff' : eyePhase === 1 ? '#facc15' : eyePhase === 2 ? '#dc2626' : '#09090b';
    
    const eyeGlowGrad = ctx.createRadialGradient(0, -coreR * 0.3, coreR * 0.1, 0, -coreR * 0.3, coreR * 1.5);
    const fcRGB = eyePhase === 0 ? '255,255,255' : eyePhase === 1 ? '250,204,21' : eyePhase === 2 ? '220,38,38' : '9,9,11';
    eyeGlowGrad.addColorStop(0, `rgba(${fcRGB}, 0.8)`);
    eyeGlowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = eyeGlowGrad;
    ctx.beginPath(); ctx.ellipse(0, -coreR * 0.3, coreR * 1.5, coreR * 0.6, 0, 0, pi2); ctx.fill();
    
    ctx.fillStyle = isFlash ? '#000000' : flickerColor;
    ctx.beginPath(); ctx.ellipse(0, -coreR * 0.3, coreR * 0.6, coreR * 0.2, 0, 0, pi2); ctx.fill();
    
    const eyeCount = isEnraged ? 8 : 4;
    for (let i = 0; i < eyeCount; i++) {
        let eAng = (i / eyeCount) * pi2 + Math.PI;
        let eDist = coreR * 0.9;
        let eScale = (i % 2 === 0) ? 0.2 : 0.15;
        let subPhase = Math.floor(((now + i * 50) * 0.01) % 4);
        ctx.fillStyle = subPhase === 0 ? '#ffffff' : subPhase === 1 ? '#facc15' : subPhase === 2 ? '#dc2626' : '#09090b';
        ctx.beginPath(); 
        ctx.ellipse(Math.cos(eAng) * eDist, Math.sin(eAng) * eDist, coreR * eScale, coreR * (eScale * 0.4), eAng, 0, pi2); 
        ctx.fill();
    }

    // 6. FLOATING INFERNAL CROWN 
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
    
    ctx.fillStyle = '#ea580c';
    ctx.font = `${coreR * 0.4}px "Georgia"`;
    ctx.textAlign = 'center';
    for (let i = 0; i < 3; i++) {
        let rAng = (now * 0.00666) + (i * 2.094395); 
        ctx.fillText("✦", Math.cos(rAng) * coreR * 0.7, Math.sin(rAng) * coreR * 0.2 + crownY);
    }

    // 7. PARTICLES (Lava Embers, Ash, Sparks - Optimized with seeded randoms!)
    let parts = [[], [], []];
    // 🚨 OPTIMIZATION: Tinanggal natin ang array instantiation per frame at Math.random.
    for (let k = 0; k < 40; k++) {
        let pType = k % 3; 
        
        // Ginamit natin ang `seededRandom` function gamit ang index (`k`) bilang seed.
        // Ibig sabihin, ang particle #1 ay laging nasa specific X position na yun kahit magpalit ng frame.
        let pX = (seededRandom(k) - 0.5) * coreR * 20;
        
        // Ang pag-angat nila ay based parin sa oras (now) para umaangat ang animation.
        let pY = (seededRandom(k * 2) - 0.5) * coreR * 20 - ((now / (pType === 1 ? 5 : 15)) + k * 80) % (coreR * 15);
        parts[pType].push({x: pX, y: pY, sizeMod: seededRandom(k * 3)});
    }
    
    // Type 0: Ash
    ctx.fillStyle = 'rgba(87, 83, 78, 0.8)';
    ctx.beginPath();
    for (let p of parts[0]) { 
        ctx.moveTo(p.x, p.y); 
        ctx.arc(p.x, p.y, p.sizeMod * 2 + 1, 0, pi2); 
    }
    ctx.fill();

    // Type 1: Embers with Faux Glow
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    for (let p of parts[1]) { 
        ctx.moveTo(p.x, p.y); 
        ctx.arc(p.x, p.y, p.sizeMod * 3 + 1, 0, pi2); 
    }
    ctx.fill();
    
    ctx.fillStyle = 'rgba(234, 88, 12, 0.4)';
    ctx.beginPath();
    for (let p of parts[1]) { 
        ctx.moveTo(p.x, p.y); 
        ctx.arc(p.x, p.y, 6, 0, pi2); 
    }
    ctx.fill();

    // Type 2: Obsidian Fragments
    ctx.fillStyle = '#0c0a09';
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let p of parts[2]) { 
        ctx.moveTo(p.x, p.y); 
        ctx.arc(p.x, p.y, 2.5, 0, pi2); 
    }
    ctx.fill(); ctx.stroke();

    ctx.restore();
}
            
            ctx.restore();

        } else {
            // ==================================================
            // NORMAL ENEMY RENDER
            // ==================================================
            ctx.fillStyle = e.flash > 0 ? '#fff' : (e.color || 'red');
            ctx.beginPath(); 
            ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); 
            ctx.fill();
        }

        if (e.abyssShieldTimer > 0) {
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.r + 20, 0, Math.PI * 2);
          ctx.strokeStyle = '#fef08a'; 
          ctx.lineWidth = 5;
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 25;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

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

        ctx.fillStyle = '#030111'; ctx.beginPath();
        ctx.arc(e.x - e.r * 0.3, e.y - e.r * 0.05, e.r * 0.2, 0, Math.PI * 2);
        ctx.arc(e.x + e.r * 0.3, e.y - e.r * 0.05, e.r * 0.2, 0, Math.PI * 2); ctx.fill();
// FIX: I-check kung e.hp > 0 para hindi mag-render pag patay na o negative
        if (e.hp < e.maxHp && e.hp > 0) {
          const bw = e.r * 2.5;
          const bh = 4; const bx = e.x - bw / 2; const by = e.y - e.r - 10;
          ctx.fillRect(bx, by, bw, bh);
          ctx.fillStyle = e.boss ? '#fbbf24' : '#ef4444'; 
          // FIX: Gumamit ng Math.max(0, e.hp) para hindi maging negative width
          ctx.fillRect(bx, by, bw * (Math.max(0, e.hp) / e.maxHp), bh);
        }

        if (e.nameTag) {
          ctx.fillStyle = (e.type === 'abyss' || e.type === 'primordial') ? '#fbbf24' : '#f87171';
          ctx.font = 'bold 12px monospace';
          ctx.textAlign = 'center';
          ctx.shadowColor = '#000';
          ctx.shadowBlur = 6;
          ctx.fillText(e.nameTag, e.x, e.y - e.r - 18);
          ctx.shadowBlur = 0;
        }
        
// 🔥 VISUAL STATUS DEBUFFS (OPTIMIZED - VECTOR ICONS, NO EMOJI/FONT LOOKUP) 🔥
      if (e.hp > 0 && e.hp < e.maxHp) { 
        let activeDebuffs = [];
        if (e.arcaneBurnTime > 0) activeDebuffs.push('burn');
        if (e.temporalSlowTime > 0) activeDebuffs.push('slow');
        if (e.stunnedTime > 0) activeDebuffs.push('stun');
        if (e.stigmaTime > 0) activeDebuffs.push('bleed');
        if (e.voidExhaustTime > 0) activeDebuffs.push('void');
        if (e.instabTime > 0) activeDebuffs.push('instab');

        if (activeDebuffs.length > 0) {
          const spacing = 14; 
          const totalWidth = activeDebuffs.length * spacing;
          const startY = e.nameTag ? (e.y - e.r - 34) : (e.y - e.r - 20); 
          
          // 1. Lagyan ng simpleng dark background para mabasa agad (Sobrang bilis i-render)
          ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
          ctx.fillRect(e.x - totalWidth / 2 - 2, startY - 7, totalWidth + 4, 15);

          // 2. I-render ang mga vector icons (walang font/emoji lookup, mas mabilis)
          let startX = e.x - totalWidth / 2 + (spacing / 2);
          activeDebuffs.forEach((type) => {
            drawDebuffIcon(ctx, type, startX, startY, 5);
            startX += spacing;
          });
        }
      }

        ctx.restore();
      }

for (const p of eng.particles) {
        ctx.save();
        ctx.globalAlpha = p.life / p.ml; 
        ctx.fillStyle = p.color;
        if (p.isGhost) {
           // 💨 Ghost Player Trail
           ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
        } else {
           ctx.fillRect(p.x - p.r, p.y - p.r, p.r*2, p.r*2); 
        }
        ctx.restore();
      }

// 🟢 SKIN AESTHETICS HELPER (Nagpapalit ng kulay ng damit, sumbrero at glow)
      const getSkinAesthetics = (skinId, isP2) => {
          // Shadow Mage = Dark Red Assassin Mage
          if (skinId === 'shadow') return { c: '#991b1b', robe: '#450a0a', brim: '#7f1d1d', glow: '#ef4444', aura: true };
          if (skinId === 'pyro') return { c: '#ef4444', robe: '#7f1d1d', brim: '#fca5a5', glow: '#f97316', aura: true };
          if (skinId === 'archmage') return { c: '#fef08a', robe: '#b45309', brim: '#fef9c3', glow: '#fbbf24', aura: true };
          if (skinId === 'sakura') return { 
              c: '#f472b6',    // Hat/Main Hat Body (Soft Strawberry Pink)
              robe: '#ec4899', // Robe Color (Deep but cute pink)
              brim: '#fdf2f8', // Hat Brim (Pastel Pink/White blend)
              glow: '#f472b6', // Aura Core (Matching Main Pink)
              aura: true 
          };
          if (skinId === 'pink_wings') return { 
              c: '#fb7185',    // Hat/Main Hat Body (Soft Strawberry Pink)
              robe: '#f472b6', // Robe Color (Deep but cute pink)
              brim: '#fff5fa', // Hat Brim (Pastel Pink/White blend)
              glow: '#fb7185', // Aura Core (Matching Main Pink)
              aura: true 
          };
          if (skinId === 'igris') return { 
              c: '#262626',    // Dark grey metallic face mask / visor
              robe: '#0a0a0a', // Pitch black heavy armor
              brim: '#171717', // Black helmet brim
              glow: '#dc2626', // Blood red energy glow
              aura: true 
          };
          if (skinId === 'emperor') return { 
              c: '#171717',    // Heavy Metallic Dark Grey
              robe: '#0a0a0a', // Pitch Black Armor
              brim: '#050505', // Vantablack Helmet Visor
              glow: '#dc2626', // Crimson Blood Glow
              aura: true 
          };
          if (skinId === 'empress') return { 
              c: '#ffe4e6',    // Rose-white skin/hair base
              robe: '#ffffff', // Pure white luxurious silk robe
              brim: '#fda4af', // Rose-gold hat brim/accents
              glow: '#f43f5e', // Radiant Rose-Pink glow
              aura: true 
          };
          // 👑 INFERNAL ECLIPSE SOVEREIGN (Obsidian, Crimson, & Violet)
          if (skinId === 'infernal') return { 
              c: '#1f101a',    // Dark obsidian face/core
              robe: '#09050e', // Abyssal black armor
              brim: '#1f0510', // Dark scarlet accents
              glow: '#e11d48', // Infernal Scarlet glow
              aura: true 
          };
          if (skinId === 'leviathan') return { 
              c: '#e0f2fe',    // Celestial Silver / Aqua white base
              robe: '#ffffff', // Royal white water-silk armor
              brim: '#0284c7', // Ocean Sapphire blue accents
              glow: '#38bdf8', // Divine Aqua glow
              aura: true 
          };
          // 🌌✨ ETERNAL REMEMBRANCE (Frieren Theme)
          if (skinId === 'remembrance') return { 
              c: '#f8fafc',    // Silver-white elven hair/base
              robe: '#1e1b4b', // Royal Midnight Blue gown
              brim: '#e0f2fe', // Celestial silver accents
              glow: '#60a5fa', // Forget-Me-Not Blue glow
              aura: true 
          };
          if (skinId === 'frieren') return { 
              c: '#f8fafc',    // Silver-white starlight hair/skin
              robe: '#0f172a', // Royal Midnight Void
              brim: '#e0f2fe', // Crystal white accents
              glow: '#60a5fa', // Forget-Me-Not Celestial Blue
              aura: true 
          };
          return isP2 
              ? { c: '#f97316', robe: '#c2410c', brim: '#ffedd5', glow: 'rgba(249, 115, 22, 0.6)', aura: false } 
              : { c: '#8b5cf6', robe: '#5b21b6', brim: '#c4b5fd', glow: 'rgba(168, 85, 247, 0.6)', aura: false };
      };

      // 💥 APOCALYPSE TIER: TERRIFYING, EPIC, LIGHTNING & SMOKE EFFECTS
      const drawAdvancedSkinAura = (x, y, radius, skinId) => {
          if (!skinId || skinId === 'default') return;
          const time = performance.now();
          const eng = engineRef.current;
          ctx.save();
          
          // --- HELPER 1: DYNAMIC LIGHTNING GENERATOR (🔥 OPTIMIZED GLOW) ---
          const drawLightning = (startX, startY, endX, endY, color, glowColor, segments = 5, branches = false) => {
              ctx.lineCap = 'round';
              const points = [{x: startX, y: startY}];
              let currX = startX, currY = startY;
              
              for (let i = 1; i <= segments; i++) {
                  const progress = i / segments;
                  currX = startX + (endX - startX) * progress + (Math.random() - 0.5) * 20;
                  currY = startY + (endY - startY) * progress + (Math.random() - 0.5) * 20;
                  points.push({x: currX, y: currY});
              }

              // Fake Glow (Mas mabilis kaysa sa shadowBlur)
              ctx.strokeStyle = glowColor; ctx.lineWidth = 6; ctx.globalAlpha = 0.4;
              ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y);
              for(let i=1; i<points.length; i++) ctx.lineTo(points[i].x, points[i].y);
              ctx.stroke();

              // Inner Lightning Core
              ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.globalAlpha = 1.0;
              ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y);
              for(let i=1; i<points.length; i++) ctx.lineTo(points[i].x, points[i].y);
              ctx.stroke();

              if (branches && Math.random() < 0.3) {
                  const bx = currX + (Math.random() - 0.5) * 30;
                  const by = currY + (Math.random() - 0.5) * 30;
                  
                  ctx.strokeStyle = glowColor; ctx.lineWidth = 4; ctx.globalAlpha = 0.4;
                  ctx.beginPath(); ctx.moveTo(currX, currY); ctx.lineTo(bx, by); ctx.stroke();
                  
                  ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.globalAlpha = 1.0;
                  ctx.beginPath(); ctx.moveTo(currX, currY); ctx.lineTo(bx, by); ctx.stroke();
              }
              ctx.globalAlpha = 1.0; // Reset
          };

          // --- HELPER 2: SHATTERED MAGIC SEAL ---
          const drawShatteredSeal = (cx, cy, r, rotation, color) => {
              ctx.save();
              ctx.translate(cx, cy + 5); ctx.scale(1, 0.35); ctx.rotate(rotation);
              ctx.strokeStyle = color; ctx.shadowBlur = 20; ctx.shadowColor = color; ctx.lineWidth = 3;
              // Broken outer ring
              for(let i=0; i<8; i++) {
                  if (Math.random() > 0.2) {
                      ctx.beginPath();
                      ctx.arc(0, 0, r, (i*Math.PI)/4, ((i+0.8)*Math.PI)/4); ctx.stroke();
                  }
              }
              ctx.setLineDash([15, 10, 5, 20]);
              ctx.lineWidth = 1.5;
              ctx.beginPath(); ctx.arc(0, 0, r * 0.8, 0, Math.PI*2); ctx.stroke();
              ctx.restore();
          };

          // 🩸 SHADOW MAGE (NIGHTMARE TIER)
          if (skinId === 'shadow') {
              ctx.globalCompositeOperation = 'source-over';
              const twitch = Math.random() > 0.8 ? 5 : 0;
              const grad = ctx.createRadialGradient(x, y+3, 0, x, y+3, radius*3 + twitch);
              grad.addColorStop(0, '#000000'); grad.addColorStop(0.3, 'rgba(100, 0, 0, 0.9)');
              grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
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

          // 🔥 PYROMANCER (DEMON OF THE ASHEN FLARE)
          else if (skinId === 'pyro') {
              ctx.globalCompositeOperation = 'source-over';
              
              drawShatteredSeal(x, y, radius * 5, time * 0.001, '#ff0000');
              if (Math.random() < 0.2) {
                  const lx = x + (Math.random()-0.5)*radius*8;
                  const ly = y + 10 + (Math.random()-0.5)*radius*4;
                  drawLightning(x, y-radius*2, lx, ly, '#ffffff', '#ff0000', 4, true);
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
                  
                  if (s.isFire) {
                      // 🔥 OPTIMIZED: Fake glow without shadowBlur
                      ctx.fillStyle = `rgba(255, 50, 0, ${s.life * 0.3})`;
                      ctx.beginPath(); ctx.arc(x + s.ox, y + s.oy, s.size * 1.5, 0, Math.PI*2); ctx.fill();
                      ctx.fillStyle = `rgba(255, 200, 0, ${s.life * 0.8})`;
                  } else {
                      ctx.fillStyle = `rgba(10, 5, 5, ${s.life * 0.8})`; 
                  }
                  ctx.beginPath(); ctx.arc(x + s.ox, y + s.oy, s.size, 0, Math.PI*2); ctx.fill();
              });
              
              ctx.globalCompositeOperation = 'lighter'; 
              const heatGrad = ctx.createRadialGradient(x, y, 0, x, y, radius * 4);
              heatGrad.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
              heatGrad.addColorStop(0.2, 'rgba(255, 50, 0, 0.6)');
              heatGrad.addColorStop(1, 'rgba(255, 0, 0, 0)');
              ctx.fillStyle = heatGrad; ctx.beginPath();
              ctx.arc(x, y, radius*4, 0, Math.PI*2); ctx.fill();

              ctx.fillStyle = '#ffaa00';
              for(let i=0; i<10; i++) {
                  const ex = x + Math.sin(time*0.01 + i)*radius*4;
                  const ey = y - (time*0.1 + i*20)%80;
                  ctx.beginPath(); ctx.arc(ex, ey, Math.random()*3, 0, Math.PI*2); ctx.fill();
              }
          }

          // ⚡ ARCHMAGE (VOID STORM SOVEREIGN)
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
                  
                  ctx.fillStyle = cloudGrad; 
                  ctx.beginPath(); ctx.arc(cx, cy, cloud.size, 0, Math.PI*2); ctx.fill();
              });
              
              ctx.globalCompositeOperation = 'lighter'; 

              drawShatteredSeal(x, y, radius * 5.5, time * -0.002, '#00ffff');
              drawShatteredSeal(x, y, radius * 3.5, time * 0.003, '#c084fc');

              const lightningColors = [{ c: '#ffffff', g: '#00ffff' }, { c: '#ffffff', g: '#c084fc' }];
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
              ctx.fillStyle = stormCore; ctx.beginPath();
              ctx.arc(x, y, radius*4, 0, Math.PI*2); ctx.fill();

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

          // 🌸 SAKURA SORCERESS
          else if (skinId === 'sakura') {
              ctx.globalCompositeOperation = 'lighter';
              const pulse = Math.sin(time * 0.003);
              
              ctx.save();
              ctx.translate(x, y + 5); ctx.scale(1, 0.4); ctx.rotate(time * 0.0005);
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
                  ctx.fillStyle = hColor; 
                  // 🔥 OPTIMIZED: Removed shadowBlur.
                  ctx.fill(); ctx.restore();
              });
              
              ctx.fillStyle = '#ffffff';
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

          // 🌸 SAKURA SORCERESS (PREMIUM MAGICAL GIRL TIER)
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
              ctx.beginPath();
              ctx.arc(0, 0, radius * 4.5, 0, Math.PI * 2); ctx.stroke();
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
                  ctx.save();
                  ctx.translate(x, y - radius); ctx.scale(w, 1);
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
                  ctx.fillStyle = `rgba(236, 72, 153, ${h.life})`; 
                  // 🔥 OPTIMIZED: Removed shadowBlur.
                  ctx.fill();

                  ctx.fillStyle = `rgba(255, 255, 255, ${h.life * 0.8})`;
                  ctx.beginPath(); ctx.ellipse(-hSize*0.3, -hSize*0.3, hSize*0.2, hSize*0.3, Math.PI/4, 0, Math.PI*2);
                  ctx.fill();
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
              ctx.fillStyle = pinkGrad; ctx.beginPath();
              ctx.arc(x, y, radius * 3, 0, Math.PI * 2); ctx.fill();
          }

          // 🗡️ CRIMSON SHADOW KNIGHT (SOLO LEVELING IGRIS TIER)
          else if (skinId === 'igris') {
              ctx.globalCompositeOperation = 'source-over';
              const pulse = Math.sin(time * 0.004);

              ctx.save();
              ctx.translate(x, y + 5); ctx.scale(1, 0.35); ctx.rotate(time * -0.0005);
              ctx.strokeStyle = `rgba(220, 38, 38, ${0.5 + pulse * 0.2})`;
              ctx.shadowColor = '#dc2626';
              ctx.shadowBlur = 20; ctx.lineWidth = 4;
              
              ctx.beginPath();
              ctx.arc(0, 0, radius * 4.5, 0, Math.PI * 2); ctx.stroke();
              ctx.beginPath();
              for(let i=0; i<8; i++) {
                  ctx.rotate(Math.PI / 4);
                  ctx.moveTo(0, radius*2);
                  ctx.lineTo(radius*1.5, radius*4.5);
                  ctx.lineTo(-radius*1.5, radius*4.5);
              }
              ctx.stroke();
              ctx.restore();

              ctx.save();
              ctx.translate(x, y - radius);
              const capeSway = Math.sin(time * 0.003) * 15;
              const capeRipple = Math.cos(time * 0.005) * 8;
              const capeGrad = ctx.createLinearGradient(0, 0, 0, radius*6);
              capeGrad.addColorStop(0, '#991b1b'); 
              capeGrad.addColorStop(0.5, '#7f1d1d');
              capeGrad.addColorStop(1, 'rgba(0, 0, 0, 0)'); 
              
              ctx.fillStyle = capeGrad;
              ctx.shadowBlur = 15; ctx.shadowColor = '#dc2626';
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
              
              ctx.save();
              ctx.translate(x, y - radius*1.5);
              ctx.strokeStyle = 'rgba(220, 38, 38, 0.9)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
              ctx.shadowBlur = 15;
              ctx.shadowColor = '#ff0000';
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
                  // 🔥 OPTIMIZED: Removed shadowBlur.
                  ctx.beginPath(); ctx.arc(x+s.ox, y+s.oy, s.size, 0, Math.PI*2); ctx.fill();
              });
              
              ctx.globalCompositeOperation = 'lighter';
              if (Math.random() < 0.25) {
                  const lx = x + (Math.random()-0.5)*radius*10;
                  const ly = y - radius*3 + (Math.random()-0.5)*radius*8;
                  ctx.strokeStyle = `rgba(255, 50, 50, ${0.5 + Math.random()*0.5})`;
                  ctx.lineWidth = 2 + Math.random()*2; ctx.shadowBlur = 20; ctx.shadowColor = '#ff0000';
                  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(lx, ly); ctx.stroke();
                  ctx.strokeStyle = '#ffffff';
                  ctx.lineWidth = 1; ctx.stroke(); 
              }

              const coreGrad = ctx.createRadialGradient(x, y-2, 0, x, y-2, radius*3.5);
              coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)'); 
              coreGrad.addColorStop(0.2, 'rgba(220, 38, 38, 0.8)');
              coreGrad.addColorStop(1, 'rgba(150, 0, 0, 0)');
              ctx.fillStyle = coreGrad; ctx.beginPath(); ctx.arc(x, y-2, radius*3.5, 0, Math.PI*2); ctx.fill();
          }

          // 🗡️ 5. EMPEROR (Mythic Translucent Shadow Sovereign)
          else if (skinId === 'emperor') {
              ctx.globalCompositeOperation = 'source-over';
              const pulse = Math.sin(time * 0.004);

              ctx.save(); ctx.translate(x, y + 5); ctx.scale(1, 0.35);
              const poolGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 6);
              poolGrad.addColorStop(0, 'rgba(10, 0, 0, 0.9)');
              poolGrad.addColorStop(0.6, 'rgba(127, 29, 29, 0.2)'); poolGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
              ctx.fillStyle = poolGrad; ctx.beginPath(); ctx.arc(0, 0, radius*6, 0, Math.PI*2); ctx.fill();
              
              const shockRadius = (time * 0.15) % (radius * 8);
              ctx.strokeStyle = `rgba(220, 38, 38, ${1 - (shockRadius / (radius * 8))})`; 
              ctx.lineWidth = 3; ctx.shadowBlur = 15;
              ctx.shadowColor = '#dc2626';
              ctx.beginPath(); ctx.arc(0, 0, shockRadius, 0, Math.PI * 2); ctx.stroke();

              ctx.rotate(time * -0.001);
              ctx.strokeStyle = `rgba(153, 27, 27, ${0.5 + pulse * 0.3})`; ctx.lineWidth = 2.5; ctx.setLineDash([10, 5]);
              ctx.beginPath();
              for(let i=0; i<12; i++) {
                  const ang = (i * Math.PI*2)/12;
                  ctx.moveTo(Math.cos(ang)*radius*3.5, Math.sin(ang)*radius*3.5); ctx.lineTo(Math.cos(ang)*radius*5.5, Math.sin(ang)*radius*5.5);
              }
              ctx.stroke(); ctx.setLineDash([]);
              ctx.restore();

              ctx.save(); ctx.translate(x, y - radius);
              const capeSway = Math.sin(time * 0.003) * 20;
              const capeRipple = Math.cos(time * 0.006) * 10;
              const capeGrad = ctx.createLinearGradient(0, 0, 0, radius*8);
              capeGrad.addColorStop(0, `rgba(153, 27, 27, ${0.6 + pulse * 0.1})`); capeGrad.addColorStop(0.5, `rgba(127, 29, 29, 0.3)`); capeGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
              ctx.fillStyle = capeGrad; ctx.globalAlpha = 0.8 + pulse * 0.1; ctx.shadowBlur = 30; ctx.shadowColor = '#dc2626'; 
              ctx.beginPath(); ctx.moveTo(-radius*1.5, 0);
              ctx.quadraticCurveTo(-radius*4, radius*3 + capeRipple, -radius*2.5 + capeSway, radius*8.5); 
              ctx.quadraticCurveTo(capeSway, radius*10, radius*2.5 + capeSway, radius*8.5); 
              ctx.quadraticCurveTo(radius*4, radius*3 - capeRipple, radius*1.5, 0);
              ctx.fill();
              
              ctx.globalCompositeOperation = 'destination-out'; 
              ctx.beginPath();
              for(let i=-2; i<=2; i++) {
                  const cutX = (i*radius*0.6) + capeSway;
                  ctx.moveTo(cutX, radius*9); ctx.lineTo(cutX - 4, radius*6 + Math.random()*15); ctx.lineTo(cutX + 4, radius*9);
              }
              ctx.fill(); ctx.globalCompositeOperation = 'source-over';
              ctx.globalAlpha = 1.0; ctx.restore();

              for(let i=0; i<4; i++) {
                  const shardAng = time*0.002 + (i*Math.PI/2);
                  const sX = x + Math.cos(shardAng)*radius*5.5; const sY = y - radius*1.5 + Math.sin(shardAng*2)*radius*2;
                  ctx.save(); ctx.translate(sX, sY); ctx.rotate(time*0.005 + i);
                  ctx.fillStyle = '#171717'; ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 1.5; ctx.shadowBlur = 15; ctx.shadowColor = '#dc2626';
                  ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(6, 0);
                  ctx.lineTo(0, 18); ctx.lineTo(-6, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
                  ctx.strokeStyle = '#ffb3b3'; ctx.lineWidth = 1.5; ctx.shadowBlur = 0; ctx.beginPath(); ctx.moveTo(0, -5);
                  ctx.lineTo(0, 10); ctx.stroke(); ctx.restore();
                  ctx.strokeStyle = `rgba(220, 38, 38, 0.2)`; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(x, y-radius); ctx.lineTo(sX, sY); ctx.stroke();
              }

              for(let w=-1; w<=1; w+=2) {
                  ctx.save();
                  ctx.translate(x + (radius*1.4*w), y - radius*0.8);
                  ctx.fillStyle = '#0a0a0a'; ctx.strokeStyle = '#991b1b'; ctx.lineWidth = 2.5; ctx.shadowBlur = 15;
                  ctx.shadowColor = '#000000';
                  ctx.beginPath(); ctx.moveTo(0, radius*0.5); ctx.lineTo(radius*2.2*w, -radius*0.8); ctx.lineTo(radius*1.2*w, radius*1.2); ctx.lineTo(0, radius*1.2);
                  ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
              }

              ctx.save(); ctx.translate(x, y - radius*1.8);
              for(let i=0; i<8; i++) {
                  const plumeX = Math.cos(time*0.004 + i*0.5)*18;
                  const plumeY = Math.sin(time*0.005 + i*0.5)*12;
                  ctx.strokeStyle = i < 3 ? 'rgba(255, 150, 150, 0.9)' : 'rgba(220, 38, 38, 0.7)';
                  ctx.lineWidth = 5 - i*0.4; ctx.lineCap = 'round';
                  ctx.shadowBlur = i===0 ? 20 : 0; ctx.shadowColor = '#ff0000';
                  ctx.beginPath(); ctx.moveTo(0,0);
                  ctx.quadraticCurveTo(radius + plumeX, -radius*2.5 - i*4, radius*3.5 + plumeX*1.5, -radius + plumeY); ctx.stroke();
              }
              ctx.restore();

              if (!eng.igrisSmoke) eng.igrisSmoke = [];
              if (eng.igrisSmoke.length < 20 && Math.random() < 0.4) eng.igrisSmoke.push({ ox: (Math.random()-0.5)*radius*6, oy: radius + Math.random()*5, vy: 0.5 + Math.random(), size: 6 + Math.random()*8, life: 1, isRed: Math.random() > 0.8 });
              eng.igrisSmoke.forEach((s, i) => {
                  s.oy -= s.vy; s.ox += Math.sin(time*0.005 + i)*0.5; s.life -= 0.015; s.size -= 0.05;
                  if (s.life <= 0) { eng.igrisSmoke.splice(i, 1); return; }
                  ctx.fillStyle = s.isRed ? `rgba(220, 38, 38, ${s.life * 0.5})` : `rgba(10, 10, 10, ${s.life * 0.8})`;
                  // 🔥 OPTIMIZED: Removed shadowBlur.
                  ctx.beginPath(); ctx.arc(x+s.ox, y+s.oy, s.size, 0, Math.PI*2); ctx.fill();
              });
              
              ctx.globalCompositeOperation = 'lighter';
              const coreGrad = ctx.createRadialGradient(x, y-2, 0, x, y-2, radius*3.5);
              coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
              coreGrad.addColorStop(0.3, 'rgba(220, 38, 38, 0.8)'); coreGrad.addColorStop(1, 'rgba(150, 0, 0, 0)');
              ctx.fillStyle = coreGrad; ctx.beginPath(); ctx.arc(x, y-2, radius*3.5, 0, Math.PI*2); ctx.fill();
          }

          // 🌸⚔️ EMPRESS OF THE BLUSHING PETALS
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
                  ctx.beginPath();
                  ctx.arc(0, 0, radius*2.5, 0, Math.PI*2); ctx.stroke();
                  ctx.restore();
              }
              
              ctx.strokeStyle = 'rgba(253, 224, 71, 0.6)';
              ctx.setLineDash([10, 15, 2, 15]);
              ctx.lineWidth = 3;
              ctx.beginPath(); ctx.arc(0, 0, radius * 5.5, 0, Math.PI * 2); ctx.stroke();
              ctx.setLineDash([]); ctx.restore();
              
              const swordCount = 5;
              for(let i=0; i<swordCount; i++) {
                  const sAng = time*0.002 + (i*Math.PI*2/swordCount);
                  const sX = x + Math.cos(sAng)*radius*4.5;
                  const sY = y - radius*2 + Math.sin(sAng*1.5)*radius*1.5;
                  
                  ctx.save();
                  ctx.translate(sX, sY); 
                  ctx.rotate(sAng + Math.PI/4 + Math.sin(time*0.003 + i)*0.2);
                  
                  ctx.fillStyle = '#ffffff';
                  ctx.shadowBlur = 15; ctx.shadowColor = '#f43f5e';
                  ctx.beginPath(); 
                  ctx.moveTo(0, -25); 
                  ctx.lineTo(3, -5);
                  ctx.lineTo(1, 8); 
                  ctx.lineTo(-1, 8); ctx.lineTo(-3, -5); 
                  ctx.closePath(); ctx.fill();
                  
                  ctx.strokeStyle = '#fde047';
                  ctx.lineWidth = 2; ctx.shadowBlur = 10; ctx.shadowColor = '#fbbf24';
                  ctx.beginPath(); ctx.moveTo(-6, -5); ctx.quadraticCurveTo(0, -8, 6, -5); ctx.stroke();
                  ctx.beginPath(); ctx.moveTo(0, 8);
                  ctx.lineTo(0, 14); ctx.stroke(); 
                  ctx.restore();
                  
                  ctx.strokeStyle = `rgba(253, 164, 175, 0.2)`;
                  ctx.lineWidth = 1; ctx.shadowBlur = 0;
                  ctx.beginPath(); ctx.moveTo(x, y - radius*2); ctx.lineTo(sX, sY); ctx.stroke();
              }

              ctx.lineWidth = 5;
              ctx.lineCap = 'round';
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
                      
                      ctx.beginPath(); ctx.moveTo(0, -s*0.3);
                      ctx.bezierCurveTo(-s*0.6, -s, -s*1.2, -s*0.3, 0, s*1.2); 
                      ctx.bezierCurveTo(s*1.2, -s*0.3, s*0.6, -s, 0, -s*0.3);
                      ctx.stroke();
                      
                      ctx.fillStyle = `rgba(253, 164, 175, ${p.life * 0.3})`; 
                      ctx.fill();
                  } else if (p.type > 0.3) {
                      ctx.fillStyle = `rgba(255, 255, 255, ${p.life})`;
                      ctx.beginPath();
                      ctx.moveTo(0, p.size);
                      ctx.bezierCurveTo(p.size, p.size, p.size*1.5, 0, 0, -p.size); ctx.lineTo(0, -p.size*0.4); 
                      ctx.lineTo(0, -p.size); ctx.bezierCurveTo(-p.size*1.5, 0, -p.size, p.size, 0, p.size); ctx.fill();
                  } else {
                      ctx.fillStyle = `rgba(253, 224, 71, ${p.life})`;
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

          // 👑 INFERNAL ECLIPSE SOVEREIGN
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
              ctx.lineWidth = 4;
              ctx.shadowBlur = 15; ctx.shadowColor = '#8b5cf6';
              ctx.beginPath(); ctx.arc(0, 0, shockRadius, 0, Math.PI * 2); ctx.stroke();
              
              ctx.rotate(time * -0.0005);
              ctx.strokeStyle = `rgba(225, 29, 72, ${0.6 + pulse * 0.3})`;
              ctx.lineWidth = 2.5;
              ctx.shadowColor = '#e11d48';
              ctx.beginPath();
              for(let i=0; i<6; i++) {
                  const ang = (i * Math.PI*2)/6;
                  ctx.lineTo(Math.cos(ang)*radius*5, Math.sin(ang)*radius*5);
                  ctx.lineTo(Math.cos(ang + Math.PI/6)*radius*2.5, Math.sin(ang + Math.PI/6)*radius*2.5);
              }
              ctx.closePath();
              ctx.stroke();
              
              ctx.setLineDash([12, 8, 4, 8]);
              ctx.beginPath(); ctx.arc(0, 0, radius * 6, 0, Math.PI*2); ctx.stroke();
              ctx.setLineDash([]); ctx.restore();
              
              ctx.save();
              ctx.translate(x, y - radius + floatY);
              const flapAngle = Math.sin(time * 0.004) * 0.2;
              
              ctx.save();
              ctx.scale(-1, 1); ctx.rotate(flapAngle - 0.1);
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
              
              ctx.strokeStyle = 'rgba(225, 29, 72, 0.8)';
              ctx.lineWidth = 2;
              ctx.beginPath(); ctx.moveTo(radius, 0); ctx.quadraticCurveTo(radius*3, -radius*5, radius*7, -radius*4); ctx.stroke();
              ctx.beginPath(); ctx.moveTo(radius*2.5, -radius*2.5); ctx.lineTo(radius*8, radius*2); ctx.stroke();
              ctx.restore();
              
              ctx.save();
              ctx.scale(1, 1); ctx.rotate(flapAngle + 0.1);
              ctx.globalCompositeOperation = 'lighter';
              const celestGrad = ctx.createLinearGradient(0, 0, radius*7, -radius*5);
              celestGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
              celestGrad.addColorStop(0.4, 'rgba(139, 92, 246, 0.8)');
              celestGrad.addColorStop(1, 'rgba(225, 29, 72, 0)');
              ctx.fillStyle = celestGrad;
              ctx.shadowBlur = 25; ctx.shadowColor = '#8b5cf6';
              
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
                  
                  ctx.save(); ctx.translate(rX, rY);
                  ctx.rotate(time*0.005 + i);
                  ctx.fillStyle = '#0f0514'; ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth = 1.5;
                  ctx.shadowBlur = 15; ctx.shadowColor = '#8b5cf6';
                  ctx.beginPath();
                  ctx.moveTo(0, -10); ctx.lineTo(5, 0); ctx.lineTo(0, 15); ctx.lineTo(-5, 0); ctx.closePath();
                  ctx.fill(); ctx.stroke();
                  ctx.strokeStyle = '#e11d48';
                  ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(0, 8); ctx.stroke();
                  ctx.restore();
                  
                  ctx.strokeStyle = `rgba(139, 92, 246, 0.2)`;
                  ctx.lineWidth = 1;
                  ctx.beginPath(); ctx.moveTo(x, y - radius + floatY); ctx.lineTo(rX, rY); ctx.stroke();
              }

              ctx.save();
              ctx.translate(x, y - radius*3 + floatY);
              ctx.scale(1, 0.3); ctx.rotate(time * 0.002);
              ctx.strokeStyle = '#e11d48'; ctx.lineWidth = 3; ctx.shadowBlur = 20;
              ctx.shadowColor = '#be123c';
              ctx.beginPath(); ctx.arc(0, 0, radius*2.5, 0, Math.PI*2); ctx.stroke();
              for(let i=0; i<5; i++) {
                  ctx.rotate(Math.PI*2/5);
                  ctx.beginPath(); ctx.moveTo(radius*2.5, 0); ctx.lineTo(radius*4, 0); ctx.stroke();
              }
              ctx.restore();
              
              ctx.globalCompositeOperation = 'lighter';
              if (Math.random() < 0.3) {
                  const lColor = Math.random() > 0.5 ?
                  {c: '#ffffff', g: '#8b5cf6'} : {c: '#ffffff', g: '#e11d48'};
                  if(typeof drawLightning === 'function') { 
                      drawLightning(x + (Math.random()-0.5)*radius*4, y - radius*4 + floatY, 
                                    x + (Math.random()-0.5)*radius*10, y + 10 + (Math.random()-0.5)*radius*5, 
                                    lColor.c, lColor.g, 4, true);
                  }
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
                  // 🔥 OPTIMIZED: Removed shadowBlur.
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
              
              ctx.beginPath();
              ctx.arc(0, 0, radius * 4.5, 0, Math.PI * 2); ctx.stroke();
              ctx.beginPath();
              for(let i=0; i<6; i++) {
                  ctx.rotate(Math.PI * 2 / 6);
                  ctx.moveTo(0, radius*2);
                  ctx.quadraticCurveTo(radius*2, radius*4, 0, radius*5);
              }
              ctx.stroke();
              
              ctx.rotate(time * -0.0015);
              ctx.strokeStyle = 'rgba(253, 224, 71, 0.8)'; 
              ctx.lineWidth = 2;
              ctx.shadowColor = '#fde047'; ctx.shadowBlur = 10;
              ctx.setLineDash([15, 10, 5, 10]);
              ctx.beginPath(); ctx.arc(0, 0, radius * 5.5, 0, Math.PI * 2);
              ctx.stroke();
              ctx.setLineDash([]); ctx.restore();

              ctx.save();
              ctx.translate(x, y - radius + floatY);
              ctx.lineWidth = 12; ctx.lineCap = 'round';
              ctx.shadowBlur = 20; ctx.shadowColor = '#0ea5e9';
              
              ctx.beginPath();
              for(let j=0; j<=30; j++) {
                  const sAng = (time * -0.002) + (j * 0.2);
                  const sDist = radius * 4.5 + Math.sin(time*0.004 + j)*2;
                  const sx = Math.cos(sAng) * sDist;
                  const sy = Math.sin(sAng) * sDist * 0.5 - (j * 1.5) + Math.sin(time*0.003 + j)*5;
                  if(j===0) ctx.moveTo(sx, sy);
                  else ctx.lineTo(sx, sy);
              }
              
              const spiritGrad = ctx.createLinearGradient(0, radius*2, 0, -radius*6);
              spiritGrad.addColorStop(0, 'rgba(2, 132, 199, 0)'); 
              spiritGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.5)');
              spiritGrad.addColorStop(1, 'rgba(255, 255, 255, 0.8)');
              
              ctx.strokeStyle = spiritGrad;
              ctx.stroke();
              ctx.lineWidth = 3;
              ctx.strokeStyle = '#ffffff'; ctx.shadowBlur = 0; ctx.stroke();
              ctx.restore();

              const flapAngle = Math.sin(time * 0.004) * 0.15;
              for (let w = -1; w <= 1; w += 2) {
                  ctx.save();
                  ctx.translate(x, y - radius + floatY); ctx.scale(w, 1);
                  ctx.rotate(flapAngle + 0.1);
                  
                  const wingGrad = ctx.createLinearGradient(0, 0, radius*7, -radius*5);
                  wingGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)'); 
                  wingGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.7)');
                  wingGrad.addColorStop(1, 'rgba(2, 132, 199, 0)');

                  ctx.fillStyle = wingGrad;
                  ctx.shadowBlur = 15; ctx.shadowColor = '#38bdf8';
                  
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
                  
                  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
                  ctx.lineWidth = 1.5; ctx.shadowBlur = 0;
                  ctx.beginPath(); ctx.moveTo(radius, 0); ctx.lineTo(radius*6, -radius*4); ctx.stroke();
                  ctx.beginPath(); ctx.moveTo(radius*2.5, -radius*0.5); ctx.lineTo(radius*7, radius*1); ctx.stroke();
                  ctx.restore();
              }

              ctx.save();
              ctx.translate(x, y - radius*3.5 + floatY);
              ctx.scale(1, 0.3); ctx.rotate(time * 0.002);
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'; ctx.lineWidth = 3;
              ctx.shadowBlur = 20; ctx.shadowColor = '#38bdf8';
              ctx.beginPath(); ctx.arc(0, 0, radius*2.5, 0, Math.PI*2); ctx.stroke();
              ctx.strokeStyle = '#fde047';
              ctx.lineWidth = 5; ctx.setLineDash([5, 15]);
              ctx.beginPath(); ctx.arc(0, 0, radius*2.5, 0, Math.PI*2); ctx.stroke();
              ctx.restore();
              
              if (Math.random() < 0.2) {
                  if(typeof drawLightning === 'function') { 
                      drawLightning(x + (Math.random()-0.5)*radius*3, y - radius*3 + floatY, 
                                    x + (Math.random()-0.5)*radius*10, y + 10 + (Math.random()-0.5)*radius*5, 
                                    '#ffffff', '#0284c7', 3, true);
                  }
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
                      // 🔥 OPTIMIZED: Removed shadowBlur.
                      ctx.beginPath(); ctx.ellipse(p.size, 0, p.size, p.size*1.5, Math.PI/4, 0, Math.PI*2); ctx.fill(); 
                      ctx.beginPath(); ctx.ellipse(-p.size, 0, p.size, p.size*1.5, -Math.PI/4, 0, Math.PI*2);
                      ctx.fill(); 
                  } else {
                      ctx.fillStyle = `rgba(224, 242, 254, ${p.life})`;
                      ctx.beginPath(); ctx.arc(0, 0, p.size, 0, Math.PI*2); ctx.fill();
                  }
                  ctx.restore();
              });
              
              const gemCount = 4;
              for(let i=0; i<gemCount; i++) {
                  const gAng = time*0.003 + (i*Math.PI*2/gemCount);
                  const gX = x + Math.cos(gAng)*radius*4;
                  const gY = y - radius*1.5 + floatY + Math.sin(gAng*2)*radius*1.5;
                  
                  ctx.save(); ctx.translate(gX, gY);
                  ctx.rotate(time*0.005 + i);
                  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#0284c7'; ctx.lineWidth = 1.5;
                  ctx.shadowBlur = 15; ctx.shadowColor = '#38bdf8';
                  ctx.beginPath();
                  ctx.moveTo(0, -6); ctx.lineTo(4, 0); ctx.lineTo(0, 6); ctx.lineTo(-4, 0); ctx.closePath();
                  ctx.fill(); ctx.stroke();
                  ctx.restore();
              }

              const holyGrad = ctx.createRadialGradient(x, y - radius + floatY, 0, x, y - radius + floatY, radius*4);
              holyGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)'); 
              holyGrad.addColorStop(0.3, 'rgba(56, 189, 248, 0.6)');
              holyGrad.addColorStop(1, 'rgba(2, 132, 199, 0)');
              ctx.fillStyle = holyGrad; ctx.beginPath(); ctx.arc(x, y - radius + floatY, radius*4, 0, Math.PI * 2); ctx.fill();
          }

          // 🌌⏳ ETERNAL REMEMBRANCE
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
              
              ctx.beginPath();
              ctx.arc(0, 0, radius * 4.5, 0, Math.PI * 2); ctx.stroke();
              ctx.setLineDash([5, 10]); ctx.beginPath();
              ctx.arc(0, 0, radius * 5.2, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
              
              ctx.save();
              ctx.rotate(time * 0.001); 
              ctx.beginPath();
              ctx.moveTo(0, 0); ctx.lineTo(0, -radius * 4); ctx.stroke();
              ctx.rotate(time * 0.0002);
              ctx.lineWidth = 4; ctx.beginPath();
              ctx.moveTo(0, 0); ctx.lineTo(radius * 2.5, 0); ctx.stroke();
              ctx.restore();
              ctx.restore();

              for (let w = -1; w <= 1; w += 2) {
                  ctx.save();
                  ctx.translate(x, y - radius + floatY); ctx.scale(w, 1);
                  const capeSway = Math.sin(time * 0.002) * 0.15;
                  ctx.rotate(capeSway + 0.1);
                  
                  const capeGradient = ctx.createLinearGradient(0, 0, radius*7, radius*5);
                  capeGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
                  capeGradient.addColorStop(0.3, 'rgba(56, 189, 248, 0.8)');
                  capeGradient.addColorStop(1, 'rgba(30, 27, 75, 0)');

                  ctx.fillStyle = capeGradient;
                  ctx.shadowBlur = 20; ctx.shadowColor = '#38bdf8';
                  ctx.beginPath();
                  ctx.moveTo(radius, 0);
                  ctx.bezierCurveTo(radius*3, -radius*2, radius*5, -radius*1, radius*7 + Math.sin(time*0.003)*3, radius*3);
                  ctx.quadraticCurveTo(radius*5, radius*5, radius*3, radius*6);
                  ctx.quadraticCurveTo(radius*2, radius*3, radius, radius);
                  ctx.fill();

                  ctx.fillStyle = '#ffffff';
                  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'; ctx.lineWidth = 1; ctx.shadowBlur = 5;
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
                  
                  ctx.shadowBlur = 15;
                  ctx.shadowColor = '#7dd3fc';
                  ctx.fillStyle = '#ffffff';
                  ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI*2); ctx.fill();
                  
                  ctx.strokeStyle = '#fde047';
                  ctx.lineWidth = 1.5;
                  ctx.beginPath(); ctx.ellipse(0, 0, 8, 12, time*0.003 + i, 0, Math.PI*2); ctx.stroke();
                  ctx.beginPath();
                  ctx.ellipse(0, 0, 8, 12, -time*0.002 + i + Math.PI/2, 0, Math.PI*2); ctx.stroke();
                  ctx.restore();
                  
                  ctx.strokeStyle = `rgba(253, 224, 71, 0.2)`;
                  ctx.lineWidth = 1;
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
                      // 🔥 OPTIMIZED: Removed shadowBlur.
                      ctx.beginPath();
                      ctx.moveTo(0, -p.size);
                      ctx.quadraticCurveTo(p.size, 0, 0, p.size);
                      ctx.quadraticCurveTo(-p.size, 0, 0, -p.size);
                      ctx.fill();
                  } else if (p.type > 0.3) {
                      ctx.fillStyle = `rgba(96, 165, 250, ${p.life})`;
                      ctx.beginPath();
                      ctx.moveTo(0, -p.size); ctx.lineTo(p.size/2, 0); ctx.lineTo(0, p.size); ctx.lineTo(-p.size/2, 0);
                      ctx.closePath(); ctx.fill();
                  } else {
                      ctx.fillStyle = `rgba(248, 250, 252, ${p.life})`; 
                      ctx.beginPath(); ctx.arc(0, 0, 1+Math.random(), 0, Math.PI*2); ctx.fill();
                  }
                  ctx.restore();
              });
              
              ctx.save();
              ctx.translate(x, y - radius*3.5 + floatY);
              ctx.scale(1, 0.3); ctx.rotate(time * 0.001);
              
              ctx.strokeStyle = 'rgba(253, 224, 71, 0.8)';
              ctx.lineWidth = 2;
              ctx.shadowBlur = 15; ctx.shadowColor = '#fde047';
              ctx.beginPath(); ctx.arc(0, 0, radius*2.5, 0, Math.PI*2); ctx.stroke();
              ctx.setLineDash([4, 8]); ctx.beginPath();
              ctx.arc(0, 0, radius*3, 0, Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
              
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

          // 🌌⏳ THE ABSOLUTE PINNACLE TIER: ETERNAL REMEMBRANCE
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
                  ctx.save();
                  ctx.translate(x, y - radius*2);
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

              ctx.save();
              ctx.translate(x, y + 5 + floatY); ctx.scale(1, 0.35); 
              const voidGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 8);
              voidGrad.addColorStop(0, 'rgba(255, 255, 255, 0.8)'); 
              voidGrad.addColorStop(0.2, 'rgba(30, 27, 75, 0.8)'); 
              voidGrad.addColorStop(0.6, 'rgba(14, 165, 233, 0.4)'); 
              voidGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
              ctx.fillStyle = voidGrad; ctx.beginPath(); ctx.arc(0, 0, radius*8, 0, Math.PI*2); ctx.fill();

              ctx.rotate(time * -0.0003);
              ctx.strokeStyle = `rgba(186, 230, 253, ${0.4 + pulse * 0.2})`; ctx.lineWidth = 1.5; ctx.shadowColor = '#38bdf8'; ctx.shadowBlur = 10;
              ctx.beginPath();
              ctx.arc(0, 0, radius * 6, 0, Math.PI*2); ctx.stroke();
              ctx.setLineDash([5, 15, 2, 10]); ctx.beginPath(); ctx.arc(0, 0, radius * 7, 0, Math.PI*2);
              ctx.stroke(); ctx.setLineDash([]);
              
              for(let i=0; i<3; i++) {
                  ctx.rotate(Math.PI*2/3);
                  ctx.beginPath(); ctx.moveTo(-radius*7, 0); ctx.bezierCurveTo(-radius*3, radius*3, radius*3, -radius*3, radius*7, 0); ctx.stroke();
              }
              ctx.restore();
              
              const wingFlap = Math.sin(time * 0.002) * 0.15 + 0.1;
              for (let w = -1; w <= 1; w += 2) {
                  ctx.save();
                  ctx.translate(x, y - radius + floatY); ctx.scale(w, 1); ctx.rotate(wingFlap);
                  
                  const wingGrad = ctx.createLinearGradient(0, 0, radius*8, -radius*5);
                  wingGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
                  wingGrad.addColorStop(0.4, 'rgba(14, 165, 233, 0.6)');
                  wingGrad.addColorStop(1, 'rgba(30, 27, 75, 0)');
                  ctx.fillStyle = wingGrad;
                  ctx.shadowBlur = 20; ctx.shadowColor = '#0ea5e9';
                  
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
                  
                  ctx.save(); ctx.translate(bX, bY);
                  ctx.translate(0, Math.sin(time*0.003 + i)*4); 
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
                      // 🔥 OPTIMIZED: Removed shadowBlur.
                      for(let f=0; f<5; f++) {
                          const fAng = f * Math.PI * 2 / 5;
                          ctx.beginPath(); ctx.arc(Math.cos(fAng)*p.size, Math.sin(fAng)*p.size, p.size, 0, Math.PI*2); ctx.fill();
                      }
                      ctx.fillStyle = `rgba(253, 224, 71, ${p.life})`;
                      ctx.beginPath(); ctx.arc(0, 0, p.size*0.6, 0, Math.PI*2); ctx.fill();
                  } else if (p.type > 0.6) {
                      const flap = Math.abs(Math.sin(time * 0.02 + i));
                      ctx.scale(flap, 1);
                      ctx.fillStyle = `rgba(186, 230, 253, ${p.life})`; 
                      ctx.beginPath();
                      ctx.ellipse(p.size, 0, p.size, p.size*1.5, Math.PI/4, 0, Math.PI*2); ctx.fill(); 
                      ctx.beginPath(); ctx.ellipse(-p.size, 0, p.size, p.size*1.5, -Math.PI/4, 0, Math.PI*2); ctx.fill();
                  } else {
                      ctx.fillStyle = `rgba(255, 255, 255, ${p.life})`;
                      ctx.beginPath(); ctx.arc(0, 0, p.size*0.8, 0, Math.PI*2); ctx.fill();
                  }
                  ctx.restore();
              });
              
              const eternalGrad = ctx.createRadialGradient(x, y - radius + floatY, 0, x, y - radius + floatY, radius * 5);
              eternalGrad.addColorStop(0, 'rgba(255, 255, 255, 1)'); 
              eternalGrad.addColorStop(0.3, 'rgba(96, 165, 250, 0.6)'); 
              eternalGrad.addColorStop(0.7, 'rgba(30, 27, 75, 0.2)'); 
              eternalGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
              ctx.fillStyle = eternalGrad; ctx.beginPath(); ctx.arc(x, y - radius + floatY, radius * 5, 0, Math.PI * 2); ctx.fill();
          }

          ctx.restore();






      };
      const p1Aes = getSkinAesthetics(eng.p?.skin, false);
      const p2Aes = getSkinAesthetics(eng.p2?.skin, true);

      const p1Color = p1Aes.c; 
      const p2Color = p2Aes.c; 

      const net = netRef.current || {};
      const isCoopActive = Boolean(net.channel);
      const isHost = Boolean(net.isHost) || !isCoopActive;

      const p1X = isHost ? (eng.p ? eng.p.x : W/3) : eng.p1Render.x;
      const p1Y = isHost ? (eng.p ? eng.p.y : H/2) : eng.p1Render.y;
      const p2X = (isCoopActive && !isHost && eng.p2Render) ? eng.p2Render.x : (eng.p2 ? eng.p2.x : W*2/3);
      const p2Y = (isCoopActive && !isHost && eng.p2Render) ? eng.p2Render.y : (eng.p2 ? eng.p2.y : H/2);
      
      // --- DRAW PLAYER 1 ---
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

        drawAdvancedSkinAura(p1X, p1Y, pr, eng.p.skin);

        const p1AuraCounts = getEquipCounts(eng.p);
        drawEquipAura(p1X, p1Y, pr, p1AuraCounts);

        ctx.shadowColor = fl ? '#fff' : p1Aes.glow; 
        ctx.shadowBlur = 22; ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(p1X, p1Y + 3, pr, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        
        if (eng.p.skills?.shield?.duration > 0 && eng.p.skills?.shield?.enabled !== false) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 3; ctx.shadowBlur = 15; ctx.shadowColor = '#38bdf8';
          ctx.beginPath();
          ctx.arc(p1X, p1Y + 3, pr + 10, 0, Math.PI * 2); ctx.stroke(); ctx.shadowBlur = 0;
        }
        if (eng.p.skills?.berserk?.duration > 0 && eng.p.skills?.berserk?.enabled !== false) {
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2; ctx.beginPath();
          ctx.arc(p1X, p1Y + 3, pr + 5, 0, Math.PI * 2); ctx.stroke();
        }

        // Custom Wizard Robe at Hat
        ctx.fillStyle = fl ? '#b91c1c' : p1Aes.robe; 
        ctx.beginPath();
        ctx.moveTo(p1X, p1Y - pr * 1.8); ctx.lineTo(p1X + pr * 0.9, p1Y - pr * 0.2);
        ctx.lineTo(p1X - pr * 0.9, p1Y - pr * 0.2); ctx.closePath(); ctx.fill();
        
        ctx.fillStyle = fl ? '#fca5a5' : p1Aes.brim; 
        ctx.beginPath();
        ctx.ellipse(p1X, p1Y - pr * 0.2, pr * 1.15, pr * 0.28, 0, 0, Math.PI * 2); ctx.fill();
        
        ctx.fillStyle = '#030111'; ctx.beginPath(); ctx.arc(p1X - pr * 0.32, p1Y + 2, pr * 0.18, 0, Math.PI * 2);
        ctx.arc(p1X + pr * 0.32, p1Y + 2, pr * 0.18, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        
        if (eng.p.chatBubble && eng.p.chatBubble.life > 0) {
          renderRpgChatBubble(p1X, p1Y, eng.p.chatBubble.text);
        }

if (eng.p.divineShield && eng.p.divineShield.active) {
              ctx.save();
              const dt = 0.016; // 🔧 FIX: Idinagdag ang dt dito!
              const sTime = performance.now() * 0.002;
              const shieldHealthPct = Math.max(0, eng.p.divineShield.hp / eng.p.divineShield.maxHp);
              
              // =======================================================
              // ⏱️ DITO ILALAGAY ANG TIMER AT PAGKASIRA NG SHIELD
              // =======================================================
              if (eng.p.divineShield.duration !== undefined) {
                  
                  // 🔥 KAPAG UBOS NA ANG ORAS, KUSANG MAWAWALA ANG SHIELD!
                  if (eng.p.divineShield.duration <= 0) {
                      eng.p.divineShield.active = false;
                      
                      // Mag-trigger ng magandang shatter explosion kapag nag-expire
                      for(let k=0; k<20; k++) {
                          const pa = Math.random() * Math.PI * 2;
                          const ps = Math.random() * 150 + 50;
                          eng.particles.push({ x: p1X, y: p1Y, vx: Math.cos(pa)*ps, vy: Math.sin(pa)*ps, color: 'rgba(254, 240, 138, 0.5)', life: 0.5, ml: 0.5, r: Math.random()*2+1 });
                      }
                  }
              }
              // =======================================================

              if (eng.p.divineShield && eng.p.divineShield.hitFlash > 0) {
                  eng.p.divineShield.hitFlash -= dt;
                  ctx.globalCompositeOperation = 'lighter';
              }
              
              // 1. Golden Shield Aura
              ctx.fillStyle = `rgba(254, 240, 138, ${0.1 + Math.sin(sTime) * 0.05})`;
              ctx.shadowBlur = 30; ctx.shadowColor = '#fde047';
              ctx.beginPath(); ctx.arc(p1X, p1Y, pr + 18, 0, Math.PI * 2); ctx.fill();

              // 2. Rotating Runes
              ctx.strokeStyle = `rgba(250, 204, 21, ${0.6 + (eng.p.divineShield.hitFlash > 0 ? 0.4 : 0)})`;
              ctx.lineWidth = 2; ctx.setLineDash([10, 15]); ctx.lineDashOffset = -sTime * 20;
              ctx.beginPath(); ctx.arc(p1X, p1Y, pr + 22, 0, Math.PI * 2); ctx.stroke();
              ctx.setLineDash([]);

              // 3. Ethereal Angel Wings
              const wingFlap = Math.sin(sTime * 2) * 0.2;
              ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'; ctx.shadowBlur = 15; ctx.shadowColor = '#ffffff';
              for(let w = -1; w <= 1; w+=2) {
                  ctx.save(); ctx.translate(p1X, p1Y - 5); ctx.scale(w, 1); ctx.rotate(0.2 + wingFlap);
                  ctx.beginPath(); ctx.moveTo(pr, 0); ctx.quadraticCurveTo(pr + 25, -25, pr + 35, -5); ctx.quadraticCurveTo(pr + 20, 15, pr, 10); ctx.fill(); ctx.restore();
              }

              // 4. Cracks Kapag Paubos Na
              if (shieldHealthPct < 0.5) {
                  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'; ctx.lineWidth = 1.5; ctx.beginPath();
                  ctx.moveTo(p1X - pr - 10, p1Y); ctx.lineTo(p1X - pr - 5, p1Y - 10); ctx.lineTo(p1X, p1Y - 15); ctx.stroke();
              }
              
              // 5. 🛡️ FLOATING SHIELD HP INDICATOR BAR UI
              ctx.shadowBlur = 0; 
              const barWidth = 60;
              const barHeight = 6;
              const uiY = p1Y - pr - 35;

              ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
              ctx.beginPath(); ctx.roundRect(p1X - barWidth/2, uiY, barWidth, barHeight, 3); ctx.fill();

              ctx.fillStyle = '#fde047'; 
              ctx.shadowBlur = 8; ctx.shadowColor = '#eab308';
              ctx.beginPath(); ctx.roundRect(p1X - barWidth/2, uiY, barWidth * shieldHealthPct, barHeight, 3); ctx.fill();
              
              ctx.shadowBlur = 0;
              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 11px monospace';
              ctx.textAlign = 'center';
              ctx.fillText(`🛡️ ${Math.ceil(eng.p.divineShield.hp)}`, p1X, uiY - 5);

              ctx.restore();
          }

      }

      // --- DRAW PLAYER 2 ---
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

        drawAdvancedSkinAura(p2X, p2Y, pr, eng.p2.skin);

        const p2AuraCounts = getEquipCounts(eng.p2);
        drawEquipAura(p2X, p2Y, pr, p2AuraCounts);

        ctx.shadowColor = fl ? '#fff' : p2Aes.glow; 
        ctx.shadowBlur = 22; ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(p2X, p2Y + 3, pr, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        
        if (eng.p2.skills?.shield?.duration > 0 && eng.p2.skills?.shield?.enabled !== false) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 3; ctx.shadowBlur = 15; ctx.shadowColor = '#38bdf8';
          ctx.beginPath();
          ctx.arc(p2X, p2Y + 3, pr + 10, 0, Math.PI * 2); ctx.stroke(); ctx.shadowBlur = 0;
        }
        if (eng.p2.skills?.berserk?.duration > 0 && eng.p2.skills?.berserk?.enabled !== false) {
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2; ctx.beginPath();
          ctx.arc(p2X, p2Y + 3, pr + 5, 0, Math.PI * 2); ctx.stroke();
        }

        // Custom Wizard Robe at Hat (P2)
        ctx.fillStyle = fl ? '#b91c1c' : p2Aes.robe; 
        ctx.beginPath();
        ctx.moveTo(p2X, p2Y - pr * 1.8); ctx.lineTo(p2X + pr * 0.9, p2Y - pr * 0.2);
        ctx.lineTo(p2X - pr * 0.9, p2Y - pr * 0.2); ctx.closePath(); ctx.fill();
        
        ctx.fillStyle = fl ? '#fca5a5' : p2Aes.brim; 
        ctx.beginPath();
        ctx.ellipse(p2X, p2Y - pr * 0.2, pr * 1.15, pr * 0.28, 0, 0, Math.PI * 2); ctx.fill();
        
        ctx.fillStyle = '#030111'; ctx.beginPath(); ctx.arc(p2X - pr * 0.32, p2Y + 2, pr * 0.18, 0, Math.PI * 2);
        ctx.arc(p2X + pr * 0.32, p2Y + 2, pr * 0.18, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        
        if (eng.p2.chatBubble && eng.p2.chatBubble.life > 0) {
          renderRpgChatBubble(p2X, p2Y, eng.p2.chatBubble.text);
        }

// 👼 HOLY SERAPH: DIVINE ABSORPTION SHIELD UI (PLAYER 2)
          if (eng.p2.divineShield && eng.p2.divineShield.active) {
              ctx.save();
              const dt = 0.016; 
              const sTime = performance.now() * 0.002;
              const shieldHealthPct = Math.max(0, eng.p2.divineShield.hp / eng.p2.divineShield.maxHp);
              
              // ⏱️ TIMER SYSTEM PARA KAY PLAYER 2
              if (eng.p2.divineShield.duration !== undefined) {
                  eng.p2.divineShield.duration -= dt;
                  if (eng.p2.divineShield.duration <= 0) {
                      eng.p2.divineShield.active = false;
                      // Shatter Effect sa Player 2
                      for(let k=0; k<20; k++) {
                          const pa = Math.random() * Math.PI * 2;
                          const ps = Math.random() * 150 + 50;
                          eng.particles.push({ x: p2X, y: p2Y, vx: Math.cos(pa)*ps, vy: Math.sin(pa)*ps, color: 'rgba(254, 240, 138, 0.5)', life: 0.5, ml: 0.5, r: Math.random()*2+1 });
                      }
                  }
              }

              if (eng.p2.divineShield.hitFlash > 0) {
                  eng.p2.divineShield.hitFlash -= dt;
                  ctx.globalCompositeOperation = 'lighter';
              }
              
              // 1. Golden Shield Aura
              ctx.fillStyle = `rgba(254, 240, 138, ${0.1 + Math.sin(sTime) * 0.05})`;
              ctx.shadowBlur = 30; ctx.shadowColor = '#fde047';
              ctx.beginPath(); ctx.arc(p2X, p2Y, pr + 18, 0, Math.PI * 2); ctx.fill();

              // 2. Rotating Runes
              ctx.strokeStyle = `rgba(250, 204, 21, ${0.6 + (eng.p2.divineShield.hitFlash > 0 ? 0.4 : 0)})`;
              ctx.lineWidth = 2; ctx.setLineDash([10, 15]); ctx.lineDashOffset = -sTime * 20;
              ctx.beginPath(); ctx.arc(p2X, p2Y, pr + 22, 0, Math.PI * 2); ctx.stroke();
              ctx.setLineDash([]);

              // 3. Ethereal Angel Wings (P2)
              const wingFlap = Math.sin(sTime * 2) * 0.2;
              ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'; ctx.shadowBlur = 15; ctx.shadowColor = '#ffffff';
              for(let w = -1; w <= 1; w+=2) {
                  ctx.save(); ctx.translate(p2X, p2Y - 5); ctx.scale(w, 1); ctx.rotate(0.2 + wingFlap);
                  ctx.beginPath(); ctx.moveTo(pr, 0); ctx.quadraticCurveTo(pr + 25, -25, pr + 35, -5); ctx.quadraticCurveTo(pr + 20, 15, pr, 10); ctx.fill(); ctx.restore();
              }

              // 4. Cracks (P2)
              if (shieldHealthPct < 0.5) {
                  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'; ctx.lineWidth = 1.5; ctx.beginPath();
                  ctx.moveTo(p2X - pr - 10, p2Y); ctx.lineTo(p2X - pr - 5, p2Y - 10); ctx.lineTo(p2X, p2Y - 15); ctx.stroke();
              }

              // 5. 🛡️ FLOATING SHIELD HP INDICATOR BAR UI (P2)
              ctx.shadowBlur = 0; 
              const barWidth = 60;
              const barHeight = 6;
              const uiY = p2Y - pr - 35; // Lumulutang sa itaas ng ulo ni Player 2

              // Background ng Bar (Dark)
              ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
              ctx.beginPath(); ctx.roundRect(p2X - barWidth/2, uiY, barWidth, barHeight, 3); ctx.fill();

              // Foreground ng Bar (Golden HP)
              ctx.fillStyle = '#fde047'; 
              ctx.shadowBlur = 8; ctx.shadowColor = '#eab308';
              ctx.beginPath(); ctx.roundRect(p2X - barWidth/2, uiY, barWidth * shieldHealthPct, barHeight, 3); ctx.fill();
              
              // Text Value ng Shield (Hal: 🛡️ 1000)
              ctx.shadowBlur = 0;
              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 11px monospace';
              ctx.textAlign = 'center';
              ctx.fillText(`🛡️ ${Math.ceil(eng.p2.divineShield.hp)}`, p2X, uiY - 5);

              ctx.restore();
          }

      }

// 🔥 FAMILIAR RENDERER (NOW LOOPING THROUGH ARRAY)
const renderFamiliars = (pObj) => {
  if (!pObj || !pObj.familiars || pObj.dead) return;
  
  pObj.familiars.forEach(f => {
    const t = performance.now();
    ctx.save();
    ctx.translate(f.x, f.y);

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
      ctx.shadowBlur = 20; ctx.shadowColor = '#a855f7';
      ctx.strokeStyle = 'rgba(217, 70, 239, 0.8)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(0, float, 12, 4 + Math.sin(t*0.01)*2, t*0.002, 0, Math.PI*2); ctx.stroke();
      ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(0, float, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f472b6'; ctx.beginPath(); ctx.ellipse(0, float, 3, 5, 0, 0, Math.PI*2); ctx.fill();
      if (f.level >= 5) {
        ctx.strokeStyle = 'rgba(192, 132, 252, 0.5)'; ctx.beginPath(); ctx.arc(0, float, 18, 0, Math.PI*2); ctx.stroke();
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
  // ⚡ THUNDER SOVEREIGN — Full cinematic lightning entity
  const pulse  = Math.sin(t * 0.08) * 2;
  const flicker = Math.sin(t * 0.22) * 0.5 + 0.5; // fast intensity flicker

  // Helper: draw one jagged lightning bolt between two points
  const drawBolt = (x1, y1, x2, y2, segs, spread, color, lw, alpha) => {
    const pts = [{ x: x1, y: y1 }];
    for (let s = 1; s < segs; s++) {
      const frac = s / segs;
      const px = x1 + (x2 - x1) * frac + (Math.random() - 0.5) * spread;
      const py = y1 + (y2 - y1) * frac + (Math.random() - 0.5) * spread;
      pts.push({ x: px, y: py });
    }
    pts.push({ x: x2, y: y2 });
    // Outer glow pass
    ctx.strokeStyle = color.replace(')', `, ${alpha * 0.35})`).replace('rgb', 'rgba');
    ctx.lineWidth = lw * 3.5;
    ctx.beginPath();
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.stroke();
    // Core bright pass
    ctx.strokeStyle = color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
    ctx.lineWidth = lw;
    ctx.beginPath();
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.stroke();
  };

  // ── LAYER 0: AMBIENT SURGE CORONA ──────────────────────────────────────
  // Wide electric aura — pale violet-white wash
  const coronaR = 26 + pulse;
  const coronaGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, coronaR);
  coronaGrad.addColorStop(0,   `rgba(240,200,255,${0.28 + flicker * 0.12})`);
  coronaGrad.addColorStop(0.5, `rgba(180,100,255,${0.14 + flicker * 0.06})`);
  coronaGrad.addColorStop(1,   'rgba(100,20,200,0)');
  ctx.fillStyle = coronaGrad;
  ctx.beginPath();
  ctx.arc(0, 0, coronaR, 0, Math.PI * 2);
  ctx.fill();

  // ── LAYER 1: GROUND CHARGE SURGE PATH ──────────────────────────────────
  // Tendrils reaching downward like ground contact static
  if (Math.random() < 0.55) {
    const surgeCount = 2 + Math.floor(Math.random() * 2);
    for (let s = 0; s < surgeCount; s++) {
      const sx = (Math.random() - 0.5) * 14;
      const sy = 10 + Math.random() * 6;
      const ex = sx + (Math.random() - 0.5) * 18;
      const ey = sy + 10 + Math.random() * 10;
      drawBolt(sx, sy, ex, ey, 4, 4, 'rgb(200,140,255)', 0.9, 0.7 + flicker * 0.25);
    }
  }

  // ── LAYER 2: SMOKE / OZONE WISPS (semi-opaque dark puffs) ───────────────
  const smokePhase = (t * 0.018) % (Math.PI * 2);
  for (let sm = 0; sm < 5; sm++) {
    const sa  = smokePhase + sm * 1.26;
    const sr  = 14 + sm * 2.5;
    const sx  = Math.cos(sa) * sr * 0.6 + Math.sin(t * 0.031 + sm) * 3;
    const sy  = Math.sin(sa) * sr * 0.4 - 5 + sm * 1.8;
    const ss  = 3 + sm * 1.2;
    const smokeAlpha = 0.10 + (sm / 5) * 0.08;
    const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, ss);
    sg.addColorStop(0,   `rgba(60,10,80,${smokeAlpha})`);
    sg.addColorStop(0.6, `rgba(100,30,120,${smokeAlpha * 0.5})`);
    sg.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(sx, sy, ss, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── LAYER 3: REMNANT LIGHTNING ARCS around the body ─────────────────────
  // These are the "daan" / path marks — like after-images of where lightning passed
  const arcCount = 3 + (f.level >= 5 ? 2 : 0);
  for (let a = 0; a < arcCount; a++) {
    if (Math.random() < 0.5) continue; // Flicker effect
    const arcAngle = (a / arcCount) * Math.PI * 2 + t * 0.015;
    const arcR1 = 10 + Math.random() * 4;
    const arcR2 = 18 + Math.random() * 8;
    const ax1 = Math.cos(arcAngle) * arcR1;
    const ay1 = Math.sin(arcAngle) * arcR1;
    const ax2 = Math.cos(arcAngle + 0.6) * arcR2;
    const ay2 = Math.sin(arcAngle + 0.6) * arcR2;
    const arcAlpha = 0.45 + flicker * 0.35;
    drawBolt(ax1, ay1, ax2, ay2, 3, 5, 'rgb(220,180,255)', 0.8, arcAlpha);
  }

  // ── LAYER 4: ELECTRIC WINGS (level 10) ──────────────────────────────────
  if (f.level >= 10) {
    const flap = Math.cos(t * 0.12) * 5;
    // Draw wing as multiple micro-bolt segments — feels alive
    const wingSegs = [
      [[-4, 0], [-14, -10 - flap], [-11, -5 - flap], [-22, 0 - flap]],
      [[-4, 0], [-16, -6 - flap], [-13, 2 - flap]],
      [[4, 0],  [14, -10 - flap], [11, -5 - flap],  [22, 0 - flap]],
      [[4, 0],  [16, -6 - flap],  [13, 2 - flap]],
    ];
    wingSegs.forEach((pts, wi) => {
      // Glow layer
      ctx.strokeStyle = `rgba(240,180,255,${0.25 + flicker * 0.1})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      pts.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
      ctx.stroke();
      // Core
      ctx.strokeStyle = `rgba(255,230,255,${0.7 + flicker * 0.25})`;
      ctx.lineWidth = wi % 2 === 0 ? 1.5 : 1;
      ctx.beginPath();
      pts.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
      ctx.stroke();
    });
  }

  // ── LAYER 5: LIGHTNING HORNS ──────────────────────────────────────────
  // Glowing jagged horns instead of plain fill
  ctx.shadowBlur = 10 + flicker * 6;
  ctx.shadowColor = '#e879f9';
  ctx.fillStyle = `rgba(253,240,255,${0.85 + flicker * 0.12})`;
  // Left Horn — main shard
  ctx.beginPath();
  ctx.moveTo(-3, -6); ctx.lineTo(-7, -13); ctx.lineTo(-4, -15);
  ctx.lineTo(-9, -22); ctx.lineTo(-1, -9); ctx.fill();
  // Left Horn — micro branch
  ctx.beginPath();
  ctx.moveTo(-6, -12); ctx.lineTo(-11, -16); ctx.lineTo(-8, -10); ctx.fill();
  // Right Horn
  ctx.beginPath();
  ctx.moveTo(3, -6); ctx.lineTo(7, -13); ctx.lineTo(4, -15);
  ctx.lineTo(9, -22); ctx.lineTo(1, -9); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(6, -12); ctx.lineTo(11, -16); ctx.lineTo(8, -10); ctx.fill();
  ctx.shadowBlur = 0;

  // ── LAYER 6: DEMON BODY ────────────────────────────────────────────────
  // Dark mecha-demon core with electric edge highlight
  ctx.shadowBlur = 12;
  ctx.shadowColor = '#a855f7';
  ctx.fillStyle = '#4a0264'; // Very dark purple
  ctx.beginPath();
  ctx.moveTo(0, -9); ctx.lineTo(8, -2); ctx.lineTo(5, 9);
  ctx.lineTo(0, 13); ctx.lineTo(-5, 9); ctx.lineTo(-8, -2);
  ctx.closePath();
  ctx.fill();
  // Edge highlight — thin electric rim
  ctx.strokeStyle = `rgba(232,121,249,${0.55 + flicker * 0.3})`;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // ── LAYER 7: DEMON EYES ───────────────────────────────────────────────
  // Bright slit eyes with inner glow
  ctx.shadowBlur = 8 + flicker * 5;
  ctx.shadowColor = '#f0abfc';
  ctx.fillStyle = `rgba(253,244,255,${0.9 + flicker * 0.1})`;
  ctx.beginPath();
  ctx.moveTo(-2.5, -0.5); ctx.lineTo(-6.5, -2.5); ctx.lineTo(-2.5, 1.5); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(2.5, -0.5); ctx.lineTo(6.5, -2.5); ctx.lineTo(2.5, 1.5); ctx.fill();
  // Inner hot-white core of eyes
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(-4.2, -0.8, 0.9, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(4.2, -0.8, 0.9, 0, Math.PI*2); ctx.fill();
  ctx.shadowBlur = 0;

  // ── LAYER 8: ROTATING ELECTRON ORBIT HALO (Level 5+) ─────────────────
  if (f.level >= 5) {
    ctx.save();
    ctx.rotate(t * 0.025);
    ctx.strokeStyle = `rgba(217,70,239,${0.65 + flicker * 0.25})`;
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#d946ef';
    ctx.beginPath(); ctx.ellipse(0, 0, 17, 5, 0, 0, Math.PI*2); ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.rotate(-t * 0.018);
    ctx.strokeStyle = `rgba(167,139,250,${0.5 + flicker * 0.2})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(0, 0, 17, 5, Math.PI/2.5, 0, Math.PI*2); ctx.stroke();
    ctx.restore();
    ctx.shadowBlur = 0;
  }

  // ── LAYER 9: KINETIC LIGHTNING STRIKES around body (level 10) ─────────
  if (f.level >= 10) {
    const strikeCount = Math.floor(Math.random() * 3) + 1;
    for (let str = 0; str < strikeCount; str++) {
      if (Math.random() > 0.45) continue;
      const sAngle = Math.random() * Math.PI * 2;
      const sStart = 5 + Math.random() * 5;
      const sEnd   = 18 + Math.random() * 16;
      const sx1 = Math.cos(sAngle) * sStart;
      const sy1 = Math.sin(sAngle) * sStart;
      const sx2 = Math.cos(sAngle + (Math.random()-0.5)*1.2) * sEnd;
      const sy2 = Math.sin(sAngle + (Math.random()-0.5)*1.2) * sEnd;
      drawBolt(sx1, sy1, sx2, sy2, 5, 6, 'rgb(255,255,255)', 1.5, 0.9);
    }
  }

  // ── LAYER 10: MICRO STATIC SPARKS always firing ──────────────────────
  if (Math.random() < 0.7) {
    const sparkX = (Math.random() - 0.5) * 24;
    const sparkY = (Math.random() - 0.5) * 24;
    ctx.strokeStyle = `rgba(255,240,255,${0.6 + Math.random() * 0.35})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(sparkX, sparkY);
    ctx.lineTo(sparkX + (Math.random()-0.5)*8, sparkY + (Math.random()-0.5)*8);
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
  });
};

renderFamiliars(eng.p);
if (isCoopActive && eng.p2) renderFamiliars(eng.p2);

// ==============================================================================
// 💥 FLOATING COMBAT TEXT RENDERER (RO STYLE)
// ==============================================================================
if (eng.floatingTexts) {
  ctx.save();
  for (const ft of eng.floatingTexts) {
    // Fade out nang makinis sa huling 0.5 seconds
    const alpha = Math.max(0, Math.min(1, ft.life / 0.5)); 
    ctx.globalAlpha = alpha;
    
    // Bounce / Pop Scale Effect sa unang litaw
    const popScale = ft.life > 0.8 ? 1 + (ft.life - 0.8) * 2.5 : 1; 

    ctx.save();
    ctx.translate(ft.x, ft.y);
    ctx.scale(popScale, popScale);

    if (ft.type === 'damage') {
      ctx.fillStyle = ft.isCrit ? '#fde047' : '#ffffff'; // Gold pag crit, White pag normal
      ctx.font = ft.isCrit ? '900 16px monospace' : 'bold 11px monospace';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.5;
    } else if (ft.type === 'damageTaken') {
      ctx.fillStyle = '#ef4444'; // Red
      ctx.font = 'bold 13px monospace';
      ctx.strokeStyle = '#450a0a';
      ctx.lineWidth = 2.5;
    } else if (ft.type === 'heal') {
      ctx.fillStyle = '#4ade80'; // Green
      ctx.font = 'bold 13px monospace';
      ctx.strokeStyle = '#064e3b';
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#4ade80';
    } else if (ft.type === 'shield') {
      ctx.fillStyle = '#38bdf8'; // Cyan
      ctx.font = 'bold 11px monospace';
      ctx.strokeStyle = '#082f49';
      ctx.lineWidth = 2.5;
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Balangkas at mismong sulat ng number
    ctx.strokeText(ft.text, 0, 0);
    ctx.fillText(ft.text, 0, 0);

    // 🔥 DITO IPAPASOK ANG "Critical!" TEXT
    if (ft.isCrit) {
      // Tanggalin pansamantala ang shadow effect para malinis tingnan ang font
      ctx.shadowBlur = 0; 
      
      ctx.font = 'italic 10px sans-serif'; // Maliit at italic
      ctx.fillStyle = '#f87171'; // Red/Orange color
      ctx.lineWidth = 2; // Manipis na outline
      ctx.strokeStyle = '#000000';
      
      // I-offset nang paakyat (-14) para nasa ibabaw ng number
      ctx.strokeText("Critical!", 0, -14);
      ctx.fillText("Critical!", 0, -14);
    }

    ctx.restore(); // Tapos na i-render itong isang text
  }
  ctx.restore(); // Ibabalik sa normal ang buong context
}

// ==============================================================================
      // 🔥 UPDATED STEP 4: INTENSE & SCARY CINEMATIC BOSS INTRO EFFECTS
      // ==============================================================================
      if (eng.bossIntro && eng.bossIntro.active) {
  const t = eng.bossIntro.timer;
  const maxT = eng.bossIntro.maxDuration;
  const ctx = canvasRef.current.getContext('2d');
  const W = canvasRef.current.width;
  const H = canvasRef.current.height;
  const prog = 1 - (t / maxT); // 0→1 as intro plays forward

  const ease = (x) => x < 0.5 ? 2 * x * x : -1 + (4 - 2 * x) * x;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const lerp = (a, b, x) => a + (b - a) * x;

  // 🔥 INITIALIZE PERSISTENT STATE ONCE
  if (!eng.bossIntro._runes) {
    const RUNE_CHARS = ['ᚠ','ᚢ','ᚦ','ᚨ','ᚱ','ᚲ','ᚷ','ᚹ','ᚾ','ᛁ','ᛃ','ᛇ','ᛈ','ᛉ','ᛊ','ᛏ','ᛒ','ᛖ','ᛗ','ᛚ','ᛜ','ᛞ','ᛟ'];
    const ANCIENT_SIGILS = ['✦','✧','⋆','◈','◇','⬡','⬢','⌬','⏣','⎔'];
    
    // Floating Background Runes
    eng.bossIntro._runes = Array.from({length: 30}, () => ({
      x: Math.random() * W, y: Math.random() * H,
      char: RUNE_CHARS[Math.floor(Math.random() * RUNE_CHARS.length)],
      size: 14 + Math.random() * 20,
      phase: Math.random() * Math.PI * 2,
      speed: 0.012 + Math.random() * 0.018,
      drift: (Math.random() - 0.5) * 0.4,
      vy: -0.15 - Math.random() * 0.3,
    }));
    
    // Magic Circle Static Runes (Pre-calculated for performance)
    eng.bossIntro._circleRunes = Array.from({length: 16}, (_, i) => ({
      char: RUNE_CHARS[i % RUNE_CHARS.length],
      ang: (i / 16) * Math.PI * 2
    }));
    
    eng.bossIntro._circleSigils = Array.from({length: 8}, (_, i) => ({
      char: ANCIENT_SIGILS[i % ANCIENT_SIGILS.length],
      ang: (i / 8) * Math.PI * 2
    }));

    eng.bossIntro._particles = [];
  }

  const _runes = eng.bossIntro._runes;
  const _circleRunes = eng.bossIntro._circleRunes;
  const _circleSigils = eng.bossIntro._circleSigils;
  const _particles = eng.bossIntro._particles;
  const frameN = maxT - t; // frame counter

  ctx.save();

  // 💥 SCREEN SHAKE (Peaks when boss name reveals)
  let shakeX = 0, shakeY = 0;
  if (prog >= 0.50 && prog <= 0.70) {
      const shakeIntensity = Math.sin((prog - 0.50) * Math.PI * 5) * 4;
      shakeX = (Math.random() - 0.5) * shakeIntensity;
      shakeY = (Math.random() - 0.5) * shakeIntensity;
      ctx.translate(shakeX, shakeY);
  }

  // --- BACKGROUND ---
  ctx.fillStyle = '#050408';
  ctx.fillRect(0, 0, W, H);

  // --- OMINOUS INK BLEED (0–30%) ---
  if (prog < 0.35) {
    const inkR = ease(prog / 0.35) * Math.hypot(W, H) * 0.75;
    const g = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, inkR);
    g.addColorStop(0,   `rgba(38, 14, 28, ${prog / 0.35})`); // Deep Crimson Core
    g.addColorStop(0.5, `rgba(18, 14, 38, ${(prog / 0.35) * 0.85})`); // Dark Violet
    g.addColorStop(1,   'rgba(5, 4, 8, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // --- FLOATING BACKGROUND RUNES (10–55%) ---
  if (prog >= 0.10) {
    const rT = clamp((prog - 0.10) / 0.45, 0, 1);
    const fadeOut = prog > 0.45 ? 1 - clamp((prog - 0.45)/0.1, 0, 1) : 1;
    
    _runes.forEach(r => {
      r.y += r.vy; r.x += r.drift;
      const alpha = clamp(rT * 1.4, 0, 0.45) * fadeOut;
      const pulse = 0.3 + Math.abs(Math.sin(frameN * r.speed + r.phase)) * 0.7;
      
      ctx.save();
      ctx.globalAlpha = alpha * pulse;
      ctx.font = `${r.size}px serif`;
      ctx.fillStyle = Math.random() > 0.8 ? '#ff3366' : '#6b60a0'; // Rare red runes
      ctx.shadowBlur = 10;
      ctx.shadowColor = ctx.fillStyle;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(r.char, r.x, r.y);
      ctx.restore();
    });
  }

  // --- COMPLEX ANCIENT MAGIC CIRCLE (25–75%) ---
  if (prog >= 0.25 && prog <= 0.85) {
    const circT = clamp((prog - 0.25) / 0.30, 0, 1);
    const fadeOut = prog > 0.70 ? 1 - clamp((prog - 0.70) / 0.15, 0, 1) : 1;
    
    ctx.save();
    ctx.globalAlpha = ease(clamp(circT * 2, 0, 1)) * fadeOut * 0.75;
    ctx.translate(W/2, H/2);
    
    // Core glow
    const coreGlow = ctx.createRadialGradient(0,0,0, 0,0, 150);
    coreGlow.addColorStop(0, 'rgba(122, 111, 168, 0.2)');
    coreGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = coreGlow;
    ctx.beginPath(); ctx.arc(0,0,150,0,Math.PI*2); ctx.fill();

    // Outer Rotating Latin Text
    ctx.save();
    ctx.rotate(frameN * 0.003);
    ctx.font = "bold 10px monospace";
    ctx.fillStyle = '#b8a8e0';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const spellText = "TENEBRAE · SURGUNT · ABYSSUS · INVOCAT · FATUM · MORTIS · ";
    for(let i = 0; i < spellText.length; i++) {
        const a = (i / spellText.length) * Math.PI * 2;
        ctx.save();
        ctx.translate(Math.cos(a) * 145, Math.sin(a) * 145);
        ctx.rotate(a + Math.PI/2);
        ctx.fillText(spellText[i], 0, 0);
        ctx.restore();
    }
    ctx.restore();

    // Middle Dashed Ring with Runes
    ctx.save();
    ctx.rotate(-frameN * 0.005);
    ctx.strokeStyle = '#9b8ec4'; 
    ctx.lineWidth = 1.5;
    ctx.setLineDash([15, 10]);
    ctx.beginPath(); ctx.arc(0, 0, 125, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    
    ctx.font = '14px serif';
    ctx.fillStyle = '#e8e0f4';
    _circleRunes.forEach(r => {
        ctx.save();
        ctx.translate(Math.cos(r.ang) * 125, Math.sin(r.ang) * 125);
        ctx.rotate(r.ang + Math.PI/2);
        ctx.fillText(r.char, 0, 0);
        ctx.restore();
    });
    ctx.restore();

    // Inner Hexagram and Sigils
    ctx.save();
    ctx.rotate(frameN * 0.008);
    ctx.strokeStyle = '#7a6fa8'; 
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(0, 0, 85, 0, Math.PI * 2); ctx.stroke();
    
    // Hexagram
    ctx.beginPath();
    for(let i=0; i<6; i++) {
      const a = (i/6)*Math.PI*2 - Math.PI/2;
      i===0 ? ctx.moveTo(Math.cos(a)*85, Math.sin(a)*85) : ctx.lineTo(Math.cos(a)*85, Math.sin(a)*85);
    }
    ctx.closePath(); ctx.stroke();
    
    // Sigils at nodes
    ctx.font = '16px serif';
    ctx.fillStyle = '#ff6688'; // Menacing red accent
    _circleSigils.forEach(s => {
        ctx.fillText(s.char, Math.cos(s.ang) * 60, Math.sin(s.ang) * 60);
    });
    ctx.restore();

    ctx.restore();
  }

  // --- MANA PARTICLES (30–82%) ---
  if (prog >= 0.3 && prog <= 0.82 && frameN % 2 === 0) { // Spawns faster
    for (let i = 0; i < 3; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 40 + Math.random() * 200;
      _particles.push({
        x: W/2 + Math.cos(angle)*r, y: H/2 + Math.sin(angle)*r,
        vx: (Math.random() - 0.5) * 0.6, vy: -0.5 - Math.random() * 0.8,
        life: 1, decay: 0.01 + Math.random() * 0.015,
        size: 1.5 + Math.random() * 2.5, silver: Math.random() > 0.5
      });
    }
  }
  
  eng.bossIntro._particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life -= p.decay; });
  eng.bossIntro._particles = _particles.filter(p => p.life > 0);
  
  _particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.life * 0.85;
    ctx.fillStyle = p.silver ? '#e8e0f4' : '#9b8ec4';
    ctx.shadowBlur = 8;
    ctx.shadowColor = ctx.fillStyle;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  });

  // --- CINEMATIC BARS (20–100%) ---
  const barH = ease(clamp((prog - 0.20) / 0.12, 0, 1)) * H * 0.145;
  ctx.fillStyle = '#030205';
  ctx.fillRect(0, 0, W, barH);
  ctx.fillRect(0, H - barH, W, barH);
  if (barH > 4) {
    ctx.strokeStyle = 'rgba(122, 111, 168, 0.3)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, barH); ctx.lineTo(W, barH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, H - barH); ctx.lineTo(W, H - barH); ctx.stroke();
    
    // Add tiny corner runes to cinematic borders
    ctx.fillStyle = 'rgba(122, 111, 168, 0.5)';
    ctx.font = '12px serif';
    ctx.fillText('⌬', 20, barH - 8); ctx.fillText('⌬', W - 30, barH - 8);
    ctx.fillText('⎔', 20, H - barH + 16); ctx.fillText('⎔', W - 30, H - barH + 16);
  }

  // --- SCAN LINE (45–60%) ---
  const scanT = clamp((prog - 0.45) / 0.15, 0, 1);
  if (scanT > 0 && scanT < 1) {
    ctx.save();
    ctx.globalAlpha = 0.4 * (1 - Math.abs(scanT - 0.5) * 2);
    ctx.strokeStyle = '#ffffff'; 
    ctx.lineWidth = 2;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#b8a8e0';
    const sy = lerp(-10, H + 10, ease(scanT));
    ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(W, sy); ctx.stroke();
    ctx.restore();
  }

  // --- BOSS NAME REVEAL WITH RUNE FLANKS (50–75%) ---
  if (prog >= 0.50) {
    const nT = ease(clamp((prog - 0.50) / 0.25, 0, 1));
    ctx.save();
    const halfReveal = nT * W * 0.6;
    ctx.beginPath();
    ctx.rect(W/2 - halfReveal, 0, halfReveal * 2, H);
    ctx.clip();
    
    ctx.globalAlpha = nT;
    ctx.font = "bold 52px Georgia, serif";
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#7a6fa8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const bossName = eng.bossIntro.bossName || "UNKNOWN ENTITY";
    ctx.fillText(bossName, W/2, H/2 - 10);
    
    // Flanking decorations
    ctx.font = "20px serif";
    ctx.fillStyle = '#9b8ec4';
    ctx.fillText("✦ ━", W/2 - ctx.measureText(bossName).width/2 - 50, H/2 - 10);
    ctx.fillText("━ ✦", W/2 + ctx.measureText(bossName).width/2 + 50, H/2 - 10);
    ctx.restore();
  }

  // --- SUBTITLE (65–85%) ---
  if (prog >= 0.65) {
    const sT = ease(clamp((prog - 0.65) / 0.20, 0, 1));
    ctx.save();
    ctx.globalAlpha = sT * 0.8;
    ctx.font = "italic 20px Georgia, serif";
    ctx.fillStyle = '#b8a8e0';
    ctx.letterSpacing = "4px"; // Clean spacing for subtitles
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(eng.bossIntro.subtitle || "MAGIC ITSELF TREMBLES AT ITS NAME.", W/2, H/2 + 45);
    
    // Small rune underline
    ctx.font = "12px serif";
    ctx.globalAlpha = sT * 0.5;
    ctx.fillText("ᚷ ᛟ ᚹ ᛞ ᚦ", W/2, H/2 + 70);
    ctx.restore();
  }

  // --- FINAL FLASH → FADE (92–100%) ---
  if (prog > 0.92) {
    const fT = clamp((prog - 0.92) / 0.04, 0, 1);
    if (fT < 0.6) {
      ctx.fillStyle = `rgba(240, 230, 255, ${fT * 0.9})`; // Brighter flash
      ctx.fillRect(0, 0, W, H);
    }
    const blackT = clamp((prog - 0.95) / 0.05, 0, 1);
    ctx.fillStyle = `rgba(3, 2, 5, ${ease(blackT)})`;
    ctx.fillRect(0, 0, W, H);
  }

  ctx.restore();
}
      // ==============================================================================
      ctx.restore(); 


// =========================================================
      // 🏆 ARCANE VICTORY CINEMATIC RENDER (MYTHIC TIER)
      // =========================================================
if (window.showVictoryCinematic && window.showVictoryCinematic > 0) {
          const timerVal = window.showVictoryCinematic;
          
          // 🔥 SMOOTH FADE-IN AT FADE-OUT
          const fadeIn = Math.min(1, (12.0 - timerVal) / 1.5); 
          const fadeOut = Math.min(1, timerVal);
          const alpha = fadeIn * fadeOut; 

          const now = Date.now(); 
          const W = ctx.canvas.width;
          const H = ctx.canvas.height;
          const cx = W / 2;
          const cy = H / 2;

          // 🎵 ONE-TIME CHOIR SOUND TRIGGER
          if (!window.victoryChoirPlayed && alpha > 0.1) {
              window.victoryChoirPlayed = true; 
              if (typeof playSfx === 'function') playSfx('choir');
          }

          // ⚡ PERFORMANCE OPTIMIZATION: Pre-generate complex arrays only once
          if (!window._frierenInit) {
              const RUNES = ['ᚠ','ᚢ','ᚦ','ᚨ','ᚱ','ᚲ','ᚷ','ᚹ','ᚺ','ᚾ','ᛁ','ᛃ','ᛇ','ᛈ','ᛉ','ᛊ','ᛏ','ᛒ','ᛖ','ᛗ','ᛚ','ᛜ','ᛞ','ᛟ'];
              const ANCIENT = ['✦','✧','⋆','◈','◇','⬡','⬢','⌬','⏣','⎔','⌖','✺','❋','⁑','※'];
              
              window._outerRunes = Array.from({length: 24}, (_, i) => ({ rune: RUNES[i % RUNES.length], angleOffset: (i / 24) * Math.PI * 2 }));
              window._middleSymbols = Array.from({length: 16}, (_, i) => ({ sym: ANCIENT[i % ANCIENT.length], angleOffset: (i / 16) * Math.PI * 2 }));
              window._innerRunes = Array.from({length: 12}, (_, i) => ({ rune: RUNES[(i + 8) % RUNES.length], angleOffset: (i / 12) * Math.PI * 2 }));
              window._sparks = Array.from({length: 60}, (_, i) => ({ angleOffset: (i / 60) * Math.PI * 2, phase: i * 0.17, color: i % 3 === 0 ? '#c5a059' : i % 3 === 1 ? '#a78bfa' : '#e2e8f0' }));
              window._comets = Array.from({length: 8}, (_, i) => ({ baseAngle: (i / 8) * Math.PI * 2, phase: i * 1.5 }));
              window._frierenInit = true;
          }

          ctx.save();
          ctx.setTransform(1, 0, 0, 1, 0, 0); 
          
          // 💥 EPIC SCREEN SHAKE (Yayanig ang screen sa unang 2 segundo)
          if (timerVal > 10.0) {
              const intensity = (timerVal - 10.0) * 3.5; 
              ctx.translate((Math.random() - 0.5) * intensity, (Math.random() - 0.5) * intensity);
          }

          // ---------------------------------------------------------
          // 1. DARK VIOLET ARCANE MIST & BACKGROUND
          // ---------------------------------------------------------
          const pulseMist = 0.88 + 0.08 * Math.sin(now * 0.0015);
          ctx.fillStyle = `rgba(4, 2, 10, ${alpha * pulseMist})`;
          ctx.fillRect(0, 0, W, H); 

          const bgGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.65);
          bgGlow.addColorStop(0,   `rgba(109, 40, 217, ${alpha * 0.28})`);
          bgGlow.addColorStop(0.35,`rgba(139, 92, 246, ${alpha * 0.10})`);
          bgGlow.addColorStop(0.7, `rgba(197, 160, 89,  ${alpha * 0.06})`);
          bgGlow.addColorStop(1,   `rgba(0,0,0,0)`);
          ctx.fillStyle = bgGlow;
          ctx.fillRect(0, 0, W, H);

          // ---------------------------------------------------------
          // 2. CELESTIAL GOD RAYS (LIGHT BEAMS)
          // ---------------------------------------------------------
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(now * 0.00007);
          for (let i = 0; i < 18; i++) {
              ctx.rotate((Math.PI * 2) / 18);
              const ray = ctx.createLinearGradient(0, 0, 0, H);
              ray.addColorStop(0,   `rgba(255, 240, 160, ${alpha * 0.10})`);
              ray.addColorStop(0.5, `rgba(167, 139, 250, ${alpha * 0.05})`);
              ray.addColorStop(1,   `rgba(0,0,0,0)`);
              ctx.fillStyle = ray;
              ctx.beginPath();
              ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.lineTo(70, H); ctx.lineTo(-70, H);
              ctx.fill();
          }
          ctx.restore();

          // ---------------------------------------------------------
          // 3. MAGIC CIRCLE SYSTEM (Frieren-style)
          // ---------------------------------------------------------
          ctx.save();
          ctx.translate(cx, cy);

          // --- RING 1: Outermost — Slow clockwise, rune text ---
          const r1 = 310;
          ctx.save();
          ctx.rotate(now * 0.00015);
          ctx.globalAlpha = alpha * 0.65;
          ctx.strokeStyle = '#6d28d9';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([]);
          ctx.beginPath(); ctx.arc(0, 0, r1, 0, Math.PI * 2); ctx.stroke();
          
          ctx.strokeStyle = '#a78bfa';
          ctx.lineWidth = 1;
          for (let i = 0; i < 72; i++) {
              const a = (i / 72) * Math.PI * 2;
              const inner = i % 6 === 0 ? r1 - 14 : r1 - 7;
              ctx.beginPath();
              ctx.moveTo(Math.cos(a)*r1, Math.sin(a)*r1);
              ctx.lineTo(Math.cos(a)*inner, Math.sin(a)*inner);
              ctx.stroke();
          }
          
          ctx.font = '13px serif';
          ctx.fillStyle = '#c4b5fd';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          window._outerRunes.forEach(({rune, angleOffset}) => {
              const a = angleOffset + now * 0.00015;
              const rd = r1 - 24;
              ctx.save();
              ctx.translate(Math.cos(a)*rd, Math.sin(a)*rd);
              ctx.rotate(a + Math.PI/2);
              ctx.fillText(rune, 0, 0);
              ctx.restore();
          });
          ctx.restore();

          // --- RING 2: Counter-clockwise, dashed gold, ancient sigils ---
          const r2 = 265;
          ctx.save();
          ctx.rotate(-now * 0.00025);
          ctx.globalAlpha = alpha * 0.7;
          ctx.strokeStyle = '#c5a059';
          ctx.lineWidth = 2;
          ctx.setLineDash([18, 8, 4, 8]);
          ctx.beginPath(); ctx.arc(0, 0, r2, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]);
          
          ctx.fillStyle = '#c5a059';
          for (let i = 0; i < 8; i++) {
              const a = (i/8)*Math.PI*2;
              ctx.save();
              ctx.translate(Math.cos(a)*r2, Math.sin(a)*r2);
              ctx.rotate(a);
              ctx.beginPath();
              ctx.moveTo(0, -6); ctx.lineTo(5, 0); ctx.lineTo(0, 6); ctx.lineTo(-5, 0);
              ctx.closePath(); ctx.fill();
              ctx.restore();
          }
          ctx.restore();

          // --- RING 3: Faster clockwise, symbols ---
          const r3 = 222;
          ctx.save();
          ctx.rotate(now * 0.0004);
          ctx.globalAlpha = alpha * 0.6;
          ctx.strokeStyle = '#7c3aed';
          ctx.lineWidth = 1.2;
          ctx.setLineDash([6, 12]);
          ctx.beginPath(); ctx.arc(0, 0, r3, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]);
          ctx.font = '15px serif';
          ctx.fillStyle = '#fef08a';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          window._middleSymbols.forEach(({sym, angleOffset}) => {
              const a = angleOffset + now * 0.0004;
              ctx.fillText(sym, Math.cos(a)*r3, Math.sin(a)*r3);
          });
          ctx.restore();

          // --- RING 4: Counter-clockwise, inner rune ring ---
          const r4 = 175;
          ctx.save();
          ctx.rotate(-now * 0.0006);
          ctx.globalAlpha = alpha * 0.5;
          ctx.strokeStyle = '#a78bfa';
          ctx.lineWidth = 1;
          ctx.setLineDash([30, 10, 2, 10]);
          ctx.beginPath(); ctx.arc(0, 0, r4, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]);
          ctx.font = '12px serif';
          ctx.fillStyle = '#ddd6fe';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          window._innerRunes.forEach(({rune, angleOffset}) => {
              const a = angleOffset - now * 0.0006;
              ctx.fillText(rune, Math.cos(a)*r4, Math.sin(a)*r4);
          });
          ctx.restore();

          // --- HEXAGRAM (Star of Seidr) ---
          ctx.save();
          ctx.rotate(now * 0.00018);
          ctx.globalAlpha = alpha * 0.45;
          ctx.strokeStyle = '#c5a059';
          ctx.lineWidth = 1.2;
          ctx.setLineDash([]);
          const hex = (rot) => {
              ctx.save(); ctx.rotate(rot);
              ctx.beginPath();
              for (let i = 0; i < 6; i++) {
                  const a = (i/6)*Math.PI*2 - Math.PI/2;
                  const x = Math.cos(a)*148, y = Math.sin(a)*148;
                  i === 0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
              }
              ctx.closePath(); ctx.stroke();
              ctx.restore();
          };
          hex(0); hex(Math.PI/6*2);
          ctx.restore();

          // --- INNER CIRCLE with glyph nodes ---
          const r5 = 118;
          ctx.save();
          ctx.rotate(-now * 0.0003);
          ctx.globalAlpha = alpha * 0.55;
          ctx.strokeStyle = '#6d28d9';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 6]);
          ctx.beginPath(); ctx.arc(0, 0, r5, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]);
          ctx.globalAlpha = alpha * 0.7;
          ctx.strokeStyle = '#a78bfa';
          ctx.lineWidth = 0.8;
          for (let i = 0; i < 12; i++) {
              const a = (i/12)*Math.PI*2 - now * 0.0003;
              ctx.beginPath();
              ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a)*r5, Math.sin(a)*r5);
              ctx.stroke();
          }
          ctx.restore();

          // --- LATIN ANCIENT TEXT arc (outer) ---
          ctx.save();
          ctx.rotate(now * 0.0001);
          ctx.globalAlpha = alpha * 0.55;
          ctx.font = 'bold 9px monospace';
          ctx.fillStyle = '#fde68a';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const textR = 292;
          const arcText = 'SIGILLUM · ARCANUM · ETERNUM · CLAUSUM · VINCULUM · ABYSS · SEALED · MANA · SORS · FATUM · ';
          for (let i = 0; i < arcText.length; i++) {
              const a = (i / arcText.length) * Math.PI * 2 - Math.PI / 2;
              ctx.save();
              ctx.translate(Math.cos(a)*textR, Math.sin(a)*textR);
              ctx.rotate(a + Math.PI/2);
              ctx.fillText(arcText[i], 0, 0);
              ctx.restore();
          }
          ctx.restore();

          // --- INNER CORE glow ---
          ctx.save();
          const corePulse = 0.6 + 0.4 * Math.sin(now * 0.003);
          ctx.globalAlpha = alpha * corePulse * 0.8;
          const coreGlow = ctx.createRadialGradient(0,0,0, 0,0,90);
          coreGlow.addColorStop(0,   'rgba(167,139,250,0.35)');
          coreGlow.addColorStop(0.5, 'rgba(109,40,217,0.15)');
          coreGlow.addColorStop(1,   'rgba(0,0,0,0)');
          ctx.fillStyle = coreGlow;
          ctx.beginPath(); ctx.arc(0,0,90,0,Math.PI*2); ctx.fill();
          
          ctx.globalAlpha = alpha * 0.9;
          ctx.strokeStyle = '#c5a059';
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(0,0,32,0,Math.PI*2); ctx.stroke();
          ctx.beginPath(); ctx.arc(0,0,18,0,Math.PI*2); ctx.stroke();
          ctx.fillStyle = `rgba(167,139,250,${corePulse*0.5})`;
          ctx.beginPath(); ctx.arc(0,0,18,0,Math.PI*2); ctx.fill();
          ctx.fillStyle = '#fef08a';
          ctx.font = '22px serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('⌬', 0, 0);
          ctx.restore();
          ctx.restore(); // end magic circle translate

          // ---------------------------------------------------------
          // 4. SHOOTING ARCANE COMETS
          // ---------------------------------------------------------
          ctx.save();
          ctx.translate(cx, cy);
          window._comets.forEach(({baseAngle, phase}) => {
              const pTime = ((now * 0.0018) + phase) % 3.5;
              const pAng = baseAngle + now * 0.00008;
              const pDist = pTime * 380;
              const fade = alpha * Math.max(0, 1 - pTime/3.5);
              
              ctx.globalAlpha = fade;
              ctx.fillStyle = '#d8b4fe';
              ctx.beginPath();
              ctx.arc(Math.cos(pAng)*pDist, Math.sin(pAng)*pDist, 2.5, 0, Math.PI*2);
              ctx.fill();
              
              const tailLen = 55;
              const grad = ctx.createLinearGradient(
                  Math.cos(pAng)*pDist, Math.sin(pAng)*pDist,
                  Math.cos(pAng)*(pDist-tailLen), Math.sin(pAng)*(pDist-tailLen)
              );
              grad.addColorStop(0, `rgba(216,180,254,${fade})`);
              grad.addColorStop(1, 'rgba(216,180,254,0)');
              ctx.strokeStyle = grad;
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(Math.cos(pAng)*pDist, Math.sin(pAng)*pDist);
              ctx.lineTo(Math.cos(pAng)*(pDist-tailLen), Math.sin(pAng)*(pDist-tailLen));
              ctx.stroke();
          });
          ctx.restore();

          // ---------------------------------------------------------
          // 5. FLOATING MANA STARDUST
          // ---------------------------------------------------------
          ctx.save();
          ctx.translate(cx, cy);
          window._sparks.forEach(({angleOffset, phase, color}, i) => {
              const sT = ((now * 0.00035) + phase) % 3;
              const sAng = angleOffset + Math.sin(now * 0.00015 + i) * 0.3;
              const sR = sT * 160;
              const sz = Math.max(0.2, 3.2 - sT);
              
              ctx.globalAlpha = alpha * Math.max(0, 1 - sT/3) * 0.85;
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(Math.cos(sAng)*sR, Math.sin(sAng)*sR, sz, 0, Math.PI*2);
              ctx.fill();
          });
          ctx.restore();

          // ---------------------------------------------------------
          // 6. ARCANE LIGHTNING FLASH EFFECT
          // ---------------------------------------------------------
          if (Math.sin(now * 0.0042) > 0.975) {
              ctx.fillStyle = `rgba(139,92,246,${Math.random() * 0.15 * alpha})`;
              ctx.fillRect(0, 0, W, H);
          }

          // ---------------------------------------------------------
          // 7. CINEMATIC TITLE TEXT
          // ---------------------------------------------------------
          const floatY = Math.sin(now * 0.002) * 8;
          const titleY = cy - 38 + floatY;

          ctx.save();
          ctx.textAlign = 'center';
          ctx.globalAlpha = alpha;

          // Title glow halo
          const haloR = 320, haloH = 90;
          const halo = ctx.createRadialGradient(cx, titleY, 0, cx, titleY, haloR);
          halo.addColorStop(0,   `rgba(109,40,217,${alpha*0.30})`);
          halo.addColorStop(0.6, `rgba(109,40,217,${alpha*0.08})`);
          halo.addColorStop(1,   'rgba(0,0,0,0)');
          ctx.fillStyle = halo;
          ctx.fillRect(cx - haloR, titleY - haloH, haloR * 2, haloH * 2);

          // Decorative lines flanking title
          ctx.strokeStyle = `rgba(197,160,89,${alpha*0.55})`;
          ctx.lineWidth = 1;
          const lineW = 200;
          ctx.beginPath(); ctx.moveTo(cx-lineW-80, titleY-2); ctx.lineTo(cx-80, titleY-2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx+80, titleY-2); ctx.lineTo(cx+lineW+80, titleY-2); ctx.stroke();
          
          [[cx-lineW-80, titleY-2],[cx-80, titleY-2],[cx+80, titleY-2],[cx+lineW+80, titleY-2]].forEach(([x,y])=>{
              ctx.fillStyle = `rgba(197,160,89,${alpha*0.7})`;
              ctx.save(); ctx.translate(x,y);
              ctx.beginPath(); ctx.moveTo(0,-4); ctx.lineTo(4,0); ctx.lineTo(0,4); ctx.lineTo(-4,0);
              ctx.closePath(); ctx.fill(); ctx.restore();
          });

          // Main title
          ctx.font = 'bold 58px "Georgia", "Times New Roman", serif';
          const titleGrad = ctx.createLinearGradient(cx - 340, titleY, cx + 340, titleY);
          titleGrad.addColorStop(0,    '#c5a059');
          titleGrad.addColorStop(0.25, '#fde68a');
          titleGrad.addColorStop(0.5,  '#ede9fe');
          titleGrad.addColorStop(0.75, '#fde68a');
          titleGrad.addColorStop(1,    '#c5a059');
          ctx.fillStyle = titleGrad;
          ctx.shadowBlur = 30 + 12 * Math.sin(now * 0.004);
          ctx.shadowColor = '#7c3aed';
          ctx.fillText('THE ABYSS HAS BEEN SEALED', cx, titleY);

          // Subtitle
          const subAlpha = 0.5 + 0.35 * Math.sin(now * 0.0025);
          ctx.globalAlpha = alpha * subAlpha;
          ctx.font = 'italic 21px "Georgia", "Times New Roman", serif';
          ctx.fillStyle = '#c4b5fd';
          ctx.shadowBlur = 14;
          ctx.shadowColor = '#4c1d95';
          ctx.fillText('ANCIENT SEALS AWAKEN ACROSS THE SHATTERED REALMS...', cx, titleY + 56);

          // Decorative rune row below subtitle
          ctx.globalAlpha = alpha * 0.45;
          ctx.font = '14px serif';
          ctx.fillStyle = '#c5a059';
          ctx.shadowBlur = 0;
          ctx.fillText('✦  ᚠ  ᛟ  ᚹ  ⌬  ᛞ  ᚦ  ✦', cx, titleY + 84);

          // ---------------------------------------------------------
          // 8. ENDLESS WAVES INITIATION WARNING
          // ---------------------------------------------------------
          if (timerVal <= 10.5) {
              const wPulse = Math.max(0, Math.sin(now * 0.006));
              ctx.globalAlpha = alpha * (0.45 + wPulse * 0.55);
              ctx.font = 'bold 18px "Courier New", monospace';
              
              const warnGrad = ctx.createLinearGradient(cx - 250, 0, cx + 250, 0);
              warnGrad.addColorStop(0,   'rgba(239,68,68,0)');
              warnGrad.addColorStop(0.2, 'rgba(239,68,68,1)');
              warnGrad.addColorStop(0.8, 'rgba(239,68,68,1)');
              warnGrad.addColorStop(1,   'rgba(239,68,68,0)');
              
              ctx.fillStyle = warnGrad;
              ctx.shadowBlur = 18 + wPulse * 14;
              ctx.shadowColor = '#dc2626';
              ctx.fillText('▷▷ WARNING: ENDLESS WAVES INCOMING... ◁◁', cx, titleY + 118);
          }

          ctx.restore(); // Restore text context
          ctx.restore(); // Restore global context
      }

      // 🔥 FAMILIAR RENDERER



      // Ito yung orihinal na dulo mo:
      renderAnimId = requestAnimationFrame(renderLoop);
    }; // <-- Nagsasara sa renderLoop

    renderLoop(); // <-- Nagpapagana sa animation

    const down = (e) => { 


      if (window.ArcaneSoundManager) window.ArcaneSoundManager.unlockAll();
      activateAudioKeepAlive();
      eng.keys[e.key] = true;

      if (e.key === ' ' && screenRef.current === 'playing') {
        e.preventDefault(); // Iwas scroll sa browser
        window.triggerDash();
      }

// PAUSE / UNPAUSE HOTKEY (P or ESC)
      if ((e.key === 'Escape' || e.key === 'p' || e.key === 'P') && (screenRef.current === 'playing' || screenRef.current === 'paused')) {
        const isCoopActive = Boolean(netRef.current && netRef.current.channel);
        
        if (!isCoopActive || netRef.current.isHost) {
          // 1. I-trigger yung engine pause
          if (window.executeNetworkPauseAction) {
            window.executeNetworkPauseAction();
          }

          // 2. I-update yung React UI state manually para lumabas yung menu
          // Kung nasa 'playing' gawing 'paused', kung 'paused' gawing 'playing'
          setScreen(prev => prev === 'playing' ? 'pause' : 'playing');
        }
      }
      
      if ((e.key === 'k' || e.key === 'K') && screenRef.current === 'playing') {
        setIsTreeOpen(prev => !prev);
      }

      if ((e.key === 't' || e.key === 'T') && screenRef.current === 'playing') {
        setIsStatsOpen(prev => !prev);
      }

      if ((e.key === 'i' || e.key === 'I') && screenRef.current === 'playing') {
        setIsInventoryOpen(prev => !prev); 
      }

      if ((e.key === 'h' || e.key === 'H') && screenRef.current === 'playing') {
        setIsHelpOpen(prev => !prev);
      }
      
      if (screenRef.current === 'playing') {

        // ==========================================
        // 🛠️ DEV CHEAT CODES: 
        // ==========================================

        if (e.key === 'n' || e.key === 'N') {
          const isCoopActive = Boolean(netRef.current && netRef.current.channel);
          let target = (isCoopActive && !netRef.current.isHost) ? eng.p2 : eng.p;
          
          if (target && !target.dead) {
             eng.screenShake = 2.0;
             target.chatBubble = { text: "DEV: BOSS INVASION!", life: 2.0 };
             
             // Play boss spawn sound effect
             if (window.ArcaneSoundManager) window.ArcaneSoundManager.play('fissure'); 

             // Base coordinates (Sa paligid ng player mag-iispawn)
             const startX = target.x;
             const startY = target.y - 150;

             // 1. The Abyss (Nasa taas)
             eng.enemies.push({ 
                 x: startX, y: startY - 100, r: 50, speed: 45, hp: 500000, maxHp: 500000, prevHpFrame: 500000, 
                 dmg: 800, xp: 100000, color: '#1a0505', glow: '#f59e0b', boss: true, type: 'abyss', 
                 nameTag: 'The Abyss', abyssShieldTimer: 0, abyssShieldCd: 8, abyssAttackTimer: 3, 
                 flash: 0, stunnedTime: 0, stigmaTime: 0, temporalSlowTime: 0, arcaneBurnTime: 0, voidExhaustTime: 0, instabTime: 0 
             });

             // 2. Primordial Demon (Nasa kaliwa)
             eng.enemies.push({ 
                 x: startX - 150, y: startY, r: 35, speed: 65, hp: 150000, maxHp: 150000, 
                 dmg: 500, xp: 25000, color: '#000000', glow: '#ffffff', boss: true, type: 'primordial', 
                 nameTag: 'Primordial Demon', flash: 0, stunnedTime: 0, stigmaTime: 0, temporalSlowTime: 0, arcaneBurnTime: 0, voidExhaustTime: 0, instabTime: 0 
             });

             // 3. Archdemon (Nasa kanan)
             eng.enemies.push({ 
                 x: startX + 150, y: startY, r: 25, speed: 75, hp: 40000, maxHp: 40000, 
                 dmg: 250, xp: 8000, color: '#7f1d1d', glow: '#dc2626', boss: true, type: 'archdemon', 
                 nameTag: 'Archdemon', flash: 0, stunnedTime: 0, stigmaTime: 0, temporalSlowTime: 0, arcaneBurnTime: 0, voidExhaustTime: 0, instabTime: 0 
             });

             // 4. Demon Knight (Nasa ibaba)
             eng.enemies.push({ 
                 x: startX, y: startY + 100, r: 20, speed: 85, hp: 15000, maxHp: 15000, 
                 dmg: 150, xp: 2000, color: '#4b5563', glow: '#ef4444', boss: true, type: 'demonKnight', 
                 nameTag: 'Demon Knight', flash: 0, stunnedTime: 0, stigmaTime: 0, temporalSlowTime: 0, arcaneBurnTime: 0, voidExhaustTime: 0, instabTime: 0 
             });
          }
        }

if (e.key === 'm' || e.key === 'M') {
          const isCoopActive = Boolean(netRef.current && netRef.current.channel);
          let target = (isCoopActive && !netRef.current.isHost) ? eng.p2 : eng.p;
          
          if (target && !target.dead) {
             // 1. Matinding Screen Shake at Sound
             eng.screenShake = 3.0;
             if (window.ArcaneSoundManager) window.ArcaneSoundManager.play('nuke');

             // 2. Patayin LAHAT ng kalaban agad-agad
             for (const enemy of eng.enemies) {
                enemy.hp = 0;
                enemy.deadTrigger = true;
                enemy.flash = 1.0;
             }

             // 3. Massive Red Particle Explosion sa buong map
             for (let k = 0; k < 250; k++) {
                const pa = Math.random() * Math.PI * 2;
                const ps = Math.random() * 800 + 100; // Sobrang bilis na particles
                eng.particles.push({ 
                  x: target.x, y: target.y, 
                  vx: Math.cos(pa) * ps, vy: Math.sin(pa) * ps, 
                  color: '#ef4444', life: 1.5, ml: 1.5, r: Math.random() * 5 + 3 
                });
             }

             // 4. WAVE SKIP LOGIC (+1 Wave)
             eng.wave++;
             eng.waveT = 0; // I-reset ang timer para sa simula ng bagong wave
             eng.waveLen = Math.max(15, 30 - eng.wave * 0.8); // I-recalculate ang wave duration

             // Update Chat Bubble para makita kung anong wave na
             target.chatBubble = { text: `DEV: SKIPPED TO WAVE ${eng.wave}!`, life: 2.0 };
          }
        }
    if (e.key === '8') {
              const isCoopActive = Boolean(netRef.current && netRef.current.channel);
              let target = (isCoopActive && !netRef.current.isHost) ? eng.p2 : eng.p;
              
              if (target && !target.dead) {
                if (!eng.droppedItems) eng.droppedItems = [];

                // I-loop ang BUONG database at i-drop lahat!
                EQUIPMENT_DB.forEach((item) => {
                  eng.droppedItems.push({
                    // Mas malapad na spread para hindi mag-umpukan ang 30 items
                    x: target.x + (Math.random() - 0.5) * 300, 
                    y: target.y + (Math.random() - 0.5) * 300,
                    item: item,
                    life: 60.0 // Tatagal ng 1 minute sa sahig
                  });
                });

                // Notification
                target.chatBubble = { text: "DEV: ALL ITEMS UNLEASHED!", life: 2.0 };
                if (window.ArcaneSoundManager) window.ArcaneSoundManager.play('heal');
              }
            }

        if (e.key === '9') {
          const isCoopActive = Boolean(netRef.current && netRef.current.channel);
          let target = (isCoopActive && !netRef.current.isHost) ? eng.p2 : eng.p;
          if (target && !target.dead) {
             target.level = Math.max(target.level, 20);
             target.maxHp += 999999950000;
             target.hp = target.maxHp;
             target.dmg += 15000;
             target.chatBubble = { text: "GOD MODE ACTIVATED!", life: 2.0 };
             setPlayerLevel(target.level);
             playerLevelRef.current = target.level;
          }
        }

        if (e.key === '0') {
          const isCoopActive = Boolean(netRef.current && netRef.current.channel);
          let target = (isCoopActive && !netRef.current.isHost) ? eng.p2 : eng.p;
          if (target && !target.dead) {
             // 1. Maximize Level
             target.level = Math.max(target.level, 99); 
             
             // 2. Godlike HP & Damage
             target.maxHp = 999999;
             target.hp = target.maxHp;
             target.dmg = 999999; 
             
             // 3. Max out Speed, Rapid Fire, and Split Bolt using our established caps
             target.speed = 800;        // Max Movement Speed Cap
             target.shootRate = 0.15;   // Max Rapid Fire Cap
             target.multiShot = 20;     // Max Split Bolt Cap

             // 4. Max out NEW STATS: Crit and Defense
             target.baseCrit = 100;      // Max Crit Chance Cap (60%)
             target.baseDef = 11185;       // Max Defense Block Cap (60%)

             target.chatBubble = { text: "ULTIMATE GOD MODE ACTIVATED!", life: 2.0 };
             setPlayerLevel(target.level);
             playerLevelRef.current = target.level;
          }
        }
        
        // END CHEAT CODES


        


       if (playerLevelRef.current >= 10) {
        if (e.key === '1') castElementalSigil('flareInferno');
        if (e.key === '2') castElementalSigil('tidalWave');
        if (e.key === '3') castElementalSigil('fissureSlam');
        if (e.key === '4') castElementalSigil('lightningSurge');
        if (e.key === '5') castElementalSigil('iceStorm');
        if (e.key === '6') castHealingSigil('');
       }

        if (playerLevelRef.current >= 16) {
            if (e.key === 'q') castArcaneCollapseUltimate();
            if (e.key === 'e') castArcaneInstinctUltimate(); 
            if (e.key === 'r') castArcaneResurrectionUltimate();
        }
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
      if (eng.pendingSigilCasts) eng.pendingSigilCasts.length = 0; // 🔥 FIX: safety net — walang resolveSigilCast na tatakbo pagkatapos mag-unmount
    };
  }, []);

const handlePointerDown = (e) => {
    if (window.ArcaneSoundManager) window.ArcaneSoundManager.unlockAll();
    activateAudioKeepAlive();
    const eng = engineRef.current;
    
    if (e.clientX < window.innerWidth / 2 && !eng.joystick.active) {
      eng.joystick.active = true;
      // 🔥 STRICT POINTER ID: Tatandaan kung aling daliri lang ang nag-activate ng joystick
      eng.joystick.pointerId = e.pointerId; 
      eng.joystick.startX = e.clientX;
      eng.joystick.startY = e.clientY;
      eng.joystick.curX = e.clientX;
      eng.joystick.curY = e.clientY;
      
      if (joyBaseRef.current && joyKnobRef.current) {
        joyBaseRef.current.style.display = 'block';
        joyBaseRef.current.style.left = `${e.clientX}px`;
        joyBaseRef.current.style.top = `${e.clientY}px`;
        
        joyKnobRef.current.style.display = 'block';
        joyKnobRef.current.style.left = `${e.clientX}px`;
        joyKnobRef.current.style.top = `${e.clientY}px`;
      }

      try { e.currentTarget.setPointerCapture(e.pointerId); } catch(err) {}
    }
  };

  const handlePointerMove = (e) => {
    const eng = engineRef.current;
    if (!eng.joystick.active) return;
    
    // 🔥 IGNORE OTHER FINGERS: Kung hindi ito yung daliri sa joystick, wag pansinin!
    if (e.pointerId !== eng.joystick.pointerId) return;

    eng.joystick.curX = e.clientX;
    eng.joystick.curY = e.clientY;

    const dx = eng.joystick.curX - eng.joystick.startX;
    const dy = eng.joystick.curY - eng.joystick.startY;
    const dist = Math.hypot(dx, dy);
    const maxRadius = 50; 

    let knobX = e.clientX;
    let knobY = e.clientY;

    if (dist === 0) {
      eng.joystick.mx = 0;
      eng.joystick.my = 0;
    } else {
      const angle = Math.atan2(dy, dx);
      const intensity = Math.min(dist / maxRadius, 1);
      eng.joystick.mx = Math.cos(angle) * intensity;
      eng.joystick.my = Math.sin(angle) * intensity;
      
      if (dist > maxRadius) {
        knobX = eng.joystick.startX + Math.cos(angle) * maxRadius;
        knobY = eng.joystick.startY + Math.sin(angle) * maxRadius;
      }
    }

    if (joyKnobRef.current) {
      joyKnobRef.current.style.left = `${knobX}px`;
      joyKnobRef.current.style.top = `${knobY}px`;
    }
  };

  const handlePointerUp = (e) => {
    const eng = engineRef.current;
    if (!eng.joystick.active) return;

    if (e.pointerId === eng.joystick.pointerId) {
      eng.joystick.active = false;
      eng.joystick.pointerId = null;
      eng.joystick.mx = 0;
      eng.joystick.my = 0;
      
      if (joyBaseRef.current) joyBaseRef.current.style.display = 'none';
      if (joyKnobRef.current) joyKnobRef.current.style.display = 'none';

      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch(err) {}
    }
  };

  // 🔥 100% SAFETY FALLBACK: Kapag inangat na lahat ng daliri, force stop ang joystick
  const handleTouchEndFallback = (e) => {
    if (e.touches && e.touches.length === 0) {
      const eng = engineRef.current;
      if (eng && eng.joystick.active) {
        eng.joystick.active = false;
        eng.joystick.pointerId = null;
        eng.joystick.mx = 0;
        eng.joystick.my = 0;
        if (joyBaseRef.current) joyBaseRef.current.style.display = 'none';
        if (joyKnobRef.current) joyKnobRef.current.style.display = 'none';
      }
    }
  };

  // ==========================================
  // 🗡️ RPG STATS BREAKDOWN RENDERER
  // ==========================================
  const renderStatBreakdown = (item, statKey, label, isPercent = false, isRate = false) => {
    if (!item || !item.stats || item.stats[statKey] === undefined) return null;
    
    const curVal = item.stats[statKey];
    const baseItem = EQUIPMENT_DB.find(b => b.id === item.id);
    const baseVal = baseItem?.stats[statKey] || 0;
    const bonus = curVal - baseVal;

    const formatVal = (v) => isPercent ? `${Math.round(v)}%` : (isRate ? v.toFixed(2) : Math.round(v));
    const formatBonus = (v) => {
      const sign = v > 0 ? '+' : '';
      return isPercent ? `${sign}${Math.round(v)}%` : (isRate ? `${sign}${v.toFixed(2)}` : `${sign}${Math.round(v)}`);
    };

    if (Math.abs(bonus) > 0.001) {
      return (
        <div key={statKey} style={{ display: 'flex', alignItems: 'center', gap: '5px', margin: '3px 0', fontSize: '0.65rem', fontFamily: 'monospace' }}>
           <span style={{ color: '#94a3b8' }}>{formatVal(baseVal)}</span>
           <span style={{ color: '#34d399' }}>({formatBonus(bonus)})</span>
           <span style={{ color: '#64748b' }}>➔</span>
           <span style={{ color: '#fef08a', fontWeight: 'bold' }}>{formatVal(curVal)}</span>
           <span style={{ color: '#e2e8f0' }}>{label}</span>
        </div>
      );
    } else {
      return (
        <div key={statKey} style={{ display: 'flex', alignItems: 'center', gap: '5px', margin: '3px 0', fontSize: '0.65rem', fontFamily: 'monospace' }}>
           <span style={{ color: '#fef08a', fontWeight: 'bold' }}>+{formatVal(curVal)}</span>
           <span style={{ color: '#e2e8f0' }}>{label}</span>
        </div>
      );
    }
  };

const renderTooltipStats = (item) => {
    if (!item) return null;
    return (
      <div style={{ margin: '6px 0', padding: '6px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
        {renderStatBreakdown(item, 'atk', 'Attack Power')}
        {renderStatBreakdown(item, 'rate', 'Attack Rate', false, true)}
        {renderStatBreakdown(item, 'crit', 'Crit Chance', true)}
        {renderStatBreakdown(item, 'def', 'Armor Defense')}
        {renderStatBreakdown(item, 'hp', 'Max HP')}
        {renderStatBreakdown(item, 'speed', 'Move Speed')}
        {renderStatBreakdown(item, 'lifesteal', 'HP/Kill', false)}
      </div>
    );
};

  const isNetworked = Boolean(netRef.current && netRef.current.channel);
  const isHostInstance = !isNetworked || Boolean(netRef.current?.isHost);
  return (
<div 
  id="wrap"
  onPointerDown={handlePointerDown}
  onPointerMove={handlePointerMove}
  onPointerUp={handlePointerUp}
  onPointerCancel={handlePointerUp}
  onTouchEnd={handleTouchEndFallback}
  onTouchCancel={handleTouchEndFallback}
  onContextMenu={(e) => e.preventDefault()}
  style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }} 
>
      <style>{focusStyles}</style>

<div className="orientation-warning" style={{ padding: 0 }}>
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&display=swap');
    @keyframes spin-phone {
      0%,25%  { transform: rotate(0deg); }
      65%,100%{ transform: rotate(90deg); }
    }
    @keyframes pulse-ring {
      0%,100%{ opacity:.2; }
      50%    { opacity:.5; }
    }
    @keyframes drift {
      0%,100%{ transform: translateY(0px); opacity:.3; }
      50%    { transform: translateY(-3px); opacity:.6; }
    }
    @keyframes flicker {
      0%,100%{ opacity:.5; }
      50%    { opacity:.9; }
    }
    .phone-anim { transform-origin: center center; animation: spin-phone 3s ease-in-out infinite; }
    .pulse { animation: pulse-ring 3s ease-in-out infinite; }
    .rune  { animation: drift 4s ease-in-out infinite; }
    .rune:nth-child(2){ animation-delay:.6s; }
    .rune:nth-child(3){ animation-delay:1.2s; }
    .rune:nth-child(4){ animation-delay:1.8s; }
    .rune:nth-child(5){ animation-delay:.4s; }
    .rune:nth-child(6){ animation-delay:1s; }
    .rune:nth-child(7){ animation-delay:1.6s; }
    .rune:nth-child(8){ animation-delay:2.2s; }
    .bflicker { animation: flicker 2.8s ease-in-out infinite; }
  `}</style>

  {/* 🌟 GINAWANG FULL HEIGHT AT SPACE-BETWEEN PARA SAKOP ANG BUONG SCREEN */}
  <div style={{ 
    display: 'flex', 
    flexDirection: 'column', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    width: '100%', 
    height: '100%', 
    padding: '8vh 5vw', // Dynamically spaced base sa laki ng phone screen
    boxSizing: 'border-box' 
  }}>
    
    {/* Top Runes & Banner (Naka-pin sa itaas) */}
    <div style={{ width: '100%', maxWidth: '420px' }}>
      <svg width="100%" viewBox="0 0 380 56" preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible' }}>
        <text className="rune" x="22" y="40" fontSize="20" fill="#7F77DD" fontFamily="serif" textAnchor="middle">ᚠ</text>
        <text className="rune" x="54" y="24" fontSize="15" fill="#AFA9EC" fontFamily="serif" textAnchor="middle">ᛟ</text>
        <text className="rune" x="84" y="46" fontSize="18" fill="#534AB7" fontFamily="serif" textAnchor="middle">ᚹ</text>
        <text className="rune" x="112" y="20" fontSize="13" fill="#7F77DD" fontFamily="serif" textAnchor="middle">ᛁ</text>
        <text className="rune" x="268" y="20" fontSize="13" fill="#7F77DD" fontFamily="serif" textAnchor="middle">ᛗ</text>
        <text className="rune" x="296" y="46" fontSize="18" fill="#534AB7" fontFamily="serif" textAnchor="middle">ᚺ</text>
        <text className="rune" x="326" y="24" fontSize="15" fill="#AFA9EC" fontFamily="serif" textAnchor="middle">ᛞ</text>
        <text className="rune" x="358" y="40" fontSize="20" fill="#7F77DD" fontFamily="serif" textAnchor="middle">ᚲ</text>
        <line x1="128" y1="28" x2="252" y2="28" stroke="#534AB7" strokeWidth="0.5" opacity="0.4"/>
        <polygon points="128,28 134,24 134,32" fill="#534AB7" opacity="0.35"/>
        <polygon points="252,28 246,24 246,32" fill="#534AB7" opacity="0.35"/>
        <text x="190" y="32" fontFamily="'Cinzel',serif" fontSize="9" fill="#7F77DD" opacity="0.7" textAnchor="middle" letterSpacing="3">✦ ARCANE SURVIVAL ✦</text>
      </svg>
    </div>

    {/* Gitnang Content (Naka-flex: 1 para itulak ang Top at Bottom sa dulo) */}
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '0 10px' }}>
      
      {/* Center Magic Circle & Spinning Phone - Pinalaki to 150px */}
      <svg width="150" height="150" viewBox="0 0 120 120" style={{ display: 'block', margin: '0 auto 2rem' }}>
        <polygon points="60,5 74,21 92,14 92,34 110,42 100,60 110,78 92,78 92,98 74,91 60,107 46,91 28,98 28,78 10,78 20,60 10,42 28,34 28,14 46,21"
          fill="none" stroke="#534AB7" strokeWidth="0.7" opacity="0.25"/>
        <circle className="pulse" cx="60" cy="60" r="50" fill="none" stroke="#7F77DD" strokeWidth="1" strokeDasharray="5 4"/>
        <circle cx="60" cy="60" r="42" fill="none" stroke="#AFA9EC" strokeWidth="0.5" opacity="0.4"/>
        <text x="60" y="15" fontFamily="serif" fontSize="12" fill="#7F77DD" opacity="0.55" textAnchor="middle">ᚱ</text>
        <text x="105" y="64" fontFamily="serif" fontSize="12" fill="#7F77DD" opacity="0.55" textAnchor="middle">ᛏ</text>
        <text x="60" y="112" fontFamily="serif" fontSize="12" fill="#7F77DD" opacity="0.55" textAnchor="middle">ᚨ</text>
        <text x="15" y="64" fontFamily="serif" fontSize="12" fill="#7F77DD" opacity="0.55" textAnchor="middle">ᛜ</text>
        
        <g className="phone-anim" style={{ transformBox: 'fill-box' }}>
          <rect x="44" y="28" width="32" height="54" rx="5" fill="#3C3489"/>
          <rect x="48" y="34" width="24" height="38" rx="2" fill="#EEEDFE" opacity="0.9"/>
          <circle cx="60" cy="75" r="3" fill="#EEEDFE" opacity="0.5"/>
          <line x1="52" y1="30" x2="68" y2="30" stroke="#AFA9EC" strokeWidth="1" opacity="0.5"/>
        </g>
      </svg>

      {/* Text Display */}
      <div style={{ position: 'relative', display: 'inline-block', padding: '0 2rem', marginBottom: '1rem' }}>
        <svg className="bflicker" width="100%" height="52" viewBox="0 0 300 52" style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
          <path d="M8,4 L18,4 L18,1 L282,1 L282,4 L292,4" fill="none" stroke="#534AB7" strokeWidth="0.8" opacity="0.65"/>
          <path d="M8,48 L18,48 L18,51 L282,51 L282,48 L292,48" fill="none" stroke="#534AB7" strokeWidth="0.8" opacity="0.65"/>
          <text x="12" y="18" fontFamily="serif" fontSize="9" fill="#7F77DD" opacity="0.5">ᚦᚨᚱ</text>
          <text x="265" y="18" fontFamily="serif" fontSize="9" fill="#7F77DD" opacity="0.5">ᚷᛖᛒ</text>
        </svg>
        <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: '22px', fontWeight: 600, color: '#e2e8f0', margin: 0, padding: '10px 0', letterSpacing: '1.5px', lineHeight: 1.4, whiteSpace: 'nowrap' }}>
          Rotate your device
        </h2>
      </div>

      <p style={{ fontFamily: "'Cinzel', serif", fontSize: '13.5px', color: '#94a3b8', margin: '0 auto', maxWidth: '300px', lineHeight: 1.8, letterSpacing: '0.5px', textAlign: 'center' }}>
        Landscape orientation is required to harness the full power of your spell parameters.
      </p>
    </div>

    {/* Bottom Details (Naka-pin sa ibaba) */}
    <div style={{ width: '100%', maxWidth: '420px' }}>
      <svg width="100%" viewBox="0 0 380 36" preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible' }}>
        <line x1="40" y1="18" x2="155" y2="18" stroke="#534AB7" strokeWidth="0.5" opacity="0.35"/>
        <line x1="225" y1="18" x2="340" y2="18" stroke="#534AB7" strokeWidth="0.5" opacity="0.35"/>
        <text x="190" y="23" fontFamily="serif" fontSize="18" fill="#7F77DD" opacity="0.55" textAnchor="middle">ᛝ ᚾ ᛝ</text>
        <polygon points="40,18 46,15 46,21" fill="#534AB7" opacity="0.3"/>
        <polygon points="340,18 334,15 334,21" fill="#534AB7" opacity="0.3"/>
        <text x="72" y="14" fontFamily="serif" fontSize="10" fill="#AFA9EC" opacity="0.4" textAnchor="middle">ᚦ</text>
        <text x="100" y="27" fontFamily="serif" fontSize="10" fill="#AFA9EC" opacity="0.4" textAnchor="middle">ᛖ</text>
        <text x="130" y="13" fontFamily="serif" fontSize="10" fill="#AFA9EC" opacity="0.4" textAnchor="middle">ᚷ</text>
        <text x="250" y="13" fontFamily="serif" fontSize="10" fill="#AFA9EC" opacity="0.4" textAnchor="middle">ᛒ</text>
        <text x="280" y="27" fontFamily="serif" fontSize="10" fill="#AFA9EC" opacity="0.4" textAnchor="middle">ᚺ</text>
        <text x="308" y="14" fontFamily="serif" fontSize="10" fill="#AFA9EC" opacity="0.4" textAnchor="middle">ᛞ</text>
      </svg>
    </div>

  </div>
</div>
      <div className="game-container">
        <canvas ref={canvasRef} id="gameCanvas" />
        <div ref={vignetteRef} className="hp-vignette"></div>

        {/* VISUAL JOYSTICK ELEMENTS */}
        <div 
          ref={joyBaseRef}
          style={{
            position: 'fixed', display: 'none', width: '110px', height: '110px',
            borderRadius: '50%', background: 'rgba(11, 8, 38, 0.5)',
            border: '2px solid rgba(139, 92, 246, 0.4)', pointerEvents: 'none', zIndex: 40,
            transform: 'translate(-50%, -50%)', backdropFilter: 'blur(2px)'
          }}
        />
        <div 
          ref={joyKnobRef}
          style={{
            position: 'fixed', display: 'none', width: '45px', height: '45px',
            borderRadius: '50%', background: 'radial-gradient(circle, rgba(167, 139, 250, 0.9) 0%, rgba(109, 40, 217, 0.7) 100%)',
            boxShadow: '0 0 15px rgba(139, 92, 246, 0.6), inset 0 0 5px rgba(255,255,255,0.5)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            pointerEvents: 'none', zIndex: 41,
            transform: 'translate(-50%, -50%)'
          }}
        />

        {isCoop && (isHostInstance ? engineRef.current.p2 : engineRef.current.p) && showPartyList && (
          <div className="coop-party-panel">
            <div className="coop-party-row">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div className="coop-name">
                  Ally: {allyName || "Unknown"}
                </div>
                <button 
                  onClick={() => setShowPartyList(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#fbbf24',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    padding: '0 4px',
                    pointerEvents: 'auto'
                  }}
                >
                  ✕
                </button>
              </div>
              <div className="coop-stats">
                HP: {Math.round(isHostInstance ?
                  engineRef.current.p2.hp : engineRef.current.p.hp)} / {isHostInstance ? engineRef.current.p2.maxHp : engineRef.current.p.maxHp}<br />
                LVL: {isHostInstance ?
                  engineRef.current.p2.level : engineRef.current.p.level} | EXP: {Math.round(isHostInstance ? engineRef.current.p2.xp : engineRef.current.p.xp)}
              </div>
            </div>
          </div>
        )}

        {isCoop && !showPartyList && (
          <button
            onPointerDown={(e) => {
              e.stopPropagation();
              setShowPartyList(true);
            }}
            style={{
              position: 'absolute',
              top: '110px',
              right: '12px',
              background: 'rgba(9, 6, 28, 0.88)',
              border: '1px solid #7c3aed',
              borderRadius: '6px',
              padding: '4px 8px',
              color: '#fbbf24',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontFamily: 'monospace',
              pointerEvents: 'auto',
              zIndex: 20
            }}
          >
            👥 Show Party
          </button>
        )}

{/* 🔮 BDO-STYLE ORBITAL SKILL BUTTONS — Inner ring: Elemental Sigils */}
        {screen === 'playing' && playerLevel >= 12 && (() => {
          // Gamit na ang shared, orientation-aware na isMobileLayout state (tingnan sa taas)
          // sa halip na lokal na "window.innerWidth <= 840" lang.
          
          // PINALAKI ANG RADIUS AT SAKTONG CENTER:
          // Center of mobile Dash is exactly at 80px (50px margin + 30px half-width)
          const sigilRadius = isMobileLayout ? 88 : 145; 
          const anchorOffset = isMobileLayout ? '80px' : '90px'; 
          
          const sigilDefs = [
            { key: 'flareInferno',   cls: 'sigil-fire',      icon: 'fire',      label: 'Flare',    maxCd: 30, fn: () => castElementalSigil('flareInferno') },
            { key: 'tidalWave',      cls: 'sigil-water',     icon: 'water',     label: 'Wave',     maxCd: 30, fn: () => castElementalSigil('tidalWave') },
            { key: 'fissureSlam',    cls: 'sigil-earth',     icon: 'earth',     label: 'Fissure',  maxCd: 30, fn: () => castElementalSigil('fissureSlam') },
            { key: 'lightningSurge', cls: 'sigil-lightning', icon: 'lightning', label: 'Storm',    maxCd: 30, fn: () => castElementalSigil('lightningSurge') },
            { key: 'iceStorm',       cls: 'sigil-ice',       icon: 'ice',       label: 'Ice',      maxCd: 30, fn: () => castElementalSigil('iceStorm') },
            { key: 'natureRecovery', cls: 'sigil-nature',    icon: 'nature',    label: 'Heal',     maxCd: 45, fn: () => castHealingSigil() },
          ];
          
          // PINALUWAG NA ARC PARA HINDI DIKIT-DIKIT ANG 6 SIGILS:
          // Start: 80° (Medyo pa-kanan sa taas) -> End: 190° (Medyo pababa sa kaliwa)
          const arcStart = isMobileLayout ? 60 : 75;
          const arcEnd = isMobileLayout ? 220 : 205;
          const step = (arcEnd - arcStart) / (sigilDefs.length - 1);
          const angles = sigilDefs.map((_, i) => ((arcStart + step * i) * Math.PI) / 180);
          
          return (
            <div className="elemental-sigils-container" style={{ right: anchorOffset, bottom: anchorOffset }}>
              {sigilDefs.map((s, i) => {
                const angle = angles[i];
                const bx = Math.cos(angle) * sigilRadius;
                const by = Math.sin(angle) * sigilRadius;
                const sCd = skillsState[s.key]?.cd || 0;
                const sFrac = Math.max(0, Math.min(1, sCd / s.maxCd));
                const S_R = 23;
                const S_CIRC = 2 * Math.PI * S_R;
                
                return (
                  <div
                    key={s.key}
                    className={`sigil-btn ${s.cls}`}
                    style={{ left: `${bx}px`, top: `${-by}px` }}
                    onPointerDown={(e) => { e.stopPropagation(); s.fn(); }}
                  >
                    <ArcaneIcon type={s.icon} size={24} />
                    {sCd > 0 && (
                      <>
                        <svg className="skill-cd-ring-svg" viewBox="0 0 50 50">
                          <circle className="skill-cd-ring-track" cx="25" cy="25" r={S_R} fill="none" stroke="#1a1230" strokeWidth="3" />
                          <circle
                            className="skill-cd-ring-sweep"
                            cx="25" cy="25" r={S_R} fill="none"
                            stroke="currentColor" strokeWidth="3" strokeLinecap="round"
                            strokeDasharray={S_CIRC}
                            strokeDashoffset={S_CIRC * (1 - sFrac)}
                            transform="rotate(-90 25 25)"
                            style={{ filter: 'drop-shadow(0 0 4px currentColor)' }}
                          />
                        </svg>
                        <div className="sigil-cd-overlay">{Math.ceil(sCd)}</div>
                      </>
                    )}
                    <span className="sigil-title">{s.label}</span>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {(screen === 'playing' || screen === 'levelup' || screen === 'pause') && (
          <>
            {/* SCORE left | CENTER menu buttons | WAVE right — BDO Style Top Bar */}
            <div className="game-hud-top">
              <div className="hud-score-block">
                SCORE: <span ref={scoreValueRef}>0</span>
              </div>
              {/* BDO-style upper-right icon group: Stats + Inventory + Skills */}
              <div className="game-hud-right-group">
                <div ref={waveValueRef} style={{ fontSize: '1rem', fontWeight: 'bold', color: '#ffffff', textShadow: '0 0 8px rgba(255,255,255,0.5)' }}>
                  WAVE 1 | 30s
                </div>
                {/* Icon buttons — inserted between WAVE text and game title */}
                <div className="bdo-top-menu-btns" style={{ pointerEvents: 'auto', display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '4px' }}>
                  <button
                    className="bdo-menu-icon-btn"
                    onPointerDown={(e) => { e.stopPropagation(); setIsStatsOpen(prev => !prev); }}
                    title="Stats"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2 L15.5 8.5 L22 9.5 L17 14.5 L18.2 21 L12 18 L5.8 21 L7 14.5 L2 9.5 L8.5 8.5 Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                    </svg>
                    <span>Stats</span>
                  </button>
                  <button
                    className="bdo-menu-icon-btn"
                    onPointerDown={(e) => { e.stopPropagation(); setIsInventoryOpen(prev => !prev); }}
                    title="Inventory"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="9" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.8"/>
                      <path d="M8 9V7a4 4 0 0 1 8 0v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                    <span>Bag</span>
                  </button>
                  {playerLevel >= 5 && (
                    <button
                      className="bdo-menu-icon-btn"
                      onPointerDown={(e) => { e.stopPropagation(); setIsTreeOpen(prev => !prev); }}
                      title="Skill Tree"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M12 3 V9 M12 9 L6 15 M12 9 L18 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="12" cy="3" r="2" fill="currentColor" opacity="0.8"/>
                        <circle cx="6" cy="17" r="2.5" fill="currentColor" opacity="0.7"/>
                        <circle cx="18" cy="17" r="2.5" fill="currentColor" opacity="0.7"/>
                      </svg>
                      <span>Skills</span>
                    </button>
                  )}
                  <button
                    className="bdo-menu-icon-btn"
                    onPointerDown={(e) => { e.stopPropagation(); setIsHelpOpen(prev => !prev); }}
                    title="Help (H)"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="9.2" stroke="currentColor" strokeWidth="1.8"/>
                      <path d="M9.3 9.6 C9.3 7.9 10.6 6.6 12 6.6 C13.5 6.6 14.7 7.7 14.7 9.1 C14.7 11 12 11.2 12 13.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="16.8" r="1.05" fill="currentColor"/>
                    </svg>
                    <span>Help</span>
                  </button>
                </div>
                <div className="hud-menu-title">
                  <span className="arc">ARCANE</span><br/>
                  <span className="sur">SURVIVAL</span>
                </div>
                <div className="hud-menu-sub">The Last Covenant</div>
              </div>
            </div>

            {/* PAUSE — absolutely pinned to top-center, never pushes SCORE or WAVE */}
            {isHostInstance && (
              <button
                className="hud-pause-btn"
                onClick={() => {
                  if (window.executeNetworkPauseAction && isNetworked) {
                    window.executeNetworkPauseAction();
                  } else {
                    setScreen('pause');
                  }
                }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{ verticalAlign: 'middle', marginRight: '5px', marginBottom: '1px' }}>
                  <rect x="5" y="4" width="4" height="16" rx="1" fill="currentColor" opacity="0.85"/>
                  <rect x="15" y="4" width="4" height="16" rx="1" fill="currentColor" opacity="0.85"/>
                </svg>
                PAUSE
              </button>
            )}
          </>
        )}

        {screen === 'playing' && activeBuffsList.length > 0 && (
          <div className="rpg-buff-container">
            {activeBuffsList.map((buff, idx) => {
              const buffColor =
                buff.icon === 'berserk'      ? '#fb923c' :
                buff.icon === 'haste'        ? '#67e8f9' :
                buff.type === 'pot-power'    ? '#fb923c' :
                buff.type === 'pot-defense'  ? '#60a5fa' :
                buff.type === 'pot-crit'     ? '#fbbf24' :
                buff.type === 'pot-regen'    ? '#4ade80' :
                buff.type === 'pot-xpBoost'  ? '#c084fc' :
                buff.icon === 'shield'       ? '#60a5fa' :
                '#e879f9';
              const peak = buff.peak && buff.peak > 0 ? buff.peak : buff.life;
              const frac = Math.max(0, Math.min(1, buff.life / peak));
              const RING_R = 16;
              const CIRC = 2 * Math.PI * RING_R;
              const lowTime = buff.life <= 3;
              return (
                <div key={idx} className={`rune-buff ${lowTime ? 'rune-buff-low' : ''}`} style={{ '--buff-color': buffColor }}>
                  <svg className="rune-buff-ring" viewBox="0 0 40 40" width="40" height="40">
                    {/* Outer etched rune circle — slow rotating, decorative */}
                    <circle cx="20" cy="20" r="18.5" fill="none" stroke={buffColor} strokeWidth="0.6" opacity="0.35" />
                    <g className="rune-buff-glyphs" opacity="0.55">
                      {[0, 90, 180, 270].map(a => {
                        const rad = (a * Math.PI) / 180;
                        const x = 20 + Math.cos(rad) * 18.5;
                        const y = 20 + Math.sin(rad) * 18.5;
                        return <circle key={a} cx={x} cy={y} r="0.9" fill={buffColor} />;
                      })}
                    </g>
                    {/* Track */}
                    <circle cx="20" cy="20" r={RING_R} fill="none" stroke="#1a1230" strokeWidth="2.4" />
                    {/* Radial countdown sweep */}
                    <circle
                      cx="20" cy="20" r={RING_R} fill="none"
                      stroke={buffColor} strokeWidth="2.4" strokeLinecap="round"
                      strokeDasharray={CIRC}
                      strokeDashoffset={CIRC * (1 - frac)}
                      transform="rotate(-90 20 20)"
                      className="rune-buff-sweep"
                    />
                  </svg>
                  <div className="rune-buff-core">
                    <ArcaneIcon type={buff.icon} size={15} style={{ color: buffColor }} />
                  </div>
                  <span className="rune-buff-timer" style={{ color: buffColor }}>{Math.ceil(buff.life)}</span>
                  <span className="rune-buff-label">{buff.name}</span>
                </div>
              );
            })}
          </div>
        )}

        {(screen === 'playing' || screen === 'levelup' || screen === 'pause') && (
          <div className="game-hud-bottom">
            <div className="hud-level-badge">
              <span className="hud-level-label">Lv.</span>
              <span className="hud-level-value">{playerLevel}</span>
            </div>
            <div className="hud-bars-stack">
              <div className="hud-bar-container">
                <div ref={hpFillRef} className="hud-bar-fill" style={{ background: '#ef4444', width: '100%' }}></div>
                <div ref={hpTextRef} className="hud-bar-text">HP 100/100</div>
              </div>
              <div className="hud-bar-container">
                <div ref={xpFillRef} className="hud-bar-fill" style={{ background: '#3b82f6', width: '0%' }}></div>
                <div ref={xpTextRef} className="hud-bar-text">XP 0/80</div>
              </div>
            </div>
          </div>
        )}

        {/* Stats panel — absolute overlay from upper-right when open */}
        {(screen === 'playing' || screen === 'levelup' || screen === 'pause') && isStatsOpen && (
          <div className="rpg-stats-panel">
                <div className="stats-header" style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ verticalAlign: 'middle' }}>
                    <path d="M12 2 L15.5 8.5 L22 9.5 L17 14.5 L18.2 21 L12 18 L5.8 21 L7 14.5 L2 9.5 L8.5 8.5 Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill="none"/>
                    <circle cx="12" cy="12" r="2" fill="currentColor" opacity="0.8"/>
                  </svg>
                  HERO STATUS ATTRIBUTES
                </div>
                <div className="stats-row">
                  <span className="stats-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8"/><path d="M4 20 Q4 14 12 14 Q20 14 20 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                    Character Name:
                  </span>
                  <span className="stats-value" style={{ color: '#a855f7' }}>
                    {playerName || (isHostInstance ? "Player 1" : "Player 2")}
                  </span>
                </div>
                <div className="stats-row">
                  <span className="stats-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M14 3 L7 13 H12 L10 21 L17 11 H12 Z" fill="currentColor" opacity="0.85"/></svg>
                    Attack Power:
                  </span>
                  <span ref={statAtkRef} className="stats-value">22</span>
                </div>
                <div className="stats-row">
                  <span className="stats-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8"/><path d="M12 7 V12 L15 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                    Attack Rate:
                  </span>
                  <span ref={statCdRef} className="stats-value">0.60s</span>
                </div>
                <div className="stats-row">
                  <span className="stats-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M12 2 L14.5 9 L22 9.5 L16 14 L18 21 L12 17 L6 21 L8 14 L2 9.5 L9.5 9 Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>
                    Crit Chance:
                  </span>
                  <span ref={statCritRef} className="stats-value">0%</span>
                </div>
                <div className="stats-row">
                  <span className="stats-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M12 2 L20 6 V12 C20 17 16.5 21 12 22 C7.5 21 4 17 4 12 V6 Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>
                    Armor Rating:
                  </span>
                  <span ref={statDefRef} className="stats-value">0 (0% Block)</span>
                </div>
                <div className="stats-row">
                  <span className="stats-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M12 4 C8 4 5 7 5 10.5 C5 16 12 20 12 20 C12 20 19 16 19 10.5 C19 7 16 4 12 4 Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M9 11 L11 13 L15 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Life Steal:
                  </span>
                  <span ref={statLifestealRef} className="stats-value" style={{ color: '#ef4444' }}>0 HP/Kill</span>
                </div>

                <div className="stats-row">
                  <span className="stats-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M5 12 L19 12 M14 7 L19 12 L14 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Movement Speed:
                  </span>
                  <span ref={statSpdRef} className="stats-value">200 IPS</span>
                </div>
              </div>
        )}

{/* 🌟 ULTIMATE SPELLS */}
        {screen === 'playing' && playerLevel >= 16 && (() => {
          // Gamit na ang shared, orientation-aware na isMobileLayout state (tingnan sa taas)

          const dashAnchorX = isMobileLayout ? 80 : 90; // True center
          const dashAnchorY = isMobileLayout ? 80 : 90;
          
          // INILAYO SA SIGILS: Radius ginawang 155 para hindi magpatong
          const ultRadius = isMobileLayout ? 140 : 220; 

          // PINAGDIKIT ANG 3 BUTTONS SA ISA'T ISA:
          // Dati 170 to 100 (malawak), ngayon 165 to 105 para mas compact silang tatlo
          const startAngle = isMobileLayout ? 195 : 180;
          const endAngle = isMobileLayout ? 85 : 90;

          const ultDefs = [
            {
              key: 'arcaneCollapse', cls: 'bdo-ult-collapse', label: 'Collapse', keyBind: '5',
              color: '#a78bfa', rgb: '167,139,250', fn: castArcaneCollapseUltimate,
              icon: <ArcaneIcon type="arcaneCollapse" size={isMobileLayout ? 26 : 34} style={{ color: '#a78bfa' }} />,
              cdKey: 'arcaneCollapse', maxCd: 50, readyFx: 'aura'
            },
            {
              key: 'arcaneInstinct', cls: 'bdo-ult-instinct', label: 'Instinct', keyBind: '6',
              color: '#f472b6', rgb: '244,114,182', fn: castArcaneInstinctUltimate,
              icon: <ArcaneIcon type="arcaneInstinct" size={isMobileLayout ? 26 : 34} style={{ color: '#f472b6' }} />,
              cdKey: 'arcaneInstinct', maxCd: 55, readyFx: 'ember'
            },
            {
              key: 'arcaneResurrect', cls: 'bdo-ult-resurrect', label: 'Resurrect', keyBind: '7',
              color: '#34d399', rgb: '52,211,153', fn: castArcaneResurrectionUltimate,
              icon: <ArcaneIcon type="arcaneResurrect" size={isMobileLayout ? 26 : 34} style={{ color: '#34d399' }} />,
              cdKey: 'arcaneResurrection', maxCd: 300, readyFx: 'fire'
            },
          ];

          return (
            <>
              {ultDefs.map((u, i) => {
                const cd = skillsState[u.cdKey]?.cd;
                const uFrac = Math.max(0, Math.min(1, (cd || 0) / u.maxCd));
                const U_R = 41;
                const U_CIRC = 2 * Math.PI * U_R;
                const isReady = !(cd > 0);
                const PARTICLE_COUNT = 8;

                const step = (endAngle - startAngle) / (ultDefs.length - 1);
                const angleRad = ((startAngle + step * i) * Math.PI) / 180;

                const currentRight = dashAnchorX - (Math.cos(angleRad) * ultRadius);
                const currentBottom = dashAnchorY + (Math.sin(angleRad) * ultRadius);

                return (
                  <div
                    key={u.key}
                    className={`bdo-ult-btn ${u.cls}`}
                    style={{
                      position: 'absolute',
                      right: `${currentRight}px`,
                      bottom: `${currentBottom}px`,
                      pointerEvents: 'auto',
                    }}
                    onPointerDown={(e) => { e.stopPropagation(); u.fn(); }}
                    title={u.label}
                  >
                    <span className="bdo-ult-key">{u.keyBind}</span>
                    {u.icon}
                    <span className="bdo-ult-label" style={{ color: u.color }}>{u.label}</span>
                    {cd > 0 && (
                      <>
                        <svg className="skill-cd-ring-svg" viewBox="0 0 90 90">
                          <circle className="skill-cd-ring-track" cx="45" cy="45" r={U_R} fill="none" stroke="#1a1230" strokeWidth="4" />
                          <circle
                            className="skill-cd-ring-sweep"
                            cx="45" cy="45" r={U_R} fill="none"
                            stroke={u.color} strokeWidth="4" strokeLinecap="round"
                            strokeDasharray={U_CIRC}
                            strokeDashoffset={U_CIRC * (1 - uFrac)}
                            transform="rotate(-90 45 45)"
                            style={{ filter: `drop-shadow(0 0 5px ${u.color})` }}
                          />
                        </svg>
                        <div className="bdo-ult-cd" style={{ display: 'flex', color: u.color, textShadow: `0 0 8px ${u.color}` }}>
                          {Math.ceil(cd)}
                        </div>
                      </>
                    )}
                    {isReady && (
                      <div className={`ult-ready-fx ult-ready-${u.readyFx}`} style={{ '--fx-color': u.color, '--fx-rgb': u.rgb }}>
                        <span className="ult-ready-glow"></span>
                        <svg className="ult-ready-circle-svg" viewBox="0 0 100 100">
                          <defs>
                            <radialGradient id={`urc-core-${u.key}`} cx="50%" cy="50%" r="50%">
                              <stop offset="0%" stopColor={u.color} stopOpacity="0.28" />
                              <stop offset="60%" stopColor={u.color} stopOpacity="0.08" />
                              <stop offset="100%" stopColor={u.color} stopOpacity="0" />
                            </radialGradient>
                          </defs>
                          <circle cx="50" cy="50" r="44" fill={`url(#urc-core-${u.key})`} />
                          <g className="urc-outer-ring">
                            <circle cx="50" cy="50" r="47" fill="none" stroke={u.color} strokeWidth="0.7" strokeDasharray="0.8 3.6" opacity="0.55" />
                            <circle cx="50" cy="50" r="43.5" fill="none" stroke={u.color} strokeWidth="0.35" opacity="0.3" />
                            {Array.from({ length: 16 }).map((_, ti) => (
                              <line key={`t${ti}`} x1="50" y1="3.2" x2="50" y2="8.2" stroke={u.color} strokeWidth="1" strokeLinecap="round" opacity={ti % 4 === 0 ? 0.9 : 0.5} transform={`rotate(${(360 / 16) * ti} 50 50)`} />
                            ))}
                            {Array.from({ length: 4 }).map((_, si) => (
                              <line key={`s${si}`} x1="50" y1="6.5" x2="50" y2="20" stroke={u.color} strokeWidth="0.4" opacity="0.25" transform={`rotate(${90 * si} 50 50)`} />
                            ))}
                          </g>
                          <g className="urc-mid-ring">
                            <circle cx="50" cy="50" r="38" fill="none" stroke={u.color} strokeWidth="0.5" strokeDasharray="5 2.5" opacity="0.4" />
                            {['✦', '◇', '✧', '◇', '✦', '◇', '✧', '◇'].map((g, gi) => {
                              const rad = (gi * 45 * Math.PI) / 180;
                              return (
                                <text key={gi} x={50 + Math.cos(rad) * 38} y={50 + Math.sin(rad) * 38} fontSize="4.2" fill={u.color} textAnchor="middle" dominantBaseline="central" opacity="0.8">{g}</text>
                              );
                            })}
                          </g>
                          <g className="urc-inner-ring">
                            <polygon points="50,20 76.9,65.5 23.1,65.5" fill="none" stroke={u.color} strokeWidth="0.55" opacity="0.5" />
                            <polygon points="50,80 23.1,34.5 76.9,34.5" fill="none" stroke={u.color} strokeWidth="0.35" opacity="0.3" />
                            <circle cx="50" cy="50" r="13" fill="none" stroke={u.color} strokeWidth="0.5" strokeDasharray="2 2" opacity="0.5" />
                          </g>
                          <circle className="urc-core-dot" cx="50" cy="50" r="2.2" fill={u.color} />
                        </svg>
                        <div className="ult-smoke-container">
                          {Array.from({ length: PARTICLE_COUNT }).map((_, pi) => {
                            const ang = (360 / PARTICLE_COUNT) * pi;
                            const rad = (ang * Math.PI) / 180;
                            const wr = 30;
                            const px = Math.cos(rad) * wr;
                            const py = Math.sin(rad) * wr;
                            const sway = 6 + (pi % 3) * 3;
                            return (
                              <span
                                key={pi}
                                className="ult-smoke-wisp"
                                style={{
                                  '--p-x': `${px.toFixed(1)}px`,
                                  '--p-y': `${py.toFixed(1)}px`,
                                  '--p-sway': `${sway}px`,
                                  '--p-delay': `${(pi * (2.2 / PARTICLE_COUNT)).toFixed(2)}s`,
                                }}
                              ></span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          );
        })()}

        {/* 💨 THE DASH BUTTON — BDO Sword Center Button */}
        {screen === 'playing' && (
          <div
            className="dash-btn-container"
            style={{
              visibility: hasStarted ? 'visible' : 'hidden',
              pointerEvents: hasStarted ? 'auto' : 'none',
            }}
            onPointerDown={(e) => { e.stopPropagation(); window.triggerDash(); }}
          >
            <div className="dash-icon">
<svg width="30" height="30" viewBox="0 0 24 24" fill="none" style={{ color: '#5eead4' }}>
  {/* Head */}
  <circle cx="16" cy="5" r="2" fill="currentColor"/>

  {/* Torso (leaning forward, running posture) */}
  <line x1="15" y1="7" x2="11" y2="13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>

  {/* Reaching arm */}
  <path d="M14.5,8 L18,9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>

  {/* Front leg (knee up, kicking forward) */}
  <path d="M11,13 L13.5,15.5 L11.5,19" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none"/>

  {/* Back leg (trailing, extended) */}
  <path d="M11,13 L7.5,15 L4.5,13.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none"/>

  {/* Speed/motion trail lines */}
  <line x1="1" y1="17" x2="7" y2="17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.6"/>
  <line x1="1" y1="19.3" x2="5" y2="19.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.4"/>
  <line x1="1.5" y1="21.5" x2="4" y2="21.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.25"/>
</svg>
            </div>
            <div className="dash-label">DASH</div>
            <div ref={dashCdRef} className="dash-cd-overlay"></div>
          </div>
        )}

        {/* ========================================== */}
        {/* BOTTOM RIGHT MENUS: moved to upper-right BDO style */}
        {/* ========================================== */}

        {/* ========================================== */}
        {/* THE INVENTORY MODAL */}
        {/* ========================================== */}
        {screen === 'playing' && isInventoryOpen && (
          <div 
            className="inventory-modal" 
            onPointerDown={e => e.stopPropagation()} 
            onPointerUp={e => e.stopPropagation()} 
            onTouchStart={e => e.stopPropagation()}
            onTouchEnd={e => e.stopPropagation()}
            onTouchMove={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()} // 🔥 Dagdag na pangharang para sa React Synthetic Clicks
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontWeight: 'bold', color: '#fef08a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ verticalAlign: 'middle' }}>
                  <rect x="3" y="9" width="18" height="13" rx="2" stroke="#fef08a" strokeWidth="1.8"/>
                  <path d="M8 9V7a4 4 0 0 1 8 0v2" stroke="#fef08a" strokeWidth="1.8" strokeLinecap="round"/>
                  <line x1="3" y1="14" x2="21" y2="14" stroke="#fef08a" strokeWidth="1.2" opacity="0.5"/>
                  <circle cx="12" cy="16.5" r="1.3" fill="#fef08a" opacity="0.8"/>
                </svg>
                EQUIPMENT &amp; INVENTORY
              </span>
              <button 
                onPointerDown={(e) => { e.stopPropagation(); setIsInventoryOpen(false); }} 
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

           {/* Equipped Section */}
            <div className="equip-section">
              {['wand', 'robe', 'boots'].map(slot => {
                const localTgt = (isCoop && !netRef.current.isHost) ? engineRef.current.p2 : engineRef.current.p;
                const item = localTgt?.equipment?.[slot];
                return (
                  <div className="equip-box" key={slot}>
                    <span>{slot.toUpperCase()}</span>
                    <div 
                      className="inv-slot" 
                      data-rarity={item ? item.rarity : 'none'}
                      onPointerDown={(e) => { 
                        e.stopPropagation(); // 🔥 Ito ang pipigil sa joystick na huminto!
                        unequipItem(slot); 
                      }}
                      style={{ width: '60px', position: 'relative' }} 
                    >
                      {item ? (
                        <>
                        <span style={{ fontSize: '1.5rem' }}>
                          {slot === 'wand' ? (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                              <line x1="3" y1="21" x2="15" y2="9" stroke="#c4b5fd" strokeWidth="2.2" strokeLinecap="round"/>
                              <path d="M15 9 L17 4 L19 9 L14 7 L19 7 L14 9 Z" fill="#e879f9" opacity="0.9"/>
                              <circle cx="15" cy="9" r="1.5" fill="#f0abfc"/>
                              <line x1="18" y1="3" x2="18" y2="6" stroke="#fef08a" strokeWidth="1.2" strokeLinecap="round" opacity="0.8"/>
                              <line x1="20" y1="5" x2="17" y2="5" stroke="#fef08a" strokeWidth="1.2" strokeLinecap="round" opacity="0.8"/>
                            </svg>
                          ) : slot === 'robe' ? (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                              <path d="M8 3 L4 7 L5 21 L12 19 L19 21 L20 7 L16 3" stroke="#a78bfa" strokeWidth="1.8" strokeLinejoin="round"/>
                              <path d="M8 3 Q12 6 16 3" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round"/>
                              <path d="M9 3 L7 8 M15 3 L17 8" stroke="#c4b5fd" strokeWidth="1.2" strokeLinecap="round" opacity="0.7"/>
                              <circle cx="12" cy="8" r="1.2" fill="#e879f9" opacity="0.9"/>
                            </svg>
                          ) : (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                              <path d="M4 17 Q4 21 8 21 L18 21 Q21 21 21 18 L21 16 L9 16 L9 9 L5 9 Q4 9 4 12 Z" stroke="#60a5fa" strokeWidth="1.7" strokeLinejoin="round"/>
                              <path d="M9 9 L9 16" stroke="#60a5fa" strokeWidth="1.5"/>
                              <line x1="9" y1="19" x2="17" y2="19" stroke="#93c5fd" strokeWidth="1.2" opacity="0.7"/>
                              <path d="M5 9 Q6 6 9 6 L9 9" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round"/>
                            </svg>
                          )}
                        </span>
                          
                          {/* AUTO-DETECT: Plus Badge Indicator */}
                          {(() => {
                            let plusVal = item.plus || item.level || item.upgrade || 0;
                            if (!plusVal && item.name) {
                              const match = item.name.match(/\+(\d+)/);
                              if (match) plusVal = parseInt(match[1]);
                            }
                            return plusVal > 0 ? <div className="item-plus-badge">+{plusVal}</div> : null;
                          })()}

                          <div className="item-tooltip" style={{ borderColor: RARITY_COLORS[item.rarity] }}>
                            <div style={{ color: RARITY_COLORS[item.rarity], fontWeight: 'bold' }}>{item.name}</div>
                            <div style={{ color: '#b9c4d8', fontSize: '0.68rem', marginBottom: '4px' }}>{item.rarity.toUpperCase()}</div>
                            {renderTooltipStats(item)}
                            <div style={{ color: '#fbbf24', marginTop: '4px' }}>{item.desc}</div>
                            <div style={{ color: '#ef4444', marginTop: '4px', fontSize: '0.55rem' }}>(Click to Unequip)</div>
                          </div>
                        </>
                      ) : <span style={{ opacity: 0.3 }}>Empty</span>}
                    </div>
                  </div>
                );
              })}
            </div>

           {/* Backpack Grid */}
            <div className="backpack-header">
              <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>Backpack (Max 16)</div>
              <button 
                className="clear-all-btn"
                onPointerDown={(e) => { 
                  e.stopPropagation();
                  clearAllInventory(); 
                }}
                onClick={(e) => e.stopPropagation()}
                title="Delete all items"
              >
                Clear All
              </button>
            </div>

            <div className="inv-grid">
              {Array.from({ length: 16 }).map((_, i) => {
                const localTgt = (isCoop && !netRef.current.isHost) ? engineRef.current.p2 : engineRef.current.p;
                const item = localTgt?.inventory?.[i];
                const equippedItem = item ? localTgt?.equipment?.[item.type] : null;

                return (
                  <div 
                    key={i} 
                    className="inv-slot" 
                    data-rarity={item ? item.rarity : 'none'}
                    onPointerDown={(e) => { 
                      e.stopPropagation(); // 🔥 Ito ang pipigil sa joystick na huminto!
                      if (item) equipItem(item, i); 
                    }}
                    style={{ position: 'relative' }} 
                  >
                    {item && (
                      <>
                        <button 
                          className="delete-btn"
                          onPointerDown={(e) => { 
                            e.stopPropagation();
                            deleteItem(i); 
                          }}
                          onClick={(e) => e.stopPropagation()} 
                        >
                          ✕
                        </button>
                        
                        <span style={{ fontSize: '1.5rem' }}>
                          {item.type === 'wand' ? (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                              <line x1="3" y1="21" x2="15" y2="9" stroke="#c4b5fd" strokeWidth="2.2" strokeLinecap="round"/>
                              <path d="M15 9 L17 4 L19 9 L14 7 L19 7 L14 9 Z" fill="#e879f9" opacity="0.9"/>
                              <circle cx="15" cy="9" r="1.5" fill="#f0abfc"/>
                              <line x1="18" y1="3" x2="18" y2="6" stroke="#fef08a" strokeWidth="1.2" strokeLinecap="round" opacity="0.8"/>
                              <line x1="20" y1="5" x2="17" y2="5" stroke="#fef08a" strokeWidth="1.2" strokeLinecap="round" opacity="0.8"/>
                            </svg>
                          ) : item.type === 'robe' ? (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                              <path d="M8 3 L4 7 L5 21 L12 19 L19 21 L20 7 L16 3" stroke="#a78bfa" strokeWidth="1.8" strokeLinejoin="round"/>
                              <path d="M8 3 Q12 6 16 3" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round"/>
                              <path d="M9 3 L7 8 M15 3 L17 8" stroke="#c4b5fd" strokeWidth="1.2" strokeLinecap="round" opacity="0.7"/>
                              <circle cx="12" cy="8" r="1.2" fill="#e879f9" opacity="0.9"/>
                            </svg>
                          ) : (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                              <path d="M4 17 Q4 21 8 21 L18 21 Q21 21 21 18 L21 16 L9 16 L9 9 L5 9 Q4 9 4 12 Z" stroke="#60a5fa" strokeWidth="1.7" strokeLinejoin="round"/>
                              <path d="M9 9 L9 16" stroke="#60a5fa" strokeWidth="1.5"/>
                              <line x1="9" y1="19" x2="17" y2="19" stroke="#93c5fd" strokeWidth="1.2" opacity="0.7"/>
                              <path d="M5 9 Q6 6 9 6 L9 9" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round"/>
                            </svg>
                          )}
                        </span>
                        
                        {/* AUTO-DETECT: Plus Badge Indicator */}
                        {(() => {
                          let plusVal = item.plus || item.level || item.upgrade || 0;
                          if (!plusVal && item.name) {
                            const match = item.name.match(/\+(\d+)/);
                            if (match) plusVal = parseInt(match[1]);
                          }
                          return plusVal > 0 ? <div className="item-plus-badge">+{plusVal}</div> : null;
                        })()}

                        {/* 🔥 BiS BADGE UI (Nakalagay sa upper-left para hindi mag-overlap sa delete button) */}
                        {isItemBiS(item, localTgt) && (
                          <div style={{
                            position: 'absolute',
                            top: '-6px',
                            left: '-6px',
                            backgroundColor: '#22c55e',
                            color: 'white',
                            fontSize: '8px',
                            fontWeight: 'bold',
                            padding: '2px 4px',
                            borderRadius: '4px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                            pointerEvents: 'none',
                            zIndex: 10,
                            textTransform: 'uppercase',
                            fontFamily: 'monospace'
                          }}>
                            BiS 🡅
                          </div>
                        )}
                        
                        {/* 3. DYNAMIC TOOLTIP FOR SIDE-BY-SIDE COMPARISON */}
                        <div className="item-tooltip" style={{ 
                          display: 'flex',
                          flexDirection: 'row',
                          gap: '8px',
                          maxWidth: equippedItem ? '450px' : '190px', 
                          width: 'max-content',
                          background: 'transparent', 
                          border: 'none',
                          padding: 0,
                          boxShadow: 'none'
                        }}>
                          
                          {/* COLUMN 1: In Inventory */}
                          <div style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            minWidth: '140px',
                            background: '#09061a',
                            border: `1px solid ${RARITY_COLORS[item.rarity]}`,
                            borderRadius: '4px',
                            padding: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.7)'
                          }}>
                            <div style={{ color: '#34d399', fontSize: '0.55rem', marginBottom: '4px', borderBottom: '1px solid rgba(52, 211, 153, 0.4)', paddingBottom: '2px' }}>IN INVENTORY</div>
                            <div style={{ color: RARITY_COLORS[item.rarity], fontWeight: 'bold' }}>{item.name}</div>
                            <div style={{ color: '#b9c4d8', fontSize: '0.68rem', marginBottom: '4px' }}>{item.rarity.toUpperCase()} {item.type.toUpperCase()}</div>
                            {renderTooltipStats(item)}
                            <div style={{ color: '#fbbf24', marginTop: '4px' }}>{item.desc}</div>
                            <div style={{ color: '#10b981', marginTop: '6px', fontSize: '0.55rem' }}>(Click to Equip)</div>
                          </div>

                          {/* COLUMN 2: Equipped */}
                          {equippedItem && (
                            <div style={{ 
                              display: 'flex', 
                              flexDirection: 'column', 
                              minWidth: '140px', 
                              opacity: 0.9,
                              background: '#09061a',
                              border: `1px solid ${RARITY_COLORS[equippedItem.rarity]}`,
                              borderRadius: '4px',
                              padding: '8px',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.7)'
                            }}>
                              <div style={{ color: '#fef08a', fontSize: '0.55rem', marginBottom: '4px', borderBottom: '1px solid rgba(254, 240, 138, 0.4)', paddingBottom: '2px' }}>CURRENTLY EQUIPPED</div>
                              <div style={{ color: RARITY_COLORS[equippedItem.rarity], fontWeight: 'bold' }}>{equippedItem.name}</div>
                              <div style={{ color: '#b9c4d8', fontSize: '0.68rem', marginBottom: '4px' }}>{equippedItem.rarity.toUpperCase()} {equippedItem.type.toUpperCase()}</div>
                              {renderTooltipStats(equippedItem)}
                              <div style={{ color: '#fbbf24', marginTop: '4px' }}>{equippedItem.desc}</div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* THE HELP MODAL — Hotkeys & How To Play */}
        {/* ========================================== */}
        {screen === 'playing' && isHelpOpen && (
          <div
            className="help-modal"
            onPointerDown={e => e.stopPropagation()}
            onPointerUp={e => e.stopPropagation()}
            onTouchStart={e => e.stopPropagation()}
            onTouchEnd={e => e.stopPropagation()}
            onTouchMove={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold', color: '#fef08a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ verticalAlign: 'middle' }}>
                  <circle cx="12" cy="12" r="9.2" stroke="#fef08a" strokeWidth="1.8"/>
                  <path d="M9.3 9.6 C9.3 7.9 10.6 6.6 12 6.6 C13.5 6.6 14.7 7.7 14.7 9.1 C14.7 11 12 11.2 12 13.6" stroke="#fef08a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="16.8" r="1.05" fill="#fef08a"/>
                </svg>
                HELP &amp; HOTKEYS
              </span>
              <button
                onPointerDown={(e) => { e.stopPropagation(); setIsHelpOpen(false); }}
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div className="help-modal-body">

              <div className="help-section-title">How To Play</div>
              <p className="help-text">
                Survive the endless waves of enemies and bosses. Move your hero around the
                arena, auto-attack nearby foes, and collect XP orbs they drop to level up.
                Defeated enemies sometimes drop gear &mdash; pick it up and equip it from your
                Bag to grow stronger. The longer you survive, the tougher the waves get, so
                use your Dash to dodge danger and your Elemental Sigils &amp; Ultimates to
                turn the tide of battle.
              </p>

              <div className="help-section-title">Movement &amp; Combat</div>
              {isTouchDevice ? (
                <div className="help-key-row">
                  <span className="help-key-combo">
                    <span className="help-key help-key-icon" title="Virtual Joystick">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" opacity="0.55"/>
                        <circle cx="12" cy="12" r="3.6" fill="currentColor"/>
                      </svg>
                    </span>
                  </span>
                  <span className="help-key-desc">Touch &amp; drag on the left side of the screen to move</span>
                </div>
              ) : (
                <div className="help-key-row">
                  <span className="help-key-combo"><span className="help-key">W</span><span className="help-key">A</span><span className="help-key">S</span><span className="help-key">D</span><span className="help-key-or">or</span><span className="help-key">▲▼◀▶</span></span>
                  <span className="help-key-desc">Move your hero</span>
                </div>
              )}
              <div className="help-key-row">
                <span className="help-key-combo"><span className="help-key help-key-wide">SPACE</span></span>
                <span className="help-key-desc">Dash (dodge enemies &amp; attacks)</span>
              </div>
              <div className="help-key-row">
                <span className="help-key-combo"><span className="help-key">P</span><span className="help-key-or">or</span><span className="help-key help-key-wide">ESC</span></span>
                <span className="help-key-desc">Pause / Resume the match</span>
              </div>

              <div className="help-section-title">Menus</div>
              <div className="help-key-row">
                <span className="help-key-combo"><span className="help-key">T</span></span>
                <span className="help-key-desc">Toggle Stats panel</span>
              </div>
              <div className="help-key-row">
                <span className="help-key-combo"><span className="help-key">I</span></span>
                <span className="help-key-desc">Toggle Bag (Inventory)</span>
              </div>
              <div className="help-key-row">
                <span className="help-key-combo"><span className="help-key">K</span></span>
                <span className="help-key-desc">Toggle Skill Tree <em>(unlocks at Lv.5)</em></span>
              </div>
              <div className="help-key-row">
                <span className="help-key-combo"><span className="help-key">H</span></span>
                <span className="help-key-desc">Toggle this Help menu</span>
              </div>

              <div className="help-section-title">Elemental Sigils <em>(unlocks at Lv.10)</em></div>
              <div className="help-key-row">
                <span className="help-key-combo"><span className="help-key">1</span></span>
                <span className="help-key-desc">Flare &mdash; fire blast sigil</span>
              </div>
              <div className="help-key-row">
                <span className="help-key-combo"><span className="help-key">2</span></span>
                <span className="help-key-desc">Wave &mdash; tidal wave sigil</span>
              </div>
              <div className="help-key-row">
                <span className="help-key-combo"><span className="help-key">3</span></span>
                <span className="help-key-desc">Fissure &mdash; earth slam sigil</span>
              </div>
              <div className="help-key-row">
                <span className="help-key-combo"><span className="help-key">4</span></span>
                <span className="help-key-desc">Storm &mdash; lightning surge sigil</span>
              </div>
              <div className="help-key-row">
                <span className="help-key-combo"><span className="help-key">5</span></span>
                <span className="help-key-desc">Ice &mdash; ice storm sigil</span>
              </div>
              <div className="help-key-row">
                <span className="help-key-combo"><span className="help-key">6</span></span>
                <span className="help-key-desc">Heal &mdash; nature recovery sigil</span>
              </div>

              <div className="help-section-title">Ultimate Spells <em>(unlocks at Lv.16)</em></div>
              <div className="help-key-row">
                <span className="help-key-combo"><span className="help-key">Q</span></span>
                <span className="help-key-desc">Arcane Collapse</span>
              </div>
              <div className="help-key-row">
                <span className="help-key-combo"><span className="help-key">E</span></span>
                <span className="help-key-desc">Arcane Instinct</span>
              </div>
              <div className="help-key-row">
                <span className="help-key-combo"><span className="help-key">R</span></span>
                <span className="help-key-desc">Arcane Resurrection</span>
              </div>

              <div className="help-section-title">Touch Controls</div>
              <p className="help-text">
                On phones and tablets, touch and drag on the left side of the screen to
                move your hero, and tap the on-screen icons (Stats, Bag, Skills, Help) and
                buttons (Dash, Sigils, Ultimates) to use them.
              </p>

            </div>
          </div>
        )}

            {screen === 'playing' && playerLevel >= 5 && isTreeOpen && (
              <div 
                className="skill-tree-container"
                onPointerDown={(e) => e.stopPropagation()}
                onPointerMove={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                onWheel={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
            <div className="skill-tree-title-row">
              <span className="skill-tree-title">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ verticalAlign: 'middle', marginRight: 5 }}>
                  <path d="M12 2 L20 5.5 V11 C20 16.5 16.5 20.5 12 22 C7.5 20.5 4 16.5 4 11 V5.5 Z" stroke="#a78bfa" strokeWidth="1.6" strokeLinejoin="round"/>
                  <path d="M6.5 10 H17.5 M6.5 14 H17.5" stroke="#a78bfa" strokeWidth="1.1" opacity="0.55"/>
                  <path d="M12 6 V18" stroke="#a78bfa" strokeWidth="1.1" opacity="0.55"/>
                  <circle cx="12" cy="11" r="2.2" fill="#7c3aed" opacity="0.7"/>
                </svg>
                DEFENSIVE SPELLS (LV 5+)
              </span>
              <button 
                className="skill-tree-close-x" 
                onPointerDown={(e) => { e.stopPropagation(); setIsTreeOpen(false); }}
              >
                ✕
              </button>
            </div>
            
            <button 
              className={`skill-row-btn ${skillsState.berserk?.learned ? (skillsState.berserk.enabled ? 'learned' : 'disabled-toggle') : ''}`}
              onPointerDown={(e) => { e.stopPropagation(); learnSkillTreeTech('berserk'); }}
            >
              <span><ArcaneIcon type="berserk" size={15} /> Berserk Aura {skillsState.berserk?.learned ? (skillsState.berserk.enabled ? '[ON]' : '[OFF]') : ''}</span>
              {skillsState.berserk?.learned && (
                <span className="skill-cd-text">
                  {skillsState.berserk.duration > 0 ? `Active ${Math.ceil(skillsState.berserk.duration)}s` : `CD ${Math.ceil(skillsState.berserk.cd)}s`}
                </span>
              )}
            </button>
            <div className="skill-node-desc">Cuts your active shooting interval directly in half and increases bolt damage output by +50%.</div>

            <button 
              className={`skill-row-btn ${skillsState.haste?.learned ? (skillsState.haste.enabled ? 'learned' : 'disabled-toggle') : ''}`}
              onPointerDown={(e) => { e.stopPropagation(); learnSkillTreeTech('haste'); }}
            >
              <span><ArcaneIcon type="haste" size={15} /> Massive Haste {skillsState.haste?.learned ? (skillsState.haste.enabled ? '[ON]' : '[OFF]') : ''}</span>
              {skillsState.haste?.learned && (
                <span className="skill-cd-text">
                  {skillsState.haste.duration > 0 ? `Active ${Math.ceil(skillsState.haste.duration)}s` : `CD ${Math.ceil(skillsState.haste.cd)}s`}
                </span>
              )}
            </button>
            <div className="skill-node-desc">Increases character movement velocity by +45% to easily kite massive groups of enemies.</div>

            <button 
              className={`skill-row-btn ${skillsState.fortify?.learned ? (skillsState.fortify.enabled ? 'learned' : 'disabled-toggle') : ''}`}
              onPointerDown={(e) => { e.stopPropagation(); learnSkillTreeTech('fortify'); }}
            >
              <span><ArcaneIcon type="fortify" size={15} /> Fortify {skillsState.fortify?.learned ? (skillsState.fortify.enabled ? '[ON]' : '[OFF]') : ''}</span>
              {skillsState.fortify?.learned && <span className="skill-cd-text">PERMANENT</span>}
            </button>
            <div className="skill-node-desc">Hardens your wizard robes to grant a flat, permanent 25% damage reduction from all sources.</div>

            <button 
              className={`skill-row-btn ${skillsState.shield?.learned ? (skillsState.shield.enabled ? 'learned' : 'disabled-toggle') : ''}`}
              onPointerDown={(e) => { e.stopPropagation(); learnSkillTreeTech('shield'); }}
            >
              <span><ArcaneIcon type="shield" size={15} /> Rigid's Defender {skillsState.shield?.learned ? (skillsState.shield.enabled ? '[ON]' : '[OFF]') : ''}</span>
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
                  <span className="skill-tree-title" style={{ color: '#f43f5e' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ verticalAlign: 'middle', marginRight: 5 }}>
                      <path d="M5 19 L17 7" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M13 7 L19 5 L17 11 Z" fill="#f43f5e" opacity="0.9"/>
                      <path d="M7 17 Q5.5 19 5 21 Q6.8 20.3 8 19" fill="#fb7185" opacity="0.85"/>
                      <path d="M9 13 L11 11" stroke="#fda4af" strokeWidth="1.2" strokeLinecap="round" opacity="0.6"/>
                    </svg>
                    OFFENSIVE SPELLS (LV 10+)
                  </span>
                </div>

                <button 
                  className={`skill-row-btn ${skillsState.bodyCutter?.learned ? (skillsState.bodyCutter.enabled ? 'learned' : 'disabled-toggle') : ''}`}
                  onPointerDown={(e) => { e.stopPropagation(); learnSkillTreeTech('bodyCutter'); }}
                >
                  <span><ArcaneIcon type="bodyCutter" size={15} /> Body Cutter {skillsState.bodyCutter?.learned ? (skillsState.bodyCutter.enabled ? '[ON]' : '[OFF]') : ''}</span>
                  {skillsState.bodyCutter?.learned && <span className="skill-cd-text">PASSIVE</span>}
                </button>
                <div className="skill-node-desc">Applies stigma/debuff and damage-over-time effects to your enemies.</div>

                <button 
                  className={`skill-row-btn ${skillsState.shootingStar?.learned ? (skillsState.shootingStar.enabled ? 'learned' : 'disabled-toggle') : ''}`}
                  onPointerDown={(e) => { e.stopPropagation(); learnSkillTreeTech('shootingStar'); }}
                >
                  <span><ArcaneIcon type="shootingStar" size={15} /> Shooting Star {skillsState.shootingStar?.learned ? (skillsState.shootingStar.enabled ? '[ON]' : '[OFF]') : ''}</span>
                  {skillsState.shootingStar?.learned && <span className="skill-cd-text">AUTO</span>}
                </button>
                <div className="skill-node-desc">Summons explosive cube effects for area damage.</div>

                <button 
                  className={`skill-row-btn ${skillsState.cubeBash?.learned ? (skillsState.cubeBash.enabled ? 'learned' : 'disabled-toggle') : ''}`}
                  onPointerDown={(e) => { e.stopPropagation(); learnSkillTreeTech('cubeBash'); }}
                >
                  <span><ArcaneIcon type="cubeBash" size={15} /> Cube Bash {skillsState.cubeBash?.learned ? (skillsState.cubeBash.enabled ? '[ON]' : '[OFF]') : ''}</span>
                  {skillsState.cubeBash?.learned && <span className="skill-cd-text">AUTO</span>}
                </button>
                <div className="skill-node-desc">Cube-based control attack that can disable or stun enemies.</div>

                <button 
                  className={`skill-row-btn ${skillsState.vacuumSlash?.learned ? (skillsState.vacuumSlash.enabled ? 'learned' : 'disabled-toggle') : ''}`}
                  onPointerDown={(e) => { e.stopPropagation(); learnSkillTreeTech('vacuumSlash'); }}
                >
                  <span><ArcaneIcon type="vacuumSlash" size={15} /> Vacuum Slash {skillsState.vacuumSlash?.learned ? (skillsState.vacuumSlash.enabled ? '[ON]' : '[OFF]') : ''}</span>
                  {skillsState.vacuumSlash?.learned && <span className="skill-cd-text">AUTO</span>}
                </button>
                <div className="skill-node-desc">Powerful attack by slashing the air generating massive force to damage the enemy.</div>
              </>
            )}

            {playerLevel >= 16 && (
              <>
                <div className="skill-tree-title-row" style={{ marginTop: '12px' }}>
                  <span className="skill-tree-title" style={{ color: '#d946ef', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <ArcaneIcon type="ultimateSeal" size={15} />
                    ULTIMATE SPELLS (LV 12+)
                  </span>
                </div>

                <button 
                  className="skill-row-btn learned"
                  onPointerDown={(e) => { e.stopPropagation(); castArcaneCollapseUltimate(); }}
                >
                  <span><ArcaneIcon type="arcaneCollapse" size={15} /> Arcane Collapse [Press Q]</span>
                  <span className="skill-cd-text">25s CD</span>
                </button>
                <div className="skill-node-desc" style={{ borderColor: '#d946ef' }}>
                  Shatters reality! Casts Time Lock (8s freeze), Temporal Slow, Arcane Burn DoT, Void Exhaustion, and 50% extra skill damage vulnerability onto all targets.
                </div>

                <button 
                  className="skill-row-btn learned"
                  style={{ border: '1px solid #e879f9' }}
                  onPointerDown={(e) => { e.stopPropagation(); castArcaneInstinctUltimate(); }}
                >
                  <span><ArcaneIcon type="arcaneInstinct" size={15} /> Arcane Instinct [Press E]</span>
                  <span className="skill-cd-text">40s CD</span>
                </button>
                <div className="skill-node-desc" style={{ borderColor: '#e879f9' }}>
                  Bypasses reality casting parameters! Freezes all screen targets (2s), triggers rapid consecutive offensive skills burst auto-casts (0.5s), and magnifies ALL hero stats by +500% (15s).
                </div>

                <button 
                  className="skill-row-btn learned"
                  style={{ border: '1px solid #10b981' }}
                  onPointerDown={(e) => { e.stopPropagation(); castArcaneResurrectionUltimate(); }}
                >
                  <span><ArcaneIcon type="arcaneResurrect" size={15} /> Arcane Resurrection [Press R]</span>
                  <span className="skill-cd-text">300s CD</span>
                </button>
                <div className="skill-node-desc" style={{ borderColor: '#10b981' }}>
                  Forbidden Magic: Revives a fallen ally with 70% Max HP and immediately grants them a 10s Rigid Defender shield. <br/><span style={{ color: '#f87171' }}>SACRIFICE: Casting this halves your current EXP and permanently burns away 1 of your Levels.</span>
                </div>
              </>
            )}
          </div>
        )}

        {screen === 'playing' && isPreloading && (
          <LoadingScreen
            duration={7000}
            isCoop={Boolean(isCoop || (netRef.current && netRef.current.channel))}
            onComplete={() => {
              isPreloadingRef.current = false;
              setIsPreloading(false);
            }}
          />
        )}

        {screen === 'playing' && (
          <div
            className="hud-start-overlay"
            style={{
              visibility: (hasStarted || isPreloading) ? 'hidden' : 'visible',
              pointerEvents: (hasStarted || isPreloading) ? 'none' : 'auto',
              transition: 'visibility 0s, opacity 0.2s',
              opacity: (hasStarted || isPreloading) ? 0 : 1,
            }}
          >
            <div className="hud-start-modal">
              
              <div className="hud-corner hud-corner-tl"></div>
              <div className="hud-corner hud-corner-tr"></div>
              <div className="hud-corner hud-corner-bl"></div>
              <div className="hud-corner hud-corner-br"></div>

              <div className="hud-rune-row">
                <span>ᚦ</span><span>ᚨ</span><span>ᚱ</span><span>ᛁ</span><span>ᛏ</span>
              </div>

              <svg className="hud-sigil" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                <polygon points="20,2 37,11 37,29 20,38 3,29 3,11" fill="none" stroke="#534AB7" strokeWidth="0.8" opacity="0.7"/>
                <polygon points="20,7 32,14 32,26 20,33 8,26 8,14" fill="none" stroke="#7F77DD" strokeWidth="0.5" opacity="0.5"/>
                <circle cx="20" cy="20" r="4" fill="none" stroke="#AFA9EC" strokeWidth="0.8" opacity="0.8"/>
                <line x1="20" y1="2" x2="20" y2="14" stroke="#534AB7" strokeWidth="0.5" opacity="0.5"/>
                <line x1="20" y1="26" x2="20" y2="38" stroke="#534AB7" strokeWidth="0.5" opacity="0.5"/>
                <line x1="3" y1="11" x2="14" y2="17" stroke="#534AB7" strokeWidth="0.5" opacity="0.5"/>
                <line x1="26" y1="23" x2="37" y2="29" stroke="#534AB7" strokeWidth="0.5" opacity="0.5"/>
                <line x1="37" y1="11" x2="26" y2="17" stroke="#534AB7" strokeWidth="0.5" opacity="0.5"/>
                <line x1="14" y1="23" x2="3" y2="29" stroke="#534AB7" strokeWidth="0.5" opacity="0.5"/>
              </svg>

              <div className="hud-divider">
                <span></span><i>✦</i><i>ᛝ</i><i>✦</i><span></span>
              </div>

              <h2>{isHostInstance ? "MOVE TO START GAME" : "WAITING FOR HOST"}</h2>

              <div className="hud-divider hud-divider-sm">
                <span></span><i>ᚾ</i><span></span>
              </div>

              <p>
                {isHostInstance 
                  ? (isTouchDevice 
                      ? "Touch and drag on the left side of the screen to begin battle." 
                      : "Press WASD or Arrow Keys to begin battle.")
                  : "The arena will initialize once the match host begins moving."}
              </p>

              {/* Dynamic Input Hint Rendering */}
              {isHostInstance && (
                isTouchDevice ? (
                  <div className="hud-touch-hint">
                    <div className="hud-touch-zone">
                      <div className="hud-touch-dot"></div>
                      <div className="hud-touch-ring"></div>
                    </div>
                  </div>
                ) : (
                  <div className="hud-wasd-hint">
                    <span className="hud-key hud-key-w">W</span>
                    <div className="hud-key-row">
                      <span className="hud-key hud-key-a">A</span>
                      <span className="hud-key hud-key-s">S</span>
                      <span className="hud-key hud-key-d">D</span>
                    </div>
                  </div>
                )
              )}

              <div className="hud-rune-footer">
                <span></span><i>ᛟ</i><i>ᚷ</i><i>ᛖ</i><span></span>
              </div>

            </div>
          </div>
        )}

        {screen === 'pause' && isNetworked && !netRef.current.isHost && (
 <div className="hud-start-overlay" style={{ zIndex: 110 }}>
      <div className="hud-start-modal" style={{ borderColor: '#a78bfa' }}>
        <div className="hud-corner hud-corner-tl" style={{ borderColor: '#a78bfa' }}></div>
        <div className="hud-corner hud-corner-tr" style={{ borderColor: '#a78bfa' }}></div>
        <div className="hud-corner hud-corner-bl" style={{ borderColor: '#a78bfa' }}></div>
        <div className="hud-corner hud-corner-br" style={{ borderColor: '#a78bfa' }}></div>
 
        <div className="hud-rune-row">
          <span>ᛒ</span><span>ᛁ</span><span>ᛞ</span><span>ᚨ</span><span>ᚾ</span>
        </div>
 
        <svg className="hud-sigil" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="17" fill="none" stroke="#a78bfa" strokeWidth="1" opacity="0.6"/>
          <line x1="15" y1="13" x2="15" y2="27" stroke="#c4b5fd" strokeWidth="2.5" opacity="0.85" strokeLinecap="round"/>
          <line x1="25" y1="13" x2="25" y2="27" stroke="#c4b5fd" strokeWidth="2.5" opacity="0.85" strokeLinecap="round"/>
        </svg>
 
        <div className="hud-divider">
          <span></span><i>✦</i><i>ᛝ</i><i>✦</i><span></span>
        </div>
 
        <h2>MATCH PAUSED</h2>
 
        <div className="hud-divider hud-divider-sm">
          <span></span><i>ᚾ</i><span></span>
        </div>
 
        <p>The Host has paused the session. Standing by for resumption...</p>
 
        <div className="hud-pulse-dots">
          <span></span><span></span><span></span>
        </div>
 
        <div className="hud-rune-footer">
          <span></span><i>ᛟ</i><i>ᚷ</i><i>ᛖ</i><span></span>
        </div>
      </div>
    </div>
        )}

        {hostExitedCountdown !== null && (
 <div className="hud-start-overlay" style={{ zIndex: 120 }}>
      <div className="hud-start-modal" style={{ borderColor: '#ef4444' }}>
        <div className="hud-corner hud-corner-tl" style={{ borderColor: '#ef4444' }}></div>
        <div className="hud-corner hud-corner-tr" style={{ borderColor: '#ef4444' }}></div>
        <div className="hud-corner hud-corner-bl" style={{ borderColor: '#ef4444' }}></div>
        <div className="hud-corner hud-corner-br" style={{ borderColor: '#ef4444' }}></div>
 
        <div className="hud-rune-row hud-rune-row-danger">
          <span>ᚺ</span><span>ᚨ</span><span>ᚷ</span><span>ᚨ</span><span>ᛚ</span>
        </div>
 
        <svg className="hud-sigil" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <polygon points="20,3 36,12 36,28 20,37 4,28 4,12" fill="none" stroke="#ef4444" strokeWidth="1" opacity="0.7"/>
          <line x1="14" y1="14" x2="26" y2="26" stroke="#f87171" strokeWidth="2.5" opacity="0.85" strokeLinecap="round"/>
          <line x1="26" y1="14" x2="14" y2="26" stroke="#f87171" strokeWidth="2.5" opacity="0.85" strokeLinecap="round"/>
        </svg>
 
        <div className="hud-divider hud-divider-danger">
          <span></span><i>✦</i><i>ᛝ</i><i>✦</i><span></span>
        </div>
 
        <h2 className="hud-title-danger">HOST EXITED THE ROOM</h2>
 
        <div className="hud-divider hud-divider-sm hud-divider-danger">
          <span></span><i>ᚾ</i><span></span>
        </div>
 
        <p style={{ fontSize: '1.2rem', color: '#f87171', fontWeight: 'bold', margin: '10px 0' }}>
          Exiting to main menu in {hostExitedCountdown}s...
        </p>
 
        <div className="hud-countdown-ring">
          <svg viewBox="0 0 36 36">
            <circle className="hud-countdown-track" cx="18" cy="18" r="15"></circle>
            <circle
              className="hud-countdown-fill"
              cx="18" cy="18" r="15"
              style={{ animationDuration: `${hostExitedCountdown}s` }}
            ></circle>
          </svg>
        </div>
 
        <div className="hud-rune-footer hud-rune-footer-danger">
          <span></span><i>ᛟ</i><i>ᚷ</i><i>ᛖ</i><span></span>
        </div>
      </div>
    </div>
        )}

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