import { api } from "./api";

export interface LoginPayload {
  email: string;
  password: string;
  role: "patient" | "practitioner";
}

export async function login(data: LoginPayload) {
  console.log("API URL 👉", process.env.NEXT_PUBLIC_API_URL);
  console.log("LOGIN PAYLOAD 👉", data);

  const res = await api.post("/auth/login", data);

  return res.data;
}
