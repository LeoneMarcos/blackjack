import { useCallback, useEffect, useRef, useState } from 'react';
import { HostAuthorityManager } from '../lib/online/authority';
import { PeerConnectionManager } from '../lib/online/peer';
import { SignalingClient } from '../lib/online/signaling';
import {
  isHostMessage,
  type GuestMessage,
  type HostMessage,
  type OnlineConnectionState,
  type OnlineRole,
  type PublicGameState,
} from '../lib/online/types';

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function useOnlineBlackjack() {
  const [connectionState, setConnectionState] = useState<OnlineConnectionState>('idle');
  const [role, setRole] = useState<OnlineRole | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [publicState, setPublicState] = useState<PublicGameState | null>(null);

  const signalingRef = useRef<SignalingClient | null>(null);
  const peerRef = useRef<PeerConnectionManager | null>(null);
  const hostAuthorityRef = useRef<HostAuthorityManager | null>(null);

  const cleanup = useCallback(() => {
    if (hostAuthorityRef.current) {
      hostAuthorityRef.current.destroy();
      hostAuthorityRef.current = null;
    }
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    if (signalingRef.current) {
      signalingRef.current.close();
      signalingRef.current = null;
    }
  }, []);

  const leaveRoom = useCallback(() => {
    cleanup();
    setConnectionState('idle');
    setRole(null);
    setRoomId(null);
    setError(null);
    setPublicState(null);
  }, [cleanup]);

  const connectToRoom = useCallback(
    (code: string, isCreating: boolean) => {
      cleanup();
      setError(null);
      setPublicState(null);
      const normalizedCode = code.trim().toUpperCase();
      setRoomId(normalizedCode);
      setConnectionState(isCreating ? 'creating' : 'connecting');

      const signaling = new SignalingClient({
        onRoleAssigned: (assignedRole, assignedRoom) => {
          setRole(assignedRole);
          setRoomId(assignedRoom);

          if (assignedRole === 'host') {
            setConnectionState('waiting');
            // Host initializes authority
            const hostAuthority = new HostAuthorityManager(
              (newState) => {
                setPublicState(newState);
                peerRef.current?.sendMessage({
                  type: 'sync_state',
                  version: 1,
                  state: newState,
                } as HostMessage);
              },
              (rejectedReason) => {
                peerRef.current?.sendMessage({
                  type: 'action_rejected',
                  version: 1,
                  reason: rejectedReason,
                } as HostMessage);
              },
            );
            hostAuthorityRef.current = hostAuthority;
            setPublicState(hostAuthority.getPublicState());
          } else {
            // Guest connecting
            setConnectionState('connecting');
            setupPeer('guest');
          }
        },

        onPeerJoined: (peerRole) => {
          if (peerRole === 'guest') {
            // Guest joined host's room -> start WebRTC handshake
            setConnectionState('connecting');
            setupPeer('host');
            peerRef.current?.startNegotiation();
          }
        },

        onPeerLeft: (leftRole) => {
          setConnectionState('disconnected');
          setError(`Player (${leftRole}) disconnected from the table.`);
        },

        onSignal: (data) => {
          peerRef.current?.handleSignal(data);
        },

        onError: (err) => {
          if (err.code === 'room_full') {
            setConnectionState('error');
            setError(`Room ${normalizedCode} is full (max 2 players).`);
          } else {
            setConnectionState('error');
            setError(err.message || 'Signaling connection failure.');
          }
        },

        onClose: () => {
          setConnectionState((prev) => (prev === 'connected' ? 'disconnected' : prev));
        },
      });

      function setupPeer(assignedRole: OnlineRole) {
        if (peerRef.current) {
          peerRef.current.close();
        }

        const peer = new PeerConnectionManager(assignedRole, {
          onConnected: () => {
            setConnectionState('connected');
            setError(null);
            // Host broadcasts current public state immediately upon connection
            if (assignedRole === 'host' && hostAuthorityRef.current) {
              const currentPublic = hostAuthorityRef.current.getPublicState();
              setPublicState(currentPublic);
              peer.sendMessage({
                type: 'sync_state',
                version: 1,
                state: currentPublic,
              } as HostMessage);
            }
          },

          onDisconnected: () => {
            setConnectionState('disconnected');
            setError('Peer connection lost.');
          },

          onMessage: (msg) => {
            if (assignedRole === 'host') {
              // Host handles incoming guest intent
              hostAuthorityRef.current?.handleGuestMessage(msg);
            } else {
              // Guest receives host updates
              if (isHostMessage(msg)) {
                if (msg.type === 'sync_state') {
                  setPublicState(msg.state);
                } else if (msg.type === 'action_rejected') {
                  // Notification of rejection
                  console.warn('Action rejected by host authority:', msg.reason);
                }
              }
            }
          },

          onError: (err) => {
            console.error('WebRTC peer error:', err);
          },

          sendSignal: (signalData) => {
            signaling.sendSignal(signalData);
          },
        });

        peer.init();
        peerRef.current = peer;
      }

      signaling.connect(normalizedCode, isCreating ? 'create' : 'join');
      signalingRef.current = signaling;
    },
    [cleanup],
  );

  const createRoom = useCallback(
    (customCode?: string) => {
      const code = customCode || generateRoomCode();
      connectToRoom(code, true);
    },
    [connectToRoom],
  );

  const joinRoom = useCallback(
    (code: string) => {
      connectToRoom(code, false);
    },
    [connectToRoom],
  );

  const retry = useCallback(() => {
    if (roomId) {
      connectToRoom(roomId, role === 'host');
    }
  }, [roomId, role, connectToRoom]);

  // Game action triggers:
  const deal = useCallback(() => {
    if (role === 'host' && hostAuthorityRef.current) {
      hostAuthorityRef.current.hostDeal();
    }
  }, [role]);

  const hit = useCallback(() => {
    if (role === 'host' && hostAuthorityRef.current) {
      hostAuthorityRef.current.hostHit();
    } else if (role === 'guest' && peerRef.current) {
      peerRef.current.sendMessage({
        type: 'guest_intent',
        version: 1,
        action: 'hit',
      } as GuestMessage);
    }
  }, [role]);

  const stand = useCallback(() => {
    if (role === 'host' && hostAuthorityRef.current) {
      hostAuthorityRef.current.hostStand();
    } else if (role === 'guest' && peerRef.current) {
      peerRef.current.sendMessage({
        type: 'guest_intent',
        version: 1,
        action: 'stand',
      } as GuestMessage);
    }
  }, [role]);

  const toggleReady = useCallback(() => {
    if (role === 'host' && hostAuthorityRef.current) {
      hostAuthorityRef.current.hostToggleReady();
    } else if (role === 'guest' && peerRef.current) {
      peerRef.current.sendMessage({
        type: 'guest_intent',
        version: 1,
        action: 'ready',
      } as GuestMessage);
    }
  }, [role]);

  const requestRematch = useCallback(() => {
    if (role === 'host' && hostAuthorityRef.current) {
      hostAuthorityRef.current.hostRequestRematch();
    } else if (role === 'guest' && peerRef.current) {
      peerRef.current.sendMessage({
        type: 'guest_intent',
        version: 1,
        action: 'rematch',
      } as GuestMessage);
    }
  }, [role]);

  const resetScores = useCallback(() => {
    if (role === 'host' && hostAuthorityRef.current) {
      hostAuthorityRef.current.hostResetScores();
    }
  }, [role]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    connectionState,
    role,
    roomId,
    error,
    publicState,
    createRoom,
    joinRoom,
    leaveRoom,
    retry,
    deal,
    hit,
    stand,
    toggleReady,
    requestRematch,
    resetScores,
  };
}
