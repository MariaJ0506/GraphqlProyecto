const { MongoClient, ObjectId } = require('mongodb');
const { Faker, es, en } = require('@faker-js/faker');
const faker = new Faker({ locale: [es, en] });
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function seedDatabase() {
    try {
        await client.connect();
        const db = client.db(process.env.DB_NAME);
        console.log("Connected to database.");

        // Drop existing collections to start fresh
        const collections = ['services', 'employers', 'professionals', 'vacancies', 'applications'];
        for (const name of collections) {
            try {
                await db.collection(name).drop();
                console.log(`[seed] Dropped collection: ${name}`);
            } catch (e) {
                // Ignore if collection does not exist
            }
        }

        // Insert services
        const serviceNames = ['IT', 'Marketing', 'Accounting', 'Construction', 'Graphic Design', 'Human Resources', 'Sales', 'Legal', 'Health', 'Education'];
        const services = serviceNames.map(name => ({
            _id: new ObjectId(),
            name
        }));
        await db.collection('services').insertMany(services);
        console.log(`Inserted ${services.length} services.`);

        // Insert employers (juridical or physical persons)
        const employers = [];
        for (let i = 0; i < 50; i++) {
            const isJuridical = faker.helpers.arrayElement([true, false]);
            if (isJuridical) {
                employers.push({
                    _id: new ObjectId(),
                    companyName: faker.company.name(),
                    taxId: faker.string.numeric(10),
                    employerType: "juridica"
                });
            } else {
                employers.push({
                    _id: new ObjectId(),
                    firstName: faker.person.firstName(),
                    lastName: faker.person.lastName(),
                    taxId: faker.string.numeric(10),
                    employerType: "fisica"
                });
            }
        }
        await db.collection('employers').insertMany(employers);
        console.log(`Inserted ${employers.length} employers.`);

        // Insert professionals with random education and work experience
        const professionals = [];
        const genders = ['Female', 'Male'];
        for (let i = 0; i < 150; i++) {
            const gender = faker.helpers.arrayElement(genders);
            const firstName = faker.person.firstName(gender === 'Female' ? 'female' : 'male');
            const lastName = faker.person.lastName(gender === 'Female' ? 'female' : 'male');
            professionals.push({
                _id: new ObjectId(),
                firstName,
                lastName,
                email: faker.internet.email({ firstName, lastName }),
                gender,
                taxId: faker.string.numeric(10),
                services: faker.helpers.arrayElements(services, { min: 1, max: 3 }).map(s => s._id),
                education: Array.from({ length: faker.helpers.arrayElement([0, 1, 2]) }, () => ({
                    degree: faker.person.jobTitle(),
                    institution: faker.company.name(),
                    year: faker.date.past({ years: 20 }).getFullYear()
                })),
                workExperience: Array.from({ length: faker.helpers.arrayElement([1, 2, 3]) }, () => ({
                    jobTitle: faker.person.jobTitle(),
                    company: faker.company.name(),
                    startDate: faker.date.past({ years: 10 }).toISOString(),
                    endDate: faker.date.past({ years: 1 }).toISOString(),
                    description: faker.lorem.paragraph()
                }))
            });
        }
        await db.collection('professionals').insertMany(professionals);
        console.log(`Inserted ${professionals.length} professionals.`);

        // Insert vacancies (linked to employers and services)
        const vacancies = [];
        for (let i = 0; i < 100; i++) {
            const randomEmployer = faker.helpers.arrayElement(employers);
            const randomService = faker.helpers.arrayElement(services);
            vacancies.push({
                _id: new ObjectId(),
                title: faker.person.jobTitle(),
                serviceId: randomService._id,
                employerId: randomEmployer._id,
                location: faker.location.city(),
                createdAt: faker.date.recent({ days: 365 })
            });
        }
        await db.collection('vacancies').insertMany(vacancies);
        console.log(`Inserted ${vacancies.length} vacancies.`);

        // Insert applications (linking professionals and vacancies, avoiding duplicates)
        const applications = [];
        const uniqueApplications = new Set();
        while (applications.length < 500) {
            const professionalId = faker.helpers.arrayElement(professionals)._id;
            const vacancyId = faker.helpers.arrayElement(vacancies)._id;
            const key = `${professionalId.toString()}-${vacancyId.toString()}`;
            if (!uniqueApplications.has(key)) {
                uniqueApplications.add(key);
                applications.push({
                    professionalId,
                    vacancyId,
                    appliedAt: faker.date.recent({ days: 30 })
                });
            }
        }
        await db.collection('applications').insertMany(applications);
        console.log(`Inserted ${applications.length} applications.`);

        console.log("✅ Database seeding completed successfully!");

    } catch (error) {
        console.error("❌ Error while seeding database:", error);
    } finally {
        await client.close();
    }
}

seedDatabase();
