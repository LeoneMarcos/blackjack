import type { OnlineRole } from './types';

export interface PeerCallbacks {
  onConnected: () => void;
  onDisconnected: () => void;
  onMessage: (data: unknown) => void;
  onError: (error: Error) => void;
  sendSignal: (signal: unknown) => void;
}

const DEFAULT_RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }],
};

export class PeerConnectionManager {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private isCleanedUp = false;

  constructor(
    private role: OnlineRole,
    private callbacks: PeerCallbacks,
    private rtcConfig: RTCConfiguration = DEFAULT_RTC_CONFIG,
  ) {}

  init(): void {
    this.close();
    this.isCleanedUp = false;

    try {
      this.pc = new RTCPeerConnection(this.rtcConfig);
    } catch (err) {
      this.callbacks.onError(new Error(`Failed to create RTCPeerConnection: ${String(err)}`));
      return;
    }

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.callbacks.sendSignal({
          type: 'candidate',
          candidate: event.candidate.toJSON ? event.candidate.toJSON() : event.candidate,
        });
      }
    };

    this.pc.onconnectionstatechange = () => {
      if (!this.pc || this.isCleanedUp) return;
      const state = this.pc.connectionState;
      if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        this.callbacks.onDisconnected();
      }
    };

    if (this.role === 'host') {
      // Host creates the DataChannel
      const dc = this.pc.createDataChannel('blackjack-game', { ordered: true });
      this.setupDataChannel(dc);
    } else {
      // Guest awaits the DataChannel from host
      this.pc.ondatachannel = (event) => {
        this.setupDataChannel(event.channel);
      };
    }
  }

  async startNegotiation(): Promise<void> {
    if (this.role !== 'host' || !this.pc) return;

    try {
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      this.callbacks.sendSignal({
        type: 'offer',
        sdp: this.pc.localDescription || offer,
      });
    } catch (err) {
      this.callbacks.onError(new Error(`Failed to create WebRTC offer: ${String(err)}`));
    }
  }

  async handleSignal(signal: unknown): Promise<void> {
    if (!this.pc || this.isCleanedUp) return;
    if (!signal || typeof signal !== 'object') return;

    const s = signal as Record<string, unknown>;

    try {
      if (s.type === 'offer' && s.sdp && this.role === 'guest') {
        const rtcDesc = new RTCSessionDescription(s.sdp as RTCSessionDescriptionInit);
        await this.pc.setRemoteDescription(rtcDesc);
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        this.callbacks.sendSignal({
          type: 'answer',
          sdp: this.pc.localDescription || answer,
        });
      } else if (s.type === 'answer' && s.sdp && this.role === 'host') {
        const rtcDesc = new RTCSessionDescription(s.sdp as RTCSessionDescriptionInit);
        await this.pc.setRemoteDescription(rtcDesc);
      } else if (s.type === 'candidate' && s.candidate) {
        try {
          await this.pc.addIceCandidate(new RTCIceCandidate(s.candidate as RTCIceCandidateInit));
        } catch {
          // In rare timing races, candidate might arrive before remote description
        }
      }
    } catch (err) {
      this.callbacks.onError(new Error(`Signaling handling error: ${String(err)}`));
    }
  }

  private setupDataChannel(dc: RTCDataChannel): void {
    this.dc = dc;

    dc.onopen = () => {
      this.callbacks.onConnected();
    };

    dc.onclose = () => {
      if (!this.isCleanedUp) {
        this.callbacks.onDisconnected();
      }
    };

    dc.onerror = (err) => {
      this.callbacks.onError(new Error(`RTCDataChannel error: ${String(err)}`));
    };

    dc.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        this.callbacks.onMessage(parsed);
      } catch {
        // Drop malformed frames
      }
    };
  }

  sendMessage(message: unknown): boolean {
    if (!this.dc || this.dc.readyState !== 'open') return false;
    try {
      this.dc.send(JSON.stringify(message));
      return true;
    } catch (err) {
      this.callbacks.onError(new Error(`Failed to send data channel message: ${String(err)}`));
      return false;
    }
  }

  isConnected(): boolean {
    return this.dc !== null && this.dc.readyState === 'open';
  }

  close(): void {
    this.isCleanedUp = true;
    if (this.dc) {
      try {
        this.dc.close();
      } catch {
        // Ignore
      }
      this.dc = null;
    }
    if (this.pc) {
      try {
        this.pc.close();
      } catch {
        // Ignore
      }
      this.pc = null;
    }
  }
}
