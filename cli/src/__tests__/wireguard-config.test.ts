import { describe, expect, test } from "bun:test";
import { parseWireguardConfig } from "@/lib/wireguard-config.js";

describe("parseWireguardConfig", () => {
  test("parses a typical Mullvad config", () => {
    const input = `[Interface]
PrivateKey = wOEI9rqqbDwnN8/Bpp22sVz48T71vJ4fYmFWujulwUU=
Address = 10.64.222.21/32,fc00:bbbb:bbbb:bb01::1:de14/128
DNS = 10.64.0.1

[Peer]
PublicKey = 0000000000000000000000000000000000000000000=
AllowedIPs = 0.0.0.0/0,::0/0
Endpoint = 185.213.154.66:51820
`;
    const result = parseWireguardConfig(input);
    expect(result).not.toBeNull();
    expect(result!.privateKey).toBe("wOEI9rqqbDwnN8/Bpp22sVz48T71vJ4fYmFWujulwUU=");
    expect(result!.addresses).toBe("10.64.222.21/32,fc00:bbbb:bbbb:bb01::1:de14/128");
    expect(result!.dns).toBe("10.64.0.1");
    expect(result!.publicKey).toBe("0000000000000000000000000000000000000000000=");
    expect(result!.endpoint).toBe("185.213.154.66:51820");
  });

  test("handles PresharedKey when present", () => {
    const input = `[Interface]
PrivateKey = abc=
Address = 10.0.0.2/32

[Peer]
PublicKey = xyz=
PresharedKey = shared=
`;
    const result = parseWireguardConfig(input)!;
    expect(result.presharedKey).toBe("shared=");
  });

  test("is case-insensitive on keys and section headers", () => {
    const input = `[interface]
privatekey = key1
ADDRESS = 10.0.0.2/32
`;
    const result = parseWireguardConfig(input)!;
    expect(result.privateKey).toBe("key1");
    expect(result.addresses).toBe("10.0.0.2/32");
  });

  test("ignores comments and blank lines", () => {
    const input = `# Mullvad config

[Interface]
# key below
PrivateKey = abc=
Address = 10.0.0.2/32
`;
    const result = parseWireguardConfig(input)!;
    expect(result.privateKey).toBe("abc=");
  });

  test("returns null when config is empty or missing both key and address", () => {
    expect(parseWireguardConfig("")).toBeNull();
    expect(parseWireguardConfig("[Interface]\nDNS = 1.1.1.1\n")).toBeNull();
  });

  test("handles CRLF line endings", () => {
    const input = "[Interface]\r\nPrivateKey = abc=\r\nAddress = 10.0.0.2/32\r\n";
    const result = parseWireguardConfig(input)!;
    expect(result.privateKey).toBe("abc=");
    expect(result.addresses).toBe("10.0.0.2/32");
  });
});
