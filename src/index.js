// Archivo: src/index.js

require('dotenv').config();
const { ApolloServer } = require('apollo-server');
const { ApolloServerPluginLandingPageLocalDefault } = require('apollo-server-core');

// 1. IMPORTA tus módulos en lugar de definirlos aquí
const typeDefs = require('./graphql/typeDefs');
const resolvers = require('./graphql/resolvers');
const { startDb } = require('./db/connection');

const PORT = process.env.PORT || 4000;

async function startServer() {
  // 2. Inicia la conexión a la base de datos
  const db = await startDb();
  console.log('Database connection passed to server context.');

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    // 3. Pasa la conexión 'db' a través del contexto a tus resolvers
    context: { db }, 
    plugins: [ApolloServerPluginLandingPageLocalDefault()]
  });

  const { url } = await server.listen({ port: PORT });
  console.log(`🚀 GraphQL server ready at ${url}`);
}

startServer().catch(error => {
  console.error("Failed to start the server:", error);
  process.exit(1);
});