import { checksum, createEnvelope, envelopeIsValid } from "./core.ts";
import type { NexusEncryptedPacket, NexusEnvelope, NexusReplica, VersionVector } from "./types.ts";

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
export const NEXUS_KDF_ITERATIONS = 210_000;

function requireCrypto(): Crypto {
  const provider = globalThis.crypto;
  if (!provider?.subtle) throw new Error("This browser does not provide the Web Crypto API required for encrypted sync.");
  return provider;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(input: string): Uint8Array {
  if (input.length > 20_000_000) throw new Error("Encrypted packet field is too large.");
  const binary = atob(input);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  requireCrypto().getRandomValues(bytes);
  return bytes;
}

async function deriveKey(passphrase: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  if (passphrase.normalize("NFKC").length < 8) throw new Error("Use a sync phrase with at least 8 characters.");
  const crypto = requireCrypto();
  const material = await crypto.subtle.importKey("raw", encoder.encode(passphrase.normalize("NFKC")), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function additionalData(packet: Pick<NexusEncryptedPacket, "packetVersion" | "roomId" | "createdAt">): Uint8Array {
  return encoder.encode(`levelup-nexus:${packet.packetVersion}:${packet.roomId}:${packet.createdAt}`);
}

export function encryptedPacketIsValid(value: unknown): value is NexusEncryptedPacket {
  if (!value || typeof value !== "object") return false;
  const packet = value as Partial<NexusEncryptedPacket>;
  if (packet.packetVersion !== 1
    || packet.algorithm !== "AES-GCM-256"
    || packet.kdf !== "PBKDF2-SHA-256"
    || !Number.isSafeInteger(packet.iterations)
    || (packet.iterations as number) < 10_000
    || (packet.iterations as number) > 2_000_000
    || typeof packet.roomId !== "string"
    || !/^[a-f0-9]{12}$/.test(packet.roomId)
    || typeof packet.salt !== "string"
    || typeof packet.iv !== "string"
    || typeof packet.ciphertext !== "string"
    || packet.ciphertext.length === 0
    || packet.ciphertext.length > 20_000_000
    || typeof packet.createdAt !== "string"
    || !Number.isFinite(Date.parse(packet.createdAt))) return false;
  try {
    return base64ToBytes(packet.salt).length === 16 && base64ToBytes(packet.iv).length === 12;
  } catch {
    return false;
  }
}

export async function encryptEnvelope(
  envelope: NexusEnvelope,
  passphrase: string,
  options: { iterations?: number } = {},
): Promise<NexusEncryptedPacket> {
  if (!envelopeIsValid(envelope)) throw new Error("Cannot encrypt an invalid Nexus envelope.");
  const iterations = options.iterations ?? NEXUS_KDF_ITERATIONS;
  if (!Number.isSafeInteger(iterations) || iterations < 10_000 || iterations > 2_000_000) throw new Error("Unsupported key-derivation cost.");
  const crypto = requireCrypto();
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const packetBase = {
    packetVersion: 1 as const,
    algorithm: "AES-GCM-256" as const,
    kdf: "PBKDF2-SHA-256" as const,
    iterations,
    roomId: checksum(envelope.workspaceId).slice(0, 12),
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    createdAt: envelope.generatedAt,
  };
  const key = await deriveKey(passphrase, salt, iterations);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource, additionalData: additionalData(packetBase) as BufferSource, tagLength: 128 },
    key,
    encoder.encode(JSON.stringify(envelope)),
  );
  return { ...packetBase, ciphertext: bytesToBase64(new Uint8Array(ciphertext)) };
}

export async function encryptReplica(
  replica: NexusReplica,
  passphrase: string,
  remoteFrontier: VersionVector = {},
): Promise<NexusEncryptedPacket> {
  return encryptEnvelope(createEnvelope(replica, remoteFrontier), passphrase);
}

export async function decryptEnvelope(value: unknown, passphrase: string): Promise<NexusEnvelope> {
  if (!encryptedPacketIsValid(value)) throw new Error("This is not a supported LevelUp Nexus packet.");
  const crypto = requireCrypto();
  const salt = base64ToBytes(value.salt);
  const iv = base64ToBytes(value.iv);
  const key = await deriveKey(passphrase, salt, value.iterations);
  let plaintext: ArrayBuffer;
  try {
    plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv as BufferSource, additionalData: additionalData(value) as BufferSource, tagLength: 128 },
      key,
      base64ToBytes(value.ciphertext) as BufferSource,
    );
  } catch {
    throw new Error("The sync phrase is wrong or this packet was changed after export.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(decoder.decode(plaintext));
  } catch {
    throw new Error("The decrypted packet is not valid UTF-8 JSON.");
  }
  if (!envelopeIsValid(parsed)) throw new Error("The decrypted envelope failed its integrity check.");
  if (checksum(parsed.workspaceId).slice(0, 12) !== value.roomId) throw new Error("Packet room identity does not match its encrypted payload.");
  return parsed;
}

