require('dotenv').config()

const pgp = require('pg-promise')()
const connection = {
  host: process.env.SUPABASEHOST,
  port: process.env.SUPABASEPORT,
  database: process.env.SUPABASEDATABASE,
  user: process.env.SUPABASEUSER,
  password: process.env.SUPABASEPASSWORD,
  ssl: { rejectUnauthorized: false },
};
const db = pgp(connection);

module.exports = db;
