import express from "express";
import { connectDB, closeDB } from "../db.js";
import sql from "mssql/msnodesqlv8.js";

const router = express.Router();

// Define routes related to other entity
router.get("/", async (req, res) => {
  try {
    await connectDB();
    const query = "SELECT * FROM FoodReview";
    const result = await sql.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error("Error fetching review reviews:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET a single review by ID
router.get("/:id", async (req, res) => {
  const foodID = req.params.id;
  try {
    await connectDB();
    const query = `SELECT * FROM FoodReview WHERE ReviewID = ${foodID}`;
    const result = await sql.query(query);

    if (result.recordset.length === 0) {
      return res.status(404).send("Review not found");
    }

    res.send(result.recordset[0]);
  } catch (error) {
    console.error("Error fetching review:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE a review by ID
router.delete("/:id", async (req, res) => {
  const foodID = parseInt(req.params.id);
  const query = `DELETE FROM FoodReview WHERE ReviewID = ${foodID}`;

  try {
    await connectDB();
    const result = await sql.query(query);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).send("Review not found");
    }

    console.log("Review deleted successfully");
    res.status(200).send("Review deleted successfully");
  } catch (error) {
    console.error("Error deleting review:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST a new review
router.post("/", async (req, res) => {
  const newFoodReview = req.body;
  console.log(newFoodReview);
  const query = `
    INSERT INTO FoodReview (FoodID, ReviewText, Rating,AuthorName)
    VALUES (${newFoodReview.FoodID}, '${newFoodReview.ReviewText}', ${newFoodReview.Rating},'${newFoodReview.AuthorName}')
  `;

  try {
    await connectDB();
    await sql.query(query);

    console.log("New food item created:", newFoodReview);
    res.status(201).send("New review item created successfully");
  } catch (error) {
    console.error("Error creating new review:", error.message);
    res.status(500).send(error.message);
  } finally {
  }
});

// PUT/update a review by ID
router.put("/:id", async (req, res) => {
  const foodID = parseInt(req.params.id);
  const updatedFoodReview = req.body;
  console.log(updatedFoodReview);
  const query = `
      UPDATE FoodReview
      SET FoodID = ${updatedFoodReview.FoodID},
      ReviewText = '${updatedFoodReview.ReviewText}',
      Rating = ${updatedFoodReview.Rating},
      AuthorName = '${updatedFoodReview.AuthorName}'
      WHERE ReviewID = ${foodID}
    `;

  try {
    await connectDB();
    await sql.query(query);
    console.log("Review updated successfully");
    res.status(200).send("Review updated successfully");
  } catch (error) {
    console.error("Error updating review:", error.message);
    res.status(500).send("Internal Server Error");
  }
});

export default router;
