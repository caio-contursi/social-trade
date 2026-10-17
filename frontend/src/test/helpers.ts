import type { LoginResponse, User } from "@/lib/types";

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

export function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1, full_name: "Pessoa de teste", username: "pessoa_teste",
    email: "pessoa@example.test", document: "52998224725",
    account_type: "person", role: "member", role_label: "Membro",
    phone: null, responsible_title: "Voluntária", registration_number: "ST-TESTE",
    ...overrides,
  };
}

export function makeSession(token: string, overrides: Partial<User> = {}): LoginResponse {
  return { access_token: token, token_type: "bearer", user: makeUser(overrides) };
}
