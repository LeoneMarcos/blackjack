import type { OnlineRole } from './types';

type ServerSignalingMessage =
  | { type: 'assigned_role'; role: OnlineRole; roomId: string }
  | { type: 'peer_joined'; role: OnlineRole }
  | { type: 'peer_left'; role: OnlineRole }
  | { type: 'signal'; data: Record<string, unknown> }
  | { type: 'error'; code: string; message: string }
  | { type: 'pong' };

function isRole(value: unknown): value is OnlineRole {
  return value === 'host' || value === 'guest';
}

export function parseServerSignalingMessage(value: unknown): ServerSignalingMessage | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const message = value as Record<string, unknown>;

  switch (message.type) {
    case 'assigned_role':
      return isRole(message.role) &&
        typeof message.roomId === 'string' &&
        /^[A-Z0-9]{3,12}$/.test(message.roomId)
        ? (message as ServerSignalingMessage)
        : null;
    case 'peer_joined':
    case 'peer_left':
      return isRole(message.role) ? (message as ServerSignalingMessage) : null;
    case 'signal':
      return message.data !== null &&
        typeof message.data === 'object' &&
        !Array.isArray(message.data)
        ? (message as ServerSignalingMessage)
        : null;
    case 'error':
      return typeof message.code === 'string' && typeof message.message === 'string'
        ? (message as ServerSignalingMessage)
        : null;
    case 'pong':
      return { type: 'pong' };
    default:
      return null;
  }
}

export function normalizeSignalingBaseUrl(value: string): string {
  let normalized = value.trim();

  if (normalized.startsWith('https://')) {
    normalized = `wss://${normalized.slice('https://'.length)}`;
  } else if (normalized.startsWith('http://')) {
    normalized = `ws://${normalized.slice('http://'.length)}`;
  }

  const parsed = new URL(normalized);
  if (parsed.protocol !== 'ws:' && parsed.protocol !== 'wss:') {
    throw new Error('Signaling URL must use ws://, wss://, http://, or https://.');
  }
  if (parsed.username || parsed.password) {
    throw new Error('Signaling URL must not contain embedded credentials.');
  }

  parsed.search = '';
  parsed.hash = '';
  return parsed.toString().replace(/\/+$/, '');
}

export function getSignalingUrl(roomId: string, intent?: 'create' | 'join'): string {
  const env = (
    import.meta as unknown as {
      env?: { VITE_SIGNALING_URL?: string; DEV?: boolean };
    }
  ).env;

  const configuredUrl = env?.VITE_SIGNALING_URL?.trim();
  if (!configuredUrl && !env?.DEV) {
    throw new Error('VITE_SIGNALING_URL is required for Online P2P in production.');
  }

  const base = normalizeSignalingBaseUrl(configuredUrl || 'ws://127.0.0.1:8787');
  const intentQuery = intent ? `?intent=${encodeURIComponent(intent)}` : '';
  return `${base}/room/${encodeURIComponent(roomId.toUpperCase())}/ws${intentQuery}`;
}

export interface SignalingCallbacks {
  onRoleAssigned: (role: OnlineRole, roomId: string) => void;
  onPeerJoined: (role: OnlineRole) => void;
  onPeerLeft: (role: OnlineRole) => void;
  onSignal: (data: unknown) => void;
  onError: (error: { code: string; message: string }) => void;
  onClose: () => void;
}

export class SignalingClient {
  private ws: WebSocket | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private closedManually = false;

  constructor(private callbacks: SignalingCallbacks) {}

  connect(roomId: string, intent?: 'create' | 'join', customUrl?: string): void {
    this.close();
    this.closedManually = false;

    const url = customUrl || getSignalingUrl(roomId, intent);
    try {
      this.ws = new WebSocket(url);
    } catch {
      this.callbacks.onError({
        code: 'connection_failed',
        message: `Could not connect to signaling server at ${url}`,
      });
      return;
    }

    this.ws.onopen = () => {
      this.startPing();
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const parsed = parseServerSignalingMessage(JSON.parse(event.data));
        if (!parsed) {
          this.callbacks.onError({
            code: 'protocol_error',
            message: 'Signaling server returned an invalid protocol message.',
          });
          return;
        }

        switch (parsed.type) {
          case 'assigned_role':
            this.callbacks.onRoleAssigned(parsed.role, parsed.roomId);
            break;
          case 'peer_joined':
            this.callbacks.onPeerJoined(parsed.role);
            break;
          case 'peer_left':
            this.callbacks.onPeerLeft(parsed.role);
            break;
          case 'signal':
            this.callbacks.onSignal(parsed.data);
            break;
          case 'error':
            this.callbacks.onError({ code: parsed.code, message: parsed.message });
            break;
          case 'pong':
            // Heartbeat acknowledged
            break;
          default:
            break;
        }
      } catch {
        // Ignore unparseable frames
      }
    };

    this.ws.onerror = () => {
      this.callbacks.onError({
        code: 'connection_error',
        message: 'Signaling connection error occurred.',
      });
    };

    this.ws.onclose = () => {
      this.stopPing();
      if (!this.closedManually) {
        this.callbacks.onClose();
      }
    };
  }

  sendSignal(data: unknown): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type: 'signal', data }));
  }

  private startPing(): void {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 20_000);
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  close(): void {
    this.closedManually = true;
    this.stopPing();
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // Socket may already be closed
      }
      this.ws = null;
    }
  }
}
