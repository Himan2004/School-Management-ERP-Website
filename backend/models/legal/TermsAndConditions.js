import mongoose from 'mongoose';

const TermsAndConditionsSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  acceptanceText: { type: String, required: true },
  servicesText: { type: String },
  securityText: { type: String },
  responsibilityText: { type: String },
  usageText: { type: String },
  terminationText: { type: String },
  liabilityText: { type: String },
  lastUpdated: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const TermsAndConditions = mongoose.models.TermsAndConditions || mongoose.model('TermsAndConditions', TermsAndConditionsSchema);
export default TermsAndConditions;
