'use strict';

module.exports = function(passport, validation, email, User) {
    return {
        setRouting : function(router) {
            
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
			
			router.get('/dashboard', this.dashboard);
            router.get('/logout', this.logOut);
        },

        loginView : function(req, res) {
			if(req.remember) {
				res.redirect('/dashboard');
			} else {
				const messages = req.flash('error');
				res.render("login", {hasErrors : (messages.length > 0) ? true : false, messages : messages});
			}
        },
		login : passport.authenticate('local.login', {
            successRedirect : '/dashboard',
            failureRedirect : '/login',
            failureFlash : true
        }),

        signUpView : function(req, res) {
            const messages = req.flash('error');
            res.render('register', { hasErrors: (messages.length > 0) ? true : false, messages: messages});
        },
		signUp : passport.authenticate('local.signup', {
            successRedirect : '/login',
            failureRedirect : '/signup',
            failureFlash : true
        }),
		
		googleLoginRedirect : passport.authenticate('google', {
            scope: ['email', 'profile']
        }),
		googleLoginCallback : passport.authenticate('google', {
            successRedirect: '/dashboard',
            failureRedirect : '/login'
        }),
		
		forgotPasswordView: function(req, res) {
			const messages = req.flash('error');
            res.render("forgot_password", {hasErrors : (messages.length > 0) ? true : false,hasSuccess: false, messages : messages});
		},
		forgotPassword: function(req, res) {
			
			User.findOne({email: req.body.email}).then(function(user){
				if(!user) {
					req.flash('error', ['User with this email does not exist']);
					res.redirect('/forgot_password');
				}
				else if(user) {
					user.generatePasswordReset();
					
					user.save().then(function(savedUser){
						let link = "http://" + req.headers.host + "/auth/reset/" + savedUser.resetPasswordToken;
						
						let mailSender = new email.MailSender();
						const mailOptions = {
							from: 'ishantishant2020@gmail.com',
							to: savedUser.email,
							subject: "ICrowd Web Application",
							text: `Hi ${user.fullname} \n 
							Please click on the following link ${link} to reset your password. \n\n 
							If you did not request this, please ignore this email and your password will remain unchanged.\n`
						};
						
						mailSender.sendMail(mailOptions, function(error, info){
							if(info) {
								res.render("forgot_password", {hasErrors: false, hasSuccess: true, messages: ['Reset link sent successfully. Check your email']});
							}
						});
					});
				}
				else {
					//
				}
			})
		},
		
		verifyToken: function(req, res){
			User.findOne({resetPasswordToken: req.params.token, resetPasswordExpires: {$gt: Date.now()}}).then(function(user){
				if(!user){
					res.render('error404');
				}
				else if(user) {
					res.render("reset_password", {user: user._id, hasErrors: false});
				}
				else {
					
				}
			});
		},
		
		resetPassword: function(req, res){
			User.findOne({_id: req.body.user}).then(function(user){
				user.password = user.encryptPassword(req.body.password);
				user.resetPasswordToken = '';
				user.resetPasswordExpires = '';
				
				user.save().then( (savedUser) => {
					res.redirect('/login');
				});
			}).catch(function(err){
				res.render("error404");
			});
		},
		
		dashboard: function(req, res) {
			if(req.user.firstLogin) {
				
				let mailSender = new email.MailSender();
				const mailOptions = {
					from: 'mohammadshehroz558@gmail.com',
					to: req.user.email,
					subject: "ICrowd Web Application",
					text: "Welcome to ICrowd Web Application Dear " + req.user.first_name + " "  + req.user.fullname
				};
				
				mailSender.sendMail(mailOptions, function(error, info){
					if(info) {
						req.user.firstLogin = false;
						req.user.save( (err) => {
							return res.render("dashboard", {welcome_message: "Welcome to ICrowd Web Application"});
						});
					}
				});
			
			}
			else {
				return res.render("dashboard", {welcome_message: "Welcome Again"});
			}
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