import { api } from "./api";

export interface LoginPayload {
  email: string;
  password: string;
  role: "patient" | "practitioner";
}

export async function login(data: any) {
  console.log("API URL 👉", process.env.NEXT_PUBLIC_API_URL);
  console.log("LOGIN PAYLOAD 👉", data);

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/auth/login`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );

  if (!res.ok) {
    let message = "Login failed";

    try {
      const err = await res.json();
      message = err.message || message;
    } catch { }

    throw new Error(message);
  }

  return res.json();
}
