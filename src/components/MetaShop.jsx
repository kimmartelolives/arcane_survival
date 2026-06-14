import React, { useState, useEffect } from 'react';

const UPGRADES_DB = [
  { id: 'hp', name: 'Vitality Core', desc: '+15 Max HP per level', baseCost: 50, costMult: 1.5, maxLevel: 20 },
  { id: 'dmg', name: 'Arcane Amplifier', desc: '+3 Base Damage per level', baseCost: 75, costMult: 1.6, maxLevel: 20 },
  { id: 'def', name: 'Aegis Plating', desc: '+2 Armor Rating per level', baseCost: 60, costMult: 1.5, maxLevel: 15 },
  { id: 'crit', name: 'Fatal Precision', desc: '+1% Crit Chance per level', baseCost: 100, costMult: 1.8, maxLevel: 10 },
  { id: 'speed', name: 'Windwalker', desc: '+5 Move Speed per level', baseCost: 40, costMult: 1.4, maxLevel: 10 },
];

// 🟢 NAGDAGDAG TAYO NG "colors" OBJECT PARA SA PREVIEW MINI-AVATAR
const SKINS_DB = [
  { id: 'default', name: 'Apprentice Robes', desc: 'The humble attire worn by aspiring mages beginning their journey into the arcane arts.', cost: 0, glow: '#a855f7', colors: { c: '#8b5cf6', robe: '#5b21b6', brim: '#c4b5fd' } },
  { id: 'shadow', name: 'Harbinger of the Void Realm', desc: 'A master of forbidden sorcery who draws power from the endless depths of the Void.', cost: 600, glow: '#ef4444', colors: { c: '#991b1b', robe: '#450a0a', brim: '#7f1d1d' } },
  { id: 'pyro', name: 'Demon of the Ashen Flare', desc: 'An infernal entity forged within primordial flames, leaving only ash in its wake.', cost: 800, glow: '#f97316', colors: { c: '#ef4444', robe: '#7f1d1d', brim: '#fca5a5' } },
  { id: 'archmage', name: 'The Arcane Archon', desc: 'A legendary master of magic whose command over the arcane eclipses all mortal understanding.', cost: 1000, glow: '#fbbf24', colors: { c: '#fef08a', robe: '#b45309', brim: '#fef9c3' } },
  { id: 'sakura', name: 'Empress of the Eternal Bloom', desc: 'Commands an endless storm of enchanted petals.', cost: 1200, glow: '#ec4899', colors: { c: '#f472b6', robe: '#ec4899', brim: '#fdf2f8' } },
  { id: 'pink_wings', name: 'Seraph of the Pink Eclipse', desc: 'A celestial sovereign whose wings paint the heavens in radiant pink light.', cost: 1200, glow: '#fb7185', colors: { c: '#fb7185', robe: '#f472b6', brim: '#fff5fa' } },
];

// 🟢 CSS-BASED WIZARD AVATAR RENDERER (Para hindi mabigat sa memory)
const SkinPreview = ({ skin }) => {
  const { colors, glow } = skin;
  return (
    <div style={{
      position: 'relative', width: '64px', height: '64px', 
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0, 0, 0, 0.4)', borderRadius: '8px',
      border: `1px solid ${glow}60`, boxShadow: `inset 0 0 15px ${glow}30`,
      flexShrink: 0
    }}>
      {/* Hat Top (Triangle) */}
      <div style={{
        width: 0, height: 0, 
        borderLeft: '10px solid transparent', borderRight: '10px solid transparent', 
        borderBottom: `22px solid ${colors.robe}`,
        position: 'absolute', top: '8px', zIndex: 3
      }} />
      {/* Hat Brim (Ellipse) */}
      <div style={{
        width: '40px', height: '12px', borderRadius: '50%',
        background: colors.brim,
        position: 'absolute', top: '24px', zIndex: 2,
        boxShadow: `0 2px 4px rgba(0,0,0,0.5)`
      }} />
      {/* Body/Face (Glowing Circle) */}
      <div style={{
        width: '22px', height: '22px', borderRadius: '50%',
        background: colors.c,
        position: 'absolute', top: '26px', zIndex: 1,
        boxShadow: `0 0 15px ${glow}`
      }}>
        {/* Cute Eyes */}
        <div style={{position:'absolute', top:'7px', left:'5px', width:'3px', height:'3px', background:'#030111', borderRadius:'50%'}}/>
        <div style={{position:'absolute', top:'7px', right:'5px', width:'3px', height:'3px', background:'#030111', borderRadius:'50%'}}/>
      </div>
      {/* Robe Bottom (Triangle) */}
      <div style={{
        width: 0, height: 0, 
        borderLeft: '16px solid transparent', borderRight: '16px solid transparent', 
        borderBottom: `20px solid ${colors.robe}`,
        position: 'absolute', top: '38px', zIndex: 0
      }} />
    </div>
  );
};

export default function MetaShop({ screen, setScreen }) {
  const [activeTab, setActiveTab] = useState('stats'); // 'stats' o 'skins'
  const [crystals, setCrystals] = useState(0);
  const [upgrades, setUpgrades] = useState({});
  const [unlockedSkins, setUnlockedSkins] = useState(['default']);
  const [equippedSkin, setEquippedSkin] = useState('default');

  useEffect(() => {
    if (screen === 'metashop') {
      setCrystals(parseInt(localStorage.getItem('arcane_void_crystals') || '0', 10));
      setUpgrades(JSON.parse(localStorage.getItem('arcane_upgrades') || '{}'));
      
      const savedSkins = JSON.parse(localStorage.getItem('arcane_unlocked_skins') || '["default"]');
      setUnlockedSkins(savedSkins);
      setEquippedSkin(localStorage.getItem('arcane_equipped_skin') || 'default');
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
      setEquippedSkin(skin.id); // Equip agad pagkabenta
      
      localStorage.setItem('arcane_void_crystals', newCrystals);
      localStorage.setItem('arcane_unlocked_skins', JSON.stringify(newUnlocked));
      localStorage.setItem('arcane_equipped_skin', skin.id);
    }
  };

  if (screen !== 'metashop') return null;

  return (
    <div className="overlay active" style={{ zIndex: 200, position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(3, 1, 17, 0.9)' }}>
      <div className="panel wizard-panel" style={{ width: '650px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="panel-corner pc-tl" />
        <div className="panel-corner pc-tr" />
        <div className="panel-corner pc-bl" />
        <div className="panel-corner pc-br" />

        <div className="section-title" style={{ fontFamily: 'Georgia, serif', color: '#d946ef', textAlign: 'center', fontSize: '1.5rem', textShadow: '0 0 15px rgba(217, 70, 239, 0.6)' }}>
          🌌 THE VOID SANCTUM
        </div>
        
        <div style={{ textAlign: 'center', color: '#fef08a', fontSize: '1.2rem', fontWeight: 'bold', margin: '15px 0', textShadow: '0 0 10px rgba(254, 240, 138, 0.5)' }}>
          💎 Void Crystals: {crystals.toLocaleString()}
        </div>

        <div className="council-tab-headers" style={{ marginBottom: '16px' }}>
          <button 
            className={`council-tab-btn ${activeTab === 'stats' ? 'active' : ''}`} 
            onClick={() => setActiveTab('stats')}
          >
            🔮 Arcane Stats
          </button>
          <button 
            className={`council-tab-btn ${activeTab === 'skins' ? 'active' : ''}`} 
            onClick={() => setActiveTab('skins')}
          >
            🧥 Wardrobe
          </button>
        </div>

        <div className="divider mystic-divider" style={{ margin: '10px 0' }} />

        {/* ================= STATS TAB ================= */}
        {activeTab === 'stats' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {UPGRADES_DB.map(item => {
              const level = upgrades[item.id] || 0;
              const isMax = level >= item.maxLevel;
              const cost = Math.floor(item.baseCost * Math.pow(item.costMult, level));
              const canAfford = crystals >= cost;

              return (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(11, 8, 38, 0.6)', padding: '12px 16px', borderRadius: '6px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ color: isMax ? '#fef08a' : '#fff', fontWeight: 'bold', fontFamily: 'Georgia, serif', fontSize: '1.1rem' }}>
                      {item.name} <span style={{ color: '#a78bfa', fontSize: '0.9rem' }}>[Lv. {level}/{item.maxLevel}]</span>
                    </span>
                    <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontFamily: 'monospace', marginTop: '4px' }}>{item.desc}</span>
                  </div>
                  
                  <button onClick={() => buyUpgrade(item.id)} disabled={isMax || !canAfford}
                    style={{
                      background: isMax ? 'rgba(5, 2, 12, 0.8)' : (canAfford ? 'linear-gradient(180deg, #3b117b 0%, #1e0a45 100%)' : 'rgba(239, 68, 68, 0.1)'),
                      border: `1px solid ${isMax ? '#475569' : (canAfford ? '#a78bfa' : '#ef4444')}`,
                      color: isMax ? '#94a3b8' : (canAfford ? '#fff' : '#f87171'),
                      padding: '8px 16px', borderRadius: '4px', cursor: isMax || !canAfford ? 'not-allowed' : 'pointer',
                      fontFamily: 'monospace', fontWeight: 'bold', boxShadow: canAfford && !isMax ? '0 0 10px rgba(124, 58, 237, 0.4)' : 'none', minWidth: '110px'
                    }}>
                    {isMax ? 'MAXED' : `💎 ${cost}`}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* ================= SKINS TAB WITH PREVIEWS ================= */}
        {activeTab === 'skins' && (
          <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', gap: '12px' }}>
            {SKINS_DB.map(skin => {
              const isUnlocked = unlockedSkins.includes(skin.id);
              const isEquipped = equippedSkin === skin.id;
              const canAfford = crystals >= skin.cost;

              return (
                <div key={skin.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(11, 8, 38, 0.6)', padding: '12px 16px', borderRadius: '6px', border: `1px solid ${isEquipped ? skin.glow : 'rgba(139, 92, 246, 0.3)'}`, boxShadow: isEquipped ? `0 0 15px ${skin.glow}40` : 'none' }}>
                  
                  {/* 🟢 DITO MAKIKITA ANG MINI-AVATAR PREVIEW */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <SkinPreview skin={skin} />
                    
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ color: isEquipped ? skin.glow : '#fff', fontWeight: 'bold', fontFamily: 'Georgia, serif', fontSize: '1.1rem', textShadow: isEquipped ? `0 0 8px ${skin.glow}` : 'none' }}>
                        {skin.name} {isEquipped && '✓'}
                      </span>
                      <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontFamily: 'monospace', marginTop: '4px' }}>{skin.desc}</span>
                    </div>
                  </div>
                  
                  <button onClick={() => buyOrEquipSkin(skin)} disabled={isEquipped || (!isUnlocked && !canAfford)}
                    style={{
                      background: isEquipped ? 'rgba(5, 2, 12, 0.8)' : (isUnlocked ? 'linear-gradient(180deg, #b45309 0%, #78350f 100%)' : (canAfford ? 'linear-gradient(180deg, #3b117b 0%, #1e0a45 100%)' : 'rgba(239, 68, 68, 0.1)')),
                      border: `1px solid ${isEquipped ? '#475569' : (isUnlocked ? '#fef08a' : (canAfford ? '#a78bfa' : '#ef4444'))}`,
                      color: isEquipped ? '#94a3b8' : (isUnlocked ? '#fef08a' : (canAfford ? '#fff' : '#f87171')),
                      padding: '8px 16px', borderRadius: '4px', cursor: isEquipped || (!isUnlocked && !canAfford) ? 'not-allowed' : 'pointer',
                      fontFamily: 'monospace', fontWeight: 'bold', minWidth: '110px'
                    }}>
                    {isEquipped ? 'EQUIPPED' : (isUnlocked ? 'EQUIP' : `💎 ${skin.cost}`)}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="divider mystic-divider" style={{ margin: '20px 0 10px 0' }} />
        
        <button className="btn wizard-btn danger-theme" onClick={() => setScreen('menu')}>
          ← Return to Menu
        </button>
      </div>
    </div>
  );
}