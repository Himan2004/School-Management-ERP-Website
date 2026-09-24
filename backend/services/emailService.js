import SibApiV3Sdk from "sib-api-v3-sdk";

const defaultClient = SibApiV3Sdk.ApiClient.instance;
defaultClient.authentications["api-key"].apiKey = process.env.BREVO_API_KEY;

const api = new SibApiV3Sdk.TransactionalEmailsApi();

const APP_NAME = process.env.APP_NAME || "Graphura";
const APP_URL = process.env.CLIENT_URL || "http://localhost:5173";
const YEAR = new Date().getFullYear();

const SENDER = {
  name: process.env.BREVO_SENDER_NAME || `${APP_NAME} Admin`,
  email: process.env.BREVO_SENDER_EMAIL || "noreply@graphura.com",
};

// ─── Shared SaaS Email Styles (Bulletproof Table Layouts) ───────────────
const saasStyles = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f6f9fc; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
  .wrapper { max-width: 560px; margin: 40px auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
  .header { padding: 32px 40px 24px; border-bottom: 1px solid #f3f4f6; }
  .logo { font-size: 20px; font-weight: 700; color: #111827; margin: 0; letter-spacing: -0.5px; }
  .badge { display: inline-block; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; margin-top: 12px; }
  .badge-neutral { background-color: #f3f4f6; color: #4b5563; }
  .badge-success { background-color: #ecfdf5; color: #16a34a; border: 1px solid #d1fae5; }
  .badge-danger { background-color: #fef2f2; color: #dc2626; border: 1px solid #fee2e2; }
  .content { padding: 32px 40px; }
  .title { font-size: 18px; font-weight: 600; color: #111827; margin: 0 0 16px; }
  .text { font-size: 15px; color: #4b5563; line-height: 1.6; margin: 0 0 24px; }
  
  /* Bulletproof Credentials Table CSS */
  .cred-card { background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; margin-bottom: 24px; }
  .cred-card h3 { margin: 0 0 16px; font-size: 13px; font-weight: 600; color: #111827; text-transform: uppercase; letter-spacing: 0.5px; }
  .cred-table { width: 100%; border-collapse: collapse; }
  .cred-table td { padding: 12px 0; border-bottom: 1px solid #f3f4f6; }
  .cred-table tr:last-child td { border-bottom: none; padding-bottom: 0; }
  .cred-label { font-size: 13px; color: #6b7280; font-weight: 500; width: 40%; vertical-align: top; }
  .cred-value { font-size: 14px; color: #111827; font-weight: 600; text-align: right; vertical-align: top; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
  
  .btn { display: inline-block; background-color: #111827; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 500; text-align: center; }
  .alert-box { background-color: #fef2f2; border-left: 3px solid #ef4444; padding: 12px 16px; font-size: 14px; color: #991b1b; margin-bottom: 24px; }
  .footer { background-color: #f9fafb; padding: 24px 40px; border-top: 1px solid #e5e7eb; font-size: 13px; color: #6b7280; line-height: 1.5; text-align: center; }
  .footer a { color: #2563eb; text-decoration: none; }
`;

// ─── Custom Email ─────────────────────────────────────────────────────────────
export const sendCustomEmail = async (toEmail, toName, subject, message) => {
  if (!toEmail) throw new Error("Missing recipient email");
  const email = new SibApiV3Sdk.SendSmtpEmail();
  email.subject = subject;
  email.sender = SENDER;
  email.to = [{ email: toEmail, name: toName || "User" }];
  email.htmlContent = `
    <!DOCTYPE html><html><head><style>${saasStyles}</style></head>
    <body>
      <div class="wrapper">
        <div class="header"><h1 class="logo">${APP_NAME}</h1></div>
        <div class="content"><div class="text" style="white-space: pre-wrap;">${message}</div></div>
        <div class="footer">&copy; ${YEAR} ${APP_NAME}. All rights reserved.</div>
      </div>
    </body></html>`;
  return api.sendTransacEmail(email);
};

// ─── Contact Enquiry Email ──────────────────────────────────────────────────
export const sendContactEnquiryEmail = async ({
  fullName,
  schoolName,
  workEmail,
  phoneNumber,
  enquiryType,
  requirements,
}) => {
  const email = new SibApiV3Sdk.SendSmtpEmail();
  email.subject = `New Contact Enquiry: ${enquiryType} — ${schoolName}`;
  email.sender = SENDER;
  const recipientEmail =
    process.env.BREVO_SENDER_EMAIL || "school.graphura@gmail.com";
  email.to = [{ email: recipientEmail, name: `${APP_NAME} Admin` }];
  email.replyTo = { email: workEmail, name: fullName };

  email.htmlContent = `
    <!DOCTYPE html><html><head><style>${saasStyles} .val { font-family: inherit; font-weight: 500; }</style></head>
    <body>
      <div class="wrapper">
        <div class="header"><h1 class="logo">${APP_NAME} Internal</h1></div>
        <div class="content">
          <h2 class="title">New Platform Enquiry</h2>
          <div class="cred-card">
            <table class="cred-table">
              <tr><td class="cred-label">Name</td><td class="cred-value val">${fullName}</td></tr>
              <tr><td class="cred-label">School</td><td class="cred-value val">${schoolName}</td></tr>
              <tr><td class="cred-label">Email</td><td class="cred-value val"><a href="mailto:${workEmail}">${workEmail}</a></td></tr>
              <tr><td class="cred-label">Phone</td><td class="cred-value val">${phoneNumber}</td></tr>
              <tr><td class="cred-label">Type</td><td class="cred-value val">${enquiryType}</td></tr>
            </table>
          </div>
          <h3 style="font-size: 14px; margin-bottom: 8px;">Requirements:</h3>
          <div class="text" style="background: #f9fafb; padding: 16px; border: 1px solid #e5e7eb; border-radius: 6px; white-space: pre-wrap;">${requirements}</div>
        </div>
      </div>
    </body></html>`;
  return api.sendTransacEmail(email);
};

// ─── Admin Password Reset Email ───────────────────────────────────────────────
export const sendAdminPasswordResetEmail = async (emailAddress, otp) => {
  if (!emailAddress) return;

  const email = new SibApiV3Sdk.SendSmtpEmail();
  email.subject = `Password Reset Verification Code — ${APP_NAME}`;
  email.sender = SENDER;
  email.to = [{ email: emailAddress, name: "Graphura Admin" }];

  email.htmlContent = `
    <!DOCTYPE html><html><head><style>${saasStyles}</style></head>
    <body>
      <div class="wrapper">
        <div class="header">
          <h1 class="logo">${APP_NAME}</h1>
          <span class="badge badge-neutral" style="background-color: #e0e7ff; color: #4f46e5; border: 1px solid #c7d2fe;">Security Alert</span>
        </div>
        <div class="content">
          <p class="text">Hello,</p>
          <p class="text">We received a request to reset the password for your Graphura Admin account. Please use the verification code below to complete the process.</p>
          
          <div class="cred-card" style="text-align: center; padding: 32px 24px;">
            <h3 style="margin-bottom: 12px; color: #64748b;">Your Verification Code</h3>
            <div style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #4f46e5; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">
              ${otp}
            </div>
          </div>
          
          <div class="alert-box" style="background-color: #fffbeb; border-left: 4px solid #f59e0b; color: #92400e;">
            <strong>Time Sensitive:</strong> This code will expire in 10 minutes. If you did not request a password reset, please ignore this email or contact security immediately.
          </div>
        </div>
        <div class="footer">&copy; ${YEAR} ${APP_NAME}. All rights reserved.</div>
      </div>
    </body></html>`;

  return api.sendTransacEmail(email);
};

// ─── Admission Application Received ───────────────────────────────────────────
export const sendAdmissionRequestReceivedEmail = async (request) => {
  const email = new SibApiV3Sdk.SendSmtpEmail();
  email.subject = `Admission Request Received — ${request.organizationName}`;
  email.sender = SENDER;
  email.to = [{ email: request.parent.email, name: request.parent.fullName }];

  email.htmlContent = `
    <!DOCTYPE html><html><head><style>${saasStyles}</style></head>
    <body>
      <div class="wrapper">
        <div class="header">
          <h1 class="logo">${request.organizationName}</h1>
          <span class="badge badge-neutral">Application Received</span>
        </div>
        <div class="content">
          <p class="text">Dear ${request.parent.fullName},</p>
          <p class="text">Thank you for submitting an admission application for <strong>${request.branchName}</strong>. We have successfully received your details.</p>
          <div class="cred-card">
            <table class="cred-table">
              <tr><td class="cred-label">Application ID</td><td class="cred-value">${request.applicationNumber || request._id.toString().slice(-8)}</td></tr>
              <tr><td class="cred-label">Applicants</td><td class="cred-value" style="font-family: inherit;">${request.students.length}</td></tr>
            </table>
          </div>
          <p class="text">Our administration team will review your application and respond within 5-7 business days. You will receive an email notification once a decision has been made.</p>
        </div>
        <div class="footer">&copy; ${YEAR} Powered by ${APP_NAME}</div>
      </div>
    </body></html>`;
  return api.sendTransacEmail(email);
};

// ─── Admission Approved (Parent Credentials) ──────────────────────────────────
export const sendApprovalEmailWithCredentials = async (
  request,
  credentials,
) => {
  const email = new SibApiV3Sdk.SendSmtpEmail();
  email.subject = `Admission Approved — Welcome to ${request.organizationName}`;
  email.sender = SENDER;
  email.to = [{ email: request.parent.email, name: request.parent.fullName }];

  let studentsHtml = credentials.students
    .map(
      (student) => `
    <div class="cred-card" style="margin-top: 16px;">
      <h3>Student Profile: ${student.name}</h3>
      <table class="cred-table">
        ${student.admissionNo ? `<tr><td class="cred-label">Admission Number</td><td class="cred-value">${student.admissionNo}</td></tr>` : ''}
        <tr><td class="cred-label">Login ID</td><td class="cred-value">${student.loginId}</td></tr>
        <tr><td class="cred-label">Temporary Password</td><td class="cred-value">${student.password}</td></tr>
      </table>
    </div>
  `,
    )
    .join("");

  email.htmlContent = `
    <!DOCTYPE html><html><head><style>${saasStyles}</style></head>
    <body>
      <div class="wrapper">
        <div class="header">
          <h1 class="logo">${request.organizationName}</h1>
          <span class="badge badge-success">Admission Approved</span>
        </div>
        <div class="content">
          <p class="text">Dear ${request.parent.fullName},</p>
          <p class="text">We are pleased to inform you that the admission application for your ward at <strong>${request.branchName}</strong> has been approved.</p>
          
          <div class="cred-card">
            <h3>Parent Portal Credentials</h3>
            <table class="cred-table">
              <tr><td class="cred-label">Login ID</td><td class="cred-value">${credentials.parent.loginId}</td></tr>
              <tr><td class="cred-label">Temporary Password</td><td class="cred-value">${credentials.parent.password}</td></tr>
            </table>
          </div>
          ${studentsHtml}
          
          <p class="text" style="font-size: 13px; margin-top: 24px;">For security purposes, please change your passwords immediately after your first login.</p>
          <a href="${APP_URL}/login" class="btn">Access Dashboard</a>
        </div>
        <div class="footer">&copy; ${YEAR} Powered by ${APP_NAME}</div>
      </div>
    </body></html>`;
  return api.sendTransacEmail(email);
};

// ─── School Creation (Principal Credentials) ──────────────────────
export const sendPrincipalCredentialsEmail = async (
  school,
  loginId,
  password,
) => {
  const toEmail = school.principalEmail;
  const toName = school.principalName || "Principal";

  if (!toEmail) {
    console.error(
      "Critical: No email provided for principal credentials dispatch.",
    );
    return;
  }

  const email = new SibApiV3Sdk.SendSmtpEmail();
  email.subject = `Your Administrative Account is Ready — ${APP_NAME}`;
  email.sender = SENDER;
  email.to = [{ email: toEmail, name: toName }];

  email.htmlContent = `
    <!DOCTYPE html><html><head><style>${saasStyles}</style></head>
    <body>
      <div class="wrapper">
        <div class="header">
          <h1 class="logo">${APP_NAME}</h1>
          <span class="badge badge-success">Account Provisioned</span>
        </div>
        <div class="content">
          <p class="text">Dear ${toName},</p>
          <p class="text">Your administrative (Principal) account for <strong>${school.schoolName || "your institution"}</strong> has been successfully provisioned. You can now access the school management platform.</p>
          
          <div class="cred-card">
            <h3>Login Credentials</h3>
            <table class="cred-table">
              <tr><td class="cred-label">Access Level</td><td class="cred-value" style="font-family: inherit;">Principal / Branch Admin</td></tr>
              <tr><td class="cred-label">Login ID</td><td class="cred-value">${loginId}</td></tr>
              <tr><td class="cred-label">Temporary Password</td><td class="cred-value">${password}</td></tr>
            </table>
          </div>
          
          <p class="text" style="font-size: 13px;">For security purposes, you will be required to update your password upon your first login.</p>
          <a href="${APP_URL}/login" class="btn">Log in to Dashboard</a>
        </div>
        <div class="footer">&copy; ${YEAR} ${APP_NAME}. All rights reserved.</div>
      </div>
    </body></html>`;
  return api.sendTransacEmail(email);
};

// ─── Staff Credentials (Admin, Teacher, Accountant, General) ──────────────────
export const sendStaffCredentialsEmail = async (
  user,
  loginId,
  password,
  schoolName,
  role,
) => {
  if (!user.email) return;

  const email = new SibApiV3Sdk.SendSmtpEmail();
  const formattedRole = role.charAt(0).toUpperCase() + role.slice(1);
  email.subject = `Your ${formattedRole} Account is Ready — ${APP_NAME}`;
  email.sender = SENDER;
  email.to = [{ email: user.email, name: user.name }];

  email.htmlContent = `
    <!DOCTYPE html><html><head><style>${saasStyles}</style></head>
    <body>
      <div class="wrapper">
        <div class="header">
          <h1 class="logo">${APP_NAME}</h1>
        </div>
        <div class="content">
          <p class="text">Hello ${user.name},</p>
          <p class="text">Your account has been created for <strong>${schoolName}</strong>.</p>
          
          <div class="cred-card">
            <h3>Login Details</h3>
            <table class="cred-table">
              <tr><td class="cred-label">Role</td><td class="cred-value" style="font-family: inherit;">${formattedRole}</td></tr>
              <tr><td class="cred-label">Login ID</td><td class="cred-value">${loginId}</td></tr>
              <tr><td class="cred-label">Temporary Password</td><td class="cred-value">${password}</td></tr>
            </table>
          </div>
          
          <p class="text" style="font-size: 13px;">Please change your password immediately after logging in.</p>
          <a href="${APP_URL}/login" class="btn">Log in to Platform</a>
        </div>
        <div class="footer">&copy; ${YEAR} ${APP_NAME}. All rights reserved.</div>
      </div>
    </body></html>`;
  return api.sendTransacEmail(email);
};

// Keeping legacy wrappers for backward compatibility:
export const sendAdminCredentialsEmail = (user, id, pass, school) =>
  sendStaffCredentialsEmail(user, id, pass, school, "Admin");
export const sendTeacherCredentialsEmail = (user, id, pass, school) =>
  sendStaffCredentialsEmail(user, id, pass, school, "Teacher");
export const sendAccountantCredentialsEmail = (user, id, pass, school) =>
  sendStaffCredentialsEmail(user, id, pass, school, "Accountant");

// ─── Organization Credentials ────────────────────────────────────────────────
export const sendOrganizationCredentialsEmail = async (
  request,
  organizationId,
  plainPassword,
  branchCreationId,
) => {
  const email = new SibApiV3Sdk.SendSmtpEmail();
  email.subject = `Organization Approved — Welcome to ${APP_NAME}`;
  email.sender = SENDER;
  email.to = [{ email: request.officialEmail, name: request.organizationName }];

  email.htmlContent = `
    <!DOCTYPE html><html><head><style>${saasStyles}</style></head>
    <body>
      <div class="wrapper">
        <div class="header">
          <h1 class="logo">${APP_NAME}</h1>
          <span class="badge badge-success">Organization Active</span>
        </div>
        <div class="content">
          <p class="text">Welcome aboard, ${request.adminName}.</p>
          <p class="text">Your organization <strong>${request.organizationName}</strong> has been verified and is now live on the platform. You may now begin provisioning your institution.</p>
          
          <div class="cred-card">
            <h3>Organization Credentials</h3>
            <table class="cred-table">
              <tr><td class="cred-label">Login ID</td><td class="cred-value">${organizationId}</td></tr>
              <tr><td class="cred-label">Temporary Password</td><td class="cred-value">${plainPassword}</td></tr>
              <tr><td class="cred-label" style="padding-top:16px;">Creation Token</td><td class="cred-value" style="padding-top:16px;">${branchCreationId}</td></tr>
            </table>
          </div>
          
          <div class="alert-box">
            <strong>Security Notice:</strong> Do not share your Branch Creation Token with unauthorized personnel. Please reset your password upon first login.
          </div>
          
          <a href="${APP_URL}/organization/login" class="btn">Access Console</a>
        </div>
        <div class="footer">&copy; ${YEAR} ${APP_NAME}. All rights reserved.</div>
      </div>
    </body></html>`;
  return api.sendTransacEmail(email);
};

// ─── Application Rejections ──────────────────────────────────────────────────
export const sendOrganizationRejectionEmail = async (request, reason) => {
  const email = new SibApiV3Sdk.SendSmtpEmail();
  email.subject = `Application Status Update — ${APP_NAME}`;
  email.sender = SENDER;
  email.to = [
    {
      email: request.officialEmail,
      name: request.adminName || request.organizationName,
    },
  ];

  email.htmlContent = `
    <!DOCTYPE html><html><head><style>${saasStyles}</style></head>
    <body>
      <div class="wrapper">
        <div class="header">
          <h1 class="logo">${APP_NAME}</h1>
          <span class="badge badge-danger">Application Declined</span>
        </div>
        <div class="content">
          <p class="text">Dear ${request.adminName || "Applicant"},</p>
          <p class="text">Thank you for your interest in joining ${APP_NAME}. After careful review of your application for <strong>${request.organizationName}</strong>, we are unable to approve your request at this time.</p>
          
          ${reason ? `<div class="alert-box" style="background: #f9fafb; border-color: #9ca3af; color: #4b5563;"><strong>Reason provided:</strong><br/>${reason}</div>` : ""}
          
          <p class="text">If you believe this decision was made in error, or if you have corrected the issues mentioned above, you are welcome to submit a new application.</p>
        </div>
        <div class="footer">If you have any questions, please contact <a href="mailto:support@graphura.com">support@graphura.com</a>.<br/>&copy; ${YEAR} ${APP_NAME}.</div>
      </div>
    </body></html>`;
  return api.sendTransacEmail(email);
};

export const sendRejectionEmail = async (request, reason) => {
  return sendOrganizationRejectionEmail(request, reason);
};

export const sendSchoolRejectionEmail = async (request, reason) => {
  if (!request.officialEmail) return;

  const email = new SibApiV3Sdk.SendSmtpEmail();
  email.subject = `School Registration Status Update — ${APP_NAME}`;
  email.sender = SENDER;
  email.to = [
    {
      email: request.officialEmail,
      name: request.schoolName || "School Admin",
    },
  ];

  const reasonContent = reason && reason.trim() 
    ? reason.trim() 
    : "No specific reason was provided by the administration.";

  email.htmlContent = `
    <!DOCTYPE html><html><head><style>${saasStyles}</style></head>
    <body>
      <div class="wrapper">
        <div class="header">
          <h1 class="logo">${APP_NAME}</h1>
          <span class="badge badge-danger">Registration Rejected</span>
        </div>
        <div class="content">
          <p class="text">Dear Applicant,</p>
          <p class="text">Thank you for your interest in registering <strong>${request.schoolName}</strong> on the ${APP_NAME} platform. After reviewing your request, we regret to inform you that your registration application has been rejected.</p>
          
          <div class="alert-box" style="background: #fef2f2; border-left: 4px solid #ef4444; color: #991b1b; padding: 16px;">
            <strong>Reason for Rejection:</strong><br/>
            ${reasonContent}
          </div>
          
          <p class="text">If applicable, you may correct any issues and submit a new school registration request from your console.</p>
        </div>
        <div class="footer">If you have any questions, please contact <a href="mailto:support@graphura.com">support@graphura.com</a>.<br/>&copy; ${YEAR} ${APP_NAME}. All rights reserved.</div>
      </div>
    </body></html>`;

  return api.sendTransacEmail(email);
};

export const sendSchoolApprovalOfficialNotificationEmail = async (request) => {
  if (!request.officialEmail) {
    throw new Error("Official Email is missing");
  }

  const email = new SibApiV3Sdk.SendSmtpEmail();
  email.subject = `Institution Successfully Onboarded — ${APP_NAME}`;
  email.sender = SENDER;
  email.to = [
    {
      email: request.officialEmail,
      name: request.schoolName || "School Admin",
    },
  ];

  email.htmlContent = `
    <!DOCTYPE html><html><head><style>${saasStyles}</style></head>
    <body>
      <div class="wrapper">
        <div class="header">
          <h1 class="logo">${APP_NAME}</h1>
          <span class="badge badge-success">Registration Approved</span>
        </div>
        <div class="content">
          <p class="text">Dear Administrator,</p>
          <p class="text">We are pleased to inform you that the registration request for <strong>${request.schoolName}</strong> has been approved. Your institution has been successfully onboarded to the ${APP_NAME} platform.</p>
          
          <div class="alert-box" style="background-color: #eff6ff; border-left: 4px solid #3b82f6; color: #1e3a8a; padding: 16px;">
            <strong>Credential Dispatch Notification:</strong><br/>
            For security reasons, access credentials have been sent directly to the registered Principal Email (<strong>${request.principalEmail}</strong>). The Principal can use those credentials to access the administrative dashboard.
          </div>
          
          <p class="text">Please note that credentials are not shared with the Official Email for security compliance. If the Principal does not receive their credentials within 24 hours, please contact our support desk.</p>
        </div>
        <div class="footer">Need help? Contact <a href="mailto:support@graphura.com">support@graphura.com</a>.<br/>&copy; ${YEAR} ${APP_NAME}. All rights reserved.</div>
      </div>
    </body></html>`;

  return api.sendTransacEmail(email);
};
// ─── Organization Subscription Renewal Notice ───────────────────────────────
export const sendOrganizationRenewalEmail = async (
  organization,
  amountPaid,
  newExpiryDate,
) => {
  if (!organization.officialEmail) return;

  const email = new SibApiV3Sdk.SendSmtpEmail();
  email.subject = `Subscription Successfully Renewed — ${APP_NAME}`;
  email.sender = SENDER;
  email.to = [
    { email: organization.officialEmail, name: organization.organizationName },
  ];

  email.htmlContent = `
    <!DOCTYPE html><html><head><style>${saasStyles}</style></head>
    <body>
      <div class="wrapper">
        <div class="header">
          <h1 class="logo">${APP_NAME}</h1>
          <span class="badge badge-success">Subscription Active</span>
        </div>
        <div class="content">
          <p class="text">Dear Admin,</p>
          <p class="text">We have successfully verified your payment with our sales department. Your subscription for <strong>${organization.organizationName}</strong> has been successfully extended.</p>
          
          <div class="cred-card">
            <h3>Renewal Transaction Details</h3>
            <table class="cred-table">
              <tr><td class="cred-label">Billing Cycle</td><td class="cred-value" style="font-family: inherit;">${organization.billing.cycle}</td></tr>
              <tr><td class="cred-label">Amount Accounted</td><td class="cred-value">₹${amountPaid.toLocaleString("en-IN")}</td></tr>
              <tr><td class="cred-label">New Expiry Date</td><td class="cred-value">${new Date(newExpiryDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td></tr>
            </table>
          </div>
          
          <p class="text">Your account configurations and tier resource limits remain active. Thank you for partnering with us.</p>
          <a href="${APP_URL}/organization/login" class="btn">Go to Dashboard</a>
        </div>
        <div class="footer">&copy; ${YEAR} ${APP_NAME}. All rights reserved.</div>
      </div>
    </body></html>`;
  return api.sendTransacEmail(email);
};

// ─── Organization Deactivation Notice ───────────────────────────────────────
export const sendOrganizationDeactivatedEmail = async (organization) => {
  if (!organization.officialEmail) return;

  const email = new SibApiV3Sdk.SendSmtpEmail();
  email.subject = `CRITICAL: Account Access Deactivated — ${APP_NAME}`;
  email.sender = SENDER;
  email.to = [
    { email: organization.officialEmail, name: organization.organizationName },
  ];

  email.htmlContent = `
    <!DOCTYPE html><html><head><style>${saasStyles}</style></head>
    <body>
      <div class="wrapper">
        <div class="header">
          <h1 class="logo">${APP_NAME}</h1>
          <span class="badge badge-danger">Deactivated</span>
        </div>
        <div class="content">
          <p class="text">Dear Admin,</p>
          <p class="text">This is an urgent notification that the subscription for <strong>${organization.organizationName}</strong> has expired, and the grace period has concluded without an update from the sales desk.</p>
          
          <div class="alert-box">
            <strong>Access Restrictions Applied:</strong> Management workspace dashboards, operational access for staff members, and portal routes for students are temporarily offline.
          </div>
          
          <p class="text">Your structural workspace layout data, profiles, and registers remain safe. To clear updates or authorize a cycle renewal plan, contact your sales representative or the billing division right away.</p>
        </div>
        <div class="footer">Contact <a href="mailto:sales@graphura.com">sales@graphura.com</a> for recovery context.<br/>&copy; ${YEAR} ${APP_NAME}.</div>
      </div>
    </body></html>`;
  return api.sendTransacEmail(email);
};

// ─── Organization Expiry/Termination Notice ─────────────────────────────────
export const sendOrganizationExpiredEmail = async (organization) => {
  if (!organization.officialEmail) return;

  const email = new SibApiV3Sdk.SendSmtpEmail();
  email.subject = `TERMINATION WARNING: Account Marked Expired — ${APP_NAME}`;
  email.sender = SENDER;
  email.to = [
    { email: organization.officialEmail, name: organization.organizationName },
  ];

  email.htmlContent = `
    <!DOCTYPE html><html><head><style>${saasStyles}</style></head>
    <body>
      <div class="wrapper">
        <div class="header">
          <h1 class="logo">${APP_NAME}</h1>
          <span class="badge badge-danger" style="background-color: #7f1d1d; color: #ffffff;">Terminated Status</span>
        </div>
        <div class="content">
          <p class="text">Dear Admin,</p>
          <p class="text">Despite previous notifications regarding non-payment parameters, your account status for <strong>${organization.organizationName}</strong> has exceeded the maximum lifecycle safety thresholds.</p>
          
          <div class="alert-box" style="background-color: #fef2f2; border-left: 4px solid #b91c1c; color: #7f1d1d;">
            <strong>Data Deletion Lifecycle Notice:</strong> This organization configuration is permanently tagged as **Expired**. Your records are safely cached but are now flagged for automated system archiving and eventual erasure.
          </div>
          
          <p class="text">If this is a mistake, or if a manual bank dispatch was authorized through sales, please escalate this to engineering immediately.</p>
        </div>
        <div class="footer">Urgent Queries: <a href="mailto:support@graphura.com">support@graphura.com</a><br/>&copy; ${YEAR} ${APP_NAME}.</div>
      </div>
    </body></html>`;
  return api.sendTransacEmail(email);
};

// ─── Admission Cancellation Email ─────────────────────────────────────────────
export const sendAdmissionCancellationEmail = async ({
  parentEmail,
  parentName,
  studentName,
  schoolName,
  reason,
}) => {
  if (!parentEmail) throw new Error("Missing recipient email");
  const email = new SibApiV3Sdk.SendSmtpEmail();
  email.subject = `Admission Cancelled — ${studentName} — ${schoolName}`;
  email.sender = SENDER;
  email.to = [{ email: parentEmail, name: parentName || "Parent" }];

  email.htmlContent = `
    <!DOCTYPE html><html><head><style>${saasStyles}</style></head>
    <body>
      <div class="wrapper">
        <div class="header">
          <h1 class="logo">${schoolName}</h1>
          <span class="badge badge-danger">Admission Cancelled</span>
        </div>
        <div class="content">
          <p class="text">Dear ${parentName},</p>
          <p class="text">We are writing to inform you that the admission for your child, <strong>${studentName}</strong>, at <strong>${schoolName}</strong> has been cancelled.</p>
          
          <div class="alert-box" style="background-color: #fef2f2; border-left: 4px solid #ef4444; color: #991b1b; padding: 16px;">
            <strong>Reason for Cancellation:</strong><br/>
            ${reason || "Not specified by administration."}
          </div>
          
          <p class="text">Following this cancellation, the student's portal access has been immediately deactivated, and they will no longer be able to log in to the portal.</p>
          <p class="text">If you have any questions or require further clarification regarding this action, please contact the school administration office directly.</p>
        </div>
        <div class="footer">&copy; ${YEAR} Powered by ${APP_NAME}</div>
      </div>
    </body></html>`;
  return api.sendTransacEmail(email);
};

// ─── PTM Invitation Email ─────────────────────────────────────────────
export const sendPTMInvitationEmail = async ({
  parentEmail,
  parentName,
  schoolName,
  meetingTitle,
  className,
  date,
  time,
  venue,
  meetingMode,
  agenda,
  reminderInfo,
}) => {
  if (!parentEmail) throw new Error("Missing recipient email");
  const email = new SibApiV3Sdk.SendSmtpEmail();
  email.subject = `Parent-Teacher Meeting (PTM) Invitation — ${schoolName}`;
  email.sender = SENDER;
  email.to = [{ email: parentEmail, name: parentName || "Parent" }];

  email.htmlContent = `
    <!DOCTYPE html><html><head><style>${saasStyles}</style></head>
    <body>
      <div class="wrapper">
        <div class="header">
          <h1 class="logo">${schoolName}</h1>
          <span class="badge badge-success">PTM Invitation</span>
        </div>
        <div class="content">
          <p class="text">Dear ${parentName},</p>
          <p class="text">You are cordially invited to the upcoming Parent-Teacher Meeting (PTM) for <strong>${className}</strong>.</p>
          
          <div class="cred-card">
            <h3 style="margin-bottom: 12px; color: #111827;">Meeting Details</h3>
            <table class="cred-table">
              <tr><td class="cred-label">Meeting Title</td><td class="cred-value" style="font-family: inherit; font-weight: 500;">${meetingTitle}</td></tr>
              <tr><td class="cred-label">Class</td><td class="cred-value" style="font-family: inherit; font-weight: 500;">${className}</td></tr>
              <tr><td class="cred-label">Date</td><td class="cred-value" style="font-family: inherit; font-weight: 500;">${date}</td></tr>
              <tr><td class="cred-label">Time</td><td class="cred-value" style="font-family: inherit; font-weight: 500;">${time}</td></tr>
              <tr><td class="cred-label">Venue</td><td class="cred-value" style="font-family: inherit; font-weight: 500;">${venue}</td></tr>
              <tr><td class="cred-label">Meeting Mode</td><td class="cred-value" style="font-family: inherit; font-weight: 500;">${meetingMode}</td></tr>
            </table>
          </div>
          
          ${agenda ? `
          <h3 style="font-size: 14px; margin-bottom: 8px; color: #111827;">Agenda:</h3>
          <p class="text" style="background: #f9fafb; padding: 16px; border: 1px solid #e5e7eb; border-radius: 6px; white-space: pre-wrap; font-size: 14px; color: #4b5563;">${agenda}</p>
          ` : ''}
          
          <div class="alert-box" style="background-color: #eff6ff; border-left: 4px solid #3b82f6; color: #1e3a8a; padding: 16px;">
            <strong>Reminder Information:</strong><br/>
            ${reminderInfo || "Please make sure to attend the meeting on time."}
          </div>
          
          <p class="text">We look forward to discussing your child's progress. Your presence and feedback are highly valuable to us.</p>
        </div>
        <div class="footer">&copy; ${YEAR} Powered by ${APP_NAME}</div>
      </div>
    </body></html>`;

  return api.sendTransacEmail(email);
};


