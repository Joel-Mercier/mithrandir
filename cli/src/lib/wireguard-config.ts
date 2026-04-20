/**
 * Parse a WireGuard client config file (`.conf`) into its fields.
 * Used to bootstrap Gluetun's WIREGUARD_* env vars from a provider-issued config.
 */

export interface ParsedWireguardConfig {
  /** [Interface] PrivateKey */
  privateKey?: string;
  /** [Interface] Address — may be comma-separated IPv4/IPv6 CIDRs */
  addresses?: string;
  /** [Interface] DNS */
  dns?: string;
  /** [Peer] PresharedKey */
  presharedKey?: string;
  /** [Peer] PublicKey */
  publicKey?: string;
  /** [Peer] Endpoint (host:port) */
  endpoint?: string;
}

export function parseWireguardConfig(content: string): ParsedWireguardConfig | null {
  const result: ParsedWireguardConfig = {};
  let section: "interface" | "peer" | null = null;

  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    const lower = line.toLowerCase();
    if (lower.startsWith("[interface]")) {
      section = "interface";
      continue;
    }
    if (lower.startsWith("[peer]")) {
      section = "peer";
      continue;
    }
    if (line.startsWith("[")) {
      section = null;
      continue;
    }

    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim().toLowerCase();
    const value = line.slice(eq + 1).trim();
    if (!value) continue;

    if (section === "interface") {
      if (key === "privatekey") result.privateKey = value;
      else if (key === "address") result.addresses = value;
      else if (key === "dns") result.dns = value;
    } else if (section === "peer") {
      if (key === "publickey") result.publicKey = value;
      else if (key === "presharedkey") result.presharedKey = value;
      else if (key === "endpoint") result.endpoint = value;
    }
  }

  if (!result.privateKey && !result.addresses) return null;
  return result;
}
