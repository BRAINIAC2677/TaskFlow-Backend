import dotenv from 'dotenv';
import pgpromise from 'pg-promise';

const pgp = pgpromise();


dotenv.config();

const connection = {
  host: process.env.SUPABASEHOST,
  port: process.env.SUPABASEPORT,
  database: process.env.SUPABASEDATABASE,
  user: process.env.SUPABASEUSER,
  password: process.env.SUPABASEPASSWORD,
  ssl: { rejectUnauthorized: false },
};
const db = pgp(connection);

export default db;
