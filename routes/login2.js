const express = require("express");
const { connectDB, closeDB } = require("../db.js");
const sql = require("mssql/msnodesqlv8.js");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

const router = express.Router();

router.put("/add", async (req, res) => {
  try {
    await connectDB();
    const UserName = req.body.UserName;
    const passwordMpp = req.body.passwordMpp;

    const query = `SELECT * FROM UsersTable WHERE UserName = '${UserName}' AND PasswordMpp = '${passwordMpp}'`;

    const result = await sql.query(query);
    if (result.recordset.length > 0) {
      const user = result.recordset[0];
      const jwtToken = jwt.sign(
        {
          userName: user.UserName,
          exp: Math.floor(Date.now() / 1000) + 60 * 60,
        },
        process.env.JWT_SECRET
      );

      res.json({ message: "Welcome Back!", token: jwtToken });
    } else {
      return res
        .status(404)
        .json({ message: "UserName or Password invalid !!!" });
    }
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    await closeDB();
  }
});

router.put("/register", async (req, res) => {
  try {
    await connectDB();
    const UserName = req.body.UserName;
    const passwordMpp = req.body.passwordMpp;

    const query = `SELECT * FROM UsersTable WHERE UserName = '${UserName}' AND PasswordMpp = '${passwordMpp}'`;
    const result = await sql.query(query);
    if (result.recordset.length > 0) {
      return res.status(400).json({ message: "User already existent." });
    } else {
      const insertQuery = `INSERT INTO UsersTable (UserName, PasswordMpp) VALUES ('${UserName}', '${passwordMpp}')`;
      await sql.query(insertQuery);
      return res.status(200).json({ message: "Successful registration." });
    }
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    await closeDB();
  }
});

router.get("/getinfo", async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const secretKey = process.env.JWT_SECRET;

    jwt.verify(token, secretKey, (err, decoded) => {
      if (err) {
        console.error("JWT verification failed:", err);
        res.status(401).json({ message: "Unauthorized" });
      } else {
        console.log("JWT verified successfully");
        console.log("Decoded payload:", decoded);

        const { userName } = decoded;

        console.log("Username:", userName);

        res.status(200).json({ userName });
      }
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
