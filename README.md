# pump.fun Buy Notification Widget

A simple embeddable widget that shows real-time buy notifications for pump.fun tokens. Token creators paste one script tag into their site and they're done.

## Getting Started

```bash
cd backend
npm install
npm run dev
```

The server starts on port 3000. Without a Triton API token, it runs in mock mode and sends fake buy events every few seconds (useful for testing).

## Embedding the Widget

Customers add this to their website:

```html
<script src="http://your-server.com/plugin.js" data-token="TOKEN_ADDRESS"></script>
```

- `src` — points to your backend server (where you host this service)
- `data-token` — the customer's pump.fun token contract address

That's it. The widget handles everything else.

## Where Customers Add the Script

Customers paste the script tag into their own website's HTML, usually before the closing `</body>` tag. Depending on their platform:

- **Plain HTML** — edit the `.html` file directly
- **WordPress** — Appearance → Theme Editor, or use a "Custom Scripts" plugin
- **Shopify** — Online Store → Themes → Edit code → `theme.liquid`
- **Wix / Squarespace** — Settings → Custom Code section

Example of a customer's site after adding the widget:

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Token</title>
</head>
<body>
  <h1>Welcome to $MOON</h1>

  <!-- Customer pastes this one line -->
  <script src="https://api.yourservice.com/plugin.js" data-token="4k3Dyjz..."></script>
</body>
</html>
```

## How Customers Get This Code

You'd provide the embed code through:

- A docs page with copy-paste instructions
- Or a dashboard where they enter their token address and get a personalized snippet

## Testing the Widget

1. Make sure the backend is running (`npm run dev` in the `backend` folder)
2. Open `test.html` in your browser (just double-click the file)
3. Wait a few seconds — notifications will appear in the bottom-right corner

These demo pages show what the widget looks like when embedded on a customer's site.

## Why pump.fun Specifically?

The backend is built to listen to pump.fun's Solana program. Here's what makes it pump.fun-specific:

1. **Program ID** — The gRPC client filters for pump.fun's program (`6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P`)

2. **Buy instruction format** — The parser knows how to decode pump.fun's specific buy instruction structure

3. **Account layout** — We know which accounts hold the token address, buyer, and amounts based on pump.fun's design

To support a different platform, you'd swap out the program ID and update the parser for that platform's instruction format.

## Real Blockchain Data

To stream actual pump.fun buys instead of mock data:

1. Get a Triton gRPC API token
2. Create `backend/.env` with:

```
GRPC_TOKEN=your_token_here
```

3. Restart the server

## WebSocket Format

The widget receives messages like this:

```json
{
  "type": "buy",
  "data": {
    "buyer": "abcd...wxyz",
    "tokenAmount": "1000.000000",
    "solAmount": "0.50",
    "timestamp": 1706745600000
  }
}
```

## Issues?

- No notifications showing? Check browser console for WebSocket connection errors
- Make sure the backend is actually running
- If using https on your site, you'll need to host the backend on https too

---

## Design Decisions

### Research approach

Before building, I needed to understand how pump.fun works on Solana. Every token purchase is a blockchain transaction, so the challenge was getting those transactions in real-time.

I looked at different ways to get Solana data and settled on Triton gRPC — it streams transactions directly with low latency. I also studied pump.fun's transaction structure to know how to identify buy events and extract the relevant data.

For the widget itself, I followed the same approach as other embeddable tools like analytics scripts — keep it self-contained, one script tag, don't interfere with the host site.

### Why these technologies

**Node.js for the backend** — handles async operations well, which is important for WebSockets and streaming. The Solana JavaScript libraries are mature. Didn't need a framework since the backend is straightforward.

**Plain JavaScript for the widget** — a framework like React would add unnecessary size and could conflict with whatever the customer is already running. The widget is small enough that vanilla JS makes more sense. All CSS classes are prefixed to avoid style conflicts.

### Potential issues down the road

**Dropped connections** — WebSockets and gRPC streams disconnect sometimes. Both the backend and frontend have auto-reconnect built in.

**Scaling** — if many websites use this, a single server won't handle all the connections. Would need multiple servers with a load balancer and Redis to distribute events.

**HTTPS** — browsers block HTTP content on HTTPS sites. Production deployment needs HTTPS and secure WebSocket (`wss://`).

**Style conflicts** — host websites have unpredictable CSS. The `pf-` class prefix helps avoid most issues.
