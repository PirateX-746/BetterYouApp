import { api } from "./api";

export interface LoginPayload {
  email: string;
  password: string;
  role: "patient" | "practitioner";
}

export async function login(data: any) {
  console.log("API URL 👉", process.env.NEXT_PUBLIC_API_URL);
  console.log("LOGIN PAYLOAD 👉", data);

  const res = await api.post("/auth/login", data);

  if (res.status !== 200) {
    let message = "Login failed";

    try {
      const err = res.data;
      message = err.message || message;
    } catch { }

    throw new Error(message);
  }

  return res.data;
}
