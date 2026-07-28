import {
  createHmac,
  randomBytes,
  randomInt,
  scrypt,
  timingSafeEqual,
} from "node:crypto";

const PIN_PATTERN = /^\d{4}$/;
const SCRYPT_KEY_LENGTH = 64;

const FORBIDDEN_PINS = new Set([
  "0000",
  "1111",
  "2222",
  "3333",
  "4444",
  "5555",
  "6666",
  "7777",
  "8888",
  "9999",
  "1234",
  "4321",
]);

function getPinSecret(): string {
  const secret = process.env.OPERATOR_PIN_SECRET;

  if (!secret) {
    throw new Error(
      "OPERATOR_PIN_SECRET is not defined",
    );
  }

  return secret;
}

function derivePinKey(
  pin: string,
  salt: string,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      pin,
      salt,
      SCRYPT_KEY_LENGTH,
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(derivedKey);
      },
    );
  });
}

export function generateOperatorPin(): string {
  let pin: string;

  do {
    pin = randomInt(0, 10_000)
      .toString()
      .padStart(4, "0");
  } while (FORBIDDEN_PINS.has(pin));

  return pin;
}

export function createPinLookup(pin: string): string {
  if (!PIN_PATTERN.test(pin)) {
    throw new Error("PIN must contain exactly 4 digits");
  }

  return createHmac(
    "sha256",
    getPinSecret(),
  )
    .update(pin)
    .digest("hex");
}

export async function hashPin(
  pin: string,
): Promise<string> {
  if (!PIN_PATTERN.test(pin)) {
    throw new Error("PIN must contain exactly 4 digits");
  }

  const salt = randomBytes(16).toString("hex");
  const derivedKey = await derivePinKey(pin, salt);

  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPin(
  pin: string,
  storedHash: string,
): Promise<boolean> {
  if (!PIN_PATTERN.test(pin)) {
    return false;
  }

  const [salt, savedKeyHex] = storedHash.split(":");

  if (!salt || !savedKeyHex) {
    return false;
  }

  const savedKey = Buffer.from(savedKeyHex, "hex");
  const derivedKey = await derivePinKey(pin, salt);

  if (savedKey.length !== derivedKey.length) {
    return false;
  }

  return timingSafeEqual(savedKey, derivedKey);
}