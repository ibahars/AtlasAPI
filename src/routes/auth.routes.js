import { Router } from "express";
import bcrypt from "bcrypt";
import prisma from "../lib/prisma.js";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import authMiddleware from "../middleware/auth.middleware.js";

const router = Router();

const registerSchema = z.object({
  username: z.string().min(3).max(20),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    message:
      "Çok fazla giriş denemesi yaptınız, lütfen daha sonra tekrar deneyin.",
  },
});

const changePasswordSchema = z.object({
  oldPassword : z.string().min(6),
  newPassword : z.string().min(6)
})

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 gün (ms cinsinden)
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
    await prisma.board.create({
      data: {
        title: "Panom",
        userId: newUser.id,
      },
    });

    const token = jwt.sign(
      { userId: newUser.id, username: newUser.username },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
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

router.patch("/change-password", authMiddleware , async(req,res)=>{
  try{
    const parsed = changePasswordSchema.safeParse(req.body)
    if(!parsed.success){
      const fieldErrors = parsed.error.issues.map((issue)=>({
        field: issue.path[0],
        message: issue.message,
      }));
      return res.status(400).json({ message: "Geçersiz veri.", errors: fieldErrors });

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
  }catch(error){
    console.error(error);
    return res.status(500).json({ message: "Sunucu hatası." });
  }
})

router.post("/logout", (req, res) => {
  res.clearCookie("token", COOKIE_OPTIONS);
  res.status(200).json({ message: "Çıkış yapıldı." });
});
export default router;
