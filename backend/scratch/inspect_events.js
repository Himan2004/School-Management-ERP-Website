import mongoose from 'mongoose';
import 'dotenv/config';
import connectDB from '../config/database.js';
import Event from '../models/common/Event.js';

async function run() {
    await connectDB();
    console.log('--- MongoDB Connected ---');

    const schoolId = '69fe09eedec901fd9887d235';
    const events = await Event.find({ school: schoolId });
    console.log(`Total events for school ${schoolId}: ${events.length}`);
    events.forEach((e, i) => {
        console.log(`Event ${i + 1}: ID: ${e._id}, Title: ${e.title}, Category: ${e.category}, Participants: ${e.participants}, Origin: ${e.origin}, Status: ${e.status}`);
    });

    process.exit(0);
}

run().catch(console.error);
