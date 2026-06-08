import React, { useEffect } from 'react';

export default function Toast({ message, isError, onClose }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div id="toast" className={`show ${isError ? 'error' : ''}`}>
      {message}
    </div>
  );
}