# Seed helper (what it is and how to use it)

**What is it?** `seed.js` auto-fills MongoDB with demo data so your GraphQL queries/mutations work immediately.

**Do I need it?** No. It's optional. Use it if your DB is empty or you want quick, repeatable test data.

## How to run
1. Ensure MongoDB is running and your API is configured with:
   ```
   MONGODB_URI=mongodb://localhost:27017/Project
   PORT=4000
   ```
2. Place `seed.js` next to your `package.json`.
3. Run:
   ```bash
   node seed.js                 # just seed
   DROP_FIRST=1 node seed.js    # wipe collections, then seed
   ```

## What it inserts
- Collections: `services`, `employers`, `professionals`, `vacancies`, `applications`
- 4 services, 1 employer, 2 professionals, 3 vacancies (with `createdAt`), and 3 applications this month
- Prints the IDs to use in Apollo Playground (http://localhost:4000)
