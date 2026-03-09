import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { Avatar, JwtPayload } from "shared/types";

// In production, use a proper secret from env
const JWT_SECRET = process.env.JWT_SECRET || "kalak-game-night-secret-" + Date.now();

export function createToken(displayName: string, roomCode: string, avatar: Avatar): { token: string; playerId: string } {
  const playerId = uuidv4();
  const payload: JwtPayload = { playerId, displayName, roomCode, avatar };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
  return { token, playerId };
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function generatePlayerId(): string {
  return uuidv4();
}
