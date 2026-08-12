import { z } from "zod";

export const registerSchema = z.object({
  username: z.string().min(3).max(20),
  email: z.string().email(),
  password: z.string().min(6),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi girin."),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token gerekli."),
  newPassword: z
    .string()
    .min(6, "Şifre en az 6 karakter olmalı."),
});