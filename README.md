GraphQL Project

Installation:

1. Open a terminal in the project root directory and install dependencies:
   npm install

Database Seeding:

Before running the server, populate the database with sample data:
node .\seed.js
This script will insert mass data for services, employers, professionals, and vacancies to facilitate testing.

Running the Server:

1. Navigate to the 'src' folder:
   cd src
2. Start the GraphQL server and connect to MongoDB:
   node .\index.js
   Once the server is running, you can access the GraphQL Playground at http://localhost:4000/ (or the configured port) to execute queries and mutations.

You will need to create a .env document in root directory

.env Example:

PORT=4000
MONGODB_URI=mongodb://localhost:27017/ProyectoGraphQL
