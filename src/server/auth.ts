import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { createUser, findUserByEmail, findUserById } from "./users.js";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET === "change-me") {
  throw new Error("Set JWT_SECRET in your .env file (see .env.example).");
}

const COOKIE_NAME = "session";
const SESSION_DAYS = 7;
const isProd = process.env.NODE_ENV === "production";

const credentials = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

// Compared against when the email is unknown, so response time doesn't
// reveal whether an account exists.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12);

function setSessionCookie(res: Response, userId: string) {
  const token = jwt.sign({ sub: userId }, JWT_SECRET!, { expiresIn: `${SESSION_DAYS}d` });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true, // not readable from JavaScript, which limits XSS damage
    sameSite: "lax",
    secure: isProd, // HTTPS only in production
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
  });
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: "Not signed in" });
  try {
    const payload = jwt.verify(token, JWT_SECRET!);
    if (typeof payload === "string" || typeof payload.sub !== "string") throw new Error();
    const user = await findUserById(payload.sub);
    if (!user) throw new Error();
    res.locals.user = { id: user.id, email: user.email };
    next();
  } catch {
    res.clearCookie(COOKIE_NAME);
    res.status(401).json({ error: "Session expired. Sign in again." });
  }
}

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  const parsed = credentials.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  }
  const { email, password } = parsed.data;

  if (await findUserByEmail(email)) {
    return res.status(409).json({ error: "An account with this email already exists" });
  }
  const user = await createUser(email, await bcrypt.hash(password, 12));
  setSessionCookie(res, user.id);
  res.status(201).json({ user: { id: user.id, email: user.email } });
});

authRouter.post("/login", async (req, res) => {
  const parsed = credentials.safeParse(req.body);
  // Same message for every failure so attackers learn nothing about accounts.
  const invalid = () => res.status(401).json({ error: "Incorrect email or password" });
  if (!parsed.success) return invalid();

  const { email, password } = parsed.data;
  const user = await findUserByEmail(email);
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) return invalid();

  setSessionCookie(res, user.id);
  res.json({ user: { id: user.id, email: user.email } });
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.status(204).end();
});

authRouter.get("/me", requireAuth, (_req, res) => {
  res.json({ user: res.locals.user });
});
