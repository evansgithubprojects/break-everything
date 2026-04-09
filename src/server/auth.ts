import { cookies } from "next/headers";
import { verifyAdminPassword } from "@/server/db";

const SESSION_COOKIE = "be_admin_session";
const SESSION_SECRET = process.env.SESSION_SECRET;

function generateToken(): string {
  if (!SESSION_SECRET) {
    throw new Error("Missing SESSION_SECRET environment variable.");
  }
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  const hash = Buffer.from(`${SESSION_SECRET}:${timestamp}:${random}`).toString("base64");
  return hash;
}

export async function login(password: string): Promise<boolean> {
  if (!(await verifyAdminPassword(password))) {
    return false;
  }

  const token = generateToken();
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 4, // 4 hours
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
  return !!token?.value;
}
