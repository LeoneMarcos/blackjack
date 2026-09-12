import { describe, expect, it } from 'vitest';
import worker, { isValidRoomId } from '../worker/index';
import { RoomDO } from '../worker/room-do';
import type { Env, WebSocketAttachment } from '../worker/types';

class MockWebSocket {
  sent: string[] = [];
  closed = false;
  closeCode?: number;
  closeReason?: string;
  attachment: WebSocketAttachment | null = null;
  tags: string[] = [];

  send(data: string): void {
    if (this.closed) throw new Error('Cannot send on closed WebSocket');
    this.sent.push(data);
  }

  close(code?: number, reason?: string): void {
    this.closed = true;
    this.closeCode = code;
    this.closeReason = reason;
  }

  serializeAttachment(attachment: WebSocketAttachment): void {
    this.attachment = attachment;
  }

  deserializeAttachment(): WebSocketAttachment | null {
    return this.attachment;
  }
}

class MockDurableObjectState {
  sockets: MockWebSocket[] = [];

  acceptWebSocket(ws: unknown, tags: string[] = []): void {
    const mockWs = ws as MockWebSocket;
    mockWs.tags = tags;
    this.sockets.push(mockWs);
  }

  getWebSockets(tag?: string): WebSocket[] {
    const open = this.sockets.filter((s) => !s.closed);
    if (!tag) return open as unknown as WebSocket[];
    return open.filter((s) => s.tags.includes(tag)) as unknown as WebSocket[];
  }
}

class MockWebSocketPair {
  0: MockWebSocket;
  1: MockWebSocket;
  constructor() {
    this[0] = new MockWebSocket();
    this[1] = new MockWebSocket();
  }
}

(globalThis as unknown as { WebSocketPair: typeof MockWebSocketPair }).WebSocketPair =
  MockWebSocketPair;

describe('Worker signaling and RoomDO', () => {
  it('validates room codes correctly', () => {
    expect(isValidRoomId('ABCD')).toBe(true);
    expect(isValidRoomId('ROOM42')).toBe(true);
    expect(isValidRoomId('P2P123')).toBe(true);
    expect(isValidRoomId('AB')).toBe(false);
    expect(isValidRoomId('')).toBe(false);
    expect(isValidRoomId('ABCDEFGHIJKLMNO')).toBe(false);
    expect(isValidRoomId('AB-CD')).toBe(false);
    expect(isValidRoomId('AB CD')).toBe(false);
  });

  it('serves health checks via worker fetch', async () => {
    const req = new Request('http://localhost:8787/health');
    const res = await worker.fetch(req, {} as Env);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: 'ok', service: 'blackjack-signaling' });
  });

  it('rejects invalid room codes with 400', async () => {
    const req = new Request('http://localhost:8787/room/X/ws');
    const res = await worker.fetch(req, {} as Env);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('invalid_room_id');
  });

  it('requires WebSocket upgrade header', async () => {
    const state = new MockDurableObjectState();
    const room = new RoomDO(state as unknown as DurableObjectState, {} as Env);

    const req = new Request('http://localhost:8787/room/ROOM1/ws');
    const res = await room.fetch(req);
    expect(res.status).toBe(426);
  });

  it('assigns host role to first peer and guest role to second peer', async () => {
    const state = new MockDurableObjectState();
    const room = new RoomDO(state as unknown as DurableObjectState, {} as Env);

    // Peer 1 connects
    const req1 = new Request('http://localhost:8787/room/TEST1/ws', {
      headers: { Upgrade: 'websocket' },
    });
    const res1 = await room.fetch(req1);
    expect(res1.status).toBe(101);
    expect(state.sockets.length).toBe(1);

    const p1Socket = state.sockets[0];
    expect(p1Socket.attachment?.role).toBe('host');
    expect(JSON.parse(p1Socket.sent[0])).toEqual({
      type: 'assigned_role',
      role: 'host',
      roomId: 'TEST1',
    });

    // Peer 2 connects
    const req2 = new Request('http://localhost:8787/room/TEST1/ws', {
      headers: { Upgrade: 'websocket' },
    });
    const res2 = await room.fetch(req2);
    expect(res2.status).toBe(101);
    expect(state.sockets.length).toBe(2);

    const p2Socket = state.sockets[1];
    expect(p2Socket.attachment?.role).toBe('guest');
    expect(JSON.parse(p2Socket.sent[0])).toEqual({
      type: 'assigned_role',
      role: 'guest',
      roomId: 'TEST1',
    });

    // Host should receive peer_joined (guest) and guest receives peer_joined (host)
    expect(JSON.parse(p1Socket.sent[1])).toEqual({
      type: 'peer_joined',
      role: 'guest',
    });
    expect(JSON.parse(p2Socket.sent[1])).toEqual({
      type: 'peer_joined',
      role: 'host',
    });
  });

  it('rejects guest joining a nonexistent room with intent=join', async () => {
    const state = new MockDurableObjectState();
    const room = new RoomDO(state as unknown as DurableObjectState, {} as Env);

    const req = new Request('http://localhost:8787/room/NOROOM/ws?intent=join', {
      headers: { Upgrade: 'websocket' },
    });
    await room.fetch(req);

    expect(state.sockets.length).toBe(1);
    const ws = state.sockets[0];
    expect(ws.closed).toBe(true);
    expect(ws.closeCode).toBe(4004);
    expect(JSON.parse(ws.sent[0])).toEqual({
      type: 'error',
      code: 'invalid_room',
      message: 'Room NOROOM does not exist or has no active host.',
    });
  });

  it('rejects creating a room when an active host already exists with intent=create', async () => {
    const state = new MockDurableObjectState();
    const room = new RoomDO(state as unknown as DurableObjectState, {} as Env);

    // Host creates room
    await room.fetch(
      new Request('http://localhost:8787/room/EXISTS/ws?intent=create', {
        headers: { Upgrade: 'websocket' },
      }),
    );

    // Second peer attempts to create same room
    await room.fetch(
      new Request('http://localhost:8787/room/EXISTS/ws?intent=create', {
        headers: { Upgrade: 'websocket' },
      }),
    );

    expect(state.sockets.length).toBe(2);
    const secondSocket = state.sockets[1];
    expect(secondSocket.closed).toBe(true);
    expect(secondSocket.closeCode).toBe(4009);
    expect(JSON.parse(secondSocket.sent[0])).toEqual({
      type: 'error',
      code: 'room_full',
      message: 'Room EXISTS already has an active host.',
    });
  });

  it('rejects a third peer when room is full', async () => {
    const state = new MockDurableObjectState();
    const room = new RoomDO(state as unknown as DurableObjectState, {} as Env);

    // Connect 2 peers
    await room.fetch(
      new Request('http://localhost:8787/room/TEST2/ws', { headers: { Upgrade: 'websocket' } }),
    );
    await room.fetch(
      new Request('http://localhost:8787/room/TEST2/ws', { headers: { Upgrade: 'websocket' } }),
    );

    // Attempt 3rd peer
    await room.fetch(
      new Request('http://localhost:8787/room/TEST2/ws', { headers: { Upgrade: 'websocket' } }),
    );

    expect(state.sockets.length).toBe(3);
    const p3Socket = state.sockets[2];
    expect(p3Socket.closed).toBe(true);
    expect(p3Socket.closeCode).toBe(4001);
    expect(JSON.parse(p3Socket.sent[0])).toEqual({
      type: 'error',
      code: 'room_full',
      message: 'Room TEST2 is full (maximum 2 players).',
    });
  });

  it('relays signaling payloads between host and guest and validates signal shape & direction', async () => {
    const state = new MockDurableObjectState();
    const room = new RoomDO(state as unknown as DurableObjectState, {} as Env);

    await room.fetch(
      new Request('http://localhost:8787/room/RELAY/ws?intent=create', {
        headers: { Upgrade: 'websocket' },
      }),
    );
    await room.fetch(
      new Request('http://localhost:8787/room/RELAY/ws?intent=join', {
        headers: { Upgrade: 'websocket' },
      }),
    );

    const [hostWs, guestWs] = state.sockets;

    // 1. Host sends valid offer signal -> forwarded
    await room.webSocketMessage(
      hostWs as unknown as WebSocket,
      JSON.stringify({
        type: 'signal',
        data: { type: 'offer', sdp: 'dummy-offer-sdp' },
      }),
    );

    const guestLastMsg = JSON.parse(guestWs.sent[guestWs.sent.length - 1]);
    expect(guestLastMsg).toEqual({
      type: 'signal',
      data: { type: 'offer', sdp: 'dummy-offer-sdp' },
    });

    // 2. Guest sends valid answer signal -> forwarded
    await room.webSocketMessage(
      guestWs as unknown as WebSocket,
      JSON.stringify({
        type: 'signal',
        data: { type: 'answer', sdp: 'dummy-answer-sdp' },
      }),
    );

    const hostLastMsg = JSON.parse(hostWs.sent[hostWs.sent.length - 1]);
    expect(hostLastMsg).toEqual({
      type: 'signal',
      data: { type: 'answer', sdp: 'dummy-answer-sdp' },
    });

    // 3. Direction violation: Guest sends offer -> rejected!
    await room.webSocketMessage(
      guestWs as unknown as WebSocket,
      JSON.stringify({
        type: 'signal',
        data: { type: 'offer', sdp: 'bad-offer-from-guest' },
      }),
    );
    const guestErr1 = JSON.parse(guestWs.sent[guestWs.sent.length - 1]);
    expect(guestErr1.type).toBe('error');
    expect(guestErr1.code).toBe('invalid_signal');
    expect(guestErr1.message).toContain('Only host may initiate an offer');

    // 4. Direction violation: Host sends answer -> rejected!
    await room.webSocketMessage(
      hostWs as unknown as WebSocket,
      JSON.stringify({
        type: 'signal',
        data: { type: 'answer', sdp: 'bad-answer-from-host' },
      }),
    );
    const hostErr1 = JSON.parse(hostWs.sent[hostWs.sent.length - 1]);
    expect(hostErr1.type).toBe('error');
    expect(hostErr1.code).toBe('invalid_signal');
    expect(hostErr1.message).toContain('Only guest may reply with an answer');

    // 5. Malformed signal: missing sdp
    await room.webSocketMessage(
      hostWs as unknown as WebSocket,
      JSON.stringify({
        type: 'signal',
        data: { type: 'offer' },
      }),
    );
    const hostErr2 = JSON.parse(hostWs.sent[hostWs.sent.length - 1]);
    expect(hostErr2.code).toBe('invalid_signal');

    // 6. Candidate signals from both sides succeed
    await room.webSocketMessage(
      hostWs as unknown as WebSocket,
      JSON.stringify({
        type: 'signal',
        data: { type: 'candidate', candidate: { candidate: 'cand1' } },
      }),
    );
    expect(JSON.parse(guestWs.sent[guestWs.sent.length - 1])).toEqual({
      type: 'signal',
      data: { type: 'candidate', candidate: { candidate: 'cand1' } },
    });
  });

  it('rejects malformed messages and gameplay relay attempts over signaling', async () => {
    const state = new MockDurableObjectState();
    const room = new RoomDO(state as unknown as DurableObjectState, {} as Env);

    await room.fetch(
      new Request('http://localhost:8787/room/CHECK/ws', { headers: { Upgrade: 'websocket' } }),
    );
    const hostWs = state.sockets[0];

    // Invalid JSON
    await room.webSocketMessage(hostWs as unknown as WebSocket, 'NOT_JSON{');
    expect(JSON.parse(hostWs.sent[hostWs.sent.length - 1])).toEqual({
      type: 'error',
      code: 'malformed_json',
      message: 'Could not parse incoming WebSocket message as JSON.',
    });

    // Gameplay relay attempt (must be blocked over signaling)
    await room.webSocketMessage(
      hostWs as unknown as WebSocket,
      JSON.stringify({ type: 'hit', player: 'p1' }),
    );
    expect(JSON.parse(hostWs.sent[hostWs.sent.length - 1])).toEqual({
      type: 'error',
      code: 'invalid_signaling_type',
      message:
        'Only signaling messages are permitted over this transport. Gameplay uses WebRTC RTCDataChannel.',
    });
  });

  it('notifies peer when peer disconnects', async () => {
    const state = new MockDurableObjectState();
    const room = new RoomDO(state as unknown as DurableObjectState, {} as Env);

    await room.fetch(
      new Request('http://localhost:8787/room/DISC/ws', { headers: { Upgrade: 'websocket' } }),
    );
    await room.fetch(
      new Request('http://localhost:8787/room/DISC/ws', { headers: { Upgrade: 'websocket' } }),
    );

    const [hostWs, guestWs] = state.sockets;

    // Guest leaves
    await room.webSocketClose(guestWs as unknown as WebSocket);

    const hostLastMsg = JSON.parse(hostWs.sent[hostWs.sent.length - 1]);
    expect(hostLastMsg).toEqual({
      type: 'peer_left',
      role: 'guest',
    });
  });
});
