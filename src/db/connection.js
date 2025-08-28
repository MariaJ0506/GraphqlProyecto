//connection.js
const { MongoClient } = require("mongodb");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/ProyectoGraphQL";
let db;

async function startDb() {
  if (db) return db;

  const client = await MongoClient.connect(MONGODB_URI, {});
  db = client.db();
  console.log("MongoDB connected successfully.");

  await Promise.all([
    db.collection("professionals").createIndex({ services: 1 }),
    db.collection("vacancies").createIndex({ serviceId: 1, createdAt: -1 }),
    db.collection("vacancies").createIndex({ employerId: 1 }),
    db.collection("applications").createIndex({ professionalId: 1, appliedAt: 1 }),
    db.collection("professionals").createIndex({ canton: 1 }),
    db.collection("vacancies").createIndex({ location: 1 }),
    db.collection("applications").createIndex(
      { professionalId: 1, vacancyId: 1 },
      { unique: true, name: "UQ_application_unique" }
    )
  ]);

  console.log("Database indexes ensured.");
  return db;
}

module.exports = { startDb };
