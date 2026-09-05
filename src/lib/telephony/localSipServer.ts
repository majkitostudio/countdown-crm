import "server-only";

export interface LocalSipBootstrap {
  server: string;
  aor: string;
  username: string;
  password: string;
  expiresAt: string;
}

const LOCAL_SIP_LEASE_MS = 5 * 60 * 1000;

export function getLocalSipBootstrap(): LocalSipBootstrap {
  const username = (process.env.LOCAL_SIP_USERNAME || "1001").trim();
  const password = username === "1002" ? process.env.SIP_PASSWORD_1002?.trim() : process.env.SIP_PASSWORD_1001?.trim();
  if (!password) throw new Error("Local SIP password is missing from the server environment.");

  return {
    server: "ws://127.0.0.1:8088/ws",
    aor: `sip:${username}@127.0.0.1`,
    username,
    password,
    expiresAt: new Date(Date.now() + LOCAL_SIP_LEASE_MS).toISOString(),
  };
}
