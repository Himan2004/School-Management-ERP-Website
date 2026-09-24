import crypto from 'crypto';
import OTP from '../models/common/OTP.js';
import axios from 'axios';

class OTPService {
  constructor() {
    this.apiKey = process.env.BREVO_API_KEY;
    this.baseUrl = 'https://api.brevo.com/v3';
  }

  generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
  }

  hashOTP(otp) {
    return crypto.createHash('sha256').update(otp).digest('hex');
  }

  async sendOTPEmail(email, otp, purpose = 'password_reset') {
    try {
      const response = await axios.post(
        `${this.baseUrl}/smtp/email`,
        {
          sender: {
            name: process.env.BREVO_SENDER_NAME || 'School Management System',
            email: process.env.BREVO_SENDER_EMAIL || 'noreply@schoolmanagement.com'
          },
          to: [{ email }],
          subject: purpose === 'password_reset' 
            ? 'Password Reset OTP - School Management System'
            : 'Email Verification OTP - School Management System',
          htmlContent: `
            <html>
              <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background-color: #f8f9fa; border-radius: 10px; padding: 30px; text-align: center;">
                  <h2 style="color: #333; margin-bottom: 20px;">School Management System</h2>
                  <p style="color: #666; font-size: 16px; margin-bottom: 30px;">
                    ${purpose === 'password_reset' 
                      ? 'You requested to reset your password. Use the following OTP to proceed:' 
                      : 'Please verify your email address using the following OTP:'}
                  </p>
                  <div style="background-color: #007bff; color: white; font-size: 32px; font-weight: bold; 
                              padding: 20px; border-radius: 8px; letter-spacing: 8px; margin-bottom: 30px;">
                    ${otp}
                  </div>
                  <p style="color: #999; font-size: 14px;">
                    This OTP will expire in ${process.env.OTP_EXPIRE_MINUTES || 10} minutes.
                  </p>
                  <p style="color: #999; font-size: 12px; margin-top: 30px;">
                    If you didn't request this, please ignore this email.
                  </p>
                </div>
              </body>
            </html>
          `
        },
        {
          headers: {
            'api-key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Email sent successfully:', response.data);
      return { success: true, messageId: response.data.messageId };
    } catch (error) {
      console.error('Error sending email:', error.response?.data || error.message);
      throw new Error('Failed to send OTP email');
    }
  }

  async createOTP(email, secretKey, purpose = 'password_reset') {
    try {
      const otp = this.generateOTP();
      const expiresAt = new Date(Date.now() + (process.env.OTP_EXPIRE_MINUTES || 10) * 60 * 1000);
      
      await OTP.deleteMany({ email, purpose, isUsed: false });

      await OTP.create({
        email,
        otp: this.hashOTP(otp),
        secretKey,
        expiresAt,
        purpose
      });

      await this.sendOTPEmail(email, otp, purpose);
      
      return {
        success: true,
        message: 'OTP sent successfully',
        expiresAt,
        email
      };
    } catch (error) {
      console.error('Error creating OTP:', error);
      throw error;
    }
  }

  async verifyOTP(email, otp, secretKey, purpose = 'password_reset') {
    try {
      const otpRecord = await OTP.findOne({
        email,
        purpose,
        isUsed: false,
        expiresAt: { $gt: new Date() }
      });

      if (!otpRecord) {
        return {
          success: false,
          message: 'OTP expired or not found. Please request a new one.'
        };
      }

      if (otpRecord.secretKey !== secretKey) {
        return {
          success: false,
          message: 'Invalid secret key'
        };
      }

      const hashedOTP = this.hashOTP(otp);
      if (otpRecord.otp !== hashedOTP) {
        return {
          success: false,
          message: 'Invalid OTP'
        };
      }

      otpRecord.isUsed = true;
      await otpRecord.save();

      return {
        success: true,
        message: 'OTP verified successfully'
      };
    } catch (error) {
      console.error('Error verifying OTP:', error);
      throw error;
    }
  }
}

export default new OTPService();