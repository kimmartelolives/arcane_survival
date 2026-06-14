import React, { useState, useEffect } from 'react';
import wandGif from '../assets/wand.gif'; // ⚠️ PALITAN ITO NG .png o .gif PARA WALANG BLACK BACKGROUND

export default function CustomCursor() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [particles, setParticles] = useState([]);
  const [isClickable, setIsClickable] = useState(false);
  
  // ─── 1. DAGDAG: STATE PARA SA MOBILE DETECTION ───
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    // I-check kung touch screen ang device (Mobile/Tablet)
    if (window.matchMedia("(pointer: coarse)").matches) {
      setIsTouchDevice(true);
      return; // Wag nang ituloy ang mouse listeners kung mobile
    }

    const handleMouseMove = (e) => {
      setPosition({ x: e.clientX, y: e.clientY });

      const trailColors = ['#ffd700', '#ffffff', '#e5e7eb'];
      const newParticles = Array.from({ length: 2 }).map(() => ({
        id: Math.random() + Date.now(),
        x: e.clientX + (Math.random() * 16 - 8), 
        y: e.clientY + (Math.random() * 16 - 8),
        size: Math.random() * 5 + 3, 
        color: trailColors[Math.floor(Math.random() * trailColors.length)],
        createdAt: Date.now(),
        type: 'glitter-particle' 
      }));

      setParticles((prev) => [...prev.slice(-50), ...newParticles]);
    };

    const handleMouseOver = (e) => {
      const target = e.target;
      if (target.closest('button, a, input, [role="button"], .clickable')) {
        setIsClickable(true);
      } else {
        setIsClickable(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseover', handleMouseOver);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseover', handleMouseOver);
    };
  }, []);

  useEffect(() => {
    if (!isClickable || isTouchDevice) return;

    const sparkLoop = setInterval(() => {
      const sparksColors = ['#ffd700', '#ffffff', '#fff5a5']; 
      
      const loopSparks = Array.from({ length: 3 }).map(() => ({
        id: Math.random() + Date.now(),
        x: position.x + (Math.random() * 24 - 12), 
        y: position.y + (Math.random() * 24 - 12),
        size: Math.random() * 7 + 4, 
        color: sparksColors[Math.floor(Math.random() * sparksColors.length)],
        createdAt: Date.now(),
        type: 'clickable-spark' 
      }));

      setParticles((prev) => [...prev.slice(-60), ...loopSparks]);
    }, 80); 

    return () => clearInterval(sparkLoop);
  }, [isClickable, position, isTouchDevice]); 

  useEffect(() => {
    if (isTouchDevice) return;
    const interval = setInterval(() => {
      const now = Date.now();
      setParticles((prev) => prev.filter((p) => now - p.createdAt < 350));
    }, 30);

    return () => clearInterval(interval);
  }, [isTouchDevice]);

  // ─── 2. DAGDAG: WAG I-RENDER KUNG MOBILE DEVICE ───
  if (isTouchDevice) {
    return null; 
  }

  return (
    <>
      {particles.map((p) => (
        <div
          key={p.id}
          className={p.type} 
          style={{
            left: `${p.x}px`,
            top: `${p.y}px`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            boxShadow: p.type === 'clickable-spark' 
              ? `0 0 8px #ffffff, 0 0 16px ${p.color}, 0 0 24px ${p.color}` 
              : `0 0 6px ${p.color}, 0 0 12px ${p.color}, 0 0 20px #ffffff`,
            position: 'fixed', // Make sure absolute/fixed positioning is correct
            pointerEvents: 'none',
            zIndex: 9999
          }}
        />
      ))}

      <div 
        className="animated-wand-cursor"
        style={{ 
          position: 'fixed',
          left: `${position.x}px`, 
          top: `${position.y}px`,
          pointerEvents: 'none', // Prevents the image from blocking clicks
          zIndex: 10000,
          background: 'transparent' // Ensures no background color is applied
        }}
      >
        <img src={wandGif} alt="Wand Cursor" style={{ background: 'transparent' }} />
      </div>
    </>
  );
}