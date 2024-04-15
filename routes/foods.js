import express from "express";
import { connectDB, closeDB } from "../db.js";
import sql from "mssql/msnodesqlv8.js";

const router = express.Router();

// GET all foods
router.get("/", async (req, res) => {
  try {
    await connectDB();
    const query = "SELECT * FROM Food";
    const result = await sql.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error("Error fetching foods:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET a single food by ID
router.get("/:id", async (req, res) => {
  const foodID = req.params.id;
  try {
    await connectDB();
    const query = `SELECT * FROM Food WHERE FoodID = ${foodID}`;
    const result = await sql.query(query);

    if (result.recordset.length === 0) {
      return res.status(404).send("Food not found");
    }

    res.send(result.recordset[0]);
  } catch (error) {
    console.error("Error fetching food:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE a food by ID
router.delete("/:id", async (req, res) => {
  const foodID = parseInt(req.params.id);
  const query = `DELETE FROM Food WHERE FoodID = ${foodID}`;

  try {
    await connectDB();
    const result = await sql.query(query);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).send("Food not found");
    }

    console.log("Food deleted successfully");
    res.status(200).send("Food deleted successfully");
  } catch (error) {
    console.error("Error deleting food:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST a new food
router.post("/", async (req, res) => {
  const newFood = req.body;

  if (
    newFood.Calories <= 0 ||
    newFood.Fats <= 0 ||
    typeof newFood.FoodName !== "string"
  ) {
    return res.status(400).send("Invalid food data");
  }

  const query = `
  INSERT INTO Food (FoodName, Calories, Fats, FoodDescription)
  VALUES ('${newFood.FoodName}', ${newFood.Calories}, ${newFood.Fats}, '${newFood.FoodDescription}')
`;

  try {
    await connectDB();
    await sql.query(query);

    console.log("New food item created:", newFood);
    res.status(201).send("New food item created successfully");
  } catch (error) {
    console.error("Error creating new food:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PUT/update a food by ID
router.put("/:id", async (req, res) => {
  const foodID = parseInt(req.params.id);
  const updatedFood = req.body;

  if (
    updatedFood.Calories <= 0 ||
    updatedFood.Fats <= 0 ||
    typeof updatedFood.FoodName !== "string"
  ) {
    return res.status(400).send("Invalid food data");
  }

  const query = `
    UPDATE Food
    SET FoodName = '${updatedFood.FoodName}',
        Calories = ${updatedFood.Calories},
        Fats = ${updatedFood.Fats},
        FoodDescription = '${updatedFood.FoodDescription}'
    WHERE FoodID = ${foodID}
  `;

  try {
    await connectDB();
    await sql.query(query);
    console.log("Food updated successfully");
    res.status(200).send("Food updated successfully");
  } catch (error) {
    console.error("Error updating food:", error.message);
    res.status(500).send("Internal Server Error");
  }
});

export default router;
