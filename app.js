import express from "express";
import {json, urlencoded} from "express";
import cors from "cors";
import dotenv from "dotenv";

import db from "./db.js";
import auth_router from "./routers/auth_router.js";

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

app.get("/", async (req, res) => {
  try {
    const data = await db.any(
      'SELECT * FROM "TaskBoards"'
    );
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

