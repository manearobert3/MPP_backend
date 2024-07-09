const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const { authenticateToken, authorizeRole } = require("../authMiddleware");

var con = mysql.createConnection({
  host: "mysql-95d2427-manea-7c11.j.aivencloud.com",
  user: "avnadmin",
  password: "AVNS_iL4I36bVDbDl4yr9DIZ",
  database: "mppmysql",
  port: 21289,
});

const router = express.Router();
router.use(bodyParser.json()); // Middleware to parse JSON bodies

// Function to get all reviews
function getAllReviews(callback) {
  const query = "SELECT * FROM FoodReview";
  con.query(query, (error, results) => {
    if (error) {
      return callback(error, null);
    }
    callback(null, results);
  });
}

// Function to get review by ID
function getReviewById(reviewID, callback) {
  const query = "SELECT * FROM FoodReview WHERE ReviewID = ?";
  con.query(query, [reviewID], (error, results) => {
    if (error) {
      return callback(error, null);
    }
    callback(null, results);
  });
}

// Function to delete review by ID
function deleteReviewById(reviewID, callback) {
  const query = "DELETE FROM FoodReview WHERE ReviewID = ?";
  con.query(query, [reviewID], (error, results) => {
    if (error) {
      return callback(error, null);
    }
    callback(null, results);
  });
}

// Function to create a new review
function createReview(newReview, callback) {
  const query = `
    INSERT INTO FoodReview (FoodID, ReviewText, Rating, AuthorName)
    VALUES (?, ?, ?, ?)
  `;
  console.log(newReview.FoodID);
  console.log(newReview.ReviewText);
  console.log(newReview.Rating);
  con.query(
    query,
    [
      newReview.FoodID,
      newReview.ReviewText,
      newReview.Rating,
      newReview.AuthorName,
    ],
    (error, results) => {
      if (error) {
        return callback(error, null);
      }
      callback(null, results);
    }
  );
}

// Function to update a review by ID
function updateReviewById(reviewID, updatedReview, callback) {
  const query = `
    UPDATE FoodReview
    SET FoodID = ?,
        ReviewText = ?,
        Rating = ?,
        AuthorName = ?
    WHERE ReviewID = ?
  `;
  con.query(
    query,
    [
      updatedReview.FoodID,
      updatedReview.ReviewText,
      updatedReview.Rating,
      updatedReview.AuthorName,
      reviewID,
    ],
    (error, results) => {
      if (error) {
        return callback(error, null);
      }
      callback(null, results);
    }
  );
}

// API endpoint to get all reviews
router.get("/", (req, res) => {
  getAllReviews((error, results) => {
    if (error) {
      console.error("Error fetching reviews:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
    res.status(200).json(results);
  });
});

// API endpoint to get a single review by ID
router.get("/:id", (req, res) => {
  const reviewID = req.params.id;
  getReviewById(reviewID, (error, results) => {
    if (error) {
      console.error("Error fetching review:", error.message);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    if (results.length === 0) {
      return res.status(404).send("Review not found");
    }

    res.status(200).json(results[0]);
  });
});

// API endpoint to delete a review by ID
router.delete(
  "/:id",
  authenticateToken,
  authorizeRole("admin", "manager"),
  (req, res) => {
    const reviewID = parseInt(req.params.id);
    deleteReviewById(reviewID, (error, results) => {
      if (error) {
        console.error("Error deleting review:", error.message);
        return res.status(500).json({ error: "Internal Server Error" });
      }

      if (results.affectedRows === 0) {
        return res.status(404).send("Review not found");
      }

      console.log("Review deleted successfully");
      res.status(200).send("Review deleted successfully");
    });
  }
);

// API endpoint to create a new review
router.post(
  "/",
  authenticateToken,
  authorizeRole("admin", "manager"),
  (req, res) => {
    const newReview = req.body;
    console.log(newReview.FoodID);
    console.log(newReview.ReviewText);
    console.log(newReview.Rating);
    if (
      newReview.Rating < 0 ||
      newReview.Rating > 10 ||
      typeof newReview.AuthorName !== "string" ||
      typeof newReview.FoodID !== "number"
    ) {
      return res.status(400).send("Invalid review data");
    }

    createReview(newReview, (error, results) => {
      if (error) {
        console.error("Error creating new review:", error.message);
        return res.status(500).json({ error: "Internal Server Error" });
      }

      console.log("New review item created:", newReview);
      res.status(201).send("New review item created successfully");
    });
  }
);

// API endpoint to update a review by ID
router.put(
  "/:id",
  authenticateToken,
  authorizeRole("admin", "manager"),
  (req, res) => {
    const reviewID = parseInt(req.params.id);
    const updatedReview = req.body;

    if (
      updatedReview.Rating < 0 ||
      updatedReview.Rating > 10 ||
      typeof updatedReview.AuthorName !== "string" ||
      typeof updatedReview.FoodID !== "number"
    ) {
      return res.status(400).send("Invalid review data");
    }

    updateReviewById(reviewID, updatedReview, (error, results) => {
      if (error) {
        console.error("Error updating review:", error.message);
        return res.status(500).send("Internal Server Error");
      }

      if (results.affectedRows === 0) {
        return res.status(404).send("Review not found");
      }

      console.log("Review updated successfully");
      res.status(200).send("Review updated successfully");
    });
  }
);

module.exports = router;
