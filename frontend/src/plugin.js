(function() {
  'use strict';

  const script = document.currentScript;
  const tokenAddress = script.getAttribute('data-token');
  const wsUrl = script.getAttribute('data-ws-url') || 'ws://localhost:3000';

  if (!tokenAddress) {
    console.error('PumpFun Plugin: Missing data-token attribute');
    return;
  }

  // Inject styles
  const style = document.createElement('style');
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap');
    
    .pf-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      display: flex;
      flex-direction: column;
      gap: 12px;
      font-family: 'Space Grotesk', system-ui, sans-serif;
    }
    
    .pf-toast {
      position: relative;
      width: 340px;
      background: rgba(13, 13, 18, 0.95);
      backdrop-filter: blur(20px);
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      overflow: hidden;
      animation: pf-enter 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 
        0 0 0 1px rgba(0, 255, 136, 0.1),
        0 20px 50px -12px rgba(0, 0, 0, 0.5),
        0 0 80px -20px rgba(0, 255, 136, 0.3);
    }
    
    .pf-toast.pf-exit {
      animation: pf-leave 0.3s cubic-bezier(0.4, 0, 1, 1) forwards;
    }
    
    .pf-glow {
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: conic-gradient(from 180deg, transparent, rgba(0, 255, 136, 0.1), transparent 30%);
      animation: pf-rotate 4s linear infinite;
      pointer-events: none;
    }
    
    .pf-content {
      position: relative;
      padding: 16px 20px;
      display: flex;
      gap: 14px;
      align-items: flex-start;
    }
    
    .pf-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, #00ff88 0%, #00cc6a 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 4px 12px rgba(0, 255, 136, 0.3);
    }
    
    .pf-icon svg {
      width: 22px;
      height: 22px;
      fill: #0d0d12;
    }
    
    .pf-body {
      flex: 1;
      min-width: 0;
    }
    
    .pf-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }
    
    .pf-badge {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #00ff88;
      background: rgba(0, 255, 136, 0.12);
      padding: 3px 8px;
      border-radius: 4px;
    }
    
    .pf-time {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.35);
    }
    
    .pf-amount {
      font-size: 22px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 4px;
      display: flex;
      align-items: baseline;
      gap: 6px;
    }
    
    .pf-amount span {
      font-size: 13px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.5);
    }
    
    .pf-detail {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.55);
    }
    
    .pf-detail strong {
      color: #00ff88;
      font-weight: 600;
    }
    
    .pf-wallet {
      font-family: 'SF Mono', 'Fira Code', monospace;
      color: rgba(255, 255, 255, 0.7);
    }
    
    .pf-progress {
      height: 3px;
      background: rgba(255, 255, 255, 0.05);
    }
    
    .pf-progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #00ff88, #00cc6a);
      animation: pf-countdown 5s linear forwards;
      transform-origin: left;
    }
    
    @keyframes pf-enter {
      from {
        opacity: 0;
        transform: translateX(100%) scale(0.9);
      }
      to {
        opacity: 1;
        transform: translateX(0) scale(1);
      }
    }
    
    @keyframes pf-leave {
      to {
        opacity: 0;
        transform: translateX(30%) scale(0.95);
      }
    }
    
    @keyframes pf-rotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    @keyframes pf-countdown {
      from { transform: scaleX(1); }
      to { transform: scaleX(0); }
    }
  `;
  document.head.appendChild(style);

  // Create container
  const container = document.createElement('div');
  container.className = 'pf-container';
  document.body.appendChild(container);

  // Show notification
  function showNotification(data) {
    const toast = document.createElement('div');
    toast.className = 'pf-toast';
    
    const tokens = parseFloat(data.tokenAmount);
    const sol = parseFloat(data.solAmount);
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    toast.innerHTML = `
      <div class="pf-glow"></div>
      <div class="pf-content">
        <div class="pf-icon">
          <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        </div>
        <div class="pf-body">
          <div class="pf-header">
            <span class="pf-badge">Buy</span>
            <span class="pf-time">${time}</span>
          </div>
          <div class="pf-amount">
            ${tokens.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            <span>tokens</span>
          </div>
          <div class="pf-detail">
            <span class="pf-wallet">${data.buyer}</span> paid <strong>${sol.toFixed(4)} SOL</strong>
          </div>
        </div>
      </div>
      <div class="pf-progress"><div class="pf-progress-bar"></div></div>
    `;
    
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('pf-exit');
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }

  // WebSocket connection
  function connect() {
    const ws = new WebSocket(wsUrl + '?token=' + encodeURIComponent(tokenAddress));
    
    ws.onopen = () => console.log('PumpFun Plugin: Connected');
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'buy') showNotification(msg.data);
    };
    ws.onclose = () => setTimeout(connect, 3000);
    ws.onerror = (err) => console.error('PumpFun Plugin:', err);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', connect);
  } else {
    connect();
  }
})();
