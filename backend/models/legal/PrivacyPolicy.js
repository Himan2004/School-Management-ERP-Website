import mongoose from 'mongoose';

const PrivacyPolicySchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  collectionText: { type: String, required: true },
  usageText: { type: String },
  securityText: { type: String },
  sharingText: { type: String },
  ownershipText: { type: String },
  cookiesText: { type: String },
  consentText: { type: String },
  accuracyText: { type: String },
  supportText: { type: String },
  lastUpdated: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const PrivacyPolicy = mongoose.models.PrivacyPolicy || mongoose.model('PrivacyPolicy', PrivacyPolicySchema);
export default PrivacyPolicy;
