import express from "express";
import { json, urlencoded } from "express";
import cors from "cors";
import dotenv from "dotenv";

import db from "./db.js";
import auth_router from "./routers/auth_router.js";
import profile_router from "./routers/profile_router.js";
import taskboard_router from "./routers/taskboard_router.js";
import tasklist_router from "./routers/tasklist_router.js";
import task_router from "./routers/task_router.js";
import taskmessage_router from "./routers/taskmessage_router.js";
import ai_router from "./routers/ai_router.js";

const app = express();
const port = process.env.PORT || 3000;

app.use(json());
app.use(urlencoded({ extended: true }));

dotenv.config();

app.use(
  cors({
    origin: "*",
  })
);

app.use("/auth", auth_router);
app.use("/profile", profile_router);
app.use("/board", taskboard_router);
app.use("/list", tasklist_router);
app.use("/task", task_router);
app.use("/taskmessage", taskmessage_router);
app.use("/ai", ai_router);

app.get("/", async (req, res) => {
  try {
    const data = await db.any('SELECT * FROM "TaskBoard"');
    res.status(200).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

export default app;