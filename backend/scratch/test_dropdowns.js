import axios from 'axios';

const BASE_URL = 'http://localhost:5001/api';
const ADMIN_CREDENTIALS = {
    loginId: 'ADM-SDX6069',
    password: 'Admin@123456'
};

async function testDropdowns() {
    try {
        console.log('Logging in...');
        const loginRes = await axios.post(`${BASE_URL}/auth/admin/login`, ADMIN_CREDENTIALS);
        const token = loginRes.data.token;
        console.log('Login successful! Fetching dropdown options...');

        const authHeader = { headers: { Authorization: `Bearer ${token}` } };
        const response = await axios.get(`${BASE_URL}/admin/exams/dropdown-options`, authHeader);

        console.log('Success:', response.data.success);
        console.log('Data:', JSON.stringify(response.data.data, null, 2));

    } catch (error) {
        console.error('Error:', error.response?.data?.message || error.message);
    }
}

testDropdowns();
