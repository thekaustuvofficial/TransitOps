import pg from 'pg';
import fs from 'fs';

const { Pool } = pg;

// Read JSON safely in ES Module scope
const dbData = JSON.parse(fs.readFileSync('./db.json', 'utf-8'));

const pool = new Pool({
  user: process.env.USER,
  host: 'localhost',
  database: 'postgres',
  port: 5432,
});

async function seedDatabase() {
  const insertData = async (tableName, dataArray) => {
    if (!dataArray || dataArray.length === 0) return;
    
    const columns = Object.keys(dataArray[0]);
    for (const item of dataArray) {
       const values = Object.values(item);
       const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
       
       const query = `
         INSERT INTO ${tableName} (${columns.join(', ')}) 
         VALUES (${placeholders}) 
         ON CONFLICT (id) DO NOTHING;
       `;
       await pool.query(query, values);
    }
  };

  try {
    console.log("Starting database seed...");
    
    await insertData('vehicles', dbData.vehicles);
    await insertData('drivers', dbData.drivers);
    console.log("Assets & Drivers loaded.");

    await insertData('trips', dbData.trips);
    await insertData('maintenance', dbData.maintenance);
    await insertData('fuel', dbData.fuel);
    await insertData('expenses', dbData.expenses);
    await insertData('activity', dbData.activity);
    
    console.log("Operational & Financial data loaded.");
    console.log("Seeding complete. Postgres is fully loaded.");
    
  } catch (err) {
    console.error("Seeding failed:", err.message);
  } finally {
    pool.end();
  }
}

seedDatabase();