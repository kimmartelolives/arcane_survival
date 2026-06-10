export const SUPABASE_URL = 'https://yckqvvczamglcvhvpkcn.supabase.co';
export const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlja3F2dmN6YW1nbGN2aHZwa2NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MDU0ODEsImV4cCI6MjA5NjQ4MTQ4MX0.ujW23KtsdD4qbVr_3W6j4KJRO8bzZ_zZHPivSvnu0Qw';

export const supabase = {
  from: (table) => ({
    select: (cols) => ({
      ilike: (col, val) => ({
        single: async () => {
          const res = await sbGet(`/rest/v1/${table}?select=${cols}&${col}=ilike.${val}`);
          return { data: res?.[0] || null, error: null };
        }
      })
    }),
    update: (data) => ({
      eq: async (col, val) => {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${col}=eq.${val}`, {
          method: 'PATCH',
          headers: { 
            'apikey': SUPABASE_ANON, 
            'Authorization': `Bearer ${SUPABASE_ANON}`,
            'Content-Type': 'application/json',
            // Pinalitan natin ito ng return=representation para ibalik ng DB ang na-update na row
            'Prefer': 'return=representation' 
          },
          body: JSON.stringify(data)
        });
        
        const responseData = response.ok ? await response.json() : await response.json();
        
        // Kung nag-succeed ang network call pero WALANG na-update, ibig sabihin naka-block ito sa RLS
        if (response.ok && Array.isArray(responseData) && responseData.length === 0) {
          return { error: 'Blocked by RLS. Check your Supabase UPDATE policy.' };
        }
        
        return { error: response.ok ? null : responseData };
      }
    }),
    insert: async (data) => {
      const ok = await sbPost(`/rest/v1/${table}`, data);
      return { error: ok ? null : 'Insert failed' };
    }
  })
};

export const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_ANON);

export async function sbGet(path) {
  try {
    const response = await fetch(`${SUPABASE_URL}${path}`, {
      method: 'GET',
      headers: { 
        'apikey': SUPABASE_ANON, 
        'Authorization': `Bearer ${SUPABASE_ANON}`,
        'Cache-Control': 'no-cache, no-store'
      },
      cache: 'no-store' // 🔥 ETO ANG FIX PARA HINDI MAG-CACHE ANG LEADERBOARD
    });
    return response.ok ? response.json() : null;
  } catch {
    return null;
  }
}

export async function sbPost(path, body) {
  try {
    const response = await fetch(`${SUPABASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON,
        'Authorization': `Bearer ${SUPABASE_ANON}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(body)
    });
    return response.ok;
  } catch {
    return false;
  }
}

export function sbRealtime(channel, onMsg, onReady) {
  if (!hasSupabase) return { send: () => {}, close: () => {} };

  const wsUrl = SUPABASE_URL.replace('https://', 'wss://').replace('http://', 'ws://') + 
                '/realtime/v1/websocket?apikey=' + SUPABASE_ANON + '&vsn=1.0.0';
  const ws = new WebSocket(wsUrl);
  let pingInterval;

  ws.onopen = () => {
    // 1. Join the channel room
    ws.send(JSON.stringify({
      topic: `realtime:${channel}`,
      event: 'phx_join',
      payload: { config: { broadcast: { self: false }, presence: { key: '' } } },
      ref: '1'
    }));

    // 2. Start heartbeat to track latency and keep connection alive
    pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        window.pingStart = performance.now();
        ws.send(JSON.stringify({
          topic: 'phoenix',
          event: 'heartbeat',
          payload: {},
          ref: 'heartbeat'
        }));
      }
    }, 3000);
  };

  ws.onmessage = (e) => {
    const data = JSON.parse(e.data);

    // Listen for join confirmation (phx_reply) from server
    if (data.event === 'phx_reply' && data.ref === '1') {
      if (data.payload?.status === 'ok') {
        console.log("Connected to room:", channel);
        if (onReady) onReady(); 
      } else {
        console.error("Supabase Realtime room join rejected:", data.payload);
      }
    }

    // Calculate Ping from heartbeat reply
    if (data.event === 'phx_reply' && data.topic === 'phoenix' && window.pingStart) {
      const ping = Math.round(performance.now() - window.pingStart);
      const pingEl = document.getElementById('ping-display');
      if (pingEl) pingEl.textContent = `PING: ${ping}ms`;
    }

    // Handle inbound real-time broadcasts
    if (data.event === 'broadcast' && data.payload?.event) {
      if (onMsg) onMsg(data.payload.event, data.payload.payload);
    }
  };

  return {
    send: (event, payload) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          topic: `realtime:${channel}`,
          event: 'broadcast',
          payload: { 
            type: 'broadcast', // Required parameter configuration for Phoenix Server pipelines
            event, 
            payload 
          },
          ref: String(Date.now())
        }));
      }
    },
    close: () => {
      clearInterval(pingInterval);
      ws.close();
    }
  };
}

// Add this to your supabase.js exports
export function sbWatchTable(table, onChange) {
  if (!hasSupabase) return { close: () => {} };

  const wsUrl = SUPABASE_URL.replace('https://', 'wss://').replace('http://', 'ws://') + 
                '/realtime/v1/websocket?apikey=' + SUPABASE_ANON + '&vsn=1.0.0';
  const ws = new WebSocket(wsUrl);
  let pingInterval;

  ws.onopen = () => {
    // Join a Realtime channel specifically asking for Postgres Changes on this table
    ws.send(JSON.stringify({
      topic: `realtime:public:${table}`,
      event: 'phx_join',
      payload: {
        config: {
          postgres_changes: [{ event: '*', schema: 'public', table: table }]
        }
      },
      ref: '1'
    }));

    // Keep connection alive
    pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: 'heartbeat' }));
      }
    }, 30000); 
  };

  ws.onmessage = (e) => {
    const data = JSON.parse(e.data);
    
    // If the database broadcasts an INSERT, UPDATE, or DELETE on this table, trigger the callback
    if (data.event === 'postgres_changes') {
      onChange();
    }
  };

  return {
    close: () => {
      clearInterval(pingInterval);
      if (ws.readyState === WebSocket.OPEN) ws.close();
    }
  };
}