import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { verifyAdminPassword } from "@/server/db";

const SESSION_COOKIE = "be_admin_session";
const SESSION_SECRET = process.env.SESSION_SECRET;

const MAX_AGE_SECONDS = 60 * 60 * 4; // 4 hours

interface SessionPayload {
  exp: number;
  nonce: string;
}

function b64urlEncode(buf: Buffer): string {
  return buf.toString("base64url");
}

function b64urlDecode(s: string): Buffer {
  return Buffer.from(s, "base64url");
}

function signPayload(payloadB64: string): string {
  if (!SESSION_SECRET) {
    throw new Error("Missing SESSION_SECRET environment variable.");
  }
  return createHmac("sha256", SESSION_SECRET).update(payloadB64).digest("base64url");
}

function createSessionToken(): string {
  const exp = Date.now() + MAX_AGE_SECONDS * 1000;
  const nonce = randomBytes(16).toString("hex");
  const payload: SessionPayload = { exp, nonce };
  const payloadB64 = b64urlEncode(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = signPayload(payloadB64);
  return `${payloadB64}.${sig}`;
}

function verifySessionToken(token: string | undefined): boolean {
  if (!token || !SESSION_SECRET) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payloadB64, sig] = parts;
  if (!payloadB64 || !sig) return false;
  try {
    const expectedSig = signPayload(payloadB64);
    const sigBuf = Buffer.from(sig, "utf8");
    const expBuf = Buffer.from(expectedSig, "utf8");
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      return false;
    }
    const raw = b64urlDecode(payloadB64).toString("utf8");
    if (raw.length > 512) return false;
    const payload = JSON.parse(raw) as SessionPayload;
    if (typeof payload.exp !== "number" || typeof payload.nonce !== "string") return false;
    if (payload.nonce.length > 64) return false;
    if (Date.now() > payload.exp) return false;
    return true;
  } catch {
    return false;
  }
}

export async function login(password: string): Promise<boolean> {
  if (!(await verifyAdminPassword(password))) {
    return false;
  }

  const token = createSessionToken();
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: MAX_AGE_SECONDS,
    path: "/",
  });

  return true;
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE);
  return verifySessionToken(token?.value);
}
