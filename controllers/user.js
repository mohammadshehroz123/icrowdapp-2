'use strict';
var fs = require('fs');
var path = require('path');
var multer = require('multer');
var fetch = require('node-fetch');
var {authenticate} = require('../middleware/authenticate');

// Multer Middleware for uploading files
const storage = multer.diskStorage({
	destination(req, file, cb) {
		cb(null, path.join(__dirname, '../public/uploads/'));
	},
	filename(req, file, cb) {
		const ext = path.extname(file.originalname).toLowerCase();
		var datetimestamp = Date.now();
		var file_name = file.fieldname + '-' + datetimestamp + '.' + file.originalname.split('.')[file.originalname.split('.').length -1];
		cb(null, file_name);
	},
});

const upload = multer({
	storage,
	limits: { fileSize: 3000000 },
	fileFilter(req, file, cb) {
		const ext = path.extname(file.originalname).toLowerCase();
		if (ext !== ".xlsx") {
			cb(new Error("Error: Unacceptable file format"), false);
		} else {
			cb(null, true);
		}
	},
}).single('filetoupload');


module.exports = function (formidable, passport, validation, User, email) {
	return {
		setRouting: function (router) {
			router.get('/', this.homePage);

			router.get('/login', this.loginView);
			router.post('/login', validation.getLoginValidation, this.login);

			//router.get('/signup', this.signUpView);
			//router.post('/signup', validation.getSignupValidation, this.signUp);

			router.get('/forgot_password', this.forgotPasswordView);
			router.post('/forgot_password', this.forgotPassword);
			router.get('/auth/reset/:token', this.verifyToken);

			router.post('/reset_password', validation.resetPassword, this.resetPassword);

			router.get('/upload', authenticate, this.uploadView);
			router.post('/file/upload', authenticate, this.uploadFile);
			
			router.get('/details/uploads/:file', this.details);

			router.get('/testing', authenticate, this.testingView);
			router.post('/testing', authenticate, validation.validateNumber, this.testing);
			
			router.get('/dashboard', authenticate, this.dashboard);
			router.get('/logout', this.logOut);
		},

		homePage: function (req, res) {
			res.send("Welcome");
		},

		loginView: function (req, res) {
			let messages = req.flash('error');
			res.render("login", { hasErrors: (messages.length > 0) ? true : false, messages: messages });
		},

		login: passport.authenticate('local.login', {
			successRedirect: '/dashboard',
			failureRedirect: '/login',
			failureFlash: true
		}),

		signUpView: function (req, res) {
			let messages = req.flash('error');
			res.render('register', { hasErrors: (messages.length > 0) ? true : false, messages: messages });
		},

		signUp: passport.authenticate('local.signup', {
			successRedirect: '/login',
			failureRedirect: '/signup',
			failureFlash: true
		}),

		forgotPasswordView: function (req, res) {
			let messages = req.flash('error');
			res.render("forgot_password", { hasErrors: (messages.length > 0) ? true : false, hasSuccess: false, messages: messages });
		},

		forgotPassword: function (req, res) {
			User.findOne({ email: req.body.email }).then(function (user) {
				if (!user) {
					req.flash('error', ['User with this email does not exist']);
					res.redirect('/forgot_password');
				}
				else if (user) {
					user.generatePasswordReset();
					user.save().then(function (savedUser) {
						let link = "http://" + req.headers.host + "/auth/reset/" + savedUser.resetPasswordToken;

						let mailSender = new email.MailSender();
						const mailOptions = {
							from: 'testmailnodemailer0@gmail.com',
							to: savedUser.email,
							subject: "ICrowd Web Application",
							text: `Hi ${user.fullname} \n Please click on the following link ${link} to reset your password. \n\n If you did not request this, please ignore this email and your password will remain unchanged.\n`
						};

						mailSender.sendMail(mailOptions, function (error, info) {
							if (info) {
								res.render("forgot_password", { hasErrors: false, hasSuccess: true, messages: ['Reset link sent successfully. Check your email' ] });
							}
							if (error) {
								console.log(error);
							}
						});
					});
				}
				else { }
			})
		},

		verifyToken: function (req, res) {
			User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }).then(function (user) {
				if (!user) {
					res.render('error404');
				}
				else if (user) {
					res.render("reset_password", { user: user._id, hasErrors: false });
				}
				else {
				}
			});
		},

		resetPassword: function (req, res) {
			User.findOne({ _id: req.body.user }).then(function (user) {
				user.password = user.encryptPassword(req.body.password);
				user.resetPasswordToken = '';
				user.resetPasswordExpires = '';

				user.save().then((savedUser) => {
					res.redirect('/login');
				});
			}).catch(function (err) {
				res.render("error404");
			});
		},

		dashboard: function (req, res) {
			if(req.user) {
				return res.render("dashboard", { welcome_message: "Welcome " + req.user.fullname });
			}
			else {
				res.redirect('/login');
			}
		},
		
		uploadView: function(req, res) {
			res.render("upload", {hasError: false, hasSuccess: false, files: req.user.uploadedFiles});
		},

		uploadFile: function(req, res) {
			upload(req, res, async err => {
				if(err) {
					res.render("upload", {hasError: true, message: "Only Excel File Is Allowed!", hasSuccess: false, files: req.user.uploadedFiles});
				}
				else {
					User.findOneAndUpdate(
						{_id: req.user._id},
						{ 
							$push: {uploadedFiles: "/uploads/" + req.file.filename }
						}, function(err, doc) {
						if(doc) {
							res.redirect("/upload");
						}
					});	
				}
			})
		},
		
		details: function(req, res) {
			if (fs.existsSync(path.join(__dirname, "../public/uploads/" + req.params.file))) {
				var Excel = require('exceljs');
				var wb = new Excel.Workbook();
				var filePath = path.resolve(__dirname,'../public/uploads/' + req.params.file);

				wb.xlsx.readFile(filePath).then(function(){
					var sh = wb.getWorksheet("Sheet1");
					let data = new Array();
					//Get all the rows data [1st and 2nd column]
					for (let i = 1; i < sh.rowCount; i++) {
						var number = sh.getRow(i).getCell(1).value;
						if(number != null && number.length == 11) {
							data.push(number);
						}
					}
					//Send Response
					if(data.length > 0) {
						res.render("details.ejs", {hasSuccess: true, hasError: false, data: data});
					} else {
						res.render("details.ejs", {hasSuccess: false, hasError: true, message: "Could not fetch data"});
					}
				});	
			} else {
			res.render("details.ejs", {hasSuccess: false, hasError: true, message: "Invalid file name!"});
		}
	},

		testingView: function(req, res) {
			return res.render("testing", {hasError:false, hasSuccess:false});
		},
		testing: function(req, res) {
			const url = 'http://api.m4sms.com/api/sendsms?id='+process.env.USER+'&pass='+process.env.PASS+'&mobile='+encodeURI(req.body.mobile)+'&brandname='+process.env.BRAND+'&msg='+encodeURI(req.body.message)+'&language=English;';
			console.log(url);
			fetch(url)
    		.then(res => res.json())
    		.then(json => {
    			if(json.Response == 'sent') {
    				res.render("testing.ejs", {hasSuccess: true, hasError: false, message: "Message sent successfully!"});	
    			}
    		});
		},
		
		logOut: function (req, res) {
			req.logout();
			req.session.destroy((err) => {
				res.clearCookie('connect.sid', { path: '/' });
				res.redirect('/login');
			});
		},
	}
}