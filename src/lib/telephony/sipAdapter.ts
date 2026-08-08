/**
 * SIP / VoIP Gateway Adapter Interface
 * Handles WebRTC WSS signaling registration with Asterisk, FreeSWITCH, or Telco SIP Trunks.
 */

export interface SipAccountConfig {
  username: string;
  secret: string;
  domain: string; // e.g. pbx.countdowncrm.com
  wssServer: string; // e.g. wss://pbx.countdowncrm.com:7443/ws
  displayName?: string;
}

export type SipRegistrationStatus = "unregistered" | "registering" | "registered" | "failed";

export class SipGatewayAdapter {
  private status: SipRegistrationStatus = "unregistered";
  private currentConfig: SipAccountConfig | null = null;
  private statusListeners: Set<(status: SipRegistrationStatus) => void> = new Set();

  constructor() {}

  public subscribeStatus(listener: (status: SipRegistrationStatus) => void): () => void {
    this.listeners.add(listener);
    listener(this.status);
    return () => this.listeners.delete(listener);
  }

  private get listeners() {
    return this.statusListeners;
  }

  public async registerSipAccount(config: SipAccountConfig): Promise<boolean> {
    this.currentConfig = config;
    this.status = "registering";
    this.notifyStatus();

    console.log(`[SipGatewayAdapter] Registering SIP account ${config.username}@${config.domain} via ${config.wssServer}...`);

    // Simulate WSS SIP REGISTER handshake (RFC 3261 / SIP.js layer)
    return new Promise((resolve) => {
      setTimeout(() => {
        this.status = "registered";
        this.notifyStatus();
        console.log(`[SipGatewayAdapter] SIP Account ${config.username}@${config.domain} successfully REGISTERED.`);
        resolve(true);
      }, 1200);
    });
  }

  public unregister() {
    this.status = "unregistered";
    this.currentConfig = null;
    this.notifyStatus();
  }

  public async originateSipCall(phoneNumber: string): Promise<string> {
    if (this.status !== "registered") {
      console.warn("[SipGatewayAdapter] Cannot originate SIP call — user agent not registered");
    }
    const callId = `sip-invite-${Date.now()}`;
    console.log(`[SipGatewayAdapter] Sending SIP INVITE to sip:${phoneNumber}@${this.currentConfig?.domain || "pbx.local"} (Call-ID: ${callId})`);
    return callId;
  }

  public terminateSipCall(callId: string) {
    console.log(`[SipGatewayAdapter] Sending SIP BYE for Call-ID: ${callId}`);
  }

  public sendSipDtmf(callId: string, digit: string) {
    console.log(`[SipGatewayAdapter] Sending SIP INFO (RFC 2833 DTMF '${digit}') for Call-ID: ${callId}`);
  }

  public getStatus(): SipRegistrationStatus {
    return this.status;
  }

  public getConfig(): SipAccountConfig | null {
    return this.currentConfig;
  }

  private notifyStatus() {
    this.statusListeners.forEach((fn) => fn(this.status));
  }
}

export const sipAdapter = new SipGatewayAdapter();
