import mongoose from 'mongoose';


const admissionRequestSchema = new mongoose.Schema({

    // ─── Step 1: Institution Selection ───────────────────────────────────────────
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: [true, 'Organization is required']
    },

    branch: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: [true, 'Branch is required']
    },

    organizationName: {
        type: String,
        required: true
    },

    branchName: {
        type: String,
        required: true
    },

    // ─── Step 2: Parent / Guardian Details ───────────────────────────────────────
    parent: {
        fullName: {
            type: String,
            required: [true, 'Parent full name is required'],
            trim: true
        },

        email: {
            type: String,
            required: [true, 'Parent email is required'],
            trim: true,
            lowercase: true
        },

        primaryContact: {
            type: String,
            required: [true, 'Primary contact is required'],
            trim: true
        },

        alternateContact: {
            type: String,
            trim: true,
            default: null
        },

        fatherName: {
            type: String,
            trim: true,
            default: null
        },

        motherName: {
            type: String,
            trim: true,
            default: null
        },

        relation: {
            type: String,
            enum: ['Father', 'Mother', 'Guardian'],
            required: [true, 'Relation is required']
        },

        gender: {
            type: String,
            enum: ['Male', 'Female', 'Other', null],
            default: null
        },

        address: {
            street: { type: String, trim: true },
            city: { type: String, trim: true, required: [true, 'City is required'] },
            state: { type: String, trim: true, required: [true, 'State is required'] },
            pincode: { type: String, trim: true, required: [true, 'Pincode is required'] }
        },

        aadharNumber: {
            type: String,
            trim: true,
            default: null
        },

        notifications: {
            sms: { type: Boolean, default: false },
            email: { type: Boolean, default: false },
            push: { type: Boolean, default: false }
        }
    },

    // ─── Step 3: Student Profiles (Dynamic Array) ────────────────────────────────
    students: [
        {
            fullName: {
                type: String,
                required: [true, 'Student full name is required'],
                trim: true
            },

            gender: {
                type: String,
                enum: ['Male', 'Female', 'Other', null],
                default: null
            },

            dob: {
                type: Date,
                required: [true, 'Date of birth is required']
            },

            bloodGroup: {
                type: String,
                trim: true,
                default: null
            },

            class: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Class',
            },

            section: {
                type: String,
                trim: true,
                default: null
            },

            academicYear: {
                type: String,
                default: '2024-25'
            },

            rollNumber: {
                type: String,
                trim: true,
                default: null
            },

            enrollmentNumber: {
                type: String,
                default: 'PENDING'
            },

            admissionDate: {
                type: Date,
                default: Date.now
            },

            transport: {
                required: {
                    type: Boolean,
                    default: false
                },
                busRoute: {
                    type: String,
                    trim: true,
                    default: null
                }
            },

            healthNotes: {
                type: String,
                trim: true,
                default: null
            },

            previousSchool: {
                type: String,
                trim: true,
                default: null
            },

            tc: {
                tcNumber: { type: String, default: null },
                tcDate: { type: Date, default: null }
            },

            // Stored as file paths / URLs after upload (e.g. S3 or local)
            photo: String,
            documents: {
                studentAadhaar: { url: String, status: { type: String, enum: ['submitted', 'verified', 'rejected'], default: 'submitted' }, remarks: String },
                parentAadhaar: { url: String, status: { type: String, enum: ['submitted', 'verified', 'rejected'], default: 'submitted' }, remarks: String },
                previousYearMarksheet: { url: String, status: { type: String, enum: ['submitted', 'verified', 'rejected'], default: 'submitted' }, remarks: String },
                transferCertificate: { url: String, status: { type: String, enum: ['submitted', 'verified', 'rejected'], default: 'submitted' }, remarks: String },
                birthCertificate: { url: String, status: { type: String, enum: ['submitted', 'verified', 'rejected'], default: 'submitted' }, remarks: String },
            },
            feeDetails: {
                admissionFee: { type: Number, default: 0 },
                tuitionFee: { type: Number, default: 0 },
                discount: { type: Number, default: 0 },
                scholarship: { type: Number, default: 0 },
                lateFee: { type: Number, default: 0 },
                otherCharges: { type: Number, default: 0 },
                totalPayable: { type: Number, default: 0 },
                amountPaid: { type: Number, default: 0 },
                remainingAmount: { type: Number, default: 0 },
                paymentStatus: { type: String, default: 'Unpaid' },
                paymentMode: { type: String, default: '' },
                transactionId: { type: String, default: null },
                chequeNumber: { type: String, default: null },
                ddNumber: { type: String, default: null },
                receiptNumber: { type: String, default: null },
                paymentDate: { type: String, default: null },
                remarks: { type: String, default: null }
            }
        }
    ],

    // ─── Application Meta ─────────────────────────────────────────────────────────
    // ─── Application Meta ─────────────────────────────────────────────────────────
    status: {
        type: String,
        enum: ['pending', 'under_review', 'approved', 'rejected', 'cancelled', 'transferred'], // ✅ Added 'transferred'
        default: 'pending'
    },

    applicationNumber: {
        type: String,
        unique: true,
        sparse: true   // generated after submission
    },

    submittedAt: {
        type: Date,
        default: null
    },

    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },

    reviewedAt: {
        type: Date,
        default: null
    },

    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },

    approvedAt: {
        type: Date,
        default: null
    },

    credentialsSent: {
        type: Boolean,
        default: false
    },

    isCredentialsSent: {
        type: Boolean,
        default: false
    },

    admissionStatus: {
        type: String,
        default: 'pending'
    },

    admissionSource: {
        type: String,
        enum: ['ONLINE', 'ADMIN'],
        default: 'ONLINE'
    },

    remarks: {
        type: String,
        default: null
    },

    // Consent checkbox from Step 4
    declarationAccepted: {
        type: Boolean,
        required: [true, 'Declaration must be accepted'],
        default: false
    },

    feeDetails: {
        admissionFee: { type: Number, default: 0 },
        discount: { type: Number, default: 0 },
        scholarship: { type: Number, default: 0 },
        lateFee: { type: Number, default: 0 },
        otherCharges: { type: Number, default: 0 },
        totalPayable: { type: Number, default: 0 },
        amountPaid: { type: Number, default: 0 },
        remainingAmount: { type: Number, default: 0 },
        paymentStatus: { type: String, default: 'Unpaid' },
        paymentMode: { type: String, default: '' },
        transactionId: { type: String, default: null },
        chequeNumber: { type: String, default: null },
        ddNumber: { type: String, default: null },
        receiptNumber: { type: String, default: null },
        paymentDate: { type: String, default: null },
        remarks: { type: String, default: null }
    }

}, { timestamps: true });

// ─── Auto-generate application number before saving ───────────────────────────
admissionRequestSchema.pre('save', async function (next) {
    if (this.applicationNumber) return next();

    const count = await mongoose.model('AdmissionRequest').countDocuments();
    const year = new Date().getFullYear();
    this.applicationNumber = `APP-${year}-${String(count + 1).padStart(5, '0')}`;
    // e.g. APP-2025-00001

    next();
});

// ─── Indexes ──────────────────────────────────────────────────────────────────
admissionRequestSchema.index({ organization: 1 });
admissionRequestSchema.index({ branch: 1 });
admissionRequestSchema.index({ status: 1 });
admissionRequestSchema.index({ applicationNumber: 1 });
admissionRequestSchema.index({ 'parent.email': 1 });
admissionRequestSchema.index({ 'parent.primaryContact': 1 });

export default mongoose.model('AdmissionRequest', admissionRequestSchema);