/**
 * Core game engine.
 * Owns the game clock, call generator, and intervention lifecycle.
 * One engine instance per active game center (room).
 */
const { GameClock } = require('./clock');
const { CallGenerator } = require('./callGenerator');
const config = require('../config');

class GameEngine {
  /**
   * @param {import('socket.io').Server} io
   * @param {import('../rooms/manager').RoomManager} roomManager
   */
  constructor(io, roomManager) {
    this.io = io;
    this.roomManager = roomManager;
    /** Map<roomId, RoomEngine> */
    this.rooms = new Map();
  }

  /** Initialize engine for a room when first player joins */
  initRoom(roomId, options = {}) {
    if (this.rooms.has(roomId)) return this.rooms.get(roomId);

    const timeFactor = options.timeFactor || config.game.defaultTimeFactor;
    const clock = new GameClock(timeFactor);
    const callGen = new CallGenerator(clock);

    const roomEngine = {
      roomId,
      clock,
      callGen,
      activeServices: new Set(),
      interventions: new Map(),
      calls: new Map(),
    };

    // When a call is generated, broadcast to the room
    callGen.onCall((call) => {
      roomEngine.calls.set(call.id, call);
      this.io.to(roomId).emit('call:new', call);
    });

    // Tick — broadcast clock every second
    clock.onTick((_gameTime, formatted) => {
      this.io.to(roomId).emit('clock:tick', {
        time: formatted,
        timeFactor: clock.timeFactor,
      });
    });

    clock.start();
    this.rooms.set(roomId, roomEngine);
    return roomEngine;
  }

  /** Add a service to a room's active services and restart call generation */
  activateService(roomId, service, locationPool) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.activeServices.add(service);
    // Restart generator with updated services list
    room.callGen.stop();
    room.callGen.start([...room.activeServices], locationPool);
  }

  /** Remove a service (no more players for that service) */
  deactivateService(roomId, service, locationPool) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.activeServices.delete(service);
    room.callGen.stop();
    if (room.activeServices.size > 0) {
      room.callGen.start([...room.activeServices], locationPool);
    }
  }

  /** Answer a ringing call */
  answerCall(roomId, callId) {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    const call = room.calls.get(callId);
    if (!call) return null;
    call.ringing = false;
    return call;
  }

  /** Dispatch vehicles for a call, creating an intervention */
  dispatch(roomId, callId, vehicleIds) {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const call = room.calls.get(callId);
    if (!call) return null;

    const intervention = {
      id: `INT-${Date.now().toString(36).toUpperCase()}`,
      callId,
      nature: call.nature,
      address: call.address,
      lat: call.lat,
      lng: call.lng,
      severity: call.severity,
      service: call.service,
      status: 'en_route',
      vehicles: vehicleIds,
      dispatchedAt: room.clock.now(),
    };

    room.interventions.set(intervention.id, intervention);
    room.calls.delete(callId);

    // Schedule status progression
    this._scheduleProgression(roomId, intervention);

    return intervention;
  }

  /** Simulate intervention lifecycle: en_route → on_scene → resolved */
  _scheduleProgression(roomId, intervention) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // Arrival: 5-15s real time (scaled by time factor conceptually)
    const arrivalDelay = 5000 + Math.random() * 10000;
    setTimeout(() => {
      if (!room.interventions.has(intervention.id)) return;
      intervention.status = 'on_scene';
      this.io.to(roomId).emit('intervention:update', intervention);

      // Resolution: 10-25s real time
      const resolveDelay = 10000 + Math.random() * 15000;
      setTimeout(() => {
        if (!room.interventions.has(intervention.id)) return;
        intervention.status = 'resolved';
        room.interventions.delete(intervention.id);
        this.io.to(roomId).emit('intervention:resolved', intervention);
      }, resolveDelay);
    }, arrivalDelay);
  }

  /** Change time factor for a room */
  setTimeFactor(roomId, factor) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.clock.setTimeFactor(factor);
  }

  /** Tear down a room engine when all players leave */
  destroyRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.clock.stop();
    room.callGen.stop();
    this.rooms.delete(roomId);
  }
}

module.exports = { GameEngine };
