const { MongoClient } = require("mongodb");

// MongoDB connection URI, from env variable or default local
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/ProyectoGraphQL";
let db;

// Function to start and return the database connection
async function startDb() {
  // Return existing connection if already initialized
  if (db) return db;

  // Connect to MongoDB
  const client = await MongoClient.connect(MONGODB_URI, {});
  db = client.db();
  console.log("MongoDB connected successfully.");

  // Create indexes for faster queries
  await Promise.all([
    db.collection("professionals").createIndex({ services: 1 }),
    db.collection("vacancies").createIndex({ serviceId: 1, createdAt: -1 }),
    db.collection("vacancies").createIndex({ employerId: 1 }),
    db.collection("applications").createIndex({ professionalId: 1, appliedAt: 1 }),
    db.collection("professionals").createIndex({ canton: 1 }),
    db.collection("vacancies").createIndex({ location: 1 }),
  ]);

  // Create unique index for applications (prevent duplicates: same professional + vacancy)
  try {
    await db.collection("applications").createIndex(
      { professionalId: 1, vacancyId: 1 },
      { unique: true, name: "UQ_application_unique" }
    );
  } catch (e) {
    // Ignore duplicate index creation error, throw other errors
    if (e.code !== 11000) {
      console.error("Error creating unique index:", e);
      throw e;
    }
  }

  console.log("Database indexes ensured.");
  return db;
}

// Export connection function
module.exports = { startDb };
