import React, { useEffect, useRef, useState } from 'react';
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
      dash: '/dash.mp3',
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
    Object.values(this.pools).forEach(pool => {
      pool.forEach(audio => {
        audio.volume = 0; 
        const p = audio.play();
        if (p !== undefined) {
          p.then(() => {
            audio.pause();
            audio.currentTime = 0;
            audio.volume = 1; 
          }).catch(() => {});
        }
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
  // 1. Normal Minion (Mas malambot sa early game para madaling patayin)
  { r: 13, speed: 65,  hp: 25,  dmg: 15,  xp: 15,  color: '#e2e8f0', glow: '#94a3b8', boss: false },
  // 2. Fast/Assassin Minion (Mabilis pero sobrang lambot)
  { r: 11, speed: 115, hp: 15,  dmg: 25,  xp: 20,  color: '#fb923c', glow: '#f97316', boss: false },
  // 3. Tanky/Elite Minion (Makunat pero MABAGAL na para pwedeng takbuhan)
  { r: 15, speed: 55,  hp: 120, dmg: 35,  xp: 40,  color: '#818cf8', glow: '#6366f1', boss: false },
  // 4. Generic Mini-Boss (Balanced entry stats)
  { r: 27, speed: 60,  hp: 600, dmg: 80, xp: 150, color: '#fbbf24', glow: '#f59e0b', boss: true, type: 'miniBoss' },
];

const RARITY_COLORS = {
  common: '#e2e8f0',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#fbbf24',
  mythic: '#ef4444'
};

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
    white-space: nowrap;
    overflow: hidden;
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
  background: rgba(11, 8, 38, 0.45) !important; /* Pinalabnaw na color */
  backdrop-filter: blur(8px) !important;        /* Glass effect */
  -webkit-backdrop-filter: blur(8px) !important;
  border: 2px solid #8b5cf6;
  border-radius: 6px;
  padding: 10px;
  color: #fff;
  font-family: monospace;
  display: flex;
  flex-direction: column;
  gap: 4px;
  box-shadow: 0 0 20px rgba(139, 92, 246, 0.4);
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

.inventory-toggle-btn, .skill-tree-toggle-btn {
  background: #0f0726;
  border: 1px solid #eab308;
  color: #fef08a;
  font-family: monospace;
  font-size: 0.75rem;
  font-weight: bold;
  padding: 0 12px;
  height: 32px; /* Fixed height para hindi tabingi */
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  cursor: pointer;
  pointer-events: auto;
  box-shadow: 0 0 12px rgba(234, 179, 8, 0.2);
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.skill-tree-toggle-btn {
  background: #7c3aed;
  border-color: #a78bfa;
  color: #fff;
  box-shadow: 0 0 10px rgba(124, 58, 237, 0.6);
}

  .skill-tree-toggle-btn:hover {
    background: #6d28d9;
    transform: translateY(-2px);
  }

.skill-tree-container {
  position: absolute;
  bottom: 46px;
  right: 12px;
  background: rgba(11, 8, 38, 0.45) !important; /* Pinalabnaw */
  backdrop-filter: blur(8px) !important;
  -webkit-backdrop-filter: blur(8px) !important;
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

  touch-action: pan-y !important;
}

.skill-tree-container .skill-row-btn {
  touch-action: pan-y !important;
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

  /* MOBILE VIEW ADJUSTMENTS */
@media (max-width: 840px) {
.skill-tree-container {
    width: 250px !important;     /* Ibalik sa fixed width para hindi masyadong malapad */
    max-height: 50vh !important;
    bottom: 80px !important;     
    right: 12px !important;      /* Ibalik sa kanan gaya ng desktop */
    left: auto !important;       /* Siguraduhing hindi ito naka-center */
    transform: none !important;  /* Alisin yung centering */
    padding: 10px !important;
  }

  

  .skill-tree-title {
    font-size: 0.85rem !important; /* Konting lakihan para madaling basahin */
  }

  .skill-row-btn {
    padding: 10px 8px !important;  /* Mas malaking touch target sa mobile */
    font-size: 0.8rem !important;  /* Mas madaling basahin ang text */
  }

  .skill-node-desc {
    font-size: 0.75rem !important; /* Konting linaw sa description */
    padding: 6px 8px !important;
  }
}

/* ELEMENTAL SIGILS CONTAINER */
.elemental-sigils-container {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 45;
  background: rgba(11, 8, 38, 0.8);
  padding: 10px 8px;
  border: 2px solid #38bdf8;
  border-radius: 8px;
  box-shadow: 0 0 25px rgba(56, 189, 248, 0.3);
  backdrop-filter: blur(4px);
  pointer-events: auto;
}
/* 💨 DASH BUTTON (CENTERED ABOVE INVENTORY & SKILLS) */
  .dash-btn-container {
    position: absolute;
    bottom: 90px; /* ✅ Lulutang sa taas ng Inventory/Skills */
    right: 42px;  /* ✅ Nakapagitna nang eksakto sa dalawang menu buttons (Desktop) */
    width: 60px;
    height: 60px;
    background: radial-gradient(circle, rgba(16, 12, 54, 0.9) 0%, rgba(10, 8, 38, 0.95) 100%);
    border: 1.5px solid #2dd4bf;
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 45; /* 🔥 Nakatago sa likod ng Modal kapag bumukas */
    box-shadow: 0 0 20px rgba(45, 212, 191, 0.25), inset 0 0 10px rgba(45, 212, 191, 0.1);
    user-select: none;
    touch-action: none;
    transition: transform 0.1s, box-shadow 0.2s;
  }
  
  .dash-btn-container:active {
    transform: scale(0.9); /* ✅ Tinanggal ang translateX para hindi tumalon pag kinlick */
    box-shadow: 0 0 10px rgba(45, 212, 191, 0.4), inset 0 0 15px rgba(0, 0, 0, 0.5);
    background: #0d092b;
  }
  
  .dash-icon { 
    font-size: 1.4rem; 
    line-height: 1;
    margin-top: 2px; 
  }
  
  .dash-label { 
    font-size: 0.5rem; 
    color: #ccfbf1; 
    font-family: 'Avenir Next', 'Roboto', sans-serif; 
    font-weight: 700; 
    letter-spacing: 1px;
    text-transform: uppercase;
    margin-top: 1px; 
    text-shadow: 0 1px 3px rgba(0,0,0,0.5); 
  }
  
  .dash-cd-overlay {
    position: absolute; inset: -1px; background: rgba(0,0,0,0.8); border-radius: 50%;
    display: none; align-items: center; justify-content: center;
    color: #fef08a; font-size: 1.1rem; font-weight: bold; font-family: monospace;
    border: 1.5px solid rgba(45, 212, 191, 0.3); 
  }

  /* 📱 MOBILE VIEW */
  @media (max-width: 840px) {
    .dash-btn-container {
      width: 58px; 
      height: 58px; 
      bottom: 75px; 
      right: 36px; /* ✅ Nakapagitna sa dalawang menu buttons sa Mobile View */
      box-shadow: 0 4px 15px rgba(0,0,0,0.5), 0 0 15px rgba(45, 212, 191, 0.2);
    }
    .dash-btn-container:active {
      transform: scale(0.9);
    }
    .dash-icon { font-size: 1.5rem; margin-top: 3px; }
    .dash-label { 
      display: block; 
      font-size: 0.55rem; 
      margin-top: 0;
      letter-spacing: 0.5px;
    }
    .dash-cd-overlay { font-size: 1rem; }
  }

  .sigil-btn {
    position: relative;
    width: 52px;
    height: 52px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.6rem;
    cursor: pointer;
    border: 2px solid;
    background: #0f0726;
    transition: all 0.2s ease;
    box-shadow: inset 0 0 10px rgba(0,0,0,0.8);
  }
  .sigil-btn:hover { transform: scale(1.1); }
  .sigil-fire { border-color: #ef4444; text-shadow: 0 0 10px #ef4444; }
  .sigil-water { border-color: #3b82f6; text-shadow: 0 0 10px #3b82f6; }
  .sigil-earth { border-color: #f59e0b; text-shadow: 0 0 10px #f59e0b; }
  .sigil-lightning { border-color: #c084fc; text-shadow: 0 0 10px #c084fc; }
  .sigil-ice { border-color: #38bdf8; text-shadow: 0 0 10px #38bdf8; }

  .sigil-ice { border-color: #38bdf8; text-shadow: 0 0 10px #38bdf8; }
  /* ADD THIS NEW LINE BELOW SIGIL-ICE */
  .sigil-nature { border-color: #22c55e; text-shadow: 0 0 10px #22c55e; }
  
  .sigil-cd-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0,0,0,0.7);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-weight: bold;
    font-family: monospace;
    font-size: 1.1rem;
  }
  
  .sigil-title {
     font-size: 0.5rem;
     position: absolute;
     bottom: -16px;
     color: #fff;
     white-space: nowrap;
     font-family: monospace;
     text-align: center;
     background: rgba(0,0,0,0.8);
     padding: 2px 4px;
     border-radius: 4px;
     opacity: 0;
     transition: opacity 0.2s;
     pointer-events: none;
     z-index: 100;
  }
  .sigil-btn:hover .sigil-title { opacity: 1; }

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
  max-width: 65vw; 
  overflow-x: auto;
  white-space: nowrap;
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
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
  /* HOTBAR: Centered and scaled to fit between HP bar and right-side UI */
  .mmo-hotbar-container {
    position: absolute !important;
    left: 50% !important;
    bottom: 8px !important;
    transform: translateX(-50%) scale(0.8) !important; /* Centers it and shrinks it to 80% */
    transform-origin: bottom center !important;
    gap: 6px;
    padding: 4px 8px;
    z-index: 55;
  }
  .mmo-hotbar-slot {
    width: 46px;
    height: 46px;
  }
  .mmo-hotbar-ult-slot {
    width: 54px;
    height: 54px;
  }
  .hotbar-name {
    display: none; 
  }
  
  /* ELEMENTAL SIGILS: Anchored right and centered vertically */
  .elemental-sigils-container {
    position: absolute !important;
    top: 50% !important;
    right: 4px !important;
    transform: translateY(-50%) scale(0.85) !important; /* Centers vertically and shrinks to 85% */
    transform-origin: right center !important;
    gap: 6px;
    padding: 6px 4px;
    z-index: 45;
  }
  .sigil-btn {
    width: 38px;
    height: 38px;
    font-size: 1.2rem;
  }
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
    .game-hud-top {
      top: 16px !important;
      left: 24px !important;
      right: 24px !important;
      font-size: 0.9rem !important;
    }

    @supports (-webkit-touch-callout: none) {
    .game-hud-top {
      top: 56px !important; 
    }
    
    .skill-tree-container, .coop-party-panel {
      top: 90px !important;
      bottom: auto !important;
      max-height: 60vh !important;
    }
  }

    .hud-menu-title, 
    .hud-menu-sub {
      display: none !important;
    }

    .game-hud-top > div:nth-child(2) {
      margin-left: -20px !important; 
    }

    .game-hud-right-group div {
      font-size: 0.85rem !important;
    }

    .inventory-toggle-btn, .skill-tree-toggle-btn {
    font-size: 0.55rem !important;
    padding: 0 8px !important;
    height: 24px !important; /* Parehas liliit ang height */
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

    .game-hud-top button {
      font-size: 0.5rem !important;  
      padding: 4px 8px !important;   
      border-width: 1px !important;  
    }

    .hud-bar-container {
      width: 120px !important; 
      height: 8px !important;  
    }
    .hud-bar-text {
      font-size: 0.5rem !important;
      line-height: 8px !important;
    }

    .rpg-buff-container {
      top: 20px !important; 
      gap: 2px !important;
      transform: translateX(-50%) scale(0.6) !important; 
    }

    .mmo-hotbar-container {
      gap: 3px !important;
      padding: 3px 4px !important;
      bottom: 4px !important;
    }
    .mmo-hotbar-slot {
      width: 28px !important;
      height: 28px !important;
      border-radius: 3px !important;
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
      left: 6px !important;
    }
    .hotbar-status-dot {
      font-size: 0.35rem !important;
    }
    .hotbar-cooldown-overlay {
      font-size: 0.7rem !important;
    }
    .mmo-hotbar-ult-slot .hotbar-cooldown-overlay {
      font-size: 0.85rem !important;
    }

    .rpg-stats-panel, .skill-tree-container, .coop-party-panel {
      width: 135px !important; 
      padding: 4px !important;
      gap: 2px !important;
    }
    .stats-header, .skill-tree-title {
      font-size: 0.6rem !important;
      padding-bottom: 2px !important;
      margin-bottom: 2px !important;
    }
    .stats-row, .skill-row-btn, .coop-name {
      font-size: 0.55rem !important; 
    }
    .skill-row-btn {
      padding: 3px 4px !important;
    }
    .skill-node-desc {
      font-size: 0.5rem !important;
      padding: 2px 3px !important;
    }
    
    .stats-toggle-btn, .skill-tree-toggle-btn {
      font-size: 0.55rem !important;
      padding: 3px 5px !important;
    }
  }
/* =========================================================================
   🔮 PREMIUM CYBER-FANTASY INVENTORY STYLES (PC & Mobile Ready)
   ========================================================================= */

.inventory-toggle-btn:hover { 
  background: #2e1503; 
  border-color: #fef08a;
  box-shadow: 0 0 16px rgba(234, 179, 8, 0.4);
}

/* Inventory Window (Modal) */
.inventory-modal {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 360px; 
  background: rgba(13, 9, 33, 0.45) !important; /* Pinalabnaw */
  backdrop-filter: blur(8px) !important;
  -webkit-backdrop-filter: blur(8px) !important;
  border: 2px solid #8b5cf6;
  border-radius: 12px;
  padding: 16px;
  z-index: 100;
  color: white;
  font-family: monospace;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7), inset 0 0 15px rgba(139, 92, 246, 0.2);
  pointer-events: auto;
}

/* Header Row Custom Styling */
.inventory-modal > div:first-child {
  display: flex !important;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(139, 92, 246, 0.3);
  padding-bottom: 8px;
  margin-bottom: 12px !important;
}

/* X Close Button Custom Style */
.inventory-modal > div:first-child button {
  background: rgba(239, 68, 68, 0.1) !important;
  border: 1px solid rgba(239, 68, 68, 0.4) !important;
  color: #f87171 !important;
  border-radius: 4px !important;
  width: 22px !important;
  height: 22px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-weight: bold !important;
  font-size: 0.75rem !important;
  transition: all 0.15s ease !important;
}
.inventory-modal > div:first-child button:hover {
  background: #ef4444 !important;
  color: white !important;
}

/* Equipment Section Box */
.equip-section {
  display: flex;
  justify-content: space-around;
  background: rgba(255, 255, 255, 0.03);
  padding: 10px;
  border-radius: 8px;
  border: 1px solid rgba(139, 92, 246, 0.2);
  margin-bottom: 14px;
}
.equip-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  font-size: 0.65rem;
  color: #a78bfa;
  font-weight: bold;
}
.equip-section .inv-slot {
  width: 52px !important; /* Pinuwersa nating i-override ang inline 60px para maging pantay na parisukat */
  height: 52px !important;
}

/* Backpack Text Header */
.inventory-modal > div:nth-child(3) {
  font-weight: bold;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
  color: #94a3b8;
}

/* Main Items Grid */
.inv-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

/* Individual Item Slots */
.inv-slot {
  aspect-ratio: 1 / 1;
  background: rgba(20, 15, 45, 0.6) !important;
  border: 1px solid #4c2d82 !important;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  transition: all 0.15s ease;
  box-shadow: inset 0 0 6px rgba(0,0,0,0.4);
}
.inv-slot:hover { 
  transform: scale(1.05); 
  z-index: 50; 
  background: transparent !important;
  border-color: #fef08a !important;
  box-shadow: 0 0 10px rgba(254, 240, 138, 0.4) !important;
}

/* Rarity Color Accents */
.inv-slot[data-rarity="common"] { border-color: #64748b !important; background: rgba(100, 116, 139, 0.05) !important; }
.inv-slot[data-rarity="rare"] { border-color: #3b82f6 !important; box-shadow: inset 0 0 8px rgba(59, 130, 246, 0.2) !important; }
.inv-slot[data-rarity="epic"] { border-color: #a855f7 !important; box-shadow: inset 0 0 8px rgba(168, 85, 247, 0.2) !important; }
.inv-slot[data-rarity="legendary"] { border-color: #fbbf24 !important; box-shadow: inset 0 0 8px rgba(251, 191, 36, 0.2) !important; }
.inv-slot[data-rarity="mythic"] { border-color: #ef4444 !important; box-shadow: inset 0 0 8px rgba(239, 68, 68, 0.3) !important; }

/* Item Tooltips */
.item-tooltip {
  position: absolute;
  bottom: 115%;
  left: 50%;
  transform: translateX(-50%);
  background: #09061a;
  border: 1px solid #8b5cf6;
  padding: 8px;
  width: max-content;
  max-width: 190px;
  font-size: 0.65rem;
  z-index: 60;
  pointer-events: none;
  opacity: 0;
  box-shadow: 0 4px 12px rgba(0,0,0,0.7);
  border-radius: 4px;
  transition: opacity 0.15s ease;
}
.inv-slot:hover .item-tooltip { opacity: 1; }

/* Elegant Delete Button (Pulang X) */
.delete-btn {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 16px !important; 
  height: 16px !important; 
  font-size: 9px !important;
  background: #dc2626 !important;
  color: white !important;
  border-radius: 50% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-weight: bold !important;
  cursor: pointer !important;
  border: 1px solid #f87171 !important;
  z-index: 25 !important; 
  transition: all 0.1s ease;
}
.delete-btn:hover {
  transform: scale(1.15) !important;
  background: #ef4444 !important;
}

/* CLEAR ALL BUTTON */
  .backpack-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    width: 100%;
    margin-top: 10px;
    margin-bottom: 5px;
  }

  .clear-all-btn {
    background: rgba(220, 38, 38, 0.15);
    border: 1px solid rgba(239, 68, 68, 0.6);
    color: #f87171;
    font-family: monospace;
    font-size: 0.65rem;
    padding: 3px 8px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
    font-weight: bold;
  }

  .clear-all-btn:hover {
    background: #ef4444;
    color: white;
    box-shadow: 0 0 10px rgba(239, 68, 68, 0.4);
  }

  /* ITEM PLUS BADGE */
  .item-plus-badge {
    position: absolute;
    bottom: 2px;
    right: 2px;
    background: rgba(0, 0, 0, 0.8);
    color: #fbbf24; /* Gold/Yellow na kulay para litaw */
    font-size: 0.65rem;
    font-weight: bold;
    padding: 1px 4px;
    border-radius: 3px;
    pointer-events: none; /* Para hindi maka-istorbo sa pag-click ng item */
    font-family: monospace;
    z-index: 10;
    text-shadow: 1px 1px 0 #000;
  }
/* =========================================================================
   📱 INTERACTIVE MOBILE LANDSCAPE CONFIGURATION (Fixed Tooltips)
   ========================================================================= */
@media (max-height: 550px), (max-width: 950px) and (orientation: landscape) {
  
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
    border-radius: 4px !important;
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

  const [hasStarted, setHasStarted] = useState(false);
  const [isWindowBlurred, setIsWindowBlurred] = useState(false);
  const [p1VotedRestart, setP1VotedRestart] = useState(false);
  const [p2VotedRestart, setP2VotedRestart] = useState(false);

  const [isTreeOpen, setIsTreeOpen] = useState(true);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [playerLevel, setPlayerLevel] = useState(1);
  const [activeBuffsList, setActiveBuffsList] = useState([]);
  const [guestExitedAlert, setGuestExitedAlert] = useState(false);
  const [hostExitedCountdown, setHostExitedCountdown] = useState(null);
  const exitTimerRef = useRef(null);
  const [showInventory, setShowInventory] = useState(false);

  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [invTrigger, setInvTrigger] = useState(0);
  const lastInvAction = useRef(0);


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
  
  // Swap HP logic safely so equipping HP doesn't heal you infinitely, but taking it off removes it
  if (currentEquipped?.stats?.hp) {
    target.maxHp -= currentEquipped.stats.hp;
    target.hp = Math.min(target.hp, target.maxHp);
  }
  if (item.stats?.hp) {
    target.maxHp += item.stats.hp;
    target.hp += item.stats.hp; // Give them the current HP boost immediately
  }

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
    keys: {}, floorPat: null, p2Input: { x: 0, y: 0 },
    bossIntro: {
        active: false,
        timer: 0,
        maxDuration: 180, // Kung 60fps ang laro mo, 180 = 3 seconds
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

    // 4. ⏱️ DELAY NG SPELL EXECUTION (Maghihintay bago ilabas ang damage at effects)
    setTimeout(() => {
      const currentEng = engineRef.current;
      if (!currentEng || target.dead) return; // Wag ituloy kung napatay si player habang nagchachant

      currentEng.screenShake = 0.8; // Malakas na shake pag pumutok na yung spell!

      if (!currentEng.tornados) currentEng.tornados = [];
      if (!currentEng.waves) currentEng.waves = [];
      if (!currentEng.fissures) currentEng.fissures = [];
      if (!currentEng.lightnings) currentEng.lightnings = [];
      if (!currentEng.iceStorms) currentEng.iceStorms = [];

      if (sigilType === 'flareInferno') {
        target.chatBubble = { text: "FLARE INFERNO!", life: 1.5 };
        currentEng.tornados.push({ x: target.x, y: target.y, life: 5.0, vx: (Math.random()-0.5)*150, vy: (Math.random()-0.5)*150, r: 80 });
      } else if (sigilType === 'tidalWave') {
        target.chatBubble = { text: "TIDAL WAVE!", life: 1.5 };
        currentEng.waves.push({ x: -200, y: H/2, vx: 450, life: 5.0, width: 300 });

      } else if (sigilType === 'fissureSlam') {
        target.chatBubble = { text: "FISSURE SLAM!", life: 1.5 };
        const angle = Math.random() * Math.PI * 2;
        currentEng.fissures.push({ x: target.x, y: target.y, angle, length: W, life: 1.5 });
        const cos = Math.cos(angle), sin = Math.sin(angle);
        
        // 🔥 SCALED DAMAGE: Base + Wave Scaling + (Player Dmg * 5)
        // const fissureDmg = 1500 + ((currentEng.wave || 1) * 200) + ((target.dmg || 0) * 5);
        // 🔥 BALANCED SCALED DAMAGE: Base 150 + (Wave * 15) + (Player Dmg * 3.0)
           const fissureDmg = 150 + ((currentEng.wave || 1) * 15) + ((target.dmg || 0) * 3.0);

        for (const e of currentEng.enemies) {
          const dx = e.x - target.x, dy = e.y - target.y;
          const proj = dx * cos + dy * sin;
          const perp = Math.abs(dx * sin - dy * cos); 
          if (proj > 0 && perp < 60) {
             e.hp -= fissureDmg; // <--- Gumagamit na ng Scaled Damage
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
        
        // 🔥 SCALED DAMAGE: Mas mataas ang damage kasi nag-ba-bounce per target
        // const lightningDmg = 2500 + ((currentEng.wave || 1) * 350) + ((target.dmg || 0) * 8);
        // 🔥 BALANCED SCALED DAMAGE: Base 200 + (Wave * 20) + (Player Dmg * 3.5)
        const lightningDmg = 200 + ((currentEng.wave || 1) * 20) + ((target.dmg || 0) * 3.5);

        for (let i = 0; i < 8; i++) {
          let best = null, minDist = 400;
          for (const e of currentEng.enemies) {
            if (!hits.has(e)) {
              const d = Math.hypot(e.x - current.x, e.y - current.y);
              if (d < minDist) { minDist = d; best = e; }
            }
          }
          if (best) {
            hits.add(best);
            pts.push({x: best.x, y: best.y});
            current = best;
            best.hp -= lightningDmg; // <--- Gumagamit na ng Scaled Damage
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
    }, 4500); // 👈 🔥 DITO MO BABAGUHIN ANG DELAY (2000 = 2 seconds)

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

    target.skills.natureRecovery.cd = 50.0;

    playSfx('heal');
    target.chatBubble = { text: "NATURE'S RECOVERY!", life: 1.5 };

    // Heal 50% of CURRENT HP (If you want 50% of Max HP instead, change 'target.hp' to 'target.maxHp' in the math below)
    const healAmount = target.maxHp * 0.5;
    target.hp = Math.min(target.maxHp, target.hp + healAmount);

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
    
    for (const enemy of eng.enemies) {
      // 🔥 DYNAMIC SCALED DPS: Arcane Collapse Initial Burst
      // let colPulseDmg = 3500 + ((eng?.wave || 1) * 500) + ((target.dmg || 0) * 20);
      // 🔥 BALANCED DYNAMIC DPS: Arcane Collapse Initial Burst
      let colPulseDmg = 400 + ((eng?.wave || 1) * 35) + ((target.dmg || 0) * 5.0);
      
      if (target.potBuffs?.power > 0) colPulseDmg *= 1.4; 
      if (target.skills?.arcaneInstinct?.duration > 0) colPulseDmg *= 2.0;
      if (enemy.instabTime > 0) colPulseDmg *= 1.5;

      let totalCrit = (target.baseCrit || 0) + (target.potBuffs?.crit > 0 ? 35 : 0);
      if (Math.random() < (totalCrit / 100)) {
        colPulseDmg *= 2;
        enemy.flash = 0.5;
      } else {
        enemy.flash = 0.35;
      }

      enemy.hp -= colPulseDmg;
      
      enemy.stunnedTime = enemy.boss ? 1.5 : 8.0;       
      enemy.temporalSlowTime = enemy.boss ? 2.0 : 8.0; 
      enemy.arcaneBurnTime = 8.0;
      enemy.voidExhaustTime = 8.0;   
      enemy.instabTime = 8.0;        

      if (enemy.hp <= 0) enemy.deadTrigger = true;
    }

    for (let k = 0; k < 150; k++) {
      const pa = Math.random() * Math.PI * 2;
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

    target.skills.arcaneInstinct.cd = 60.0; 
    target.skills.arcaneInstinct.duration = 15.0; 
    target.skills.arcaneInstinct.autoTimer = 0.5;
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
  };

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
          if (eng.p2.skills) setSkillsState({ ...eng.p2.skills });
        } else if (eng.p) {
          setPlayerLevel(eng.p.level);
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

  useEffect(() => {
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
      setIsTreeOpen(true); 
      setSkillsState(initSkills());
      setActiveBuffsList([]);
      if (exitTimerRef.current) clearInterval(exitTimerRef.current);
      setHostExitedCountdown(null);

      const isCoopActive = Boolean(netRef.current && netRef.current.channel);
      
      eng.score = 0; eng.wave = 1; eng.waveT = 0; eng.waveLen = 30; eng.spawnT = 0; eng.spawnRate = 0.9; eng.boltDmg = 22; eng.screenShake = 0;
      eng.bullets = []; eng.enemies = []; eng.particles = []; eng.gems = [];
      eng.slashes = []; eng.cubeBashes = []; eng.stars = []; eng.collapses = []; eng.potions = [];
      eng.tornados = []; eng.waves = []; eng.fissures = []; eng.lightnings = []; eng.iceStorms = [];
      eng.gameStarted = false; 
      setHasStarted(false);

      const eqFam = localStorage.getItem('arcane_equipped_familiar') || 'none';
      const famLevels = JSON.parse(localStorage.getItem('arcane_familiar_levels') || '{}');

      const initFamiliarObj = (eqFam !== 'none') ? { 
        id: eqFam, 
        level: famLevels[eqFam] || 1, 
        x: isCoopActive ? W / 3 : W / 2, 
        y: H / 2, 
        cd: 0 
      } : null;

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
      familiar: initFamiliarObj, 
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
      
      if (screen === 'pause') {
        return;
      }

      if (eng.bossIntro && eng.bossIntro.active) {
        eng.bossIntro.timer--;
        if (eng.bossIntro.timer <= 0) eng.bossIntro.active = false;
        return; // Hihinto ang game loop dito para walang gumalaw!
      }

      // 🔥 FIX: Pause ALL gameplay logic during the Victory Cinematic
      if (window.showVictoryCinematic && window.showVictoryCinematic > 0) {
        window.showVictoryCinematic -= dt;
        if (window.showVictoryCinematic > 0) {
            return; // Freezes everything except the rendering text
        }
      }

      if (screen === 'playing' || screen === 'levelup') {
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
        if (!eng.gameStarted && (mx !== 0 || my !== 0)) {
          if (isHost) {
            eng.gameStarted = true;
            setHasStarted(true);
            activateAudioKeepAlive();
          }
        }

        if (eng.screenShake > 0) {
          eng.screenShake -= dt;
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

// 🔥 MEMORY PROTECTION: Bawal mag-spawn ng normal minion kung lagpas 120 na ang kalaban sa screen
          if (eng.spawnT >= eng.spawnRate && eng.enemies.length < 120) {
              eng.spawnT = 0;
              
              // 🔥 PACED SWARM SCALING: Dahan-dahang bibilis hanggang Wave 45 (0.20s extreme cap)
              eng.spawnRate = Math.max(0.20, 2 - (eng.wave * 0.04));
              
              // 🔥 MINI-BOSS INCLUSION: Paunti-unting idadagdag ang mga malalakas na minions
              let pool = [0];
              if (eng.wave >= 2) pool = [0, 1];               
              if (eng.wave >= 4) pool = [0, 1, 2];            
              if (eng.wave >= 10) pool = [0, 1, 2, 2];        
              if (eng.wave >= 15) pool = [0, 1, 2, 2, 3];     
              
              const ti = pool[Math.floor(Math.random() * pool.length)];
              const t = ET[ti]; 
              
              const side = Math.floor(Math.random() * 4); 
              let ex, ey;
              if (side === 0) { ex = Math.random() * W; ey = -30; }
              else if (side === 1) { ex = W + 30; ey = Math.random() * H; }
              else if (side === 2) { ex = Math.random() * W; ey = H + 30; }
              else { ex = -30; ey = Math.random() * H; }
                
              const waveScale = Math.max(0, eng.wave - 1); 
              const diffScale = Math.pow(1.025, Math.max(0, eng.wave - 30));

              // 🔥 LATE GAME MATH: (Base + Scaling) * Exponential DiffScale
              const calculatedHp = Math.floor((t.hp + (waveScale * 35) + Math.pow(waveScale, 1.5) * 5) * diffScale);
              const calculatedDmg = Math.floor((t.dmg + (waveScale * 3) + (waveScale * waveScale * 0.05)) * diffScale);

              eng.enemies.push({ 
                 x: ex, y: ey, r: t.r, 
                 speed: t.speed + Math.min(250, waveScale * 2.5),
                 hp: calculatedHp, 
                 maxHp: calculatedHp, 
                 dmg: calculatedDmg, 
                 xp: Math.floor(t.xp * Math.pow(1.08, waveScale)),
                 color: t.color, glow: t.glow, boss: t.boss, type: t.type, flash: 0, stunnedTime: 0, stigmaTime: 0, temporalSlowTime: 0, arcaneBurnTime: 0, voidExhaustTime: 0, instabTime: 0 
              });
          }

              if (eng.waveT >= eng.waveLen) {
              eng.waveT = 0;
              eng.wave++;
              eng.waveLen = Math.max(15, 30 - eng.wave * 0.8);

// =========================================================
              // 🟢 ADVANCED PROGRESSIVE BOSS SPAWN SYSTEM (V3 - NIGHTMARE SCALING)
              // =========================================================
              // Increased cap to 5 to ensure multi-boss raids spawn correctly
              const activeBosses = eng.enemies.filter(e => e.boss).length;

              if (activeBosses < 5) {
                  const currentWave = eng.wave || 1;
                  
                  // 🔥 EXPONENTIAL MULTIPLIER: Starts scaling past Wave 30.
                  // 1.025^10 = 1.28x | 1.025^40 = 2.68x | 1.025^70 = 5.6x 
                  // This ensures their HP outpaces the player's late-game item combinations.
                  const diffScale = Math.pow(1.025, Math.max(0, currentWave - 30)); 

              if (currentWave >= 100 && currentWave % 20 === 0) {
                     eng.screenShake = 8.0; // 🔥 Pinalakas ang lindol!
                    //  eng.screenFlash = 1.0;

                     // 🔥 STEP 2: TRIGGER CANVAS CINEMATIC INTRO
                     eng.bossIntro = {
                         active: true,
                         timer: 180,
                         maxDuration: 180,
                         bossName: "THE ABYSS AWAKENED"
                     };

                     // 🔥 TRIGGER BOSS MUSIC AGAD
                     if (window.arcaneAudio) {
                         window.arcaneAudio.isBossActive = true;
                         if (!window.arcaneAudio.isMuted) {
                             window.arcaneAudio.gameBgm.pause();
                             window.arcaneAudio.bossBgm.currentTime = 0;
                             window.arcaneAudio.bossBgm.play().catch(() => {});
                         }
                     }
                     
                     if (eng.p) eng.p.chatBubble = { text: "⚠️ THE COVENANT IS COLLAPSING!!!", life: 3.0 };
                     if (eng.p2) eng.p2.chatBubble = { text: "⚠️ THE COVENANT IS COLLAPSING!!!", life: 3.0 };
                     
                     const abyssHp = Math.floor((1500000 + (currentWave * 30000)) * diffScale);
                     const primHp = Math.floor((600000 + (currentWave * 12000)) * diffScale);

                     // 🔥 Spawn The Abyss (Awakened God Form)
                     eng.enemies.push({ 
                         x: W/2, y: -200, // Magsisimula sa labas ng screen pababa
                         r: 40, // 🔥 God-Tier Size
                         speed: 70, 
                         hp: abyssHp, maxHp: abyssHp, prevHpFrame: abyssHp,
                         dmg: Math.floor(2500 * diffScale), xp: 150000, 
                         color: '#1a0505', glow: '#dc2626', boss: true, 
                         type: 'abyss_awakened', // 🔥 Eto ang magti-trigger ng epic renderer natin!
                         nameTag: 'The Abyss (Awakened)', 
                         
                         // Core Engine Stats
                         abyssShieldTimer: 0, abyssShieldCd: 5, abyssAttackTimer: 3, flash: 0, 
                         stunnedTime: 0, stigmaTime: 0, temporalSlowTime: 0, arcaneBurnTime: 0, 
                         voidExhaustTime: 0, instabTime: 0,
                         
                         // 🔥 Custom Skill Timers para sa minion summon at dash
                         summonTimer: 0, 
                         dashTimer: 0 
                     });
                     
                    //  🔥 Spawn TWO Primordial Demon Guards (Pinalaki para mas intimidating)
                     eng.enemies.push({ 
                         x: W/2 - 500, y: -90, 
                         r: 30, // 🔥 Primordial Size
                         speed: 65, 
                         hp: primHp, maxHp: primHp, dmg: Math.floor(1200 * diffScale), xp: 50000, 
                         color: '#000000', glow: '#ea580c', boss: true, 
                         type: 'primordial', // 🔥 Epic Primordial Renderer
                         nameTag: 'Primordial Demon', 
                         flash: 0, stunnedTime: 0, stigmaTime: 0, temporalSlowTime: 0, arcaneBurnTime: 0, voidExhaustTime: 0, instabTime: 0 
                     });
                     
                     eng.enemies.push({ 
                         x: W/2 + 500, y: -90, 
                         r: 30, // 🔥 Primordial Size
                         speed: 65, 
                         hp: primHp, maxHp: primHp, dmg: Math.floor(1200 * diffScale), xp: 50000, 
                         color: '#000000', glow: '#ea580c', boss: true, 
                         type: 'primordial', 
                         nameTag: 'Primordial Demon', 
                         flash: 0, stunnedTime: 0, stigmaTime: 0, temporalSlowTime: 0, arcaneBurnTime: 0, voidExhaustTime: 0, instabTime: 0 
                     });
                  } 
                  // 2. THE ULTIMATE BOSS ENCOUNTER (Wave 75+, every 25 waves)
                  else if (currentWave >= 75 && currentWave % 25 === 0) {
                     eng.screenShake = 2.5;

                     // 🔥 STEP 2: TRIGGER CINEMATIC INTRO PARA SA NORMAL ABYSS
                     eng.bossIntro = {
                         active: true,
                         timer: 180,
                         maxDuration: 180,
                         bossName: "THE ABYSS"
                     };

                     if (window.arcaneAudio && !window.arcaneAudio.isBossActive) {
                          window.arcaneAudio.isBossActive = true;
                          if (!window.arcaneAudio.isMuted) {
                              window.arcaneAudio.gameBgm.pause();
                              window.arcaneAudio.bossBgm.currentTime = 0; // Start sa simula
                              window.arcaneAudio.bossBgm.play().catch(()=>{});
                          }
                      }

                     const hpScale = Math.floor((1000000 + (currentWave * 15000)) * diffScale);
                     eng.enemies.push({ 
                         x: W/2, y: -60, r: 35, speed: 70, hp: hpScale, maxHp: hpScale, prevHpFrame: hpScale, dmg: Math.floor(1800 * diffScale), 
                         xp: 80000, color: '#1a0505', glow: '#f59e0b', boss: true, type: 'abyss', nameTag: 'The Abyss', 
                         abyssShieldTimer: 0, abyssShieldCd: 7, abyssAttackTimer: 4, flash: 0, stunnedTime: 0, stigmaTime: 0, temporalSlowTime: 0, arcaneBurnTime: 0, voidExhaustTime: 0, instabTime: 0 
                     });
                  } 
                  // 3. MID-LATE GATEKEEPER (Wave 50+, every 20 waves kapag walang Abyss/Covenant)
                  else if (currentWave >= 50 && (currentWave - 50) % 20 === 0) {
                     const hpScale = Math.floor((350000 + (currentWave * 8000)) * diffScale);
                     eng.enemies.push({ 
                         x: W/2, y: -50, r: 30, speed: 95, hp: hpScale, maxHp: hpScale, dmg: Math.floor(1000 * diffScale), 
                         xp: 40000, color: '#000000', glow: '#ffffff', boss: true, type: 'primordial', nameTag: 'Primordial Demon', 
                         flash: 0, stunnedTime: 0, stigmaTime: 0, temporalSlowTime: 0, arcaneBurnTime: 0, voidExhaustTime: 0, instabTime: 0 
                     });
                  } 
                  // 4. MID GAME WALL (Wave 30+, every 10 waves)
                  else if (currentWave >= 30 && currentWave % 10 === 0) {
                     const hpScale = Math.floor((120000 + (currentWave * 3000)) * diffScale);
                     eng.enemies.push({ 
                         x: W/2, y: -45, r: 30, speed: 110, hp: hpScale, maxHp: hpScale, dmg: Math.floor(600 * diffScale), 
                         xp: 15000, color: '#7f1d1d', glow: '#dc2626', boss: true, type: 'archdemon', nameTag: 'Archdemon', 
                         flash: 0, stunnedTime: 0, stigmaTime: 0, temporalSlowTime: 0, arcaneBurnTime: 0, voidExhaustTime: 0, instabTime: 0 
                     });
                  } 
                  // 5. EARLY GAME BOSS CHECK (Wave 15+, every 5 waves kapag walang ibang boss)
                  else if (currentWave >= 15 && currentWave % 5 === 0) {
                     const baseHp = 45000 + (currentWave * 1500);
                     // Allow early bosses to scale slightly if they spawn extremely late (e.g., Wave 115)
                     const hpScale = Math.floor(baseHp * (currentWave > 40 ? diffScale * 0.5 : 1)); 
                     
                     eng.enemies.push({ 
                         x: W/2, y: -40, r: 25, speed: 125, hp: hpScale, maxHp: hpScale, dmg: 350 + (currentWave * 5), 
                         xp: 6000, color: '#4b5563', glow: '#ef4444', boss: true, type: 'demonKnight', nameTag: 'Demon Knight', 
                         flash: 0, stunnedTime: 0, stigmaTime: 0, temporalSlowTime: 0, arcaneBurnTime: 0, voidExhaustTime: 0, instabTime: 0 
                     });
                  }
              }


            }
          }
        }
       
        // if (eng.tornados) {
        //   for (let i = eng.tornados.length - 1; i >= 0; i--) {
        //     const t = eng.tornados[i];
        //     t.life -= dt;
        //     t.x += (t.vx || 0) * dt; 
        //     t.y += (t.vy || 0) * dt; 
        //     if (t.life <= 0) {
        //       eng.tornados.splice(i, 1);
        //     } else if (isHost || !isCoopActive) {
        //       for (const e of eng.enemies) {
        //         if (Math.hypot(e.x - t.x, e.y - t.y) < t.r + e.r) {
        //           e.hp -= 10000;        // SPELL DAMAGE LOGIC
        //           e.flash = 1.0;
        //           if (e.hp <= 0) e.deadTrigger = true;
        //         }
        //       }
        //     }
        //   }
        // }

        // if (eng.waves) {
        //   for (let i = eng.waves.length - 1; i >= 0; i--) {
        //     const w = eng.waves[i];
        //     w.life -= dt;
        //     w.x += (w.vx || 0) * dt; 
        //     if (w.life <= 0) {
        //       eng.waves.splice(i, 1);
        //     } else if (isHost || !isCoopActive) {
        //       for (const e of eng.enemies) {
        //         if (e.x > w.x - w.width / 2 && e.x < w.x + w.width / 2) {
        //           e.hp -= 10000;      // SPELL DAMAGE LOGIC
        //           e.flash = 1.0;
        //           if (e.hp <= 0) e.deadTrigger = true;
        //         }
        //       }
        //     }
        //   }
        // }

        if (eng.tornados) {
          for (let i = eng.tornados.length - 1; i >= 0; i--) {
            const t = eng.tornados[i];
            t.life -= dt;
            t.x += (t.vx || 0) * dt; 
            t.y += (t.vy || 0) * dt; 
            if (t.life <= 0) {
              eng.tornados.splice(i, 1);
            } else if (isHost || !isCoopActive) {
              
              // 🟢 DYNAMIC SCALED DPS: Flare Inferno
              const dynamicBaseDmg = 1000 + (eng.wave * 100); 
              const casterDmg = eng.boltDmg + (eng.p?.dmg || 0);
              const tornadoDps = dynamicBaseDmg + (casterDmg * 10); 

              for (const e of eng.enemies) {
                if (Math.hypot(e.x - t.x, e.y - t.y) < t.r + e.r) {
                  e.hp -= tornadoDps * dt;        
                  e.arcaneBurnTime = Math.max(e.arcaneBurnTime || 0, 1.5);
                  if (Math.random() < 0.15) e.flash = 0.5;
                  if (e.hp <= 0) e.deadTrigger = true;
                }
              }
            }
          }
        }

        if (eng.waves) {
          for (let i = eng.waves.length - 1; i >= 0; i--) {
            const w = eng.waves[i];
            w.life -= dt;
            w.x += (w.vx || 0) * dt; 
            if (w.life <= 0) {
              eng.waves.splice(i, 1);
            } else if (isHost || !isCoopActive) {

              // 🟢 DYNAMIC SCALED DPS: Tidal Wave
              const dynamicBaseDmg = 1000 + (eng.wave * 100); 
              const casterDmg = eng.boltDmg + (eng.p?.dmg || 0);
              const waveDps = (dynamicBaseDmg * 1.5) + (casterDmg * 20); 

              for (const e of eng.enemies) {
                if (e.x > w.x - w.width / 2 && e.x < w.x + w.width / 2) {
                  e.hp -= waveDps * dt;      
                  if (!e.boss) e.x += (w.vx * 0.4) * dt; 
                  e.temporalSlowTime = Math.max(e.temporalSlowTime || 0, 2.0);
                  if (Math.random() < 0.15) e.flash = 0.5;
                  if (e.hp <= 0) e.deadTrigger = true;
                }
              }
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
            } else if (isHost || !isCoopActive) {
              
              // 🔥 SCALED DPS: Base DPS + Wave Scaling + (Player Dmg * 4)
              const iceDps = 800 + ((eng.wave || 1) * 120) + ((eng.p?.dmg || 0) * 4);

              for (const e of eng.enemies) {
                if (Math.hypot(e.x - s.x, e.y - s.y) < s.radius + e.r) {
                  e.hp -= iceDps * dt; // <--- Gumagamit na ng Scaled DPS
                  e.stigmaTime = 1.0; 
                  e.temporalSlowTime = Math.max(e.temporalSlowTime, 1.0); 
                  if (Math.random() < 0.1) e.flash = 0.5;
                  if (e.hp <= 0) e.deadTrigger = true;
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
                  if (Math.random() < (totalCrit / 100)) {
                    cbDmg *= 2; enemy.flash = 0.5;
                  } else {
                    enemy.flash = 0.2;
                  }
                  
                  enemy.hp -= cbDmg;
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
                                damageTaken *= (100 / (100 + defStat));
                                if (pTarget.potBuffs?.defense > 0) damageTaken *= 0.65;
                                if (pTarget.skills?.shield?.duration > 0 && pTarget.skills?.shield?.enabled !== false) {
                                    damageTaken = 0;
                                } else if (pTarget.skills?.fortify?.learned && pTarget.skills?.fortify?.enabled !== false) {
                                    damageTaken *= 0.75;
                                }
                                pTarget.hp -= damageTaken;
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

        const localTrackedObj = (isCoopActive && !isHost) ? eng.p2 : eng.p;
          if (localTrackedObj) {
          setPlayerLevel(localTrackedObj.level);
          if (localTrackedObj.skills) {
            setSkillsState({ ...localTrackedObj.skills });
          }

          // ⚠️ Fetches the total stats from equipped items
          const equipBonuses = getEquipmentStats(localTrackedObj);

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

          // ✅ Fixed: Added equipBonuses.atk
          let currentAtk = eng.boltDmg + (localTrackedObj.dmg || 0) + equipBonuses.atk;
          if (localTrackedObj.skills?.berserk?.duration > 0 && localTrackedObj.skills?.berserk?.enabled) currentAtk = Math.ceil(currentAtk * 1.5);
          if (localTrackedObj.potBuffs?.power > 0) currentAtk = Math.ceil(currentAtk * 1.4);
          // 🔥 BALANCED UI: x2.0 na lang ang damage display para tugma sa totoong damage output
          if (localTrackedObj.skills?.arcaneInstinct?.duration > 0) currentAtk = Math.ceil(currentAtk * 2.0);

          // ✅ Fixed: Added equipBonuses.def
          let currentDef = (localTrackedObj.baseDef || 0) + equipBonuses.def;
          if (localTrackedObj.skills?.fortify?.learned && localTrackedObj.skills?.fortify?.enabled) currentDef += 25;
          if (localTrackedObj.potBuffs?.defense > 0) currentDef += 35;
          if (localTrackedObj.skills?.arcaneInstinct?.duration > 0) currentDef += 500;

          // ✅ Fixed: Added equipBonuses.crit
          let currentCrit = (localTrackedObj.baseCrit || 0) + equipBonuses.crit;
          if (localTrackedObj.potBuffs?.crit > 0) currentCrit += 35;
          if (localTrackedObj.skills?.arcaneInstinct?.duration > 0) currentCrit += 500;

          // ✅ Fixed: Added equipBonuses.speed
          let currentSpd = (localTrackedObj.speed || 200) + equipBonuses.speed;
          if (localTrackedObj.skills?.haste?.duration > 0 && localTrackedObj.skills?.haste?.enabled) currentSpd = Math.ceil(currentSpd * 1.45);
          // 🔥 BALANCED UI: x2.0 speed para tugma sa request mo at sa totoong movement speed
          if (localTrackedObj.skills?.arcaneInstinct?.duration > 0) currentSpd = Math.ceil(currentSpd * 2.0);
          
          let currentCd = (localTrackedObj.shootRate || 0.6) - equipBonuses.rate;
          currentCd = Math.max(0.15, currentCd);
          if (localTrackedObj.skills?.berserk?.duration > 0 && localTrackedObj.skills?.berserk?.enabled) currentCd *= 0.5;
          if (localTrackedObj.skills?.arcaneInstinct?.duration > 0) currentCd *= 0.15; 

          let currentLifesteal = (localTrackedObj.lifeSteal || 0) + equipBonuses.lifesteal;

           if (statAtkRef.current) statAtkRef.current.textContent = formatLargeNumber(currentAtk);
          if (statDefRef.current) {
            const damageBlockedPct = ((currentDef / (100 + currentDef)) * 100).toFixed(1);
            statDefRef.current.textContent = `${currentDef} (${damageBlockedPct}% Block)`;
          }
          if (statCritRef.current) statCritRef.current.textContent = `${currentCrit}%`;
          if (statSpdRef.current) statSpdRef.current.textContent = `${currentSpd} IPS`;
          if (statCdRef.current) statCdRef.current.textContent = `${currentCd.toFixed(2)}s`;
          
          // ✅ Fixed: Shows currentLifesteal calculation
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
                  if (Math.random() < (totalCrit / 100)) {
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
                  // Kunin muna kung sino ang nag-cast para magamit ang stats niya
                  const shooterObj = star.p2 ? eng.p2 : eng.p;
                  
                  // 🔥 DYNAMIC SCALED DPS: Shooting Star
                  let splashDmg = 70 + ((eng?.wave || 1) * 40) + ((shooterObj?.dmg || 0) * 2.0);
                  
                  if (shooterObj?.potBuffs?.power > 0) splashDmg *= 1.4;
                  if (shooterObj?.skills?.arcaneInstinct?.duration > 0) splashDmg *= 2.0; // 🔥 BUFF: Splash dmg multiplier x5.0
                  if (enemy.instabTime > 0) splashDmg *= 1.5;
                  
                  let totalCrit = (shooterObj?.baseCrit || 0) + (shooterObj?.potBuffs?.crit > 0 ? 35 : 0);
                  if (Math.random() < (totalCrit / 100)) {
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
            col.radius += col.speed * dt; // 🔥 FIX: Faster traveling wave
            
            if (col.pulseTimer >= 0.4 && col.pulseCount < 8) { // 🔥 BUFF: 8 pulses total, faster intervals
              col.pulseTimer = 0;
              col.pulseCount++;
              eng.screenShake = 1.0;

              for (const enemy of eng.enemies) {
                // 🔥 SCALING: Arcane Collapse Pulses
                // let colPulseDmg = 2500 + ((eng.wave || 1) * 400) + ((eng.p?.dmg || 0) * 15);
                // 🔥 BALANCED SCALING: Arcane Collapse Pulses (Mas mahina ang pulse kaysa sa initial burst)
                let colPulseDmg = 200 + ((eng.wave || 1) * 25) + ((eng.p?.dmg || 0) * 3.5);
                if (enemy.instabTime > 0) colPulseDmg *= 1.5;
                enemy.hp -= colPulseDmg;
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
                  targetPlayer.hp = Math.min(targetPlayer.maxHp, targetPlayer.hp + (targetPlayer.maxHp * 0.25));
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
                    damageTaken *= (100 / (100 + defStat));
                    if (pTarget.potBuffs?.defense > 0) damageTaken *= 0.65;
                    if (pTarget.skills?.shield?.duration > 0 && pTarget.skills?.shield?.enabled !== false) {
                      damageTaken = 0;
                    } else if (pTarget.skills?.fortify?.learned && pTarget.skills?.fortify?.enabled !== false) {
                      damageTaken *= 0.75;
                    }

                    pTarget.hp -= damageTaken;
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
                  let calculatedDmg = isBerserkActive ? Math.ceil((eng.boltDmg + (shooterObj?.dmg || 0)) * 1.5) : (eng.boltDmg + (shooterObj?.dmg || 0));
                  if (shooterObj?.potBuffs?.power > 0) calculatedDmg = Math.ceil(calculatedDmg * 1.4); 
                  if (shooterObj?.skills?.arcaneInstinct?.duration > 0) calculatedDmg = Math.ceil(calculatedDmg * 2.0); // 🔥 BUFF: Final bullet damage x5.0
                  if (e.instabTime > 0) calculatedDmg = Math.ceil(calculatedDmg * 1.5);

                  let totalCrit = (shooterObj?.baseCrit || 0) + (shooterObj?.potBuffs?.crit > 0 ? 35 : 0);
                  if (Math.random() < (totalCrit / 100)) {
                    calculatedDmg *= 2;
                    e.flash = 0.45;
                  } else {
                    e.flash = 0.1;
                  }

                  e.hp -= calculatedDmg;
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
                
                // 🔥 DYNAMIC SCALED DPS: Body Cutter Stigma DoT
                e.hp -= (20 + ((eng?.wave || 1) * 15)) * dt; 
                
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
                damageTaken *= (100 / (100 + defStatP1));
                if (e.voidExhaustTime > 0) damageTaken *= 0.5; 
                if (eng.p.potBuffs?.defense > 0) damageTaken *= 0.65;
                if (eng.p.skills?.shield?.duration > 0 && eng.p.skills?.shield?.enabled !== false) {
                  damageTaken = 0;
                } else if (eng.p.skills?.fortify?.learned && eng.p.skills?.fortify?.enabled !== false) {
                  damageTaken *= 0.75;
                }

                eng.p.hp -= damageTaken;
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
                damageTakenp2 *= (100 / (100 + defStatP2)); // 🔥 MOBA STYLE ARMOR P2
                if (e.voidExhaustTime > 0) damageTakenp2 *= 0.5;
                if (eng.p2.potBuffs?.defense > 0) damageTakenp2 *= 0.65;
                if (eng.p2.skills?.shield?.duration > 0 && eng.p2.skills?.shield?.enabled !== false) {
                  damageTakenp2 = 0;
                } else if (eng.p2.skills?.fortify?.learned && eng.p2.skills?.fortify?.enabled !== false) {
                  damageTakenp2 *= 0.75;
                }

                eng.p2.hp -= damageTakenp2;
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
        if (eng.p && !eng.p.dead && eng.p.pendingLevelUps > 0 && screen === 'playing' && !eng.p.isLevelingUp) {
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
          if (xpTextRef.current) xpTextRef.current.textContent = `LV${localTarget.level} XP ${formatLargeNumber(localTarget.xp)}/${formatLargeNumber(localTarget.xpNext)}`;

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
        a.y += a.vy * dt; a.t -= dt * 0.22;
        if (a.t <= 0 || a.y < -10) { a.x = Math.random() * W; a.y = H + 10;
        a.t = 1; }
      }


// 🔥 COMPANION / FAMILIAR AI & PHYSICS
const tickFamiliar = (pObj, isP2) => {
  if (!pObj || pObj.dead || !pObj.familiar) return;
  const f = pObj.familiar;
  
  // 1. Follow Player Logic
  const tX = pObj.x - 35;
  const tY = pObj.y - 45 + Math.sin(performance.now() * 0.003) * 8; 
  
  const fDist = Math.hypot(tX - f.x, tY - f.y);
  const fSpeed = fDist > 150 ? 8 : 4; 
  f.x += (tX - f.x) * dt * fSpeed;
  f.y += (tY - f.y) * dt * fSpeed;

  // 🔥 FIX: VOID EYE VACUUM LOGIC (Nilabas sa cooldown para EVERY FRAME ang hatak!)
  if (f.id === 'voidling') {
    const vacRadius = 250 + (f.level * 35); 
    const pullSpeed = 1500; // Pinalakas na hatak (from 700 to 1500) para swabe!
    
    // Hatakin ang Gems
    for (const g of eng.gems) {
      if (Math.hypot(g.x - pObj.x, g.y - pObj.y) < vacRadius) {
         const ang = Math.atan2(pObj.y - g.y, pObj.x - g.x);
         g.x += Math.cos(ang) * pullSpeed * dt;
         g.y += Math.sin(ang) * pullSpeed * dt;
      }
    }
    // Hatakin ang Potions
    for (const p of eng.potions) {
      if (Math.hypot(p.x - pObj.x, p.y - pObj.y) < vacRadius) {
         const pa = Math.atan2(pObj.y - p.y, pObj.x - p.x);
         p.x += Math.cos(pa) * (pullSpeed * 0.8) * dt; // Medyo mabagal nang onti sa potion
         p.y += Math.sin(pa) * (pullSpeed * 0.8) * dt;
      }
    }
  }

  // 2. Familiar Skill Cooldowns & Execution
  f.cd -= dt;
  if (f.cd <= 0) {
    if (f.id === 'wisp') {
      // ☄️ ATTACK: Shoots Fireballs
      let near = null, nd = Infinity;
      for (const e of eng.enemies) {
        if (e.hp <= 0 || e.y < -50) continue;
        let d = Math.hypot(e.x - f.x, e.y - f.y) - (e.r || 15);
        if (d < nd && d < 450) { nd = d; near = e; }
      }
      
      if (near) {
        f.cd = Math.max(0.15, 0.8 - (f.level * 0.05)); 
        const a = Math.atan2(near.y - f.y, near.x - f.x);
        
        const famDmg = 50 + (f.level * 30) + ((eng.wave || 1) * 15);
        const projCount = f.level >= 10 ? 3 : (f.level >= 5 ? 2 : 1);
        const spread = 0.2;
        
        for (let i = 0; i < projCount; i++) {
          const ang = a + (i - (projCount - 1) / 2) * spread;
          eng.bullets.push({ 
            x: f.x, y: f.y, vx: Math.cos(ang) * 600, vy: Math.sin(ang) * 600, 
            r: 7, life: 2, p2: isP2, dmg: famDmg, color: '#f97316', isFamiliar: true 
          });
        }
      }
    } 
    else if (f.id === 'fairy') {
      // 🌿 SUPPORT: Area Heal
      f.cd = 3.0; // Heals every 3 seconds
      const healAmount = 5 + (f.level * 4) + (pObj.maxHp * 0.01); 
      pObj.hp = Math.min(pObj.maxHp, pObj.hp + healAmount);
      
      for(let k=0; k<6; k++) {
        eng.particles.push({ 
          x: pObj.x + (Math.random()-0.5)*30, y: pObj.y + (Math.random()-0.5)*30, 
          vx: 0, vy: -40 - Math.random()*20, color: '#86efac', life: 0.8, ml: 0.8, r: 2.5 
        });
      }
    }
    else if (f.id === 'voidling') {
      // 🔮 UTILITY: Visual Pulse lang (Ang vacuum nasa labas na ng cooldown loop)
      f.cd = 0.5; 
      if (f.level >= 10 && Math.random() < 0.3) {
         eng.particles.push({ x: f.x, y: f.y, vx: 0, vy: 0, color: 'rgba(217, 70, 239, 0.4)', life: 0.3, ml: 0.3, r: 25, isGhost: true });
      }
    }

    else if (f.id === 'frost') {
      // ❄️ CROWD CONTROL: Mini Ice Storm
      f.cd = Math.max(1.0, 3.0 - (f.level * 0.15)); // Cooldown reduction per level
      let target = null, minDist = Infinity;
      for (const e of eng.enemies) {
        if (e.hp <= 0 || e.y < -50) continue;
        let d = Math.hypot(e.x - f.x, e.y - f.y);
        if (d < minDist && d < 350) { minDist = d; target = e; }
      }
      if (target) {
        const stormRadius = 80 + (f.level * 5); // Lalo lumalaki ang radius pag nag-level up
        if (!eng.iceStorms) eng.iceStorms = [];
        // Ang engine na mismo ang bahala sa damage at slow effect kapag na-spawn ito!
        eng.iceStorms.push({ x: target.x, y: target.y, radius: stormRadius, life: 2.0 });
      }
    }
    
    else if (f.id === 'golem') {
      // 🪨 DEFENSE: Ground Smash (AoE Stun + Damage)
      f.cd = Math.max(1.5, 4.0 - (f.level * 0.2)); 
      let enemiesHit = 0;
      const smashRadius = 120 + (f.level * 8);
      const smashDmg = 150 + (f.level * 50) + ((eng.wave || 1) * 20);
      
      for (const e of eng.enemies) {
        if (e.hp <= 0 || e.y < -50) continue;
        if (Math.hypot(e.x - f.x, e.y - f.y) < smashRadius) {
          e.hp -= smashDmg;
          e.stunnedTime = Math.max(e.stunnedTime || 0, 1.5);
          e.flash = 0.5;
          if (e.hp <= 0) e.deadTrigger = true;
          enemiesHit++;
        }
      }
      
      if (enemiesHit > 0) {
        eng.screenShake = 0.6;
        // Shockwave visual ring
        if (!eng.cubeBashes) eng.cubeBashes = [];
        eng.cubeBashes.push({ x: f.x, y: f.y, radius: 10, maxRadius: smashRadius, speed: 350 });
        
        // Rock particles
        for(let k=0; k<15; k++) {
          const pa = Math.random() * Math.PI * 2;
          const ps = Math.random() * (smashRadius * 0.5);
          eng.particles.push({ 
            x: f.x + Math.cos(pa)*ps, y: f.y + Math.sin(pa)*ps, 
            vx: 0, vy: -10 - Math.random()*15, color: '#f59e0b', life: 0.5, ml: 0.5, r: 3 
          });
        }
      }
    }

    else if (f.id === 'thunder') {
      // ⚡ BURST ATTACK: Lightning Strike
      f.cd = Math.max(0.3, 1.5 - (f.level * 0.1)); // Fast cooldown
      let target = null, minDist = Infinity;
      for (const e of eng.enemies) {
        if (e.hp <= 0 || e.y < -50) continue;
        let d = Math.hypot(e.x - f.x, e.y - f.y);
        if (d < minDist && d < 450) { minDist = d; target = e; }
      }
      
      if (target) {
        const boltDmg = 200 + (f.level * 45) + ((eng.wave || 1) * 25);
        target.hp -= boltDmg;
        target.flash = 0.8;
        target.instabTime = Math.max(target.instabTime || 0, 2.0); // Adds Arcane Instability
        if (target.hp <= 0) target.deadTrigger = true;
        
        if (!eng.lightnings) eng.lightnings = [];
        eng.lightnings.push({ 
          pts: [{x: f.x, y: f.y}, {x: target.x, y: target.y}], 
          life: 0.4 
        });
        
        // Electric particles
        for(let k=0; k<8; k++) {
          eng.particles.push({ 
            x: target.x, y: target.y, vx: (Math.random()-0.5)*120, vy: (Math.random()-0.5)*120, 
            color: '#e879f9', life: 0.3, ml: 0.3, r: 2 
          });
        }
      }
    }

  }
};

      // I-trigger ang Familiar AI bago gumalaw ang mga bullets
      if (isHost || !isCoopActive) {
        tickFamiliar(eng.p, false);
        if (isCoopActive) tickFamiliar(eng.p2, true);
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




      // ==========================================

      ctx.fillStyle = '#030111';
      ctx.fillRect(0, 0, W, H);
      if (eng.floorPat) { ctx.fillStyle = eng.floorPat; ctx.fillRect(0, 0, W, H);
      }

      for (const a of eng.ambs) {
        ctx.save();
        ctx.globalAlpha = a.a * a.t; ctx.fillStyle = a.c;
        ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
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
            
            const baseColor = pot.type === 'freeze' ? '#94a3b8' : '#fef08a'; 
            const glowColor = pot.type === 'freeze' ? '#38bdf8' : '#fef08a'; // Cyan for Freeze, Gold for Nuke
            
            // A. Draw glowing outer aura
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = 20 + (pulse * 25);
            ctx.fillStyle = `rgba(255, 255, 255, ${0.15 + (pulse * 0.25)})`; // White/Gold pulse
            ctx.beginPath();
            ctx.arc(pot.x, pot.y, pot.r * (1.2 + (pulse * 0.4)), 0, Math.PI * 2);
            ctx.fill();

            // B. 🏷️ Draw Floating Name Tag (No spin, just bounce)
            const label = pot.type === 'freeze' ? 'TIME FREEZE' : 'ARCANE NUKE';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#000000'; // Dark shadow para mabasa kahit maliwanag ang background
            ctx.shadowBlur = 6;
            ctx.fillStyle = glowColor;
            ctx.fillText(label, pot.x, pot.y - pot.r - 14 + bounce);

            // C. Draw the Crystal/Gem shape (With Hover and Spin)
            ctx.save(); // Save ulit para yung rotation ay sa crystal lang
            ctx.translate(pot.x, pot.y + bounce); 
            ctx.rotate(time * 0.4);

            ctx.fillStyle = baseColor;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;

            ctx.beginPath();
            ctx.moveTo(0, -pot.r);
            ctx.lineTo(pot.r * 0.7, 0);
            ctx.lineTo(0, pot.r);
            ctx.lineTo(-pot.r * 0.7, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Inner bright white core
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, 0, pot.r * 0.3, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore(); // Undo the rotation so it doesn't affect other items
          } 
          // 🔴 2. NORMAL POTION DROPS
          else {
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
          }

          ctx.restore();
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

          // 💎 4. BASE ITEM SHAPE RENDERING (Diamond)
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

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(cx, cy, 2, 0, Math.PI * 2);
          ctx.fill();

          // 🏷️ 5. NAME TAG RENDERING
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center';
          ctx.shadowColor = '#000000';
          ctx.shadowBlur = 6;
          ctx.fillStyle = color;
          ctx.fillText(drop.item.name, cx, cy - 18); 

          ctx.restore();
        }
      }
      // ==========================================

      if (eng.tornados) {
        for (const t of eng.tornados) {
           ctx.save();
           ctx.translate(t.x, t.y);
           ctx.rotate(performance.now() * 0.015);
           ctx.strokeStyle = '#f97316';
           ctx.lineWidth = 10;
           ctx.shadowBlur = 20;
           ctx.shadowColor = '#ef4444';
           ctx.beginPath();
           ctx.arc(0, 0, t.r + Math.sin(performance.now() * 0.02) * 10, 0, Math.PI * 2);
           ctx.stroke();
           ctx.strokeStyle = '#fef08a';
           ctx.lineWidth = 4;
           ctx.beginPath();
           ctx.arc(0, 0, t.r * 0.6 + Math.cos(performance.now() * 0.02) * 10, 0, Math.PI * 2);
           ctx.stroke();
           ctx.restore();
        }
      }

      if (eng.waves) {
        for (const w of eng.waves) {
           ctx.save();
           const grad = ctx.createLinearGradient(w.x - w.width / 2, 0, w.x + w.width / 2, 0);
           grad.addColorStop(0, 'rgba(56, 189, 248, 0)');
           grad.addColorStop(0.5, 'rgba(56, 189, 248, 0.8)');
           grad.addColorStop(1, 'rgba(2, 132, 199, 1)');
           ctx.fillStyle = grad;
           ctx.shadowBlur = 30;
           ctx.shadowColor = '#38bdf8';
           ctx.fillRect(w.x - w.width / 2, 0, w.width, H);
           ctx.restore();
        }
      }

      if (eng.fissures) {
        for (const f of eng.fissures) {
           ctx.save();
           ctx.translate(f.x, f.y);
           ctx.rotate(f.angle);
           ctx.strokeStyle = `rgba(217, 119, 6, ${f.life})`;
           ctx.lineWidth = 30 * f.life;
           ctx.lineCap = 'round';
           ctx.shadowBlur = 20;
           ctx.shadowColor = '#f59e0b';
           ctx.beginPath();
           ctx.moveTo(0, 0);
           ctx.lineTo(f.length, 0);
           ctx.stroke();
           ctx.strokeStyle = `rgba(254, 240, 138, ${f.life})`;
           ctx.lineWidth = 8 * f.life;
           ctx.beginPath();
           ctx.moveTo(0, 0);
           ctx.lineTo(f.length, 0);
           ctx.stroke();
           ctx.restore();
        }
      }

      if (eng.lightnings) {
        for (const l of eng.lightnings) {
           ctx.save();
           ctx.strokeStyle = `rgba(167, 139, 250, ${l.life * 2})`;
           ctx.lineWidth = 8;
           ctx.shadowBlur = 20;
           ctx.shadowColor = '#c084fc';
           ctx.lineJoin = 'miter';
           ctx.beginPath();
           ctx.moveTo(l.pts[0].x, l.pts[0].y);
           for (let i = 1; i < l.pts.length; i++) ctx.lineTo(l.pts[i].x, l.pts[i].y);
           ctx.stroke();
           ctx.strokeStyle = `rgba(255, 255, 255, ${l.life * 2})`;
           ctx.lineWidth = 3;
           ctx.beginPath();
           ctx.moveTo(l.pts[0].x, l.pts[0].y);
           for (let i = 1; i < l.pts.length; i++) ctx.lineTo(l.pts[i].x, l.pts[i].y);
           ctx.stroke();
           ctx.restore();
        }
      }

      if (eng.iceStorms) {
        for (const s of eng.iceStorms) {
           ctx.save();
           ctx.fillStyle = `rgba(125, 211, 252, ${Math.min(0.2, s.life / 2)})`;
           ctx.beginPath();
           ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
           ctx.fill();
           ctx.strokeStyle = `rgba(186, 230, 253, ${Math.min(0.8, s.life)})`;
           ctx.lineWidth = 2;
           ctx.setLineDash([15, 15]);
           ctx.lineDashOffset = performance.now() * 0.05;
           ctx.beginPath();
           ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
           ctx.stroke();
           ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.8, s.life)})`;
           for (let i = 0; i < 15; i++) {
             const a = Math.random() * Math.PI * 2;
             const d = Math.random() * s.radius;
             ctx.fillRect(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d + (performance.now() * 0.2) % 20, 3, 8);
           }
           ctx.restore();
        }
      }

for (const b of eng.bullets) {
        ctx.save();
        if (b.isEnemy) {
          ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 16;
          ctx.fillStyle = '#f59e0b'; 
        } else if (b.isFamiliar) {
          // 🔥 BAGONG KULAY PARA SA FAMILIAR BULLETS
          ctx.shadowColor = b.color; ctx.shadowBlur = 16; 
          ctx.fillStyle = '#ffffff'; 
        } else {
          // Normal Player Bullets
          ctx.shadowColor = b.p2 ? '#fb923c' : '#e879f9'; ctx.shadowBlur = 16;
          ctx.fillStyle = b.p2 ? '#fed7aa' : '#f5d0fe';
        }
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
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
          ctx.save();
          ctx.translate(e.x, e.y);
          ctx.rotate(performance.now() * 0.002);
          ctx.fillRect(-e.r, -e.r, e.r * 2, e.r * 2);
          ctx.restore(); 
        } else if (e.type === 'archdemon') {
          ctx.save(); 
          ctx.translate(e.x, e.y);
          ctx.rotate(-performance.now() * 0.0015);
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            ctx.lineTo(Math.cos((i * 60) * Math.PI / 180) * e.r, Math.sin((i * 60) * Math.PI / 180) * e.r);
            ctx.lineTo(Math.cos((30 + i * 60) * Math.PI / 180) * (e.r * 0.5), Math.sin((30 + i * 60) * Math.PI / 180) * (e.r * 0.5));
          }
          ctx.closePath(); ctx.fill();
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
                // 🌌 THE ABYSS (Reality Breaker / Screen Shatter)
                // ==================================================
                ctx.shadowBlur = e.flash > 0 ? 100 : 150;
                ctx.shadowColor = e.flash > 0 ? '#ffffff' : '#a855f7';

                // 1. Reality Glass Shatter (Gigantic jagged cracks spreading off-screen)
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.lineWidth = 1.5;
                for (let i = 0; i < 12; i++) {
                    let ang = (i * Math.PI / 6) + (Math.random() * 0.2 - 0.1);
                    let crackLength = e.r * (10 + Math.random() * 5); // Basag na umaabot sa dulo ng screen
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    let currX = 0, currY = 0;
                    for (let j = 0; j < 5; j++) {
                        currX += Math.cos(ang) * (crackLength / 5) + (Math.random() * 40 - 20);
                        currY += Math.sin(ang) * (crackLength / 5) + (Math.random() * 40 - 20);
                        ctx.lineTo(currX, currY);
                    }
                    ctx.stroke();
                }

                // 2. Thick Volumetric Void Smoke (Heavy, suffocating fog)
                ctx.fillStyle = 'rgba(15, 15, 15, 0.9)';
                for (let i = 0; i < 15; i++) {
                    let sAng = (now / 500) + (i * Math.PI / 7.5);
                    let sDist = e.r * (0.5 + Math.sin(now / 300 + i) * 1.5);
                    ctx.beginPath(); 
                    ctx.arc(Math.cos(sAng) * sDist, Math.sin(sAng) * sDist, e.r * 1.8, 0, Math.PI * 2); 
                    ctx.fill();
                }

                // 3. Black Hole Core (Violently consuming matter)
                ctx.fillStyle = e.flash > 0 ? '#ffffff' : '#000000';
                ctx.beginPath();
                for (let i = 0; i < 30; i++) {
                    let ang = (Math.PI * 2 / 30) * i + (now / 100); // Mabilis umikot
                    let dist = e.r * (0.7 + Math.random() * 0.6); // Mas matutulis na spikes
                    ctx.lineTo(Math.cos(ang) * dist, Math.sin(ang) * dist);
                }
                ctx.fill();

                // 4. Overwhelming Demonic Eyes (Glitching and bleeding)
                ctx.fillStyle = e.flash > 0 ? '#000000' : '#ff0000';
                ctx.shadowColor = '#ff0000';
                ctx.shadowBlur = 80;
                let eyeGlitch = Math.random() > 0.8 ? 5 : 0; // Mata na nagfi-flicker
                ctx.beginPath(); ctx.moveTo(-e.r * 0.7, -e.r * 0.2 + eyeGlitch); ctx.lineTo(-e.r * 0.1, -e.r * 0.5); ctx.lineTo(-e.r * 0.3, e.r * 0.6); ctx.fill();
                ctx.beginPath(); ctx.moveTo(e.r * 0.7, -e.r * 0.2 + eyeGlitch); ctx.lineTo(e.r * 0.1, -e.r * 0.5); ctx.lineTo(e.r * 0.3, e.r * 0.6); ctx.fill();

            }else if (e.type === 'abyss_awakened') {
                // ==================================================
                // 👁️ THE ABYSS AWAKENED (The Sovereign of Annihilation)
                // ==================================================
                
                const hpRatio = (e.hp !== undefined && e.maxHp !== undefined) ? (e.hp / e.maxHp) : 1;
                const isEnraged = hpRatio <= 0.3;
                
                const enrageMult = isEnraged ? 1.5 : 1;
                const coreR = e.r * 1.5;
                
                ctx.save();

                // ==================================================
                // 1. GLOBAL MAP AURA & SHOCKWAVES
                // ==================================================
                const auraPulse = Math.sin(now / 800) * 0.1;
                const auraRadius = coreR * (40 + auraPulse * 10); 
                
                const mapAuraGrad = ctx.createRadialGradient(0, 0, coreR * 5, 0, 0, auraRadius);
                mapAuraGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
                mapAuraGrad.addColorStop(0.3, `rgba(153, 27, 27, ${0.15 + auraPulse})`);
                mapAuraGrad.addColorStop(0.7, `rgba(10, 0, 10, ${0.4 + auraPulse})`);
                mapAuraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                
                ctx.fillStyle = mapAuraGrad;
                ctx.beginPath();
                ctx.arc(0, 0, auraRadius, 0, Math.PI * 2);
                ctx.fill();

                // APOCALYPTIC SHOCKWAVES (Pulsing rings outward)
                const swTime = (now / (isEnraged ? 400 : 800)) % 1;
                const swRadius = coreR * (5 + swTime * 20);
                ctx.beginPath();
                ctx.arc(0, 0, swRadius, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(239, 68, 68, ${0.8 * (1 - swTime)})`;
                ctx.lineWidth = isEnraged ? 15 * (1 - swTime) : 5 * (1 - swTime);
                ctx.stroke();

                // ==================================================
                // 2. NEW: ANNIHILATION ARRAY & ASCENDING EMBERS
                // ==================================================
                
                // --- Outer Rotating Geometric Array ---
                ctx.save();
                ctx.strokeStyle = isEnraged ? `rgba(239, 68, 68, ${0.3 + Math.abs(auraPulse)})` : `rgba(153, 27, 27, ${0.15 + Math.abs(auraPulse)})`;
                ctx.lineWidth = isEnraged ? 3 : 1;
                ctx.rotate(now / 6000); // Slow clockwise spin
                
                ctx.beginPath();
                ctx.arc(0, 0, coreR * 5.5, 0, Math.PI * 2);
                ctx.stroke();
                
                // Hexagram pattern inside outer ring
                for(let i=0; i<6; i++) {
                    ctx.beginPath();
                    ctx.moveTo(Math.cos(i * Math.PI / 3) * coreR * 5.5, Math.sin(i * Math.PI / 3) * coreR * 5.5);
                    ctx.lineTo(Math.cos((i + 2) * Math.PI / 3) * coreR * 5.5, Math.sin((i + 2) * Math.PI / 3) * coreR * 5.5);
                    ctx.stroke();
                }
                ctx.restore();

                // --- Inner Reverse Rotating Ring ---
                ctx.save();
                ctx.strokeStyle = isEnraged ? `rgba(239, 68, 68, ${0.5 + Math.abs(auraPulse)})` : `rgba(153, 27, 27, ${0.3 + Math.abs(auraPulse)})`;
                ctx.lineWidth = 2;
                ctx.rotate(now / -3000); // Faster counter-clockwise spin
                ctx.setLineDash([coreR * 0.8, coreR * 0.4]);
                ctx.beginPath();
                ctx.arc(0, 0, coreR * 4.2, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();

                // --- Ascending Void Embers (Anti-gravity particles) ---
                ctx.save();
                ctx.fillStyle = isEnraged ? '#ffffff' : '#ef4444';
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#ef4444';
                const numEmbers = isEnraged ? 40 : 20;
                
                for (let i = 0; i < numEmbers; i++) {
                    // Spread pseudo-randomly across the aura width
                    let emberX = (Math.sin(i * 123.45) * coreR * 6); 
                    let speed = 1 + (i % 3); // Parallax speeds
                    
                    // Particles move from bottom (coreR*5) to top (-coreR*6)
                    let totalHeight = coreR * 11;
                    let emberY = (coreR * 5) - ((now / (10 * speed) + i * 80) % totalHeight); 
                    
                    // Fade in at bottom, fade out at top
                    let fade = 1 - (Math.abs(emberY) / (coreR * 5.5));
                    if (fade > 0) {
                        ctx.globalAlpha = fade;
                        ctx.beginPath();
                        ctx.arc(emberX, emberY, isEnraged ? Math.random() * 3 + 1 : 1.5, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
                ctx.restore();

                // ==================================================
                // 3. LEVITATION & ENTITY JITTER (Violent shake when enraged)
                // ==================================================
                let shakeX = 0, shakeY = 0;
                if (isEnraged) {
                    shakeX = (Math.random() - 0.5) * (coreR * 0.25);
                    shakeY = (Math.random() - 0.5) * (coreR * 0.25);
                }
                const floatY = Math.sin(now / 1200) * (coreR * 0.4) + shakeY;
                ctx.translate(shakeX, floatY);

                // 4. THE ECLIPSE HALO
                ctx.shadowBlur = isEnraged ? 150 : 50;
                ctx.shadowColor = '#dc2626';
                ctx.fillStyle = e.flash > 0 ? '#ffffff' : '#000000';
                ctx.strokeStyle = `rgba(220, 38, 38, ${0.5 + Math.sin(now / 200) * 0.4})`;
                ctx.lineWidth = coreR * 0.4;
                
                ctx.beginPath(); ctx.arc(0, -coreR * 0.5, coreR * 3.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                
                const eclipseGrad = ctx.createRadialGradient(0, -coreR * 0.5, coreR * 3.5, 0, -coreR * 0.5, coreR * 6);
                eclipseGrad.addColorStop(0, 'rgba(153, 27, 27, 0.8)');
                eclipseGrad.addColorStop(0.5, 'rgba(45, 10, 70, 0.3)');
                eclipseGrad.addColorStop(1, 'transparent');
                ctx.fillStyle = eclipseGrad;
                ctx.beginPath(); ctx.arc(0, -coreR * 0.5, coreR * 6.5, 0, Math.PI * 2); ctx.fill();

                // 5. AWAKENED CROWN
                const crownSpeed = isEnraged ? 800 : 2500;
                ctx.save();
                ctx.translate(0, -coreR * 0.5);
                ctx.rotate(now / crownSpeed);
                
                ctx.strokeStyle = '#ef4444';
                ctx.lineWidth = isEnraged ? 4 : 2;
                ctx.setLineDash([coreR * 0.8, coreR * 1.2]);
                ctx.beginPath(); ctx.arc(0, 0, coreR * 3.8, 0, Math.PI * 2); ctx.stroke();
                
                ctx.fillStyle = '#ef4444';
                for(let i=0; i<4; i++) {
                    let gAng = (i * Math.PI / 2);
                    let gDist = coreR * 3.8;
                    ctx.save();
                    ctx.translate(Math.cos(gAng) * gDist, Math.sin(gAng) * gDist);
                    ctx.rotate(now / 500);
                    ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(12, 0); ctx.lineTo(0, 12); ctx.lineTo(-12, 0); ctx.fill();
                    ctx.restore();
                }
                ctx.restore();

                // 6. REALITY RIBBONS
                ctx.strokeStyle = isEnraged ? '#ef4444' : 'rgba(153, 27, 27, 0.9)';
                ctx.lineWidth = isEnraged ? 6 : 4;
                ctx.setLineDash([]);
                for(let i=0; i<4; i++) {
                    let rAng = (now / -2000) + i * (Math.PI / 2);
                    let flow = coreR * (3 + Math.sin(now / 400 + i) * 2);
                    
                    ctx.save();
                    ctx.rotate(rAng);
                    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(coreR * 2.5, coreR, flow, -coreR * 2.5); ctx.stroke();
                    
                    ctx.fillStyle = '#ffffff';
                    ctx.shadowBlur = 15;
                    ctx.beginPath(); ctx.arc(flow, -coreR * 2.5, 4, 0, Math.PI*2); ctx.fill();
                    ctx.restore();
                }

                // 7. DARK SERAPH WINGS
                const wingFlap = Math.cos(now / (isEnraged ? 600 : 1000)) * 0.2 * enrageMult; 
                ctx.fillStyle = e.flash > 0 ? '#ffffff' : '#030303';
                ctx.strokeStyle = isEnraged ? '#ef4444' : '#991b1b';
                ctx.lineWidth = 3;
                
                const wingAngles = [-0.8, -0.3, 0.2, 0.7]; 
                for (let j = 0; j < 2; j++) { 
                    ctx.save();
                    ctx.scale(j === 0 ? 1 : -1, 1); 
                    for (let i = 0; i < 4; i++) {
                        ctx.save();
                        ctx.rotate(wingAngles[i] + wingFlap * (i % 2 === 0 ? 1 : -1));
                        let wLen = coreR * (isEnraged ? 8 : 6) - (i * coreR);
                        
                        ctx.beginPath(); ctx.moveTo(0, 0);
                        ctx.lineTo(coreR * 1.8, -wLen * 0.5);
                        ctx.lineTo(coreR * 0.6, -wLen);
                        ctx.lineTo(-coreR * 0.6, -wLen * 0.7);
                        ctx.closePath();
                        ctx.fill(); ctx.stroke();
                        ctx.restore();
                    }
                    ctx.restore();
                }

                // 8. SOVEREIGN CARAPACE
                ctx.fillStyle = e.flash > 0 ? '#ffffff' : '#09090b'; 
                ctx.strokeStyle = '#ef4444'; 
                ctx.lineWidth = isEnraged ? 3 : 2;
                
                const breathe = Math.sin(now / 400) * (coreR * 0.15);
                ctx.beginPath(); ctx.moveTo(coreR * 1.2 + breathe, -coreR); ctx.lineTo(coreR * 2.8 + breathe, -coreR * 1.6); ctx.lineTo(coreR * 1.8 + breathe, -coreR * 0.2); ctx.fill(); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(-coreR * 1.2 - breathe, -coreR); ctx.lineTo(-coreR * 2.8 - breathe, -coreR * 1.6); ctx.lineTo(-coreR * 1.8 - breathe, -coreR * 0.2); ctx.fill(); ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(0, -coreR * 2.8); 
                ctx.lineTo(coreR * 1.6, -coreR * 0.8);
                ctx.lineTo(coreR * 0.9, coreR * 2.0);
                ctx.lineTo(0, coreR * 3.0); 
                ctx.lineTo(-coreR * 0.9, coreR * 2.0);
                ctx.lineTo(-coreR * 1.6, -coreR * 0.8);
                ctx.closePath();
                ctx.fill(); ctx.stroke();

                // 9. SOUL VORTEX / DEBRIS
                ctx.fillStyle = '#ef4444';
                for(let i=0; i<8; i++) {
                    let pTime = ((now / (isEnraged ? 300 : 600)) + (i / 8)) % 1;
                    let pAngle = (i * Math.PI / 4) + (now / 500);
                    let pRadius = coreR * 5 * (1 - pTime); 
                    
                    ctx.globalAlpha = Math.sin(pTime * Math.PI); 
                    ctx.beginPath(); 
                    ctx.arc(Math.cos(pAngle) * pRadius, Math.sin(pAngle) * pRadius, coreR * 0.15, 0, Math.PI * 2); 
                    ctx.fill();
                }
                ctx.globalAlpha = 1.0;

                // 10. THE BLACK STAR CORE
                const coreBeat = Math.sin(now / (isEnraged ? 100 : 250)) * (isEnraged ? 0.3 : 0.2);
                const innerCoreR = coreR * (0.8 + coreBeat);
                
                ctx.shadowBlur = isEnraged ? 80 : 40;
                ctx.shadowColor = '#ef4444';
                
                ctx.fillStyle = e.flash > 0 ? '#ffffff' : '#ef4444';
                ctx.beginPath();
                for(let i=0; i<8; i++) { 
                    let ang = (i * Math.PI / 4) + (now/ (isEnraged ? 500 : 1000));
                    let dist = i % 2 === 0 ? innerCoreR * 1.8 : innerCoreR * 0.8;
                    ctx.lineTo(Math.cos(ang) * dist, Math.sin(ang) * dist);
                }
                ctx.fill();
                
                ctx.fillStyle = e.flash > 0 ? '#ffffff' : '#000000';
                ctx.shadowBlur = 0;
                ctx.beginPath(); ctx.arc(0, 0, innerCoreR * 0.7, 0, Math.PI * 2); ctx.fill();

                // 11. THE ZENITH EYE
                const eyeY = -coreR * 3.8; 
                const eyeBlink = isEnraged ? 1 : Math.max(0.1, Math.sin(now / 1200)); 
                const eyeHeight = coreR * 1.0 * eyeBlink;
                
                ctx.shadowBlur = isEnraged ? 80 : 40;
                ctx.shadowColor = '#ef4444';
                
                ctx.fillStyle = '#050505';
                ctx.beginPath(); ctx.ellipse(0, eyeY, coreR * 1.6, eyeHeight, 0, 0, Math.PI * 2); ctx.fill(); 
                
                if (eyeBlink > 0.2) { 
                    const pupilTrackX = Math.sin(now / 800) * (coreR * 0.5);
                    
                    ctx.fillStyle = isEnraged ? '#ffffff' : '#ef4444'; 
                    ctx.beginPath(); ctx.ellipse(pupilTrackX, eyeY, coreR * 0.6, eyeHeight * 0.6, 0, 0, Math.PI * 2); ctx.fill(); 
                    
                    ctx.fillStyle = '#000000';
                    ctx.beginPath(); ctx.ellipse(pupilTrackX, eyeY, coreR * 0.15, eyeHeight * 0.5, 0, 0, Math.PI * 2); ctx.fill();
                    
                    ctx.fillStyle = '#ef4444';
                    for(let i=0; i<5; i++) {
                        let dropY = eyeY + eyeHeight + ((now / (isEnraged ? 15 : 20) + i * 25) % (isEnraged ? 80 : 50));
                        ctx.globalAlpha = 1 - ((dropY - eyeY) / (isEnraged ? 80 : 50));
                        ctx.beginPath(); ctx.arc(pupilTrackX + (i-2)*6, dropY, isEnraged ? 3 : 2, 0, Math.PI*2); ctx.fill();
                    }
                    ctx.globalAlpha = 1.0;
                }

                ctx.restore();
            } else if (e.type === 'abyss') {
    // ==================================================
    // 🌋 PRIMORDIAL DEMON (World-Ending God of Destruction)
    // ==================================================
    
    // Enrage Logic: Check if HP is below 25%
    const hpRatio = (e.hp !== undefined && e.maxHp !== undefined) ? (e.hp / e.maxHp) : 1;
    const isEnraged = hpRatio <= 0.25;
    
    const enrageScale = isEnraged ? 1.5 : 1;
    const baseR = e.r * 1.4; // 40% overall size increase
    const coreR = baseR * enrageScale;
    
    ctx.save();
    
    // 💥 REALITY DISTORTION / ENRAGE SCREEN SHAKE
    if (isEnraged) {
        const intensity = 3 + Math.random() * 4;
        ctx.translate((Math.random() - 0.5) * intensity, (Math.random() - 0.5) * intensity);
    }

    // 0. APOCALYPTIC ENVIRONMENT & REALITY DISTORTION
    const distPulse = Math.sin(now / 150) * 0.15;
    const envGrad = ctx.createRadialGradient(0, 0, coreR * 2, 0, 0, coreR * 15);
    envGrad.addColorStop(0, 'transparent');
    envGrad.addColorStop(0.6, `rgba(153, 27, 27, ${0.1 + distPulse})`); // Infernal Red space
    envGrad.addColorStop(1, `rgba(69, 10, 10, ${0.3 + distPulse})`);
    ctx.fillStyle = envGrad;
    ctx.fillRect(-coreR * 20, -coreR * 20, coreR * 40, coreR * 40);

    // 1. MULTI-LAYERED APOCALYPTIC AURA
    const auraPulse = Math.abs(Math.sin(now / 200));
    const auraRadius = coreR * (isEnraged ? 6 + auraPulse * 2 : 4 + auraPulse);
    
    const aura = ctx.createRadialGradient(0, 0, coreR * 0.5, 0, 0, auraRadius);
    aura.addColorStop(0, '#ffffff'); // Inner: Blinding white-hot
    aura.addColorStop(0.2, '#facc15'); // Middle-inner: Magma bright yellow
    aura.addColorStop(0.4, '#ea580c'); // Middle: Molten lava flames
    aura.addColorStop(0.7, '#7f1d1d'); // Outer: Dark red infernal smoke
    aura.addColorStop(1, 'transparent'); // Reality heatwave blend
    
    ctx.fillStyle = e.flash > 0 ? '#ffffff' : aura;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(0, 0, auraRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // Swirling Infernal Vortexes
    ctx.save();
    ctx.rotate(now / 200);
    ctx.strokeStyle = `rgba(234, 88, 12, ${0.3 + distPulse})`;
    ctx.lineWidth = coreR * 0.4;
    ctx.beginPath(); ctx.arc(0, 0, coreR * 3, 0, Math.PI); ctx.stroke();
    ctx.rotate(Math.PI / 2);
    ctx.strokeStyle = `rgba(153, 27, 27, ${0.2 + distPulse})`;
    ctx.beginPath(); ctx.arc(0, 0, coreR * 4, 0, Math.PI); ctx.stroke();
    ctx.restore();

    // 2. GYROSCOPIC INFERNAL SIGILS 
    const sigilSpeed = isEnraged ? 150 : 300;
    
    // Outer Arcane Ring
    ctx.save();
    ctx.rotate(-now / sigilSpeed);
    ctx.strokeStyle = 'rgba(153, 27, 27, 0.6)';
    ctx.lineWidth = 4;
    ctx.setLineDash([20, 15, 5, 15]);
    ctx.beginPath(); ctx.arc(0, 0, coreR * 5.5, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    // Inner Demonic Runes Ring
    ctx.save();
    ctx.rotate(now / (sigilSpeed * 0.8));
    ctx.strokeStyle = 'rgba(234, 88, 12, 0.8)';
    ctx.lineWidth = 2;
    ctx.setLineDash([40, 20]);
    ctx.beginPath(); ctx.arc(0, 0, coreR * 4.5, 0, Math.PI * 2); ctx.stroke();
    ctx.font = `${coreR * 0.6}px "Courier New", monospace`;
    ctx.fillStyle = '#facc15';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 12; i++) {
        let ang = (i / 12) * Math.PI * 2;
        let rune = String.fromCharCode(0x16A0 + (i % 20)); // Runic characters
        ctx.fillText(rune, Math.cos(ang) * coreR * 4.5, Math.sin(ang) * coreR * 4.5);
    }
    
    // Smooth Celestial Gyroscope
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.4)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.ellipse(0, 0, coreR * 4.2, coreR * 0.8, (i / 4) * Math.PI, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.restore();

    // 3. 12 WINGS (6 SHADOW + 6 HELLFIRE)
    const wingFlap = Math.cos(now / 150) * 0.4;
    const wingLen = isEnraged ? coreR * 8 : coreR * 5;
    
    // Shadow Wings (Background Layer)
    ctx.fillStyle = e.flash > 0 ? '#ffffff' : '#09090b';
    ctx.strokeStyle = '#4c1d95'; 
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
        ctx.save();
        ctx.rotate((Math.PI * 2 / 6) * i + wingFlap * 0.8 + 0.2); // Offset
        ctx.beginPath(); 
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-coreR * 2, -coreR * 2, -wingLen * 1.1, -wingLen * 0.9);
        ctx.lineTo(-coreR * 3, -coreR * 1);
        ctx.lineTo(-wingLen * 0.8, 0);
        ctx.lineTo(0, 0);
        ctx.fill(); ctx.stroke();
        ctx.restore();
    }

    // Hellfire Wings (Foreground Layer)
    ctx.fillStyle = e.flash > 0 ? '#ffffff' : '#7c2d12';
    ctx.strokeStyle = '#fef08a'; 
    ctx.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
        ctx.save();
        ctx.rotate((Math.PI * 2 / 6) * i - wingFlap);
        ctx.beginPath(); 
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(coreR * 2, -coreR * 2.5, wingLen, -wingLen * 0.8); 
        ctx.lineTo(coreR * 2.5, -coreR * 1.5);
        ctx.lineTo(wingLen * 0.7, -coreR * 0.5);
        ctx.lineTo(0, 0);
        ctx.fill(); ctx.stroke();
        ctx.restore();
    }

    // 4. COLOSSAL TITAN CARAPACE (Organic Molten Armor)
    const corePulse = Math.sin(now / 80) * 0.3;
    
    // Glowing Magma Core Inside
    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR * (1.3 + corePulse));
    coreGrad.addColorStop(0, '#ffffff'); // Star center
    coreGrad.addColorStop(0.3, '#facc15'); // Bright yellow core
    coreGrad.addColorStop(0.7, '#b91c1c'); // Deep magma
    coreGrad.addColorStop(1, 'transparent');
    
    ctx.fillStyle = e.flash > 0 ? '#ffffff' : coreGrad;
    ctx.beginPath(); ctx.arc(0, 0, coreR * 1.4, 0, Math.PI * 2); ctx.fill();

    // Floating Obsidian Armor Plates (Curved, breathing body)
    ctx.fillStyle = e.flash > 0 ? '#ffffff' : '#0c0a09';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ea580c';
    
    for (let i = 0; i < 6; i++) {
        let pAng = (i / 6) * Math.PI * 2 + (now / 500); // Slow body rotation
        let breathe = Math.sin((now / 150) + i) * 0.15; // Plates expand and contract
        let pDist = coreR * (0.5 + breathe); 
        
        ctx.save();
        ctx.rotate(pAng);
        ctx.translate(pDist, 0);
        
        ctx.beginPath();
        // Organic shell curve
        ctx.moveTo(0, -coreR * 0.6);
        ctx.quadraticCurveTo(coreR * 1.6, -coreR * 0.2, coreR * 1.6, 0);
        ctx.quadraticCurveTo(coreR * 1.6, coreR * 0.2, 0, coreR * 0.6);
        ctx.quadraticCurveTo(coreR * 0.6, 0, 0, -coreR * 0.6);
        
        ctx.fill();
        ctx.strokeStyle = '#dc2626'; // Glowing red edges
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.restore();
    }
    ctx.shadowBlur = 0;

    // 5. OMNIPRESENT EYES (Body & Main)
    const eyeColors = ['#ffffff', '#facc15', '#dc2626', '#09090b'];
    const flickerColor = eyeColors[Math.floor((now / 100) % eyeColors.length)];
    
    // Main Eye
    ctx.shadowBlur = 50;
    ctx.shadowColor = flickerColor;
    ctx.fillStyle = e.flash > 0 ? '#000000' : flickerColor;
    ctx.beginPath(); ctx.ellipse(0, -coreR * 0.3, coreR * 0.6, coreR * 0.2, 0, 0, Math.PI * 2); ctx.fill();
    
    // Additional body eyes (More open when enraged)
    const eyeCount = isEnraged ? 8 : 4;
    for (let i = 0; i < eyeCount; i++) {
        let eAng = (i / eyeCount) * Math.PI * 2 + Math.PI;
        let eDist = coreR * 0.9;
        let eScale = (i % 2 === 0) ? 0.2 : 0.15;
        ctx.fillStyle = eyeColors[Math.floor(((now + i * 50) / 100) % eyeColors.length)];
        ctx.beginPath(); 
        ctx.ellipse(Math.cos(eAng) * eDist, Math.sin(eAng) * eDist, coreR * eScale, coreR * (eScale * 0.4), eAng, 0, Math.PI * 2); 
        ctx.fill();
    }

    // 6. FLOATING INFERNAL CROWN 
    const crownY = -coreR * 2 + Math.sin(now / 150) * 15;
    ctx.save();
    ctx.translate(0, crownY);
    
    ctx.fillStyle = '#0c0a09';
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
        let cAng = (now / -200) + (i * Math.PI * 2 / 5);
        let cDist = coreR * 1.2;
        ctx.save();
        ctx.translate(Math.cos(cAng) * cDist, Math.sin(cAng) * cDist * 0.3); // 3D orbit effect
        ctx.rotate(now / 100);
        ctx.beginPath();
        // Slightly curved shards instead of pure straight lines
        ctx.moveTo(0, -coreR * 0.4); 
        ctx.quadraticCurveTo(coreR * 0.1, 0, coreR * 0.2, 0); 
        ctx.quadraticCurveTo(coreR * 0.1, coreR * 0.2, 0, coreR * 0.4); 
        ctx.quadraticCurveTo(-coreR * 0.1, coreR * 0.2, -coreR * 0.2, 0);
        ctx.quadraticCurveTo(-coreR * 0.1, 0, 0, -coreR * 0.4);
        ctx.fill(); ctx.stroke();
        ctx.restore();
    }
    
    // Burning Crown Runes (Inner Ring)
    ctx.fillStyle = '#ea580c';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ea580c';
    ctx.font = `${coreR * 0.4}px "Georgia"`;
    ctx.textAlign = 'center';
    for (let i = 0; i < 3; i++) {
        let rAng = (now / 150) + (i * Math.PI * 2 / 3);
        ctx.fillText("✦", Math.cos(rAng) * coreR * 0.7, Math.sin(rAng) * coreR * 0.2);
    }
    ctx.restore();

    // 7. PARTICLES (Lava Embers, Ash, Sparks, Obsidian Fragments)
    ctx.shadowBlur = 10;
    for (let k = 0; k < 40; k++) {
        let pType = k % 3; // 0 = Ash, 1 = Ember, 2 = Obsidian
        let pX = (Math.random() - 0.5) * coreR * 20;
        let pY = (Math.random() - 0.5) * coreR * 20 - ((now / (pType === 1 ? 5 : 15)) + k * 80) % (coreR * 15);
        
        ctx.beginPath();
        if (pType === 0) { // Volcanic Ash
            ctx.fillStyle = 'rgba(87, 83, 78, 0.8)';
            ctx.arc(pX, pY, Math.random() * 2 + 1, 0, Math.PI * 2);
        } else if (pType === 1) { // Lava Ember
            ctx.fillStyle = '#facc15';
            ctx.shadowColor = '#ea580c';
            ctx.arc(pX, pY, Math.random() * 3 + 1, 0, Math.PI * 2);
        } else { // Small curved dark fragments
            ctx.fillStyle = '#0c0a09';
            ctx.strokeStyle = '#dc2626';
            ctx.lineWidth = 1;
            ctx.arc(pX, pY, 2.5, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.fill();
    }
    ctx.shadowBlur = 0;

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
      }

      const renderFamiliar = (pObj) => {
  if (!pObj || !pObj.familiar || pObj.dead) return;
  const f = pObj.familiar;
  const t = performance.now();
  
  ctx.save();
  ctx.translate(f.x, f.y);

  if (f.id === 'wisp') {
    // ☄️ IGNIS WISP AESTHETICS
    const wispSize = 7 + (f.level >= 5 ? 3 : 0) + (f.level >= 10 ? 4 : 0);
    ctx.shadowBlur = 20; ctx.shadowColor = '#ef4444';
    
    // Core
    ctx.fillStyle = '#fef08a';
    ctx.beginPath(); ctx.arc(0, 0, wispSize * 0.6, 0, Math.PI * 2); ctx.fill();
    
    // Flame Body
    ctx.fillStyle = `rgba(249, 115, 22, ${0.8 + Math.sin(t * 0.01) * 0.2})`;
    ctx.beginPath(); 
    ctx.moveTo(0, -wispSize * 1.5);
    ctx.quadraticCurveTo(wispSize, 0, 0, wispSize);
    ctx.quadraticCurveTo(-wispSize, 0, 0, -wispSize * 1.5);
    ctx.fill();

    // Evolutions (Orbiting Flame Spheres)
    if (f.level >= 5) {
      const orbCount = f.level >= 10 ? 3 : 1;
      ctx.fillStyle = '#ef4444';
      for(let i = 0; i < orbCount; i++) {
        const oA = t * 0.005 + (i * Math.PI * 2 / orbCount);
        ctx.beginPath(); ctx.arc(Math.cos(oA) * 18, Math.sin(oA) * 18, 3, 0, Math.PI * 2); ctx.fill();
      }
    }
  } 
// Sa loob ng renderFamiliar, hanapin ang fairy block at palitan:
  else if (f.id === 'fairy') {
    // 🌿 SYLPH FAIRY AESTHETICS
    ctx.shadowBlur = 15; ctx.shadowColor = '#22c55e';
    
    // Body
    ctx.fillStyle = '#86efac';
    ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
    
    // Fluttering Wings (🔥 FIX: Laging positive ang size para hindi mag-crash ang canvas!)
    const flap = Math.abs(Math.sin(t * 0.015)) * 6 + 1;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.beginPath(); ctx.ellipse(-5, -3, 8, flap, Math.PI/4, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(5, -3, 8, flap, -Math.PI/4, 0, Math.PI*2); ctx.fill();

    // Evolutions (Nature Halo & Dust)
    if (f.level >= 5) {
      ctx.strokeStyle = 'rgba(134, 239, 172, 0.5)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(0, -8, 10, 3, 0, 0, Math.PI*2); ctx.stroke();
    }
    if (f.level >= 10) {
      ctx.fillStyle = '#fef08a';
      ctx.beginPath(); ctx.arc(Math.cos(t * 0.002) * 12, Math.sin(t * 0.002) * 12, 1.5, 0, Math.PI*2); ctx.fill();
    }
  }
  else if (f.id === 'voidling') {
    // 🔮 VOID EYE AESTHETICS
    const float = Math.sin(t * 0.005) * 4;
    ctx.shadowBlur = 20; ctx.shadowColor = '#a855f7';
    
    // Tentacles/Rings
    ctx.strokeStyle = 'rgba(217, 70, 239, 0.8)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, float, 12, 4 + Math.sin(t*0.01)*2, t*0.002, 0, Math.PI*2); ctx.stroke();
    
    // Core Eye
    ctx.fillStyle = '#0f172a';
    ctx.beginPath(); ctx.arc(0, float, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f472b6';
    ctx.beginPath(); ctx.ellipse(0, float, 3, 5, 0, 0, Math.PI*2); ctx.fill();

    // Evolutions
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
    // ❄️ FROST SPRITE AESTHETICS (Diamond Ice Crystal)
    ctx.shadowBlur = 15; ctx.shadowColor = '#38bdf8';
    ctx.fillStyle = '#bae6fd';
    
    // Core Ice Shape
    ctx.beginPath();
    ctx.moveTo(0, -8); ctx.lineTo(6, 0); ctx.lineTo(0, 8); ctx.lineTo(-6, 0); 
    ctx.fill();
    
    // Evolutions
    if (f.level >= 5) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI*2); ctx.stroke();
    }
    if (f.level >= 10) {
      ctx.fillStyle = '#e0f2fe';
      for(let i=0; i<3; i++) {
         const a = t*0.003 + (i*Math.PI*2/3);
         ctx.beginPath(); ctx.arc(Math.cos(a)*18, Math.sin(a)*18, 2.5, 0, Math.PI*2); ctx.fill();
      }
    }
  }

  else if (f.id === 'golem') {
    // 🪨 STONE GOLEM AESTHETICS (Blocky Earth Guardian)
    ctx.shadowBlur = 10; ctx.shadowColor = '#d97706';
    
    const float = Math.sin(t * 0.005) * 2;
    // Core Block
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-8, -8 + float, 16, 16);
    // Glowing Eyes
    ctx.fillStyle = '#fffbeb';
    ctx.fillRect(-4, -4 + float, 3, 3);
    ctx.fillRect(4, -4 + float, 3, 3);
    
    // Evolutions
    if (f.level >= 5) { 
       // Floating heavy hands
       ctx.fillStyle = '#d97706';
       const armSway = Math.cos(t * 0.005) * 5;
       ctx.fillRect(-16, 0 + armSway, 6, 8);
       ctx.fillRect(10, 0 - armSway, 6, 8);
    }
    if (f.level >= 10) { 
       // Core magma glow & outer shield
       ctx.fillStyle = '#ef4444';
       ctx.fillRect(-2, 2 + float, 4, 4);
       ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)'; ctx.lineWidth = 2;
       ctx.beginPath(); ctx.arc(0, float, 24, 0, Math.PI*2); ctx.stroke();
    }
  }

  else if (f.id === 'thunder') {
    // ⚡ SPARK FOX AESTHETICS (Lightning Orb with Fox Ears)
    ctx.shadowBlur = 15; ctx.shadowColor = '#e879f9';
    ctx.fillStyle = '#fdf4ff';
    
    const pulse = Math.sin(t * 0.01) * 2;
    // Energy Body
    ctx.beginPath(); ctx.arc(0, 0, 6 + pulse, 0, Math.PI*2); ctx.fill();
    // Fox Ears Shape
    ctx.beginPath(); ctx.moveTo(-6, -2); ctx.lineTo(-10, -12); ctx.lineTo(-2, -6); ctx.fill();
    ctx.beginPath(); ctx.moveTo(6, -2); ctx.lineTo(10, -12); ctx.lineTo(2, -6); ctx.fill();
    
    // Evolutions
    if (f.level >= 5) {
       ctx.strokeStyle = '#d946ef'; ctx.lineWidth = 2;
       ctx.beginPath(); ctx.ellipse(0, 0, 16, 6, t*0.005, 0, Math.PI*2); ctx.stroke();
    }
    if (f.level >= 10) {
       if (Math.random() < 0.3) {
          // Random wild lightning arcs popping out of it
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(0,0); 
          ctx.lineTo((Math.random()-0.5)*35, (Math.random()-0.5)*35); ctx.stroke();
       }
    }
  }
  
  ctx.restore();
};


      // Tawagin ito bago mag-end ang renderLoop mo
renderFamiliar(eng.p);
if (isCoopActive && eng.p2) renderFamiliar(eng.p2);

// ==============================================================================
      // 🔥 UPDATED STEP 4: INTENSE & SCARY CINEMATIC BOSS INTRO EFFECTS
      // ==============================================================================
      if (eng.bossIntro && eng.bossIntro.active) {
        const t = eng.bossIntro.timer;
        const maxT = eng.bossIntro.maxDuration;
        const ctx = canvasRef.current.getContext('2d');
        const W = canvasRef.current.width;
        const H = canvasRef.current.height;

        ctx.save();
        
        // --- PHASE 1: THE INVASION OF DARKNESS (t > 70% of maxDuration) ---
        // Sa umpisa, didilim ang buong screen maliban sa bars.
        if (t > maxT * 0.7) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
          ctx.fillRect(0, 0, W, H);
        }

        // 1. INTENSE SCREEN SHAKE (Heavy vibration)
        // Mas malakas ang yugyog kesa dati
        const shakeIntensity = Math.min(25, t / 8); 
        const offsetX = (Math.random() - 0.5) * shakeIntensity;
        const offsetY = (Math.random() - 0.5) * shakeIntensity;
        ctx.translate(offsetX, offsetY);

        // --- PHASE 2: THE VOID CLOSES IN (t <= 70% of maxDuration) ---
        if (t <= maxT * 0.7) {
          // 2. HEAVY ABYSS VIGNETTE (Claustrophobic pulse)
          // Mas madilim at mas makapal ang awra sa gilid
          const pulse = Math.abs(Math.sin(t * 0.08)); // Faster pulse
          const gradient = ctx.createRadialGradient(W/2, H/2, H * 0.2, W/2, H/2, W * 0.8);
          gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
          gradient.addColorStop(0.5, `rgba(40, 0, 0, ${0.3 + pulse * 0.2})`); // Crimson pulse
          gradient.addColorStop(1, 'rgba(10, 0, 0, 1)'); // Crushing black
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, W, H);

          // 3. Spawning VOID PARTICLES (Temporary effect)
          // Gumawa tayo ng ilang particles kada frame habang active ang vignette
          ctx.fillStyle = 'rgba(255, 30, 30, 0.6)';
          for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.arc(W/2 + (Math.random()-0.5)*W, H/2 + (Math.random()-0.5)*H, Math.random()*4, 0, Math.PI*2);
            ctx.fill();
          }
        }

        // 4. CINEMATIC BLACK BARS (Letterbox)
        // Mas makapal ng konti para mas claustrophobic
        const barHeight = H * 0.15; 
        ctx.fillStyle = "#020202";
        ctx.fillRect(0, 0, W, barHeight);
        ctx.fillRect(0, H - barHeight, W, barHeight);

        // --- PHASE 3: THE ANNOUNCEMENT (t <= 50% of maxDuration) ---
        if (t <= maxT * 0.5) {
          ctx.save();
          
          // 5. CHROMATIC ABERRATION TEXT GLITCH
          // Ida-draw natin ang text ng tatlong beses na may magkakaibang kulay at kaunting offset.
          const glitchInt = 2 + Math.random() * 4;
          const textX = W / 2;
          const textY = H / 2;
          const fontStyle = "bold 84px Georgia, serif"; // Mas malaki at aggressive

          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.font = fontStyle;

          // Red Channel (Offset Left)
          ctx.fillStyle = "rgba(255, 0, 0, 0.9)";
          ctx.fillText(eng.bossIntro.bossName, textX - glitchInt, textY + (Math.random()-0.5)*2);

          // Cyan Channel (Offset Right)
          ctx.fillStyle = "rgba(0, 255, 255, 0.8)";
          ctx.fillText(eng.bossIntro.bossName, textX + glitchInt, textY + (Math.random()-0.5)*2);

          // White Main Text (Centered, Glaring)
          ctx.shadowColor = "#ff1a1a";
          ctx.shadowBlur = 30 + Math.random() * 15;
          ctx.fillStyle = "#ffffff";
          ctx.fillText(eng.bossIntro.bossName, textX, textY);
          
          ctx.restore();

          // 6. Subtitle with Heavy Shadow
          ctx.shadowColor = "#000";
          ctx.shadowBlur = 8;
          ctx.fillStyle = "#fecaca"; // Stark light red
          ctx.font = "italic 28px Georgia, serif";

          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("THE ABYSS HAS AWOKEN. PREPARE TO DIE.", W / 2, H / 2 + 85);
        }

        // --- PHASE 4: FINAL VOID FLASH (t <= 5 frames) ---
        // Biglaang flash bago matapos ang intro para sa shock factor.
        if (t <= 5) {
          ctx.fillStyle = 'white'; // Opsyonal: 'rgba(255, 0, 0, 0.8)' kung gusto mo ng pulang flash
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
          // Dahan-dahang lilitaw sa unang 1.5 segundo (12.0 down to 10.5)
          const fadeIn = Math.min(1, (12.0 - timerVal) / 1.5); 
          // Dahan-dahang mawawala sa huling 1 segundo (1.0 down to 0.0)
          const fadeOut = Math.min(1, timerVal);
          const alpha = fadeIn * fadeOut; 

          const now = Date.now(); 
          
          const cx = ctx.canvas.width / 2;
          const cy = ctx.canvas.height / 2;

          // 🎵 ONE-TIME CHOIR SOUND TRIGGER
          if (!window.victoryChoirPlayed && alpha > 0.1) {
              window.victoryChoirPlayed = true; // Flag para hindi mag-loop ang sound
              playSfx('choir');
          }

          ctx.save();
          ctx.setTransform(1, 0, 0, 1, 0, 0); 
          
          // 💥 EPIC SCREEN SHAKE (Yayanig ang screen sa unang 2 segundo)
          if (timerVal > 10.0) {
              const intensity = (timerVal - 10.0) * 5; // Pababang intensity
              ctx.translate((Math.random() - 0.5) * intensity, (Math.random() - 0.5) * intensity);
          }

          // ---------------------------------------------------------
          // 1. DARK VIOLET ARCANE MIST & BACKGROUND
          // ---------------------------------------------------------
          const pulseMist = 0.8 + 0.1 * Math.sin(now * 0.002);
          ctx.fillStyle = `rgba(5, 1, 12, ${alpha * pulseMist})`;
          ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height); 

          const bgGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, ctx.canvas.width * 0.7);
          bgGlow.addColorStop(0, `rgba(124, 58, 237, ${alpha * 0.35})`); 
          bgGlow.addColorStop(0.4, `rgba(197, 160, 89, ${alpha * 0.15})`); 
          bgGlow.addColorStop(1, `rgba(0, 0, 0, 0)`);
          ctx.fillStyle = bgGlow;
          ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

          // ---------------------------------------------------------
          // 🌟 NEW: ROTATING CELESTIAL GOD RAYS (LIGHT BEAMS)
          // ---------------------------------------------------------
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(now * 0.0001); // Mabagal na ikot ng rays
          for (let i = 0; i < 12; i++) {
              ctx.rotate((Math.PI * 2) / 12);
              const rayGrad = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
              rayGrad.addColorStop(0, `rgba(254, 240, 138, ${alpha * 0.15})`); // Solid Gold
              rayGrad.addColorStop(1, `rgba(254, 240, 138, 0)`); // Fades out
              
              ctx.fillStyle = rayGrad;
              ctx.beginPath();
              ctx.moveTo(-15, 0);
              ctx.lineTo(15, 0);
              ctx.lineTo(60, ctx.canvas.height);
              ctx.lineTo(-60, ctx.canvas.height);
              ctx.fill();
          }
          ctx.restore();

          // ---------------------------------------------------------
          // 2. ROTATING ANCIENT MAGICAL SIGILS
          // ---------------------------------------------------------
          ctx.save();
          ctx.translate(cx, cy);
          ctx.globalAlpha = alpha * 0.7;
          
          ctx.save();
          ctx.rotate(now * 0.0003);
          ctx.strokeStyle = '#c5a059'; 
          ctx.lineWidth = 2.5;
          ctx.setLineDash([15, 25, 5, 25]);
          ctx.beginPath(); ctx.arc(0, 0, 290, 0, Math.PI * 2); ctx.stroke();
          ctx.restore();

          ctx.save();
          ctx.rotate(-now * 0.0005);
          ctx.strokeStyle = '#a78bfa'; 
          ctx.lineWidth = 4;
          ctx.setLineDash([50, 20]);
          ctx.beginPath(); ctx.arc(0, 0, 250, 0, Math.PI * 2); ctx.stroke();
          
          ctx.font = '24px "Georgia"';
          ctx.fillStyle = '#fef08a';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          for(let i = 0; i < 8; i++) {
              let ang = (i / 8) * Math.PI * 2;
              ctx.fillText("✧", Math.cos(ang) * 250, Math.sin(ang) * 250);
          }
          ctx.restore();

          ctx.save();
          ctx.rotate(now * 0.0008);
          ctx.strokeStyle = 'rgba(253, 224, 71, 0.5)';
          ctx.lineWidth = 1;
          ctx.setLineDash([5, 10]);
          ctx.beginPath(); ctx.arc(0, 0, 210, 0, Math.PI * 2); ctx.stroke();
          ctx.restore();
          
          ctx.restore(); 

          // ---------------------------------------------------------
          // 🌠 NEW: SHOOTING ARCANE COMETS (FAST PARTICLES)
          // ---------------------------------------------------------
          ctx.save();
          ctx.translate(cx, cy);
          for (let i = 0; i < 8; i++) {
              const pTime = ((now * 0.002) + i * 1.5) % 3; 
              const pAng = i * (Math.PI * 2 / 8) + (now * 0.0001);
              const pDist = pTime * 400; 
              
              ctx.globalAlpha = alpha * Math.max(0, 1 - (pTime / 3));
              ctx.fillStyle = '#d8b4fe';
              ctx.beginPath();
              ctx.arc(Math.cos(pAng) * pDist, Math.sin(pAng) * pDist, 3, 0, Math.PI * 2);
              ctx.fill();
              
              ctx.strokeStyle = `rgba(216, 180, 254, ${alpha * Math.max(0, 1 - (pTime / 3))})`;
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(Math.cos(pAng) * pDist, Math.sin(pAng) * pDist);
              ctx.lineTo(Math.cos(pAng) * (pDist - 60), Math.sin(pAng) * (pDist - 60));
              ctx.stroke();
          }
          ctx.restore();

          // ---------------------------------------------------------
          // 3. FLOATING MANA STARDUST
          // ---------------------------------------------------------
          ctx.save();
          ctx.translate(cx, cy);
          ctx.globalAlpha = alpha;
          for (let i = 0; i < 50; i++) {
              const sparkT = ((now * 0.0004) + i * 0.12) % 3; 
              const sparkAng = i * (Math.PI * 2 / 50) + Math.sin(now * 0.0002 + i);
              const sparkR = sparkT * 150; 
              const sparkSize = Math.max(0.1, 3.5 - sparkT); 
              
              ctx.fillStyle = i % 2 === 0 ? '#ffe6a3' : '#d8b4fe'; 
              ctx.globalAlpha = alpha * Math.max(0, 1 - (sparkT / 3)); 
              ctx.beginPath();
              ctx.arc(Math.cos(sparkAng) * sparkR, Math.sin(sparkAng) * sparkR, sparkSize, 0, Math.PI * 2);
              ctx.fill();
          }
          ctx.restore();

          // ---------------------------------------------------------
          // 4. ARCANE LIGHTNING FLASH EFFECT
          // ---------------------------------------------------------
          if (Math.sin(now * 0.004) > 0.97) {
              ctx.fillStyle = `rgba(167, 139, 250, ${Math.random() * 0.2 * alpha})`;
              ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
          }

          // ---------------------------------------------------------
          // 5. MAIN CINEMATIC TITLE TEXT
          // ---------------------------------------------------------
          const floatY = Math.sin(now * 0.002) * 10; 
          const titleY = cy - 40 + floatY; // Inangat ko ng kaunti (-30 to -40) para may space sa ilalim

          ctx.textAlign = 'center';
          const titleGrad = ctx.createLinearGradient(cx - 300, titleY - 40, cx + 300, titleY + 10);
          titleGrad.addColorStop(0, '#fde047'); 
          titleGrad.addColorStop(0.5, '#d8b4fe'); 
          titleGrad.addColorStop(1, '#fde047'); 

          ctx.fillStyle = titleGrad; 
          ctx.globalAlpha = alpha;
          ctx.font = 'bold 65px "Georgia", serif';
          
          const shadowPulse = 25 + 15 * Math.sin(now * 0.005);
          ctx.shadowBlur = shadowPulse;
          ctx.shadowColor = '#a78bfa';
          
          ctx.fillText("THE VOID HAS BEEN SEALED", cx, titleY);
          
          // ---------------------------------------------------------
          // 6. CINEMATIC SUBTITLE
          // ---------------------------------------------------------
          const subFade = 0.6 + 0.4 * Math.sin(now * 0.003); 
          ctx.fillStyle = `rgba(226, 232, 240, ${alpha * subFade})`; 
          ctx.font = 'italic 24px "Georgia", serif';
          
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#c5a059'; 
          
          ctx.fillText("Ancient seals awaken across the shattered realms... ", cx, titleY + 60);

          // ---------------------------------------------------------
          // 7. 🔥 NEW: ENDLESS WAVES INITIATION WARNING
          // ---------------------------------------------------------
          // Ang text na ito ay magfa-flash nang mas mabilis at gagamit ng mapulang kulay
          // para mag-pahiwatig ng papalapit na panganib matapos ang tagumpay.
          
          // Lilitaw lang ang endless text kapag medyo nakapag-sink in na yung unang text
          if (timerVal <= 10.5) { 
              const endlessPulse = Math.max(0, Math.sin(now * 0.006)); // Mabilis na tibok
              ctx.fillStyle = `rgba(255, 69, 0, ${alpha * (0.4 + endlessPulse * 0.6)})`; // Crimson Orange/Red
              ctx.font = 'bold 22px "Courier New", monospace'; // Ibang font para mag-stand out as "system alert" o shift ng tone
              
              ctx.shadowBlur = 20 + (endlessPulse * 15);
              ctx.shadowColor = '#ff0000';
              
              ctx.fillText(">> WARNING: ENDLESS WAVES INCOMING... <<", cx, titleY + 115);
          }
          
          ctx.restore();
      }

      // 🔥 FAMILIAR RENDERER



      // Ito yung orihinal na dulo mo:
      renderAnimId = requestAnimationFrame(renderLoop);
    }; // <-- Nagsasara sa renderLoop

    renderLoop(); // <-- Nagpapagana sa animation

    const down = (e) => { 


      if (window.ArcaneSoundManager) window.ArcaneSoundManager.unlockAll(); 
      eng.keys[e.key] = true;

      if (e.key === ' ' && screen === 'playing') {
        e.preventDefault(); // Iwas scroll sa browser
        window.triggerDash();
      }

      if ((e.key === 'Escape' || e.key === 'p' || e.key === 'P') && screen === 'playing') {
        const isCoopActive = Boolean(netRef.current && netRef.current.channel);
        if (!isCoopActive || netRef.current.isHost) {
          if (window.executeNetworkPauseAction) {
            window.executeNetworkPauseAction();
          }
        }
      }
      
      if ((e.key === 'k' || e.key === 'K' || e.key === 't' || e.key === 'T') && screen === 'playing') {
        setIsTreeOpen(prev => !prev);
      }

      if ((e.key === 'i' || e.key === 'I') && screen === 'playing') {
        setIsInventoryOpen(prev => !prev); 
      }
      
      if (screen === 'playing') {

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
                 dmg: 400, xp: 25000, color: '#000000', glow: '#ffffff', boss: true, type: 'primordial', 
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
             target.baseCrit = 60;      // Max Crit Chance Cap (60%)
             target.baseDef = 60;       // Max Defense Block Cap (60%)

             target.chatBubble = { text: "ULTIMATE GOD MODE ACTIVATED!", life: 2.0 };
             setPlayerLevel(target.level);
          }
        }
        
        // END CHEAT CODES


        


       if (playerLevel >= 10) {
        if (e.key === '1') learnSkillTreeTech('bodyCutter');
        if (e.key === '2') learnSkillTreeTech('shootingStar');
        if (e.key === '3') learnSkillTreeTech('cubeBash');
        if (e.key === '4') learnSkillTreeTech('vacuumSlash');
       }

        if (playerLevel >= 16) {
            if (e.key === '5') castArcaneCollapseUltimate();
            if (e.key === '6') castArcaneInstinctUltimate(); 
            if (e.key === '7') castArcaneResurrectionUltimate();
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
    };
  }, [screen]);

const handlePointerDown = (e) => {
    if (window.ArcaneSoundManager) window.ArcaneSoundManager.unlockAll(); 
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
  //
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

      <div className="orientation-warning">
  <span style={{ fontSize: '3rem' }}>🔄</span>
  <h2>Please Rotate Your Device</h2>
  <p>Arcane Survival requires landscape orientation to harness spell parameters.</p>
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

        {screen === 'playing' && playerLevel >= 12 && (
          <div className="elemental-sigils-container">
            <div className="sigil-btn sigil-fire" onPointerDown={(e) => { e.stopPropagation(); castElementalSigil('flareInferno'); }}>
              🔥
              {skillsState.flareInferno?.cd > 0 && <div className="sigil-cd-overlay">{Math.ceil(skillsState.flareInferno.cd)}s</div>}
              <span className="sigil-title">Flare Inferno</span>
            </div>
            <div className="sigil-btn sigil-water" onPointerDown={(e) => { e.stopPropagation(); castElementalSigil('tidalWave'); }}>
              🌊
              {skillsState.tidalWave?.cd > 0 && <div className="sigil-cd-overlay">{Math.ceil(skillsState.tidalWave.cd)}s</div>}
              <span className="sigil-title">Tidal Wave</span>
            </div>
            <div className="sigil-btn sigil-earth" onPointerDown={(e) => { e.stopPropagation(); castElementalSigil('fissureSlam'); }}>
              🪨
              {skillsState.fissureSlam?.cd > 0 && <div className="sigil-cd-overlay">{Math.ceil(skillsState.fissureSlam.cd)}s</div>}
              <span className="sigil-title">Fissure Slam</span>
            </div>
            <div className="sigil-btn sigil-lightning" onPointerDown={(e) => { e.stopPropagation(); castElementalSigil('lightningSurge'); }}>
              ⚡
              {skillsState.lightningSurge?.cd > 0 && <div className="sigil-cd-overlay">{Math.ceil(skillsState.lightningSurge.cd)}s</div>}
              <span className="sigil-title">Lightning Surge</span>
            </div>
            <div className="sigil-btn sigil-ice" onPointerDown={(e) => { e.stopPropagation(); castElementalSigil('iceStorm'); }}>
              ❄️
              {skillsState.iceStorm?.cd > 0 && <div className="sigil-cd-overlay">{Math.ceil(skillsState.iceStorm.cd)}s</div>}
              <span className="sigil-title">Ice Storm</span>
            </div>
            <div className="sigil-btn sigil-nature" onPointerDown={(e) => { e.stopPropagation(); castHealingSigil(); }}>
              🌿
              {skillsState.natureRecovery?.cd > 0 && <div className="sigil-cd-overlay">{Math.ceil(skillsState.natureRecovery.cd)}s</div>}
              <span className="sigil-title">Nature's Recovery</span>
            </div>

          </div>
        )}

        {screen === 'playing' && (
          <div className="game-hud-top" style={{ pointerEvents: 'auto', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start', marginTop: '2px' }}>
              <div>SCORE: <span ref={scoreValueRef}>0</span></div>
            </div>

            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', marginTop: '0px' }}>
              {isHostInstance && (
                <button 
                  onClick={() => {
                    if (window.executeNetworkPauseAction && isNetworked) {
                      window.executeNetworkPauseAction();
                    } else {
                      setScreen('pause');
                    }
                  }}
                  style={{
                    background: 'rgba(27, 16, 59, 0.6)',
                    border: '1px solid #4c2d82',
                    color: '#a78bfa',
                    fontFamily: 'Georgia, serif',
                    fontSize: '0.75rem',
                    fontWeight: '800',
                    letterSpacing: '0.05em',
                    padding: '6px 16px',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    boxShadow: '0 0 10px rgba(124, 58, 237, 0.25)',
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
                  PAUSE?
                </button>
              )}
            </div>

            <div className="game-hud-right-group" style={{ flex: 1 }}>
              <div ref={waveValueRef} style={{ fontSize: '1rem', fontWeight: 'bold', color: '#ffffff', textShadow: '0 0 8px rgba(255,255,255,0.5)', marginTop: '2px' }}>
                WAVE 1 | 30s
              </div>
              
              <div className="hud-menu-title">
                <span className="arc">ARCANE</span><br/>
                <span className="sur">SURVIVAL</span>
              </div>
              <div className="hud-menu-sub">The Last Covenant</div>
            </div>
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
              onPointerDown={(e) => {
                e.stopPropagation();
                setIsStatsOpen(prev => !prev);
              }}
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
                  <span className="stats-label">Crit Chance:</span>
                  <span ref={statCritRef} className="stats-value">0%</span>
                </div>
                <div className="stats-row">
                  <span className="stats-label">Armor Rating:</span>
                  <span ref={statDefRef} className="stats-value">0 (0% Block)</span>
                </div>
                <div className="stats-row">
                  <span className="stats-label">Life Steal:</span>
                  <span ref={statLifestealRef} className="stats-value" style={{ color: '#ef4444' }}>0 HP/Kill</span>
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
              onPointerDown={(e) => {
                e.stopPropagation();
                if (skillsState.bodyCutter?.learned) learnSkillTreeTech('bodyCutter');
              }}
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
              onPointerDown={(e) => {
                e.stopPropagation();
                if (skillsState.shootingStar?.learned) learnSkillTreeTech('shootingStar');
              }}
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
              onPointerDown={(e) => {
                e.stopPropagation();
                if (skillsState.cubeBash?.learned) learnSkillTreeTech('cubeBash');
              }}
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
              onPointerDown={(e) => {
                e.stopPropagation();
                if (skillsState.vacuumSlash?.learned) learnSkillTreeTech('vacuumSlash');
              }}
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

            {playerLevel >= 16 && (
              <>
                <div 
                  className="mmo-hotbar-ult-slot"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    castArcaneCollapseUltimate();
                  }}
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
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    castArcaneInstinctUltimate();
                  }}
                  title="Arcane Instinct: Transcendent State"
                >
                  <span className="hotbar-key-bind">6</span>
                  <span className="hotbar-icon">⚡</span>
                  <span className="hotbar-name">A.Instinct</span>
                  {skillsState.arcaneInstinct?.cd > 0 && (
                    <div className="hotbar-cooldown-overlay">{Math.ceil(skillsState.arcaneInstinct.cd)}s</div>
                  )}
                </div>

                <div 
                  className="mmo-hotbar-ult-slot"
                  style={{ border: '3px solid #10b981', background: 'radial-gradient(circle, #064e3b 0%, #022c22 100%)' }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    castArcaneResurrectionUltimate();
                  }}
                  title="Forbidden Spell: Resurrection of Arcane"
                >
                  <span className="hotbar-key-bind">7</span>
                  <span className="hotbar-icon">⚚</span>
                  <span className="hotbar-name">A.Resurrect</span>
                  {skillsState.arcaneResurrection?.cd > 0 && (
                    <div className="hotbar-cooldown-overlay">{Math.ceil(skillsState.arcaneResurrection.cd)}s</div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* 💨 THE DASH BUTTON (MOBA STYLE PLACEMENT) */}
        {screen === 'playing' && hasStarted && (
          <div className="dash-btn-container" onPointerDown={(e) => { e.stopPropagation(); window.triggerDash(); }}>
            <div className="dash-icon">💨</div>
            <div className="dash-label">DASH</div>
            <div ref={dashCdRef} className="dash-cd-overlay"></div>
          </div>
        )}

{/* ========================================== */}
        {/* BOTTOM RIGHT MENUS: INVENTORY & SKILLS     */}
        {/* ========================================== */}
        {screen === 'playing' && (
          <div style={{ position: 'absolute', bottom: '12px', right: '12px', display: 'flex', gap: '8px', zIndex: 60, alignItems: 'flex-end' }}>
            
            {/* INVENTORY BUTTON (Laging visible from Level 1) */}
            <button 
              className="inventory-toggle-btn" 
              style={{ position: 'relative', bottom: 'auto', right: 'auto', margin: 0 }}
              onPointerDown={(e) => { e.stopPropagation(); setIsInventoryOpen(prev => !prev); }}
            >
              🎒 {isInventoryOpen ? "Close Bag [I]" : "Inventory [I]"}
            </button>

            {/* SKILLS BUTTON (Lalabas lang pag Level 5+) */}
            {playerLevel >= 5 && (
              <button 
                className="skill-tree-toggle-btn" 
                style={{ position: 'relative', bottom: 'auto', right: 'auto', margin: 0 }} // Ino-override nito yung absolute positioning sa CSS mo
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setIsTreeOpen(prev => !prev);
                }}
              >
                {isTreeOpen ? "Hide Skills [K]" : "Show Skills [K]"}
              </button>
            )}
          </div>
        )}

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
              <span style={{ fontWeight: 'bold', color: '#fef08a' }}>🎒 EQUIPMENT & INVENTORY</span>
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
                          <span style={{ fontSize: '1.5rem' }}>{slot === 'wand' ? '🪄' : slot === 'robe' ? '🧙' : '👢'}</span>
                          
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
                            <div style={{ color: '#94a3b8', fontSize: '0.6rem', marginBottom: '4px' }}>{item.rarity.toUpperCase()}</div>
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
                        
                        <span style={{ fontSize: '1.5rem' }}>{item.type === 'wand' ? '🪄' : item.type === 'robe' ? '🧙' : '👢'}</span>
                        
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
                            <div style={{ color: '#94a3b8', fontSize: '0.6rem', marginBottom: '4px' }}>{item.rarity.toUpperCase()} {item.type.toUpperCase()}</div>
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
                              <div style={{ color: '#94a3b8', fontSize: '0.6rem', marginBottom: '4px' }}>{equippedItem.rarity.toUpperCase()} {equippedItem.type.toUpperCase()}</div>
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
              <span className="skill-tree-title">✨ DEFENSIVE SPELLS (LV 5+)</span>
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
              onPointerDown={(e) => { e.stopPropagation(); learnSkillTreeTech('haste'); }}
            >
              <span>⚡ Massive Haste {skillsState.haste?.learned ? (skillsState.haste.enabled ? '[ON]' : '[OFF]') : ''}</span>
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
              <span>🛡️ Fortify {skillsState.fortify?.learned ? (skillsState.fortify.enabled ? '[ON]' : '[OFF]') : ''}</span>
              {skillsState.fortify?.learned && <span className="skill-cd-text">PERMANENT</span>}
            </button>
            <div className="skill-node-desc">Hardens your wizard robes to grant a flat, permanent 25% damage reduction from all sources.</div>

            <button 
              className={`skill-row-btn ${skillsState.shield?.learned ? (skillsState.shield.enabled ? 'learned' : 'disabled-toggle') : ''}`}
              onPointerDown={(e) => { e.stopPropagation(); learnSkillTreeTech('shield'); }}
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
                  <span className="skill-tree-title" style={{ color: '#f43f5e' }}>⚔️ OFFENSIVE SPELLS (LV 10+)</span>
                </div>

                <button 
                  className={`skill-row-btn ${skillsState.bodyCutter?.learned ? (skillsState.bodyCutter.enabled ? 'learned' : 'disabled-toggle') : ''}`}
                  onPointerDown={(e) => { e.stopPropagation(); learnSkillTreeTech('bodyCutter'); }}
                >
                  <span>🩸 Body Cutter {skillsState.bodyCutter?.learned ? (skillsState.bodyCutter.enabled ? '[ON]' : '[OFF]') : ''}</span>
                  {skillsState.bodyCutter?.learned && <span className="skill-cd-text">PASSIVE</span>}
                </button>
                <div className="skill-node-desc">Applies stigma/debuff and damage-over-time effects to your enemies.</div>

                <button 
                  className={`skill-row-btn ${skillsState.shootingStar?.learned ? (skillsState.shootingStar.enabled ? 'learned' : 'disabled-toggle') : ''}`}
                  onPointerDown={(e) => { e.stopPropagation(); learnSkillTreeTech('shootingStar'); }}
                >
                  <span>🌠 Shooting Star {skillsState.shootingStar?.learned ? (skillsState.shootingStar.enabled ? '[ON]' : '[OFF]') : ''}</span>
                  {skillsState.shootingStar?.learned && <span className="skill-cd-text">AUTO</span>}
                </button>
                <div className="skill-node-desc">Summons explosive cube effects for area damage.</div>

                <button 
                  className={`skill-row-btn ${skillsState.cubeBash?.learned ? (skillsState.cubeBash.enabled ? 'learned' : 'disabled-toggle') : ''}`}
                  onPointerDown={(e) => { e.stopPropagation(); learnSkillTreeTech('cubeBash'); }}
                >
                  <span>📦 Cube Bash {skillsState.cubeBash?.learned ? (skillsState.cubeBash.enabled ? '[ON]' : '[OFF]') : ''}</span>
                  {skillsState.cubeBash?.learned && <span className="skill-cd-text">AUTO</span>}
                </button>
                <div className="skill-node-desc">Cube-based control attack that can disable or stun enemies.</div>

                <button 
                  className={`skill-row-btn ${skillsState.vacuumSlash?.learned ? (skillsState.vacuumSlash.enabled ? 'learned' : 'disabled-toggle') : ''}`}
                  onPointerDown={(e) => { e.stopPropagation(); learnSkillTreeTech('vacuumSlash'); }}
                >
                  <span>🌀 Vacuum Slash {skillsState.vacuumSlash?.learned ? (skillsState.vacuumSlash.enabled ? '[ON]' : '[OFF]') : ''}</span>
                  {skillsState.vacuumSlash?.learned && <span className="skill-cd-text">AUTO</span>}
                </button>
                <div className="skill-node-desc">Powerful attack by slashing the air generating massive force to damage the enemy.</div>
              </>
            )}

            {playerLevel >= 16 && (
              <>
                <div className="skill-tree-title-row" style={{ marginTop: '12px' }}>
                  <span className="skill-tree-title" style={{ color: '#d946ef' }}>🌌 ULTIMATE SPELLS (LV 12+)</span>
                </div>

                <button 
                  className="skill-row-btn learned"
                  onPointerDown={(e) => { e.stopPropagation(); castArcaneCollapseUltimate(); }}
                >
                  <span>🌌 Arcane Collapse [Press 5]</span>
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
                  <span>⚡ Arcane Instinct [Press 6]</span>
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
                  <span>⚚ Arcane Resurrection [Press 7]</span>
                  <span className="skill-cd-text">300s CD</span>
                </button>
                <div className="skill-node-desc" style={{ borderColor: '#10b981' }}>
                  Forbidden Magic: Revives a fallen ally with 70% Max HP and immediately grants them a 10s Rigid Defender shield. <br/><span style={{ color: '#f87171' }}>SACRIFICE: Casting this halves your current EXP and permanently burns away 1 of your Levels.</span>
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
                  ? (('ontouchstart' in window || navigator.maxTouchPoints > 0) 
                      ? "Touch and drag on the left side of the screen to begin battle." 
                      : "Press WASD or Arrow Keys to begin battle.")
                  : "The arena will initialize once the match host begins moving."}
              </p>
            </div>
          </div>
        )}

        {screen === 'pause' && isNetworked && !netRef.current.isHost && (
          <div className="hud-start-overlay" style={{ zIndex: 110 }}>
            <div className="hud-start-modal" style={{ borderColor: '#a78bfa' }}>
              <h2>MATCH PAUSED</h2>
              <p>The Host has paused the session. Standing by for resumption...</p>
            </div>
          </div>
        )}

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