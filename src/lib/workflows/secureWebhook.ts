import { lookup as dnsLookup } from "node:dns/promises";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";

const WEBHOOK_TIMEOUT_MS = 10_000;
const BLOCKED_IPV4_RANGES = [
  ["0.0.0.0", "0.255.255.255"],
  ["10.0.0.0", "10.255.255.255"],
  ["100.64.0.0", "100.127.255.255"],
  ["127.0.0.0", "127.255.255.255"],
  ["169.254.0.0", "169.254.255.255"],
  ["172.16.0.0", "172.31.255.255"],
  ["192.0.0.0", "192.0.0.255"],
  ["192.0.2.0", "192.0.2.255"],
  ["192.88.99.0", "192.88.99.255"],
  ["192.168.0.0", "192.168.255.255"],
  ["168.63.129.16", "168.63.129.16"],
  ["198.18.0.0", "198.19.255.255"],
  ["198.51.100.0", "198.51.100.255"],
  ["203.0.113.0", "203.0.113.255"],
  ["224.0.0.0", "255.255.255.255"],
] as const;

export interface WebhookAddress {
  address: string;
  family: number;
}

export interface SecureWebhookRequest {
  address: string;
  hostname: string;
  hostHeader: string;
  path: string;
  method: "GET" | "POST";
  body?: string;
  signal: AbortSignal;
}

export interface SecureWebhookTransport {
  lookup(hostname: string): Promise<readonly WebhookAddress[]>;
  request(options: SecureWebhookRequest): Promise<number>;
}

function ipv4ToNumber(address: string): number {
  return address.split(".").reduce((value, octet) => value * 256 + Number(octet), 0);
}

function ipv6Hextets(address: string): number[] {
  let normalized = address.toLowerCase().split("%")[0];
  const embeddedIpv4 = normalized.match(/(?:^|:)(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (embeddedIpv4) {
    const octets = embeddedIpv4[1].split(".").map(Number);
    const replacement = `${((octets[0] << 8) | octets[1]).toString(16)}:${((octets[2] << 8) | octets[3]).toString(16)}`;
    normalized = `${normalized.slice(0, embeddedIpv4.index)}${embeddedIpv4[0].startsWith(":") ? ":" : ""}${replacement}`;
  }

  const separator = normalized.indexOf("::");
  if (separator < 0) return normalized.split(":").map((group) => parseInt(group, 16));

  const left = normalized.slice(0, separator).split(":").filter(Boolean);
  const right = normalized.slice(separator + 2).split(":").filter(Boolean);
  const missingGroups = Math.max(0, 8 - left.length - right.length);
  return [...left, ...Array(missingGroups).fill("0"), ...right].map((group) => parseInt(group, 16));
}

export function isPublicWebhookAddress(address: string): boolean {
  const family = isIP(address);

  if (family === 4) {
    const value = ipv4ToNumber(address);
    return !BLOCKED_IPV4_RANGES.some(([start, end]) => {
      return value >= ipv4ToNumber(start) && value <= ipv4ToNumber(end);
    });
  }

  if (family !== 6) return false;

  const [first = 0, second = 0] = ipv6Hextets(address);
  if (first < 0x2000 || first > 0x3fff) return false; // only global-unicast 2000::/3
  if (first === 0x2002) return false; // 6to4
  if (first === 0x2001 && second === 0x0db8) return false; // documentation
  if (first === 0x2001 && second <= 0x01ff) return false; // IETF special use
  if (first === 0x3fff && second <= 0x0fff) return false; // documentation 3fff::/20
  return true;
}

function parseWebhookUrl(target: string): URL {
  let url: URL;
  try {
    url = new URL(target);
  } catch {
    throw new Error("URL webhooku není platná.");
  }

  if (url.protocol !== "https:") {
    throw new Error("Webhook musí používat zabezpečené HTTPS.");
  }
  if (url.port && url.port !== "443") {
    throw new Error("Webhook musí používat standardní port HTTPS (443).");
  }
  if (url.username || url.password || url.hash) {
    throw new Error("URL webhooku nesmí obsahovat přihlašovací údaje ani fragment.");
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  const normalizedHostname = hostname.startsWith("[") && hostname.endsWith("]")
    ? hostname.slice(1, -1)
    : hostname;
  const blockedSuffixes = [
    ".localhost",
    ".local",
    ".internal",
    ".home.arpa",
    ".test",
    ".invalid",
    ".example",
    ".onion",
  ];

  if (
    !normalizedHostname ||
    (isIP(normalizedHostname) === 0 && !normalizedHostname.includes(".")) ||
    normalizedHostname === "localhost" ||
    blockedSuffixes.some((suffix) => normalizedHostname.endsWith(suffix))
  ) {
    throw new Error("Webhook musí cílit na veřejnou internetovou adresu.");
  }

  return url;
}

function withAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }

    const onAbort = () => reject(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });

    promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

const nodeTransport: SecureWebhookTransport = {
  lookup: async (hostname) => dnsLookup(hostname, { all: true, verbatim: true }),
  request: (options) => new Promise((resolve, reject) => {
    const request = httpsRequest({
      hostname: options.address,
      family: isIP(options.address),
      port: 443,
      method: options.method,
      path: options.path,
      headers: {
        Host: options.hostHeader,
        "Content-Type": "application/json",
      },
      ...(isIP(options.hostname) === 0 ? { servername: options.hostname } : {}),
      rejectUnauthorized: true,
      agent: false,
      signal: options.signal,
    }, (response) => {
      response.resume();
      resolve(response.statusCode ?? 0);
    });

    request.once("error", reject);
    request.end(options.body);
  }),
};

export async function sendSecureWebhook(
  target: string,
  method: "GET" | "POST",
  payload: Record<string, unknown>,
  transport: SecureWebhookTransport = nodeTransport,
  timeoutMs = WEBHOOK_TIMEOUT_MS,
): Promise<number> {
  const url = parseWebhookUrl(target);
  const hostname = url.hostname.startsWith("[") && url.hostname.endsWith("]")
    ? url.hostname.slice(1, -1)
    : url.hostname.replace(/\.$/, "");
  const signal = AbortSignal.timeout(timeoutMs);
  let addresses: readonly WebhookAddress[];

  if (isIP(hostname) !== 0) {
    addresses = [{ address: hostname, family: isIP(hostname) }];
  } else {
    addresses = await withAbort(transport.lookup(hostname), signal);
  }

  const publicAddress = addresses.find(({ address, family }) => (
    family === isIP(address) && isPublicWebhookAddress(address)
  ));
  if (!publicAddress) {
    throw new Error("Webhook neukazuje na veřejnou internetovou IP adresu.");
  }

  const body = method === "POST" ? JSON.stringify(payload) : undefined;
  return withAbort(transport.request({
    address: publicAddress.address,
    hostname,
    hostHeader: url.host,
    path: `${url.pathname}${url.search}`,
    method,
    body,
    signal,
  }), signal);
}
