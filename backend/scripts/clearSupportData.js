import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import GraphuraFAQ from '../models/graphura/GraphuraFAQ.js';
import GraphuraVideo from '../models/graphura/GraphuraVideo.js';
import GraphuraResource from '../models/graphura/GraphuraResource.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const clearDB = async () => {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            throw new Error('MONGODB_URI is not defined in .env');
        }
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        // Clear existing data
        const faqResult = await GraphuraFAQ.deleteMany({});
        const videoResult = await GraphuraVideo.deleteMany({});
        const resourceResult = await GraphuraResource.deleteMany({});
        
        console.log('--- Cleanup Report ---');
        console.log(`FAQs deleted: ${faqResult.deletedCount}`);
        console.log(`Videos deleted: ${videoResult.deletedCount}`);
        console.log(`Resources deleted: ${resourceResult.deletedCount}`);
        console.log('----------------------');
        console.log('Successfully cleared all support demo data');

        process.exit(0);
    } catch (error) {
        console.error('Error clearing database:', error);
        process.exit(1);
    }
};

clearDB();
