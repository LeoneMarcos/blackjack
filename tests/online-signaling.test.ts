import { describe, expect, it } from 'vitest';
import { normalizeSignalingBaseUrl, parseServerSignalingMessage } from '../src/lib/online/signaling';

describe('signaling client protocol validation', () => {
  it('accepts typed room lifecycle and WebRTC signaling messages', () => {
    expect(
      parseServerSignalingMessage({ type: 'assigned_role', role: 'host', roomId: 'AB12' }),
    ).toEqual({ type: 'assigned_role', role: 'host', roomId: 'AB12'   it('normalizes safe signaling URLs and rejects unsafe schemes or embedded credentials', () => {
    expect(normalizeSignalingBaseUrl('https://signal.example.com/')).toBe(
      'wss://signal.example.com',
    );
    expect(normalizeSignalingBaseUrl('ws://127.0.0.1:8787/')).toBe('ws://127.0.0.1:8787');

    expect(() => normalizeSignalingBaseUrl('javascript:alert(1)')).toThrow();
    expect(() => normalizeSignalingBaseUrl('wss://user:pass@signal.example.com')).toThrow();
  });
});
    expect(
      parseServerSignalingMessage({
        type: 'signal',
        data: { type: 'offer', sdp: { type: 'offer', sdp: 'v=0' } },
      }),
    ).not.toBeNull();
  });

  it('rejects malformed roles, rooms, signaling data, and unknown messages', () => {
    expect(
      parseServerSignalingMessage({ type: 'assigned_role', role: 'admin', roomId: 'AB12' }),
    ).toBeNull();
    expect(
      parseServerSignalingMessage({ type: 'assigned_role', role: 'guest', roomId: '../room' }),
    ).toBeNull();
    expect(parseServerSignalingMessage({ type: 'signal', data: 'arbitrary' })).toBeNull();
    expect(parseServerSignalingMessage({ type: 'game_state', deck: [] })).toBeNull();
  });
});
