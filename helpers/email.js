var nodemailer = require('nodemailer');

class MailSender {
	
	constructor() {
		this.transporter = nodemailer.createTransport({
			service: 'gmail',
			auth: {
				user: 'ishantishant2020@gmail.com',
				pass: 'ishant123'
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