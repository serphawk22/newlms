/**
 * ZEGOCLOUD Token04 — Server-side generator
 *
 * Generates the raw Token04 and wraps it in the exact kit-token format that
 * ZegoUIKitPrebuilt.create(kitToken) expects, so serverSecret NEVER reaches
 * the browser.
 *
 * Token04 algorithm from the minified ZEGOCLOUD source:
 *  - AES-128-CBC encrypt the JSON payload using:
 *      key = UTF-8 bytes of serverSecret (first 16 chars)
 *      iv  = random 16-char ASCII string (nonce)
 *  - Binary layout (28 + cipherLen bytes):
 *      [0..3]  : 0x00000000   (version/reserved)
 *      [4..7]  : expire (int32 big-endian)
 *      [8..9]  : nonce length (uint16 big-endian)
 *      [10..25]: nonce (16 ASCII chars)
 *      [26..27]: cipher length (uint16 big-endian)
 *      [28..]  : cipher bytes
 *  - Token04 = "04" + base64(binary) + "#" + base64(JSON metadata)
 *
 * generateKitTokenForProduction format (from source):
 *   token04 + "#" + base64(JSON({userID, roomID, userName: encodeURIComponent(name), appID}))
 */

import crypto from "crypto";

/**
 * Generate a ZEGOCLOUD Token04 string.
 */
export function generateToken04(
  appId: number,
  serverSecret: string,
  roomId: string,
  userId: string,
  userName: string,
  effectiveTimeInSeconds = 3600
): string {
  const currentTime = Math.floor(Date.now() / 1000);
  const expiredTs   = currentTime + effectiveTimeInSeconds;

  // Random 16-char nonce (digits only)
  let nonce = '';
  for (let i = 0; i < 16; i++) {
    nonce += crypto.randomInt(0, 10).toString();
  }

  const payload = JSON.stringify({
    app_id:     appId,
    user_id:    userId,
    nonce,
    ctime:      currentTime,
    expired_ts: expiredTs,
    payload:    "",
  });

  // AES-128-CBC: key = UTF-8 bytes of first 16 chars of serverSecret
  const key = Buffer.from(serverSecret.substring(0, 16), "utf-8");
  const iv  = Buffer.from(nonce, "utf-8"); // 16-byte IV

  const cipher    = crypto.createCipheriv("aes-128-cbc", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(payload, "utf-8"),
    cipher.final(),
  ]);

  const cipherLen = encrypted.length;

  // Build binary: [0..3]=0, [4..7]=expire(BE int32), [8..9]=nonceLen, [10..25]=nonce, [26..27]=cipherLen, [28..]=cipher
  const buf = Buffer.allocUnsafe(28 + cipherLen);
  buf.writeUInt32BE(0, 0);           // version/reserved
  buf.writeInt32BE(expiredTs, 4);    // expire timestamp
  buf.writeUInt16BE(16, 8);          // nonce length
  Buffer.from(nonce, "utf-8").copy(buf, 10); // nonce
  buf.writeUInt16BE(cipherLen, 26);  // cipher length
  encrypted.copy(buf, 28);           // cipher

  const token04Part = "04" + buf.toString("base64");

  // Metadata suffix: same as generateKitTokenForProduction
  const meta = Buffer.from(
    JSON.stringify({
      userID:   userId,
      roomID:   roomId,
      userName: encodeURIComponent(userName || ""),
      appID:    appId,
    })
  ).toString("base64");

  return `${token04Part}#${meta}`;
}

/**
 * Alias — same as generateToken04 in this implementation.
 * Returns a kitToken ready for ZegoUIKitPrebuilt.create(kitToken).
 */
export const generateKitToken = generateToken04;
