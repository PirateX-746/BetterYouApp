import { api } from "./api";

export interface LoginPayload {
  email: string;
  password: string;
  role: "patient" | "practitioner";
}

export async function login(data: any) {
  console.log("LOGIN PAYLOAD 👉", data);

  const res = await fetch("http://localhost:3001/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json();
    console.error("LOGIN ERROR 👉", err);
    throw new Error("Login failed");
  }

  return res.json();
}
