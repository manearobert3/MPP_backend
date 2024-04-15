import request from "supertest";
import app from "./index.js";
import sql from "mssql/msnodesqlv8.js";

const config = {
  connectionString:
    "Driver={ODBC Driver 17 for SQL Server};Server=DESKTOP-6NQQME4\\SQLEXPRESS;Database=MPPDB;Trusted_Connection=yes;",
  driver: "MPPDB",
};
beforeAll(async () => {
  // Connect to the actual database before running the tests
  await sql.connect(config);
});

afterAll(async () => {
  // Close the database connection after running all tests
  await sql.close();
});
// TESTS FOR FOOD
describe("GET /api/foods", () => {
  it("should return all foods", async () => {
    const response = await request(app).get("/api/foods");
    expect(response.status).toBe(200);
    // Add more specific assertions based on your expected data format
  });

  it("should return 404 Not Found if no foods are available", async () => {
    // Simulate a scenario where there are no foods in the database
    // Ensure the database is empty or temporarily disable it for this test
    // Send request and assert 404 response
  });
});

describe("GET /api/foods/:id", () => {
  it("should return a specific food by ID", async () => {
    const foodId = 1;
    const response = await request(app).get(`/api/foods/${foodId}`);
    expect(response.status).toBe(200);
  });

  it("should return 404 Not Found if the food ID does not exist", async () => {});
});

describe("POST /api/foods", () => {
  it("should create a new food", async () => {
    const newFood = {
      FoodID: 100,
      FoodName: "Morcovi",
      Calories: 123,
      Fats: 1234,
      FoodDescription: "Orange Vegetable, helps with vision.",
    };
    const response = await request(app).post("/api/foods").send(newFood);
    expect(response.status).toBe(201);
  });

  it("should return 400 Bad Request if the food data is invalid", async () => {
    const invalidFood = {};
    const response = await request(app).post("/api/foods").send(invalidFood);
    expect(response.status).toBe(400);
  });
});
describe("DELETE /api/foods/:id", () => {
  it("should delete a food by ID", async () => {
    // Assuming there's a valid food ID
    const foodIdToDelete = 9;
    const response = await request(app).delete(`/api/foods/${foodIdToDelete}`);
    expect(response.status).toBe(200);
  });
});

/// TESTS FOR REVIEW

describe("GET /api/reviews", () => {
  it("should return all food reviews", async () => {
    const result = await sql.query`SELECT * FROM FoodReview`;
    const response = await request(app).get("/api/reviews");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(result.recordset);
  });

  it("should return 404 Not Found if the requested API path does not exist", async () => {
    const response = await request(app).get("/api/food-reviews");

    expect(response.status).toBe(404);
  });
});

describe("GET /api/reviews/:id", () => {
  it("should return a specific review by ID", async () => {
    // Assuming there's a valid review ID in your database
    const reviewId = 1;
    const response = await request(app).get(`/api/reviews/${reviewId}`);
    expect(response.status).toBe(200);
  });

  it("should return 404 Not Found if the review ID does not exist", async () => {
    // Send request with an invalid review ID and assert 404 response
    const invalidReviewId = 9999;
    const response = await request(app).get(`/api/reviews/${invalidReviewId}`);
    expect(response.status).toBe(404);
  });
});

describe("POST /api/reviews", () => {
  it("should create a new review", async () => {
    const newReview = {
      FoodID: 1,
      ReviewText: "Great food!",
      Rating: 5,
      AuthorName: "John Doe",
    };
    const response = await request(app).post("/api/reviews").send(newReview);
    expect(response.status).toBe(201);
  });

  it("should return 500 Bad Request if the review data is invalid", async () => {
    const invalidReview = {
      // Invalid review data
    };
    const response = await request(app)
      .post("/api/reviews")
      .send(invalidReview);
    expect(response.status).toBe(500);
  });
});

describe("DELETE /api/reviews/:id", () => {
  it("should delete a review by ID", async () => {
    // Assuming there's a valid review ID
    const reviewIdToDelete = 1;
    const response = await request(app).delete(
      `/api/reviews/${reviewIdToDelete}`
    );
    expect(response.status).toBe(200);
  });

  it("should return 404 Not Found if the review ID does not exist", async () => {
    // Send request with an invalid review ID and assert 404 response
    const invalidReviewId = 9999;
    const response = await request(app).delete(
      `/api/reviews/${invalidReviewId}`
    );
    expect(response.status).toBe(404);
  });
});
