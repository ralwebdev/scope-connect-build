import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function signAccessToken(user) {
  return jwt.sign(
    {
      role: user.role,
      role_variant: user.roleVariant,
      email: user.email,
      founder: user.founder,
    },
    env.jwtAccessSecret,
    {
      subject: user.id,
      expiresIn: env.jwtAccessTtlSeconds,
      algorithm: "HS256",
    },
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtAccessSecret, { algorithms: ["HS256"] });
}

export function createRefreshToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashRefreshToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

