export const SUPABASE_URL = 'https://yckqvvczamglcvhvpkcn.supabase.co';
export const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlja3F2dmN6YW1nbGN2aHZwa2NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MDU0ODEsImV4cCI6MjA5NjQ4MTQ4MX0.ujW23KtsdD4qbVr_3W6j4KJRO8bzZ_zZHPivSvnu0Qw';

export const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_ANON);

export async function sbGet(path) {
  try {
    const response = await fetch(`${SUPABASE_URL}${path}`, {
      headers: { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${SUPABASE_ANON}` }
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

export function sbRealtime(channel, onMsg) {
  if (!hasSupabase) return { send: () => {}, close: () => {} };
  
  const wsUrl = SUPABASE_URL.replace('https://', 'wss://').replace('http://', 'ws://') + 
                '/realtime/v1/websocket?apikey=' + SUPABASE_ANON + '&vsn=1.0.0';
  const ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    ws.send(JSON.stringify({
      topic: `realtime:${channel}`,
      event: 'phx_join',
      payload: { config: { broadcast: { self: false }, presence: { key: '' } } },
      ref: '1'
    }));
  };

  ws.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      if (data.event === 'broadcast' && data.payload?.event) {
        onMsg(data.payload.event, data.payload.payload);
      }
    } catch (err) {
      console.error("Realtime network sync parsing error:", err);
    }
  };

  return {
    send: (event, payload) => {
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({
          topic: `realtime:${channel}`,
          event: 'broadcast',
          payload: { event, payload },
          ref: String(Date.now())
        }));
      }
    },
    close: () => ws.close()
  };
}