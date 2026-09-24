import axios from 'axios';

async function run() {
    try {
        console.log("Logging in as teacher...");
        const loginRes = await axios.post("http://[::1]:5001/api/auth/teacher/login", {
            loginId: "SXP5655",
            password: "Tch@424351"
        });

        const token = loginRes.data.token;
        console.log("Login successful! Token obtained.");

        const payload = {
            title: "Test Announcement Title",
            description: "Test Announcement Description",
            targetAudience: "All Classes",
            type: "General",
            priority: "medium",
            status: "Active",
            sendNotification: true
        };

        console.log("Posting announcement to /api/teacher/announcements...");
        const response = await axios.post("http://[::1]:5001/api/teacher/announcements", payload, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        console.log("Status Code:", response.status);
        console.log("Response Data:", response.data);
    } catch (error) {
        if (error.response) {
            console.error("HTTP Status:", error.response.status);
            console.error("Error Response Data:", error.response.data);
        } else {
            console.error("Error:", error);
        }
    }
}

run();
