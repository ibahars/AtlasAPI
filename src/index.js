import express from "express";
import cors from "cors";
import "dotenv/config";
import authRoutes from "./routes/auth.routes.js";
import helmet from "helmet";
import taskRoutes from "./routes/task.routes.js";
import cookieParser from "cookie-parser";


const app = express();
const PORT = process.env.PORT || 3000;


const allowedOrigins = [
  "https://atlas.ibahars.com",
  "http://localhost:5173",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS engeli: " + origin));
      }
    },
    credentials: true,
  })
);
app.use(helmet());
app.use(express.json());
app.use(cookieParser());
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes)


app.get("/", (req, res) => {
  res.json({ message: "Atlas API çalışıyor " });
});

app.listen(PORT, () => {
  console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor`);
});