import { SimpleUser, type SimpleUserDelegate } from "sip.js/lib/platform/web/simple-user";

export type LocalSipState = "initiated" | "ringing" | "connected" | "held" | "ended" | "failed";

export interface LocalSipAdapterOptions {
  server: string;
  aor: string;
  username: string;
  password: string;
  remoteAudio: HTMLAudioElement;
  onState?: (state: LocalSipState) => void;
  onError?: (error: Error) => void;
}

/** Browser-only Local SIP adapter. Credentials are supplied per instance and never persisted. */
export class LocalSipAdapter {
  private readonly user: SimpleUser;
  private readonly onState?: (state: LocalSipState) => void;
  private readonly onError?: (error: Error) => void;

  constructor(options: LocalSipAdapterOptions) {
    this.onState = options.onState;
    this.onError = options.onError;
    const delegate: SimpleUserDelegate = {
      onCallCreated: () => this.onState?.("initiated"),
      onCallAnswered: () => this.onState?.("connected"),
      onCallHangup: () => this.onState?.("ended"),
      onCallHold: (held) => this.onState?.(held ? "held" : "connected"),
      onServerDisconnect: (error) => {
        if (error) this.onError?.(error);
        this.onState?.("failed");
      },
    };
    this.user = new SimpleUser(options.server, {
      aor: options.aor,
      delegate,
      media: { constraints: { audio: true, video: false }, remote: { audio: options.remoteAudio } },
      userAgentOptions: {
        authorizationUsername: options.username,
        authorizationPassword: options.password,
      },
    });
  }

  async connect(): Promise<void> { await this.user.connect(); }
  async register(): Promise<void> { await this.user.register(); }
  async dial(destination: string): Promise<void> {
    await this.user.call(destination, {}, {
      requestDelegate: {
        onProgress: (response) => {
          const statusCode = response.message.statusCode;
          if (statusCode === 180 || statusCode === 183) this.onState?.("ringing");
        },
      },
    });
  }
  async hangup(): Promise<void> { await this.user.hangup(); }
  async disconnect(): Promise<void> { await this.user.disconnect(); }
  async toggleHold(): Promise<void> { await (this.user.isHeld() ? this.user.unhold() : this.user.hold()); }
  toggleMute(): boolean {
    if (this.user.isMuted()) this.user.unmute();
    else this.user.mute();
    return this.user.isMuted();
  }
  async sendDtmf(digit: string): Promise<void> { await this.user.sendDTMF(digit); }
}
