const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const UserSchema = mongoose.Schema({
	fullname: { type: String, default: '' },
	email: { type: String, unique: true, required: true },
	password: { type: String, default: '' },
	uploadedFiles: [{title: String, path: String, chunks: [{type: Number}]}],
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

UserSchema.methods.findFile = function(path) {
	for(let i = 0; i < this.uploadedFiles.length; i++) {
		if(this.uploadedFiles[i].path == "/uploads/" + path) {
			return this.uploadedFiles[i];
		}
	}
	return false;
}

UserSchema.methods.searchFile = function(path) {
	for(let i = 0; i < this.uploadedFiles.length; i++) {
		if(this.uploadedFiles[i].path == "/uploads/" + path) {
			return this.uploadedFiles[i];
		}
	}
	return false;
}




module.exports = mongoose.model('User', UserSchema);
