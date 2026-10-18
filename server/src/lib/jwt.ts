import jwt from "jsonwebtoken";
import { config } from "../config";

export interface JwtPayload {
  userId: string;
  username: string;
  role: string;
  tv: number;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(
    {
      userId: payload.userId,
      username: payload.username,
      role: payload.role,
      tv: payload.tv,
    },
    config.jwtSecret,
    {
      expiresIn: config.jwtExpiresIn,
      algorithm: "HS256",
    } as jwt.SignOptions,
  );
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, config.jwtSecret, { algorithms: ["HS256"] });
  if (typeof decoded !== "object" || !decoded || !("userId" in decoded) || !("username" in decoded)) {
    throw new Error("Invalid token payload");
  }
  return {
    userId: String(decoded.userId),
    username: String(decoded.username),
    role: typeof decoded.role === "string" ? decoded.role : "USER",
    tv: typeof decoded.tv === "number" ? decoded.tv : -1,
  };
}
