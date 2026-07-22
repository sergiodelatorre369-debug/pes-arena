import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "cambia-esto-en-produccion";

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function signToken(user) {
  return jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// Middleware: exige un token válido en el header Authorization: Bearer <token>
export function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  const payload = token ? verifyToken(token) : null;
  if (!payload) {
    return res.status(401).json({ error: "No autorizado" });
  }
  req.userId = payload.sub;
  next();
}

// Nunca mandar el passwordHash al frontend.
export function publicUser(user) {
  return {
    id: user.id,
    playerId: `PES-${1000 + user.playerNumber}`,
    username: user.username,
    countryCode: user.countryCode,
    countryName: user.countryName,
    countryFlag: user.countryFlag,
    photoUrl: user.photoUrl,
    background: user.background,
    points: user.points,
    confiabilidad: user.confiabilidad,
    createdAt: user.createdAt,
  };
}
