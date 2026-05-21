const dotenv = require("dotenv");
dotenv.config();

const connectDB = require("../config/db");
const ensureAdmin = require("./ensureAdmin");

const run = async () => {
  await connectDB();
  const result = await ensureAdmin();
  console.log(result.message);
  process.exit(0);
};

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
