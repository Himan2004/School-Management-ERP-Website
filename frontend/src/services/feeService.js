import axios from "axios";

export const fetchStudentDues = async () => {
  const res = await axios.get("/api/finance/student-dues");
  return res.data;
};

export const createOrder = async (amount) => {
  const res = await axios.post("/api/finance/create-order", { amount });
  return res.data;
};

export const verifyPayment = async (paymentData) => {
  const res = await axios.post("/api/finance/verify-payment", paymentData);
  return res.data;
};
