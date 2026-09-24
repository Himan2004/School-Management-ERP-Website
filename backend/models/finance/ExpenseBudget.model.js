import mongoose from 'mongoose';

const expenseBudgetSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true,
    },
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true,
        index: true,
    },
    category: {
        type: String,
        required: true,
        trim: true,
        lowercase: true // e.g., 'electricity', 'transport'
    },
    allocatedAmount: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    academicYear: {
        type: String,
        required: true
    },
    setBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }
}, { timestamps: true });

// Ensure only one budget per category per year per school
expenseBudgetSchema.index({ school: 1, academicYear: 1, category: 1 }, { unique: true });

const ExpenseBudget = mongoose.model('ExpenseBudget', expenseBudgetSchema);
export default ExpenseBudget;