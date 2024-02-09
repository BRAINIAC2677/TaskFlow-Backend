import express from "express";
import dotenv from "dotenv";
import db from "../db.js";
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
  console.log("New Registration", email, password);
  if (response1.error) {
    res.json(response1);
    return;
  }
  console.log("Register request received");
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
  res.json(response2);
});

router.post("/signin", async (req, res) => {
  let email = req.body.email;
  let password = req.body.password;
  console.log("Sign in request received", email, password);

  try {
    let { data: signInData, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      console.error("Error: ", error);
      res.status(500).json(error);
      return;
    }

    const query = `
      SELECT a.id, a.first_name, a.middle_name, a.last_name, b.email, a.username, a.dp_url
      FROM "UserProfile" a, auth.users b
      WHERE a.id = b.id and b.email = $1
    `;

    const userProfileData = await db.any(query, [email]);

    const responseData = {
      signInData,
      userProfileData,
    };

    res.json(responseData);
    console.log("Signed in successfully", responseData);
  } catch (error) {
    console.error("Error: ", error);
    res.status(500).json({ error: "Internal Server Error" });
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

router.post("/change-password", async (req, res) => {
  const { data, error } = await get_user(req);
  if (error) {
    res.json(error);
    return;
  }
  const user_id = data.user.id;
  const { current_password, new_password } = req.body;
  console.log(
    "Change password request received",
    user_id,
    current_password,
    new_password
  );
  const { data: data1, error: error1 } = await supabase.auth.updateUser({
    password: new_password,
  });
  if (error1) {
    res.json(error1);
    return;
  }
  console.log("Password updated successfully", data1);
  res.json({ success: true, message: "Password updated successfully" });
});

export default router;
