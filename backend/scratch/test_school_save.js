import mongoose from "mongoose";
import dotenv from "dotenv";
import School from "../models/school/School.js";

dotenv.config({ path: "../.env" });

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const schools = await School.find();
    console.log(`Found ${schools.length} schools.`);
    
    for (const school of schools) {
      console.log(`Validating school: ${school.schoolName} (${school._id})`);
      try {
        await school.validate();
        console.log("Validation: OK");
      } catch (err) {
        console.error("Validation FAILED:", err.message);
      }
      
      console.log("--------------------------------------");
    }
  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
}

run();
