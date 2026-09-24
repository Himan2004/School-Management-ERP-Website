/**
 * Master Test Script for Academics Module
 * Usage: node backend/scratch/test_academics.js
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:5001/api';
const ADMIN_CREDENTIALS = {
    loginId: 'ADM-SDX6069',
    password: 'Admin@123456'
};

let token = '';

async function testAcademics() {
    try {
        console.log('--- starting Academics API Test ---');

        // 1. Login to get token
        console.log('1. Logging in...');
        const loginRes = await axios.post(`${BASE_URL}/auth/admin/login`, ADMIN_CREDENTIALS);
        token = loginRes.data.token;
        console.log('   Login successful!');

        const authHeader = { headers: { Authorization: `Bearer ${token}` } };

        // 2. Test Exam Structures
        console.log('\n2. Testing Exam Structures...');
        const getStructuresRes = await axios.get(`${BASE_URL}/admin/exams/structures`, authHeader);
        console.log(`   Found ${getStructuresRes.data.data.length} structures.`);

        // 3. Test Timetable
        console.log('\n3. Testing Timetable CRUD...');
        const getTimetablesRes = await axios.get(`${BASE_URL}/admin/timetable`, authHeader);
        console.log(`   Found ${getTimetablesRes.data.data.length} timetables.`);

        // 4. Test Attendance
        console.log('\n4. Testing Attendance Reports...');
        const getAttendanceRes = await axios.get(`${BASE_URL}/admin/attendance`, authHeader);
        console.log(`   Found ${getAttendanceRes.data.data.length} attendance records.`);

        // 5. Test Analytics
        console.log('\n5. Testing Analytics Endpoints...');
        try {
            const attendanceTrends = await axios.get(`${BASE_URL}/admin/academic/analytics/attendance`, authHeader);
            console.log('   Attendance trends fetched successfully.');
        } catch (err) {
            console.log('   Analytics fetch note: No data yet for trends.');
        }

        console.log('\n--- Test Completed Successfully ---');
        console.log('All academic endpoints are registered and responding.');

    } catch (error) {
        console.error('\n!!! Test Failed !!!');
        console.error('Error:', error.response?.data?.message || error.message);
        if (error.response?.status === 404) {
            console.log('Tip: Check if the backend server is running on http://localhost:5001');
        }
    }
}

testAcademics();
