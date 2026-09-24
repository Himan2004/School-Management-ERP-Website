import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const schools = await db.collection("schools").find().toArray();
    console.log("Raw schools in database:");
    schools.forEach(s => {
      console.log(JSON.stringify(s, null, 2));
      console.log("=========================================");
    });
  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
}

run();
