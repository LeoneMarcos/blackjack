import { describe, expect, it } from 'vitest';
import { parseServerSignalingMessage } from '../src/lib/online/signaling';

describe('signaling client protocol validation', () => {
  it('accepts typed room lifecycle and WebRTC signaling messages', () => {
    expect(
      parseServerSignalingMessage({ type: 'assigned_role', role: 'host', roomId: 'AB12' }),
    ).toEqual({ type: 'assigned_role', role: 'host', roomId: 'AB12' });
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
