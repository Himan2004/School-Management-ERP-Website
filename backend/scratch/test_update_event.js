import axios from 'axios';
import mongoose from 'mongoose';
import 'dotenv/config';
import connectDB from '../config/database.js';
import Event from '../models/common/Event.js';

async function run() {
    // 1. Connect to DB to check current event value
    await connectDB();
    console.log('--- Connected to MongoDB ---');

    const schoolId = '69fe09eedec901fd9887d235';
    // Find a local event belonging to this school
    const event = await Event.findOne({ school: schoolId, origin: 'Local' });
    if (!event) {
        console.log('No local event found for school', schoolId);
        process.exit(1);
    }
    console.log(`Original Event ID: ${event._id}`);
    console.log(`Original Name: ${event.title}`);
    console.log(`Original Description: "${event.description}"`);

    // 2. Perform API Login
    console.log('Logging in via API...');
    let token = '';
    try {
        const loginRes = await axios.post('http://localhost:5001/api/auth/principal/login', {
            loginId: 'PRL-FSX7493',
            password: 'Principal@897890'
        });
        token = loginRes.data.token || loginRes.data.data?.token;
        console.log('Login successful, token retrieved.');
    } catch (err) {
        console.error('Login failed:', err.response?.data || err.message);
        process.exit(1);
    }

    // 3. Perform Event Update API call
    console.log('Calling PUT update event API...');
    const updatedDesc = 'Test Description updated at ' + new Date().toISOString();
    try {
        const updateRes = await axios.put(`http://localhost:5001/api/principal/events/${event._id}`, {
            name: event.title,
            title: event.title,
            category: event.category,
            date: event.eventDate.toISOString().split('T')[0],
            eventDate: event.eventDate,
            startTime: event.startTime || '09:00',
            endTime: event.endTime || '10:00',
            venue: event.venue || 'School Campus',
            participants: event.participants || 'All Students',
            status: event.status || 'Upcoming',
            description: updatedDesc
        }, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        console.log('Update API Response status:', updateRes.status);
        console.log('Update API Response data:', JSON.stringify(updateRes.data, null, 2));
    } catch (err) {
        console.error('Update API failed:', err.response?.data || err.message);
        process.exit(1);
    }

    // 4. Verify in DB
    const refreshedEvent = await Event.findById(event._id);
    console.log(`Verified DB Description: "${refreshedEvent.description}"`);
    if (refreshedEvent.description === updatedDesc) {
        console.log('SUCCESS: Backend and Database update works perfectly!');
    } else {
        console.log('FAILURE: Database was not updated with the new description.');
    }

    process.exit(0);
}

run().catch(console.error);
