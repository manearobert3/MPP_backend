// Import necessary dependencies and the router
import request from "supertest";
import app from "./index.js"; // Assuming your Express app is exported as 'app'
import sql from "mssql/msnodesqlv8.js";
// Mock the database functions

// Mock mssql/msnodesqlv8
jest.mock("mssql/msnodesqlv8", () => ({
  query: jest.fn(),
}));

describe("GET /api/food-reviews", () => {
  it("should return all food reviews", async () => {
    const mockResult = {
      recordset: [
        {
          ReviewID: 1,
          FoodID: 1,
          ReviewText: "Great food!",
          Rating: 5,
          AuthorName: "John Doe",
        },
        {
          ReviewID: 2,
          FoodID: 2,
          ReviewText: "Average food.",
          Rating: 3,
          AuthorName: "Jane Smith",
        },
      ],
    };

    sql.query.mockResolvedValueOnce(mockResult);

    const response = await request(app).get("/api/reviews");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockResult.recordset);
  });

  it("should return 500 Internal Server Error if there is an error", async () => {
    sql.query.mockRejectedValueOnce(new Error("Database error"));

    const response = await request(app).get("/api/reviews");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Internal Server Error" });
  });
});

// Write similar test suites for other endpoints
