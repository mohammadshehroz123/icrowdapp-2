'use strict';
var fs = require('fs');
var path = require('path');
var mv = require('mv');


module.exports = function (formidable, passport, validation, email, User) {
	return {
		setRouting: function (router) {
			router.get('/', this.homePage);

			router.get('/auth/google', this.googleLoginRedirect);
			router.get('/auth/google/callback', this.googleLoginCallback);

			router.get('/login', this.loginView);
			router.post('/login', validation.getLoginValidation, this.login);

			router.get('/signup', this.signUpView);
			router.post('/signup', validation.getSignupValidation, this.signUp);

			router.get('/forgot_password', this.forgotPasswordView);
			router.post('/forgot_password', this.forgotPassword);
			router.get('/auth/reset/:token', this.verifyToken);

			router.post('/reset_password', validation.resetPassword, this.resetPassword);

			router.get('/photos', this.photosView);
			router.post('/photos/upload', this.uploadPhoto);
			router.post('/photos/rename', this.renamePhoto);
			
			router.get('/audio', this.audioView);
			
			router.get('/dashboard', this.dashboard);
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

		googleLoginRedirect: passport.authenticate('google', {
			scope: ['email', 'profile']
		}),

		googleLoginCallback: passport.authenticate('google', {
			successRedirect: '/dashboard',
			failureRedirect: '/login'
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
							from: 'rajivkumar.mel@gmail.com',
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
				if (req.user.firstLogin) {
					let mailSender = new email.MailSender();
					let full_name = req.user.full_name || (req.user.first_name + " " + req.user.last_name); 
					const mailOptions = {
						from: 'mohammadshehroz558@gmail.com',
						to: req.user.email,
						subject: "ICrowd Web Application",
						text: "Welcome to ICrowd Web Application Dear " + full_name
					};

					mailSender.sendMail(mailOptions, function (error, info) {
						if (info) {
							req.user.firstLogin = false;
							req.user.save((err) => {
								return res.render("dashboard", { welcome_message: "Welcome to ICrowd Web Application" });
							});
						}
					});
				}
				else {
					return res.render("dashboard", { welcome_message: "Welcome Again" });
				}
			}
			else {
				res.redirect('/login');
			}
		},
		
		photosView: function(req, res) {
			let photos = req.user.uploadedImages;
			res.render("photos", {photos: photos});
		},
		uploadPhoto: function(req, res) {
			var form = new formidable.IncomingForm();
			form.parse(req, function (err, fields, files) {
			var oldpath = files.filetoupload.path;
			var newpath =    path.join(__dirname, '../public/uploads/' + files.filetoupload.name);
			mv(oldpath, newpath, function (err) {
			//if (err) throw err;
				if(!err) {
					User.findOneAndUpdate(
						{_id: req.user._id},
						{ 
							$push: {uploadedImages: files.filetoupload.name }
						}, function(err, doc) {
							if(doc) {
								res.redirect('/photos');
							}
						});
				}
				else {
					res.send("Error in uploading image");
				}
				});
			});
		},
		renamePhoto: function(req, res) {
			fs.rename(path.join(__dirname, '../public/uploads/') + req.body.old_name, path.join(__dirname, '../public/uploads/') + req.body.new_name, function(err) {
				if ( err ) throw err;
				
				let { old_name, new_name } = req.body;
				let images = req.user.uploadedImages;
				let index = images.indexOf(old_name);
				
				if(index >= 0) {
					images[index] = new_name;
					
					User.findOneAndUpdate(
						{_id: req.user._id},
						{ 
							$set: {uploadedImages:  images}
						}, function(err, doc) {
							if(doc) {
								res.send("File renamed successfully");
							}
						});
					}
			});
		},
		
		audioView: function(req, res) {
			res.render("audio");
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