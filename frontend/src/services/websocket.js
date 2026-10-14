/**
 * Real-Time WebSocket Manager with auto-reconnection and event dispatching.
 */

export class LectureWebSocket {
  constructor(lectureId, onMessageCallback, onStatusChange = null) {
    this.lectureId = lectureId;
    this.onMessageCallback = onMessageCallback;
    this.onStatusChange = onStatusChange;
    this.socket = null;
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.isClosedManually = false;
  }

  connect() {
    if (!this.lectureId) return;

    this.isClosedManually = false;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/lectures/${this.lectureId}`;

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log(`[WebSocket] Connected to lecture ${this.lectureId}`);
        if (this.onStatusChange) this.onStatusChange(true);
        this.startHeartbeat();
      };

      this.socket.onmessage = (event) => {
        try {
          if (event.data === 'pong') return;
          const data = JSON.parse(event.data);
          if (this.onMessageCallback) {
            this.onMessageCallback(data);
          }
        } catch (e) {
          console.error('[WebSocket] Parse error:', e);
        }
      };

      this.socket.onerror = (err) => {
        console.warn('[WebSocket] Socket error:', err);
      };

      this.socket.onclose = () => {
        console.log('[WebSocket] Connection closed.');
        if (this.onStatusChange) this.onStatusChange(false);
        this.stopHeartbeat();
        if (!this.isClosedManually) {
          this.reconnectTimer = setTimeout(() => this.connect(), 2500);
        }
      };
    } catch (err) {
      console.error('[WebSocket] Connect exception:', err);
      if (this.onStatusChange) this.onStatusChange(false);
    }
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send('ping');
      }
    }, 20000);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  disconnect() {
    this.isClosedManually = true;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}
