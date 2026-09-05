import { LocalSipAdapter, type LocalSipState } from "./localSipAdapter";

interface LocalSipBootstrapResponse {
  server?: string;
  aor?: string;
  username?: string;
  password?: string;
  expiresAt?: string;
  error?: string;
}

interface LocalSipTestSessionResponse {
  sessionId?: string;
  toExtension?: string;
  error?: string;
}

export async function prepareLocalSipTestCall(options: {
  onState: (state: LocalSipState) => void;
  onError: (error: Error) => void;
}): Promise<{ adapter: LocalSipAdapter; sessionId: string; toExtension: string; audio: HTMLAudioElement }> {
  const bootstrapResponse = await fetch("/api/telephony/local/bootstrap", { cache: "no-store" });
  const bootstrap = await bootstrapResponse.json() as LocalSipBootstrapResponse;
  if (!bootstrapResponse.ok || !bootstrap.server || !bootstrap.aor || !bootstrap.username || !bootstrap.password || !bootstrap.expiresAt) {
    throw new Error(bootstrap.error || "Local SIP connection could not be prepared.");
  }

  const sessionResponse = await fetch("/api/telephony/local/test-call", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fromExtension: "1001", toExtension: "1002" }),
  });
  const session = await sessionResponse.json() as LocalSipTestSessionResponse;
  if (!sessionResponse.ok || !session.sessionId || !session.toExtension) throw new Error(session.error || "The internal test call session could not be created.");

  const audio = document.createElement("audio");
  audio.autoplay = true;
  audio.setAttribute("playsinline", "true");
  audio.style.display = "none";
  document.body.appendChild(audio);

  const adapter = new LocalSipAdapter({
    server: bootstrap.server,
    aor: bootstrap.aor,
    username: bootstrap.username,
    password: bootstrap.password,
    remoteAudio: audio,
    onState: options.onState,
    onError: options.onError,
  });
  await adapter.connect();
  await adapter.register();
  return { adapter, sessionId: session.sessionId, toExtension: session.toExtension, audio };
}
