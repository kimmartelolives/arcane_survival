import React, { useState, useEffect, useRef } from 'react';

export default function PartyChat({ enabled, channel, localName }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const msgEndRef = useRef(null);

  useEffect(() => {
    if (!channel || !enabled) return;

    channel.onChatMsg = (event, payload) => {
      if (event === 'chat') {
        setMessages(prev => [...prev, { sender: payload.name, msg: payload.msg, type: 'theirs' }]);
      }
    };
    return () => { channel.onChatMsg = null; };
  }, [channel, enabled]);

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || !channel) return;
    channel.send('chat', { name: localName, msg: input });
    setMessages(prev => [...prev, { sender: localName, msg: input, type: 'mine' }]);
    setInput('');
  };

  if (!enabled) return null;

  return (
    <>
      <div id="chat-container" style={{ display: collapsed ? 'none' : 'flex' }}>
        <div id="chat-header" onClick={() => setCollapsed(true)}>
          <span>💬 Party Chat</span><span>▼</span>
        </div>
        <div id="chat-messages">
          {messages.map((m, i) => (
            <div key={i} className={`chat-msg ${m.type}`}>
              <span className="chat-name">{m.sender}</span>: {m.msg}
            </div>
          ))}
          <div ref={msgEndRef} />
        </div>
        <div id="chat-input-row">
          <input id="chat-input" type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="Type message..." />
          <button id="chat-send" onClick={handleSend}>➤</button>
        </div>
      </div>
      {collapsed && <button id="chat-toggle" onClick={() => setCollapsed(false)}>💬 Chat</button>}
    </>
  );
}