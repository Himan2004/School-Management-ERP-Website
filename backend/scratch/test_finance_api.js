import axios from 'axios';

const BASE_URL = 'http://localhost:5001/api';
const ADMIN_CREDENTIALS = {
    loginId: 'ADM-SDX6069',
    password: 'Admin@123456'
};

async function testFinanceApi() {
    try {
        console.log('Logging in...');
        const loginRes = await axios.post(`${BASE_URL}/auth/admin/login`, ADMIN_CREDENTIALS);
        const token = loginRes.data.token;
        console.log('Login successful! Fetching finance stats for May 2026...');

        const authHeader = { headers: { Authorization: `Bearer ${token}` } };
        const response = await axios.get(`${BASE_URL}/admin/finance/dashboard-stats?month=5&year=2026`, authHeader);

        console.log('Success:', response.data.success);
        console.log('Data:', JSON.stringify(response.data.data, null, 2));

    } catch (error) {
        console.error('Error:', error.response?.data?.message || error.message);
    }
}

testFinanceApi();
