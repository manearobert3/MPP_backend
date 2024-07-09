const express = require("express");
const cors = require("cors");
const foodsRouter = require("./routes/foods.js");
const reviewsRouter = require("./routes/reviews.js");
const loginRouter = require("./routes/login.js");
const usersRouter = require("./routes/user.js"); // Added users router
const trackerRouter = require("./routes/tracker.js"); // Added users router
const mealPlan = require("./routes/mealPlan.js"); // Added users router

const https = require("https");
const http = require("http");
const WebSocket = require("ws");
const { faker } = require("@faker-js/faker");
const mysql = require("mysql2");
const app = express();
const fs = require("fs");
const path = require("path");
const port = 5000;

var con = mysql.createConnection({
  host: process.env.MYSQL_HOST.toString(),
  user: process.env.MYSQL_USER.toString(),
  password: "",
  database: "mppmysql",
  port: 21289,
});

app.use(cors());
app.use(express.json());
const wss = new WebSocket.Server({ port: 4000 });
const httpsServer = https.createServer(
  {
    key: fs.readFileSync(path.join(__dirname, "cert", "key.pem")),
    cert: fs.readFileSync(path.join(__dirname, "cert", "cert.pem")),
  },
  app
);
httpsServer.listen(port);
// Mount routers
app.use("/api/foods", foodsRouter);
app.use("/api/reviews", reviewsRouter);
app.use("/api/login", loginRouter);
app.use("/api/users", usersRouter);
app.use("/api/tracker", trackerRouter);
app.use("/api/mealPlan", mealPlan);

// Function to check internet connection
app.get("/api/check-internet", (req, res) => {
  // const options = {
  //   hostname: "www.google.com",
  //   port: 80,
  //   path: "/",
  //   method: "GET",
  // };

  // const reqHttp = http.request(options, (resp) => {
  //   res.json({ isOnline: true });
  // });

  // reqHttp.on("error", (err) => {
  //   res.json({ isOnline: false });
  // });
  res.json({ isOnline: true });
  // reqHttp.end();
});

const foodTypes = [
  "Fruits",
  "Sweets",
  "Vegetables",
  "Protein",
  "Dairy",
  "Carbohydrates",
  "Beverages",
];

const generateFoodData = () => {
  const randomFoodType =
    foodTypes[Math.floor(Math.random() * foodTypes.length)];
  return {
    FoodName: faker.lorem.word(),
    Calories: faker.number.int({ min: 50, max: 1000 }),
    Fats: faker.number.float({ min: 0, max: 50, multipleOf: 0.1 }),
    Protein: faker.number.float({ min: 0, max: 100, multipleOf: 0.1 }),
    Sugar: faker.number.float({ min: 0, max: 100, multipleOf: 0.1 }),
    FoodType: randomFoodType,
    FoodDescription: faker.lorem.sentence(),
  };
};

let wsClient;
const generateMultipleFoodData = async () => {
  for (let i = 0; i < 1; i++) {
    const newFood = generateFoodData();
    const query = `
      INSERT INTO Food (FoodName, Calories, Fats, Protein,Sugar, FoodType, FoodDescription)  -- Include FoodType column
      VALUES (?, ?, ?, ?, ?,?,?)
    `;
    queryDatabase(
      query,
      [
        newFood.FoodName,
        newFood.Calories,
        newFood.Fats,
        newFood.Protein,
        newFood.Sugar,
        newFood.FoodType,
        newFood.FoodDescription,
      ],
      (error, results) => {
        if (error) {
          console.error("Error inserting food data:", error);
        } else {
          console.log("Food data inserted successfully:", results);
        }
      }
    );
  }
  if (wsClient) {
    wsClient.send("refresh");
  }
};

let intervalId;
intervalId = setInterval(generateMultipleFoodData, 50000);

wss.on("connection", function connection(ws) {
  console.log("A new client connected");

  ws.on("error", console.error);

  ws.on("message", function message(data) {
    console.log("received: %s", data);
  });
  wsClient = ws;

  ws.send("something");
});
function queryDatabase2(query, params) {
  return new Promise((resolve, reject) => {
    con.query(query, params, (error, results) => {
      if (error) {
        return reject(error);
      }
      resolve(results);
    });
  });
}

const generateFoodReview = (foodId) => {
  return {
    FoodID: foodId,
    ReviewText: faker.lorem.sentence(),
    Rating: faker.number.int({ min: 1, max: 5 }),
    AuthorName: faker.person.fullName(),
  };
};
function queryDatabase(query, params, callback) {
  con.query(query, params, (error, results) => {
    if (error) {
      return callback(error, null);
    }
    callback(null, results);
  });
}

const generateMultipleFoodReviewAndFoodData = async () => {
  const totalFoods = 5;
  const reviewsPerFood = 5;

  for (let i = 0; i < totalFoods; i++) {
    // Generate food data
    const newFood = generateFoodData();

    // Insert food into database and get the last inserted ID
    const foodInsertQuery = `
        INSERT INTO Food (FoodName, Calories, Fats, FoodDescription)
        VALUES (?, ?, ?, ?)
      `;

    try {
      const results = await queryDatabase2(foodInsertQuery, [
        newFood.FoodName,
        newFood.Calories,
        newFood.Fats,
        newFood.FoodDescription,
      ]);
      const foodId = results.insertId;
      console.log("ID:", foodId);
      console.log("Food data inserted successfully:", results);

      // Generate and insert food reviews
      for (let j = 0; j < reviewsPerFood; j++) {
        const newReview = generateFoodReview(foodId);
        const reviewInsertQuery = `
            INSERT INTO FoodReview (FoodID, ReviewText, Rating, AuthorName)
            VALUES (?, ?, ?, ?)
          `;
        await queryDatabase2(reviewInsertQuery, [
          newReview.FoodID,
          newReview.ReviewText,
          newReview.Rating,
          newReview.AuthorName,
        ]);
      }
    } catch (error) {
      console.error("Error inserting food data:", error);
    }
  }
};
app.post("/api/generate-food-data", async (req, res) => {
  try {
    // Call the function to generate food data
    await generateMultipleFoodReviewAndFoodData();

    // Respond with a success message
    res
      .status(200)
      .json({ message: "Food data generation completed successfully" });
  } catch (error) {
    // If an error occurs, respond with an error message
    console.error("Error generating food data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
// In routes/tracker.js
app.get("/lastDays/:userName/:days", async (req, res) => {
  const { userName, days } = req.params;

  try {
    const query = `
          SELECT date, calories, waterCups, protein, sugar, fats, steps
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

app.get("/:userName/:date", async (req, res) => {
  const { userName, date } = req.params;

  try {
    const query = `
          SELECT Calories, WaterCups, Protein, Sugar, Fats
          FROM DailyTracker
          WHERE userName = ? AND date = ?
      `;
    const results = await queryDatabase(query, [userName, date]);

    if (results.length > 0) {
      res.status(200).json(results[0]);
    } else {
      res.status(404).json({ message: "No data found for this date" });
    }
  } catch (error) {
    console.error("Error fetching tracker data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/food-foodreviews", async (req, res) => {
  try {
    const pageNumber = parseInt(req.query.pageNumber) || 1;
    const pageSize = 5;
    const offset = (pageNumber - 1) * pageSize;

    const query = `
        SELECT 
          f.FoodID, 
          f.FoodName, 
          fr.ReviewText, 
          fr.Rating, 
          fr.AuthorName, 
          fr.ReviewID
        FROM Food f
        LEFT JOIN FoodReview fr ON f.FoodID = fr.FoodID
        ORDER BY f.FoodID
        LIMIT ?, ?;
      `;

    const results = await queryDatabase2(query, [offset, pageSize]);
    res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching food reviews:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Endpoint to get paginated food reviews by food ID
app.get("/api/food-foodreviews/:id", async (req, res) => {
  try {
    const foodID = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const pageSize = 5;
    const offset = (page - 1) * pageSize;

    const query = `
        SELECT 
          f.FoodID, 
          f.FoodName, 
          fr.ReviewText, 
          fr.Rating, 
          fr.AuthorName, 
          fr.ReviewID
        FROM FoodReview fr
        INNER JOIN Food f ON fr.FoodID = f.FoodID
        WHERE f.FoodID = ?
        ORDER BY fr.ReviewID
        LIMIT ?, ?;
      `;

    const results = await queryDatabase2(query, [foodID, offset, pageSize]);
    res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching food reviews by ID:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = app;
