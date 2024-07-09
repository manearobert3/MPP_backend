const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const { authenticateToken, authorizeRole } = require("../authMiddleware");

var con = mysql.createConnection({
  host: process.env.MYSQL_HOST.toString(),
  user: process.env.MYSQL_USER.toString(),
  password: "",
  database: "mppmysql",
  port: 21289,
});
const router = express.Router();
router.use(bodyParser.json()); // Middleware to parse JSON bodies

function getAllFoods(callback) {
  const query = "SELECT * FROM Food";
  con.query(query, (error, results) => {
    if (error) {
      return callback(error, null);
    }
    callback(null, results);
  });
}

// Function to get food by ID
function getFoodById(foodID, callback) {
  const query = "SELECT * FROM Food WHERE FoodID = ?";
  con.query(query, [foodID], (error, results) => {
    if (error) {
      return callback(error, null);
    }
    callback(null, results);
  });
}

// Function to delete food by ID
function deleteFoodById(foodID, callback) {
  const query = "DELETE FROM Food WHERE FoodID = ?";
  con.query(query, [foodID], (error, results) => {
    if (error) {
      return callback(error, null);
    }
    callback(null, results);
  });
}
function deleteReviewsByFoodId(foodID, callback) {
  const query = `
    DELETE FROM FoodReview
    WHERE FoodID = ?
  `;
  con.query(query, [foodID], (error, results) => {
    if (error) {
      return callback(error, null);
    }
    callback(null, results);
  });
}
// Function to create a new food
function createFood(newFood, callback) {
  const query = `
    INSERT INTO Food (FoodName, Calories, Fats, FoodDescription, FoodType, Protein, Sugar)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    newFood.FoodName,
    newFood.Calories,
    newFood.Fats,
    newFood.FoodDescription,
    newFood.FoodType,
    newFood.Protein,
    newFood.Sugar,
  ];
  con.query(query, params, (error, results) => {
    if (error) {
      return callback(error, null);
    }
    callback(null, results);
  });
}

// Function to update a food by ID
function updateFoodById(foodID, updatedFood, callback) {
  const query = `
      UPDATE Food
      SET FoodName = ?,
          Calories = ?,
          Fats = ?,
          FoodDescription = ?,
          FoodType = ?,
          Protein = ?,
          Sugar = ?
      WHERE FoodID = ?
    `;
  con.query(
    query,
    [
      updatedFood.FoodName,
      updatedFood.Calories,
      updatedFood.Fats,
      updatedFood.FoodDescription,
      updatedFood.FoodType,
      updatedFood.Protein,
      updatedFood.Sugar,
      foodID,
    ],
    (error, results) => {
      if (error) {
        return callback(error, null);
      }
      callback(null, results);
    }
  );
}

// API endpoint to get all foods
router.get("/", (req, res) => {
  getAllFoods((error, results) => {
    if (error) {
      console.error("Error fetching foods:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
    res.status(200).json(results);
  });
});

// API endpoint to get a single food item by ID
router.get("/:id", (req, res) => {
  const foodID = req.params.id;
  getFoodById(foodID, (error, results) => {
    if (error) {
      console.error("Error fetching food:", error.message);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    if (results.length === 0) {
      return res.status(404).send("Food not found");
    }

    res.status(200).json(results[0]);
  });
});

// API endpoint to delete a food item by ID
router.delete(
  "/:id",
  authenticateToken,
  authorizeRole("admin", "manager"),
  (req, res) => {
    const foodID = parseInt(req.params.id);
    con.beginTransaction((err) => {
      if (err) {
        console.error("Error starting transaction:", err.message);
        return res.status(500).json({ error: "Internal Server Error" });
      }
      deleteReviewsByFoodId(foodID, (error, results) => {
        if (error) {
          return con.rollback(() => {
            console.error("Error deleting reviews:", error.message);
            res.status(500).json({ error: "Internal Server Error" });
          });
        }
        deleteFoodById(foodID, (error, results) => {
          if (error) {
            return con.rollback(() => {
              console.error("Error deleting food:", error.message);
              res.status(500).json({ error: "Internal Server Error" });
            });
          }

          if (results.affectedRows === 0) {
            return con.rollback(() => {
              res.status(404).send("Food not found");
            });
          }

          // Commit the transaction
          con.commit((err) => {
            if (err) {
              return con.rollback(() => {
                console.error("Error committing transaction:", err.message);
                res.status(500).json({ error: "Internal Server Error" });
              });
            }

            console.log("Food and associated reviews deleted successfully");
            res
              .status(200)
              .send("Food and associated reviews deleted successfully");
          });
        });
      });
    });
  }
);
// API endpoint to create a new food item
router.post(
  "/",
  authenticateToken,
  authorizeRole("manager", "admin"),
  (req, res) => {
    const newFood = req.body;

    if (
      newFood.Calories <= 0 ||
      newFood.Fats <= 0 ||
      typeof newFood.FoodName !== "string"
    ) {
      return res.status(400).send("Invalid food data");
    }

    createFood(newFood, (error, results) => {
      if (error) {
        console.error("Error creating new food:", error.message);
        return res.status(500).json({ error: "Internal Server Error" });
      }

      console.log("New food item created:", newFood);
      res.status(201).send("New food item created successfully");
    });
  }
);

// API endpoint to update a food item by ID
router.put(
  "/:id",
  authenticateToken,
  authorizeRole("admin", "manager"),
  (req, res) => {
    const foodID = parseInt(req.params.id);
    const updatedFood = req.body;

    if (
      updatedFood.Calories < 0 ||
      updatedFood.Fats < 0 ||
      typeof updatedFood.FoodName !== "string"
    ) {
      return res.status(400).send("Invalid food data");
    }

    updateFoodById(foodID, updatedFood, (error, results) => {
      if (error) {
        console.error("Error updating food:", error.message);
        return res.status(500).send("Internal Server Error");
      }

      if (results.affectedRows === 0) {
        return res.status(404).send("Food not found");
      }

      console.log("Food updated successfully");
      res.status(200).send("Food updated successfully");
    });
  }
);

module.exports = router;
