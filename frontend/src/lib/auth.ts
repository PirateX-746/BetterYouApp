import { api } from "./api";
import { clearSessionStorage } from "./session";

export { clearSessionStorage };

export interface LoginPayload {
  email: string;
  password: string;
  role: "patient" | "practitioner";
}

/**
 * Note: no access_token. The session is delivered as an HttpOnly cookie set
 * by the backend, so the token is never visible to page scripts. Everything
 * here is display data only and must not be used for authorisation.
 */
export interface LoginResponse {
  id: string;
  role: "patient" | "practitioner";
  name: string;
  mustChangePassword: boolean;
}

export async function login(data: LoginPayload) {
  const res = await api.post<LoginResponse>("/auth/login", data);
  return res.data;
}

export async function logout() {
  await api.post("/auth/logout");
}

export interface ForgotPasswordPayload {
  email: string;
  role: "patient" | "practitioner";
}

export interface ForgotPasswordResponse {
  message: string;
  devTempPassword?: string;
  devNote?: string;
}

export async function forgotPassword(data: ForgotPasswordPayload) {
  const res = await api.post<ForgotPasswordResponse>(
    "/auth/forgot-password",
    data,
  );
  return res.data;
}

export interface ChangePasswordPayload {
  newPassword: string;
}

export async function changePassword(data: ChangePasswordPayload) {
  const res = await api.post("/auth/change-password", data);
  return res.data;
}
