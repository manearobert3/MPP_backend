const express = require("express");
const mysql = require("mysql2");
const { authenticateToken, authorizeRole } = require("../authMiddleware");
const router = express.Router();

var con = mysql.createConnection({
  host: process.env.MYSQL_HOST.toString(),
  user: process.env.MYSQL_USER.toString(),
  password: process.env.MYSQL_PASSWORD.toString(),
  database: process.env.MYSQL_NAME.toString(),
  port: process.env.MYSQL_PORT.toString(),
});

// Helper function to query the database
function queryDatabase(query, params) {
  return new Promise((resolve, reject) => {
    con.query(query, params, (error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    });
  });
}
function calculateBMR(gender, weight, height, age) {
  if (gender === "male") {
    return 66.47 + 13.75 * weight + 5.003 * height - 6.755 * age;
  } else if (gender === "female") {
    return 655.1 + 9.563 * weight + 1.85 * height - 4.676 * age;
  }
  return 0;
}

// Get all users
router.get("/", authenticateToken, authorizeRole("admin"), async (req, res) => {
  try {
    const result = await queryDatabase("SELECT * FROM UsersTable", []);
    res.json(result);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get a user by UserName
router.get(
  "/:UserName",
  authenticateToken,
  authorizeRole("admin"),
  async (req, res) => {
    try {
      const { UserName } = req.params;
      const result = await queryDatabase(
        "SELECT * FROM UsersTable WHERE UserName = ?",
        [UserName]
      );
      if (result.length > 0) {
        res.json(result[0]);
      } else {
        res.status(404).json({ message: "User not found" });
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);
router.put("/currentUser", authenticateToken, async (req, res) => {
  const username = req.body.username; // Get the username from the token
  const updatedUser = req.body;

  // Validate the inputs as needed
  if (updatedUser.CaloriesPerDay === 0) {
    updatedUser.CaloriesPerDay = calculateBMR(
      updatedUser.Gender,
      updatedUser.Weight,
      updatedUser.Height,
      updatedUser.Age
    );
  }
  try {
    const result = await queryDatabase(
      "UPDATE UsersTable SET PasswordMpp = ?, Weight = ?, Height = ?, Age = ?, Gender = ?, CaloriesPerDay = ? WHERE UserName = ?",
      [
        updatedUser.PasswordMpp,
        updatedUser.Weight,
        updatedUser.Height,
        updatedUser.Age,
        updatedUser.Gender,
        updatedUser.CaloriesPerDay,
        username,
      ]
    );
    res.status(200).send("User updated successfully");
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Add a new user
router.post(
  "/users",
  authenticateToken,
  authorizeRole("admin"),
  async (req, res) => {
    try {
      const { UserName, PasswordMpp, role, Weight, Height, Age, Gender } =
        req.body;
      const CaloriesPerDay = calculateBMR(Gender, Weight, Height, Age);

      const result = await queryDatabase(
        "INSERT INTO UsersTable (UserName, PasswordMpp, role, Weight, Height, Age, Gender, CaloriesPerDay) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
          UserName,
          PasswordMpp,
          role,
          Weight,
          Height,
          Age,
          Gender,
          CaloriesPerDay,
        ]
      );
      res.status(201).json({ message: "User added successfully" });
    } catch (error) {
      console.error("Error adding user:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Update an existing user
router.put(
  "/:UserName",
  authenticateToken,
  authorizeRole("admin"),
  async (req, res) => {
    try {
      const { UserName } = req.params;
      const { PasswordMpp, role, Weight, Height, Age, Gender, CaloriesPerDay } =
        req.body;

      const result = await queryDatabase(
        "UPDATE UsersTable SET PasswordMpp = ?, role = ?, Weight = ?, Height = ?, Age = ?, Gender = ?, CaloriesPerDay = ? WHERE UserName = ?",
        [
          PasswordMpp,
          role,
          Weight,
          Height,
          Age,
          Gender,
          CaloriesPerDay,
          UserName,
        ]
      );
      if (result.affectedRows > 0) {
        res.json({ message: "User updated successfully" });
      } else {
        res.status(404).json({ message: "User not found" });
      }
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Delete a user
router.delete(
  "/:UserName",
  authenticateToken,
  authorizeRole("admin"),
  async (req, res) => {
    try {
      const { UserName } = req.params;
      const result = await queryDatabase(
        "DELETE FROM UsersTable WHERE UserName = ?",
        [UserName]
      );
      if (result.affectedRows > 0) {
        res.json({ message: "User deleted successfully" });
      } else {
        res.status(404).json({ message: "User not found" });
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

module.exports = router;
