const express = require("express");
const mysql = require("mysql2/promise");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const con = mysql.createPool({
  host: process.env.MYSQL_HOST.toString(),
  user: process.env.MYSQL_USER.toString(),
  password: process.env.MYSQL_PASSWORD.toString(),
  database: process.env.MYSQL_NAME.toString(),
  port: process.env.MYSQL_PORT.toString(),
});

const router = express.Router();
router.use(bodyParser.json()); // Middleware to parse JSON bodies

// Helper function to query the database
async function queryDatabase(query, params) {
  try {
    const [results] = await con.query(query, params);
    return results;
  } catch (error) {
    throw error;
  }
}
router.get("/lastDays/:userName/:days", async (req, res) => {
  const { userName, days } = req.params;

  try {
    const query = `
          SELECT date, calories, waterCups, protein, sugar, fats
          FROM DailyTracker
          WHERE userName = ?
          ORDER BY date DESC
          LIMIT ?;
      `;
    const results = await queryDatabase(query, [userName, parseInt(days)]);
    res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching last days' tracker data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
router.get("/:userName/:date", async (req, res) => {
  const { userName, date } = req.params;
  try {
    const rows = await queryDatabase(
      "SELECT * FROM DailyTracker WHERE UserName = ? AND Date = ?",
      [userName, date]
    );
    res.json(rows[0]);
  } catch (error) {
    res.status(500).send("Error fetching tracker data");
  }
});

router.post("/", async (req, res) => {
  const { userName, date, calories, waterCups, protein, sugar, fats } =
    req.body;

  try {
    const existingEntries = await queryDatabase(
      "SELECT * FROM DailyTracker WHERE UserName = ? AND Date = ?",
      [userName, date]
    );

    if (existingEntries.length > 0) {
      // Update existing entry
      await queryDatabase(
        `UPDATE DailyTracker 
         SET Calories = ?, WaterCups = ?, Protein = ?, Sugar = ?, Fats = ?
         WHERE UserName = ? AND Date = ?`,
        [calories, waterCups, protein, sugar, fats, userName, date]
      );
      res.send("Tracker data updated");
    } else {
      // Insert new entry
      await queryDatabase(
        `INSERT INTO DailyTracker (UserName, Date, Calories, WaterCups, Protein, Sugar, Fats) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userName, date, calories, waterCups, protein, sugar, fats]
      );
      res.send("Tracker data inserted");
    }
  } catch (error) {
    res.status(500).send("Error updating tracker data");
  }
});

router.post("/addFood", async (req, res) => {
  try {
    const { userName, date, foodId, grams } = req.body;
    const foodResult = await queryDatabase(
      "SELECT * FROM Food WHERE FoodID = ?",
      [foodId]
    );

    if (foodResult.length > 0) {
      const food = foodResult[0];
      const calories = (food.Calories * grams) / 100;
      const protein = (food.Protein * grams) / 100;
      const sugar = (food.Sugar * grams) / 100;
      const fats = (food.Fats * grams) / 100;

      const existingEntries = await queryDatabase(
        "SELECT * FROM DailyTracker WHERE UserName = ? AND Date = ?",
        [userName, date]
      );

      if (existingEntries.length > 0) {
        // Update existing entry
        await queryDatabase(
          `UPDATE DailyTracker 
           SET Calories = Calories + ?, Protein = Protein + ?, Sugar = Sugar + ?, Fats = Fats + ?
           WHERE UserName = ? AND Date = ?`,
          [calories, protein, sugar, fats, userName, date]
        );
        res.send("Food added to tracker");
      } else {
        // Insert new entry
        await queryDatabase(
          `INSERT INTO DailyTracker (UserName, Date, Calories, WaterCups, Protein, Sugar, Fats) 
           VALUES (?, ?, ?, 0, ?, ?, ?)`,
          [userName, date, calories, protein, sugar, fats]
        );
        res.send("Food added to tracker");
      }
    } else {
      res.status(404).json({ message: "Food not found" });
    }
  } catch (error) {
    console.error("Error adding food to tracker:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_NAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const sendDailyResumeEmail = async (email, data) => {
  const dateObj = new Date(data.Date);
  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  const formattedDate = dateObj.toLocaleDateString("en-US", options);
  const mailOptions = {
    from: process.env.EMAIL_NAME.toString(),
    to: email,
    subject: "Your Daily FitBuddy Summary",
    html: `
      <div style="font-family: Arial, sans-serif; text-align: center; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #f9f9f9;">
        <h2 style="color: #4CAF50;">Your Daily FitBuddy Summary 💪</h2>
        <p style="font-size: 16px; color: #333;">Here is your summary for the day:</p>
        <ul style="list-style: none; padding: 0; text-align: left; font-size: 14px; color: #555;">
          <li style="margin-bottom: 10px;"><strong>Date:</strong> ${formattedDate}</li>
          <li style="margin-bottom: 10px;"><strong>Calories:</strong> ${data.Calories} kcal 🍽️</li>
          <li style="margin-bottom: 10px;"><strong>Water Cups:</strong> ${data.WaterCups} 💧</li>
          <li style="margin-bottom: 10px;"><strong>Protein:</strong> ${data.Protein} g 🥩</li>
          <li style="margin-bottom: 10px;"><strong>Sugar:</strong> ${data.Sugar} g 🍬</li>
          <li style="margin-bottom: 10px;"><strong>Fats:</strong> ${data.Fats} g 🥑</li>
        </ul>
        <p style="font-size: 16px; color: #333;">Keep up the good work and stay healthy with FitBuddy! 🌟</p>
        <p style="font-size: 12px; color: #999;">&copy; 2024 FitBuddy. All rights reserved.</p>
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

router.post("/sendDailyResume", async (req, res) => {
  try {
    const { userName, date } = req.body;
    console.log("Received request for user:", userName, "date:", date);

    // Get the user's email and daily data
    const userResult = await queryDatabase(
      "SELECT Email FROM UsersTable WHERE UserName = ?",
      [userName]
    );

    if (userResult.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const userEmail = userResult[0].Email;
    console.log("User email:", userEmail);

    const dataResult = await queryDatabase(
      "SELECT * FROM DailyTracker WHERE UserName = ? AND Date = ?",
      [userName, date]
    );

    if (dataResult.length === 0) {
      return res
        .status(404)
        .json({ message: "No data found for the selected date" });
    }

    const dailyData = dataResult[0];
    console.log("Daily data:", dailyData);

    await sendDailyResumeEmail(userEmail, dailyData);
    res.status(200).json({ message: "Daily resume email sent" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/addMealFood", async (req, res) => {
  try {
    const { userName, date, mealType, foodId, grams } = req.body;

    const query = `
      INSERT INTO MealTracker (UserName, Date, MealType, FoodID, Grams)
      VALUES (?, ?, ?, ?, ?)
    `;
    await queryDatabase(query, [userName, date, mealType, foodId, grams]);

    res.status(200).json({ message: "Food added to meal tracker" });
  } catch (error) {
    console.error("Error adding food to meal tracker", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/meals/:userName/:date", async (req, res) => {
  try {
    const { userName, date } = req.params;

    const query = `
      SELECT mt.MealID, mt.MealType, mt.Grams, f.FoodName, f.Calories, f.Protein, f.Sugar, f.Fats 
      FROM MealTracker mt
      JOIN Food f ON mt.FoodID = f.FoodID
      WHERE mt.UserName = ? AND mt.Date = ?
    `;
    const result = await queryDatabase(query, [userName, date]);

    res.status(200).json(result);
    console.log(result);
  } catch (error) {
    console.error("Error fetching meals", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Delete a food from a meal
// Delete a food from a meal
router.delete("/meals/:mealId", async (req, res) => {
  try {
    const { mealId } = req.params;

    // Fetch the meal data before deleting it
    const mealDataQuery = `
      SELECT mt.UserName, mt.Date, mt.Grams, f.Calories, f.Protein, f.Sugar, f.Fats 
      FROM MealTracker mt
      JOIN Food f ON mt.FoodID = f.FoodID
      WHERE mt.MealID = ?
    `;
    const mealData = await queryDatabase(mealDataQuery, [mealId]);

    if (mealData.length === 0) {
      return res.status(404).json({ message: "Meal not found" });
    }

    const meal = mealData[0];
    const calories = (meal.Calories * meal.Grams) / 100;
    const protein = (meal.Protein * meal.Grams) / 100;
    const sugar = (meal.Sugar * meal.Grams) / 100;
    const fats = (meal.Fats * meal.Grams) / 100;

    // Delete the meal
    const deleteQuery = "DELETE FROM MealTracker WHERE MealID = ?";
    await queryDatabase(deleteQuery, [mealId]);

    // Subtract the meal data from the DailyTracker
    const updateDailyTrackerQuery = `
      UPDATE DailyTracker
      SET 
        Calories = GREATEST(Calories - ?, 0),
        Protein = GREATEST(Protein - ?, 0),
        Sugar = GREATEST(Sugar - ?, 0),
        Fats = GREATEST(Fats - ?, 0)
      WHERE UserName = ? AND Date = ?
    `;
    await queryDatabase(updateDailyTrackerQuery, [
      calories,
      protein,
      sugar,
      fats,
      meal.UserName,
      meal.Date,
    ]);

    res
      .status(200)
      .json({ message: "Food removed from meal and tracker updated" });
  } catch (error) {
    console.error("Error deleting food from meal", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
