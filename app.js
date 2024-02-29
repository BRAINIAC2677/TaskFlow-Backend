import express from "express";
import { json, urlencoded } from "express";
import cors from "cors";
import dotenv from "dotenv";

import auth_router from "./routers/auth_router.js";
import profile_router from "./routers/profile_router.js";
import taskboard_router from "./routers/taskboard_router.js";
import tasklist_router from "./routers/tasklist_router.js";
import task_router from "./routers/task_router.js";
import taskmessage_router from "./routers/taskmessage_router.js";
import ai_router from "./routers/ai_router.js";
import insight_router from "./routers/insight_router.js";
import notif_router from "./routers/notif_router.js";
import misc_router from "./routers/misc_router.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(json());
app.use(urlencoded({ extended: true }));

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
app.use("/insight", insight_router);
app.use("/notification", notif_router);
app.use("/misc", misc_router);

app.get("/", async (req, res) => {
  res.send("TaskFlow on Render");
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

export default app;
