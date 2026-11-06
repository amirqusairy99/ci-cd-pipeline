import path from "node:path";
import cookieParser from "cookie-parser";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { authRouter } from "./auth.js";

const app = express();
const PORT = Number(process.env.PORT ?? 3000);

app.use(helmet());
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

// Slows down password guessing: 20 attempts per 15 minutes per IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Try again in a few minutes." },
});

app.use("/api/auth", authLimiter, authRouter);
app.use(express.static(path.resolve(process.cwd(), "public")));

app.listen(PORT, () => {
  console.log(`Running at http://localhost:${PORT}`);
});
