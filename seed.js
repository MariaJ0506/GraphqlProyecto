require("dotenv").config();
const { startDb } = require("./src/db/connection");
const { ObjectId } = require("mongodb");

(async () => {
  const db = await startDb();
  console.log("[seed] Connected");

  const collections = ["services", "employers", "professionals", "vacancies", "applications"];
  for (const name of collections) {
    try { await db.collection(name).drop(); console.log(`[seed] Dropped ${name}`); } catch (e) {}
  }

  // Services
  const services = await db.collection("services").insertMany([
    { name: "IT" }, { name: "Electrician" }, { name: "Accounting" }, { name: "Administration" }
  ]);
  const itId = services.insertedIds["0"];
  const accId = services.insertedIds["2"];

  // Employer
  const employer = await db.collection("employers").insertOne({
    companyName: "ACME Inc.",
    taxId: "3-101-123456"
  });

  // Professionals
  const pro1 = await db.collection("professionals").insertOne({
    firstName: "Maria",
    lastName: "Gomez",
    email: "maria@mail.com",
    gender: "F",
    taxId: "6-0111-0222",
    services: [itId, accId],
    education: [
      { degree: "Ingeniería en Tecnologías de Información", institution: "Universidad Técnica Nacional", year: 2022 },
      { degree: "Técnico en Contabilidad", institution: "Colegio Universitario de Puntarenas", year: 2018 }
    ],
    workExperience: [
      { jobTitle: "Junior Developer", company: "ACME Inc.", startDate: "2022-01-01", endDate: "Presente", description: "Desarrollo web" },
      { jobTitle: "Asistente Contable", company: "Contadores del Puerto S.A.", startDate: "2018-06-01", endDate: "2021-12-31", description: "Conciliaciones bancarias" }
    ]
  });

  const pro2 = await db.collection("professionals").insertOne({
    firstName: "John",
    lastName: "Smith",
    email: "john.smith@mail.com",
    gender: "M",
    taxId: "1-0333-0444",
    services: [accId],
    education: [],
    workExperience: []
  });

  const now = new Date();
  const vacs = await db.collection("vacancies").insertMany([
    { title: "Junior Developer", serviceId: itId, employerId: employer.insertedId, location: "Puntarenas", createdAt: now },
    { title: "QA Junior", serviceId: itId, employerId: employer.insertedId, location: "Miramar", createdAt: now }
  ]);

  console.log("[seed] Done!");
})();
