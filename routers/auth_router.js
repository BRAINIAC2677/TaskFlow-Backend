// import express from "express";
// import dotenv from "dotenv";
// import db from "../db.js";
// import supabase from "../supabase.js";

const express = require('express');
const dotenv = require('dotenv');
const db = require('../db.js');
const supabase = require('../supabase.js');

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

async function get_user(req) {
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
    res.status(500).json(response1);
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
  if (response2.error) {
    res.status(500).json(response2);
    return;
  } else res.status(200).json(response2);
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

    res.status(200).json(responseData);
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
    res.status(500).json({ error: "Unauthorized" });
    return;
  }
  const { error } = await supabase.auth.signOut(jwt);
  if (error) {
    res.status(500).json(error);
  } else {
    res.status(200).json({ success: true, message: "Signed out" });
  }
});

router.get("/user", async (req, res) => {
  const { data, error } = await get_user(req);
  if (error) {
    res.status(500).json(error);
  } else {
    res.status(200).json(data);
  }
});

router.post("/change-password", async (req, res) => {
  console.log("Password change request received", req.body);
  if (!req.body.type) {
    res.status(500).json({ error: "Type not provided" });
    return;
  }
  if (req.body.type === "update") {
    console.log("Update password request received");
    const { data, error } = await get_user(req);
    if (error) {
      console.error("Error: ", error);
      res.status(500).json(error);
      return;
    }
  }

  const { type, current_password, new_password } = req.body;
  console.log(type, current_password, new_password);
  const { data: data1, error: error1 } = await supabase.auth.updateUser({
    password: new_password,
  });
  if (error1) {
    console.error("Error: ", error1);
    res.status(500).json(error1);
    return;
  }
  console.log("Password updated successfully", data1);
  res.status(200).json({
    success: true,
    message: "Password updated successfully",
    data: data1,
  });
});

router.post("/reset-password", async (req, res) => {
  const { email } = req.body;
  console.log("Password reset request received", email);

  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: "http://localhost:5173/reset-password/new-password",
  });

  if (error) {
    res.status(500).json({
      success: false,
      message: "Password reset email not sent",
      error: error,
    });
    console.error("Password reset email not sent", error);
    return;
  } else {
    console.log("Password reset email sent", data);
    res.status(200).json({
      success: true,
      message: "Password reset email sent",
      data: data,
    });
  }
});

// export default router;
module.exports = {
  router,
  get_user,
};
