import axios from 'axios';
import 'dotenv/config';

async function run() {
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

    console.log('Calling GET financial reports API...');
    try {
        const reportsRes = await axios.get('http://localhost:5001/api/principal/reports/financial', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        console.log('API Response status:', reportsRes.status);
        console.log('API Response data keys:', Object.keys(reportsRes.data.data || {}));
    } catch (err) {
        console.error('API Call failed with status:', err.response?.status);
        console.error('Error details:', JSON.stringify(err.response?.data || {}, null, 2));
        console.error('Error message:', err.message);
    }

    process.exit(0);
}

run().catch(console.error);
