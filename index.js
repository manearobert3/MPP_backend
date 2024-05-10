import express from "express";
import cors from "cors";
import foodsRouter from "./routes/foods.js";
import reviewsRouter from "./routes/reviews.js";
import loginRouter from "./routes/login.js";

import http from "http";
import { WebSocketServer } from "ws";
import { faker } from "@faker-js/faker";
import sql from "mssql/msnodesqlv8.js";

const app = express();
const port = 5050;
const config = {
  connectionString:
    "Driver={ODBC Driver 17 for SQL Server};Server=DESKTOP-6NQQME4\\SQLEXPRESS;Database=MPPDB;Trusted_Connection=yes;",
  driver: "MPPDB",
};
app.use(cors());
app.use(express.json());
const wss = new WebSocketServer({ port: 3000 });
// Mount routers
app.use("/api/foods", foodsRouter);
app.use("/api/reviews", reviewsRouter);
app.use("/api/login", loginRouter);
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

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

const generateFoodData = () => {
  return {
    FoodName: faker.lorem.word(),
    Calories: faker.number.int({ min: 50, max: 1000 }),
    Fats: faker.number.float({ min: 0, max: 50, multipleOf: 1 }),
    FoodDescription: faker.lorem.sentence(),
  };
};
let wsClient;
const generateMultipleFoodData = async () => {
  // for (let i = 0; i < 1; i++) {
  //   const newFood = generateFoodData();
  //   const query = `
  //   INSERT INTO Food (FoodName, Calories, Fats, FoodDescription)
  //   VALUES ('${newFood.FoodName}', ${newFood.Calories}, ${newFood.Fats}, '${newFood.FoodDescription}')
  // `;
  //   await sql.connect(config);
  //   await sql.query(query);
  // }
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
  // server.on("close", () => {
  //   ws.close();
  // });
});

const generateFoodReview = (foodId) => {
  return {
    FoodID: foodId,
    ReviewText: faker.lorem.sentence(),
    Rating: faker.number.int({ min: 1, max: 5 }),
    AuthorName: faker.person.fullName(),
  };
};

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

    const foodRequest = new sql.Request();
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
      const reviewRequest = new sql.Request();
      reviewRequest.input("FoodID", sql.Int, newReview.FoodID);
      reviewRequest.input("ReviewText", sql.VarChar, newReview.ReviewText);
      reviewRequest.input("Rating", sql.Int, newReview.Rating);
      reviewRequest.input("AuthorName", sql.VarChar, newReview.AuthorName);

      console.log("Review Insert Query:", reviewInsertQuery); // Log the SQL query
      await reviewRequest.query(reviewInsertQuery);
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

app.get("/api/food-foodreviews", async (req, res) => {
  try {
    const pool = await sql.connect(config);
    // Call the function to generate food data
    const pageNumber = parseInt(req.query.pageNumber) || 1;
    const pageSize = 5;
    const offset = (pageNumber - 1) * pageSize;

    // Query to fetch paginated foods with their reviews using a join
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

    const result = await pool.request().query(query);
    const foodsWithReviews = result.recordset;

    // Process the results

    // Respond with a success message
    res.status(200);
    res.json(result.recordset);
  } catch (error) {
    // If an error occurs, respond with an error message
    console.error("Error generating food data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/food-foodreviews/:id", async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const foodID = req.params.id;
    const pageNumber = parseInt(req.query.pageNumber) || 1;
    const pageSize = 5;
    const offset = (pageNumber - 1) * pageSize;

    // Query to fetch paginated foods with their reviews using a join
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

    const result = await pool.request().query(query);
    const foodsWithReviews = result.recordset;

    // Process the results

    // Respond with a success message
    res.status(200);
    res.json(result.recordset);
  } catch (error) {
    // If an error occurs, respond with an error message
    console.error("Error generating food data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default app;
