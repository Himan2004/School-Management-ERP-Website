import axios from "axios";

async function run() {
  try {
    console.log("Logging in...");
    const loginRes = await axios.post("http://localhost:5001/api/auth/admin/login", {
      loginId: "ADM-SDX6069",
      password: "Admin@123456"
    });

    console.log("Login successful! Token:", loginRes.data.token);
    const token = loginRes.data.token;

    console.log("Fetching dashboard stats...");
    const statsRes = await axios.get("http://localhost:5001/api/admin/dashboard-stats", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log("Stats Response:", statsRes.data);
  } catch (error) {
    if (error.response) {
      console.error("API Error Status:", error.response.status);
      console.error("API Error Data:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error("Request Error:", error.message);
    }
  }
}

run();
