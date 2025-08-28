
// This script will:
//  - (optionally) drop existing collections (set DROP_FIRST=1 to enable)
//  - insert services, an employer, two professionals, vacancies (with createdAt)
//  - insert 3 applications by the same professional in the current month
//  - print IDs so you can test GraphQL queries/mutations quickly

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/Project';
const DROP_FIRST = process.env.DROP_FIRST === '1'; // set to 1 to drop data before seeding

(async () => {
  const client = await MongoClient.connect(MONGODB_URI, {});
  const db = client.db();
  console.log("[seed] Connected to", MONGODB_URI);

  if (DROP_FIRST) {
    for (const name of ['services','employers','professionals','vacancies','applications']) {
      try { await db.collection(name).drop(); console.log(`[seed] Dropped: ${name}`); } catch (e) {}
    }
  }

  // Services
  const services = await db.collection('services').insertMany([
    { name: 'IT' },
    { name: 'Electrician' },
    { name: 'Accounting' },
    { name: 'Administration' }
  ]);
  const itId = services.insertedIds['0'];
  const accId = services.insertedIds['2'];

  // Employer
  const employer = await db.collection('employers').insertOne({
    companyName: 'ACME Inc.',
    taxId: '3-101-123456'
  });

  // Professionals
  const pro1 = await db.collection('professionals').insertOne({
    firstName: 'Maria', lastName: 'Gomez', email: 'maria@mail.com', gender: 'F',
    services: [itId, accId]
  });
  const pro2 = await db.collection('professionals').insertOne({
    firstName: 'John', lastName: 'Smith', email: 'john.smith@mail.com', gender: 'M',
    services: [accId]
  });

  // Vacancies (createdAt required by resolvers)
  const now = new Date();
  const vacs = await db.collection('vacancies').insertMany([
    { title: 'Junior Developer', serviceId: itId, employerId: employer.insertedId, location: 'Puntarenas', createdAt: now },
    { title: 'Electric Technician', serviceId: services.insertedIds['1'], employerId: employer.insertedId, location: 'Esparza', createdAt: now },
    { title: 'QA Junior', serviceId: itId, employerId: employer.insertedId, location: 'Miramar', createdAt: now }
  ]);

  // Applications (3 this month for pro1)
  await db.collection('applications').insertMany([
    { professionalId: pro1.insertedId, vacancyId: vacs.insertedIds['0'], appliedAt: new Date(), status: 'APPLIED' },
    { professionalId: pro1.insertedId, vacancyId: vacs.insertedIds['1'], appliedAt: new Date(), status: 'APPLIED' },
    { professionalId: pro1.insertedId, vacancyId: vacs.insertedIds['2'], appliedAt: new Date(), status: 'APPLIED' }
  ]);

  console.log("\n[seed] Done. Copy these IDs to test GraphQL:");
  console.log(" serviceId_IT       =", itId.toString());
  console.log(" employerId         =", employer.insertedId.toString());
  console.log(" professionalId_1   =", pro1.insertedId.toString());
  console.log(" professionalId_2   =", pro2.insertedId.toString());
  console.log(" vacancyId_1        =", vacs.insertedIds['0'].toString());
  console.log(" vacancyId_2        =", vacs.insertedIds['1'].toString());
  console.log(" vacancyId_3        =", vacs.insertedIds['2'].toString());
  console.log("\nTry mutation `apply` 3x with professionalId_1 + vacancyId_1..3; the 4th in the same month should fail.");
  await client.close();
})().catch(err => { console.error(err); process.exit(1); });
