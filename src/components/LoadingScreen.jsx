import React, { useEffect, useRef, useState } from 'react';

// ============================================================================
// 🔮 LOADING SCREEN — "The Rite of Entry" (Redesigned)
// Ultra-premium RPG loading overlay inspired by Frieren, Arcane, Wizardry.
// Ancient runes, layered sigils, star field, celestial rings, atmospheric fog.
// Fully responsive — desktop + mobile.
// ============================================================================

const RUNE_POOL = [
  'ᚠ','ᚢ','ᚦ','ᚨ','ᚱ','ᚲ','ᚷ','ᚹ','ᚺ','ᚾ','ᛁ','ᛃ','ᛇ','ᛈ','ᛉ','ᛊ','ᛏ','ᛒ','ᛖ','ᛗ','ᛚ','ᛜ','ᛟ','ᛞ',
  'ᚻ','ᚼ','ᚽ','ᚾ','ᚿ','ᛀ','ᛄ','ᛅ','ᛆ','ᛋ','ᛌ','ᛍ','ᛎ','ᛑ','ᛓ','ᛔ','ᛕ',
];

const ANCIENT_GLYPHS = ['𐤀','𐤁','𐤂','𐤃','𐤄','𐤅','𐤆','𐤇','𐤈','𐤉','𐤊','𐤋','𐤌','𐤍','𐤎'];

const SIGIL_SYMBOLS = ['⋆','✦','✧','⊕','⊗','⊙','◈','◉','◎','◇','◆','△','▲','⬡','⬢','⬟'];

const SOLO_LINES = [
  'ATTUNING TO THE VOID',
  'WEAVING THE ARCANE THREADS',
  'CALIBRATING THE BATTLE WARDS',
  'AWAKENING DORMANT RUNES',
  'BINDING THE SIGIL ARRAY',
  'SEALING THE ARENA',
];

const COOP_LINES = [
  'BINDING THE TWO FATES',
  'SYNCHRONIZING THE PACT',
  'WEAVING THE ARCANE THREADS',
  'AWAKENING DORMANT RUNES',
  'MERGING THE SOUL MATRICES',
  'SEALING THE ARENA',
];

const TIPS_SOLO = [
  'A well-timed Dash can carry you clean through a closing swarm.',
  'Elite Tanks hit hard but move slow — kite them in wide circles.',
  'Stack Multi-Shot upgrades to melt Mini-Bosses faster.',
  'Void Crystals carry over between runs — spend them with intent.',
  'Fast minions punish standing still. Keep drifting.',
  'The ancient seals were not meant to be broken lightly.',
];

const TIPS_COOP = [
  'Stay near your ally — Arcane Resurrection can still save them.',
  'Split up to cover ground, but regroup before a Mini-Boss surfaces.',
  'Time your Dashes together to slip out of an encirclement as one.',
  'A downed ally is not a lost ally. Don\'t give up on them.',
  'Void Crystals are shared glory — loot fast, loot together.',
  'Arcane Resurrection saves a fallen ally, but burns away a Level. Use it with care.',
];

const ANCIENT_INCANTATIONS = [
  'ᚠᚢᚦᚨᚱᚲ • ᚷᚹᚺᚾ • ᛁᛃᛇᛈᛉᛊ',
  'ᛏᛒᛖᛗᛚᛜ • ᛟᛞᚠᚢ • ᚦᚨᚱᚲᚷᚹ',
  'ᚺᚾᛁᛃᛇ • ᛈᛉᛊᛏᛒ • ᛖᛗᛚᛜᛟᛞ',
];

function pick(n, pool = RUNE_POOL) {
  return Array.from({ length: n }, () => pool[Math.floor(Math.random() * pool.length)]);
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

export default function LoadingScreen({ duration = 6000, isCoop = false, onComplete }) {
  const [progress, setProgress] = useState(0);
  const [lineIndex, setLineIndex] = useState(0);
  const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * 6));
  const [incantIndex, setIncantIndex] = useState(0);
  const [corePhase, setCorePhase] = useState(0);
  const completedRef = useRef(false);

  const ringRunesOuter  = useRef(pick(24)).current;
  const ringRunesMid    = useRef(pick(16)).current;
  const ringRunesInner  = useRef(pick(8)).current;
  const ancientGlyphs   = useRef(pick(6, ANCIENT_GLYPHS)).current;
  const sigilSymbols    = useRef(pick(6, SIGIL_SYMBOLS)).current;

  const stars = useRef(
    Array.from({ length: 60 }, () => ({
      left: randomBetween(0, 100),
      top: randomBetween(0, 60),
      size: randomBetween(1, 2.5),
      delay: randomBetween(0, 8),
      dur: randomBetween(3, 8),
    }))
  ).current;

  const motes = useRef(
    Array.from({ length: 22 }, () => ({
      left: randomBetween(0, 100),
      top: randomBetween(5, 75),
      delay: randomBetween(0, 8),
      dur: randomBetween(7, 14),
      size: randomBetween(2, 4.5),
      color: Math.random() > 0.6 ? '#fbbf24' : Math.random() > 0.5 ? '#c4bfff' : '#a78bfa',
    }))
  ).current;

  const ashParticles = useRef(
    Array.from({ length: 18 }, () => ({
      left: randomBetween(0, 100),
      delay: randomBetween(0, 7),
      dur: randomBetween(10, 18),
      size: randomBetween(3, 9),
      drift: (Math.random() - 0.5) * 100,
      rot: randomBetween(0, 360),
      isRune: Math.random() > 0.55,
      rune: RUNE_POOL[Math.floor(Math.random() * RUNE_POOL.length)],
    }))
  ).current;

  const floatingRunes = useRef(
    Array.from({ length: 14 }, () => ({
      ch: RUNE_POOL[Math.floor(Math.random() * RUNE_POOL.length)],
      left: randomBetween(2, 98),
      delay: randomBetween(0, 6),
      dur: randomBetween(9, 16),
      size: randomBetween(10, 20),
      drift: (Math.random() - 0.5) * 40,
    }))
  ).current;

  const fogLayers = useRef(
    Array.from({ length: 4 }, (_, i) => ({
      opacity: 0.04 + i * 0.02,
      dur: 25 + i * 12,
      offset: randomBetween(-20, 20),
    }))
  ).current;

  const lines = isCoop ? COOP_LINES : SOLO_LINES;
  const tips  = isCoop ? TIPS_COOP  : TIPS_SOLO;

  useEffect(() => {
    const start = performance.now();
    completedRef.current = false;

    const progressTimer = setInterval(() => {
      const pct = Math.min(100, ((performance.now() - start) / duration) * 100);
      setProgress(pct);
      setCorePhase(Math.floor(pct / 25));
      if (pct >= 100 && !completedRef.current) {
        completedRef.current = true;
        clearInterval(progressTimer);
        if (onComplete) onComplete();
      }
    }, 40);

    const lineTimer = setInterval(
      () => setLineIndex((i) => (i + 1) % lines.length),
      Math.max(700, Math.floor(duration / lines.length))
    );

    const tipTimer = setInterval(
      () => setTipIndex((i) => (i + 1) % tips.length),
      2800
    );

    const incantTimer = setInterval(
      () => setIncantIndex((i) => (i + 1) % ANCIENT_INCANTATIONS.length),
      3200
    );

    return () => {
      clearInterval(progressTimer);
      clearInterval(lineTimer);
      clearInterval(tipTimer);
      clearInterval(incantTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration, isCoop]);

  const coreColors = ['#7F77DD','#a78bfa','#fbbf24','#f59e0b'];
  const coreColor  = coreColors[corePhase] || '#7F77DD';

  return (
    <div className="ls-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Cinzel+Decorative:wght@400;700&display=swap');

        .ls-root {
          position: absolute;
          inset: 0;
          z-index: 500;
          overflow: hidden;
          font-family: 'Cinzel', 'Palatino Linotype', Georgia, serif;
          background: #04020e;
        }

        /* ── CONTENT WRAPPER ─── */
        .ls-content {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: ls-fadein 0.6s ease-out;
        }
        @keyframes ls-fadein { from { opacity:0 } to { opacity:1 } }

        /* ── DEEP SKY ─── */
        .ls-sky {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 80% 60% at 50% 0%, rgba(120,90,220,0.18) 0%, transparent 60%),
            radial-gradient(ellipse 50% 35% at 50% 14%, rgba(255,200,80,0.07) 0%, transparent 55%),
            linear-gradient(180deg,
              #08052a 0%,
              #0c0730 12%,
              #0a051e 30%,
              #070415 55%,
              #050210 78%,
              #030108 100%
            );
        }

        /* ── NEBULA WISPS ─── */
        .ls-nebula {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 55% 22% at 20% 20%, rgba(100,60,200,0.12) 0%, transparent 70%),
            radial-gradient(ellipse 40% 18% at 80% 30%, rgba(60,120,200,0.10) 0%, transparent 70%),
            radial-gradient(ellipse 45% 15% at 60% 10%, rgba(180,80,220,0.08) 0%, transparent 70%);
          animation: ls-nebula-drift 30s ease-in-out infinite alternate;
        }
        @keyframes ls-nebula-drift {
          0%   { opacity:0.7; transform:scale(1) translate(0,0); }
          100% { opacity:1;   transform:scale(1.04) translate(1%,0.5%); }
        }

        /* ── STARS ─── */
        .ls-star {
          position: absolute;
          border-radius: 50%;
          background: #fff;
          animation-name: ls-star-twinkle;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }
        @keyframes ls-star-twinkle {
          0%,100% { opacity:0.15; transform:scale(0.8); }
          50%     { opacity:1;    transform:scale(1.2); }
        }

        /* ── MOON ─── */
        .ls-moon {
          position: absolute;
          top: 8%;
          left: 50%;
          width: 90px;
          height: 90px;
          margin-left: -45px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 32%, #fffef5 0%, #f5e8b8 30%, #d4b870 65%, #a07840 88%, transparent 100%);
          box-shadow:
            0 0 40px 14px rgba(220,190,100,0.22),
            0 0 90px 40px rgba(140,110,200,0.14),
            0 0 180px 80px rgba(80,60,150,0.08);
          animation: ls-moon-pulse 9s ease-in-out infinite;
        }
        .ls-moon::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: radial-gradient(circle at 68% 65%, rgba(0,0,0,0.18) 0%, transparent 55%);
        }
        @keyframes ls-moon-pulse {
          0%,100% { opacity:0.82; box-shadow: 0 0 40px 14px rgba(220,190,100,0.22), 0 0 90px 40px rgba(140,110,200,0.14), 0 0 180px 80px rgba(80,60,150,0.08); }
          50%     { opacity:1;    box-shadow: 0 0 55px 22px rgba(220,190,100,0.30), 0 0 120px 55px rgba(140,110,200,0.20), 0 0 220px 100px rgba(80,60,150,0.12); }
        }

        /* ── MOON HALO RINGS ─── */
        .ls-moon-halo {
          position: absolute;
          top: 8%;
          left: 50%;
          border-radius: 50%;
          border: 1px solid rgba(200,180,120,0.12);
          transform: translate(-50%, 0);
          animation: ls-halo-pulse 9s ease-in-out infinite;
        }
        .ls-moon-halo-1 { width:130px; height:130px; margin-top:-20px; }
        .ls-moon-halo-2 { width:190px; height:190px; margin-top:-50px; border-color: rgba(140,110,200,0.08); }
        @keyframes ls-halo-pulse {
          0%,100% { opacity:0.4; }
          50%     { opacity:0.9; }
        }

        /* ── GODRAYS ─── */
        .ls-godrays {
          position: absolute;
          top: -5%;
          left: 50%;
          width: 1000px;
          height: 1000px;
          margin-left: -500px;
          background: conic-gradient(
            from 0deg at 50% 10%,
            transparent 0deg,  rgba(200,180,255,0.04) 4deg,  transparent 10deg,
            transparent 22deg, rgba(200,180,255,0.035) 27deg, transparent 34deg,
            transparent 50deg, rgba(200,180,255,0.04) 56deg, transparent 63deg,
            transparent 80deg, rgba(200,180,255,0.03) 86deg, transparent 94deg,
            transparent 118deg, rgba(200,180,255,0.035) 124deg, transparent 132deg
          );
          animation: ls-rays-spin 140s linear infinite;
          mix-blend-mode: screen;
          pointer-events: none;
        }
        @keyframes ls-rays-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        /* ── FOG LAYERS ─── */
        .ls-fog {
          position: absolute;
          bottom: 0;
          left: -20%;
          width: 140%;
          height: 45%;
          border-radius: 50% 50% 0 0;
          background: radial-gradient(ellipse 80% 100% at 50% 100%,
            rgba(40,20,80,0.35) 0%,
            rgba(20,10,40,0.20) 40%,
            transparent 70%
          );
          animation-name: ls-fog-drift;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
          animation-direction: alternate;
        }
        @keyframes ls-fog-drift {
          from { transform: translateX(-2%) scaleX(0.98); }
          to   { transform: translateX(2%) scaleX(1.02); }
        }

        /* ── MOUNTAIN SILHOUETTES ─── */
        .ls-ridge {
          position: absolute;
          bottom: 0;
          left: -5%;
          width: 110%;
          height: auto;
          pointer-events: none;
        }
        .ls-ridge-far  { bottom:12%; opacity:0.30; animation: ls-drift-far 80s linear infinite; }
        .ls-ridge-mid  { bottom:6%;  opacity:0.50; animation: ls-drift-mid 60s linear infinite reverse; }
        .ls-ridge-near { bottom:0;   opacity:0.80; }
        @keyframes ls-drift-far { from { transform:translateX(0) } to { transform:translateX(-3%) } }
        @keyframes ls-drift-mid { from { transform:translateX(0) } to { transform:translateX(-5%) } }

        /* ── ANCIENT PILLARS ─── */
        .ls-pillar {
          position: absolute;
          bottom: 0;
          opacity: 0.88;
        }
        .ls-pillar-l { left: 3%;  }
        .ls-pillar-r { right: 3%; transform: scaleX(-1); }

        /* ── VIGNETTE ─── */
        .ls-vignette {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse 90% 90% at 50% 50%, transparent 30%, rgba(0,0,0,0.88) 100%);
          pointer-events: none;
        }

        /* ── ORNAMENTAL FRAME ─── */
        .ls-frame {
          position: absolute;
          inset: 16px;
          border: 1px solid rgba(170,155,255,0.18);
          pointer-events: none;
        }
        .ls-frame::before {
          content: '';
          position: absolute;
          inset: 4px;
          border: 1px solid rgba(251,191,36,0.06);
        }

        /* ── FRAME CORNERS ─── */
        .ls-corner {
          position: absolute;
          width: 42px;
          height: 42px;
        }
        .ls-corner-tl { top:24px;    left:24px;  }
        .ls-corner-tr { top:24px;    right:24px;  transform:scaleX(-1); }
        .ls-corner-bl { bottom:24px; left:24px;   transform:scaleY(-1); }
        .ls-corner-br { bottom:24px; right:24px;  transform:scale(-1,-1); }

        /* ── ANCIENT TEXT STRIP ─── */
        .ls-ancient-strip {
          position: absolute;
          top: 28px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 11px;
          letter-spacing: 0.35em;
          color: rgba(167,139,250,0.45);
          text-shadow: 0 0 8px rgba(127,119,221,0.6);
          white-space: nowrap;
          animation: ls-ancient-fade 3.2s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes ls-ancient-fade {
          0%,100% { opacity:0.35; }
          50%     { opacity:0.75; }
        }

        .ls-ancient-strip-bottom {
          position: absolute;
          bottom: 28px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 10px;
          letter-spacing: 0.3em;
          color: rgba(251,191,36,0.30);
          text-shadow: 0 0 6px rgba(251,191,36,0.4);
          white-space: nowrap;
          animation: ls-ancient-fade 4s ease-in-out infinite;
          pointer-events: none;
        }

        /* ── AMBIENT PARTICLES ─── */
        .ls-layer { position:absolute; inset:0; pointer-events:none; }

        .ls-mote {
          position: absolute;
          border-radius: 50%;
          opacity: 0;
          animation-name: ls-mote-drift;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }
        @keyframes ls-mote-drift {
          0%   { opacity:0; transform:translate(0,0) scale(0.5); }
          15%  { opacity:0.95; }
          50%  { transform:translate(12px,-28px) scale(1.1); }
          85%  { opacity:0.65; }
          100% { opacity:0; transform:translate(-8px,-64px) scale(0.4); }
        }

        .ls-ash {
          position: absolute;
          top: -8%;
          border-radius: 1px;
          opacity: 0;
          animation-name: ls-ash-fall;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        @keyframes ls-ash-fall {
          0%   { opacity:0;   transform: translate(0,0) rotate(0deg); }
          8%   { opacity:0.6; }
          90%  { opacity:0.3; }
          100% { opacity:0;   transform: translate(var(--drift,30px), 115vh) rotate(260deg); }
        }

        .ls-floater {
          position: absolute;
          bottom: -5%;
          opacity: 0;
          color: #9d8ff5;
          text-shadow: 0 0 10px rgba(127,119,221,0.9);
          animation-name: ls-float-up;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }
        @keyframes ls-float-up {
          0%   { transform:translateY(0) translateX(0) rotate(0deg);              opacity:0; }
          10%  { opacity:0.65; }
          88%  { opacity:0.4; }
          100% { transform:translateY(-82vh) translateX(var(--drift,0px)) rotate(30deg); opacity:0; }
        }

        /* ── CENTRAL SUMMONING CIRCLE ─── */
        .ls-center {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 30px 24px;
          margin-top: 1vh;
        }

        .ls-circle-wrap {
          position: relative;
          width: 260px;
          height: 260px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Triangle SVG layers */
        .ls-ring {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }
        .ls-ring-1 { animation: ls-spin     22s linear infinite; }
        .ls-ring-2 { animation: ls-spin-rev 16s linear infinite; }
        .ls-ring-3 { animation: ls-spin     9s  linear infinite; }
        .ls-ring-4 { animation: ls-pulse-ring 2.8s ease-in-out infinite; }

        @keyframes ls-spin     { from { transform:rotate(0deg)   } to { transform:rotate(360deg)  } }
        @keyframes ls-spin-rev { from { transform:rotate(0deg)   } to { transform:rotate(-360deg) } }
        @keyframes ls-pulse-ring {
          0%,100% { opacity:0.45; transform:scale(0.96); }
          50%     { opacity:0.90; transform:scale(1.04); }
        }

        /* Rune rings */
        .ls-rune-ring-outer {
          position:absolute; inset:0;
          animation: ls-spin 50s linear infinite;
        }
        .ls-rune-ring-mid {
          position:absolute; inset:0;
          animation: ls-spin-rev 32s linear infinite;
        }
        .ls-rune-ring-inner {
          position:absolute; inset:0;
          animation: ls-spin 18s linear infinite;
        }

        .ls-rune {
          position:absolute;
          top:50%; left:50%;
          width:18px; height:18px;
          margin:-9px;
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:13px;
          color:#c4bfff;
          text-shadow: 0 0 7px rgba(175,169,236,0.95);
          animation: ls-flicker 2.8s ease-in-out infinite;
        }
        .ls-rune-mid {
          font-size:11px;
          color:#a78bfa;
          text-shadow: 0 0 6px rgba(167,139,250,0.9);
          animation: ls-flicker 3.5s ease-in-out infinite;
        }
        .ls-rune-inner {
          font-size:10px;
          color:#fbbf24;
          text-shadow: 0 0 8px rgba(251,191,36,0.95);
          animation: ls-flicker-gold 2.1s ease-in-out infinite;
        }
        @keyframes ls-flicker {
          0%,100% { opacity:0.25; }
          50%     { opacity:1; }
        }
        @keyframes ls-flicker-gold {
          0%,100% { opacity:0.3; }
          30%     { opacity:0.6; }
          60%     { opacity:1; }
        }

        /* Sigil core */
        .ls-sigil-core {
          position:absolute;
          width:36px; height:36px;
          display:flex;
          align-items:center;
          justify-content:center;
          animation: ls-core-pulse 1.8s ease-in-out infinite;
        }
        .ls-sigil-dot {
          width:10px; height:10px;
          border-radius:50%;
          background: #fbbf24;
          box-shadow: 0 0 18px 8px rgba(251,191,36,0.85), 0 0 40px 18px rgba(251,191,36,0.3);
          transition: background 1s ease, box-shadow 1s ease;
        }
        @keyframes ls-core-pulse {
          0%,100% { transform:scale(0.85); }
          50%     { transform:scale(1.15); }
        }

        /* ── TITLE ─── */
        .ls-title {
          margin: 0;
          font-family: 'Cinzel Decorative', 'Cinzel', Georgia, serif;
          font-size: 1.75rem;
          font-weight: 700;
          letter-spacing: 0.22em;
          text-align: center;
          background: linear-gradient(110deg,
            #c4bfff 0%,
            #fdf6e3 22%,
            #fbbf24 42%,
            #fdf6e3 60%,
            #d4b8ff 80%,
            #c4bfff 100%
          );
          background-size: 300% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: ls-shimmer 6s linear infinite;
          filter: drop-shadow(0 0 14px rgba(127,119,221,0.60));
        }
        @keyframes ls-shimmer {
          from { background-position:0% 0; }
          to   { background-position:-300% 0; }
        }

        /* ── GLYPH ROW ─── */
        .ls-glyphs {
          display: flex;
          gap: 14px;
          align-items: center;
          opacity: 0.55;
          font-size: 16px;
          color: #fbbf24;
          text-shadow: 0 0 8px rgba(251,191,36,0.8);
          animation: ls-glyph-fade 4s ease-in-out infinite;
        }
        @keyframes ls-glyph-fade {
          0%,100% { opacity:0.35; }
          50%     { opacity:0.7; }
        }
        .ls-glyph-divider {
          width: 24px;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(251,191,36,0.4), transparent);
        }

        /* ── SUBTITLE ─── */
        .ls-subtitle-wrap {
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .ls-subtitle {
          margin: 0;
          font-size: 0.70rem;
          letter-spacing: 0.22em;
          color: #a79fe0;
          animation: ls-line-in 0.6s ease-out;
        }
        @keyframes ls-line-in {
          from { opacity:0; transform:translateY(5px); letter-spacing:0.45em; }
          to   { opacity:1; transform:translateY(0);   letter-spacing:0.22em; }
        }

        /* ── PROGRESS BAR ─── */
        .ls-bar-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 7px;
        }

        .ls-bar-header {
          display: flex;
          width: 320px;
          justify-content: space-between;
          align-items: center;
          padding: 0 2px;
        }
        .ls-bar-ticks {
          display: flex;
          justify-content: space-between;
          width: 320px;
          padding: 0 1px;
        }
        .ls-bar-ticks span {
          font-size: 7px;
          color: #534AB7;
          opacity: 0.65;
        }

        .ls-bar-track {
          position: relative;
          width: 320px;
          height: 7px;
          border-radius: 4px;
          background: rgba(83,74,183,0.14);
          border: 1px solid rgba(127,119,221,0.38);
          overflow: hidden;
        }
        .ls-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #534AB7 0%, #7F77DD 45%, #a78bfa 75%, #fbbf24 100%);
          box-shadow: 0 0 12px rgba(127,119,221,0.90);
          border-radius: 3px;
          position: relative;
          transition: width 0.12s linear;
        }
        .ls-bar-fill::after {
          content:'';
          position:absolute;
          inset:0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.60), transparent);
          width: 45px;
          animation: ls-sweep 1.8s ease-in-out infinite;
        }
        @keyframes ls-sweep {
          0%   { transform:translateX(-45px); }
          100% { transform:translateX(360px); }
        }

        .ls-bar-meta {
          display: flex;
          align-items: center;
          gap: 9px;
          font-size: 0.66rem;
          letter-spacing: 0.14em;
          color: #8c84c9;
        }
        .ls-bar-pct {
          font-size: 0.72rem;
          color: #c4bfff;
          font-weight: 600;
          letter-spacing: 0.05em;
        }
        .ls-spinner {
          display: inline-block;
          animation: ls-spin 2.2s linear infinite;
          color: #AFA9EC;
          font-size: 0.8rem;
        }

        /* ── SIGIL ORNAMENTS FLANKING BAR ─── */
        .ls-sigil-row {
          display:flex;
          align-items:center;
          gap:10px;
          margin-top: -2px;
          opacity: 0.45;
          font-size:13px;
          color:#7F77DD;
          text-shadow: 0 0 6px rgba(127,119,221,0.7);
          letter-spacing: 0.25em;
          animation: ls-flicker 4s ease-in-out infinite;
        }

        /* ── TIP BOX ─── */
        .ls-tip-box {
          position: absolute;
          left: 50%;
          bottom: 6%;
          transform: translateX(-50%);
          width: min(88%, 580px);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 7px;
        }
        .ls-tip-rule {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
        }
        .ls-tip-line {
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(127,119,221,0.5));
        }
        .ls-tip-line-r { background: linear-gradient(90deg, rgba(127,119,221,0.5), transparent); }
        .ls-tip-label {
          font-size: 0.60rem;
          letter-spacing: 0.36em;
          color: #fbbf24;
          text-shadow: 0 0 8px rgba(251,191,36,0.6);
          white-space: nowrap;
        }
        .ls-tip-text {
          margin:0;
          text-align:center;
          font-family: 'Trebuchet MS', sans-serif;
          font-size: 0.82rem;
          line-height: 1.55;
          color: #c9c3f7;
          min-height: 2.8em;
          animation: ls-tip-in 0.7s ease-out;
        }
        @keyframes ls-tip-in {
          from { opacity:0; transform:translateY(6px); }
          to   { opacity:1; transform:translateY(0); }
        }

        /* ── DESKTOP EXTRAS ─── */
        .ls-left-panel, .ls-right-panel {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          flex-direction: column;
          gap: 18px;
          align-items: center;
        }
        .ls-left-panel  { left: 5%;  }
        .ls-right-panel { right: 5%; }

        .ls-panel-rune {
          font-size: 18px;
          color: #534AB7;
          text-shadow: 0 0 10px rgba(83,74,183,0.8);
          animation: ls-flicker 3s ease-in-out infinite;
          line-height: 1;
        }
        .ls-panel-line {
          width: 1px;
          height: 60px;
          background: linear-gradient(180deg, transparent, rgba(127,119,221,0.5), transparent);
        }

        /* ── MOBILE ─── */
        @media (max-width: 640px) {
          .ls-circle-wrap { width:200px; height:200px; }
          .ls-title { font-size:1.15rem; letter-spacing:0.16em; }
          .ls-bar-track, .ls-bar-ticks, .ls-bar-header { width:240px; }
          .ls-moon { width:62px; height:62px; margin-left:-31px; top:6%; }
          .ls-moon-halo-1 { width:96px;  height:96px;  margin-top:-17px; }
          .ls-moon-halo-2 { width:148px; height:148px; margin-top:-43px; }
          .ls-tip-box { bottom:4%; }
          .ls-tip-text { font-size:0.76rem; }
          .ls-ancient-strip { font-size:9px; top:20px; }
          .ls-left-panel, .ls-right-panel { display:none; }
          .ls-pillar { display:none; }
          .ls-glyphs { font-size:13px; gap:10px; }
        }
        @media (min-width: 641px) and (max-width: 900px) {
          .ls-left-panel, .ls-right-panel { display:none; }
        }
      `}</style>

      <div className="ls-content">

        {/* ── SKY + ATMOSPHERE ── */}
        <div className="ls-sky" />
        <div className="ls-nebula" />
        <div className="ls-godrays" />

        {/* ── STARS ── */}
        <div className="ls-layer">
          {stars.map((s, i) => (
            <span key={'s'+i} className="ls-star" style={{
              left: s.left+'%', top: s.top+'%',
              width: s.size+'px', height: s.size+'px',
              animationDelay: s.delay+'s', animationDuration: s.dur+'s',
              boxShadow: `0 0 ${s.size*2}px ${s.size}px rgba(255,255,255,0.6)`,
            }} />
          ))}
        </div>

        {/* ── MOON ── */}
        <div className="ls-moon" />
        <div className="ls-moon-halo ls-moon-halo-1" />
        <div className="ls-moon-halo ls-moon-halo-2" />

        {/* ── FOG LAYERS ── */}
        {fogLayers.map((f, i) => (
          <div key={'fog'+i} className="ls-fog" style={{
            opacity: f.opacity,
            animationDuration: f.dur+'s',
            animationDelay: (i*5)+'s',
          }} />
        ))}

        {/* ── MOUNTAIN RIDGES ── */}
        <svg className="ls-ridge ls-ridge-far" viewBox="0 0 1000 160" preserveAspectRatio="none">
          <polygon points="0,160 0,120 70,95 140,115 210,80 290,110 370,65 450,100 530,78 610,105 690,60 770,95 850,70 930,100 1000,85 1000,160"
            fill="#130d35" />
        </svg>
        <svg className="ls-ridge ls-ridge-mid" viewBox="0 0 1000 160" preserveAspectRatio="none">
          <polygon points="0,160 0,118 55,95 110,118 175,72 240,108 310,58 380,100 455,78 530,105 610,55 680,92 755,62 820,98 890,70 950,100 1000,82 1000,160"
            fill="#0d0826" />
        </svg>
        <svg className="ls-ridge ls-ridge-near" viewBox="0 0 1000 140" preserveAspectRatio="none">
          <polygon points="0,140 0,105 50,82 60,105 110,62 125,105 195,48 215,105 285,78 315,105 395,55 420,105 505,82 580,46 600,105 685,68 740,105 820,58 845,105 925,76 1000,98 1000,140"
            fill="#080519" />
          {/* Ruined castle silhouette */}
          <rect x="300" y="32" width="8" height="50" fill="#080519" />
          <rect x="295" y="28" width="18" height="8" fill="#080519" />
          <rect x="296" y="20" width="4" height="12" fill="#080519" />
          <rect x="304" y="20" width="4" height="10" fill="#080519" />
          <rect x="315" y="36" width="6" height="46" fill="#080519" />
          <rect x="313" y="30" width="10" height="8" fill="#080519" />
          {/* Tower on right */}
          <rect x="660" y="28" width="10" height="42" fill="#080519" />
          <rect x="658" y="24" width="14" height="6" fill="#080519" />
          <rect x="659" y="16" width="4" height="12" fill="#080519" />
          <rect x="667" y="16" width="4" height="10" fill="#080519" />
        </svg>

        {/* ── PILLARS ── */}
        <svg className="ls-pillar ls-pillar-l" viewBox="0 0 48 260" preserveAspectRatio="none" style={{width:'38px'}}>
          <rect x="14" y="0" width="20" height="220" fill="#0c0823" />
          <rect x="4"  y="216" width="40" height="16" fill="#0c0823" />
          <rect x="4"  y="196" width="40" height="8"  fill="#0c0823" />
          <rect x="8"  y="50" width="32" height="5" fill="#160f38" opacity="0.8" />
          <rect x="8"  y="100" width="32" height="5" fill="#160f38" opacity="0.8" />
          <rect x="8"  y="150" width="32" height="5" fill="#160f38" opacity="0.8" />
          {/* Rune etching */}
          <text x="24" y="78" textAnchor="middle" fill="rgba(127,119,221,0.35)" fontSize="10" fontFamily="serif">ᚠ</text>
          <text x="24" y="128" textAnchor="middle" fill="rgba(127,119,221,0.35)" fontSize="10" fontFamily="serif">ᚱ</text>
          <text x="24" y="178" textAnchor="middle" fill="rgba(251,191,36,0.25)" fontSize="9" fontFamily="serif">ᛟ</text>
        </svg>
        <svg className="ls-pillar ls-pillar-r" viewBox="0 0 48 260" preserveAspectRatio="none" style={{width:'38px'}}>
          <rect x="14" y="0" width="20" height="220" fill="#0c0823" />
          <rect x="4"  y="216" width="40" height="16" fill="#0c0823" />
          <rect x="4"  y="196" width="40" height="8"  fill="#0c0823" />
          <rect x="8"  y="50" width="32" height="5" fill="#160f38" opacity="0.8" />
          <rect x="8"  y="100" width="32" height="5" fill="#160f38" opacity="0.8" />
          <rect x="8"  y="150" width="32" height="5" fill="#160f38" opacity="0.8" />
          <text x="24" y="78" textAnchor="middle" fill="rgba(127,119,221,0.35)" fontSize="10" fontFamily="serif">ᚷ</text>
          <text x="24" y="128" textAnchor="middle" fill="rgba(127,119,221,0.35)" fontSize="10" fontFamily="serif">ᛊ</text>
          <text x="24" y="178" textAnchor="middle" fill="rgba(251,191,36,0.25)" fontSize="9" fontFamily="serif">ᛏ</text>
        </svg>

        {/* ── FLOATING PARTICLES ── */}
        <div className="ls-layer">
          {motes.map((m, i) => (
            <span key={'m'+i} className="ls-mote" style={{
              left: m.left+'%', top: m.top+'%',
              width: m.size+'px', height: m.size+'px',
              background: m.color,
              boxShadow: `0 0 ${m.size*2.5}px ${m.size}px ${m.color}cc`,
              animationDelay: m.delay+'s', animationDuration: m.dur+'s',
            }} />
          ))}
        </div>

        <div className="ls-layer">
          {ashParticles.map((a, i) => (
            <span key={'a'+i} className="ls-ash" style={{
              left: a.left+'%',
              width: a.isRune ? 'auto' : a.size+'px',
              height: a.isRune ? 'auto' : a.size+'px',
              background: a.isRune ? 'transparent' : 'linear-gradient(135deg,#b8b0f0,#7a72c0)',
              color: a.isRune ? 'rgba(175,169,236,0.65)' : undefined,
              fontSize: a.isRune ? (a.size+4)+'px' : undefined,
              textShadow: a.isRune ? '0 0 8px rgba(127,119,221,0.8)' : undefined,
              transform: `rotate(${a.rot}deg)`,
              animationDelay: a.delay+'s', animationDuration: a.dur+'s',
              '--drift': a.drift+'px',
            }}>
              {a.isRune ? a.rune : null}
            </span>
          ))}
        </div>

        <div className="ls-layer">
          {floatingRunes.map((r, i) => (
            <span key={'f'+i} className="ls-floater" style={{
              left: r.left+'%',
              fontSize: r.size+'px',
              animationDelay: r.delay+'s',
              animationDuration: r.dur+'s',
              '--drift': r.drift+'px',
            }}>
              {r.ch}
            </span>
          ))}
        </div>

        {/* ── VIGNETTE + FRAME ── */}
        <div className="ls-vignette" />
        <div className="ls-frame" />

        {/* ── CORNER ORNAMENTS ── */}
        {['tl','tr','bl','br'].map(pos => (
          <svg key={pos} className={`ls-corner ls-corner-${pos}`} viewBox="0 0 44 44">
            <path d="M2 44 L2 12 Q2 2 12 2 L44 2" fill="none" stroke="#7F77DD" strokeWidth="1.5" opacity="0.7" />
            <path d="M8 44 L8 18 Q8 8 18 8 L44 8" fill="none" stroke="#534AB7" strokeWidth="0.7" opacity="0.35" />
            <circle cx="2" cy="2" r="2.8" fill="#fbbf24" opacity="0.9" />
            <circle cx="2" cy="2" r="5" fill="none" stroke="rgba(251,191,36,0.3)" strokeWidth="1" />
          </svg>
        ))}

        {/* ── ANCIENT TEXT STRIPS ── */}
        <div className="ls-ancient-strip" key={incantIndex}>
          {ANCIENT_INCANTATIONS[incantIndex]}
        </div>
        <div className="ls-ancient-strip-bottom">
          {'◈ ' + (isCoop ? 'PACTUM VINCULUM' : 'PORTA ARCANA') + ' ◈'}
        </div>

        {/* ── SIDE PANELS (desktop) ── */}
        <div className="ls-left-panel">
          {['ᚠ','ᚢ','ᚦ','ᚨ','ᚱ'].map((r,i) => (
            <React.Fragment key={i}>
              {i>0 && <div className="ls-panel-line" />}
              <span className="ls-panel-rune" style={{ animationDelay: (i*0.6)+'s' }}>{r}</span>
            </React.Fragment>
          ))}
        </div>
        <div className="ls-right-panel">
          {['ᛊ','ᛏ','ᛒ','ᛖ','ᛟ'].map((r,i) => (
            <React.Fragment key={i}>
              {i>0 && <div className="ls-panel-line" />}
              <span className="ls-panel-rune" style={{ animationDelay: (i*0.6+0.3)+'s' }}>{r}</span>
            </React.Fragment>
          ))}
        </div>

        {/* ══════════════════════════════════════════
            CENTRAL SUMMONING CIRCLE
        ══════════════════════════════════════════ */}
        <div className="ls-center">

          <div className="ls-circle-wrap">

            {/* RING 1: Outer hexagon + circle */}
            <svg className="ls-ring ls-ring-1" viewBox="0 0 260 260">
              <polygon points="130,10 238,68 238,192 130,250 22,192 22,68"
                fill="none" stroke="rgba(83,74,183,0.45)" strokeWidth="1" />
              <circle cx="130" cy="130" r="118" fill="none"
                stroke="rgba(127,119,221,0.30)" strokeWidth="0.8" strokeDasharray="3 8" />
              {/* Hexagon vertices — sigil dots */}
              {[[130,10],[238,68],[238,192],[130,250],[22,192],[22,68]].map(([x,y],i) => (
                <circle key={i} cx={x} cy={y} r="3" fill="#7F77DD" opacity="0.65" />
              ))}
            </svg>

            {/* RING 2: Star of David + inner circle */}
            <svg className="ls-ring ls-ring-2" viewBox="0 0 260 260">
              {/* Upward triangle */}
              <polygon points="130,30 228,190 32,190"
                fill="none" stroke="rgba(167,139,250,0.38)" strokeWidth="0.9" />
              {/* Downward triangle */}
              <polygon points="130,230 32,70 228,70"
                fill="none" stroke="rgba(167,139,250,0.30)" strokeWidth="0.9" />
              <circle cx="130" cy="130" r="80"
                fill="none" stroke="rgba(175,169,236,0.28)" strokeWidth="0.7" strokeDasharray="5 10" />
              {/* Intersection sigil marks */}
              {[
                [130,30],[228,190],[32,190],
                [130,230],[32,70],[228,70],
              ].map(([x,y],i) => (
                <circle key={i} cx={x} cy={y} r="2.5" fill="#a78bfa" opacity="0.5" />
              ))}
            </svg>

            {/* RING 3: Inner octagon */}
            <svg className="ls-ring ls-ring-3" viewBox="0 0 260 260">
              <polygon
                points="130,60 183,77 200,130 183,183 130,200 77,183 60,130 77,77"
                fill="none" stroke="rgba(251,191,36,0.35)" strokeWidth="0.9"
              />
              <polygon
                points="130,72 176,86 190,130 176,174 130,188 84,174 70,130 84,86"
                fill="none" stroke="rgba(251,191,36,0.18)" strokeWidth="0.6"
              />
              {/* Cross lines */}
              <line x1="130" y1="60" x2="130" y2="200" stroke="rgba(251,191,36,0.12)" strokeWidth="0.6" />
              <line x1="60" y1="130" x2="200" y2="130" stroke="rgba(251,191,36,0.12)" strokeWidth="0.6" />
              <line x1="77" y1="77" x2="183" y2="183" stroke="rgba(251,191,36,0.08)" strokeWidth="0.6" />
              <line x1="183" y1="77" x2="77" y2="183" stroke="rgba(251,191,36,0.08)" strokeWidth="0.6" />
            </svg>

            {/* RING 4: Pulsing inner glow ring */}
            <svg className="ls-ring ls-ring-4" viewBox="0 0 260 260">
              <circle cx="130" cy="130" r="48"
                fill="none" stroke={coreColor} strokeWidth="1.2" opacity="0.70" />
              <circle cx="130" cy="130" r="38"
                fill="none" stroke="rgba(127,119,221,0.25)" strokeWidth="0.8" />
            </svg>

            {/* OUTER RUNE RING */}
            <div className="ls-rune-ring-outer">
              {ringRunesOuter.map((ch, i) => {
                const ang = (360 / ringRunesOuter.length) * i;
                return (
                  <span key={'ro'+i} className="ls-rune" style={{
                    transform: `rotate(${ang}deg) translateY(-118px) rotate(${-ang}deg)`,
                    animationDelay: (i*0.12)+'s',
                  }}>{ch}</span>
                );
              })}
            </div>

            {/* MID RUNE RING */}
            <div className="ls-rune-ring-mid">
              {ringRunesMid.map((ch, i) => {
                const ang = (360 / ringRunesMid.length) * i;
                return (
                  <span key={'rm'+i} className="ls-rune ls-rune-mid" style={{
                    transform: `rotate(${ang}deg) translateY(-78px) rotate(${-ang}deg)`,
                    animationDelay: (i*0.18)+'s',
                  }}>{ch}</span>
                );
              })}
            </div>

            {/* INNER RUNE RING */}
            <div className="ls-rune-ring-inner">
              {ringRunesInner.map((ch, i) => {
                const ang = (360 / ringRunesInner.length) * i;
                return (
                  <span key={'ri'+i} className="ls-rune ls-rune-inner" style={{
                    transform: `rotate(${ang}deg) translateY(-46px) rotate(${-ang}deg)`,
                    animationDelay: (i*0.25)+'s',
                  }}>{ch}</span>
                );
              })}
            </div>

            {/* SIGIL CORE */}
            <div className="ls-sigil-core">
              <div className="ls-sigil-dot" style={{
                background: coreColor,
                boxShadow: `0 0 18px 8px ${coreColor}cc, 0 0 42px 20px ${coreColor}44`,
              }} />
            </div>
          </div>

          {/* ── TITLE ── */}
          <h1 className="ls-title">
            {isCoop ? 'BINDING THE PACT' : 'ENTERING THE VOID'}
          </h1>

          {/* ── ANCIENT GLYPH ROW ── */}
          <div className="ls-glyphs">
            {ancientGlyphs.slice(0,3).map((g,i) => (
              <React.Fragment key={i}>
                {i > 0 && <div className="ls-glyph-divider" />}
                <span style={{ animationDelay: (i*0.4)+'s' }}>{g}</span>
              </React.Fragment>
            ))}
            <div className="ls-glyph-divider" style={{width:'40px'}} />
            {sigilSymbols.slice(0,3).map((s,i) => (
              <React.Fragment key={i}>
                {i > 0 && <div className="ls-glyph-divider" />}
                <span style={{ color:'#c4bfff', textShadow:'0 0 8px rgba(196,191,255,0.8)', animationDelay: (i*0.4+0.5)+'s' }}>{s}</span>
              </React.Fragment>
            ))}
          </div>

          {/* ── LOADING LINE ── */}
          <div className="ls-subtitle-wrap">
            <p className="ls-subtitle" key={lineIndex}>{lines[lineIndex]}…</p>
          </div>

          {/* ── PROGRESS BAR ── */}
          <div className="ls-bar-wrap">
            <div className="ls-bar-header">
              <span style={{fontSize:'0.60rem',letterSpacing:'0.12em',color:'rgba(127,119,221,0.55)'}}>
                ᚠᚢᚦ
              </span>
              <span className="ls-bar-pct">{Math.floor(progress)}%</span>
              <span style={{fontSize:'0.60rem',letterSpacing:'0.12em',color:'rgba(127,119,221,0.55)'}}>
                ᛟᛞᛊ
              </span>
            </div>
            <div className="ls-bar-ticks">
              {Array.from({length:11},(_,i) => <span key={i}>┆</span>)}
            </div>
            <div className="ls-bar-track">
              <div className="ls-bar-fill" style={{width: progress+'%'}} />
            </div>
            <div className="ls-bar-meta">
              <span className="ls-spinner">✦</span>
              <span>CHANNELING ARCANE POWER</span>
              <span className="ls-spinner" style={{animationDirection:'reverse'}}>✦</span>
            </div>
            <div className="ls-sigil-row">
              {'◈ · ⊕ · ◉ · ⋆ · ◈ · ⊗ · ◉'}
            </div>
          </div>
        </div>

        {/* ── TIP BANNER ── */}
        <div className="ls-tip-box">
          <div className="ls-tip-rule">
            <div className="ls-tip-line" />
            <span className="ls-tip-label">
              {isCoop ? '⟡ CO-OP WISDOM ⟡' : '⟡ ARCANE COUNSEL ⟡'}
            </span>
            <div className="ls-tip-line ls-tip-line-r" />
          </div>
          <p className="ls-tip-text" key={tipIndex}>{tips[tipIndex]}</p>
        </div>

      </div>
    </div>
  );
}