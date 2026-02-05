/**
 * Migration Runner Script
 * Run with: node scripts/run-migration.js <migration-file>
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'uptm_scheduling',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

async function runMigration(migrationFile) {
    const client = await pool.connect();
    try {
        const sqlPath = path.join(__dirname, '..', 'database', 'migrations', migrationFile);
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        console.log(`Running migration: ${migrationFile}`);
        await client.query(sql);
        console.log('✅ Migration completed successfully');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

const migrationFile = process.argv[2] || '003_edupage_sync.sql';
runMigration(migrationFile);
