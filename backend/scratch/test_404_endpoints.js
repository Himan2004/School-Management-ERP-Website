import axios from "axios";

async function run() {
  try {
    console.log("Logging in...");
    const loginRes = await axios.post("http://localhost:5001/api/auth/admin/login", {
      loginId: "ADM-SDX6069",
      password: "Admin@123456"
    });

    const token = loginRes.data.token;
    const config = {
      headers: {
        Authorization: `Bearer ${token}`
      }
    };

    const endpoints = [
      "/api/admin/events/upcoming",
      "/api/admin/academic/analytics/dashboard-performance",
      "/api/admin/attendance/dashboard-stats"
    ];

    for (const ep of endpoints) {
      console.log(`Testing endpoint: ${ep}...`);
      try {
        const res = await axios.get(`http://localhost:5001${ep}`, config);
        console.log(`SUCCESS [${ep}]:`, res.status, res.data);
      } catch (err) {
        if (err.response) {
          console.log(`FAILED [${ep}]:`, err.response.status, err.response.data);
        } else {
          console.log(`FAILED [${ep}]:`, err.message);
        }
      }
      console.log("-----------------------------------------");
    }
  } catch (error) {
    console.error("Login failed:", error.message);
  }
}

run();
