import {sendPrincipalCredentialsEmail } from "../services/emailService.js";

export const testEmail = async (req, res) => {
  try {
    const dummyRequest = {
      officialEmail: "your_email@gmail.com", // 👈 change this
      principalEmail: "your_email@gmail.com", // 👈 change this
      principalName: "Test Principal",
      schoolName: "Test School",
    };

    const loginId = "TEST123";
    const password = "Test@123";

    await sendPrincipalCredentialsEmail(dummyRequest, loginId, password);

    res.status(200).json({
      success: true,
      message: "Test email sent successfully ✅",
    });
  } catch (error) {
    console.error("TEST EMAIL ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Email failed ❌",
      error: error.message,
    });
  }
};