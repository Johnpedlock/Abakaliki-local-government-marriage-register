const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "abakaliki_marriage_register",
  password: "",
  port: 5432,
});

module.exports = pool;
