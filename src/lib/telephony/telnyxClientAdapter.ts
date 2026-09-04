export interface TelnyxCallIds {
  telnyxCallControlId: string;
  telnyxSessionId: string;
  telnyxLegId: string;
}

export interface TelnyxCallLike {
  state: string;
  telnyxIDs?: Partial<TelnyxCallIds>;
  answer(): Promise<unknown>;
  hangup(): Promise<unknown> | void;
  toggleAudioMute(): void;
  toggleHold(): Promise<unknown> | void;
  dtmf(digit: string): void;
}

export interface TelnyxCallNotification {
  type?: string;
  call?: TelnyxCallLike;
  error?: Error | { message?: string };
}

export interface TelnyxErrorNotification {
  error?: Error | { message?: string };
}

export interface TelnyxClientLike {
  on(eventName: string, listener: (event: TelnyxCallNotification | TelnyxErrorNotification | unknown) => void): TelnyxClientLike;
  connect(): Promise<void>;
  newCall(options: {
    destinationNumber: string;
    callerNumber: string;
    audio: boolean;
    remoteElement: HTMLAudioElement;
    clientState: string;
  }): TelnyxCallLike;
}

export async function createTelnyxClient(token: string): Promise<TelnyxClientLike> {
  const { TelnyxRTC } = await import("@telnyx/webrtc");
  return new TelnyxRTC({ login_token: token }) as unknown as TelnyxClientLike;
}
