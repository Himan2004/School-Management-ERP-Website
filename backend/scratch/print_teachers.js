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

    console.log("Fetching teachers...");
    const res = await axios.get("http://localhost:5001/api/admin/teachers", config);
    console.log("SUCCESS:", res.status);
    console.log("Teachers length:", res.data.teachers?.length);
    if (res.data.teachers?.length > 0) {
      console.log("Sample teacher:", JSON.stringify(res.data.teachers[0], null, 2));
    }
  } catch (error) {
    if (error.response) {
      console.log("FAILED:", error.response.status, error.response.data);
    } else {
      console.log("FAILED:", error.message);
    }
  }
}

run();
