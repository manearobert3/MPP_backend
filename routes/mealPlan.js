const express = require("express");
const mysql = require("mysql2/promise");
const bodyParser = require("body-parser");

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

router.get("/generateMealPlan/:userName", async (req, res) => {
  const { userName } = req.params;
  try {
    // Fetch user's calorie needs
    const userQuery =
      "SELECT caloriesPerDay FROM UsersTable WHERE UserName = ?";
    const userResult = await queryDatabase(userQuery, [userName]);

    if (userResult.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const caloriesPerDay = userResult[0].caloriesPerDay;

    // Fetch all foods
    const foodQuery = "SELECT * FROM Food";
    const foods = await queryDatabase(foodQuery);

    // Categorize foods
    const categorizedFoods = foods.reduce((acc, food) => {
      if (!acc[food.FoodType]) {
        acc[food.FoodType] = [];
      }
      acc[food.FoodType].push(food);
      return acc;
    }, {});

    // Function to generate random meal plan
    const generateMealPlan = (calories) => {
      const mealPlan = {
        breakfast: [],
        lunch: [],
        dinner: [],
        totalFoodCalories: 0,
      };
      const mealTypes = ["breakfast", "lunch", "dinner"];
      const mealCalories = {
        breakfast: 0.3 * calories,
        lunch: 0.4 * calories,
        dinner: 0.3 * calories,
      };
      const mealCategories = {
        breakfast: ["Fruits", "Dairy", "Carbohydrates"],
        lunch: ["Protein", "Vegetables", "Carbohydrates"],
        dinner: ["Protein", "Vegetables", "Carbohydrates"],
      };

      mealTypes.forEach((mealType) => {
        let remainingCalories = mealCalories[mealType];
        const categories = mealCategories[mealType];
        const usedFoods = new Set();

        while (remainingCalories > 0 && categories.length > 0) {
          const randomCategory =
            categories[Math.floor(Math.random() * categories.length)];
          if (
            !categorizedFoods[randomCategory] ||
            categorizedFoods[randomCategory].length === 0
          ) {
            categories.splice(categories.indexOf(randomCategory), 1);
            continue;
          }

          const randomFood =
            categorizedFoods[randomCategory][
              Math.floor(
                Math.random() * categorizedFoods[randomCategory].length
              )
            ];
          const foodCaloriesPerGram = randomFood.Calories / 100;
          const foodGrams = Math.min(
            100,
            Math.max(10, Math.floor(remainingCalories / foodCaloriesPerGram))
          );
          const foodCalories = foodGrams * foodCaloriesPerGram;

          if (
            foodCalories <= remainingCalories + 50 &&
            !usedFoods.has(randomFood.FoodID)
          ) {
            const foodItem = {
              ...randomFood,
              Grams: foodGrams,
              Calories: foodCalories,
              Protein: (foodGrams * randomFood.Protein) / 100,
              Sugar: (foodGrams * randomFood.Sugar) / 100,
              Fats: (foodGrams * randomFood.Fats) / 100,
            };

            mealPlan[mealType].push(foodItem);
            usedFoods.add(randomFood.FoodID);
            remainingCalories -= foodCalories;
            mealPlan.totalFoodCalories += foodCalories;
          }
        }
      });

      return mealPlan;
    };

    const mealPlan = generateMealPlan(caloriesPerDay);
    console.log(mealPlan);
    res.status(200).json(mealPlan);
  } catch (error) {
    console.error("Error generating meal plan:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/saveMealPlan", async (req, res) => {
  const { userName, mealPlan } = req.body;
  try {
    await queryDatabase(
      "REPLACE INTO SavedMealPlans (UserName, MealPlan) VALUES (?, ?)",
      [userName, JSON.stringify(mealPlan)]
    );
    res.status(200).json({ message: "Meal plan saved" });
  } catch (error) {
    console.error("Error saving meal plan:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/getSavedMealPlan/:userName", async (req, res) => {
  const { userName } = req.params;
  try {
    const results = await queryDatabase(
      "SELECT MealPlan FROM SavedMealPlans WHERE UserName = ?",
      [userName]
    );
    if (results.length === 0) {
      return res.status(404).json({ message: "No saved meal plan found" });
    }
    const savedMealPlan = JSON.parse(results[0].MealPlan);
    res.status(200).json(savedMealPlan);
  } catch (error) {
    console.error("Error fetching saved meal plan:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
