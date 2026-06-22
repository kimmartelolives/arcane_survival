import React, { useState, useEffect, useRef, useCallback } from 'react';
import wandGif from '../assets/wand.gif';

// ─── TRAIL COLORS INILABAS SA LABAS NG COMPONENT ───
// Dati: ginagawa itong bagong array sa bawat mousemove event (libo-libo beses)
// Ngayon: isang beses lang ginagawa, shared sa lahat
const TRAIL_COLORS = ['#ffd700', '#ffffff', '#e5e7eb'];
const SPARK_COLORS = ['#ffd700', '#ffffff', '#fff5a5'];
const MAX_PARTICLES = 50;
const MAX_SPARK_PARTICLES = 60;
const PARTICLE_LIFETIME_MS = 350;
const SPARK_INTERVAL_MS = 80;
const CLEANUP_INTERVAL_MS = 100; // Dati 30ms — sobrang bilis, nagiging bottleneck

// ─── TOUCH DEVICE CHECK ISANG BESES LANG SA LABAS NG COMPONENT ───
// Dati: nasa loob ng useEffect at nag-trigger ng re-render (setIsTouchDevice)
// Ngayon: sinusuri isang beses lang sa load time, walang re-render
const IS_TOUCH_DEVICE = typeof window !== 'undefined'
  ? window.matchMedia('(pointer: coarse)').matches
  : false;

export default function CustomCursor() {
  // ─── POSITION: USEREF HINDI USESTATE ───
  // Dati: setPosition() sa bawat mousemove = re-render ng buong component
  // Ngayon: ref lang, direktang binabago ang DOM via style — zero re-renders
  const positionRef = useRef({ x: 0, y: 0 });
  const wandRef = useRef(null);

  const [particles, setParticles] = useState([]);
  const [isClickable, setIsClickable] = useState(false);

  // ─── MOUSEMOVE: PASSIVE LISTENER + WALANG SETSTATE PARA SA POSITION ───
  useEffect(() => {
    if (IS_TOUCH_DEVICE) return;

    const handleMouseMove = (e) => {
      // I-update ang ref at DOM direkta — hindi na kailangan ng React re-render
      positionRef.current = { x: e.clientX, y: e.clientY };
      if (wandRef.current) {
        wandRef.current.style.left = `${e.clientX}px`;
        wandRef.current.style.top = `${e.clientY}px`;
      }

      // Particles lang ang nagti-trigger ng re-render (kailangan talaga)
      setParticles((prev) => {
        const newParticles = Array.from({ length: 3 }, () => ({
          id: crypto.randomUUID(),
          x: e.clientX + (Math.random() * 20 - 10),
          y: e.clientY + (Math.random() * 20 - 10),
          size: Math.random() * 6 + 2,
          color: TRAIL_COLORS[Math.floor(Math.random() * TRAIL_COLORS.length)],
          createdAt: Date.now(),
          type: 'glitter-particle'
        }));
        // Tinanggal ang redundant dedup filter — crypto.randomUUID() ay guaranteed unique
        return [...prev, ...newParticles].slice(-MAX_PARTICLES);
      });
    };

    const handleMouseOver = (e) => {
      const isOver = !!e.target.closest('button, a, input, [role="button"], .clickable');
      // Dati: palaging nagse-setState kahit hindi nagbago ang value
      // Ngayon: i-update lang kung nagbago talaga
      setIsClickable(prev => prev !== isOver ? isOver : prev);
    };

    // ✅ passive: true — sinasabi sa browser na hindi namin ia-interrupt ang scroll
    // Malaking improvement sa mobile/trackpad smoothness
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseover', handleMouseOver, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseover', handleMouseOver);
    };
  }, []);

  // ─── SPARK LOOP KAPAG NAKA-HOVER SA BUTTON ───
  useEffect(() => {
    if (!isClickable || IS_TOUCH_DEVICE) return;

    const sparkLoop = setInterval(() => {
      const { x, y } = positionRef.current; // Gamit na ref, hindi state
      setParticles((prev) => {
        const loopSparks = Array.from({ length: 3 }, () => ({
          id: crypto.randomUUID(),
          x: x + (Math.random() * 24 - 12),
          y: y + (Math.random() * 24 - 12),
          size: Math.random() * 7 + 4,
          color: SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)],
          createdAt: Date.now(),
          type: 'clickable-spark'
        }));
        // Tinanggal din ang redundant dedup filter dito
        return [...prev, ...loopSparks].slice(-MAX_SPARK_PARTICLES);
      });
    }, SPARK_INTERVAL_MS);

    return () => clearInterval(sparkLoop);
  // ✅ Tinanggal ang `position` sa deps — gumagamit na ng positionRef
  // Dati: nag-re-restart ang interval sa BAWAT galaw ng mouse (libo-libo beses!)
  }, [isClickable]);

  // ─── PARTICLE CLEANUP — BINALAS MULA 30ms → 100ms ───
  // Dati: 30ms = ~33x bawat segundo ang setParticles call
  // Ngayon: 100ms = 10x bawat segundo — sapat pa rin para sa 350ms lifetime
  useEffect(() => {
    if (IS_TOUCH_DEVICE) return;
    const interval = setInterval(() => {
      const now = Date.now();
      setParticles((prev) => {
        const filtered = prev.filter((p) => now - p.createdAt < PARTICLE_LIFETIME_MS);
        // Huwag mag-trigger ng re-render kung walang nagbago
        return filtered.length === prev.length ? prev : filtered;
      });
    }, CLEANUP_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  // ─── HINDI NA KAILANGAN NG ISTATE PARA SA TOUCH DEVICE ───
  // Tinanggal ang setIsTouchDevice re-render — IS_TOUCH_DEVICE constant na
  if (IS_TOUCH_DEVICE) return null;

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
            position: 'fixed',
            pointerEvents: 'none',
            zIndex: 99999999
          }}
        />
      ))}

      {/* ✅ ref idinagdag — position ay direktang ino-update sa DOM, walang re-render */}
      <div
        ref={wandRef}
        className="animated-wand-cursor"
        style={{
          position: 'fixed',
          left: `${positionRef.current.x}px`,
          top: `${positionRef.current.y}px`,
          pointerEvents: 'none',
          zIndex: 100000000,
          background: 'transparent'
        }}
      >
        <img src={wandGif} alt="Wand Cursor" style={{ background: 'transparent' }} />
      </div>
    </>
  );
}