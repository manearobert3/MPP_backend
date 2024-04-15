import request from "supertest";
import app from "./index.js"; // Assuming your Express app is exported as 'app'
import sql from "mssql/msnodesqlv8.js";
import { connectDB, closeDB } from "./db.js";
// Mock mssql/msnodesqlv8
jest.mock("mssql/msnodesqlv8", () => ({
  query: jest.fn(),
}));

describe("Food API Endpoints", () => {
  // Before all tests, mock the database connection
  beforeAll(async () => {
    await connectDB();
  });

  // After all tests, close the database connection
  afterAll(async () => {
    await closeDB();
  });

  describe("GET /api/foods", () => {
    it("should return all food items", async () => {
      const mockResult = {
        recordset: [
          { FoodID: 1, FoodName: "Pizza", Calories: 300, Fats: 12 },
          { FoodID: 2, FoodName: "Salad", Calories: 150, Fats: 5 },
        ],
      };

      sql.query.mockResolvedValueOnce(mockResult);

      const response = await request(app).get("/api/foods");

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult.recordset);
    });

    it("should return 500 Internal Server Error if there is an error", async () => {
      sql.query.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app).get("/api/foods");

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: "Internal Server Error" });
    });
  });

  describe("GET /api/foods/:id", () => {
    it("should return a single food item by ID", async () => {
      const mockFoodID = 1;
      const mockFood = {
        FoodID: mockFoodID,
        FoodName: "Pizza",
        Calories: 300,
        Fats: 12,
      };

      const mockResult = {
        recordset: [mockFood],
      };

      sql.query.mockResolvedValueOnce(mockResult);

      const response = await request(app).get(`/api/foods/${mockFoodID}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockFood);
    });

    it("should return 500 Internal Server Error if the food item does not exist", async () => {
      const mockFoodID = 999; // Assuming a non-existent ID
      const response = await request(app).get(`/api/foods/${mockFoodID}`);

      expect(response.status).toBe(500);
      // expect(response.text).toBe("Food not found");
    });

    it("should return 500 Internal Server Error if there is an error", async () => {
      const mockFoodID = 1;
      sql.query.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app).get(`/api/foods/${mockFoodID}`);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: "Internal Server Error" });
    });
  });

  // Write similar tests for other endpoints: POST, DELETE, PUT
});
