import express from "express";
import { connectDB, closeDB } from "../db.js";
import sql from "mssql/msnodesqlv8.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
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
      const user = result.recordset[0]; // Accessing the first user found in the result set
      const jwtToken = jwt.sign(
        {
          userName: user.UserName,
          exp: Math.floor(Date.now() / 1000) + 60 * 60,
        }, // Setting expiration time to 1 hour from now
        process.env.JWT_SECRET
      );

      res.json({ message: "Welcome Back!", token: jwtToken });
    } else {
      // User doesn't exist, you can proceed with registration
      return res
        .status(404)
        .json({ message: "UserName or Password invalid !!!" });
    }
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    await closeDB(); // Ensure to close the database connection
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
      // User doesn't exist, you can proceed with registration

      const insertQuery = `INSERT INTO UsersTable (UserName, PasswordMpp) VALUES ('${UserName}', '${passwordMpp}')`;
      await sql.query(insertQuery);
      return res.status(200).json({ message: "Successful registration." }); // Typo: Changed 'Succesful' to 'Successful'
    }
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    await closeDB(); // Ensure to close the database connection
  }
});

router.get("/getinfo", async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1]; // Extract the token from the Authorization header
    const secretKey = process.env.JWT_SECRET;

    jwt.verify(token, secretKey, (err, decoded) => {
      if (err) {
        // JWT verification failed
        console.error("JWT verification failed:", err);
        res.status(401).json({ message: "Unauthorized" });
      } else {
        // JWT verification successful
        console.log("JWT verified successfully");
        console.log("Decoded payload:", decoded);

        // Access username and password from the decoded payload
        const { userName } = decoded;

        // Log username and password to console
        console.log("Username:", userName);

        // Optionally, you can send the username and password back in the response
        res.status(200).json({ userName });
      }
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
