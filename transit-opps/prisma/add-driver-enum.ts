import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });

async function main() {
  const client = await pool.connect();
  try {
    // Check if DRIVER already exists in the enum
    const check = await client.query(`
      SELECT enumlabel FROM pg_enum 
      JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
      WHERE pg_type.typname = 'UserRole' AND enumlabel = 'DRIVER'
    `);

    if (check.rows.length > 0) {
      console.log('✅ DRIVER already exists in UserRole enum');
    } else {
      await client.query(`ALTER TYPE "UserRole" ADD VALUE 'DRIVER'`);
      console.log('✅ Added DRIVER to UserRole enum in PostgreSQL');
    }

    // Also check current enum values
    const values = await client.query(`
      SELECT enumlabel FROM pg_enum 
      JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
      WHERE pg_type.typname = 'UserRole'
      ORDER BY enumsortorder
    `);
    console.log('Current UserRole enum values:', values.rows.map((r: any) => r.enumlabel).join(', '));
  } finally {
    client.release();
    await pool.end();
  }
}

main();
