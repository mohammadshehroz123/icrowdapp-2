var nodemailer = require('nodemailer');

class MailSender {
	
	constructor() {
		this.transporter = nodemailer.createTransport({
			service: 'gmail',
			auth: {
				user: 'testmailnodemailer0@gmail.com',
				pass: 'ojakamkar4321'
			}
		});
	}
	
	sendMail(mailOptions, callback) {
		this.transporter.sendMail(mailOptions, function(error, info){
			callback(error, info);
		});
	}
	
}

module.exports = {MailSender};