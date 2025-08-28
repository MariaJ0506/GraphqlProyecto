require('dotenv').config({ path: 'conector.env' });
const { ApolloServer, gql } = require('apollo-server');
const { ApolloServerPluginLandingPageLocalDefault } = require('apollo-server-core');
const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/Proyecto';
const PORT = process.env.PORT || 4000;

let db;
async function startDb() {
  const client = await MongoClient.connect(MONGODB_URI, {});
  db = client.db();
  await Promise.all([
    db.collection('professionals').createIndex({ services: 1 }),
    db.collection('vacancies').createIndex({ serviceId: 1, createdAt: -1 }),
    db.collection('vacancies').createIndex({ employerId: 1 }), // apoya resumen de empleadores
    db.collection('applications').createIndex({ professionalId: 1, appliedAt: 1 }),
    db.collection('professionals').createIndex({ canton: 1 }),
    db.collection('vacancies').createIndex({ location: 1 }),
    db.collection('applications').createIndex(
      { professionalId: 1, vacancyId: 1 },
      { unique: true, name: 'UQ_application_unique' } // evita aplicaciones duplicadas
    )
  ]);
  console.log('MongoDB connected');
}

/* -----------------------
        Impresiones 
   ----------------------- */

const typeDefs = gql`
  type Service { id: ID!, name: String! }

  type Oferente {
    id: ID!
    nombre: String!
    apellido: String
    correo_electronico: String
    genero: String
    servicios: [Service!]!
  }

  type Vacante {
    id: ID!
    titulo: String!
    area: Service!
    empleador: String!
    ubicacion: String
    fecha: String!
  }

  type EmpleadorResumen {
    id: ID!
    nombre: String!
    cedula: String
    puestosOfertados: Int!
  }

  type AreaStat { area: String!, cantidad: Int!, porcentaje: Float! }
  type GeneroStat { genero: String!, cantidad: Int! }

  type Query {
    # (1)
    resumenEmpleador(id: ID!): EmpleadorResumen
    # (2)
    obtenerOferentes: [Oferente!]!
    # (3)
    inventarioVacantes: [Vacante!]!
    # (4)
    postulantesPorArea(serviceId: ID!): [String!]!
    # (5)
    profesionalesPorAreaStats: [AreaStat!]!
    # (6)
    profesionalesPorGenero: [GeneroStat!]!
  }

  type Mutation {
    # Regla: máx 3 postulaciones/mes por profesional
    aplicar(professionalId: ID!, vacancyId: ID!): Boolean!
  }

  # ------- NUEVOS INPUTS (registro) -------
  input EmpleadorInput {
    tipo: String          # "Fisica" | "Juridica" (opcional)
    firstName: String
    lastName: String
    companyName: String
    taxId: String
  }

  input OferenteInput {
    nombre: String!       # firstName
    apellido: String      # lastName
    correo_electronico: String
    genero: String
    services: [ID!]!      # IDs de services
  }

  # ------- EXTENSIÓN DE MUTATION (registro) -------
  extend type Mutation {
    crearServicio(name: String!): ID!
    registrarEmpleador(data: EmpleadorInput!): EmpleadorResumen!  # 👈 ahora retorna objeto
    registrarOferente(data: OferenteInput!): ID!
    asignarServiciosAOferente(oferenteId: ID!, services: [ID!]!): Boolean!
  }
`;

/* -----------------------
   Contenido de resolvers
   ----------------------- */

const resolvers = {
  Query: {
    // Resumen empleador (uno).
    async resumenEmpleador(_, { id }) {
      const _id = new ObjectId(id);
      const emp = await db.collection('employers').findOne({ _id });
      if (!emp) return null;
      const count = await db.collection('vacancies').countDocuments({ employerId: _id });
      const nombre = emp.companyName ?? [emp.firstName, emp.lastName].filter(Boolean).join(' ');
      return { id: String(emp._id), nombre, cedula: emp.taxId ?? null, puestosOfertados: count };
    },

    // Oferentes + servicios.
    async obtenerOferentes() {
      const pros = await db.collection('professionals').find().toArray();
      const servs = await db.collection('services').find().toArray();
      const mapServ = new Map(servs.map(s => [String(s._id), s]));
      return pros.map(p => ({
        id: String(p._id),
        nombre: p.firstName ?? '',
        apellido: p.lastName ?? '',
        correo_electronico: p.email ?? null,
        genero: p.gender ?? null,
        servicios: (p.services || []).map(oid => {
          const s = mapServ.get(String(oid));
          return { id: String(oid), name: s?.name || '' };
        })
      }));
    },

    // Inventario de vacantes.
    async inventarioVacantes() {
      const rows = await db.collection('vacancies').aggregate([
        { $lookup: { from: 'services',  localField: 'serviceId',  foreignField: '_id', as: 's' } },
        { $lookup: { from: 'employers', localField: 'employerId', foreignField: '_id', as: 'e' } },
        { $set: { area: { $first: '$s' }, emp: { $first: '$e' } } },
        { $sort: { createdAt: -1 } }
      ]).toArray();

      return rows.map(v => ({
        id: String(v._id),
        titulo: v.title,
        area: { id: String(v.area._id), name: v.area.name },
        empleador: v.emp.companyName ?? [v.emp.firstName, v.emp.lastName].filter(Boolean).join(' '),
        ubicacion: v.location ?? null,
        fecha: new Date(v.createdAt).toISOString()
      }));
    },

    // Postulantes por área.
    async postulantesPorArea(_, { serviceId }) {
      const sid = new ObjectId(serviceId);
      const ag = [
        { $lookup: { from: 'vacancies', localField: 'vacancyId', foreignField: '_id', as: 'v' } },
        { $match: { 'v.0.serviceId': sid } },
        { $lookup: { from: 'professionals', localField: 'professionalId', foreignField: '_id', as: 'p' } },
        { $project: { _id: 0, nombre: { $concat: [{ $first: '$p.firstName' }, ' ', { $first: '$p.lastName' }] } } },
        { $group: { _id: null, nombres: { $addToSet: '$nombre' } } }
      ];
      const res = await db.collection('applications').aggregate(ag).toArray();
      return res[0]?.nombres ?? [];
    },

    // Cantidad y porcentaje por área.
    async profesionalesPorAreaStats() {
      const ag = [
        { $unwind: '$services' },
        { $group: { _id: '$services', cantidad: { $sum: 1 } } },
        { $lookup: { from: 'services', localField: '_id', foreignField: '_id', as: 's' } },
        { $set: { area: { $first: '$s.name' } } },
        { $group: { _id: null, total: { $sum: '$cantidad' }, rows: { $push: { area: '$area', cantidad: '$cantidad' } } } },
        { $unwind: '$rows' },
        { $project: { _id: 0, area: '$rows.area', cantidad: '$rows.cantidad',
                      porcentaje: { $round: [{ $multiply: [{ $divide: ['$rows.cantidad', '$total'] }, 100] }, 2] } } },
        { $sort: { cantidad: -1, area: 1 } }
      ];
      return await db.collection('professionals').aggregate(ag).toArray();
    },

    // Cantidad por género.
    async profesionalesPorGenero() {
      const ag = [
        { $group: { _id: '$gender', cantidad: { $sum: 1 } } },
        { $project: { _id: 0, genero: { $ifNull: ['$_id', 'No especificado'] }, cantidad: 1 } },
        { $sort: { cantidad: -1 } }
      ];
      return await db.collection('professionals').aggregate(ag).toArray();
    }
  },

  // Mutaciones.
  Mutation: {
    // Regla 3/mes.
    async aplicar(_, { professionalId, vacancyId }) {
      const pId = new ObjectId(professionalId);
      const vId = new ObjectId(vacancyId);
      const now = new Date();
      const y = now.getUTCFullYear(), m = now.getUTCMonth();
      const start = new Date(Date.UTC(y, m, 1));
      const end   = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));

      const count = await db.collection('applications').countDocuments({
        professionalId: pId, appliedAt: { $gte: start, $lte: end }
      });
      if (count >= 3) throw new Error('Monthly application limit (3) reached.');

      await db.collection('applications').insertOne({
        professionalId: pId, vacancyId: vId, appliedAt: now, status: 'POSTULADO'
      });
      return true;
    },

    // ------- NUEVAS MUTATIONS (registro) -------
    async crearServicio(_, { name }) {
      const r = await db.collection('services').insertOne({ name });
      return String(r.insertedId);
    },

    // 👇 AHORA devuelve EmpleadorResumen
    async registrarEmpleador(_, { data }) {
      // Validación mínima: empresa (companyName) o persona (first/lastName)
      const esEmpresa = !!(data.companyName && data.companyName.trim().length);
      const esPersona = !!((data.firstName && data.firstName.trim().length) || (data.lastName && data.lastName.trim().length));
      if (!esEmpresa && !esPersona) {
        throw new Error('Debe indicar companyName (jurídica) o firstName/lastName (física).');
      }

      const doc = {
        employerType: data.tipo ?? null,
        firstName: data.firstName?.trim() || null,
        lastName:  data.lastName?.trim()  || null,
        companyName: esEmpresa ? data.companyName.trim() : null,
        taxId: data.taxId?.trim() || null,
      };

      const r = await db.collection('employers').insertOne(doc);
      const nombre = doc.companyName ?? [doc.firstName, doc.lastName].filter(Boolean).join(' ');
      return {
        id: String(r.insertedId),
        nombre,
        cedula: doc.taxId ?? null,
        puestosOfertados: 0
      };
    },

    async registrarOferente(_, { data }) {
      const serviceIds = (data.services || []).map(id => new ObjectId(id));
      const doc = {
        firstName: data.nombre,
        lastName:  data.apellido ?? null,
        email:     data.correo_electronico ?? null,
        gender:    data.genero ?? null,
        services:  serviceIds
      };
      const r = await db.collection('professionals').insertOne(doc);
      return String(r.insertedId);
    },

    async asignarServiciosAOferente(_, { oferenteId, services }) {
      const _id = new ObjectId(oferenteId);
      const add = (services || []).map(id => new ObjectId(id));
      await db.collection('professionals').updateOne(
        { _id },
        { $addToSet: { services: { $each: add } } }
      );
      return true;
    }
  }
};

/* -----------------------
   Se enciende el servidor.
   ----------------------- */

startDb().then(() => {
  new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginLandingPageLocalDefault()] // UI en /
  })
    .listen({ port: PORT })
    .then(({ url }) => console.log(`🚀 GraphQL listo en ${url}`));
});
