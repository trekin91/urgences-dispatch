const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const config = require('./config');
const { setupRoomRouter } = require('./rooms/router');
const { RoomManager } = require('./rooms/manager');
const { GameEngine } = require('./game/engine');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: config.nodeEnv === 'development' ? { origin: '*' } : undefined,
});

// --- Middleware ---
app.use(express.json());

// Serve static client files
app.use(express.static(path.join(__dirname, '..', 'client')));

// --- REST API routes ---
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Auth routes (placeholder — wired up in auth module)
const authRouter = require('./auth/auth');
app.use('/api/auth', authRouter);

// --- Socket.io ---
const roomManager = new RoomManager(io);
const gameEngine = new GameEngine(io, roomManager);

setupRoomRouter(io, roomManager, gameEngine);

// --- Start ---
server.listen(config.port, () => {
  console.log(`[server] Urgence Dispatch running on http://localhost:${config.port}`);
  console.log(`[server] env=${config.nodeEnv}  timeFactor=×${config.game.defaultTimeFactor}`);
});
