// ============================================================
//  tests/setup.js — CrypView V2
//  Mocks globaux des APIs navigateur pour l'environnement Node.
//  Exécuté avant chaque fichier de test (setupFiles dans vitest.config).
// ============================================================

// ── window / dispatchEvent ───────────────────────────────────
global.window = global;
global.dispatchEvent = () => {};

// ── CustomEvent ───────────────────────────────────────────────
global.CustomEvent = class CustomEvent {
  constructor(type, opts = {}) {
    this.type    = type;
    this.detail  = opts.detail  ?? {};
    this.bubbles = opts.bubbles ?? false;
  }
};

// ── localStorage ──────────────────────────────────────────────
const _ls = Object.create(null);
global.localStorage = {
  getItem:    (k)    => _ls[k] ?? null,
  setItem:    (k, v) => { _ls[k] = String(v); },
  removeItem: (k)    => { delete _ls[k]; },
  clear:      ()     => { Object.keys(_ls).forEach(k => delete _ls[k]); },
  key:        (i)    => Object.keys(_ls)[i],
  get length() { return Object.keys(_ls).length; },
};

// ── BroadcastChannel ─────────────────────────────────────────
global.BroadcastChannel = class BroadcastChannel {
  onmessage = null;
  postMessage() {}
  close() {}
};

// ── Web Notifications ─────────────────────────────────────────
global.Notification = Object.assign(
  class Notification { constructor() {} },
  { permission: 'denied', requestPermission: async () => 'denied' }
);

// ── Web Audio API ─────────────────────────────────────────────
const _audioNode = () => ({
  connect() {},
  type: 'sine',
  frequency: { setValueAtTime() {} },
  gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
  start() {},
  stop() {},
});
global.AudioContext = class AudioContext {
  currentTime = 0;
  destination = {};
  createOscillator() { return _audioNode(); }
  createGain()       { return _audioNode(); }
};
global.webkitAudioContext = global.AudioContext;

// ── WebSocket — mock contrôlable ──────────────────────────────
class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN       = 1;
  static CLOSING    = 2;
  static CLOSED     = 3;
  static instances  = [];

  constructor(url) {
    this.url        = url;
    this.readyState = FakeWebSocket.CONNECTING;
    this.onopen = this.onmessage = this.onerror = this.onclose = null;
    this._sent  = [];
    FakeWebSocket.instances.push(this);
  }

  // Helpers for tests
  _open()          { this.readyState = FakeWebSocket.OPEN;   this.onopen?.(); }
  _message(data)   { this.onmessage?.({ data: typeof data === 'string' ? data : JSON.stringify(data) }); }
  _error()         { this.onerror?.(); }
  _close()         { this.readyState = FakeWebSocket.CLOSED; this.onclose?.(); }

  close()  { this._close(); }
  send(d)  { this._sent.push(d); }

  static last()  { return FakeWebSocket.instances.at(-1); }
  static reset() { FakeWebSocket.instances = []; }
}
global.WebSocket = FakeWebSocket;

// ── document minimal (pour ExportManager / templates) ─────────
if (typeof global.document === 'undefined') {
  global.document = {
    createElement: () => ({ style: {}, href: '', download: '', click() {}, setAttribute() {} }),
    body: { appendChild() {}, removeChild() {} },
    execCommand: () => false,
    addEventListener: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
    title: '',
  };
}

// ── location (ExportManager.buildShareURL) ────────────────────
Object.defineProperty(global, 'location', {
  value: { pathname: '/page.html', origin: 'https://crypview.test', href: '', search: '' },
  writable: true, configurable: true,
});

// ── navigator ─────────────────────────────────────────────────
global.navigator = global.navigator ?? {};
global.navigator.clipboard = { writeText: async () => {} };
global.navigator.share = undefined;
