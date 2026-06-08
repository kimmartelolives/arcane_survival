
import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════════════
//  ★  SUPABASE CONFIG  ★
// ═══════════════════════════════════════════════════════════
const SUPABASE_URL  = 'https://yckqvvczamglcvhvpkcn.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlja3F2dmN6YW1nbGN2aHZwa2NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MDU0ODEsImV4cCI6MjA5NjQ4MTQ4MX0.ujW23KtsdD4qbVr_3W6j4KJRO8bzZ_zZHPivSvnu0Qw';
const HAS_SUPABASE = !!(SUPABASE_URL && SUPABASE_ANON);

const W = 900, H = 560;

// ── Supabase helpers ──
async function sbGet(path) {
  try {
    const r = await fetch(SUPABASE_URL + path, { headers: { apikey: SUPABASE_ANON, Authorization: 'Bearer ' + SUPABASE_ANON } });
    return r.ok ? r.json() : null;
  } catch { return null; }
}
async function sbPost(path, body) {
  try {
    const r = await fetch(SUPABASE_URL + path, { method: 'POST', headers: { apikey: SUPABASE_ANON, Authorization: 'Bearer ' + SUPABASE_ANON, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(body) });
    return r.ok;
  } catch { return false; }
}
function sbRealtime(channelName, onMsg) {
  if (!HAS_SUPABASE) return { send: () => {}, close: () => {} };
  const wsUrl = SUPABASE_URL.replace('https://', 'wss://').replace('http://', 'ws://') + '/realtime/v1/websocket?apikey=' + SUPABASE_ANON + '&vsn=1.0.0';
  const ws = new WebSocket(wsUrl);
  ws.onopen = () => {
    ws.send(JSON.stringify({ topic: 'realtime:' + channelName, event: 'phx_join', payload: { config: { broadcast: { self: false }, presence: { key: '' } } }, ref: '1' }));
  };
  ws.onmessage = e => {
    try { const d = JSON.parse(e.data); if (d.event === 'broadcast' && d.payload?.event) onMsg(d.payload.event, d.payload.payload); } catch {}
  };
  ws.onerror = () => {};
  return {
    send: (event, payload) => {
      if (ws.readyState === 1) ws.send(JSON.stringify({ topic: 'realtime:' + channelName, event: 'broadcast', payload: { event, payload }, ref: '' + Date.now() }));
    },
    close: () => ws.close()
  };
}

function escHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

// ── Game constants ──
const ET = [
  { r: 13, speed: 65, hp: 30, dmg: 8, xp: 15, color: '#e2e8f0', glow: '#94a3b8', boss: false },
  { r: 11, speed: 105, hp: 20, dmg: 12, xp: 20, color: '#fb923c', glow: '#f97316', boss: false },
  { r: 14, speed: 135, hp: 55, dmg: 20, xp: 35, color: '#818cf8', glow: '#6366f1', boss: false },
  { r: 27, speed: 50, hp: 260, dmg: 30, xp: 100, color: '#fbbf24', glow: '#f59e0b', boss: true },
];
const ALLUPS = [
  { name: 'Multi Bolt', icon: '✦', desc: '+1 bolt per cast', fn: p => ({ ...p, multiShot: p.multiShot + 1 }) },
  { name: 'Rapid Fire', icon: '⚡', desc: 'Fire rate +30%', fn: p => ({ ...p, shootRate: p.shootRate * 0.7 }) },
  { name: 'Fleet Foot', icon: '💨', desc: 'Move speed +25%', fn: p => ({ ...p, speed: p.speed * 1.25 }) },
  { name: 'Vitality', icon: '❤', desc: 'Max HP +50 & healed', fn: p => ({ ...p, maxHp: p.maxHp + 50, hp: Math.min(p.hp + 50, p.maxHp + 50) }) },
  { name: 'Arcane Might', icon: '🔮', desc: 'Bolt damage +40%', fn: p => p, boltMult: 1.4 },
];
function getRandUps() { return [...ALLUPS].sort(() => Math.random() - .5).slice(0, 3); }
function mkPlayer(x, y) { return { x: x || W / 2, y: y || H / 2, r: 16, speed: 200, hp: 100, maxHp: 100, xp: 0, xpNext: 80, level: 1, shootCd: 0, shootRate: .6, multiShot: 1, inv: 0, dead: false }; }

// ─────────────────────────────────────────────────────────────
//  CHAT BUBBLE component
// ─────────────────────────────────────────────────────────────
function ChatBubble({ msg, side }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(t);
  }, []);
  if (!visible) return null;
  return (
    <div style={{
      position: 'absolute',
      bottom: '100%', left: side === 'left' ? 0 : 'auto', right: side === 'right' ? 0 : 'auto',
      marginBottom: 4, background: 'rgba(76,29,149,.92)', border: '1px solid rgba(196,181,253,.3)',
      borderRadius: 8, padding: '4px 10px', fontSize: '.7rem', color: '#e2e8f0',
      whiteSpace: 'nowrap', maxWidth: 200, fontFamily: "'Share Tech Mono',monospace",
      animation: 'fadeInUp .2s ease', pointerEvents: 'none', zIndex: 70,
      overflow: 'hidden', textOverflow: 'ellipsis'
    }}>
      {msg}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  CHAT PANEL (bottom of game frame)
// ─────────────────────────────────────────────────────────────
function ChatPanel({ messages, onSend, canvasRef }) {
  const [input, setInput] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const msgsRef = useRef(null);

  useEffect(() => { if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight; }, [messages]);

  function send() {
    const msg = input.trim();
    if (!msg) return;
    setInput('');
    onSend(msg);
  }

  return (
    <div style={{
      background: 'rgba(8,5,20,.92)', border: '1px solid rgba(139,92,246,.28)',
      borderTop: 'none', borderRadius: '0 0 6px 6px', display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div
        onClick={() => setCollapsed(c => !c)}
        style={{
          padding: '5px 12px', background: 'rgba(76,29,149,.3)', borderTop: '1px solid rgba(139,92,246,.28)',
          fontSize: '.62rem', letterSpacing: '.15em', color: '#a78bfa', textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none'
        }}
      >
        <span>💬 Party Chat</span>
        <span style={{ fontSize: '.75rem' }}>{collapsed ? '▲' : '▼'}</span>
      </div>
      {!collapsed && (
        <>
          <div ref={msgsRef} style={{
            maxHeight: 100, overflowY: 'auto', padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 3,
            scrollbarWidth: 'thin'
          }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                fontSize: '.7rem', lineHeight: 1.4, fontFamily: "'Share Tech Mono',monospace",
                color: m.type === 'sys' ? 'rgba(167,139,250,.55)' : '#c4b5fd',
                fontStyle: m.type === 'sys' ? 'italic' : 'normal'
              }}>
                {m.type !== 'sys' && <span style={{ fontWeight: 'bold', color: m.type === 'mine' ? '#fde68a' : '#fb923c' }}>{m.name}: </span>}
                {m.text}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', borderTop: '1px solid rgba(139,92,246,.18)' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Type a message…"
              maxLength={80}
              autoComplete="off"
              style={{
                flex: 1, background: 'rgba(10,6,30,.7)', border: 'none', padding: '6px 10px',
                fontFamily: "'Share Tech Mono',monospace", fontSize: '.72rem', color: '#e2e8f0', outline: 'none'
              }}
            />
            <button
              onClick={send}
              style={{
                background: 'rgba(76,29,149,.4)', border: 'none', borderLeft: '1px solid rgba(139,92,246,.28)',
                padding: '0 12px', color: '#a78bfa', cursor: 'pointer', fontSize: '.9rem'
              }}
            >➤</button>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  UPGRADE MODAL (separate DOM element, clickable for player 2)
// ─────────────────────────────────────────────────────────────
function UpgradeModal({ upgrades, onPick }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(3,1,17,.78)', zIndex: 80, flexDirection: 'column', gap: 16
    }}>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: 'clamp(1.2rem,3vw,1.6rem)', color: '#fde68a', textShadow: '0 0 20px rgba(251,191,36,.7)', marginBottom: 4 }}>
          ⬆ LEVEL UP — Choose Upgrade
        </div>
        <div style={{ fontSize: '.72rem', color: '#a78bfa', fontFamily: "'Share Tech Mono',monospace" }}>
          Click an upgrade card or press 1 / 2 / 3
        </div>
      </div>
      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', justifyContent: 'center' }}>
        {upgrades.map((u, i) => (
          <button
            key={i}
            onClick={() => onPick(i)}
            style={{
              width: 180, padding: '22px 16px', background: 'rgba(76,29,149,.75)',
              border: '1.5px solid #7c3aed', borderRadius: 12, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              transition: 'all .15s', fontFamily: "'Cinzel',serif",
              boxShadow: '0 0 18px rgba(109,40,217,.3)'
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#c4b5fd'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(139,92,246,.45)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 0 18px rgba(109,40,217,.3)'; }}
          >
            <span style={{ fontSize: '2rem' }}>{u.icon}</span>
            <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '.9rem', letterSpacing: '.05em' }}>{u.name}</span>
            <span style={{ color: '#a78bfa', fontSize: '.75rem', textAlign: 'center' }}>{u.desc}</span>
            <span style={{ color: '#fbbf24', fontSize: '.72rem', fontFamily: "'Share Tech Mono',monospace" }}>[{i + 1}]</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  MAIN GAME COMPONENT
// ─────────────────────────────────────────────────────────────
export default function ArcanalSurvival() {
  // ── UI State ──
  const [screen, setScreen] = useState('menu'); // 'menu'|'coop'|'lobby'|'playing'|'gameover'|'lb'
  const [coopNameInput, setCoopNameInput] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [lobbyCode, setLobbyCode] = useState('');
  const [lobbyP2Status, setLobbyP2Status] = useState('');
  const [toastMsg, setToastMsg] = useState({ text: '', err: false, id: 0 });
  const [pingMs, setPingMs] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatBubbles, setChatBubbles] = useState({ p1: null, p2: null });
  const [goData, setGoData] = useState(null);
  const [goName, setGoName] = useState('');
  const [submitStatus, setSubmitStatus] = useState('');
  const [lbData, setLbData] = useState(null);
  const [lbLoading, setLbLoading] = useState(false);
  // In-game overlay states (rendered over canvas)
  const [showPause, setShowPause] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeChoices, setUpgradeChoices] = useState([]);

  // ── Canvas ──
  const canvasRef = useRef(null);

  // ── Game engine refs (mutable, not React state) ──
  const G = useRef({
    gs: 'menu', score: 0, hi: 0, wave: 1, waveT: 0, waveLen: 30, spawnT: 0, spawnRate: 2, boltDmg: 22,
    p: null, p2: null, bullets: [], enemies: [], particles: [], gems: [], ambs: [],
    isCoop: false, isHost: false, coopChannel: null, coopName: 'Wizard', p2Name: 'Player 2',
    p2Input: { x: 0, y: 0 },
    syncT: 0, inputSendT: 0, pingStart: 0,
    p2Target: { x: W * 2 / 3, y: H / 2, hp: 100, maxHp: 100, inv: 0, dead: false },
    p2Render: { x: W * 2 / 3, y: H / 2, hp: 100, maxHp: 100, inv: 0 },
    floorPat: null, keys: {}, touchDir: { x: 0, y: 0 }, touchStart: null,
    last: 0,
    // Callbacks to React
    onGameOver: null, onOfferUpgrade: null, onPingUpdate: null, onChatMsg: null, onChatBubble: null,
  }).current;

  const toastTimerRef = useRef(null);
  const rafRef = useRef(null);

  // ── Toast ──
  function showToast(text, err = false) {
    clearTimeout(toastTimerRef.current);
    setToastMsg({ text, err, id: Date.now() });
    toastTimerRef.current = setTimeout(() => setToastMsg(m => ({ ...m, text: '' })), 3000);
  }

  // ── Setup canvas floor pattern ──
  function mkFloor(ctx) {
    const oc = document.createElement('canvas'); oc.width = oc.height = 60;
    const ox = oc.getContext('2d');
    ox.fillStyle = '#0a061e'; ox.fillRect(0, 0, 60, 60);
    ox.strokeStyle = 'rgba(139,92,246,0.07)'; ox.lineWidth = .5; ox.strokeRect(0, 0, 60, 60);
    ox.strokeStyle = 'rgba(139,92,246,0.025)'; ox.strokeRect(5, 5, 50, 50);
    return ctx.createPattern(oc, 'repeat');
  }
  function mkAmbs() {
    G.ambs = Array.from({ length: 55 }, () => ({
      x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.8 + .4,
      vx: (Math.random() - .5) * 12, vy: -(Math.random() * 18 + 4),
      a: Math.random() * .5 + .15, t: Math.random(),
      c: ['#c4b5fd', '#818cf8', '#a78bfa', '#7c3aed'][Math.random() * 4 | 0]
    }));
  }

  // ── Spawn ──
  function spawnEnemy(ti) {
    const t = ET[ti], side = Math.random() * 4 | 0;
    let ex, ey;
    if (side === 0) { ex = Math.random() * W; ey = -30; }
    else if (side === 1) { ex = W + 30; ey = Math.random() * H; }
    else if (side === 2) { ex = Math.random() * W; ey = H + 30; }
    else { ex = -30; ey = Math.random() * H; }
    G.enemies.push({ x: ex, y: ey, r: t.r, speed: t.speed + (G.wave - 1) * 5, hp: t.hp + (G.wave - 1) * 10, maxHp: t.hp + (G.wave - 1) * 10, dmg: t.dmg, xp: t.xp, color: t.color, glow: t.glow, boss: t.boss, flash: 0 });
  }

  function emit(x, y, color, n, spd, life) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = (.5 + Math.random() * .5) * spd;
      G.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, color, life, ml: life, r: Math.random() * 3 + 1 });
    }
  }

  // ── Coop channel ──
  function setupCoopChannel(roomCode) {
    if (!HAS_SUPABASE) { showToast('No Supabase config', true); return null; }
    const ch = sbRealtime('coop-' + roomCode, (event, payload) => {

      // HOST receives guest input
      if (event === 'guest_input' && G.isHost) {
        G.p2Input.x = payload.x || 0;
        G.p2Input.y = payload.y || 0;
      }

      // GUEST receives full authoritative state from host
      if (event === 'state_sync' && !G.isHost) {
        if (G.gs === 'playing' || G.gs === 'levelup') {
          // FIX: Full enemy/gem/bullet replacement with proper object reconstruction
          if (payload.enemies) G.enemies = payload.enemies.map(e => ({ ...e }));
          if (payload.gems) G.gems = payload.gems.map(g => ({ ...g }));
          if (payload.bullets) G.bullets = payload.bullets.map(b => ({ ...b }));
          if (payload.score !== undefined) G.score = payload.score;
          if (payload.wave !== undefined) G.wave = payload.wave;
          if (payload.waveT !== undefined) G.waveT = payload.waveT;
          if (payload.waveLen) G.waveLen = payload.waveLen;
          if (payload.boltDmg !== undefined) G.boltDmg = payload.boltDmg;
          // Host wizard shown as p2 on guest screen
          if (payload.p1) {
            G.p2Target.x = payload.p1.x;
            G.p2Target.y = payload.p1.y;
            G.p2Target.hp = payload.p1.hp;
            G.p2Target.maxHp = payload.p1.maxHp;
            G.p2Target.inv = payload.p1.inv;
            G.p2Target.dead = payload.p1.dead || false;
          }
          // FIX: Sync guest's own authoritative stats from host (damage, level)
          if (payload.p2 && G.p) {
            G.p.hp = payload.p2.hp;
            G.p.maxHp = payload.p2.maxHp;
            G.p.xp = payload.p2.xp !== undefined ? payload.p2.xp : G.p.xp;
            G.p.xpNext = payload.p2.xpNext !== undefined ? payload.p2.xpNext : G.p.xpNext;
            G.p.level = payload.p2.level !== undefined ? payload.p2.level : G.p.level;
            G.p.dead = payload.p2.dead || false;
            if (G.p.dead && G.gs === 'playing') G.p.hp = 0;
          }
        }
        if (payload._pingTs) {
          const ms = Math.round(performance.now() - payload._pingTs);
          G.onPingUpdate && G.onPingUpdate(ms);
        }
      }

      // FIX: Guest receives levelup offer — show React modal (fully clickable)
      if (event === 'offer_levelup' && !G.isHost) {
        G.pendingUps = payload.ups;
        G.onOfferUpgrade && G.onOfferUpgrade(payload.ups);
      }

      if (event === 'guest_joined') {
        const guestName = payload.name || 'Player 2';
        G.p2Name = guestName;
        setLobbyP2Status('✦ ' + guestName + ' has joined! Starting…');
        setTimeout(() => {
          startGame(true, true);
          ch.send('start_game', { p1Name: G.coopName });
        }, 1200);
      }

      if (event === 'start_game' && !G.isHost) {
        G.p2Name = payload.p1Name || 'Host';
        startGame(true, false);
      }

      if (event === 'game_over') {
        if (G.gs === 'playing' || G.gs === 'levelup') triggerGameOver();
      }

      // FIX: Map sync - broadcast map seed so both players see same layout
      if (event === 'map_seed' && !G.isHost) {
        if (payload.seed !== undefined) mkAmbsWithSeed(payload.seed);
      }

      if (event === 'chat') {
        G.onChatMsg && G.onChatMsg(payload.name, payload.msg);
        G.onChatBubble && G.onChatBubble('p2', payload.name + ': ' + payload.msg);
      }

      if (event === 'ping_req' && G.isHost) {
        ch.send('state_sync', {
          _pingTs: payload.ts,
          enemies: [], gems: [], bullets: [],
          score: G.score, wave: G.wave, waveT: G.waveT, waveLen: G.waveLen, boltDmg: G.boltDmg,
          p1: G.p ? { x: G.p.x, y: G.p.y, hp: G.p.hp, maxHp: G.p.maxHp, inv: G.p.inv, dead: G.p.dead } : null,
          p2: G.p2 ? { hp: G.p2.hp, maxHp: G.p2.maxHp, xp: G.p2.xp, xpNext: G.p2.xpNext, level: G.p2.level, dead: G.p2.dead } : null
        });
      }
    });
    return ch;
  }

  function mkAmbsWithSeed(seed) {
    // Seeded random for synchronized map ambience
    let s = seed;
    function rand() { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; }
    G.ambs = Array.from({ length: 55 }, () => ({
      x: rand() * W, y: rand() * H, r: rand() * 1.8 + .4,
      vx: (rand() - .5) * 12, vy: -(rand() * 18 + 4),
      a: rand() * .5 + .15, t: rand(),
      c: ['#c4b5fd', '#818cf8', '#a78bfa', '#7c3aed'][rand() * 4 | 0]
    }));
  }

  // ── Start game ──
  function startGame(coop = false, host = false) {
    G.gs = 'playing';
    G.score = 0; G.wave = 1; G.waveT = 0; G.waveLen = 30;
    G.spawnT = 0; G.spawnRate = 2; G.boltDmg = 22;
    G.isCoop = coop; G.isHost = host;
    G.p2 = null;
    G.bullets = []; G.enemies = []; G.particles = []; G.gems = [];
    G.p2Input = { x: 0, y: 0 };
    G.syncT = 0; G.inputSendT = 0;
    G.p2Target = { x: W * 2 / 3, y: H / 2, hp: 100, maxHp: 100, inv: 0, dead: false };
    G.p2Render = { x: W * 2 / 3, y: H / 2, hp: 100, maxHp: 100, inv: 0 };
    G.p = mkPlayer(coop ? W / 3 : W / 2, H / 2);
    if (coop) {
      G.p2 = mkPlayer(W * 2 / 3, H / 2);
    }
    const seed = Date.now() & 0xffffff;
    mkAmbsWithSeed(seed);
    // Broadcast map seed to guest so they have the same ambience layout
    if (coop && host && G.coopChannel) {
      G.coopChannel.send('map_seed', { seed });
    }
    setShowPause(false);
    setShowUpgrade(false);
    setChatMessages([{ type: 'sys', text: 'Connected to party!' }]);
    setChatBubbles({ p1: null, p2: null });
    setScreen('playing');
  }

  function triggerGameOver() {
    G.gs = 'gameover';
    G.hi = Math.max(G.hi, G.score);
    if (G.coopChannel) { G.coopChannel.close(); G.coopChannel = null; }
    setShowUpgrade(false);
    setGoData({ score: G.score, wave: G.wave, level: G.p?.level || 1, isCoop: G.isCoop, hi: G.hi });
    setGoName(G.coopName !== 'Wizard' ? G.coopName : '');
    setSubmitStatus('');
    setScreen('gameover');
  }

  // ── Upgrade pick (works for both host and guest) ──
  function pickUpgrade(i) {
    const ups = G.pendingUps;
    if (!ups || !ups[i]) return;
    const up = ups[i];
    // Apply to local player (G.p)
    if (up.fn) G.p = up.fn(G.p);
    if (up.boltMult) G.boltDmg *= up.boltMult;
    // FIX: Tell host which upgrade guest picked so host can sync stats
    if (G.isCoop && !G.isHost && G.coopChannel) {
      G.coopChannel.send('guest_upgrade', { i, level: G.p.level });
    }
    G.gs = 'playing';
    G.pendingUps = null;
    setShowUpgrade(false);
  }

  // ── Host-side upgrade modal (for host player) ──
  function pickHostUpgrade(i) {
    const ups = G.pendingUps;
    if (!ups || !ups[i]) return;
    const up = ups[i];
    if (up.fn) G.p = up.fn(G.p);
    if (up.boltMult) G.boltDmg *= up.boltMult;
    G.gs = 'playing';
    G.pendingUps = null;
    setShowUpgrade(false);
  }

  // ── Game loop ──
  const updateRef = useRef(null);
  const renderRef = useRef(null);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    G.floorPat = mkFloor(ctx);
    mkAmbs();

    // ── Canvas resize ──
    function fit() {
      const sx = (window.innerWidth - 12) / W, sy = (window.innerHeight - 120) / H, s = Math.min(sx, sy, 1.8);
      cv.style.width = Math.round(W * s) + 'px';
      cv.style.height = Math.round(H * s) + 'px';
    }
    fit();
    window.addEventListener('resize', fit);

    // ── Input ──
    function onKeyDown(e) {
      G.keys[e.key] = true;
      if (G.gs === 'playing' && (e.key === 'Escape' || e.key === 'p' || e.key === 'P')) {
        G.gs = 'paused';
        setShowPause(true);
      }
      if (G.gs === 'paused' && (e.key === 'Escape' || e.key === 'p' || e.key === 'P')) {
        G.gs = 'playing';
        setShowPause(false);
      }
      // FIX: Keyboard upgrade picks work even as guest (now handled by React modal keydown)
      if (G.gs === 'levelup' && G.pendingUps) {
        if (e.key === '1') { G.isCoop && !G.isHost ? pickUpgrade(0) : pickHostUpgrade(0); }
        if (e.key === '2') { G.isCoop && !G.isHost ? pickUpgrade(1) : pickHostUpgrade(1); }
        if (e.key === '3') { G.isCoop && !G.isHost ? pickUpgrade(2) : pickHostUpgrade(2); }
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key) && (G.gs === 'playing' || G.gs === 'levelup')) e.preventDefault();
    }
    function onKeyUp(e) { G.keys[e.key] = false; }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Touch
    cv.addEventListener('touchstart', e => { G.touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY }; e.preventDefault(); }, { passive: false });
    cv.addEventListener('touchmove', e => {
      if (!G.touchStart) return;
      const dx = e.touches[0].clientX - G.touchStart.x, dy = e.touches[0].clientY - G.touchStart.y, l = Math.hypot(dx, dy);
      if (l > 8) { G.touchDir.x = dx / l; G.touchDir.y = dy / l; } e.preventDefault();
    }, { passive: false });
    cv.addEventListener('touchend', e => { G.touchDir.x = 0; G.touchDir.y = 0; G.touchStart = null; e.preventDefault(); }, { passive: false });

    // ── Helpers ──
    function gl(c, b) { ctx.shadowColor = c; ctx.shadowBlur = b; }
    function ng() { ctx.shadowBlur = 0; }
    function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h + r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath(); }

    // ── UPDATE ──
    function update(dt) {
      if (G.gs !== 'playing' && G.gs !== 'levelup') return;

      // During levelup: world still runs
      if (G.gs === 'levelup') {
        updateWorld(dt);
        return;
      }

      G.waveT += dt; G.spawnT += dt;

      if (!G.isCoop || G.isHost) {
        if (G.spawnT >= G.spawnRate) {
          G.spawnT = 0; G.spawnRate = Math.max(.35, 2 - G.wave * .12);
          const cnt = 1 + (G.wave / 4 | 0), pool = G.wave < 2 ? [0] : G.wave < 4 ? [0, 1] : [0, 1, 2];
          for (let i = 0; i < cnt; i++) spawnEnemy(pool[Math.random() * pool.length | 0]);
        }
        if (G.waveT >= G.waveLen) {
          G.waveT = 0; G.wave++;
          G.waveLen = Math.max(15, 30 - G.wave * .8);
          if (G.wave % 3 === 0) spawnEnemy(3);
        }
      }

      // P1 input
      let mx = 0, my = 0;
      if (G.keys['ArrowLeft'] || G.keys['a'] || G.keys['A']) mx -= 1;
      if (G.keys['ArrowRight'] || G.keys['d'] || G.keys['D']) mx += 1;
      if (G.keys['ArrowUp'] || G.keys['w'] || G.keys['W']) my -= 1;
      if (G.keys['ArrowDown'] || G.keys['s'] || G.keys['S']) my += 1;
      mx += G.touchDir.x; my += G.touchDir.y;
      const ml = Math.hypot(mx, my); if (ml > 1) { mx /= ml; my /= ml; }
      if (G.p && !G.p.dead) {
        G.p.x = Math.max(G.p.r, Math.min(W - G.p.r, G.p.x + mx * G.p.speed * dt));
        G.p.y = Math.max(G.p.r, Math.min(H - G.p.r, G.p.y + my * G.p.speed * dt));
        if (G.p.inv > 0) G.p.inv -= dt;
      }

      // Host drives p2 from guest input
      if (G.isCoop && G.p2 && G.isHost && !G.p2.dead) {
        G.p2.x = Math.max(G.p2.r, Math.min(W - G.p2.r, G.p2.x + G.p2Input.x * G.p2.speed * dt));
        G.p2.y = Math.max(G.p2.r, Math.min(H - G.p2.r, G.p2.y + G.p2Input.y * G.p2.speed * dt));
        if (G.p2.inv > 0) G.p2.inv -= dt;
      }

      // FIX: Guest interpolates remote host position (p2 display)
      if (G.isCoop && !G.isHost && G.p2) {
        const lerpF = Math.min(1, dt * 18);
        G.p2Render.x += (G.p2Target.x - G.p2Render.x) * lerpF;
        G.p2Render.y += (G.p2Target.y - G.p2Render.y) * lerpF;
        G.p2Render.hp += (G.p2Target.hp - G.p2Render.hp) * lerpF;
        G.p2Render.maxHp = G.p2Target.maxHp;
        G.p2Render.inv = G.p2Target.inv;
        G.p2.x = G.p2Render.x; G.p2.y = G.p2Render.y;
        G.p2.hp = G.p2Render.hp; G.p2.maxHp = G.p2Render.maxHp;
        G.p2.inv = G.p2Render.inv; G.p2.dead = G.p2Target.dead;
      }

      // Guest sends input to host at 25hz
      if (G.isCoop && !G.isHost && G.coopChannel) {
        G.inputSendT -= dt;
        if (G.inputSendT <= 0) {
          G.inputSendT = .04;
          G.coopChannel.send('guest_input', { x: mx, y: my });
        }
        G.syncT -= dt;
        if (G.syncT <= 0) {
          G.syncT = 3;
          G.pingStart = performance.now();
          G.coopChannel.send('ping_req', { ts: G.pingStart });
        }
      }

      // Host sends full state at 20hz
      if (G.isCoop && G.isHost && G.coopChannel) {
        G.inputSendT -= dt;
        if (G.inputSendT <= 0) {
          G.inputSendT = .05;
          G.coopChannel.send('state_sync', {
            enemies: G.enemies.map(e => ({ x: e.x, y: e.y, r: e.r, hp: e.hp, maxHp: e.maxHp, color: e.color, glow: e.glow, boss: e.boss, flash: e.flash, dmg: e.dmg, xp: e.xp, speed: e.speed })),
            gems: G.gems.map(g => ({ x: g.x, y: g.y, r: g.r, xp: g.xp, life: g.life })),
            // FIX: Include p2 flag in bullets so guest renders them with correct color
            bullets: G.bullets.map(b => ({ x: b.x, y: b.y, vx: b.vx, vy: b.vy, r: b.r, life: b.life, p2: b.p2 || false })),
            score: G.score, wave: G.wave, waveT: G.waveT, waveLen: G.waveLen, boltDmg: G.boltDmg,
            p1: G.p ? { x: G.p.x, y: G.p.y, hp: G.p.hp, maxHp: G.p.maxHp, inv: G.p.inv, dead: G.p.dead } : null,
            // FIX: Send full p2 stats (xp, level) so guest HUD stays in sync
            p2: G.p2 ? { hp: G.p2.hp, maxHp: G.p2.maxHp, xp: G.p2.xp, xpNext: G.p2.xpNext, level: G.p2.level, dead: G.p2.dead } : null,
          });
        }
      }

      updateWorld(dt);
    }

    function updateWorld(dt) {
      // P1 auto-shoot (host authoritative, guest shows visual bolt from synced enemies)
      if (G.p && !G.p.dead && (!G.isCoop || G.isHost)) {
        G.p.shootCd -= dt;
        if (G.p.shootCd <= 0 && G.enemies.length > 0) {
          let near = null, nd = Infinity;
          for (const e of G.enemies) { const d = Math.hypot(e.x - G.p.x, e.y - G.p.y); if (d < nd) { nd = d; near = e; } }
          if (near) {
            G.p.shootCd = G.p.shootRate;
            const ba = Math.atan2(near.y - G.p.y, near.x - G.p.x), sp = (G.p.multiShot - 1) * .18;
            for (let i = 0; i < G.p.multiShot; i++) {
              const a = ba + (i - (G.p.multiShot - 1) / 2) * sp;
              G.bullets.push({ x: G.p.x, y: G.p.y, vx: Math.cos(a) * 370, vy: Math.sin(a) * 370, r: 5, life: 2, p2: false });
            }
            emit(G.p.x, G.p.y, '#c4b5fd', 4, 70, .25);
          }
        }
      }
      // FIX: Guest shoots locally for visual feedback (bullets exist locally, host syncs real state)
      if (G.isCoop && !G.isHost && G.p && !G.p.dead) {
        G.p.shootCd -= dt;
        if (G.p.shootCd <= 0 && G.enemies.length > 0) {
          let near = null, nd = Infinity;
          for (const e of G.enemies) { const d = Math.hypot(e.x - G.p.x, e.y - G.p.y); if (d < nd) { nd = d; near = e; } }
          if (near) {
            G.p.shootCd = G.p.shootRate;
            // FIX: Actually spawn local visual bullets for guest (not just particles)
            const ba = Math.atan2(near.y - G.p.y, near.x - G.p.x), sp = (G.p.multiShot - 1) * .18;
            for (let i = 0; i < G.p.multiShot; i++) {
              const a = ba + (i - (G.p.multiShot - 1) / 2) * sp;
              // Visual-only bullets with 'local' flag (won't be sent back)
              G.bullets.push({ x: G.p.x, y: G.p.y, vx: Math.cos(a) * 370, vy: Math.sin(a) * 370, r: 5, life: 0.5, p2: false, local: true });
            }
            emit(G.p.x, G.p.y, '#c4b5fd', 4, 70, .25);
          }
        }
      }

      // P2 auto-shoot (host only)
      if (G.isCoop && G.isHost && G.p2 && !G.p2.dead) {
        G.p2.shootCd -= dt;
        if (G.p2.shootCd <= 0 && G.enemies.length > 0) {
          let near = null, nd = Infinity;
          for (const e of G.enemies) { const d = Math.hypot(e.x - G.p2.x, e.y - G.p2.y); if (d < nd) { nd = d; near = e; } }
          if (near) {
            G.p2.shootCd = G.p2.shootRate;
            const ba = Math.atan2(near.y - G.p2.y, near.x - G.p2.x);
            G.bullets.push({ x: G.p2.x, y: G.p2.y, vx: Math.cos(ba) * 370, vy: Math.sin(ba) * 370, r: 5, life: 2, p2: true });
            emit(G.p2.x, G.p2.y, '#fb923c', 4, 70, .25);
          }
        }
      }

      // Bullets
      if (!G.isCoop || G.isHost) {
        for (let i = G.bullets.length - 1; i >= 0; i--) {
          const b = G.bullets[i]; b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
          if (Math.random() < .25) G.particles.push({ x: b.x, y: b.y, vx: (Math.random() - .5) * 25, vy: (Math.random() - .5) * 25, color: b.p2 ? '#fdba74' : '#d8b4fe', life: .12, ml: .12, r: Math.random() * 2 + 1 });
          if (b.life <= 0 || b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) { G.bullets.splice(i, 1); continue; }
          let hit = false;
          for (let j = G.enemies.length - 1; j >= 0; j--) {
            const e = G.enemies[j];
            if (Math.hypot(b.x - e.x, b.y - e.y) < b.r + e.r) {
              e.hp -= G.boltDmg; e.flash = .1; emit(b.x, b.y, e.color, 6, 90, .35); G.bullets.splice(i, 1); hit = true;
              if (e.hp <= 0) {
                emit(e.x, e.y, e.glow, 14, 140, .65); emit(e.x, e.y, '#fff', 4, 70, .25);
                G.gems.push({ x: e.x, y: e.y, r: 7, xp: e.xp, life: 10 });
                G.score += e.boss ? 500 * G.wave : 100;
                G.enemies.splice(j, 1);
              }
              break;
            }
          }
          if (hit) continue;
        }
      } else {
        // FIX: Guest moves local visual bullets + synced bullets
        for (let i = G.bullets.length - 1; i >= 0; i--) {
          const b = G.bullets[i];
          b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
          if (Math.random() < .25) G.particles.push({ x: b.x, y: b.y, vx: (Math.random() - .5) * 25, vy: (Math.random() - .5) * 25, color: b.p2 ? '#fdba74' : '#d8b4fe', life: .12, ml: .12, r: Math.random() * 2 + 1 });
          if (b.life <= 0 || b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) {
            G.bullets.splice(i, 1);
          }
        }
      }

      // Enemy AI
      if (!G.isCoop || G.isHost) {
        for (const e of G.enemies) {
          let target = G.p && !G.p.dead ? { x: G.p.x, y: G.p.y } : null;
          if (G.isCoop && G.p2 && !G.p2.dead) {
            const dp = target ? Math.hypot(e.x - G.p.x, e.y - G.p.y) : Infinity;
            const dp2 = Math.hypot(e.x - G.p2.x, e.y - G.p2.y);
            if (dp2 < dp) target = { x: G.p2.x, y: G.p2.y };
          }
          if (!target) continue;
          const a = Math.atan2(target.y - e.y, target.x - e.x);
          e.x += Math.cos(a) * e.speed * dt; e.y += Math.sin(a) * e.speed * dt;
          if (e.flash > 0) e.flash -= dt;
          // Damage P1
          if (G.p && !G.p.dead && G.p.inv <= 0 && Math.hypot(e.x - G.p.x, e.y - G.p.y) < e.r + G.p.r) {
            G.p.hp -= e.dmg; G.p.inv = .8; emit(G.p.x, G.p.y, '#ef4444', 8, 110, .45);
            if (G.p.hp <= 0) {
              G.p.hp = 0; G.p.dead = true;
              if (!G.isCoop || (G.p2 && G.p2.dead)) {
                if (G.isCoop && G.coopChannel) G.coopChannel.send('game_over', {});
                triggerGameOver(); return;
              }
            }
          }
          // Damage P2
          if (G.isCoop && G.p2 && !G.p2.dead && G.p2.inv <= 0 && Math.hypot(e.x - G.p2.x, e.y - G.p2.y) < e.r + G.p2.r) {
            G.p2.hp -= e.dmg; G.p2.inv = .8; emit(G.p2.x, G.p2.y, '#ef4444', 8, 110, .45);
            if (G.p2.hp <= 0) {
              G.p2.hp = 0; G.p2.dead = true;
              if (G.p && G.p.dead) { if (G.coopChannel) G.coopChannel.send('game_over', {}); triggerGameOver(); return; }
            }
          }
        }
      } else {
        // Guest: only flash timer (positions synced from host)
        for (const e of G.enemies) { if (e.flash > 0) e.flash -= dt; }
      }

      // Gems (host authoritative, guest sees synced positions)
      if (!G.isCoop || G.isHost) {
        for (let i = G.gems.length - 1; i >= 0; i--) {
          const g = G.gems[i]; g.life -= dt;
          let tx = G.p?.x || W / 2, ty = G.p?.y || H / 2;
          if (G.isCoop && G.p2 && !G.p2.dead) {
            const dp = Math.hypot(G.p.x - g.x, G.p.y - g.y), dp2 = Math.hypot(G.p2.x - g.x, G.p2.y - g.y);
            if (dp2 < dp) { tx = G.p2.x; ty = G.p2.y; }
          }
          const d = Math.hypot(tx - g.x, ty - g.y);
          if (d < 90 || g.life < 2) { const a = Math.atan2(ty - g.y, tx - g.x), sp = d < 50 ? 280 : 140; g.x += Math.cos(a) * sp * dt; g.y += Math.sin(a) * sp * dt; }
          if (G.p && !G.p.dead && Math.hypot(G.p.x - g.x, G.p.y - g.y) < G.p.r + g.r) {
            G.p.xp += g.xp; emit(g.x, g.y, '#34d399', 5, 55, .35); G.gems.splice(i, 1);
            if (G.p.xp >= G.p.xpNext) {
              G.p.xp -= G.p.xpNext; G.p.xpNext = Math.ceil(G.p.xpNext * 1.45); G.p.level++;
              G.pendingUps = getRandUps();
              G.gs = 'levelup';
              setShowUpgrade(true);
              setUpgradeChoices([...G.pendingUps]);
              if (G.isCoop && G.coopChannel) {
                const guestUps = getRandUps();
                G.coopChannel.send('offer_levelup', { ups: guestUps });
              }
            }
            continue;
          }
          if (G.isCoop && G.isHost && G.p2 && !G.p2.dead && Math.hypot(G.p2.x - g.x, G.p2.y - g.y) < G.p2.r + g.r) {
            G.p2.xp += g.xp; emit(g.x, g.y, '#34d399', 5, 55, .35); G.gems.splice(i, 1);
            if (G.p2.xp >= G.p2.xpNext) {
              G.p2.xp -= G.p2.xpNext; G.p2.xpNext = Math.ceil(G.p2.xpNext * 1.45); G.p2.level++;
              // FIX: Send offer_levelup with correct upgrade data — host handles p2 upgrade application too
              const guestUps = getRandUps();
              G.coopChannel.send('offer_levelup', { ups: guestUps });
            }
            continue;
          }
          if (g.life <= 0) G.gems.splice(i, 1);
        }
      }

      // Particles & ambience
      for (let i = G.particles.length - 1; i >= 0; i--) {
        const pt = G.particles[i]; pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vx *= .92; pt.vy *= .92; pt.life -= dt;
        if (pt.life <= 0) G.particles.splice(i, 1);
      }
      for (const a of G.ambs) {
        a.x += a.vx * dt; a.y += a.vy * dt; a.t -= dt * .25;
        if (a.t <= 0 || a.y < -10) { a.x = Math.random() * W; a.y = H + 10; a.t = 1; }
      }
    }

    // ── RENDER ──
    function render() {
      ctx.fillStyle = '#030111'; ctx.fillRect(0, 0, W, H);
      if (G.floorPat) { ctx.fillStyle = G.floorPat; ctx.fillRect(0, 0, W, H); }
      for (const a of G.ambs) { ctx.save(); ctx.globalAlpha = a.a * a.t; ctx.fillStyle = a.c; gl(a.c, 6); ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
      if (G.gs === 'menu') { drawMenuBg(); return; }

      // Gems
      for (const g of G.gems) { ctx.save(); gl('#34d399', 13); ctx.fillStyle = '#34d399'; ctx.beginPath(); ctx.moveTo(g.x, g.y - g.r); ctx.lineTo(g.x + g.r * .65, g.y); ctx.lineTo(g.x, g.y + g.r); ctx.lineTo(g.x - g.r * .65, g.y); ctx.closePath(); ctx.fill(); ctx.restore(); }
      // Bullets
      for (const b of G.bullets) { ctx.save(); gl(b.p2 ? '#fb923c' : '#e879f9', 20); ctx.fillStyle = b.p2 ? '#fed7aa' : '#f5d0fe'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
      // Particles
      for (const pt of G.particles) { ctx.save(); ctx.globalAlpha = pt.life / pt.ml; ctx.fillStyle = pt.color; gl(pt.color, 7); ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
      // Enemies
      for (const e of G.enemies) {
        ctx.save();
        ctx.fillStyle = e.flash > 0 ? '#fff' : e.color; gl(e.flash > 0 ? '#fff' : e.glow, e.boss ? 24 : 13);
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill(); ng();
        ctx.fillStyle = '#030111'; ctx.beginPath(); ctx.arc(e.x - e.r * .35, e.y - e.r * .05, e.r * .2, 0, Math.PI * 2); ctx.arc(e.x + e.r * .35, e.y - e.r * .05, e.r * .2, 0, Math.PI * 2); ctx.fill();
        if (e.boss || e.hp < e.maxHp) { const bw = e.r * 2.6, bh = 4, bx2 = e.x - bw / 2, by2 = e.y - e.r - 11; ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(bx2, by2, bw, bh); ctx.fillStyle = e.boss ? '#fbbf24' : '#ef4444'; ctx.fillRect(bx2, by2, bw * (e.hp / e.maxHp), bh); }
        if (e.boss) { ng(); ctx.fillStyle = '#030111'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center'; ctx.fillText('BOSS', e.x, e.y + e.r + 14); }
        ctx.restore();
      }

      // P2 wizard (orange)
      if (G.isCoop && G.p2 && !G.p2.dead) drawWizard2();
      // P1 wizard (purple, local)
      if (G.p && !G.p.dead) drawWizard();
      // Dead ghosts
      if (G.p && G.p.dead) drawDeadGhost(G.p, '#8b5cf6', G.coopName);
      if (G.isCoop && G.p2 && G.p2.dead) drawDeadGhost(G.p2, '#f97316', G.p2Name);

      drawHUD();
    }

    function drawMenuBg() {
      const t = Date.now() * .001;
      ctx.strokeStyle = 'rgba(139,92,246,.07)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(W / 2, H / 2, 180 + Math.sin(t * .5) * 6, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(139,92,246,.035)';
      ctx.beginPath(); ctx.arc(W / 2, H / 2, 240 + Math.cos(t * .4) * 6, 0, Math.PI * 2); ctx.stroke();
    }

    function drawWizard() {
      if (!G.p) return;
      ctx.save();
      const fl = G.p.inv > 0 && Math.sin(G.p.inv * 25) > 0;
      gl(fl ? '#ef4444' : '#8b5cf6', fl ? 32 : 22); ctx.fillStyle = fl ? '#ef4444' : '#8b5cf6';
      ctx.beginPath(); ctx.arc(G.p.x, G.p.y + 3, G.p.r, 0, Math.PI * 2); ctx.fill(); ng();
      ctx.fillStyle = '#4c1d95'; ctx.beginPath(); ctx.moveTo(G.p.x, G.p.y - G.p.r * 1.85); ctx.lineTo(G.p.x + G.p.r * .9, G.p.y - G.p.r * .28); ctx.lineTo(G.p.x - G.p.r * .9, G.p.y - G.p.r * .28); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#5b21b6'; ctx.beginPath(); ctx.ellipse(G.p.x, G.p.y - G.p.r * .28, G.p.r * 1.1, G.p.r * .28, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fde68a'; ctx.font = '8px serif'; ctx.textAlign = 'center'; ctx.fillText('*', G.p.x, G.p.y - G.p.r * 1.1);
      ctx.fillStyle = '#fef3c7'; ctx.beginPath(); ctx.arc(G.p.x - G.p.r * .3, G.p.y + 3, G.p.r * .18, 0, Math.PI * 2); ctx.arc(G.p.x + G.p.r * .3, G.p.y + 3, G.p.r * .18, 0, Math.PI * 2); ctx.fill();
      if (G.isCoop) { ctx.fillStyle = '#c4b5fd'; ctx.font = 'bold 9px Cinzel,serif'; ctx.textAlign = 'center'; ctx.fillText(G.coopName, G.p.x, G.p.y - G.p.r * 2.3); }
      ctx.restore();
    }

    function drawWizard2() {
      if (!G.p2) return;
      ctx.save();
      const fl = G.p2.inv > 0 && Math.sin(G.p2.inv * 25) > 0;
      gl(fl ? '#ef4444' : '#f97316', fl ? 32 : 22); ctx.fillStyle = fl ? '#ef4444' : '#f97316';
      ctx.beginPath(); ctx.arc(G.p2.x, G.p2.y + 3, G.p2.r, 0, Math.PI * 2); ctx.fill(); ng();
      ctx.fillStyle = '#7c2d12'; ctx.beginPath(); ctx.moveTo(G.p2.x, G.p2.y - G.p2.r * 1.85); ctx.lineTo(G.p2.x + G.p2.r * .9, G.p2.y - G.p2.r * .28); ctx.lineTo(G.p2.x - G.p2.r * .9, G.p2.y - G.p2.r * .28); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#9a3412'; ctx.beginPath(); ctx.ellipse(G.p2.x, G.p2.y - G.p2.r * .28, G.p2.r * 1.1, G.p2.r * .28, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fde68a'; ctx.font = '8px serif'; ctx.textAlign = 'center'; ctx.fillText('✦', G.p2.x, G.p2.y - G.p2.r * 1.1);
      ctx.fillStyle = '#fed7aa'; ctx.beginPath(); ctx.arc(G.p2.x - G.p2.r * .3, G.p2.y + 3, G.p2.r * .18, 0, Math.PI * 2); ctx.arc(G.p2.x + G.p2.r * .3, G.p2.y + 3, G.p2.r * .18, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fb923c'; ctx.font = 'bold 9px Cinzel,serif'; ctx.textAlign = 'center'; ctx.fillText(G.p2Name, G.p2.x, G.p2.y - G.p2.r * 2.3);
      const bw = 42, bh = 4, bx2 = G.p2.x - bw / 2, by3 = G.p2.y + G.p2.r + 6;
      ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(bx2, by3, bw, bh);
      ctx.fillStyle = '#f97316'; ctx.fillRect(bx2, by3, bw * (G.p2.hp / G.p2.maxHp), bh);
      ctx.restore();
    }

    function drawDeadGhost(pl, color, name) {
      ctx.save(); ctx.globalAlpha = 0.35;
      gl(color, 18); ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(pl.x, pl.y + 3, pl.r, 0, Math.PI * 2); ctx.fill(); ng();
      ctx.globalAlpha = 0.6; ctx.fillStyle = '#fca5a5'; ctx.font = 'bold 9px Cinzel,serif'; ctx.textAlign = 'center';
      ctx.fillText('💀 ' + name, pl.x, pl.y - pl.r * 2.5);
      ctx.restore();
    }

    function drawHUD() {
      if (!G.p) return;
      const bw = 170, bh = 14, bx = 14, by = H - 44;
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
      ctx.fillStyle = '#7f1d1d'; ctx.fillRect(bx, by, bw, bh);
      const hpFrac = G.p.hp / G.p.maxHp;
      const hpColor = hpFrac > 0.5 ? '#ef4444' : hpFrac > 0.25 ? '#f97316' : '#fbbf24';
      ctx.fillStyle = hpColor; ctx.fillRect(bx, by, bw * hpFrac, bh);
      ctx.strokeStyle = 'rgba(239,68,68,.25)'; ctx.lineWidth = .5; ctx.strokeRect(bx, by, bw, bh);
      ctx.fillStyle = '#fecaca'; ctx.font = 'bold 10px Share Tech Mono,monospace'; ctx.textAlign = 'left';
      ctx.fillText('HP ' + Math.ceil(G.p.hp) + '/' + G.p.maxHp, bx + 4, by + 10);
      const xy = H - 24; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(bx - 2, xy - 2, bw + 4, 11);
      ctx.fillStyle = '#14532d'; ctx.fillRect(bx, xy, bw, 8); ctx.fillStyle = '#22c55e'; ctx.fillRect(bx, xy, bw * (G.p.xp / G.p.xpNext), 8);
      ctx.fillStyle = '#86efac'; ctx.font = '9px Share Tech Mono,monospace'; ctx.fillText('LV' + G.p.level + '  XP ' + G.p.xp + '/' + G.p.xpNext, bx + 3, xy + 7);
      ctx.textAlign = 'right'; ctx.fillStyle = '#e2e8f0'; gl('#c4b5fd', 8); ctx.font = 'bold 15px Cinzel,serif'; ctx.fillText(G.score.toLocaleString(), W - 14, 26); ng();
      ctx.fillStyle = '#a78bfa'; ctx.font = '10px Cinzel,serif'; ctx.fillText('SCORE', W - 14, 14);
      ctx.fillText('WAVE ' + G.wave + '  |  ' + Math.max(0, Math.ceil(G.waveLen - G.waveT)) + 's', W - 14, 44);
      ctx.textAlign = 'left';
      if (G.waveT < 5) { ctx.save(); ctx.globalAlpha = Math.min(1, (5 - G.waveT) / 2); ctx.fillStyle = '#a78bfa'; ctx.font = '10px Share Tech Mono,monospace'; ctx.textAlign = 'center'; ctx.fillText('WASD/Arrows to move  ·  Auto-attacks  ·  Collect green gems for XP', W / 2, H - 9); ctx.restore(); }
      ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#6d28d9'; ctx.font = '9px Cinzel,serif'; ctx.textAlign = 'left'; ctx.fillText('[ESC] PAUSE', 14, 14); ctx.restore();
    }

    // ── Game loop ──
    G.last = performance.now();
    function loop(ts) {
      const dt = Math.min((ts - G.last) / 1000, .05); G.last = ts;
      if (G.gs !== 'paused') update(dt);
      render();
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', fit);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // ── Wire up React callbacks ──
  useEffect(() => {
    G.onGameOver = triggerGameOver;
    G.onOfferUpgrade = (ups) => {
      G.gs = 'levelup';
      G.pendingUps = ups;
      setUpgradeChoices([...ups]);
      setShowUpgrade(true);
    };
    G.onPingUpdate = (ms) => setPingMs(ms);
    G.onChatMsg = (name, msg) => {
      setChatMessages(prev => [...prev, { type: 'theirs', name, text: msg }]);
      setChatBubbles(prev => ({ ...prev, p2: { msg: name + ': ' + msg, key: Date.now() } }));
    };
    G.onChatBubble = (who, msg) => {};
  });

  function sendChat(msg) {
    setChatMessages(prev => [...prev, { type: 'mine', name: G.coopName, text: msg }]);
    setChatBubbles(prev => ({ ...prev, p1: { msg: G.coopName + ': ' + msg, key: Date.now() } }));
    if (G.coopChannel) G.coopChannel.send('chat', { name: G.coopName, msg });
  }

  // ── UI helpers ──
  function Panel({ children, style }) {
    return (
      <div style={{
        position: 'relative', width: 'min(520px, 94vw)',
        background: 'linear-gradient(160deg, rgba(76,29,149,.28) 0%, rgba(10,6,30,.9) 60%)',
        border: '1px solid rgba(139,92,246,.28)', borderRadius: 18,
        padding: '40px 36px 34px', boxShadow: '0 0 80px rgba(109,40,217,.14), inset 0 1px 0 rgba(196,181,253,.08)',
        textAlign: 'center', ...style
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, borderRadius: '18px 18px 0 0', background: 'linear-gradient(90deg, transparent 0%, rgba(196,181,253,.4) 50%, transparent 100%)' }} />
        {children}
      </div>
    );
  }

  function Btn({ children, onClick, variant = 'default', style }) {
    const base = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', padding: '13px 20px', marginBottom: 10, border: '1px solid rgba(139,92,246,.4)', borderRadius: 10, fontFamily: "'Cinzel',serif", fontSize: '.9rem', fontWeight: 700, letterSpacing: '.07em', color: '#e2e8f0', cursor: 'pointer', transition: 'all .18s', background: 'linear-gradient(135deg, rgba(76,29,149,.55), rgba(109,40,217,.25))' };
    const variants = {
      gold: { borderColor: 'rgba(251,191,36,.45)', background: 'linear-gradient(135deg, rgba(120,83,0,.5), rgba(92,64,0,.28))' },
      danger: { borderColor: 'rgba(239,68,68,.38)', background: 'linear-gradient(135deg, rgba(120,0,0,.38), rgba(80,0,0,.2))' },
    };
    return <button style={{ ...base, ...(variants[variant] || {}), ...style }} onClick={onClick}>{children}</button>;
  }

  function FieldInput({ id, label, value, onChange, placeholder, maxLength, style }) {
    return (
      <div style={{ marginBottom: 14, textAlign: 'left' }}>
        {label && <label htmlFor={id} style={{ fontSize: '.62rem', letterSpacing: '.18em', color: '#a78bfa', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>{label}</label>}
        <input id={id} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength}
          style={{ width: '100%', padding: '10px 14px', background: 'rgba(10,6,30,.8)', border: '1px solid rgba(139,92,246,.28)', borderRadius: 8, fontFamily: "'Cinzel',serif", fontSize: '.88rem', color: '#e2e8f0', outline: 'none', ...style }} />
      </div>
    );
  }

  async function loadLeaderboard() {
    setLbLoading(true); setLbData(null);
    if (!HAS_SUPABASE) { setLbData('no-config'); setLbLoading(false); return; }
    const data = await sbGet('/rest/v1/leaderboard?select=name,score,wave,level,mode&order=score.desc&limit=20');
    setLbData(data || []); setLbLoading(false);
  }

  // ─────────────────────────────────────────────────────────
  //  SCREENS
  // ─────────────────────────────────────────────────────────
  const overlayStyle = { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(3,1,17,.95)', zIndex: 100 };

  return (
    <div style={{ background: '#030111', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cinzel',serif", color: '#e2e8f0', overflow: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cinzel+Decorative:wght@400;700&family=Share+Tech+Mono&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        input { background: rgba(10,6,30,.8); color: #e2e8f0; }
        input::placeholder { color: rgba(167,139,250,.3); }
        input:focus { outline: none; border-color: rgba(196,181,253,.55) !important; box-shadow: 0 0 0 3px rgba(139,92,246,.08); }
        button { background: none; border: none; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(139,92,246,.3); border-radius: 2px; }
        @keyframes fadeInUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
        @keyframes dots { 0%{content:''} 33%{content:'.'} 66%{content:'..'} 100%{content:'...'} }
        .waiting-dots::after { content:''; display:inline-block; animation:dots 1.4s steps(3,end) infinite; width:1.5em; text-align:left; }
      `}</style>

      {/* Game canvas + overlays wrapper */}
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <canvas ref={canvasRef} id="c" width={W} height={H} style={{ display: 'block', borderRadius: 6, border: '1px solid rgba(139,92,246,.28)', boxShadow: '0 0 60px rgba(109,40,217,.12)' }} />

        {/* ── MAIN MENU ── */}
        {screen === 'menu' && (
          <div style={overlayStyle}>
            <Panel>
              <div style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: 'clamp(2rem,6vw,3rem)', fontWeight: 700, letterSpacing: '.05em', lineHeight: 1, marginBottom: 6 }}>
                <span style={{ color: '#c4b5fd', textShadow: '0 0 32px rgba(139,92,246,.9)' }}>ARCANE</span><br />
                <span style={{ color: '#fde68a', textShadow: '0 0 32px rgba(251,191,36,.7)' }}>SURVIVAL</span>
              </div>
              <div style={{ fontSize: '.72rem', letterSpacing: '.25em', color: '#6d28d9', textTransform: 'uppercase', marginBottom: 30 }}>A Wizard's Last Stand</div>
              <div style={{ width: 70, height: 1, background: 'linear-gradient(90deg,transparent,rgba(139,92,246,.5),transparent)', margin: '0 auto 24px' }} />
              <Btn onClick={() => { G.coopName = 'Wizard'; startGame(false, false); }}>
                <span>🧙</span><span style={{ flex: 1, textAlign: 'center' }}>Solo Play</span><span style={{ fontSize: '.62rem', color: 'rgba(167,139,250,.55)', fontWeight: 400 }}>SPACE to start</span>
              </Btn>
              <Btn variant="gold" onClick={() => setScreen('coop')}>
                <span>⚔️</span><span style={{ flex: 1, textAlign: 'center' }}>Co-op Play</span><span style={{ fontSize: '.62rem', color: 'rgba(167,139,250,.55)', fontWeight: 400 }}>2 wizards, 1 realm</span>
              </Btn>
              <Btn onClick={() => { setScreen('lb'); loadLeaderboard(); }}>
                <span>🏆</span><span style={{ flex: 1, textAlign: 'center' }}>Leaderboard</span><span style={{ fontSize: '.62rem', color: 'rgba(167,139,250,.55)', fontWeight: 400 }}>Hall of Legends</span>
              </Btn>
            </Panel>
          </div>
        )}

        {/* ── CO-OP MENU ── */}
        {screen === 'coop' && (
          <div style={overlayStyle}>
            <Panel>
              <div style={{ fontSize: '.7rem', letterSpacing: '.22em', color: '#a78bfa', textTransform: 'uppercase', marginBottom: 18 }}>⚔️ Co-op Play</div>
              <FieldInput id="coop-name" label="Your Wizard Name" value={coopNameInput} onChange={setCoopNameInput} placeholder="e.g. Eldrin" maxLength={16} />
              <Btn variant="gold" onClick={() => {
                if (!HAS_SUPABASE) { showToast('Add Supabase config to use co-op', true); return; }
                const name = coopNameInput.trim() || 'Wizard';
                G.coopName = name;
                const code = Math.random().toString(36).slice(2, 8).toUpperCase();
                setLobbyCode(code); setLobbyP2Status('');
                G.isHost = true;
                G.coopChannel = setupCoopChannel(code);
                setScreen('lobby');
              }}>
                <span>🌐</span><span style={{ flex: 1, textAlign: 'center' }}>Host a Game</span><span style={{ fontSize: '.62rem', color: 'rgba(167,139,250,.55)', fontWeight: 400 }}>Create room & share code</span>
              </Btn>
              <div style={{ margin: '5px 0', fontSize: '.62rem', letterSpacing: '.15em', color: 'rgba(167,139,250,.35)' }}>— OR —</div>
              <FieldInput id="join-code" label="Room Code" value={joinCodeInput} onChange={v => setJoinCodeInput(v.toUpperCase())} placeholder="Enter 6-letter code" maxLength={6} style={{ textTransform: 'uppercase', letterSpacing: '.3em', textAlign: 'center' }} />
              <Btn onClick={() => {
                if (!HAS_SUPABASE) { showToast('Add Supabase config to use co-op', true); return; }
                const code = joinCodeInput.trim().toUpperCase();
                if (code.length < 4) { showToast('Enter a valid room code', true); return; }
                const name = coopNameInput.trim() || 'Wizard 2';
                G.coopName = name; G.p2Name = 'Host'; G.isHost = false;
                G.coopChannel = setupCoopChannel(code);
                setTimeout(() => { if (G.coopChannel) G.coopChannel.send('guest_joined', { name }); showToast('Joining room ' + code + '…'); }, 800);
              }}>
                <span>🚪</span><span style={{ flex: 1, textAlign: 'center' }}>Join Game</span>
              </Btn>
              {!HAS_SUPABASE && <div style={{ fontSize: '.66rem', color: 'rgba(251,191,36,.55)', marginTop: 8 }}>⚠ No Supabase config — co-op requires it.</div>}
              <Btn variant="danger" style={{ marginTop: 14, width: 'auto', padding: '8px 18px', fontSize: '.78rem' }} onClick={() => setScreen('menu')}>← Back</Btn>
            </Panel>
          </div>
        )}

        {/* ── LOBBY ── */}
        {screen === 'lobby' && (
          <div style={overlayStyle}>
            <Panel>
              <div style={{ fontSize: '.7rem', letterSpacing: '.22em', color: '#a78bfa', textTransform: 'uppercase', marginBottom: 18 }}>🌐 Waiting for Player 2</div>
              <div style={{ fontSize: '.78rem', color: '#a78bfa', marginBottom: 5 }}>Share this room code:</div>
              <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: '1.85rem', letterSpacing: '.3em', color: '#fde68a', textShadow: '0 0 22px rgba(251,191,36,.45)', padding: 11, background: 'rgba(0,0,0,.28)', borderRadius: 8, border: '1px solid rgba(251,191,36,.18)', margin: '11px 0' }}>{lobbyCode}</div>
              <div style={{ fontSize: '.72rem', color: 'rgba(167,139,250,.45)', marginBottom: 18 }}>Player 2 joins with this code<span className="waiting-dots"></span></div>
              <div style={{ fontSize: '.78rem', color: '#a78bfa', minHeight: 22 }}>{lobbyP2Status}</div>
              <Btn variant="danger" style={{ marginTop: 14, width: 'auto', padding: '8px 18px', fontSize: '.78rem' }} onClick={() => {
                if (G.coopChannel) { G.coopChannel.close(); G.coopChannel = null; }
                setScreen('coop');
              }}>✕ Cancel</Btn>
            </Panel>
          </div>
        )}

        {/* ── GAME OVER ── */}
        {screen === 'gameover' && goData && (
          <div style={overlayStyle}>
            <Panel>
              <div style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: '1.9rem', color: '#ef4444', textShadow: '0 0 32px rgba(220,38,38,.55)', marginBottom: 8 }}>YOU PERISHED</div>
              <div style={{ width: 70, height: 1, background: 'linear-gradient(90deg,transparent,rgba(139,92,246,.5),transparent)', margin: '0 auto 16px' }} />
              <div style={{ fontSize: '1.45rem', color: '#e2e8f0', marginBottom: 4 }}>Final Score: {goData.score.toLocaleString()}</div>
              <div style={{ fontSize: '.82rem', color: '#a78bfa', marginBottom: 18 }}>Wave {goData.wave} · Level {goData.level}{goData.isCoop ? ' (Co-op)' : ''}</div>
              {goData.score > 0 && goData.score === goData.hi && !goData.isCoop && <div style={{ fontSize: '.77rem', color: '#fde68a', marginBottom: 18 }}>✦ New High Score ✦</div>}
              {HAS_SUPABASE && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 }}>
                    <FieldInput id="go-name" label="Your Name" value={goName} onChange={setGoName} placeholder="Wizard name" maxLength={16} />
                    <Btn variant="gold" style={{ marginTop: 22, marginBottom: 0, alignSelf: 'end' }} onClick={async () => {
                      if (!goName) { showToast('Enter your wizard name first', true); return; }
                      setSubmitStatus('Submitting…');
                      const ok = await sbPost('/rest/v1/leaderboard', { name: goName, score: goData.score, wave: goData.wave, level: goData.level, mode: goData.isCoop ? 'coop' : 'solo' });
                      if (ok) setSubmitStatus('✦ Score submitted!'); else setSubmitStatus('Failed to submit.');
                    }}>Submit Score</Btn>
                  </div>
                  {submitStatus && <div style={{ fontSize: '.68rem', color: submitStatus.includes('✦') ? '#86efac' : '#fca5a5', minHeight: 14 }}>{submitStatus}</div>}
                </div>
              )}
              <Btn onClick={() => { G.coopName = 'Wizard'; startGame(false, false); }}><span>🔄</span><span style={{ flex: 1, textAlign: 'center' }}>Play Again</span></Btn>
              <Btn onClick={() => { G.gs = 'menu'; setScreen('menu'); }}><span>🏠</span><span style={{ flex: 1, textAlign: 'center' }}>Main Menu</span></Btn>
            </Panel>
          </div>
        )}

        {/* ── LEADERBOARD ── */}
        {screen === 'lb' && (
          <div style={overlayStyle}>
            <Panel style={{ width: 'min(600px,96vw)' }}>
              <div style={{ fontSize: '.7rem', letterSpacing: '.22em', color: '#a78bfa', textTransform: 'uppercase', marginBottom: 18 }}>🏆 Hall of Legends</div>
              <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                {lbLoading && <div style={{ padding: 20, color: 'rgba(167,139,250,.45)', fontSize: '.78rem', textAlign: 'center' }}>Summoning records…</div>}
                {!lbLoading && lbData === 'no-config' && <div style={{ padding: 24, color: 'rgba(167,139,250,.38)', fontSize: '.78rem', textAlign: 'center' }}>Configure Supabase to see leaderboard.</div>}
                {!lbLoading && Array.isArray(lbData) && lbData.length === 0 && <div style={{ padding: 24, color: 'rgba(167,139,250,.38)', fontSize: '.78rem', textAlign: 'center' }}>No records yet. Be the first legend!</div>}
                {!lbLoading && Array.isArray(lbData) && lbData.length > 0 && (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr>{['#', 'Wizard', 'Mode', 'Wave', 'Score'].map(h => <th key={h} style={{ fontSize: '.58rem', letterSpacing: '.2em', color: '#7c3aed', textTransform: 'uppercase', padding: '6px 10px', borderBottom: '1px solid rgba(139,92,246,.18)', textAlign: h === 'Score' ? 'right' : 'left' }}>{h}</th>)}</tr></thead>
                    <tbody>{lbData.map((row, i) => (
                      <tr key={i}>{[
                        <td key="r" style={{ fontSize: '.68rem', color: '#6d28d9', padding: '7px 10px', borderBottom: '1px solid rgba(139,92,246,.06)', color: i === 0 ? '#fde68a' : i === 1 ? '#e2e8f0' : i === 2 ? '#fb923c' : '#c4b5fd' }}>{['🥇', '🥈', '🥉'][i] || '#' + (i + 1)}</td>,
                        <td key="n" style={{ padding: '7px 10px', fontSize: '.8rem', borderBottom: '1px solid rgba(139,92,246,.06)', color: i === 0 ? '#fde68a' : i === 1 ? '#e2e8f0' : i === 2 ? '#fb923c' : '#c4b5fd' }}>{escHtml(row.name)}</td>,
                        <td key="m" style={{ padding: '7px 10px', fontSize: '.68rem', color: '#6d28d9', borderBottom: '1px solid rgba(139,92,246,.06)' }}>{row.mode === 'coop' ? '⚔ co-op' : 'solo'}</td>,
                        <td key="w" style={{ padding: '7px 10px', fontSize: '.8rem', borderBottom: '1px solid rgba(139,92,246,.06)', color: '#c4b5fd' }}>{row.wave}</td>,
                        <td key="s" style={{ padding: '7px 10px', fontSize: '.8rem', borderBottom: '1px solid rgba(139,92,246,.06)', color: '#c4b5fd', textAlign: 'right', fontWeight: 700, fontFamily: "'Share Tech Mono',monospace" }}>{Number(row.score).toLocaleString()}</td>
                      ]}</tr>
                    ))}</tbody>
                  </table>
                )}
              </div>
              <Btn variant="danger" style={{ marginTop: 18, width: 'auto', padding: '8px 18px', fontSize: '.78rem' }} onClick={() => setScreen('menu')}>← Back</Btn>
            </Panel>
          </div>
        )}

        {/* ── IN-GAME OVERLAYS ── */}
        {screen === 'playing' && (
          <>
            {/* Pause button */}
            <button onClick={() => { G.gs = 'paused'; setShowPause(true); }} style={{ position: 'absolute', top: 8, right: 10, background: 'rgba(10,6,30,.82)', border: '1px solid rgba(139,92,246,.28)', borderRadius: 7, color: '#a78bfa', fontFamily: "'Cinzel',serif", fontSize: '.7rem', letterSpacing: '.1em', padding: '5px 12px', cursor: 'pointer', zIndex: 55 }}>
              ⏸ PAUSE
            </button>

            {/* Co-op HUD */}
            {G.isCoop && (
              <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', background: 'rgba(10,6,30,.88)', border: '1px solid rgba(139,92,246,.28)', borderRadius: 8, padding: '5px 16px', fontSize: '.7rem', letterSpacing: '.1em', color: '#a78bfa', pointerEvents: 'none', zIndex: 50, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>⚔</span> Co-op · {G.coopName} & {G.p2Name}
                {pingMs !== null && <span style={{ marginLeft: 8, color: pingMs < 100 ? '#34d399' : pingMs < 200 ? '#fbbf24' : '#ef4444' }}>PING {pingMs}ms</span>}
              </div>
            )}

            {/* FIX: Upgrade modal rendered as DOM element, fully clickable for player 2 */}
            {showUpgrade && upgradeChoices.length > 0 && (
              <UpgradeModal
                upgrades={upgradeChoices}
                onPick={(i) => {
                  if (G.isCoop && !G.isHost) pickUpgrade(i);
                  else pickHostUpgrade(i);
                }}
              />
            )}

            {/* Pause overlay */}
            {showPause && (
              <div style={{ ...overlayStyle, background: 'rgba(3,1,17,.88)' }}>
                <Panel style={{ width: 'min(360px,90vw)' }}>
                  <div style={{ fontSize: '.7rem', letterSpacing: '.22em', color: '#a78bfa', textTransform: 'uppercase', marginBottom: 18 }}>⏸ Game Paused</div>
                  <Btn onClick={() => { G.gs = 'playing'; setShowPause(false); }}><span>▶</span><span style={{ flex: 1, textAlign: 'center' }}>Resume Game</span></Btn>
                  <Btn variant="danger" onClick={() => {
                    if (G.coopChannel) { G.coopChannel.close(); G.coopChannel = null; }
                    G.gs = 'menu'; setShowPause(false); setShowUpgrade(false); setScreen('menu');
                  }}><span>🚪</span><span style={{ flex: 1, textAlign: 'center' }}>Exit to Main Menu</span></Btn>
                </Panel>
              </div>
            )}

            {/* FIX: Chat box at bottom of game frame (not side panel) */}
            {G.isCoop && (
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 60 }}>
                <ChatPanel messages={chatMessages} onSend={sendChat} />
              </div>
            )}
          </>
        )}
      </div>

      {/* Toast */}
      {toastMsg.text && (
        <div style={{
          position: 'fixed', bottom: 22, left: '50%', transform: 'translateX(-50%)',
          background: toastMsg.err ? 'rgba(120,0,0,.92)' : 'rgba(76,29,149,.92)',
          border: `1px solid ${toastMsg.err ? 'rgba(252,165,165,.28)' : 'rgba(196,181,253,.25)'}`,
          borderRadius: 8, padding: '9px 20px', fontSize: '.8rem', letterSpacing: '.04em', color: '#e2e8f0',
          zIndex: 999, pointerEvents: 'none', whiteSpace: 'nowrap', animation: 'fadeInUp .28s ease'
        }}>{toastMsg.text}</div>
      )}
    </div>
  );
}
