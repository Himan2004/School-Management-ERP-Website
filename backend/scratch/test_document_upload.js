import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

async function run() {
    try {
        console.log("Logging in as teacher...");
        const loginRes = await axios.post("http://127.0.0.1:5001/api/auth/teacher/login", {
            loginId: "SXP5655",
            password: "Tch@424351"
        });

        const token = loginRes.data.token;
        console.log("Login successful!");

        const studentId = "6a3b52dc7accbfe7d6acaa94";

        // Create a valid PDF skeleton file
        const pdfContent = "%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\ntrailer\n<<\n/Root 1 0 R\n>>\n%%EOF";
        fs.writeFileSync("scratch/dummy.pdf", pdfContent);

        const form = new FormData();
        form.append("studentId", studentId);
        form.append("category", "Report Card");
        form.append("customFileName", "Test_Report_Card.pdf");
        form.append("file", fs.createReadStream("scratch/dummy.pdf"));

        console.log("Uploading document...");
        const response = await axios.post("http://127.0.0.1:5001/api/teacher/students/documents/upload", form, {
            headers: {
                Authorization: `Bearer ${token}`,
                ...form.getHeaders()
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
