import jwt from 'jsonwebtoken';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const teacherId = '6a2151f39709eabab2846ad3';
const role = 'teacher';

// Sign token
const secret = process.env.JWT_SECRET.trim();
const token = jwt.sign({ id: teacherId, role }, secret, { expiresIn: '1h' });

console.log('Generated token:', token);

// Make HTTP request
axios.get('http://[::1]:5001/api/teacher/students', {
    headers: {
        Authorization: `Bearer ${token}`
    }
})
.then((response) => {
    console.log('Status code:', response.status);
    console.log('Response success:', response.data?.success);
    console.log('Response data type:', typeof response.data?.data);
    console.log('Response keys:', Object.keys(response.data || {}));
    if (response.data?.data) {
        console.log('Response data keys:', Object.keys(response.data.data));
        console.log('Students count:', response.data.data.students?.length);
        console.log('Sample student:', JSON.stringify(response.data.data.students?.[0], null, 2));
    }
})
.catch((err) => {
    console.error('HTTP request failed:', err.response?.status, err.response?.data || err.message);
});
