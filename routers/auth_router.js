import express from "express";
import dotenv from "dotenv";
import supabase from "../supabase.js";

const router = express.Router();

dotenv.config();

function get_jwt(req) {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return null;
  }
  const jwt = authorization.split(" ")[1];
  if (!jwt) {
    return null;
  }
  return jwt;
}

export async function get_user(req) {
  const jwt = get_jwt(req);
  if (!jwt) {
    return { data: null, error: "Unauthorized. No JWT provided." };
  }
  return await supabase.auth.getUser(jwt);
}

router.post("/signup", async (req, res) => {
  // todo: check if user already exists
  const { username, first_name, middle_name, last_name, email, password } =
    req.body;
  const response1 = await supabase.auth.signUp({
    email: email,
    password: password,
  });
  console.log(response1);
  if (response1.error) {
    res.json(response1);
    return;
  }
  console.log(username, first_name, middle_name, last_name);
  const response2 = await supabase
    .from("UserProfile")
    .insert([
      {
        id: response1.data.user.id,
        username: username,
        first_name: first_name,
        middle_name: middle_name,
        last_name: last_name,
      },
    ])
    .select();
  console.log(response2);
  res.json(response2);
});

router.post("/signin", async (req, res) => {
  let email = req.body.email;
  let password = req.body.password;
  console.log(email);
  console.log(password);
  let { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password,
  });
  if (error) {
    res.json(error);
  } else {
    res.json(data);
  }
});

router.post("/signout", async (req, res) => {
  // todo: jwt is not invalidated on signout until it expires
  const jwt = get_jwt(req);
  if (!jwt) {
    res.json({ error: "Unauthorized" });
    return;
  }
  const { error } = await supabase.auth.signOut(jwt);
  if (error) {
    res.json(error);
  } else {
    res.json({ success: true, message: "Signed out" });
  }
});

router.get("/user", async (req, res) => {
  const { data, error } = await get_user(req);
  if (error) {
    res.json(error);
  } else {
    res.json(data);
  }
});

export default router;
