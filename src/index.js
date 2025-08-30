require('dotenv').config();
const { ApolloServer } = require('apollo-server');
const { ApolloServerPluginLandingPageLocalDefault } = require('apollo-server-core');

// Import schema, resolvers, and database connection
const typeDefs = require('./graphql/typeDefs');
const resolvers = require('./graphql/resolvers');
const { startDb } = require('./db/connection');

const PORT = process.env.PORT || 4000;

async function startServer() {
  // Initialize database connection
  const db = await startDb();
  console.log('Database connection established and passed to context.');

  // Create Apollo Server instance with schema, resolvers, and context
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: { db },
    plugins: [ApolloServerPluginLandingPageLocalDefault()]
  });

  // Start server and log the URL
  const { url } = await server.listen({ port: PORT });
  console.log(`🚀 GraphQL server running at ${url}`);
}

// Handle startup errors gracefully
startServer().catch(error => {
  console.error("Error starting the server:", error);
  process.exit(1);
});
