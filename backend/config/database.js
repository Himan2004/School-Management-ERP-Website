import mongoose from "mongoose";
import dotenv from "dotenv";
import { seedGraphuraAdmin } from "../utils/graphuraAdmin.seeder.js";

dotenv.config();

const dropStaleIndexes = async () => {
  try {
    // Drop applicationId_1 from admissionrequests if it exists
    const collection = mongoose.connection.collection('admissionrequests');
    const indexes = await collection.indexes();
    const hasStaleIndex = indexes.some(idx => idx.name === 'applicationId_1');
    if (hasStaleIndex) {
      await collection.dropIndex('applicationId_1');
      console.log('✅ Stale applicationId_1 index dropped');
    }

    // Drop organization_id_1_name_1 from feeheads if it exists
    const feeheadsCollection = mongoose.connection.collection('feeheads');
    const feeheadsIndexes = await feeheadsCollection.indexes();
    const hasStaleFeeheadsIndex = feeheadsIndexes.some(idx => idx.name === 'organization_id_1_name_1');
    if (hasStaleFeeheadsIndex) {
      await feeheadsCollection.dropIndex('organization_id_1_name_1');
      console.log('✅ Stale organization_id_1_name_1 index dropped from feeheads');
    }
  } catch (e) {
    // Safe to ignore — index may not exist
    console.log('Index cleanup skipped:', e.message);
  }
};

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
    
    await dropStaleIndexes(); 
    await seedGraphuraAdmin();
    
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

export default connectDB;