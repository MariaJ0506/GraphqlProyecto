// Archivo: seed.js

const { MongoClient, ObjectId } = require('mongodb');
const { faker } = require('@faker-js/faker/locale/es'); // Importa faker en español
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function seedDatabase() {
    try {
        await client.connect();
        const db = client.db(process.env.DB_NAME);
        console.log("Conectado a la base de datos.");

        // Eliminar datos existentes
        console.log("Eliminando colecciones existentes...");
        const collections = ['services', 'employers', 'professionals', 'vacancies', 'applications'];
        for (const name of collections) {
            try {
                await db.collection(name).drop();
                console.log(`[seed] Eliminada la colección: ${name}`);
            } catch (e) {
                // Ignorar el error si la colección no existe
            }
        }

        // 1. Crear 10 servicios
        const serviceNames = ['IT', 'Marketing', 'Contabilidad', 'Construcción', 'Diseño Gráfico', 'Recursos Humanos', 'Ventas', 'Legal', 'Salud', 'Educación'];
        const services = serviceNames.map(name => ({
            _id: new ObjectId(),
            name
        }));
        await db.collection('services').insertMany(services);
        console.log(`Insertados ${services.length} servicios.`);

        // 2. Crear 50 empleadores (mezcla de físicos y jurídicos)
        const employers = [];
        for (let i = 0; i < 50; i++) {
            const isJuridico = faker.datatype.boolean(); // Genera true o false
            if (isJuridico) {
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
        console.log(`Insertados ${employers.length} empleadores.`);

        // 3. Crear 150 profesionales
        const professionals = [];
        const genders = ['Femenino', 'Masculino'];
        for (let i = 0; i < 150; i++) {
            // Se selecciona un género aleatorio de la lista genders
            const gender = faker.helpers.arrayElement(genders);
            const firstName = faker.person.firstName(gender === 'Femenino' ? 'female' : 'male');
            const lastName = faker.person.lastName(gender === 'Femenino' ? 'female' : 'male');
            
            professionals.push({
                _id: new ObjectId(),
                firstName: firstName,
                lastName: lastName,
                email: faker.internet.email({firstName: firstName, lastName: lastName}),
                gender: gender,
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
        console.log(`Insertados ${professionals.length} profesionales.`);

        // 4. Crear 100 vacantes
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
        console.log(`Insertadas ${vacancies.length} vacantes.`);

        // 5. Crear 500 postulaciones aleatorias únicas
        console.log(`Creando postulaciones...`);
        const applications = [];
        const uniqueApplications = new Set();
        const maxApplicationsToCreate = 500;
        let applicationsCount = 0;

        while (applicationsCount < maxApplicationsToCreate) {
            const professionalId = faker.helpers.arrayElement(professionals)._id;
            const vacancyId = faker.helpers.arrayElement(vacancies)._id;
            
            const key = `${professionalId.toString()}-${vacancyId.toString()}`;
            
            if (!uniqueApplications.has(key)) {
                uniqueApplications.add(key);
                applications.push({
                    professionalId: professionalId,
                    vacancyId: vacancyId,
                    appliedAt: faker.date.recent({ days: 30 })
                });
                applicationsCount++;
            }
        }
        await db.collection('applications').insertMany(applications);
        console.log(`Insertadas ${applications.length} postulaciones.`);

        console.log("¡Siembra de datos completa y exitosa! 🌱");

    } catch (error) {
        console.error("Error al poblar la base de datos:", error);
    } finally {
        await client.close();
    }
}

seedDatabase();