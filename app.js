// import express from "express";
// import { json, urlencoded } from "express";
// import cors from "cors";
// import dotenv from "dotenv";

// import auth_router from "./routers/auth_router.js";
// import profile_router from "./routers/profile_router.js";
// import taskboard_router from "./routers/taskboard_router.js";
// import tasklist_router from "./routers/tasklist_router.js";
// import task_router from "./routers/task_router.js";
// import taskmessage_router from "./routers/taskmessage_router.js";
// import ai_router from "./routers/ai_router.js";

const express = require('express');
const { json, urlencoded } = express;
const cors = require('cors');
const dotenv = require('dotenv');

const { router: auth_router } = require('./routers/auth_router.js');
const profile_router = require('./routers/profile_router.js');
const taskboard_router = require('./routers/taskboard_router.js');
const tasklist_router = require('./routers/tasklist_router.js');
const task_router = require('./routers/task_router.js');
const taskmessage_router = require('./routers/taskmessage_router.js');
const ai_router = require('./routers/ai_router.js');


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
  res.send("Express on Vercel");
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

module.exports = app;