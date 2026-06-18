import React, { useState, useEffect, useRef, useMemo } from 'react';

const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;900&family=Cinzel+Decorative:wght@400;700&display=swap';

function useCinzelFont() {
  useEffect(() => {
    if (document.querySelector(`link[href="${FONT_HREF}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = FONT_HREF;
    document.head.appendChild(link);
  }, []);
}

// ─── Keyframes ───────────────────────────────────────────────────────────────
const KEYFRAMES = `
@keyframes sc-spin    { from{transform:rotate(0deg)}   to{transform:rotate(360deg)} }
@keyframes sc-spinrev { from{transform:rotate(0deg)}   to{transform:rotate(-360deg)} }
@keyframes sc-pulse   { 0%,100%{transform:scale(1);opacity:.65} 50%{transform:scale(1.18);opacity:1} }
@keyframes sc-twinkle { from{opacity:var(--so);transform:scale(1)} to{opacity:calc(var(--so)*.12);transform:scale(.4)} }
@keyframes sc-float   { 0%{opacity:0;transform:translateY(0) rotate(0deg)} 15%{opacity:.45} 85%{opacity:.18} 100%{opacity:0;transform:translateY(-150px) rotate(28deg)} }
@keyframes sc-float-sym { 0%{opacity:0;transform:translateY(0) rotate(0deg) scale(.7)} 12%{opacity:.6} 88%{opacity:.2} 100%{opacity:0;transform:translateY(-120px) rotate(-22deg) scale(1.1)} }

@keyframes sc-lock-glow { 0%,100%{filter:drop-shadow(0 0 4px rgba(168,85,247,.45))} 50%{filter:drop-shadow(0 0 16px rgba(168,85,247,.95)) drop-shadow(0 0 32px rgba(255,220,100,.4))} }
@keyframes sc-lock-open { 0%{transform:rotate(0deg)} 65%{transform:rotate(-46deg) translateY(-6px)} 100%{transform:rotate(-40deg) translateY(-4px)} }
@keyframes sc-lock-fade { 0%{opacity:1;transform:translateY(0) scale(1)} 40%{opacity:.6;transform:translateY(-10px) scale(.9)} 100%{opacity:0;transform:translateY(-30px) scale(.7)} }

@keyframes sc-rune-fly {
  0%  { opacity:0;  transform:translate(-50%,-50%) rotate(var(--ra)) translateX(10px) scale(.2); }
  25% { opacity:1; }
  75% { opacity:.9; }
  100%{ opacity:0;  transform:translate(-50%,-50%) rotate(var(--ra)) translateX(var(--rd)) scale(1.2); }
}
@keyframes sc-streak {
  0%  { opacity:0;  transform:translate(-50%,-50%) rotate(var(--sa)) translateX(20px) scaleX(0); }
  20% { opacity:1; }
  100%{ opacity:0;  transform:translate(-50%,-50%) rotate(var(--sa)) translateX(180px) scaleX(.1); }
}
@keyframes sc-sigil-appear {
  0%  { opacity:0; transform:translate(-50%,-50%) scale(0) rotate(var(--sr)); }
  50% { opacity:1; transform:translate(-50%,-50%) scale(1.15) rotate(calc(var(--sr)*1.1)); }
  100%{ opacity:1; transform:translate(-50%,-50%) scale(1) rotate(var(--sr)); }
}
@keyframes sc-eye-open {
  0%  { clip-path:ellipse(95px 2px at 50% 50%); }
  55% { clip-path:ellipse(95px 102px at 50% 50%); }
  100%{ clip-path:ellipse(95px 95px at 50% 50%); }
}
@keyframes sc-core-ignite {
  0%  { transform:scale(.25); opacity:.08; }
  45% { transform:scale(1.22); opacity:.9; }
  72% { transform:scale(.93); opacity:1; }
  100%{ transform:scale(1);   opacity:1; }
}
@keyframes sc-rune-glow {
  0%,100%{ fill:rgba(192,132,252,.55); }
  50%     { fill:rgba(255,255,255,.95); }
}
@keyframes sc-magic-circle-glow {
  0%,100%{ filter:drop-shadow(0 0 5px rgba(168,85,247,.65)) drop-shadow(0 0 12px rgba(168,85,247,.25)); }
  50%     { filter:drop-shadow(0 0 10px rgba(192,132,252,.95)) drop-shadow(0 0 24px rgba(168,85,247,.55)) drop-shadow(0 0 44px rgba(255,220,100,.15)); }
}
@keyframes sc-horizon {
  0%  { transform:scaleX(1); opacity:.5; }
  100%{ transform:scaleX(3.5); opacity:0; }
}
@keyframes sc-vortex {
  from{ transform:translate(-50%,-50%) rotate(0deg); }
  to  { transform:translate(-50%,-50%) rotate(720deg); }
}
@keyframes sc-warp-ring {
  0%   { transform:translate(-50%,-50%) scale(0); opacity:.9; }
  100% { transform:translate(-50%,-50%) scale(8);  opacity:0; }
}
@keyframes sc-suck {
  0%  { transform:scale(1);   opacity:1; }
  100%{ transform:scale(.02); opacity:0; }
}

/* ── NEW: elemental sigil animations ── */
@keyframes sc-elemental-drift {
  0%   { transform:translate(var(--ex),var(--ey)) rotate(var(--er)) scale(1);    opacity:0; }
  8%   { opacity:var(--eo); }
  90%  { opacity:calc(var(--eo)*.4); }
  100% { transform:translate(var(--ex2),var(--ey2)) rotate(var(--er2)) scale(.8); opacity:0; }
}
@keyframes sc-ancient-text-fade {
  0%,100% { opacity:0; transform:translateY(4px); }
  15%,85% { opacity:var(--at-op); transform:translateY(0); }
}
@keyframes sc-sigil-orbit {
  0%   { opacity:0; transform:translate(-50%,-50%) rotate(var(--so-start)) translateX(var(--so-r)) scale(0) rotate(calc(-1*var(--so-start))); }
  18%  { opacity:1; transform:translate(-50%,-50%) rotate(var(--so-start)) translateX(var(--so-r)) scale(1.1) rotate(calc(-1*var(--so-start))); }
  82%  { opacity:.8; }
  100% { opacity:0; transform:translate(-50%,-50%) rotate(var(--so-end)) translateX(var(--so-r)) scale(.9) rotate(calc(-1*var(--so-end))); }
}
@keyframes sc-inscription-scroll {
  0%   { transform:translateX(0); }
  100% { transform:translateX(-50%); }
}
@keyframes sc-cornerSigil-pulse {
  0%,100% { opacity:.14; transform:scale(1) rotate(var(--cs-rot)); }
  50%      { opacity:.34; transform:scale(1.06) rotate(calc(var(--cs-rot) + 4deg)); }
}
@keyframes sc-pentagram-spin {
  from { transform:translate(-50%,-50%) rotate(0deg); }
  to   { transform:translate(-50%,-50%) rotate(-360deg); }
}
@keyframes sc-enochian-glow {
  0%,100% { text-shadow:0 0 6px rgba(168,85,247,.35), 0 0 12px rgba(168,85,247,.1); opacity:.22; }
  50%      { text-shadow:0 0 12px rgba(192,132,252,.72), 0 0 24px rgba(168,85,247,.38); opacity:.42; }
}
@keyframes sc-border-march {
  0%   { stroke-dashoffset:0; }
  100% { stroke-dashoffset:-200; }
}
@keyframes sc-triangle-breathe {
  0%,100% { opacity:.12; }
  50%      { opacity:.28; }
}
`;

function useInjectKeyframes() {
  useEffect(() => {
    const id = 'sc-kf';
    if (document.getElementById(id)) return;
    const s = document.createElement('style');
    s.id = id; s.textContent = KEYFRAMES;
    document.head.appendChild(s);
  }, []);
}

// ─── Glyph sets ──────────────────────────────────────────────────────────────
const ELDER_FUTHARK  = ['ᚠ','ᚢ','ᚦ','ᚨ','ᚱ','ᚲ','ᚷ','ᚹ','ᚺ','ᚾ','ᛁ','ᛃ','ᛇ','ᛈ','ᛉ','ᛊ','ᛏ','ᛒ','ᛖ','ᛗ','ᛚ','ᛟ','ᛜ','ᛞ'];
const SYMBOLS        = ['✦','⬡','◈','⊕','⊗','✧','⋆','⍟','⎊','⎋','⌘','⍜'];
const THEBAN         = ['𐌰','𐌱','𐌲','𐌳','𐌴','𐌵','𐌶','𐌷','𐌸','𐌹','𐌺','𐌻','𐌼','𐌽','𐌾','𐌿','𐍀','𐍁','𐍂','𐍃','𐍄','𐍅','𐍆','𐍇'];
const ALCHEMICAL     = ['🜁','🜂','🜃','🜄','🜅','🜆','🜇','🜈','🜉','🜊','🜋','🜌','🜍','🜎','🜏','🜐','🜑','🜒','🜓','🜔','🜕','🜖','☿','♄'];
const ALL_GLYPHS     = [...ELDER_FUTHARK, ...SYMBOLS];

// Ancient-ish inscriptions (arcane flavour)
const ANCIENT_PHRASES = [
  'ᚦᚨᛏ ᚹᚺᛁᚲᚺ ᛚᛁᛖᛊ ᛒᛖᛃᛟᚾᛞ',
  'ᛊᛖᛖᚲ ᚾᛟᛏ ᚹᚺᛖᚱᛖ ᛒᚢᛏ ᚹᚺᛖᚾ',
  'ᛏᚺᛖ ᚹᛖᛁᛚ ᚾᛖᚢᛖᚱ ᚠᛟᚱᚷᛖᛏᛊ',
  '✦ ARCANUM INFINITUM ✦',
  '⬡ VIA OBSCURA MUNDI ⬡',
  '◈ PORTA AETERNALIS ◈',
  'ᚠᚢᚦᚨᚱᚲ · ᚷᚹᚺᚾᛁᛃ · ᛇᛈᛉᛊᛏᛒ',
  'VERITAS · ARCANA · TENEBRIS',
  '⊕ SIGILLUM SANCTI MUNDI ⊕',
  'ᛟ THE UNSEEN EYE WATCHES ᛟ',
];

// Elemental sigil SVG paths (fire, water, air, earth, aether)
const ELEMENTAL_PATHS = {
  fire:   'M0,-20 L8,4 L20,10 L8,8 L14,24 L0,12 L-14,24 L-8,8 L-20,10 L-8,4 Z',
  water:  'M0,20 C-8,8 -20,-4 0,-20 C20,-4 8,8 0,20 Z M-12,4 C-6,-4 6,-4 12,4',
  air:    'M-18,-18 L18,-18 L18,18 L-18,18 Z M-10,-10 L10,-10 L10,10 L-10,10 Z M0,-18 L0,18 M-18,0 L18,0 M-18,-18 L18,18 M18,-18 L-18,18',
  earth:  'M0,-22 L13,-7 L22,8 L0,20 L-22,8 L-13,-7 Z M0,-12 L7,-2 L12,7 L0,12 L-12,7 L-7,-2 Z',
  aether: 'M0,-20 A20,20 0 1,1 -.001,-20 Z M0,-13 A13,13 0 1,0 .001,-13 Z M-20,0 L20,0 M0,-20 L0,20 M-14,-14 L14,14 M14,-14 L-14,14',
};

// ─── Stars ───────────────────────────────────────────────────────────────────
function Stars({ phase }) {
  const isWarping = phase === 'warping' || phase === 'white';
  const stars = useRef(Array.from({ length: 140 }, () => ({
    size: Math.random() * 2.4 + .35,
    top:  Math.random() * 100,
    left: Math.random() * 100,
    op:   (Math.random() * .65 + .1).toFixed(2),
    dur:  (Math.random() * 3.5 + 1.5).toFixed(1),
    del:  (Math.random() * 6).toFixed(1),
  }))).current;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} aria-hidden>
      {stars.map((s, i) => (
        <div key={i} style={{
          position: 'absolute', width: s.size, height: s.size,
          borderRadius: '50%', background: '#fff',
          top: `${s.top}%`, left: `${s.left}%`,
          '--so': s.op,
          animation: `sc-twinkle ${s.dur}s ${s.del}s ease-in-out infinite alternate`,
          transition: isWarping ? 'transform .8s ease, opacity .6s ease' : 'none',
          transform: isWarping ? `translate(${(50-s.left)*1.8}%,${(50-s.top)*1.8}%) scale(0)` : 'none',
          opacity:   isWarping ? 0 : undefined,
        }} />
      ))}
    </div>
  );
}

// ─── Floating ambient runes (original positions + more) ──────────────────────
const FLOAT_POS = [
  {l:'7%',b:'70%'},{l:'14%',b:'48%'},{l:'11%',b:'25%'},{l:'22%',b:'82%'},
  {l:'36%',b:'89%'},{l:'50%',b:'93%'},{l:'62%',b:'87%'},{l:'74%',b:'76%'},
  {l:'82%',b:'52%'},{l:'87%',b:'28%'},{l:'79%',b:'13%'},{l:'64%',b:'9%'},
  {l:'50%',b:'4%'},{l:'37%',b:'7%'},{l:'19%',b:'11%'},{l:'4%',b:'40%'},
  {l:'93%',b:'55%'},{l:'28%',b:'60%'},{l:'72%',b:'40%'},{l:'55%',b:'78%'},
  // extra positions
  {l:'44%',b:'96%'},{l:'3%',b:'85%'},{l:'96%',b:'20%'},{l:'90%',b:'72%'},
];
function FloatingRunes() {
  const runes = useRef(FLOAT_POS.map((p, i) => ({
    ...p,
    ch:  ALL_GLYPHS[Math.floor(Math.random() * ALL_GLYPHS.length)],
    sz:  Math.floor(Math.random() * 10 + 9),
    dur: (Math.random() * 5 + 5).toFixed(1),
    del: (Math.random() * 10).toFixed(1),
    col: Math.random() > .6 ? '#a855f7' : Math.random() > .5 ? '#7c3aed' : '#c084fc',
    useSym: i > 14,
  }))).current;
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} aria-hidden>
      {runes.map((r, i) => (
        <div key={i} style={{
          position: 'absolute', left: r.l, bottom: r.b,
          fontFamily: 'serif', fontSize: r.sz, color: r.col,
          opacity: 0, userSelect: 'none',
          animation: `${r.useSym ? 'sc-float-sym' : 'sc-float'} ${r.dur}s ease-in ${r.del}s infinite`,
          textShadow: `0 0 8px ${r.col}, 0 0 18px ${r.col}44`,
        }}>{r.ch}</div>
      ))}
    </div>
  );
}

// ─── Corner decorative elemental sigils (permanent background dressing) ───────
function CornerElementalSigils() {
  const corners = [
    { top: '2%',    left: '1.5%',  rot: 0,   path: ELEMENTAL_PATHS.fire,   col: 'rgba(255,180,60,.22)',  sz: 48 },
    { top: '2%',    right: '1.5%', rot: 72,  path: ELEMENTAL_PATHS.water,  col: 'rgba(100,180,255,.18)', sz: 44 },
    { bottom: '3%', left: '2%',    rot: -36, path: ELEMENTAL_PATHS.earth,  col: 'rgba(120,220,120,.18)', sz: 42 },
    { bottom: '3%', right: '2%',   rot: 144, path: ELEMENTAL_PATHS.air,    col: 'rgba(192,132,252,.2)',  sz: 46 },
  ];
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} aria-hidden>
      {corners.map((c, i) => (
        <div key={i} style={{
          position: 'absolute',
          top: c.top, bottom: c.bottom, left: c.left, right: c.right,
          '--cs-rot': `${c.rot}deg`,
          animation: `sc-cornerSigil-pulse ${4.5 + i * .7}s ease-in-out ${i * 1.1}s infinite`,
        }}>
          <svg width={c.sz} height={c.sz} viewBox="-28 -28 56 56" style={{ overflow: 'visible' }}>
            <path d={c.path} fill="none" stroke={c.col} strokeWidth="1.2"
              style={{ filter: `drop-shadow(0 0 6px ${c.col})` }} />
          </svg>
        </div>
      ))}
    </div>
  );
}

// ─── Drifting elemental sigils (mid-air ambient) ───────────────────────────────
function DriftingElementalSigils() {
  const items = useRef(Array.from({ length: 14 }, (_, i) => {
    const keys = Object.keys(ELEMENTAL_PATHS);
    const key  = keys[i % keys.length];
    const sx   = (Math.random() * 80 + 10).toFixed(1);
    const sy   = (Math.random() * 60 + 20).toFixed(1);
    const ex   = `${sx}%`;
    const ey   = `${sy}%`;
    const dx   = ((Math.random() - .5) * 18).toFixed(1);
    const dy   = (-(Math.random() * 14 + 4)).toFixed(1);
    return {
      key, sz: 26 + Math.floor(Math.random() * 20),
      x: ex, y: ey,
      '--ex':  `${ex}`, '--ey':  `${ey}`,
      '--ex2': `calc(${ex} + ${dx}px)`,
      '--ey2': `calc(${ey} + ${dy}px)`,
      '--er':  `${Math.random() * 360}deg`,
      '--er2': `${Math.random() * 360 + 90}deg`,
      '--eo':  (Math.random() * .2 + .08).toFixed(2),
      dur: (12 + Math.random() * 10).toFixed(1),
      del: (Math.random() * 14).toFixed(1),
      col: ['rgba(168,85,247,.65)','rgba(255,220,100,.6)','rgba(192,132,252,.65)'][i % 3],
    };
  })).current;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} aria-hidden>
      {items.map((it, i) => (
        <div key={i} style={{
          position: 'absolute', left: it.x, top: it.y,
          '--ex': it['--ex'], '--ey': it['--ey'],
          '--ex2': it['--ex2'], '--ey2': it['--ey2'],
          '--er': it['--er'], '--er2': it['--er2'], '--eo': it['--eo'],
          animation: `sc-elemental-drift ${it.dur}s ease-in-out ${it.del}s infinite`,
        }}>
          <svg width={it.sz} height={it.sz} viewBox="-28 -28 56 56" style={{ overflow:'visible' }}>
            <path d={ELEMENTAL_PATHS[it.key]} fill="none" stroke={it.col} strokeWidth="1.4"
              style={{ filter: `drop-shadow(0 0 5px ${it.col})` }} />
          </svg>
        </div>
      ))}
    </div>
  );
}

// ─── Scrolling ancient inscription band ───────────────────────────────────────
function AncientInscriptionBand({ phase }) {
  const isGone = phase === 'warping' || phase === 'white';
  // Double the phrases so the scroll loops seamlessly
  const text = [...ANCIENT_PHRASES, ...ANCIENT_PHRASES].join('  ·  ');

  return (
    <div style={{
      position: 'absolute', bottom: 28, left: 0, right: 0,
      overflow: 'hidden', pointerEvents: 'none',
      opacity: isGone ? 0 : 1,
      transition: 'opacity .5s ease',
    }} aria-hidden>
      {/* Top micro-line */}
      <div style={{
        height: 1,
        background: 'linear-gradient(to right, transparent, rgba(168,85,247,.22), rgba(255,220,100,.15), rgba(168,85,247,.22), transparent)',
        marginBottom: 6,
      }} />
      <div style={{
        display: 'inline-block',
        whiteSpace: 'nowrap',
        fontFamily: 'serif',
        fontSize: 10,
        letterSpacing: '.22em',
        color: 'rgba(192,132,252,.36)',
        textShadow: '0 0 10px rgba(168,85,247,.28)',
        animation: 'sc-inscription-scroll 38s linear infinite',
        paddingLeft: '100%',
      }}>{text}</div>
    </div>
  );
}

// ─── Enochian side panels ─────────────────────────────────────────────────────
function EnochianPanels({ phase }) {
  const isGone = phase === 'warping' || phase === 'white';
  const leftChars  = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ'.split('');
  const rightChars = '✦⬡◈⊕⊗✧⋆⍟⎊⎋⌘⍜✦⬡◈⊕⊗✧⋆⍟⎊⎋⌘⍜'.split('');

  return (
    <>
      {/* Left panel */}
      <div style={{
        position: 'absolute', left: 18, top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex', flexDirection: 'column', gap: 11,
        pointerEvents: 'none',
        opacity: isGone ? 0 : 1,
        transition: 'opacity .5s ease',
      }} aria-hidden>
        {leftChars.slice(0, 14).map((ch, i) => (
          <span key={i} style={{
            fontFamily: 'serif', fontSize: 11,
            color: i % 3 === 0 ? 'rgba(255,220,100,.38)' : 'rgba(192,132,252,.28)',
            userSelect: 'none',
            '--at-op': (i % 3 === 0 ? .38 : .28),
            animation: `sc-enochian-glow ${3 + (i % 4) * .7}s ease-in-out ${i * .18}s infinite`,
          }}>{ch}</span>
        ))}
      </div>
      {/* Right panel */}
      <div style={{
        position: 'absolute', right: 18, top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex', flexDirection: 'column', gap: 11,
        pointerEvents: 'none',
        opacity: isGone ? 0 : 1,
        transition: 'opacity .5s ease',
      }} aria-hidden>
        {rightChars.slice(0, 14).map((ch, i) => (
          <span key={i} style={{
            fontFamily: 'serif', fontSize: 11,
            color: i % 2 === 0 ? 'rgba(192,132,252,.3)' : 'rgba(255,220,100,.24)',
            userSelect: 'none',
            '--at-op': (i % 2 === 0 ? .3 : .24),
            animation: `sc-enochian-glow ${2.8 + (i % 5) * .55}s ease-in-out ${i * .22 + .5}s infinite`,
          }}>{ch}</span>
        ))}
      </div>
    </>
  );
}

// ─── Background pentagram (very subtle, far bg) ───────────────────────────────
function BackgroundPentagram({ phase }) {
  const isGone = phase === 'warping' || phase === 'white';
  // Regular pentagram points
  const pts = Array.from({ length: 5 }, (_, i) => {
    const a = (i * 72 - 90) * Math.PI / 180;
    return [Math.cos(a) * 200, Math.sin(a) * 200];
  });
  // Draw star lines: 0→2→4→1→3→0
  const order = [0,2,4,1,3,0];
  const d = order.map((pi, i) => `${i===0?'M':'L'}${pts[pi][0]},${pts[pi][1]}`).join(' ') + ' Z';

  return (
    <div style={{
      position: 'absolute', top: '50%', left: '50%',
      pointerEvents: 'none',
      opacity: isGone ? 0 : 1,
      transition: 'opacity .6s ease',
    }} aria-hidden>
      <svg width="400" height="400" viewBox="-210 -210 420 420" style={{ overflow: 'visible' }}>
        <path d={d} fill="none" stroke="rgba(168,85,247,.06)" strokeWidth="1.2"
          style={{
            animation: 'sc-pentagram-spin 180s linear infinite',
            transformOrigin: '0 0',
            transform: 'translate(-50%,-50%)',
          }}
        />
        <circle cx="0" cy="0" r="200" fill="none" stroke="rgba(168,85,247,.04)" strokeWidth=".8"
          strokeDasharray="3 8"
          style={{ animation: 'sc-spinrev 120s linear infinite', transformOrigin: '0 0' }}
        />
        <circle cx="0" cy="0" r="160" fill="none" stroke="rgba(255,220,100,.035)" strokeWidth=".8"
          style={{ animation: 'sc-spin 95s linear infinite', transformOrigin: '0 0' }}
        />
      </svg>
    </div>
  );
}

// ─── Corner brackets on button ───────────────────────────────────────────────
function CornerBrackets() {
  const corners = [
    { top: -1, left: -1, right: 'auto', bottom: 'auto', rotate: 0 },
    { top: -1, left: 'auto', right: -1, bottom: 'auto', rotate: 90 },
    { top: 'auto', left: -1, right: 'auto', bottom: -1, rotate: 270 },
    { top: 'auto', left: 'auto', right: -1, bottom: -1, rotate: 180 },
  ];
  return corners.map((c, i) => (
    <span key={i} style={{
      position: 'absolute', width: 12, height: 12,
      top: c.top, right: c.right, bottom: c.bottom, left: c.left,
      transform: `rotate(${c.rotate}deg)`, pointerEvents: 'none',
    }} aria-hidden>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <line x1="0" y1="0" x2="12" y2="0" stroke="rgba(255,230,163,.7)" strokeWidth="1.2" />
        <line x1="0" y1="0" x2="0" y2="12" stroke="rgba(255,230,163,.7)" strokeWidth="1.2" />
      </svg>
    </span>
  ));
}

// ─── Lock icon ───────────────────────────────────────────────────────────────
function LockIcon({ phase }) {
  const isOpening = phase === 'unlocking';
  const isGone    = ['unlocked','charging','warping','white'].includes(phase);
  return (
    <div style={{
      position: 'absolute',
      top: -52, left: '50%', transform: 'translateX(-50%)',
      zIndex: 20, pointerEvents: 'none',
      animation: isGone
        ? 'sc-lock-fade .55s cubic-bezier(.4,0,.6,1) forwards'
        : 'sc-lock-glow 2.6s ease-in-out infinite',
    }}>
      <svg width="32" height="38" viewBox="0 0 30 36" fill="none">
        <path
          d="M8,18 V11 A7,7 0 0,1 22,11 V18"
          stroke="rgba(192,132,252,.92)" strokeWidth="2.5" strokeLinecap="round" fill="none"
          style={{
            transformOrigin: '22px 14px',
            animation: isOpening ? 'sc-lock-open .42s cubic-bezier(.34,1.56,.64,1) forwards' : 'none',
          }}
        />
        <rect x="4" y="16" width="22" height="17" rx="3"
          fill="rgba(124,58,237,.3)" stroke="rgba(192,132,252,.88)" strokeWidth="1.5" />
        <circle cx="15" cy="24" r="3.5" fill="rgba(192,132,252,.75)" />
        <rect x="13.5" y="24" width="3" height="5" rx="1" fill="rgba(192,132,252,.75)" />
      </svg>
    </div>
  );
}

// ─── Rune burst (unlock flash) ───────────────────────────────────────────────
function RuneBurstOverlay({ active }) {
  const items = useMemo(() => Array.from({ length: 36 }, (_, i) => ({
    ch:    ALL_GLYPHS[Math.floor(Math.random() * ALL_GLYPHS.length)],
    angle: (360 / 36) * i + (Math.random() * 10 - 5),
    dist:  110 + Math.random() * 110,
    size:  Math.floor(Math.random() * 14 + 12),
    delay: (Math.random() * .2).toFixed(2),
    dur:   (.5 + Math.random() * .35).toFixed(2),
    color: Math.random() > .45 ? 'rgba(192,132,252,1)' : Math.random() > .5 ? 'rgba(255,230,163,1)' : 'rgba(168,85,247,1)',
  })), []);

  // Extended sigil definitions including elemental shapes
  const sigilDefs = [
    ELEMENTAL_PATHS.fire,
    ELEMENTAL_PATHS.water,
    ELEMENTAL_PATHS.air,
    ELEMENTAL_PATHS.earth,
    ELEMENTAL_PATHS.aether,
    'M0,-22 L6,-6 L22,-6 L9,6 L14,22 L0,12 L-14,22 L-9,6 L-22,-6 L-6,-6 Z',
    'M0,-20 A20,20 0 1,1 -.001,-20 Z M-20,0 L20,0 M0,-20 L0,20',
  ];
  const sigils = useMemo(() => Array.from({ length: 14 }, (_, i) => ({
    path:  sigilDefs[i % sigilDefs.length],
    angle: i * 25.7 + Math.random() * 12 - 6,
    rot:   Math.random() * 360,
    size:  18 + Math.random() * 20,
    color: i % 3 === 0 ? 'rgba(255,230,163,.9)' : i % 3 === 1 ? 'rgba(192,132,252,.9)' : 'rgba(100,220,255,.85)',
    delay: (.04 + i * .04).toFixed(2),
    dur:   (.65 + Math.random() * .3).toFixed(2),
  })), []);

  const streaks = useMemo(() => Array.from({ length: 22 }, (_, i) => ({
    angle: i * (360/22),
    len:   55 + Math.random() * 95,
    delay: (Math.random() * .15).toFixed(2),
    color: i % 3 === 0 ? 'rgba(255,230,163,.9)' : i % 3 === 1 ? 'rgba(192,132,252,.8)' : 'rgba(100,200,255,.75)',
  })), []);

  if (!active) return null;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} aria-hidden>
      {items.map((r, i) => (
        <div key={i} style={{
          position: 'absolute', top: '50%', left: '50%',
          fontFamily: 'serif', fontSize: r.size, color: r.color,
          lineHeight: 1, userSelect: 'none',
          '--ra': `${r.angle}deg`, '--rd': `${r.dist}px`,
          animation: `sc-rune-fly ${r.dur}s ease-out ${r.delay}s forwards`,
          textShadow: `0 0 16px ${r.color}, 0 0 32px ${r.color}`,
        }}>{r.ch}</div>
      ))}
      {sigils.map((s, i) => (
        <svg key={i} width={s.size * 2.8} height={s.size * 2.8} viewBox="-28 -28 56 56"
          style={{
            position: 'absolute', top: '50%', left: '50%',
            '--sr': `${s.rot}deg`,
            animation: `sc-sigil-appear ${s.dur}s ease-out ${s.delay}s forwards`,
            filter: `drop-shadow(0 0 10px ${s.color}) drop-shadow(0 0 22px ${s.color})`,
            overflow: 'visible',
          }}
        >
          <path d={s.path} fill="none" stroke={s.color} strokeWidth="1.8" />
        </svg>
      ))}
      {streaks.map((s, i) => (
        <div key={i} style={{
          position: 'absolute', top: '50%', left: '50%',
          width: s.len, height: 2,
          background: `linear-gradient(to right, ${s.color}, transparent)`,
          '--sa': `${s.angle}deg`,
          animation: `sc-streak .42s ease-out ${s.delay}s forwards`,
          transformOrigin: 'left center', borderRadius: 2,
          boxShadow: `0 0 8px ${s.color}`,
        }} />
      ))}
    </div>
  );
}

// ─── PORTAL ──────────────────────────────────────────────────────────────────
const PORTAL_SIZE = 320;
const PC = PORTAL_SIZE / 2;

function Portal({ phase }) {
  const isUnlocked = ['unlocked','charging','warping','white'].includes(phase);
  const isCharging = phase === 'charging';
  const isWarping  = phase === 'warping' || phase === 'white';

  const runeOnCircle = (chars, r, total, startAngle = 0) =>
    chars.slice(0, total).map((ch, i) => {
      const a = ((360 / total) * i + startAngle) * Math.PI / 180;
      return {
        ch,
        x: PC + r * Math.cos(a - Math.PI / 2),
        y: PC + r * Math.sin(a - Math.PI / 2),
        rot: (360 / total) * i + startAngle,
      };
    });

  const outerRunes = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ'.split('');
  const midRunes   = '✦ᛟ◈⬡✦ᛁ◈⊕✦ᛊ⬡⊗'.split('').filter(c => c.trim());

  const outerRingRunes = runeOnCircle(outerRunes, 130, 24, 0);
  const midRingRunes   = runeOnCircle(midRunes,    92, 12, 15);

  const baseOp    = isWarping ? 0 : isUnlocked ? 1 : 0.45;
  const glowColor = isCharging ? 'rgba(255,220,100,0.9)' : 'rgba(192,132,252,0.85)';

  const eyeGlow = isWarping
    ? '0 0 110px rgba(255,255,255,.95), 0 0 180px rgba(168,85,247,.85), inset 0 0 80px rgba(255,255,255,.65)'
    : isCharging
    ? '0 0 60px rgba(255,220,100,.55), 0 0 90px rgba(168,85,247,.75), inset 0 0 50px rgba(168,85,247,.5)'
    : isUnlocked
    ? '0 0 40px rgba(168,85,247,.6),   0 0 72px rgba(124,58,237,.38),  inset 0 0 36px rgba(168,85,247,.38)'
    : '0 0 28px rgba(124,58,237,.28),  0 0 52px rgba(124,58,237,.1),   inset 0 0 24px rgba(124,58,237,.18)';

  const coreSize = isWarping ? 196 : isCharging ? 112 : isUnlocked ? 102 : 80;
  const coreBg   = isWarping
    ? 'radial-gradient(circle,#fff 0%,#c084fc 16%,#7c3aed 38%,transparent 65%)'
    : isCharging
    ? 'radial-gradient(circle,rgba(255,255,255,.82) 0%,rgba(255,220,100,.5) 18%,rgba(168,85,247,.9) 44%,transparent 75%)'
    : isUnlocked
    ? 'radial-gradient(circle,rgba(255,230,163,.62) 0%,rgba(168,85,247,.72) 40%,rgba(124,58,237,.36) 65%,transparent 80%)'
    : 'radial-gradient(circle,rgba(168,85,247,.62) 0%,rgba(124,58,237,.35) 50%,transparent 80%)';

  const spd = isWarping ? .07 : isCharging ? .22 : isUnlocked ? .58 : 1;

  const ringStyle = (sz, colors, base, rev) => ({
    position: 'absolute',
    width: sz, height: sz,
    top: PC - sz / 2, left: PC - sz / 2,
    borderRadius: '50%',
    borderStyle: 'solid',
    borderWidth: isUnlocked ? 2 : 1.5,
    borderColor: colors,
    animation: `${rev ? 'sc-spinrev' : 'sc-spin'} ${(base * spd).toFixed(1)}s linear infinite`,
    boxShadow: isWarping
      ? '0 0 22px rgba(168,85,247,.75), 0 0 46px rgba(168,85,247,.38)'
      : isCharging
      ? '0 0 18px rgba(255,220,100,.48), 0 0 36px rgba(168,85,247,.48)'
      : isUnlocked
      ? '0 0 12px rgba(168,85,247,.42)'
      : 'none',
    transition: 'border-width .4s, box-shadow .4s',
  });

  // Elemental sigils to place at cardinal + intercardinal on the portal ring
  const elementalRingItems = useMemo(() => {
    const keys = Object.keys(ELEMENTAL_PATHS);
    return Array.from({ length: 8 }, (_, i) => {
      const a = (i * 45 - 90) * Math.PI / 180;
      const radius = 148;
      return {
        x: PC + radius * Math.cos(a),
        y: PC + radius * Math.sin(a),
        path: ELEMENTAL_PATHS[keys[i % keys.length]],
        col: i % 2 === 0 ? 'rgba(255,220,100,.7)' : 'rgba(192,132,252,.7)',
        sz: 14,
      };
    });
  }, []);

  return (
    <div style={{ position: 'relative', width: PORTAL_SIZE, height: PORTAL_SIZE, flexShrink: 0 }}>

      {/* ════ SVG magic circle ════ */}
      <svg
        width={PORTAL_SIZE} height={PORTAL_SIZE}
        viewBox={`0 0 ${PORTAL_SIZE} ${PORTAL_SIZE}`}
        style={{
          position: 'absolute', top: 0, left: 0,
          pointerEvents: 'none',
          filter: isCharging
            ? 'drop-shadow(0 0 18px rgba(255,220,100,.75)) drop-shadow(0 0 44px rgba(168,85,247,.65))'
            : isUnlocked
            ? 'drop-shadow(0 0 10px rgba(192,132,252,.88)) drop-shadow(0 0 26px rgba(168,85,247,.48))'
            : 'drop-shadow(0 0 5px rgba(168,85,247,.38)) drop-shadow(0 0 14px rgba(168,85,247,.18))',
          animation: isCharging ? 'none' : 'sc-magic-circle-glow 3.2s ease-in-out infinite',
          transition: 'filter .55s ease, opacity .6s ease',
          opacity: isWarping ? 0 : 1,
        }}
        aria-hidden
      >
        <defs>
          <filter id="mc-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.8" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="mc-glow-strong" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="5.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="mc-glow-elem" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Outermost dashed ring + tick marks (r=148) */}
        <g style={{ animation:'sc-spinrev 60s linear infinite', transformOrigin:`${PC}px ${PC}px`, opacity: baseOp, transition:'opacity .6s ease' }}>
          <circle cx={PC} cy={PC} r="148" fill="none" stroke={glowColor} strokeWidth={isUnlocked?1.8:1} strokeDasharray="4 6" opacity=".7" filter="url(#mc-glow)" />
          {Array.from({ length: 36 }, (_, i) => {
            const a = i * 10 * Math.PI / 180;
            const r1 = 144, r2 = i % 3 === 0 ? 136 : 140;
            return <line key={i}
              x1={PC + r1 * Math.cos(a)} y1={PC + r1 * Math.sin(a)}
              x2={PC + r2 * Math.cos(a)} y2={PC + r2 * Math.sin(a)}
              stroke={i % 3 === 0 ? glowColor : 'rgba(192,132,252,.5)'}
              strokeWidth={i % 3 === 0 ? 1.5 : 0.8}
            />;
          })}
        </g>

        {/* ── NEW: Elemental sigils at cardinal/intercardinal points on outer ring ── */}
        <g style={{ animation:'sc-spin 55s linear infinite', transformOrigin:`${PC}px ${PC}px`, opacity: isWarping?0:isUnlocked?.9:.3, transition:'opacity .55s ease' }}>
          {elementalRingItems.map((el, i) => (
            <g key={i} transform={`translate(${el.x},${el.y})`} filter="url(#mc-glow-elem)">
              <path
                d={el.path}
                fill="none"
                stroke={el.col}
                strokeWidth="1.1"
                transform={`scale(0.55)`}
              />
            </g>
          ))}
        </g>

        {/* Outer rune ring r=130 */}
        <g style={{ animation:'sc-spin 45s linear infinite', transformOrigin:`${PC}px ${PC}px`, opacity: baseOp, transition:'opacity .6s ease' }}>
          <circle cx={PC} cy={PC} r="130" fill="none" stroke="rgba(192,132,252,.5)" strokeWidth={isUnlocked?1.5:.8} filter="url(#mc-glow)" />
          {outerRingRunes.map((r, i) => (
            <text key={i} x={r.x} y={r.y} textAnchor="middle" dominantBaseline="middle"
              fontSize={isUnlocked ? 12 : 10}
              fill={isUnlocked ? (i % 4 === 0 ? 'rgba(255,230,163,.95)' : 'rgba(192,132,252,.9)') : 'rgba(192,132,252,.42)'}
              fontFamily="serif"
              transform={`rotate(${r.rot},${r.x},${r.y})`}
              style={{ animation: isUnlocked ? `sc-rune-glow ${1.2+i*.08}s ease-in-out ${i*.05}s infinite alternate` : 'none' }}
            >{r.ch}</text>
          ))}
        </g>

        {/* 12-pointed star polygon */}
        <g style={{ animation:'sc-spinrev 90s linear infinite', transformOrigin:`${PC}px ${PC}px`, opacity: isWarping?0:isUnlocked?.85:.28, transition:'opacity .6s ease' }}>
          {Array.from({ length: 12 }, (_, i) => {
            const a1 = (i * 30) * Math.PI / 180;
            const a2 = ((i * 30) + 15) * Math.PI / 180;
            const r1 = 110;
            return <line key={i}
              x1={PC + r1 * Math.cos(a1 - Math.PI/2)} y1={PC + r1 * Math.sin(a1 - Math.PI/2)}
              x2={PC + r1 * Math.cos(a2 + Math.PI*2/12 - Math.PI/2)} y2={PC + r1 * Math.sin(a2 + Math.PI*2/12 - Math.PI/2)}
              stroke={i % 2 === 0 ? 'rgba(255,230,163,.68)' : 'rgba(192,132,252,.58)'} strokeWidth="1"
              filter="url(#mc-glow)"
            />;
          })}
        </g>

        {/* Hexagon r=100 */}
        <polygon
          points={Array.from({ length: 6 }, (_, i) => {
            const a = i * 60 * Math.PI / 180;
            return `${PC + 100 * Math.cos(a - Math.PI/2)},${PC + 100 * Math.sin(a - Math.PI/2)}`;
          }).join(' ')}
          fill="none"
          stroke={isUnlocked ? 'rgba(255,230,163,.58)' : 'rgba(192,132,252,.22)'}
          strokeWidth={isUnlocked ? 1.5 : .8}
          style={{ animation:'sc-spin 120s linear infinite', transformOrigin:`${PC}px ${PC}px`, opacity: isWarping?0:1, transition:'stroke .55s ease, opacity .55s ease' }}
          filter="url(#mc-glow)"
        />

        {/* ── NEW: Aether sigil at portal centre (idle state) ── */}
        {!isUnlocked && (
          <g style={{ opacity: baseOp * .6, transition:'opacity .6s ease' }}>
            <path
              d={ELEMENTAL_PATHS.aether}
              fill="none"
              stroke="rgba(192,132,252,.35)"
              strokeWidth="1"
              transform={`translate(${PC},${PC}) scale(2.2)`}
              filter="url(#mc-glow)"
              style={{ animation: 'sc-spinrev 70s linear infinite', transformOrigin: `${PC}px ${PC}px` }}
            />
          </g>
        )}

        {/* Inner rune ring r=92 */}
        <g style={{ animation:'sc-spin 30s linear infinite', transformOrigin:`${PC}px ${PC}px`, opacity: baseOp, transition:'opacity .6s ease' }}>
          <circle cx={PC} cy={PC} r="92" fill="none" stroke="rgba(192,132,252,.52)" strokeWidth={isUnlocked?1.5:1} strokeDasharray="2 5" filter="url(#mc-glow)" />
          {midRingRunes.map((r, i) => (
            <text key={i} x={r.x} y={r.y} textAnchor="middle" dominantBaseline="middle"
              fontSize={isUnlocked ? 13 : 10}
              fill={isUnlocked ? (i%3===0 ? 'rgba(255,230,163,1)' : 'rgba(192,132,252,.95)') : 'rgba(192,132,252,.38)'}
              fontFamily="serif"
              transform={`rotate(${r.rot},${r.x},${r.y})`}
              style={{ animation: isUnlocked ? `sc-rune-glow ${1.5+i*.1}s ease-in-out ${i*.07}s infinite alternate` : 'none' }}
            >{r.ch}</text>
          ))}
        </g>

        {/* Triangle of Solomon (up) */}
        <polygon
          points={Array.from({ length: 3 }, (_, i) => {
            const a = (i * 120 - 90) * Math.PI / 180;
            return `${PC + 78 * Math.cos(a)},${PC + 78 * Math.sin(a)}`;
          }).join(' ')}
          fill="rgba(168,85,247,.05)"
          stroke={isUnlocked ? 'rgba(255,230,163,.72)' : 'rgba(192,132,252,.28)'}
          strokeWidth={isUnlocked ? 1.8 : 1}
          style={{ animation:'sc-spinrev 80s linear infinite', transformOrigin:`${PC}px ${PC}px`, opacity: isWarping?0:isUnlocked?1:.48, transition:'opacity .55s ease, stroke .55s ease' }}
          filter="url(#mc-glow)"
        />

        {/* Triangle of Solomon (down) */}
        <polygon
          points={Array.from({ length: 3 }, (_, i) => {
            const a = (i * 120 + 90) * Math.PI / 180;
            return `${PC + 78 * Math.cos(a)},${PC + 78 * Math.sin(a)}`;
          }).join(' ')}
          fill="rgba(168,85,247,.05)"
          stroke={isUnlocked ? 'rgba(192,132,252,.72)' : 'rgba(192,132,252,.22)'}
          strokeWidth={isUnlocked ? 1.8 : 1}
          style={{ animation:'sc-spin 80s linear infinite', transformOrigin:`${PC}px ${PC}px`, opacity: isWarping?0:isUnlocked?1:.38, transition:'opacity .55s ease, stroke .55s ease' }}
          filter="url(#mc-glow)"
        />

        {/* ── NEW: Pentagram inside the triangles ── */}
        {isUnlocked && (() => {
          const ppts = Array.from({ length: 5 }, (_, i) => {
            const a = (i * 72 - 90) * Math.PI / 180;
            return [PC + 58 * Math.cos(a), PC + 58 * Math.sin(a)];
          });
          const porder = [0,2,4,1,3,0];
          const pd = porder.map((pi, i) => `${i===0?'M':'L'}${ppts[pi][0]},${ppts[pi][1]}`).join(' ') + ' Z';
          return (
            <path
              d={pd}
              fill="rgba(168,85,247,.04)"
              stroke={isCharging ? 'rgba(255,220,100,.52)' : 'rgba(192,132,252,.42)'}
              strokeWidth="1.1"
              style={{
                animation:'sc-spin 110s linear infinite',
                transformOrigin:`${PC}px ${PC}px`,
                opacity: isWarping ? 0 : 1,
                transition: 'opacity .5s ease, stroke .45s ease',
              }}
              filter="url(#mc-glow)"
            />
          );
        })()}

        {/* Innermost circle r=56 */}
        <circle cx={PC} cy={PC} r="56"
          fill="none"
          stroke={isUnlocked ? 'rgba(255,230,163,.58)' : 'rgba(192,132,252,.32)'}
          strokeWidth={isUnlocked ? 2 : 1}
          style={{ transition:'stroke .55s ease', opacity: isWarping?0:1 }}
          filter="url(#mc-glow)"
        />

        {/* 8 cardinal nodes on the outer ring */}
        {Array.from({ length: 8 }, (_, i) => {
          const a = i * 45 * Math.PI / 180;
          const x = PC + 130 * Math.cos(a - Math.PI/2);
          const y = PC + 130 * Math.sin(a - Math.PI/2);
          return (
            <g key={i} transform={`translate(${x},${y})`}
              style={{ opacity: isWarping?0:isUnlocked?1:.22, transition:'opacity .55s ease' }}>
              <circle r="5"
                fill={isUnlocked ? (i%2===0 ? 'rgba(255,230,163,.9)' : 'rgba(192,132,252,.9)') : 'rgba(192,132,252,.28)'}
                filter={isUnlocked ? 'url(#mc-glow)' : undefined}
              />
              {isUnlocked && <circle r="8" fill="none" stroke={i%2===0?'rgba(255,230,163,.38)':'rgba(192,132,252,.38)'} strokeWidth="1" />}
            </g>
          );
        })}

        {/* 6 hex vertex symbols */}
        {Array.from({ length: 6 }, (_, i) => {
          const a = i * 60 * Math.PI / 180;
          const x = PC + 100 * Math.cos(a - Math.PI/2);
          const y = PC + 100 * Math.sin(a - Math.PI/2);
          const sym = ['◈','⬡','✦','◈','⊕','✧'][i];
          return (
            <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
              fontSize={isUnlocked ? 14 : 10}
              fill={isUnlocked ? 'rgba(255,230,163,.95)' : 'rgba(192,132,252,.28)'}
              fontFamily="serif"
              style={{ opacity: isWarping?0:isUnlocked?1:.28, transition:'opacity .55s ease, fill .55s ease', animation: isUnlocked?`sc-rune-glow 2.2s ease-in-out ${i*.22}s infinite alternate`:'none' }}
              filter={isUnlocked ? 'url(#mc-glow)' : undefined}
            >{sym}</text>
          );
        })}

        {/* Eye of Providence (appears on unlock) */}
        {isUnlocked && (
          <g style={{ opacity: isWarping?0:1, transition:'opacity .55s ease' }}>
            <ellipse cx={PC} cy={PC} rx="28" ry="16"
              fill="none" stroke="rgba(255,230,163,.58)" strokeWidth="1"
              filter="url(#mc-glow)"
            />
            <circle cx={PC} cy={PC} r="10"
              fill="rgba(168,85,247,.5)" stroke="rgba(192,132,252,.8)" strokeWidth="1"
              filter="url(#mc-glow-strong)"
            />
            <circle cx={PC} cy={PC} r="4" fill="rgba(255,255,255,.92)" filter="url(#mc-glow-strong)" />
          </g>
        )}
      </svg>

      {/* ════ Div orbital rings ════ */}

      {/* Outermost rune orbit ring */}
      <div style={{
        position: 'absolute',
        width: 296, height: 296,
        top: PC - 148, left: PC - 148,
        borderRadius: '50%',
        border: `${isUnlocked?1.5:.5}px solid rgba(192,132,252,${isUnlocked?.42:.12})`,
        animation: 'sc-spinrev 50s linear infinite',
        transition: 'border-color .55s ease, border-width .4s ease',
      }}>
        {isUnlocked && Array.from({ length: 16 }, (_, i) => (
          <span key={i} style={{
            position: 'absolute', left: '50%', top: '50%',
            transform: `translate(-50%,-50%) rotate(${i*22.5}deg) translateY(-147px)`,
            fontFamily: 'serif', fontSize: 11, color: 'rgba(192,132,252,.68)',
            userSelect: 'none',
            textShadow: '0 0 8px rgba(192,132,252,.9)',
          }}>{ELDER_FUTHARK[i]}</span>
        ))}
      </div>

      {/* Three main spinning rings */}
      <div style={ringStyle(272, '#7c3aed55 #a855f7 #7c3aed55 #6d28d9', 18, false)} />
      <div style={ringStyle(246, '#ffe6a355 #ffe6a3 #ffe6a355 #fbbf24', 13, true)} />
      <div style={ringStyle(220, '#c084fc #7c3aed55 #a855f7 #7c3aed55', 23, false)} />

      {/* Inner sacred geometry dashed ring */}
      <div style={{
        position: 'absolute',
        width: 202, height: 202,
        top: PC - 101, left: PC - 101,
        borderRadius: '50%',
        border: `${isUnlocked?1.5:1}px dashed rgba(192,132,252,${isUnlocked?.48:.16})`,
        animation: 'sc-spin 65s linear infinite',
        transition: 'border .55s ease',
      }} />

      {/* Portal eye — innermost orb */}
      <div style={{
        position: 'absolute',
        width: 190, height: 190,
        top: PC - 95, left: PC - 95,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 40% 35%,#3b0764 0%,#1e0540 40%,#0a0118 76%,#030107 100%)',
        boxShadow: eyeGlow,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        animation: phase === 'unlocking' ? 'sc-eye-open .62s cubic-bezier(.34,1.2,.64,1) forwards' : 'none',
        transition: 'box-shadow .5s ease',
      }}>
        <div style={{
          position: 'absolute', width: 190, height: 190, borderRadius: '50%',
          animation: 'sc-spinrev 28s linear infinite',
          opacity: isUnlocked ? .58 : .22,
          fontFamily: 'serif', fontSize: 11, color: '#c084fc',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          userSelect: 'none', transition: 'opacity .55s ease',
          textShadow: isUnlocked ? '0 0 8px rgba(192,132,252,.8)' : 'none',
        }}>ᚠ ᚢ ᚦ ᚨ ᚱ ᚲ ᚷ ᚹ ᚺ ᚾ ᛁ ᛃ ᛇ ᛈ ᛉ ᛊ ᛏ ᛒ ᛖ ᛗ ᛚ ᛜ ᛞ ᛟ</div>
        <div style={{
          position: 'absolute', width: 128, height: 128, borderRadius: '50%',
          animation: 'sc-spin 19s linear infinite',
          opacity: isUnlocked ? .48 : 0,
          fontFamily: 'serif', fontSize: 9, color: '#ffe6a3',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          userSelect: 'none', transition: 'opacity .45s ease',
          textShadow: '0 0 6px rgba(255,230,163,.7)',
        }}>✦ ᛟ ◈ ⬡ ✦ ᛁ ◈ ⊕ ✦ ᛊ ⬡ ⊗ ✦ ᛒ ◈</div>
        <div style={{
          width: coreSize, height: coreSize, borderRadius: '50%',
          background: coreBg,
          animation: phase === 'unlocking'
            ? 'sc-core-ignite .65s cubic-bezier(.34,1.2,.64,1) forwards'
            : 'sc-pulse 2.6s ease-in-out infinite',
          transition: 'width .4s cubic-bezier(.34,1.56,.64,1), height .4s cubic-bezier(.34,1.56,.64,1), background .5s ease',
        }} />
      </div>
    </div>
  );
}

// ─── Vortex warp overlay ──────────────────────────────────────────────────────
function VortexOverlay({ phase }) {
  if (phase !== 'warping') return null;

  return (
    <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none', zIndex:5 }} aria-hidden>
      {[1,2,3,4].map(n => (
        <div key={n} style={{
          position: 'absolute', top: '50%', left: '50%',
          width: `${n * 130}vmax`, height: `${n * 130}vmax`,
          borderRadius: '50%',
          border: `1.5px solid rgba(168,85,247,${.38 - n*.08})`,
          transform: 'translate(-50%,-50%)',
          animation: `sc-warp-ring ${.55+n*.12}s cubic-bezier(.2,.8,.4,1) ${n*.06}s forwards`,
        }} />
      ))}
      {[0,1,2,3,4,5].map(n => (
        <div key={n} style={{
          position: 'absolute', top: `${38+n*5}%`, left: 0, right: 0,
          height: 1,
          background: `linear-gradient(to right,transparent,rgba(168,85,247,${.32-n*.04}),transparent)`,
          animation: `sc-horizon .55s ease-out ${n*.05}s forwards`,
        }} />
      ))}
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function IntroScreen({ onFinish }) {
  const [phase,   setPhase]   = useState('idle');
  const [hovered, setHovered] = useState(false);

  useCinzelFont();
  useInjectKeyframes();

  const handleEnter = () => {
    if (phase !== 'idle') return;
    setPhase('unlocking');
    setTimeout(() => setPhase('unlocked'),  550);
    setTimeout(() => setPhase('charging'), 1150);
    setTimeout(() => setPhase('warping'),  1680);
    setTimeout(() => setPhase('white'),    2500);
    setTimeout(() => onFinish?.(),         2800);
  };

  const isWarping  = phase === 'warping' || phase === 'white';
  const isWhite    = phase === 'white';
  const isCharging = phase === 'charging';
  const isIdle     = phase === 'idle';
  const burstActive = ['unlocked','charging'].includes(phase);

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: isWhite
        ? '#fff'
        : 'radial-gradient(ellipse 80% 70% at 50% 44%, #1f0940 0%, #0d0222 44%, #040010 74%, #010006 100%)',
      zIndex: 1000000,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
      transition: isWhite ? 'background .38s ease-in' : 'none',
    }} role="main" aria-label="Sanctum entrance">

      <Stars phase={phase} />
      <FloatingRunes />
      <DriftingElementalSigils />
      <CornerElementalSigils />
      <BackgroundPentagram phase={phase} />
      <EnochianPanels phase={phase} />
      <AncientInscriptionBand phase={phase} />

      {/* Vignettes */}
      <div style={{ position:'absolute', bottom:0, left:0, right:0, height:150, background:'linear-gradient(to top,rgba(8,1,20,.4) 0%,rgba(8,1,20,.12) 55%,transparent 100%)', pointerEvents:'none' }} aria-hidden />
      <div style={{ position:'absolute', top:0, left:0, right:0, height:110, background:'linear-gradient(to bottom,rgba(1,0,6,.42),transparent)', pointerEvents:'none' }} aria-hidden />

      {/* Warp + burst overlays */}
      <VortexOverlay phase={phase} />
      <RuneBurstOverlay active={burstActive} />

      {/* ── Main content column ── */}
      <div style={{
        position: 'relative', zIndex: 10,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center',
        transition: isWarping
          ? 'transform .75s cubic-bezier(.6,0,1,.45), opacity .58s ease'
          : isCharging
          ? 'transform .4s ease, opacity .4s ease'
          : 'none',
        transform: isWarping ? 'scale(.03)' : isCharging ? 'scale(.96)' : 'scale(1)',
        opacity: isWarping ? 0 : 1,
      }}>

        {/* Lock + Portal */}
        <div style={{ position: 'relative', marginBottom: 32 }}>
          <LockIcon phase={phase} />
          <Portal phase={phase} />
        </div>

        {/* Text block */}
        <div style={{
          textAlign: 'center',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 10,
          marginBottom: 36,
        }}>
          {/* Divider with elemental symbols */}
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
            <div style={{ width:38, height:1, background:'linear-gradient(to left,rgba(168,85,247,.32),transparent)' }} aria-hidden />
            <span style={{ fontFamily:'serif', fontSize:12, color:'rgba(255,220,100,.45)', textShadow:'0 0 8px rgba(255,220,100,.3)' }} aria-hidden>✦</span>
            <div style={{ width:38, height:1, background:'linear-gradient(to right,rgba(168,85,247,.32),transparent)' }} aria-hidden />
          </div>

          <p style={{
            fontFamily: "'Cinzel',serif",
            fontSize: 10, letterSpacing: '.42em',
            color: 'rgba(255,230,163,.42)',
            textTransform: 'uppercase', margin: 0,
          }}>ARCANE SURVIVAL</p>
          <h1 style={{
            fontFamily: "'Cinzel Decorative',serif",
            fontSize: 'clamp(22px,4.5vw,32px)', fontWeight: 700,
            color: '#ffe6a3',
            textShadow: '0 0 28px rgba(251,191,36,.48), 0 0 56px rgba(251,191,36,.16)',
            letterSpacing: '.06em', lineHeight: 1.25, margin: 0,
          }}>THE LAST COVENANT</h1>

          {/* Ancient text line */}
          <p style={{
            fontFamily: 'serif', fontSize: 10,
            letterSpacing: '.22em', color: 'rgba(192,132,252,.38)',
            margin: 0,
            '--at-op': '.38',
            animation: 'sc-ancient-text-fade 8s ease-in-out infinite',
          }} aria-hidden>ᚦᚨᛏ ᚹᚺᛁᚲᚺ ᛚᛁᛖᛊ ᛒᛖᛃᛟᚾᛞ</p>

          <p style={{
            fontFamily: 'serif', fontSize: 13,
            letterSpacing: '.28em', color: 'rgba(168,85,247,.52)',
            margin: 0,
          }} aria-hidden>ᛟ ✦ ᛟ</p>

          {/* Elemental row */}
          <div style={{ display:'flex', gap:16, alignItems:'center', marginTop:2 }} aria-hidden>
            {Object.entries(ELEMENTAL_PATHS).map(([name, path], i) => (
              <svg key={name} width="18" height="18" viewBox="-28 -28 56 56" style={{ overflow:'visible', opacity:.35 }}>
                <path d={path} fill="none"
                  stroke={['rgba(255,140,60,.8)','rgba(80,160,255,.8)','rgba(192,132,252,.8)','rgba(120,200,80,.8)','rgba(255,220,100,.8)'][i]}
                  strokeWidth="1.8"
                />
              </svg>
            ))}
          </div>
        </div>

        {/* Button */}
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <button
            style={{
              position: 'relative',
              fontFamily: "'Cinzel',serif",
              fontSize: 13, letterSpacing: '.18em',
              color: '#ffe6a3', background: 'transparent',
              border: '1px solid rgba(255,230,163,.26)',
              borderRadius: 1, padding: '16px 52px',
              cursor: isIdle ? 'pointer' : 'default',
              outline: 'none',
              transition: 'color .38s ease, border-color .38s ease, box-shadow .38s ease, transform .28s ease',
              boxShadow: '0 0 12px rgba(255,230,163,.05), inset 0 0 12px rgba(255,230,163,.03)',
              opacity: isIdle ? 1 : 0,
              pointerEvents: isIdle ? 'auto' : 'none',
              ...(hovered && isIdle ? {
                color: '#fff',
                textShadow: '0 0 18px rgba(255,230,163,.88)',
                borderColor: 'rgba(255,230,163,.58)',
                boxShadow: '0 0 30px rgba(255,230,163,.15), 0 0 60px rgba(255,230,163,.07), inset 0 0 26px rgba(255,230,163,.07)',
                transform: 'translateY(-2px)',
              } : {}),
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={handleEnter}
            aria-label="Enter the Sanctum"
          >
            <CornerBrackets />
            Enter the Sanctum
          </button>
        </div>
      </div>
    </div>
  );
}
