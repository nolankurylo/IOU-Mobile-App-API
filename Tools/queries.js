require('dotenv').config()
console.log(process.env.DATABASE_URL)
const Pool = require('pg').Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: (process.env.REQUIRE_SSL.toLowerCase() == 'true')
})

module.exports = async (text, values, cb) => {

  const client = await pool.connect();

  await client.query(text, values, (err, result) => {
    client.release()
    return cb(err, result)
  })
}