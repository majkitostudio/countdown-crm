import { audioEngine } from "./audioEngine";
import { withTimeout } from "@/lib/withTimeout";

export const SOFTPHONE_AUDIO_INIT_TIMEOUT_MS = 10_000;

export type CallState = "idle" | "dialing" | "ringing" | "connected" | "on_hold" | "ended";

export interface CallSession {
  id: string;
  leadId: string;
  leadName: string;
  phone: string;
  state: CallState;
  startTime: Date | null;
  durationSeconds: number;
  isMuted: boolean;
  isOnHold: boolean;
}

export type CallStateListener = (session: CallSession) => void;

export class WebRtcSoftphoneController {
  private currentSession: CallSession = {
    id: "",
    leadId: "",
    leadName: "",
    phone: "",
    state: "idle",
    startTime: null,
    durationSeconds: 0,
    isMuted: false,
    isOnHold: false,
  };

  private listeners: Set<CallStateListener> = new Set();
  private timerInterval: NodeJS.Timeout | null = null;
  private dialTimers: ReturnType<typeof setTimeout>[] = [];

  constructor() {}

  public getSession(): CallSession {
    return { ...this.currentSession };
  }

  public subscribeState(listener: CallStateListener): () => void {
    this.listeners.add(listener);
    listener(this.getSession());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const copy = this.getSession();
    this.listeners.forEach((fn) => fn(copy));
  }

  private clearDialTimers() {
    this.dialTimers.forEach((timer) => clearTimeout(timer));
    this.dialTimers = [];
  }

  private isCurrentSession(sessionId: string, ...states: CallState[]) {
    return this.currentSession.id === sessionId && states.includes(this.currentSession.state);
  }

  private resetToIdle() {
    this.stopTimer();
    audioEngine.release();
    this.currentSession = {
      ...this.currentSession,
      state: "idle",
      startTime: null,
      durationSeconds: 0,
      isMuted: false,
      isOnHold: false,
    };
    this.notify();
  }

  /**
   * Start an outbound call session
   */
  public async dial(leadId: string, phone: string, leadName: string): Promise<boolean> {
    if (this.currentSession.state !== "idle" && this.currentSession.state !== "ended") {
      console.warn("[WebRtcSoftphone] Cannot dial while another call is active");
      return false;
    }

    this.clearDialTimers();
    this.currentSession = {
      id: `call-wrtc-${Date.now()}`,
      leadId,
      leadName,
      phone,
      state: "dialing",
      startTime: null,
      durationSeconds: 0,
      isMuted: false,
      isOnHold: false,
    };
    this.notify();

    const sessionId = this.currentSession.id;
    let audioOk = false;
    try {
      audioOk = await withTimeout(
        audioEngine.initialize(),
        SOFTPHONE_AUDIO_INIT_TIMEOUT_MS,
        "Audio initialization timed out",
      );
    } catch {
      audioOk = false;
    }

    if (!audioOk) {
      if (this.isCurrentSession(sessionId, "dialing")) {
        this.cancelDial();
      }
      return false;
    }

    if (!this.isCurrentSession(sessionId, "dialing")) {
      return false;
    }

    // Simulate Network Peer connection delay (1.5s -> Ringing, 3.0s -> Connected)
    this.dialTimers.push(setTimeout(() => {
      if (this.isCurrentSession(sessionId, "dialing")) {
        this.currentSession.state = "ringing";
        this.notify();
      }
    }, 1500));

    this.dialTimers.push(setTimeout(() => {
      if (this.isCurrentSession(sessionId, "ringing")) {
        this.currentSession.state = "connected";
        this.currentSession.startTime = new Date();
        audioEngine.startRecording();
        this.startTimer();
        this.notify();
      }
    }, 3200));

    return true;
  }

  /**
   * Answer incoming call session
   */
  public async answer(): Promise<boolean> {
    let audioOk = false;
    try {
      audioOk = await withTimeout(
        audioEngine.initialize(),
        SOFTPHONE_AUDIO_INIT_TIMEOUT_MS,
        "Audio initialization timed out",
      );
    } catch {
      audioOk = false;
    }
    if (!audioOk) {
      this.resetToIdle();
      return false;
    }

    this.currentSession.state = "connected";
    this.currentSession.startTime = new Date();
    audioEngine.startRecording();
    this.startTimer();
    this.notify();
    return audioOk;
  }

  /**
   * Hang up active call
   */
  public hangup() {
    if (this.currentSession.state === "idle" || this.currentSession.state === "ended") return;

    if (this.currentSession.state === "dialing" || this.currentSession.state === "ringing") {
      this.cancelDial();
      return;
    }

    this.clearDialTimers();
    this.stopTimer();
    audioEngine.release();
    this.currentSession.state = "ended";
    this.notify();
  }

  /**
   * Cancels a local dial/ringing attempt without creating a call record.
   */
  public cancelDial(): boolean {
    if (this.currentSession.state !== "dialing" && this.currentSession.state !== "ringing") return false;

    this.clearDialTimers();
    this.resetToIdle();
    return true;
  }

  public toggleMute(): boolean {
    const isMuted = audioEngine.toggleMute();
    this.currentSession.isMuted = isMuted;
    this.notify();
    return isMuted;
  }

  public toggleHold(): boolean {
    if (this.currentSession.state === "connected") {
      this.currentSession.state = "on_hold";
      this.currentSession.isOnHold = true;
    } else if (this.currentSession.state === "on_hold") {
      this.currentSession.state = "connected";
      this.currentSession.isOnHold = false;
    }
    this.notify();
    return this.currentSession.isOnHold;
  }

  public sendDtmf(digit: string) {
    console.log(`[WebRtcSoftphone] Transmitting DTMF Tone: ${digit}`);
    // Play DTMF tone locally or send via WebRTC data channel
  }

  private startTimer() {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      if (this.currentSession.state === "connected" || this.currentSession.state === "on_hold") {
        this.currentSession.durationSeconds += 1;
        this.notify();
      }
    }, 1000);
  }

  private stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
}

export const softphoneController = new WebRtcSoftphoneController();
