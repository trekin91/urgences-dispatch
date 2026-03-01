/**
 * Generates emergency calls based on time of day and active services.
 * Frequency follows a realistic curve: quiet at night, peaks around 11h and 18h.
 */
const { v4: uuidv4 } = require('uuid');
const { allScenarios } = require('./scenarios');

/**
 * Relative call frequency by hour (0-23).
 * Normalized so peak = 1.0.
 */
const FREQUENCY_CURVE = [
  0.10, 0.08, 0.05, 0.04, 0.03, 0.05, // 00-05
  0.15, 0.30, 0.50, 0.65, 0.80, 1.00, // 06-11
  0.90, 0.75, 0.70, 0.75, 0.85, 1.00, // 12-17
  0.90, 0.70, 0.55, 0.40, 0.25, 0.15, // 18-23
];

class CallGenerator {
  /**
   * @param {object} clock - GameClock instance
   * @param {object} opts
   * @param {number} opts.baseInterval - Base check interval in ms (real time)
   * @param {number} opts.baseProbability - Base probability per check at peak hour
   */
  constructor(clock, opts = {}) {
    this.clock = clock;
    this.baseInterval = opts.baseInterval || 5000;
    this.baseProbability = opts.baseProbability || 0.4;
    this._interval = null;
    this._listeners = [];
  }

  /** Register a listener: fn(call) */
  onCall(fn) {
    this._listeners.push(fn);
  }

  /**
   * Generate a random call for the given service.
   * @param {string} service - '18', '15', or '17'
   * @param {object} locationPool - Array of {lat, lng, address} from the department stations
   * @returns {object} call
   */
  generate(service, locationPool) {
    const scenarios = allScenarios[service];
    if (!scenarios || scenarios.length === 0) return null;

    const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    const textEntry = scenario.texts[Math.floor(Math.random() * scenario.texts.length)];
    const location = locationPool[Math.floor(Math.random() * locationPool.length)];

    const callerText = textEntry.text.replace('{address}', location.address);

    return {
      id: uuidv4(),
      service,
      nature: scenario.nature,
      type: scenario.type,
      severity: scenario.severity,
      text: callerText,
      emotion: textEntry.emotion,
      address: location.address,
      lat: location.lat,
      lng: location.lng,
      suggestedVehicles: [...scenario.vehicles],
      gameTime: this.clock.now(),
      ringing: true,
    };
  }

  /** Should a call be generated right now? Considers time-of-day frequency */
  shouldGenerate() {
    const hour = this.clock.hour();
    const freq = FREQUENCY_CURVE[hour] || 0.1;
    return Math.random() < this.baseProbability * freq;
  }

  /**
   * Start automatic generation for given active services.
   * @param {string[]} activeServices - e.g. ['18'] or ['18','15','17']
   * @param {object} locationPool - locations for the department
   */
  start(activeServices, locationPool) {
    if (this._interval) return;
    this._interval = setInterval(() => {
      for (const service of activeServices) {
        if (this.shouldGenerate()) {
          const call = this.generate(service, locationPool);
          if (call) {
            for (const fn of this._listeners) fn(call);
          }
        }
      }
    }, this.baseInterval);
  }

  stop() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
  }
}

module.exports = { CallGenerator };
