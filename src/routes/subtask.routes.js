import { Router } from "express";
import prisma from "../lib/prisma.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = Router();
router.use(authMiddleware);

router.post("/", async (req, res) => {
  try {
    const { title, taskId } = req.body;
    const userId = req.user.userId;

    if (!title || !taskId) {
      return res.status(400).json({ message: "title ve taskId zorunludur." });
    }

    // Task'ın varlığını ve panonun mevcut kullanıcıya ait olup olmadığını doğrula
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { board: true },
    });

    if (!task || task.board.userId !== userId) {
      return res.status(404).json({ message: "Görev veya pano bulunamadı." });
    }

    const newSubTask = await prisma.subTask.create({
      data: {
        title: title.trim(),
        taskId: task.id,
        boardId: task.boardId,
        userId: userId,
      },
    });

    return res.status(201).json(newSubTask);
  } catch (error) {
    console.error("SubTask oluşturma hatası:", error);
    return res.status(500).json({ message: "Sunucu hatası." });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, completed } = req.body;
    const userId = req.user.userId;

    const existingSubTask = await prisma.subTask.findFirst({
      where: { id, userId },
    });

    if (!existingSubTask) {
      return res.status(404).json({ message: "Alt görev bulunamadı." });
    }

    const updatedSubTask = await prisma.subTask.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(completed !== undefined && { completed: Boolean(completed) }),
      },
    });

    return res.status(200).json(updatedSubTask);
  } catch (error) {
    console.error("SubTask güncelleme hatası:", error);
    return res.status(500).json({ message: "Sunucu hatası." });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const existingSubTask = await prisma.subTask.findFirst({
      where: { id, userId },
    });

    if (!existingSubTask) {
      return res.status(404).json({ message: "Alt görev bulunamadı." });
    }

    await prisma.subTask.delete({
      where: { id },
    });

    return res.status(204).send();
  } catch (error) {
    console.error("SubTask silme hatası:", error);
    return res.status(500).json({ message: "Sunucu hatası." });
  }
});

export default router;