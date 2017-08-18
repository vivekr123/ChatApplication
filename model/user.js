var mongoose = require('mongoose');
var bcrypt = require('bcryptjs');          //for hashing password


var UserSchema = mongoose.Schema({

  username : {
    type: String,
    index:true
  },
  password: {
    type: String
  },
  email : {
    type: String
  },
  name : {
    type: String
  }
});

var roomSchema = mongoose.Schema({

  id: {
    type: String,
    //Therefore looks at this value when scanning
    index:true
  },
  name: {
    //make null when private
    type: String,
  },
  users : {
    type: [String]
  },
  messages : {
    type: []
  },
  private : Boolean,
  createdDate : String

});

var Room = module.exports = mongoose.model('Room', roomSchema);

module.exports.createRoom = function(users, name, boolPrivate){
  //id generated
  var id;
  if(boolPrivate == true){
    id = users[0] + "&" + users[1];

  }
  else {
    //IMPLEMENT WHEN CREATING ROOMS
    id = "12345678";
  }
  
}

var User = module.exports = mongoose.model('User', UserSchema);          //to access outside of file; mongoose.model(modelName, userSchema Variable)

module.exports.createUser = function(newUser, callback){

  var bcrypt = require('bcryptjs');
    bcrypt.genSalt(10, function(err, salt) {
      bcrypt.hash(newUser.password, salt, function(err, hash) {
        newUser.password = hash;                                   //setting password to new hashed one
        newUser.save(callback);                                    //saving user in db
    });
});
}

module.exports.getUserByUsername = function(username, callback){
  var query = {username:username};
  User.findOne(query, callback);                             //queries the username in the db

}

//getUserById used to login
module.exports.getUserById = function(id, callback){
  User.findById(id, callback);                             //queries the username in the db

}

module.exports.comparePassword = function(candidatePassword, hash, callback){
  bcrypt.compare(candidatePassword, hash, function(err, isMatch) {
    if(err) throw err;
    callback(null, isMatch);
});
}
