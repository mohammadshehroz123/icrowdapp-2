
'use strict';

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth2').Strategy;

const User = require('../models/user-model');

passport.serializeUser(function(user, done){
    done(null, user.id);
});

passport.deserializeUser(function(id, done){
    User.findById(id, function(err, user){
        done(err, user);
    });
});

passport.use(new GoogleStrategy({
    clientID: '414800419877-cv61tpqmerdh51m5jjmfb88a0v230g6r.apps.googleusercontent.com',
    clientSecret: 'CbmrEbNLC4yygt8XoY6Z_BLe',
    passReqToCallback : true,
    callbackURL : 'http://localhost:3000/auth/google/callback'
}, function(req, accessToken, refreshToken, profile, done){
    User.findOne({google : profile.id}, function(err, user){
        if(err) {
            return done(err);
        }
        if(user) {
            return done(null, user);
        }
        const newUser = new User();
        newUser.google = profile.id;
        newUser.fullname = profile.displayName;
        newUser.email = profile.emails[0].value;
        newUser.profilePhoto = profile._json.picture;
        newUser.save(function(err){
			console.log(err);
            return done(null, newUser);
        });
    });
}));