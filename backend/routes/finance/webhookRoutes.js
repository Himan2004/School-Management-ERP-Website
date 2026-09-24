import express from "express";
import { handleRazorpayWebhook } from "../../controllers/finance/webhookController.js";

const router = express.Router();

// Razorpay sends raw body, ensure this route is used with express.raw() if needed 
// but usually express.json() works if the signature matches the JSON stringified body.
router.post("/", express.json(), handleRazorpayWebhook);

export default router;
