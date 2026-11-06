import { randomUUID } from "node:crypto";

export interface User {
  id: string;
  email: string;
  passwordHash: string;
}

// In-memory store so the project runs with zero setup.
// Users are lost when the server restarts. To persist them, replace these
// three functions with queries to your database (MySQL, Postgres, SQLite...).
const byEmail = new Map<string, User>();
const byId = new Map<string, User>();

export async function findUserByEmail(email: string): Promise<User | undefined> {
  return byEmail.get(email);
}

export async function findUserById(id: string): Promise<User | undefined> {
  return byId.get(id);
}

export async function createUser(email: string, passwordHash: string): Promise<User> {
  const user: User = { id: randomUUID(), email, passwordHash };
  byEmail.set(email, user);
  byId.set(user.id, user);
  return user;
}
