//const express = require("express");
import express from "express";

const app = express();
const port = 5050;
import cors from "cors";
// npx nodemon index.js
app.use(cors());
app.use(express.json());
//app.listen(5000, () => console.log("app is running"));
let Food = [
  {
    id: 1,
    name: "Fruit",
    calories: 95,
    fats: 0.3,
    description: "A crunchy and juicy fruit.",
  },
  {
    id: 2,
    name: "Chicken Breast",
    calories: 165,
    fats: 3.6,
    description: "Lean protein source.",
  },
  {
    id: 3,
    name: "Broccoli",
    calories: 55,
    fats: 0.6,
    description: "Nutrient-rich green vegetable.",
  },
  {
    id: 4,
    name: "Salmon",
    calories: 206,
    fats: 13.4,
    description: "A fatty fish high in omega-3 fatty acids.",
  },
  {
    id: 5,
    name: "Brown Rice",
    calories: 216,
    fats: 1.8,
    description: "Whole grain carbohydrate source.",
  },
  {
    id: 6,
    name: "Spinach",
    calories: 23,
    fats: 0.4,
    description: "Leafy green vegetable rich in iron.",
  },
  {
    id: 7,
    name: "Greek Yogurt",
    calories: 59,
    fats: 3.3,
    description: "High-protein dairy product.",
  },
  {
    id: 8,
    name: "Oatmeal",
    calories: 68,
    fats: 1.4,
    description: "Whole grain breakfast cereal.",
  },
  {
    id: 9,
    name: "Avocado",
    calories: 160,
    fats: 14.7,
    description: "Creamy and nutritious fruit.",
  },
];

app.get("/", (req, res) => {
  res.send("hHATZ");
});

app.get("/api/foods", (req, res) => {
  res.send(Food);
});

app.get("/api/foods/:id", (req, res) => {
  let food = Food.find((f) => f.id === parseInt(req.params.id));
  if (!food) return res.status(400).send("Product not found");
  res.send(food);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

app.post("/", (req, res) => {
  res.send("Got a POST request");
});

// Function to convert Inputs to Food type
function convertInputsToFood(inputs, id) {
  return {
    id: id,
    name: inputs.name,
    calories: inputs.calories,
    fats: inputs.fats,
    description: inputs.description,
  };
}
app.put("/api/foods/:id", (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updatedFood = req.body;
    // const foodToUpdate = convertInputsToFood(updatedFood, id); // Convert Inputs to Food type

    let index = Food.findIndex((f) => f.id === id);
    if (index === -1) return res.status(404).send("Food not found");
    console.error("food received:", index);
    console.error("index received:", updatedFood);

    Food[index] = { ...Food[index], ...updatedFood };
    console.error("food received:", index);

    console.error("Food updated successfully", index);

    //Food[index] = updatedFood;
    res.status(200).send("Food updated successfully");
  } catch (error) {
    console.error("Error updating food:", error.response.data);
    res.status(500).send("Internal Server Error");
  }
  console.log("Request Body:", req.body);
});

app.put("/user", (req, res) => {
  res.send("Got a PUT request at /user");
});
app.delete("/user", (req, res) => {
  res.send("Got a DELETE request at /user");
});
