/**
 * Manages Socket.io rooms mapped to game centers.
 * Tracks which players are in which room/service.
 */
class RoomManager {
  constructor(io) {
    this.io = io;
    /** Map<roomId, { centerId, players: Map<socketId, {userId, username, service}> }> */
    this.rooms = new Map();
  }

  /** Get or create a room for a game center */
  getRoom(roomId) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        centerId: roomId,
        players: new Map(),
      });
    }
    return this.rooms.get(roomId);
  }

  /** Add a player to a room */
  join(socket, roomId, playerInfo) {
    const room = this.getRoom(roomId);
    room.players.set(socket.id, {
      userId: playerInfo.userId,
      username: playerInfo.username,
      service: playerInfo.service,
    });
    socket.join(roomId);
    socket.roomId = roomId;

    // Notify room
    this.io.to(roomId).emit('room:player_joined', {
      socketId: socket.id,
      username: playerInfo.username,
      service: playerInfo.service,
      playerCount: room.players.size,
    });

    return room;
  }

  /** Remove a player from their room */
  leave(socket) {
    const roomId = socket.roomId;
    if (!roomId) return null;

    const room = this.rooms.get(roomId);
    if (!room) return null;

    const player = room.players.get(socket.id);
    room.players.delete(socket.id);
    socket.leave(roomId);
    delete socket.roomId;

    // Notify remaining players
    this.io.to(roomId).emit('room:player_left', {
      socketId: socket.id,
      username: player?.username,
      service: player?.service,
      playerCount: room.players.size,
    });

    // Clean up empty rooms
    if (room.players.size === 0) {
      this.rooms.delete(roomId);
    }

    return { roomId, player, isEmpty: !this.rooms.has(roomId) };
  }

  /** Get active services in a room (services that have at least one player) */
  getActiveServices(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    const services = new Set();
    for (const p of room.players.values()) {
      services.add(p.service);
    }
    return [...services];
  }

  /** Get players for a specific service in a room */
  getPlayersForService(roomId, service) {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    return [...room.players.entries()]
      .filter(([, p]) => p.service === service)
      .map(([socketId, p]) => ({ socketId, ...p }));
  }

  /** Get room summary for lobby display */
  getRoomSummary(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    return {
      roomId,
      playerCount: room.players.size,
      services: this.getActiveServices(roomId),
      players: [...room.players.values()].map(p => ({
        username: p.username,
        service: p.service,
      })),
    };
  }
}

module.exports = { RoomManager };
