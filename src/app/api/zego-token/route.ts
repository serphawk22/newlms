import crypto from "crypto";

function generateKitTokenForTest(
  appID: number,
  serverSecret: string,
  roomID: string,
  userID: string,
  userName: string,
  expirationSeconds = 7200
): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    app_id: appID,
    user_id: userID,
    nonce: Math.floor(2147483647 * Math.random()),
    ctime: now,
    expire: now + expirationSeconds,
  };

  const key = Buffer.from(serverSecret, "utf8");
  let iv = Math.random().toString().substring(2, 18);
  if (iv.length < 16) iv += iv.substring(0, 16 - iv.length);

  const cipher = crypto.createCipheriv("aes-256-cbc", key, Buffer.from(iv, "utf8"));
  let encrypted = cipher.update(JSON.stringify(payload), "utf8", "base64");
  encrypted += cipher.final("base64");

  const cipherBytes = Buffer.from(encrypted, "base64");
  const cipherLen = cipherBytes.length;
  const tokenBuffer = Buffer.alloc(28 + cipherLen);

  tokenBuffer.writeUInt32BE(0, 0);
  tokenBuffer.writeUInt32BE(payload.expire, 4);
  tokenBuffer.writeUInt16BE(iv.length, 8);
  tokenBuffer.write(iv, 10, iv.length, "utf8");
  tokenBuffer.writeUInt16BE(cipherLen, 26);
  cipherBytes.copy(tokenBuffer, 28);

  const binaryPart = "04" + tokenBuffer.toString("base64");
  const metadataPart = Buffer.from(
    JSON.stringify({
      userID,
      roomID,
      userName: encodeURIComponent(userName),
      appID,
    })
  ).toString("base64");

  return binaryPart + "#" + metadataPart;
}

export async function POST(req: Request) {
  try {
    const { roomId, userId, userName } = await req.json();

    if (!roomId || !userId || !userName) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const appId = parseInt(process.env.NEXT_PUBLIC_ZEGO_APP_ID!, 10);
    const serverSecret = process.env.ZEGO_SERVER_SECRET!;

    if (!appId || !serverSecret) {
      return Response.json({ error: "Missing ZEGO credentials" }, { status: 500 });
    }

    const token = generateKitTokenForTest(
      appId,
      serverSecret,
      roomId,
      userId,
      userName,
      3600
    );

    return Response.json({ token });
  } catch (error) {
    console.error("Zego token error:", error);
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
