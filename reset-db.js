// Archivo: reset-db.js
require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;

(async () => {
  const client = await MongoClient.connect(MONGODB_URI, {});
  const db = client.db();
  console.log("[reset-db] Connected to", MONGODB_URI);

  // Drop todas las colecciones antes de insertar
  const collections = ['services', 'employers', 'professionals', 'vacancies', 'applications'];
  for (const name of collections) {
    try { 
      await db.collection(name).drop(); 
      console.log(`[reset-db] Dropped: ${name}`); 
    } catch (e) {}
  }

  // ====== Services ======
  const services = await db.collection('services').insertMany([
    { name: 'IT' },
    { name: 'Electrician' },
    { name: 'Accounting' },
    { name: 'Administration' },
    { name: 'Marketing' },
    { name: 'HR' },
    { name: 'Construction' },
    { name: 'Design' }
  ]);

  const itId  = services.insertedIds['0'];
  const accId = services.insertedIds['2'];
  const mktId = services.insertedIds['4'];

  // ====== Employers ======
  const employers = await db.collection('employers').insertMany([
    { companyName: 'ACME Inc.', taxId: '3-101-123456' },
    { companyName: 'Tech Solutions S.A.', taxId: '3-102-654321' },
    { companyName: 'Construcciones del Norte', taxId: '3-103-789456' }
  ]);

  const acmeId   = employers.insertedIds['0'];
  const techId   = employers.insertedIds['1'];
  const constId  = employers.insertedIds['2'];

  // ====== Professionals ======
  const professionals = await db.collection('professionals').insertMany([
    {
      firstName: 'Maria',
      lastName: 'Gomez',
      email: 'maria@mail.com',
      gender: 'F',
      taxId: '6-0111-0222',
      services: [itId, accId],
      education: [
        { degree: 'Ingeniería en TI', institution: 'UTN', year: 2022 },
        { degree: 'Técnico en Contabilidad', institution: 'CUP', year: 2018 }
      ],
      workExperience: [
        { jobTitle: 'Junior Developer', company: 'ACME Inc.', startDate: '2022-01-01', endDate: 'Presente', description: 'Apps web y BD.' },
        { jobTitle: 'Asistente Contable', company: 'Contadores del Puerto S.A.', startDate: '2018-06-01', endDate: '2021-12-31', description: 'Conciliaciones bancarias.' }
      ]
    },
    {
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@mail.com',
      gender: 'M',
      taxId: '1-0333-0444',
      services: [accId],
      education: [
        { degree: 'Lic. en Contaduría', institution: 'UNA', year: 2015 }
      ],
      workExperience: []
    },
    {
      firstName: 'Ana',
      lastName: 'Rodriguez',
      email: 'ana.rodriguez@mail.com',
      gender: 'F',
      taxId: '2-0555-0666',
      services: [mktId],
      education: [
        { degree: 'Lic. en Mercadeo', institution: 'UCR', year: 2019 }
      ],
      workExperience: [
        { jobTitle: 'Community Manager', company: 'Tech Solutions S.A.', startDate: '2019-01-01', endDate: '2021-12-31', description: 'Gestión de redes sociales.' }
      ]
    },
    {
      firstName: 'Carlos',
      lastName: 'Lopez',
      email: 'carlos.lopez@mail.com',
      gender: 'M',
      taxId: '4-0777-0888',
      services: [itId],
      education: [
        { degree: 'Bachiller en Ing. de Software', institution: 'TEC', year: 2020 }
      ],
      workExperience: [
        { jobTitle: 'Backend Developer', company: 'Tech Solutions S.A.', startDate: '2021-02-01', endDate: 'Presente', description: 'APIs y microservicios.' }
      ]
    }
  ]);

  const mariaId  = professionals.insertedIds['0'];
  const johnId   = professionals.insertedIds['1'];
  const anaId    = professionals.insertedIds['2'];
  const carlosId = professionals.insertedIds['3'];

  // ====== Vacancies ======
  const now = new Date();
  const vacancies = await db.collection('vacancies').insertMany([
    { title: 'Junior Developer', serviceId: itId, employerId: acmeId, location: 'Puntarenas', createdAt: now },
    { title: 'QA Junior', serviceId: itId, employerId: acmeId, location: 'Miramar', createdAt: now },
    { title: 'Contador General', serviceId: accId, employerId: techId, location: 'San José', createdAt: now },
    { title: 'Community Manager', serviceId: mktId, employerId: techId, location: 'Alajuela', createdAt: now },
    { title: 'Ingeniero Civil Junior', serviceId: services.insertedIds['6'], employerId: constId, location: 'Heredia', createdAt: now }
  ]);

  // ====== Log IDs ======
  console.log("\n[reset-db] Done. IDs de prueba:");
  console.log(" professionalId_Maria =", mariaId.toString());
  console.log(" professionalId_John  =", johnId.toString());
  console.log(" professionalId_Ana   =", anaId.toString());
  console.log(" professionalId_Carlos=", carlosId.toString());
  console.log(" employerId_ACME      =", acmeId.toString());
  console.log(" employerId_Tech      =", techId.toString());
  console.log(" employerId_Construct =", constId.toString());
  console.log(" vacancyId_Dev        =", vacancies.insertedIds['0'].toString());

  await client.close();
})();
