import React, { useState, useEffect } from 'react';
import wandGif from '../assets/wand.gif'; 

export default function CustomCursor() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [particles, setParticles] = useState([]);
  
  // ─── 1. DAGDAG: STATE PARA SA CLICKABLE DETECTION ───
  const [isClickable, setIsClickable] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setPosition({ x: e.clientX, y: e.clientY });

      // Regular Trail (Gold, Silver, White) habang gumagalaw ang mouse
      const trailColors = ['#ffd700', '#ffffff', '#e5e7eb'];
      const newParticles = Array.from({ length: 2 }).map(() => ({
        id: Math.random() + Date.now(),
        x: e.clientX + (Math.random() * 16 - 8), 
        y: e.clientY + (Math.random() * 16 - 8),
        size: Math.random() * 5 + 3, 
        color: trailColors[Math.floor(Math.random() * trailColors.length)],
        createdAt: Date.now(),
        type: 'glitter-particle' // Regular styling
      }));

      setParticles((prev) => [...prev.slice(-50), ...newParticles]);
    };

    // ─── 2. DAGDAG: EVENT LISTENER PARA SA HOVER SA BUTTONS ───
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

  // ─── 3. DAGDAG: LOOP TIMER PARA SA SPARKLES KAPAG STATIONARY O NAKATUTOK LANG ───
  useEffect(() => {
    if (!isClickable) return;

    // Magpapakawala ng sparks bawat 80ms kahit hindi gumagalaw ang mouse
    const sparkLoop = setInterval(() => {
      const sparksColors = ['#ffd700', '#ffffff', '#fff5a5']; // Gold at White lang
      
      const loopSparks = Array.from({ length: 3 }).map(() => ({
        id: Math.random() + Date.now(),
        x: position.x + (Math.random() * 24 - 12), // Mas malawak na sabog ng kislap
        y: position.y + (Math.random() * 24 - 12),
        size: Math.random() * 7 + 4, // Mas malalaking sparks
        color: sparksColors[Math.floor(Math.random() * sparksColors.length)],
        createdAt: Date.now(),
        type: 'clickable-spark' // Clickable styling
      }));

      setParticles((prev) => [...prev.slice(-60), ...loopSparks]);
    }, 80); // Bilis ng loop (80ms). Pwedeng liitan kung gusto mo mas siksik pa ang sparks.

    return () => clearInterval(sparkLoop);
  }, [isClickable, position]); // Tatakbo kapag naka-hover o kapag nagbago ang pwesto ng mouse

  // Timer para sa kusang pagbura ng mga lumang kislap (pampaluwag ng memory)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setParticles((prev) => prev.filter((p) => now - p.createdAt < 350));
    }, 30);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Dynamic Gold, Silver, & Spark Particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className={p.type} // Awtomatikong magpapalit ng class base sa type nito
          style={{
            left: `${p.x}px`,
            top: `${p.y}px`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            // Mas matinding glow-effect para sa clickable sparks
            boxShadow: p.type === 'clickable-spark' 
              ? `0 0 8px #ffffff, 0 0 16px ${p.color}, 0 0 24px ${p.color}` 
              : `0 0 6px ${p.color}, 0 0 12px ${p.color}, 0 0 20px #ffffff`
          }}
        />
      ))}

      {/* Ang orihinal mong Wand Cursor */}
      <div 
        className="animated-wand-cursor"
        style={{ 
          left: `${position.x}px`, 
          top: `${position.y}px` 
        }}
      >
        <img src={wandGif} alt="Wand Cursor" />
      </div>
    </>
  );
}