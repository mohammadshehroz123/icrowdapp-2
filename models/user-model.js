const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const UserSchema = mongoose.Schema({
	firstLogin: { type: Boolean, default: true },
	google: { type: String, default: '' },

	country: { type: String, default: '' },
	profilePhoto: { type: String, default: '' },

	first_name: { type: String, default: '' },
	last_name: { type: String, default: '' },
	fullname: { type: String, default: '' },

	email: { type: String, unique: true, required: true },
	password: { type: String, default: '' },

	address: { type: String, default: '' },
	city: { type: String, default: '' },
	state: { type: String, default: '' },

	zip_code: { type: String, default: '' },
	contact_number: { type: String, default: '' },
	
	uploadedImages: {type: Array},
	
	resetPasswordToken: { type: String, required: false },
	resetPasswordExpires: { type: Date, required: false }
}, { timestamps: true });

UserSchema.methods.encryptPassword = function (password) {
	return bcrypt.hashSync(password, bcrypt.genSaltSync(10), null);
}

UserSchema.methods.comparePassword = function (password) {
	return bcrypt.compareSync(password, this.password);
}

UserSchema.methods.generatePasswordReset = function () {
	this.resetPasswordToken = crypto.randomBytes(20).toString('hex');
	this.resetPasswordExpires = Date.now() + 3600000; //expires in an hour
};

module.exports = mongoose.model('User', UserSchema);
