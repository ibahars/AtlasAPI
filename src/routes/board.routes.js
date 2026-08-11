import { Router } from "express";
import prisma from "../lib/prisma.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = Router();
router.use(authMiddleware);

router.get("/", async (req , res)=>{
    try{
        const boards = await prisma.board.findMany({
            where: {userId: req.user.userId},
            orderBy: {createdAt: "asc"}
        })
        res.json(boards);
    }catch(error){
        console.error(error);
        res.status(500).json({message: "Sunucu Hatası"})
    }
})

router.post("/", async(req,res)=>{
    try{
        const {title} = req.body
        if(!title){
            return res.status(400).json({message: "Başlık Zorunlu"})
        }

        const newBoard = await prisma.board.create({
            data: {
                title,
                userId:  req.user.userId
            }
        })

        res.status(201).json(newBoard)
    }catch(error){
        console.error(error)
        res.status(500).json({message: "Sunucu Hatası"})
    }
})

router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title} = req.body;

    const board = await prisma.board.findUnique({ where: { id } });
    if (!board || board.userId !== req.user.userId) {
      return res.status(404).json({ message: "Board bulunamadı." });
    }

    const updatedBoard = await prisma.board.update({
      where: { id },
      data: { title},
    });
    res.status(200).json(updatedBoard);
  } catch (error) {
    console.error(error);
    res.status(501).json({ message: "Sunucu Hatası" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const board = await prisma.board.findUnique({ where: { id } });
    if (!board || board.userId !== req.user.userId ){
      return res.status(404).json({ message: "Board bulunamadı." });
    }


    const boardCount = await prisma.board.count({
      where: { userId: req.user.userId },
    });
    if (boardCount <= 1) {
      return res.status(400).json({ message: "Son board silinemez." });
    }

    await prisma.board.delete({where : {id}})
    res.status(204).send();
  } catch (error) {
    console.error(error)
    res.status(500).json({message: "Sunucu Hatası "})
  }
});

export default router;