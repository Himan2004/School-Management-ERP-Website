import TermsAndConditions from '../../models/legal/TermsAndConditions.js';
import PrivacyPolicy from '../../models/legal/PrivacyPolicy.js';
import mongoose from 'mongoose';

const toSchoolId = (user) => user?.school?._id || user?.school;
const toOrgId = (user) => user?.school?.organization?._id || user?.school?.organization || user?.organizationId || user?.organization || user?.id;

export const getTermsAndConditions = async (req, res) => {
  try {
    const schoolIdRaw = toSchoolId(req.user);
    const orgIdRaw = toOrgId(req.user);
    if (!schoolIdRaw) return res.status(400).json({ success: false, message: 'Authentication Error: School ID missing' });
    
    let terms = await TermsAndConditions.findOne({ school: new mongoose.Types.ObjectId(schoolIdRaw) }).sort({ createdAt: -1 });
    
    if (!terms) {
      terms = await TermsAndConditions.create({
        organization: orgIdRaw,
        school: schoolIdRaw,
        acceptanceText: "By registering on the platform, the school agrees to follow all the terms and policies mentioned. The terms and conditions may be updated from time to time, and continued use of the platform means acceptance of the updated terms.",
        servicesText: "Platform helps schools manage students, teachers, attendance, and communication. Automation of academic records and administrative workflows. Note: Platform may be unavailable during updates or maintenance.",
        securityText: "Credential Privacy: Each administrator is responsible for maintaining the confidentiality of their login credentials. Users must not attempt to access data belonging to other schools or interfere with system security protocols.",
        responsibilityText: "Schools are solely responsible for the accuracy of the information they upload. Any legal or academic discrepancy arising from incorrect data entry is the school's responsibility.",
        usageText: "The platform should not be used for any illegal, harmful, or unauthorized activities. Misuse includes any attempt to bypass system limits or hack administrative features.",
        terminationText: "We reserve the right to suspend or terminate accounts that: Violate these terms or misuse the system. Fail to pay subscription fees within the billing cycle. Engage in illegal usage of platform features.",
        liabilityText: "The platform owners are not responsible for data loss caused by incorrect use, server outages, or unauthorized access resulting from the school's compromised credentials. In no event shall our team be liable for any indirect, incidental, or consequential damages arising out of your use of the platform.",
        lastUpdated: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      });
    }
    return res.status(200).json(terms);
  } catch (error) {
    console.error("Error in getTermsAndConditions:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
};

export const getPrivacyPolicy = async (req, res) => {
  try {
    const schoolIdRaw = toSchoolId(req.user);
    const orgIdRaw = toOrgId(req.user);
    if (!schoolIdRaw) return res.status(400).json({ success: false, message: 'Authentication Error: School ID missing' });

    let policy = await PrivacyPolicy.findOne({ school: new mongoose.Types.ObjectId(schoolIdRaw) }).sort({ createdAt: -1 });
    
    if (!policy) {
      policy = await PrivacyPolicy.create({
        organization: orgIdRaw,
        school: schoolIdRaw,
        collectionText: "We collect information essential for school operations, including school details, administrator information, student data, teacher records, and system usage data to ensure a seamless experience.",
        usageText: "The collected information is used exclusively to operate, maintain, and improve the school management platform, ensuring high performance and relevant feature updates for your institution.",
        securityText: "Secure Storage: All school data is stored securely using enterprise-grade encryption and is strictly protected from unauthorized access. We implement reasonable security measures to safeguard against data breaches.",
        sharingText: "We do not sell or share school data with third parties without explicit permission, except when legally required by law enforcement or regulatory authorities.",
        ownershipText: "Schools retain full ownership of all their data stored on the platform at all times.",
        cookiesText: "The platform may use cookies or similar tracking technologies to improve user experience, remember preferences, and analyze system performance.",
        consentText: "Student data is handled with extra layers of privacy and care. Schools are responsible for ensuring proper consent from parents/guardians where required by law.",
        accuracyText: "Transparency is key. Users can request corrections to their information at any time if they find any stored details to be incorrect or outdated.",
        supportText: "Our privacy team is here to help with your concerns.",
        lastUpdated: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      });
    }
    return res.status(200).json(policy);
  } catch (error) {
    console.error("Error in getPrivacyPolicy:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
};

import Policy from '../../models/common/Policy.js';
import School from '../../models/school/School.js';

export const getOfficialPolicies = async (req, res) => {
  try {
    let orgIdRaw = toOrgId(req.user);
    const schoolIdRaw = toSchoolId(req.user);
    
    // Fallback: If organizationId isn't directly on the token, fetch it via the school
    if (!orgIdRaw && schoolIdRaw) {
      const school = await School.findById(schoolIdRaw).select("organization").lean();
      orgIdRaw = school?.organization;
    }

    if (!orgIdRaw) {
      return res.status(400).json({ success: false, message: 'Unable to determine organization.' });
    }

    // Fetch active policies for this organization
    const policies = await Policy.find({ organizationId: orgIdRaw, status: "Active" })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ success: true, data: policies });
  } catch (error) {
    console.error("Error in getOfficialPolicies:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
};
