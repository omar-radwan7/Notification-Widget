# Interview Questions

## 1. How I approached researching this task

First thing I did was understand what pump.fun actually is. It's a platform on Solana where people trade meme tokens. So when someone buys a token, that's a transaction on the blockchain.

My main question was: how do I get those transactions in real-time? I looked into a few options and ended up going with Triton gRPC because it streams data directly from Solana without much delay.

I also had to figure out how pump.fun structures their transactions — like which part of the data tells me it's a "buy" and where the token address and amounts are stored.

For the frontend, I just looked at how other embed widgets work (like chat widgets or analytics scripts). They all do the same thing: one script tag, handles everything on its own, doesn't mess with the host website.

---

## 2. Technology choices

**Backend: Node.js with TypeScript**

I went with Node because it handles async stuff well, which matters when you're dealing with WebSockets and streaming data. Plus the Solana libraries are pretty solid in JavaScript. TypeScript just helps catch mistakes.

I didn't use a framework like Express because honestly the backend is simple — it just serves one file and handles WebSocket connections. Didn't need anything fancy.

**Frontend: Plain JavaScript**

I didn't use React or Vue because it felt like overkill for a notification popup. Also, loading a whole framework could conflict with whatever the customer's site is already using. Keeping it simple made more sense.

I wrapped everything in a function so it doesn't interfere with the host site's code, and I prefixed all the CSS classes so they don't clash with existing styles.

---

## 3. Problems that could happen and how I'd handle them

**Connections dropping**

This just happens with WebSockets and streaming connections. Networks aren't perfect. So I built in auto-reconnect on both sides — if the connection drops, it tries again after a few seconds.

**Getting too popular**

If lots of sites start using this, one server won't be enough. I'd add more servers behind a load balancer and use something like Redis to share events between them.

**HTTPS issues**

If a customer's site is on HTTPS and my backend is on HTTP, browsers will block it. So in production, the backend needs to run on HTTPS too.

**Styles breaking**

Some websites have weird CSS that could mess with the widget. That's why I named all my classes with a prefix — less chance of conflicts.
