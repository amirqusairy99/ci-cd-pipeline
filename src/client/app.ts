interface User {
  id: string;
  email: string;
}

type Mode = "login" | "register";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const authView = $<HTMLElement>("auth-view");
const accountView = $<HTMLElement>("account-view");
const form = $<HTMLFormElement>("auth-form");
const title = $<HTMLHeadingElement>("title");
const email = $<HTMLInputElement>("email");
const password = $<HTMLInputElement>("password");
const submit = $<HTMLButtonElement>("submit");
const switchPrompt = $<HTMLSpanElement>("switch-prompt");
const switchBtn = $<HTMLButtonElement>("switch");
const errorBox = $<HTMLParagraphElement>("error");
const whoami = $<HTMLElement>("whoami");
const logout = $<HTMLButtonElement>("logout");

let mode: Mode = "login";

async function api<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api/auth${path}`, {
    method: body === undefined && path === "/me" ? "GET" : "POST",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Something went wrong. Try again.");
  return data as T;
}

function setMode(next: Mode) {
  mode = next;
  const isLogin = next === "login";
  title.textContent = isLogin ? "Sign in" : "Create account";
  submit.textContent = isLogin ? "Sign in" : "Create account";
  password.autocomplete = isLogin ? "current-password" : "new-password";
  switchPrompt.textContent = isLogin ? "No account yet?" : "Already have an account?";
  switchBtn.textContent = isLogin ? "Create one" : "Sign in";
  showError("");
}

function showError(message: string) {
  errorBox.textContent = message;
  errorBox.hidden = message === "";
}

function showAccount(user: User) {
  whoami.textContent = user.email;
  authView.hidden = true;
  accountView.hidden = false;
  password.value = "";
}

function showAuth() {
  accountView.hidden = true;
  authView.hidden = false;
  email.focus();
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  showError("");
  submit.disabled = true;
  try {
    const { user } = await api<{ user: User }>(mode === "login" ? "/login" : "/register", {
      email: email.value,
      password: password.value,
    });
    showAccount(user);
  } catch (err) {
    showError(err instanceof Error ? err.message : "Something went wrong. Try again.");
  } finally {
    submit.disabled = false;
  }
});

switchBtn.addEventListener("click", () => setMode(mode === "login" ? "register" : "login"));

logout.addEventListener("click", async () => {
  await api("/logout", {});
  showAuth();
});

// On load, check whether a valid session cookie already exists.
api<{ user: User }>("/me")
  .then(({ user }) => showAccount(user))
  .catch(() => showAuth());
