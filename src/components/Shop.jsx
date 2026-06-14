import React, { useState, useEffect } from 'react';

export default function Shop({ setScreen }) {
  const [crystals, setCrystals] = useState(0);
  const [upgrades, setUpgrades] = useState({
    vitality: 0, // +25 Base HP per level
    power: 0,    // +5 Base Damage per level
    agility: 0,  // +15 Base Speed per level
  });

  // Load saved data when shop opens
  useEffect(() => {
    const savedCrystals = parseInt(localStorage.getItem('arcane_void_crystals') || '0');
    const savedUpgrades = JSON.parse(localStorage.getItem('arcane_meta_upgrades') || '{}');
    
    setCrystals(savedCrystals);
    setUpgrades({
      vitality: savedUpgrades.vitality || 0,
      power: savedUpgrades.power || 0,
      agility: savedUpgrades.agility || 0,
    });
  }, []);

  const UPGRADE_DATA = {
    vitality: { name: 'VITALITY (HP)', icon: '❤️', baseCost: 50, costMult: 1.5, maxLvl: 10, desc: '+25 Base Max HP per level' },
    power: { name: 'ARCANE POWER', icon: '⚔️', baseCost: 75, costMult: 1.6, maxLvl: 10, desc: '+5 Base Damage per level' },
    agility: { name: 'AGILITY', icon: '👟', baseCost: 60, costMult: 1.4, maxLvl: 10, desc: '+15 Base Movement Speed per level' }
  };

  const getCost = (type, currentLvl) => {
    return Math.floor(UPGRADE_DATA[type].baseCost * Math.pow(UPGRADE_DATA[type].costMult, currentLvl));
  };

  const buyUpgrade = (type) => {
    const currentLvl = upgrades[type];
    const data = UPGRADE_DATA[type];
    
    if (currentLvl >= data.maxLvl) return; // Maxed out
    
    const cost = getCost(type, currentLvl);
    if (crystals >= cost) {
      const newCrystals = crystals - cost;
      const newUpgrades = { ...upgrades, [type]: currentLvl + 1 };
      
      // Update State
      setCrystals(newCrystals);
      setUpgrades(newUpgrades);
      
      // Save to LocalStorage
      localStorage.setItem('arcane_void_crystals', newCrystals.toString());
      localStorage.setItem('arcane_meta_upgrades', JSON.stringify(newUpgrades));
    }
  };

  return (
    <div className="overlay active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(3, 1, 17, 0.9)', zIndex: 1000 }}>
      <div style={{
        background: 'radial-gradient(circle at 50% 15%, #180833 0%, #05020c 100%)',
        border: '2px solid #d946ef',
        boxShadow: '0 0 50px rgba(217, 70, 239, 0.4), inset 0 0 30px rgba(0,0,0,0.9)',
        borderRadius: '12px',
        width: '500px',
        padding: '30px',
        color: '#fff',
        fontFamily: 'Georgia, serif',
        textAlign: 'center'
      }}>
        <h2 style={{ color: '#ffe6a3', fontSize: '1.8rem', margin: '0 0 10px 0', textShadow: '0 0 10px rgba(255, 230, 163, 0.5)' }}>🌌 VOID SANCTUM SHOP</h2>
        <p style={{ color: '#cbd5e1', fontSize: '0.9rem', marginBottom: '20px', fontFamily: 'monospace' }}>
          Enhance your base stats permanently using Void Crystals harvested from Bosses.
        </p>

        <div style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid #c084fc', padding: '10px', borderRadius: '8px', marginBottom: '20px', fontSize: '1.2rem' }}>
          Void Crystals: <span style={{ color: '#d946ef', fontWeight: 'bold', textShadow: '0 0 8px #d946ef' }}>💎 {crystals}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '25px' }}>
          {Object.keys(UPGRADE_DATA).map(key => {
            const data = UPGRADE_DATA[key];
            const lvl = upgrades[key];
            const cost = getCost(key, lvl);
            const isMax = lvl >= data.maxLvl;
            const canAfford = crystals >= cost;

            return (
              <div key={key} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(167, 139, 250, 0.3)',
                padding: '12px 16px', borderRadius: '6px'
              }}>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 'bold', color: '#fef08a', fontSize: '1.1rem' }}>
                    {data.icon} {data.name} <span style={{ fontSize: '0.8rem', color: '#a78bfa' }}>(Lv. {lvl}/{data.maxLvl})</span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace', marginTop: '4px' }}>{data.desc}</div>
                </div>
                
                <button 
                  onClick={() => buyUpgrade(key)}
                  disabled={isMax || !canAfford}
                  style={{
                    background: isMax ? '#111827' : (canAfford ? 'linear-gradient(180deg, #4c1d95 0%, #2e1065 100%)' : '#374151'),
                    border: `1px solid ${isMax ? '#4b5563' : (canAfford ? '#a78bfa' : '#6b7280')}`,
                    color: isMax ? '#9ca3af' : (canAfford ? '#fff' : '#9ca3af'),
                    padding: '8px 16px', borderRadius: '4px', cursor: (isMax || !canAfford) ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold', fontFamily: 'monospace'
                  }}
                >
                  {isMax ? 'MAXED' : `💎 ${cost}`}
                </button>
              </div>
            );
          })}
        </div>

        <button 
          onClick={() => setScreen('menu')}
          style={{
            background: 'linear-gradient(180deg, #320a11 0%, #170206 100%)',
            border: '1px solid #ef4444', color: '#fca5a5',
            padding: '10px 24px', borderRadius: '4px', cursor: 'pointer',
            fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px', width: '100%'
          }}
        >
          ← Return to Menu
        </button>
      </div>
    </div>
  );
}