import { Router } from "express";
import bcrypt from "bcrypt";
import prisma from "../lib/prisma.js";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import authMiddleware from "../middleware/auth.middleware.js";
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
} from "../validators/auth.validators.js";
import { generateToken, hashToken } from "../lib/tokens.js";
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "../lib/mailer.js";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validators/auth.validators.js";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    message:
      "Çok fazla giriş denemesi yaptınız, lütfen daha sonra tekrar deneyin.",
  },
});
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: {
    message:
      "Çok fazla şifre sıfırlama isteği. Lütfen daha sonra tekrar deneyin.",
  },
});

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

router.post("/register", async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);

    if (!parsed.success) {
      const fieldErrors = parsed.error.issues.map((issue) => ({
        field: issue.path[0],
        message: issue.message,
      }));
      return res
        .status(400)
        .json({ message: "geçersiz veri ", errors: fieldErrors });
    }
    const { username, email, password } = parsed.data;

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      return res
        .status(409)
        .json({ message: "Bu e-posta veya kullanıcı adı zaten kayıtlı." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
      },
    });
    const verifyRawToken = generateToken();
    await prisma.emailVerificationToken.create({
      data: {
        token: hashToken(verifyRawToken),
        userId: newUser.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 saat
      },
    });
    sendVerificationEmail(newUser.email, verifyRawToken).catch((err) =>
      console.error("Verification email gönderilemedi:", err),
    );
    await prisma.board.create({
      data: {
        title: "Panom",
        userId: newUser.id,
      },
    });

    const token = jwt.sign(
      { userId: newUser.id, username: newUser.username },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.cookie("token", token, COOKIE_OPTIONS);

    const { password: _, ...userWithoutPassword } = newUser;

    return res.status(201).json({
      message: "Kayıt başarılı.",
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Sunucu hatası." });
  }
});

router.post("/login", loginLimiter, async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      const fieldErrors = parsed.error.issues.map((issue) => ({
        field: issue.path[0],
        message: issue.message,
      }));
      return res
        .status(400)
        .json({ message: "geçersiz veri ", errors: fieldErrors });
    }
    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
    });
    if (!user) {
      return res.status(401).json({ message: "E-posta veya şifre hatalı!" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "E-posta veya şifre hatalı." });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );
    res.cookie("token", token, COOKIE_OPTIONS);

    const { password: _, ...userWithoutPassword } = user;
    return res.status(200).json({
      message: "Giriş başarılı.",
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Sunucu hatası." });
  }
});

router.patch("/change-password", authMiddleware, async (req, res) => {
  try {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      const fieldErrors = parsed.error.issues.map((issue) => ({
        field: issue.path[0],
        message: issue.message,
      }));
      return res
        .status(400)
        .json({ message: "Geçersiz veri.", errors: fieldErrors });
    }
    const { oldPassword, newPassword } = parsed.data;
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordValid) {
      return res.status(401).json({ message: "Mevcut şifre yanlış." });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedNewPassword },
    });

    return res.status(200).json({ message: "Şifre başarıyla değiştirildi." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Sunucu hatası." });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("token", COOKIE_OPTIONS);
  res.status(200).json({ message: "Çıkış yapıldı." });
});
export default router;

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }

    const { password: _, ...userWithoutPassword } = user;
    return res.status(200).json({ user: userWithoutPassword });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Sunucu hatası." });
  }
});

router.post("/forgot-password", forgotPasswordLimiter, async (req, res) => {
  try {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Geçersiz e-posta." });
    }
    const { email } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const rawToken = generateToken();
      const tokenHash = hashToken(rawToken);

      await prisma.passwordResetToken.create({
        data: {
          token: tokenHash,
          userId: user.id,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 saat
        },
      });

      sendPasswordResetEmail(user.email, rawToken).catch((err) =>
        console.error("Reset email gönderilemedi:", err),
      );
    }

    return res.status(200).json({
      message:
        "Eğer bu e-posta kayıtlıysa, şifre sıfırlama bağlantısı gönderildi.",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Sunucu hatası." });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      const fieldErrors = parsed.error.issues.map((issue) => ({
        field: issue.path[0],
        message: issue.message,
      }));
      return res
        .status(400)
        .json({ message: "Geçersiz veri.", errors: fieldErrors });
    }
    const { token, newPassword } = parsed.data;
    const tokenHash = hashToken(token);

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token: tokenHash },
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      return res.status(400).json({
        message:
          "Bağlantının süresi dolmuş veya geçersiz. Lütfen yeniden isteyin.",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return res.status(200).json({ message: "Şifreniz başarıyla güncellendi." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Sunucu hatası." });
  }
});

router.get("/verify-email", async (req, res) => {
  try {
    const { token } = req.query;
    if (!token || typeof token !== "string") {
      return res.status(400).json({ message: "Token gerekli." });
    }

    const tokenHash = hashToken(token);
    const verifyToken = await prisma.emailVerificationToken.findUnique({
      where: { token: tokenHash },
    });

    if (!verifyToken || verifyToken.expiresAt < new Date()) {
      return res.status(400).json({ message: "Bağlantının süresi dolmuş veya geçersiz." });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: verifyToken.userId },
        data: { emailVerified: true },
      }),
      prisma.emailVerificationToken.delete({ where: { id: verifyToken.id } }),
    ]);

    return res.status(200).json({ message: "E-posta adresiniz doğrulandı." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Sunucu hatası." });
  }
});

router.post("/resend-verification", authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }

    if (user.emailVerified) {
      return res.status(400).json({ message: "E-posta adresiniz zaten doğrulanmış." });
    }

    await prisma.emailVerificationToken.deleteMany({
      where: { userId: user.id },
    });

    const verifyRawToken = generateToken();
    await prisma.emailVerificationToken.create({
      data: {
        token: hashToken(verifyRawToken),
        userId: user.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    await sendVerificationEmail(user.email, verifyRawToken);

    return res.status(200).json({ message: "Doğrulama e-postası gönderildi." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Sunucu hatası." });
  }
});
