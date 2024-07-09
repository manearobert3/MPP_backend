const sql = require("mssql/msnodesqlv8.js");

const config = {
  connectionString:
    "Driver={ODBC Driver 17 for SQL Server};Server=DESKTOP-6NQQME4\\SQLEXPRESS;Database=MPPDB;Trusted_Connection=yes;",
  driver: "MPPDB",
};

const connectDB = async () => {
  try {
    await sql.connect(config);
    console.log("Database connection successful!");
  } catch (error) {
    console.error("Error connecting to the database:", error);
  }
};

const closeDB = async () => {
  try {
    await sql.close();
    console.log("Database connection closed.");
  } catch (error) {
    console.error("Error closing database connection:", error);
  }
};

module.exports = {
  connectDB,
  closeDB,
  sql,
};
