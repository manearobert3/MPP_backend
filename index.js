//const express = require("express");
import express from "express";
import http from "http";
import { faker } from "@faker-js/faker";
import { WebSocketServer } from "ws";
// CJS
const app = express();
const port = 5050;

//const WebSocket = require("ws");
import cors from "cors";
// npx nodemon index.js
app.use(cors());
app.use(express.json());

const generateFoodData = () => {
  return {
    id: faker.string.uuid(),
    name: faker.lorem.word(),
    calories: faker.number.int({ min: 50, max: 1000 }),
    fats: faker.number.float({ min: 0, max: 50, multipleOf: 1 }),
    description: faker.lorem.sentence(),
  };
};
const generateMultipleFoodData = () => {
  for (let i = 0; i < 2; i++) {
    const food = generateFoodData();
    const newId = Food.length > 0 ? Food[Food.length - 1].id + 1 : 1;
    food.id = newId;
    Food.push(food);
  }
  if (wsClient) {
    wsClient.send("refresh");
  }
};
let intervalId;

const wss = new WebSocketServer({ port: 3000 });
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
let wsClient;
wss.on("connection", function connection(ws) {
  console.log("A new client connected");

  ws.on("error", console.error);

  ws.on("message", function message(data) {
    console.log("received: %s", data);
  });
  wsClient = ws;

  ws.send("something");
});
intervalId = setInterval(generateMultipleFoodData, 5000);
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
  res.send("Buna ziua!");
});

app.delete("/api/foods/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const index = Food.findIndex((f) => f.id === id);

  if (index === -1) {
    return res.status(404).send("Food not found");
  }

  // Remove the food item from the array
  Food.splice(index, 1);

  console.log("Food deleted successfully");

  res.status(200).send("Food deleted successfully");
});

app.post("/api/foods", (req, res) => {
  const newFood = req.body;
  if (
    updatedFood.calories <= 0 ||
    updatedFood.fats <= 0 ||
    typeof updatedFood.name !== "string"
  ) {
    return res.status(400).send("Invalid food data");
  }
  // Generate a new ID for the food item
  const newId = Food.length > 0 ? Food[Food.length - 1].id + 1 : 1;
  newFood.id = newId;

  // Add the new food item to the array
  Food.push(newFood);

  console.log("New food item created:", newFood);

  res.status(201).send("New food item created successfully");
});

app.get("/api/check-internet", (req, res) => {
  const options = {
    hostname: "www.google.com",
    port: 80,
    path: "/",
    method: "GET",
  };

  const reqHttp = http.request(options, (resp) => {
    res.json({ isOnline: true });
  });

  reqHttp.on("error", (err) => {
    res.json({ isOnline: false });
  });

  reqHttp.end();
});

// app.get("/api/foods", (req, res) => {
//   res.send(Food);
// });

app.get("/api/foods", (req, res) => {
  // for (let i = 0; i < 5; i++) {
  //   const food = generateFoodData();
  //   const newId = Food.length > 0 ? Food[Food.length - 1].id + 1 : 1;
  //   food.id = newId;
  //   Food.push(food);
  // }
  res.send(Food);
});

app.get("/api/foods/:id", (req, res) => {
  let food = Food.find((f) => f.id === parseInt(req.params.id));
  if (!food) return res.status(404).send("Product not found");
  res.send(food);
});

app.post("/", (req, res) => {
  res.send("Got a POST request");
});

app.put("/api/foods/:id", (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updatedFood = req.body;
    if (
      updatedFood.calories <= 0 ||
      updatedFood.fats <= 0 ||
      typeof updatedFood.name !== "string"
    ) {
      return res.status(400).send("Invalid food data");
    }
    let index = Food.findIndex((f) => f.id === id);
    if (index === -1) return res.status(404).send("Food not found");

    Food[index] = { ...Food[index], ...updatedFood };

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
