mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
    firstname: {
        type: String,
        required: true,
        minlength: 3,
    },
    lastname: {
        type: String,
        required: true,
        minlength: 3,
    },
    tel: {
        type: Number,
        required: true,
        length: 8,
    },
    email: {
        type: String,
        unique: true,
        required: true,
        minlength: 10,
        maxlength: 255,
    },
    password: {
        type: String,
        required: true,
        minlength: 8,
        maxlength: 512,
    },
    picture: String,
    type: String,
    state: {
        type: Boolean,
        default: false,
    },
    country: String,
    city: String,
    lat: String,
    lng: String,
    isAdmin: {
        type: Boolean,
        default: false,
    },
    ban: {
        type: Boolean,
        default: false
    },
    code: {
        type: String,
    },
}, { timestamps: true });

userSchema.index({ location: '2dsphere' });

userSchema.pre('save', function (next) {
    if (this.isModified('state') && this.state === true && this.ban === true) {
        this.state = false;
    }
    next();
});

userSchema.pre('ban', function (next) {
    if (this.isModified('ban') && this.ban === true) {
        this.ban = true;
    }
    next();
});

userSchema.methods.generateTokens = function () {
    const token = jwt.sign({ _id: this._id, isAdmin: this.isAdmin }, process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXP
        });
    return token;
}

module.exports = mongoose.model("User", userSchema);