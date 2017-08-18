var express = require('express');
var router = express.Router();
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;
var url = 'mongodb://localhost/loginapp';


var fs = require('fs');

var mongoose = require('mongoose');
db = mongoose.connection;

var errMessage;

var User = require('../model/user')

//Get Register page
router.get('/register',function(req,res){
  res.render('register');
});

// Login

router.get('/login',function(req,res){
  res.render('login');
});

//To register user

router.post('/register', function(req,res){

  var name = req.body.name;
  var email = req.body.email;
  var username = req.body.username;
  var password = req.body.password;
  var password2 = req.body.password2;

  //Validation
  req.checkBody('name','Name is required').notEmpty();
  req.checkBody('email','Email is required').notEmpty();
  req.checkBody('email','Email is not valid').isEmail();
  req.checkBody('username','Username is required').notEmpty();
  req.checkBody('password','Password is required').notEmpty();
  req.checkBody('password2','Passwords do not match').equals(req.body.password);

//var for if there are validation errors
  var errors = req.validationErrors();

//to return error messages

  if(errors){
    res.render('register', {
      errors:errors
    })
  } else{
    var newUser = new User({                          //coming from the model created - user.js

      name:name,
      email:email,
      username:username,
      password:password

    });

    User.createUser(newUser, function(err, user){              //createUser function from user model
      if(err) throw err;
      console.log(user);

    });

    req.flash('success_msg', "You are registered. Please login")

    res.redirect('/users/login');                              //when succeeded, redirects to login page

  }

});


passport.use(new LocalStrategy(
  function(username, password, done) {

    User.getUserByUsername(username, function(err, user){            //username in input field
      if(err) throw err;
      if(!user){
                                                            //if not user in db
        return done(null, false, {message: 'Unknown User'});
      }

      User.comparePassword(password, user.password, function(err, isMatch){   //password in input field, and user's actual password
        if(err) throw err;
        if(isMatch){
          return done (null, user);
        } else {
          console.log('Hi');
          router.post('/login', function(req,res){
            console.log('Hi 2');
            res.render('login', {errMessage:'Hi there'});
          });

          return done(null, false, {message: 'Invalid password'});
        }
      });
                                                                              //getUserByUsername() and comparePassword() are in user model
    });
  }
));

//using cookies for sessions for user (easier)

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.getUserById(id, function(err, user) {
    done(err, user);
  });
});

//authenticating and redirecting accordingly

router.post('/login', passport.authenticate('local', {successRedirect:'/', failureRedirect:'/users/login', failureFlash: true}),

function(req, res){

    res.redirect('/');


});

router.get('/logout', function(req,res){

  req.logout();                                                                    //logouts the user
  req.flash('success_msg', 'You have successfully logged out');                    //message showing logout
  res.redirect('/users/login');

});


          //add object containing all info into database under user's namespace

function ensureAuthenticated(req,res,next){

  if(req.isAuthenticated()){
    return next();
  }
  else{
    req.flash('error_msg', 'You are not logged in');
    res.redirect('/users/login');
  }

}

module.exports = router;
