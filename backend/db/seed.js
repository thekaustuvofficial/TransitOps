import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbData = JSON.parse(fs.readFileSync(path.join(__dirname, 'db.json'), 'utf-8'));

const pool = new Pool({
  user:     process.env.DB_USER     || process.env.USER,
  host:     process.env.DB_HOST     || 'localhost',
  database: process.env.DB_NAME     || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  port:     Number(process.env.DB_PORT) || 5432,
});

async function seedDatabase() {
  const insertData = async (tableName, dataArray) => {
    if (!dataArray?.length) return;
    const columns = Object.keys(dataArray[0]);
    for (const item of dataArray) {
      const values       = Object.values(item);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
      await pool.query(
        `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`,
        values
      );
    }
  };

  try {
    console.log('Starting database seed...');
    await insertData('vehicles',    dbData.vehicles);
    await insertData('drivers',     dbData.drivers);
    console.log('Vehicles & Drivers loaded.');
    await insertData('trips',       dbData.trips);
    await insertData('maintenance', dbData.maintenance);
    await insertData('fuel',        dbData.fuel);
    await insertData('expenses',    dbData.expenses);
    await insertData('activity',    dbData.activity);
    console.log('Operational & Financial data loaded.');
    console.log('Seeding complete.');
  } catch (err) {
    console.error('Seeding failed:', err.message);
  } finally {
    pool.end();
  }
}

seedDatabase();
