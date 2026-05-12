const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000
});

pool.on("connect", () => {

  console.log("PostgreSQL connected successfully");

});

pool.on("error", (err) => {

  console.error("PostgreSQL error:", err);

});

module.exports = pool;
