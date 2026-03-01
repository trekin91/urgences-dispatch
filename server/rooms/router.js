/**
 * Socket.io event router.
 * Routes incoming events to the appropriate handler based on service and room.
 */

function setupRoomRouter(io, roomManager, gameEngine) {
  io.on('connection', (socket) => {
    console.log(`[socket] Connected: ${socket.id}`);

    // ── Join a game center ──────────────────────────────

    socket.on('room:join', (data) => {
      const { roomId, userId, username, service } = data;
      if (!roomId || !service) {
        return socket.emit('error', { message: 'roomId and service are required' });
      }

      roomManager.join(socket, roomId, { userId, username, service });

      // Initialize game engine for this room if not already done
      const roomEngine = gameEngine.initRoom(roomId);

      // Activate the service for this player
      // TODO: load real locations from DB for the department
      const defaultLocations = getDefaultLocations();
      gameEngine.activateService(roomId, service, defaultLocations);

      // Send current state to the joining player
      socket.emit('room:state', {
        room: roomManager.getRoomSummary(roomId),
        clock: roomEngine.clock.formatted(),
        timeFactor: roomEngine.clock.timeFactor,
        calls: [...roomEngine.calls.values()].filter(c => c.service === service),
        interventions: [...roomEngine.interventions.values()].filter(i => i.service === service),
      });
    });

    // ── Call handling ────────────────────────────────────

    socket.on('call:answer', ({ callId }) => {
      const roomId = socket.roomId;
      if (!roomId) return;
      const call = gameEngine.answerCall(roomId, callId);
      if (call) {
        io.to(roomId).emit('call:answered', { callId, answeredBy: socket.id });
      }
    });

    socket.on('call:reject', ({ callId }) => {
      const roomId = socket.roomId;
      if (!roomId) return;
      const room = gameEngine.rooms.get(roomId);
      if (room) {
        room.calls.delete(callId);
        io.to(roomId).emit('call:rejected', { callId });
      }
    });

    socket.on('call:transfer', ({ callId, targetService }) => {
      const roomId = socket.roomId;
      if (!roomId) return;
      const room = gameEngine.rooms.get(roomId);
      if (!room) return;

      const call = room.calls.get(callId);
      if (!call) return;

      // If target service has active players, route to them
      const targetPlayers = roomManager.getPlayersForService(roomId, targetService);
      if (targetPlayers.length > 0) {
        call.service = targetService;
        call.ringing = true;
        io.to(roomId).emit('call:transferred', { callId, fromService: call.service, toService: targetService });
      } else {
        // Auto-handle: no player for that service
        room.calls.delete(callId);
        io.to(roomId).emit('call:auto_handled', { callId, service: targetService });
      }
    });

    // ── Dispatch ─────────────────────────────────────────

    socket.on('dispatch', ({ callId, vehicleIds }) => {
      const roomId = socket.roomId;
      if (!roomId) return;
      const intervention = gameEngine.dispatch(roomId, callId, vehicleIds || []);
      if (intervention) {
        io.to(roomId).emit('intervention:new', intervention);
        io.to(roomId).emit('call:removed', { callId });
      }
    });

    // ── Time factor ─────────────────────────────────────

    socket.on('clock:setFactor', ({ factor }) => {
      const roomId = socket.roomId;
      if (!roomId) return;
      gameEngine.setTimeFactor(roomId, factor);
      io.to(roomId).emit('clock:factorChanged', { factor });
    });

    // ── Disconnect ──────────────────────────────────────

    socket.on('disconnect', () => {
      console.log(`[socket] Disconnected: ${socket.id}`);
      const result = roomManager.leave(socket);
      if (result && result.roomId) {
        const activeServices = roomManager.getActiveServices(result.roomId);
        // If a service has no more players, deactivate it
        if (result.player) {
          const servicePlayers = roomManager.getPlayersForService(result.roomId, result.player.service);
          if (servicePlayers.length === 0) {
            const defaultLocations = getDefaultLocations();
            gameEngine.deactivateService(result.roomId, result.player.service, defaultLocations);
          }
        }
        // Destroy room engine if empty
        if (result.isEmpty) {
          gameEngine.destroyRoom(result.roomId);
        }
      }
    });
  });
}

/**
 * Default location pool for Marseille (department 13).
 * Will be replaced with real OSM data from the database.
 */
function getDefaultLocations() {
  return [
    { lat: 43.299, lng: 5.388, address: '45 Bd Longchamp, 13001 Marseille' },
    { lat: 43.292, lng: 5.381, address: '12 Rue de Rome, 13006 Marseille' },
    { lat: 43.270, lng: 5.420, address: 'A50 dir. Aubagne, Marseille' },
    { lat: 43.271, lng: 5.392, address: 'Rd-point du Prado, 13008 Marseille' },
    { lat: 43.2925, lng: 5.365, address: 'Quai Rive Neuve, 13007 Marseille' },
    { lat: 43.2935, lng: 5.373, address: '8 Rue Sainte, 13001 Marseille' },
    { lat: 43.305, lng: 5.386, address: '23 Av. Chartreux, 13004 Marseille' },
    { lat: 43.356, lng: 5.352, address: 'Grand Littoral, 13016 Marseille' },
    { lat: 43.310, lng: 5.395, address: '15 Bd de la Libération, 13004 Marseille' },
    { lat: 43.285, lng: 5.375, address: '3 Rue du Petit Puits, 13002 Marseille' },
    { lat: 43.300, lng: 5.400, address: '120 Av. de la Rose, 13013 Marseille' },
    { lat: 43.280, lng: 5.390, address: '45 Bd Baille, 13005 Marseille' },
  ];
}

module.exports = { setupRoomRouter };
