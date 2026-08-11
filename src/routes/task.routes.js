import { Router } from "express";
import prisma from "../lib/prisma.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = Router();
router.use(authMiddleware);

async function verifyBoardOwnership(boardId, userId) {
  const board = await prisma.board.findUnique({ where: { id: boardId } });
  if (!board || board.userId !== userId) {
    return null;
  }
  return board;
}

router.get("/", async (req, res) => {
  try {
    const { boardId } = req.query;
    if (!boardId) {
      return res.status(400).json({ message: "boardId zorunlu." });
    }
    const board = await verifyBoardOwnership(boardId, req.user.userId);
    if (!board) {
      return res.status(404).json({ message: "Board bulunamadı." });
    }

    const tasks = await prisma.task.findMany({
      where: { boardId: board.id },
      orderBy: { createdAt: "asc" },
    });
    res.json(tasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "sunucu hatası!" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { title, description, status, type, priority, dueDate, boardId } =
      req.body;
    if (!title || !status || boardId) {
      return res.status(400).json({ message: "başlık ve durum  zorunlu" });
    }

    const board = await verifyBoardOwnership(boardId, req.user.userId);
    if (!board) {
      return res.status(404).json({ message: "Board bulunamadı." });
    }

    const newTask = await prisma.task.create({
      data: {
        title,
        description: description || null,
        status,
        type: type || "task",
        priority: priority || "mid",
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    res.status(201).json(newTask);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "sunucu hatası" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, type, priority, dueDate } = req.body;


    const task = await prisma.task.findUnique({ where: { id } });
    if (!task ) {
      return res.status(404).json({ message: "Task bulunamadı." });
    }

    const board = await verifyBoardOwnership(task.boardId, req.user.userId);
    if (!board) {
      return res.status(404).json({ message: "Task bulunamadı." });
    }

    const updatedTask = await prisma.task.update({
      where: { id },

      data: {
        title,
        description,
        status,
        type,
        priority,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });
    res.status(201).json(updatedTask);
  } catch (error) {
    console.error(error);
    res.status(501).json({ message: "Sunucu Hatası" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task || task.boardId !== board.id) {
      return res.status(404).json({ message: "Task bulunamadı." });
    }

    const board = await verifyBoardOwnership(task.boardId, req.user.userId);
    if (!board) {
      return res.status(404).json({ message: "Task bulunamadı." });
    }

    await prisma.task.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Sunucu Hatası " });
  }
});

export default router;
