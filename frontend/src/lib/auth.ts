import { api } from "./api";

export interface LoginPayload {
  email: string;
  password: string;
  role: "patient" | "practitioner";
}

export async function login(data: LoginPayload) {
  const res = await api.post("/auth/login", data);
  return res.data;
}
