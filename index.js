import express from "express";
import cors from "cors";
import foodsRouter from "./routes/foods.js";
import reviewsRouter from "./routes/reviews.js";
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
  for (let i = 0; i < 1; i++) {
    const newFood = generateFoodData();
    const query = `
    INSERT INTO Food (FoodName, Calories, Fats, FoodDescription)
    VALUES ('${newFood.FoodName}', ${newFood.Calories}, ${newFood.Fats}, '${newFood.FoodDescription}')
  `;
    await sql.connect(config);
    await sql.query(query);
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
  // server.on("close", () => {
  //   ws.close();
  // });
});

export default app;
