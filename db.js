import dotenv from "dotenv";
import pgpromise from "pg-promise";
import FileSystem from "fs";

const pgp = pgpromise();

dotenv.config();

const connection = {
  host: process.env.SUPABASEHOST,
  port: process.env.SUPABASEPORT,
  database: process.env.SUPABASEDATABASE,
  user: process.env.SUPABASEUSER,
  password: process.env.SUPABASEPASSWORD,
  ssl: {
    rejectUnauthorized: true,
    ca: FileSystem.readFileSync("prod-ca-2021.crt").toString(),
  },
};
const db = pgp(connection);

export default db;
