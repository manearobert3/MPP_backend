const express = require("express");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const mysql = require("mysql2");
dotenv.config();

const router = express.Router();

var pool = mysql.createPool({
  host: process.env.MYSQL_HOST.toString(),
  user: process.env.MYSQL_USER.toString(),
  password: process.env.MYSQL_PASSWORD.toString(),
  database: "mppmysql",
  port: 21289,
});

function calculateBMR(gender, weight, height, age) {
  if (gender === "male") {
    return 66.47 + 13.75 * weight + 5.003 * height - 6.755 * age;
  } else if (gender === "female") {
    return 655.1 + 9.563 * weight + 1.85 * height - 4.676 * age;
  }
  return 0;
}

// Helper function to query the database
function queryDatabase(query, params) {
  return new Promise((resolve, reject) => {
    pool.query(query, params, (error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    });
  });
}

router.put("/add", async (req, res) => {
  try {
    const { Email, passwordMpp } = req.body;
    const query =
      "SELECT * FROM UsersTable WHERE Email = ? AND PasswordMpp = ?";
    const result = await queryDatabase(query, [Email, passwordMpp]);
    if (result.length > 0) {
      const user = result[0];
      const jwtToken = jwt.sign(
        {
          userName: user.UserName,
          role: user.role,
          Weight: user.Weight,
          Height: user.Height,
          Age: user.Age,
          Gender: user.Gender,
          CaloriesPerDay: user.CaloriesPerDay,
          exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
        },
        process.env.JWT_SECRET
      );
      res.json({ message: "Welcome Back!", token: jwtToken });
    } else {
      res.status(404).json({ message: "Email or Password invalid !!!" });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.put("/register", async (req, res) => {
  try {
    const { UserName, passwordMpp, Email, Weight, Height, Age, Gender } =
      req.body;

    // Check if user already exists
    const query = "SELECT * FROM UsersTable WHERE Email = ?";
    const result = await queryDatabase(query, [Email]);

    if (result.length > 0) {
      res.status(400).json({ message: "User already exists." });
    } else {
      const role = "user"; // Set role to 'user' by default
      const CaloriesPerDay = calculateBMR(Gender, Weight, Height, Age);

      const insertQuery =
        "INSERT INTO UsersTable (UserName, PasswordMpp, Email, role, Weight, Height, Age, Gender, CaloriesPerDay) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
      await queryDatabase(insertQuery, [
        UserName,
        passwordMpp,
        Email,
        role,
        Weight,
        Height,
        Age,
        Gender,
        CaloriesPerDay,
      ]);

      // Send confirmation email with user details
      sendConfirmationEmail(
        Email,
        UserName,
        role,
        Weight,
        Height,
        Age,
        Gender,
        CaloriesPerDay
      );

      res.status(200).json({ message: "Successful registration." });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/getinfo", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ message: "Authorization header missing" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Token missing" });
    }

    const secretKey = process.env.JWT_SECRET;

    jwt.verify(token, secretKey, async (err, decoded) => {
      if (err) {
        console.error("JWT verification failed:", err);
        res.status(401).json({ message: "Unauthorized" });
      } else {
        const { userName } = decoded;
        const userResult = await queryDatabase(
          "SELECT * FROM UsersTable WHERE UserName = ?",
          [userName]
        );

        if (userResult.length > 0) {
          const user = userResult[0];
          console.log(user.CaloriesPerDay);
          res.status(200).json({
            userName: user.UserName,
            role: user.role,
            weight: user.Weight,
            height: user.Height,
            age: user.Age,
            gender: user.Gender,
            caloriesPerDay: user.CaloriesPerDay,
          });
        } else {
          res.status(404).json({ message: "User not found" });
        }
      }
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_NAME.toString(),
    pass: process.env.EMAIL_PASSWORD.toString(),
  },
});

const sendConfirmationEmail = (
  email,
  userName,
  role,
  weight,
  height,
  age,
  gender,
  caloriesPerDay
) => {
  const mailOptions = {
    from: process.env.EMAIL_NAME.toString(),
    to: email,
    subject: "Account Confirmation",
    html: `
          <div style="font-family: Arial, sans-serif; text-align: center; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
              <img src='https://i.postimg.cc/vDtrhsjT/0e60d5ad-b3e1-4015-a9e2-a063dcfca4ed-ezgif-com-webp-to-jpg-converter.jpg' alt="Welcome to FitBuddy" style="width: 200px; height: 200px; margin-bottom: 20px;">
              <h2>Welcome to FitBuddy!</h2>
              <p>Thank you for registering. Your account has been successfully created.</p>
              <h3>Your Account Details</h3>
              <ul style="list-style: none; padding: 0;">
                  <li><strong>Username:</strong> ${userName}</li>
                  <li><strong>Email:</strong> ${email}</li>
                  <li><strong>Role:</strong> ${role}</li>
                  <li><strong>Weight:</strong> ${weight} kg</li>
                  <li><strong>Height:</strong> ${height} cm</li>
                  <li><strong>Age:</strong> ${age} years</li>
                  <li><strong>Gender:</strong> ${gender}</li>
                  <li><strong>Calories Per Day:</strong> ${caloriesPerDay} kcal</li>
              </ul>
              <p>FitBuddy is your ultimate calorie tracker, food explorer, and source of information on foods. Stay healthy and enjoy your journey with us!</p>
              <p style="color: #999;">&copy; 2024 FitBuddy. All rights reserved.</p>
          </div>
      `,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
    } else {
      console.log("Email sent:", info.response);
    }
  });
};
module.exports = router;
