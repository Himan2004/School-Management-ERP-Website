import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },

    loginId: {
        type: String,
        required: true,
        unique: true,
        uppercase: true
    },

    email: {
        type: String,
        required: true,
        lowercase: true
    },

    password: {
        type: String,
        required: true,
        minlength: 6,
        select: false
    },

    role: {
        type: String,
        enum: ["principal", "admin", "teacher", "accountant", "parent", "student", "support_staff"],
        required: true
    },

    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "School",
        required: true
    },

    profileId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "profileModel"
    },

    profileModel: {
        type: String,
        enum: ["Principal", "Admin", "Teacher", "Accountant", "Parent", "Student", "StaffProfile"]
    },

    status: {
        type: String,
        enum: ["active", "inactive"],
        default: "active"
    }

}, { timestamps: true });

userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

userSchema.methods.comparePassword = async function (password) {
    return bcrypt.compare(password, this.password);
};

userSchema.methods.generateToken = function () {
    return jwt.sign(
        {
            id: this._id,
            role: this.role,
            school: this.school,
            loginId: this.loginId
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );
};

userSchema.methods.isActiveUser = function () {
    return this.status === "active";
};

userSchema.methods.updateProfileLink = async function (profileId, profileModel) {
    this.profileId = profileId;
    this.profileModel = profileModel;
    return this.save();
};

userSchema.methods.changePassword = async function (newPassword) {
    this.password = newPassword;
    return this.save();
};

userSchema.statics.findByLogin = function (loginId) {
    if (loginId) {
        loginId = loginId.toUpperCase();
    }
    return this.findOne({ loginId }).select("+password");
};

userSchema.statics.findByRole = function (role, schoolId) {
    return this.find({ role, school: schoolId, status: "active" });
};

userSchema.statics.deactivateUser = function (userId) {
    return this.findByIdAndUpdate(userId, { status: "inactive" }, { new: true });
};

const User = mongoose.model("User", userSchema);
// Alias to support schemas referencing "user" in lowercase.
mongoose.model("user", userSchema);
export default User;