import { audioEngine } from "./audioEngine";
import { encodeTelnyxClientState, isTelnyxEnabled } from "./telnyxClient";
import { mapTelnyxCallState } from "./telnyxLifecycle";
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
interface DialContext { queueItemId?: string | null; }
type TelnyxCall = import("@telnyx/webrtc").Call;
type TelnyxClient = import("@telnyx/webrtc").TelnyxRTC;

export class WebRtcSoftphoneController {
  private currentSession: CallSession = { id: "", leadId: "", leadName: "", phone: "", state: "idle", startTime: null, durationSeconds: 0, isMuted: false, isOnHold: false };
  private listeners: Set<CallStateListener> = new Set();
  private timerInterval: NodeJS.Timeout | null = null;
  private dialTimers: ReturnType<typeof setTimeout>[] = [];
  private endedResetTimer: ReturnType<typeof setTimeout> | null = null;
  private telnyxClient: TelnyxClient | null = null;
  private telnyxCall: TelnyxCall | null = null;
  private telnyxSessionId: string | null = null;
  private remoteAudio: HTMLAudioElement | null = null;

  public getSession(): CallSession { return { ...this.currentSession }; }

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

  private clearEndedResetTimer() {
    if (this.endedResetTimer) {
      clearTimeout(this.endedResetTimer);
      this.endedResetTimer = null;
    }
  }

  private isCurrentSession(sessionId: string, ...states: CallState[]) {
    return this.currentSession.id === sessionId && states.includes(this.currentSession.state);
  }

  private resetToIdle() {
    this.stopTimer();
    if (!isTelnyxEnabled()) audioEngine.release();
    this.telnyxCall = null;
    this.telnyxSessionId = null;
    this.currentSession = { ...this.currentSession, state: "idle", startTime: null, durationSeconds: 0, isMuted: false, isOnHold: false };
    this.notify();
  }

  public async dial(leadId: string, phone: string, leadName: string, context: DialContext = {}): Promise<boolean> {
    if (this.currentSession.state !== "idle" && this.currentSession.state !== "ended") {
      console.warn("[WebRtcSoftphone] Cannot dial while another call is active");
      return false;
    }
    this.clearDialTimers();
    this.clearEndedResetTimer();
    this.currentSession = { id: `call-wrtc-${Date.now()}`, leadId, leadName, phone, state: "dialing", startTime: null, durationSeconds: 0, isMuted: false, isOnHold: false };
    this.notify();

    if (isTelnyxEnabled()) {
      try { return await this.dialWithTelnyx(leadId, phone, context); }
      catch (error) { this.cancelDial(); throw error; }
    }
    return this.dialWithSimulation();
  }

  private async dialWithTelnyx(leadId: string, phone: string, context: DialContext): Promise<boolean> {
    const sessionResponse = await fetch("/api/telephony/telnyx/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId, queueItemId: context.queueItemId || null, toNumber: phone }),
    });
    const sessionBody = await sessionResponse.json() as { sessionId?: string; toNumber?: string; error?: string };
    if (!sessionResponse.ok || !sessionBody.sessionId || !sessionBody.toNumber) throw new Error(sessionBody.error || "Telnyx call session could not be created.");

    const tokenResponse = await fetch("/api/telephony/telnyx/token", { method: "POST" });
    const tokenBody = await tokenResponse.json() as { token?: string; callerNumber?: string; error?: string };
    if (!tokenResponse.ok || !tokenBody.token || !tokenBody.callerNumber) throw new Error(tokenBody.error || "Telnyx WebRTC token could not be issued.");

    const { TelnyxRTC } = await import("@telnyx/webrtc");
    const client = this.telnyxClient || new TelnyxRTC({ login_token: tokenBody.token });
    this.telnyxClient = client;
    client.on("telnyx.notification", (notification: import("@telnyx/webrtc").INotification) => this.handleTelnyxNotification(notification));
    client.on("telnyx.error", (notification: import("@telnyx/webrtc").INotification) => console.error("[Telnyx WebRTC]", notification?.error?.message || "Connection failed."));
    await client.connect();

    this.telnyxSessionId = sessionBody.sessionId;
    this.currentSession.id = sessionBody.sessionId;
    this.notify();
    this.remoteAudio ||= this.createRemoteAudioElement();
    this.telnyxCall = client.newCall({ destinationNumber: sessionBody.toNumber, callerNumber: tokenBody.callerNumber, audio: true, remoteElement: this.remoteAudio, clientState: encodeTelnyxClientState({ sessionId: sessionBody.sessionId }) });
    this.syncTelnyxSession("initiated");
    return true;
  }

  private dialWithSimulation(): Promise<boolean> {
    const sessionId = this.currentSession.id;
    return withTimeout(audioEngine.initialize(), SOFTPHONE_AUDIO_INIT_TIMEOUT_MS, "Audio initialization timed out").then((audioOk) => {
      if (!audioOk) { if (this.isCurrentSession(sessionId, "dialing")) this.cancelDial(); return false; }
      if (!this.isCurrentSession(sessionId, "dialing")) return false;
      this.dialTimers.push(setTimeout(() => {
        if (this.isCurrentSession(sessionId, "dialing")) { this.currentSession.state = "ringing"; this.notify(); }
      }, 1500));
      this.dialTimers.push(setTimeout(() => {
        if (this.isCurrentSession(sessionId, "ringing")) { this.currentSession.state = "connected"; this.currentSession.startTime = new Date(); audioEngine.startRecording(); this.startTimer(); this.notify(); }
      }, 3200));
      return true;
    }).catch(() => { if (this.isCurrentSession(sessionId, "dialing")) this.cancelDial(); return false; });
  }

  private createRemoteAudioElement(): HTMLAudioElement {
    const audio = document.createElement("audio");
    audio.autoplay = true;
    audio.setAttribute("playsinline", "true");
    audio.style.display = "none";
    document.body.appendChild(audio);
    return audio;
  }

  private handleTelnyxNotification(notification: { type?: string; call?: TelnyxCall; error?: Error }) {
    const call = notification.call || this.telnyxCall;
    if (call) this.telnyxCall = call;
    const providerState = call?.state ? mapTelnyxCallState(call.state) : null;
    const state: CallState | null = providerState === "held"
      ? "on_hold"
      : providerState === "connected" || providerState === "ringing" || providerState === "ended"
        ? providerState
        : null;
    if (!state || this.currentSession.state === "idle") return;
    if (call) this.syncTelnyxSession(state === "connected" ? "connected" : state === "on_hold" ? "held" : state === "ended" ? "ended" : "ringing", call.telnyxIDs);
    if (state === "connected" && !this.currentSession.startTime) { this.currentSession.startTime = new Date(); this.startTimer(); }
    if (state === "ended") { this.stopTimer(); this.currentSession.state = "ended"; this.notify(); this.scheduleReset(); return; }
    this.currentSession.state = state;
    this.currentSession.isOnHold = state === "on_hold";
    this.notify();
  }

  private syncTelnyxSession(status: "initiated" | "ringing" | "connected" | "held" | "ended" | "failed", ids?: { telnyxCallControlId: string; telnyxSessionId: string; telnyxLegId: string }) {
    if (!this.telnyxSessionId) return;
    void fetch("/api/telephony/telnyx/session", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: this.telnyxSessionId, status, telnyxCallControlId: ids?.telnyxCallControlId, telnyxCallSessionId: ids?.telnyxSessionId, telnyxCallLegId: ids?.telnyxLegId }) }).catch((error) => console.warn("[Telnyx session] Could not sync state", error));
  }

  public async answer(): Promise<boolean> {
    if (isTelnyxEnabled()) { if (!this.telnyxCall) return false; await this.telnyxCall.answer(); return true; }
    let audioOk = false;
    try { audioOk = await withTimeout(audioEngine.initialize(), SOFTPHONE_AUDIO_INIT_TIMEOUT_MS, "Audio initialization timed out"); } catch { audioOk = false; }
    if (!audioOk) { this.resetToIdle(); return false; }
    this.currentSession.state = "connected"; this.currentSession.startTime = new Date(); audioEngine.startRecording(); this.startTimer(); this.notify(); return true;
  }

  public hangup() {
    if (this.currentSession.state === "idle" || this.currentSession.state === "ended") return;
    if (isTelnyxEnabled() && this.telnyxCall) void this.telnyxCall.hangup();
    if (this.currentSession.state === "dialing" || this.currentSession.state === "ringing") { this.cancelDial(); return; }
    const sessionId = this.currentSession.id;
    this.clearDialTimers(); this.clearEndedResetTimer(); this.stopTimer();
    if (!isTelnyxEnabled()) audioEngine.release();
    this.syncTelnyxSession("ended");
    this.currentSession.state = "ended"; this.notify();
    this.endedResetTimer = setTimeout(() => { if (this.currentSession.id === sessionId && this.currentSession.state === "ended") this.resetToIdle(); }, 2000);
  }

  public cancelDial(): boolean {
    if (this.currentSession.state !== "dialing" && this.currentSession.state !== "ringing") return false;
    if (isTelnyxEnabled() && this.telnyxCall) void this.telnyxCall.hangup();
    this.syncTelnyxSession("failed");
    this.clearDialTimers(); this.clearEndedResetTimer(); this.resetToIdle(); return true;
  }

  public toggleMute(): boolean {
    if (isTelnyxEnabled() && this.telnyxCall) { this.telnyxCall.toggleAudioMute(); this.currentSession.isMuted = !this.currentSession.isMuted; }
    else this.currentSession.isMuted = audioEngine.toggleMute();
    this.notify(); return this.currentSession.isMuted;
  }

  public toggleHold(): boolean {
    if (isTelnyxEnabled() && this.telnyxCall) { void this.telnyxCall.toggleHold(); this.currentSession.isOnHold = !this.currentSession.isOnHold; this.currentSession.state = this.currentSession.isOnHold ? "on_hold" : "connected"; }
    else if (this.currentSession.state === "connected") { this.currentSession.state = "on_hold"; this.currentSession.isOnHold = true; }
    else if (this.currentSession.state === "on_hold") { this.currentSession.state = "connected"; this.currentSession.isOnHold = false; }
    this.notify(); return this.currentSession.isOnHold;
  }

  public sendDtmf(digit: string) { if (isTelnyxEnabled() && this.telnyxCall) this.telnyxCall.dtmf(digit); else console.log(`[WebRtcSoftphone] Transmitting DTMF Tone: ${digit}`); }

  private scheduleReset() { const sessionId = this.currentSession.id; this.clearEndedResetTimer(); this.endedResetTimer = setTimeout(() => { if (this.currentSession.id === sessionId && this.currentSession.state === "ended") this.resetToIdle(); }, 2000); }
  private startTimer() { this.stopTimer(); this.timerInterval = setInterval(() => { if (this.currentSession.state === "connected") { this.currentSession.durationSeconds += 1; this.notify(); } }, 1000); }
  private stopTimer() { if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; } }
}

export const softphoneController = new WebRtcSoftphoneController();
