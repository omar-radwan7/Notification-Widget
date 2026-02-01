import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { parse } from 'url';
import { config } from 'dotenv';
import { GrpcClient } from './grpc-client';
import { BuyEvent, truncateAddress } from './pump-parser';

config();

const PORT = parseInt(process.env.PORT || '3000');
const GRPC_ENDPOINT = process.env.GRPC_ENDPOINT || 'https://grpc.triton.one';
const GRPC_TOKEN = process.env.GRPC_TOKEN || '';

// Map of token addresses to subscribed WebSocket clients
const subscriptions = new Map<string, Set<WebSocket>>();

// Create HTTP server
const server = createServer((req, res) => {
  // Serve the frontend plugin
  if (req.url === '/plugin.js') {
    res.writeHead(200, {
      'Content-Type': 'application/javascript',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(getPluginScript());
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Pump.fun Notification Server');
});

// Create WebSocket server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws: WebSocket, req) => {
  const { query } = parse(req.url || '', true);
  const tokenAddress = query.token as string;

  if (!tokenAddress) {
    ws.close(4000, 'Missing token parameter');
    return;
  }

  console.log(`Client connected for token: ${tokenAddress}`);

  // Add client to subscription set
  if (!subscriptions.has(tokenAddress)) {
    subscriptions.set(tokenAddress, new Set());
  }
  subscriptions.get(tokenAddress)!.add(ws);

  // Handle client disconnect
  ws.on('close', () => {
    const clients = subscriptions.get(tokenAddress);
    if (clients) {
      clients.delete(ws);
      if (clients.size === 0) {
        subscriptions.delete(tokenAddress);
      }
    }
    console.log(`Client disconnected for token: ${tokenAddress}`);
  });

  // Send confirmation
  ws.send(JSON.stringify({ type: 'connected', tokenAddress }));
});

// Handle buy events from gRPC
function handleBuyEvent(event: BuyEvent): void {
  const clients = subscriptions.get(event.tokenAddress);
  
  if (!clients || clients.size === 0) return;

  const message = JSON.stringify({
    type: 'buy',
    data: {
      tokenAddress: event.tokenAddress,
      buyer: truncateAddress(event.buyer),
      tokenAmount: event.tokenAmount,
      solAmount: event.solAmount,
      timestamp: event.timestamp,
      signature: event.signature,
    },
  });

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });

  console.log(`Buy event for ${event.tokenAddress}: ${event.tokenAmount} tokens`);
}

// Serve the embedded plugin script
function getPluginScript(): string {
  const wsUrl = process.env.WS_URL || `ws://localhost:${PORT}`;
  return `
(function() {
  const script = document.currentScript;
  const tokenAddress = script.getAttribute('data-token');
  const wsUrl = '${wsUrl}';
  
  if (!tokenAddress) {
    console.error('PumpFun Plugin: Missing data-token attribute');
    return;
  }

  // Inject styles
  const style = document.createElement('style');
  style.textContent = \`
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
  \`;
  document.head.appendChild(style);

  // Create notification container
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
    
    toast.innerHTML = \`
      <div class="pf-glow"></div>
      <div class="pf-content">
        <div class="pf-icon">
          <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        </div>
        <div class="pf-body">
          <div class="pf-header">
            <span class="pf-badge">Buy</span>
            <span class="pf-time">\${time}</span>
          </div>
          <div class="pf-amount">
            \${tokens.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            <span>tokens</span>
          </div>
          <div class="pf-detail">
            <span class="pf-wallet">\${data.buyer}</span> paid <strong>\${sol.toFixed(4)} SOL</strong>
          </div>
        </div>
      </div>
      <div class="pf-progress"><div class="pf-progress-bar"></div></div>
    \`;
    
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
`.trim();
}

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Initialize gRPC client or mock mode
if (GRPC_TOKEN) {
  const grpcClient = new GrpcClient(GRPC_ENDPOINT, GRPC_TOKEN, handleBuyEvent);
  grpcClient.subscribe().catch(console.error);
} else {
  console.log('No GRPC_TOKEN set - running in MOCK mode');
  console.log('Sending simulated buy events every 5 seconds for testing');
  
  setInterval(() => {
    const tokens = Array.from(subscriptions.keys());
    if (tokens.length === 0) return;
    
    const tokenAddress = tokens[Math.floor(Math.random() * tokens.length)];
    const mockEvent: BuyEvent = {
      tokenAddress,
      buyer: generateMockAddress(),
      tokenAmount: (Math.random() * 10000).toFixed(6),
      solAmount: (Math.random() * 2).toFixed(9),
      timestamp: Date.now(),
      signature: 'mock_' + Math.random().toString(36).substring(7),
    };
    handleBuyEvent(mockEvent);
  }, 5000);
}

function generateMockAddress(): string {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let addr = '';
  for (let i = 0; i < 44; i++) {
    addr += chars[Math.floor(Math.random() * chars.length)];
  }
  return addr;
}
