const express = require("express");
const cors = require("cors");
const foodsRouter = require("./routes/foods.js");
const reviewsRouter = require("./routes/reviews.js");
const loginRouter = require("./routes/login.js");
const usersRouter = require("./routes/user.js");
const http = require("http");
const WebSocket = require("ws");
const { faker } = require("@faker-js/faker");
const mysql = require("mysql");
const app = express();
const port = 5000;

var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "mppMysql",
});

app.use(cors());
app.use(express.json());
const wss = new WebSocket.Server({ port: 4000 });

// Mount routers
app.use("/api/foods", foodsRouter);
app.use("/api/reviews", reviewsRouter);
app.use("/api/login", loginRouter);
app.use("/api/users", usersRouter);

//Function to check internet connection
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

// app.get("/api/check-internet", (req, res) => {
//   res.json({ isOnline: true });
// });

const generateFoodData = () => {
  return {
    FoodName: faker.lorem.word(5),
    Calories: faker.number.int({ min: 50, max: 1000 }),
    Fats: faker.number.float({ min: 0, max: 50, multipleOf: 1 }),
    FoodDescription: faker.lorem.sentence(),
  };
};
let wsClient;
const generateMultipleFoodReviewAndFoodData = async () => {
  const totalFoods = 1000;
  const reviewsPerFood = 500;

  for (let i = 0; i < totalFoods; i++) {
    // Generate food data
    const newFood = generateFoodData();

    // Insert food into database
    const foodInsertQuery = `
      INSERT INTO Food (FoodName, Calories, Fats, FoodDescription)
      VALUES (@FoodName, @Calories, @Fats, @FoodDescription);
      SELECT CAST(SCOPE_IDENTITY() AS INT) AS FoodID;
    `;

    const pool = await sql.connect(config);
    const foodRequest = pool.request();
    foodRequest.input("FoodName", sql.VarChar, newFood.FoodName);
    foodRequest.input("Calories", sql.Int, newFood.Calories);
    foodRequest.input("Fats", sql.Float, newFood.Fats);
    foodRequest.input("FoodDescription", sql.VarChar, newFood.FoodDescription);

    const result = await foodRequest.query(foodInsertQuery);
    const foodId = result.recordset[0].FoodID;
    console.log("Food ID:", foodId);

    // Generate and insert food reviews
    for (let j = 0; j < reviewsPerFood; j++) {
      const newReview = generateFoodReview(foodId);
      const reviewInsertQuery = `
        INSERT INTO FoodReview (FoodID, ReviewText, Rating, AuthorName)
        VALUES (@FoodID, @ReviewText, @Rating, @AuthorName);
      `;
      const reviewRequest = pool.request();
      reviewRequest.input("FoodID", sql.Int, newReview.FoodID);
      reviewRequest.input("ReviewText", sql.VarChar, newReview.ReviewText);
      reviewRequest.input("Rating", sql.Int, newReview.Rating);
      reviewRequest.input("AuthorName", sql.VarChar, newReview.AuthorName);

      await reviewRequest.query(reviewInsertQuery);
    }
  }
};
const generateMultipleFoodData = async () => {
  for (let i = 0; i < 1; i++) {
    const newFood = generateFoodData();
    const query = `
      INSERT INTO Food (FoodName, Calories, Fats, FoodDescription)
      VALUES (?, ?, ?, ?)
    `;
    queryDatabase(
      query,
      [
        newFood.FoodName,
        newFood.Calories,
        newFood.Fats,
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
intervalId = setInterval(generateMultipleFoodData, 5000);
wss.on("connection", function connection(ws) {
  console.log("A new client connected");

  ws.on("error", console.error);

  ws.on("message", function message(data) {
    console.log("received: %s", data);
  });
  wsClient = ws;

  ws.send("something");
});

//   ws.send("something");
//   // server.on("close", () => {
//   //   ws.close();
//   // });
// });

const generateFoodReview = (foodId) => {
  return {
    FoodID: foodId,
    ReviewText: faker.lorem.sentence(),
    Rating: faker.number.int({ min: 1, max: 5 }),
    AuthorName: faker.person.fullName(),
  };
};

// Function to query the database
function queryDatabase(query, params, callback) {
  con.query(query, params, (error, results) => {
    if (error) {
      return callback(error, null);
    }
    callback(null, results);
  });
}

// Function to get paginated food reviews
function getPaginatedFoodReviews(pageNumber, pageSize, callback) {
  const offset = (pageNumber - 1) * pageSize;
  const query = `
  WITH PaginatedFoods AS (
    SELECT 
      f.FoodID, 
      f.FoodName, 
      fr.ReviewText, 
      fr.Rating, 
      fr.AuthorName, 
      fr.ReviewID,
      ROW_NUMBER() OVER (ORDER BY f.FoodID) AS RowNum 
    FROM Food f
    LEFT JOIN FoodReview fr ON f.FoodID = fr.FoodID
  )
  SELECT * FROM PaginatedFoods
  ORDER BY RowNum
  OFFSET ${offset} ROWS
  FETCH NEXT ${pageSize} ROWS ONLY;
  `;
  queryDatabase(query, [offset, pageSize], callback);
}

// API endpoint to get paginated food reviews
app.get("/api/food-foodreviews", (req, res) => {
  const pageNumber = parseInt(req.query.pageNumber) || 1;
  const pageSize = 5;

  getPaginatedFoodReviews(pageNumber, pageSize, (error, results) => {
    if (error) {
      console.error("Error fetching food reviews:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
    res.status(200).json(results);
  });
});

// Function to get food reviews by food ID
function getFoodReviewsByFoodID(foodID, pageNumber, pageSize, callback) {
  const offset = (pageNumber - 1) * pageSize;
  const query = `
  WITH PaginatedFoods AS (
    SELECT 
      f.FoodID, 
      f.FoodName, 
      fr.ReviewText, 
      fr.Rating, 
      fr.AuthorName, 
      fr.ReviewID,
      ROW_NUMBER() OVER (ORDER BY fr.ReviewID) AS RowNum -- Use ReviewID for pagination
    FROM FoodReview fr
    INNER JOIN Food f ON fr.FoodID = f.FoodID
    WHERE f.FoodID = ${foodID} -- Filter by the specified foodID
  )
  SELECT * FROM PaginatedFoods
  ORDER BY RowNum
  OFFSET ${offset} ROWS
  FETCH NEXT ${pageSize} ROWS ONLY;
  `;
  queryDatabase(query, [foodID, offset, pageSize], callback);
}

// API endpoint to get food reviews by food ID
app.get("/api/food-foodreviews/:id", (req, res) => {
  const foodID = req.params.id;
  const pageNumber = parseInt(req.query.pageNumber) || 1;
  const pageSize = 5;

  getFoodReviewsByFoodID(foodID, pageNumber, pageSize, (error, results) => {
    if (error) {
      console.error("Error fetching food reviews by ID:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
    res.status(200).json(results);
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

module.exports = app;
