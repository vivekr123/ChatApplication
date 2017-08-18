var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var exphbs = require('express-handlebars');
var expressValidator = require('express-validator');
var flash = require('connect-flash');
var session = require('express-session');
var passport = require('passport');
var localStrategy = require('passport-local').Strategy;
var mongo = require('mongodb');
var mongoose = require('mongoose');
var fs = require('fs');

var elasticsearch = require('elasticsearch');

var preview = require('page-previewer');

var getUrls = require('get-urls');


mongoose.connect('mongodb://localhost/loginapp');
var db = mongoose.connection;

var users = require('./routes/users');

var app = express();

app.set('views', path.join(__dirname,'views'));
app.engine('handlebars', exphbs({defaultLayout:'layout'}));
app.set('view engine','handlebars');

//BodyParser Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));
app.use(cookieParser());

//Static Folder
app.use(express.static(path.join(__dirname,'public')));


//Express session
app.use(session({
  secret:'secret',
  saveUninitialized:true,
  resave:true
}));

//Passport initialization

app.use(passport.initialize());
app.use(passport.session());


app.use(expressValidator({
  errorFormatter: function(param, msg, value) {
      var namespace = param.split('.')
      , root    = namespace.shift()
      , formParam = root;

    while(namespace.length) {
      formParam += '[' + namespace.shift() + ']';
    }
    return {
      param : formParam,
      msg   : msg,
      value : value
    };
  }
}));

//Connect Flash
app.use(flash());

//Global Vars
app.use(function(req,res,next){
  res.locals.success_msg = req.flash('success_mg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.user = req.user || null;                             //user exists
  next();
});

//Middleware for route files

//app.use('/',routes);         //goes to index
app.use('/users',users);      //goes to useres


//CHAT FUNCTIONALITY



//Set port

//app.set('port', (process.env.PORT || 8080));

var port = process.env.PORT || 8080;


//To keep track of online clients
var clientsWithUsername = {};

//Passed the express server to socket.io
var io = require('socket.io').listen(app.listen(port));

//Global username ?
var userNowName = '';
var userNowUsername = '';

//Get Home page
app.get('/',ensureAuthenticated, function(req,res){

    userNowName = req.user.name;
    userNowUsername = req.user.username;

    res.render('index',{username: req.user.username});


  });


function ensureAuthenticated(req,res,next){

  if(req.isAuthenticated()){
    return next();
  }
  else{
    req.flash('error_msg', 'You are not logged in');
    res.redirect('/users/login');
  }

}

//For elasticsearch
var esClient = new elasticsearch.Client({
  //establishes localhost to handle communication
  host: 'localhost:9200',
  log: 'error',
  keepAlive: true
});

app.post('/', function(req,res){

  console.log(req.files);

});

app.get('/upload/:fileName', function(req,res){

  var fileToGet = req.params.fileName;
  console.log(fileToGet);
  //Retrieve from db and then res.sendFile to client
  esClient.search({

  index: 'messages',
  size: '3000',
  //res.locals.user.username
  body: {
    "query": {
      "bool": {
        "must": [
          {
            	"match": {
            		"file_name":fileToGet
            	}
            },
            {
            "match":{
            		"participants":res.locals.user.username
            }
            }
    ]
  }
},
"sort" : [
  {"date" : {"order" : "asc"}}
]
  }

    }, function(err, response){

      if(err){
        console.log(err);
      }

      var hits = response.hits;

      if(Object.keys(hits).size == 0){ console.log('NO HITS')}

      if(hits != undefined){
      var fileName = hits.hits[0]._source.file_name;
      var file = hits.hits[0]._source.attachment.data;

      /*res.write(file,'binary');
      res.end(null, 'binary'); */

      //res.send(file);
      //fs.write(Buffer.from(fileName, file));

      console.log('test: ', Buffer.from(file));
      fs.writeFile('C:\\Users\\Vivek\\Downloads\\tmp/'+fileName, Buffer.from(file), (err) => {
        if (err) throw err;
        console.log('The file has been saved!');
        res.send('File Downloaded')
        res.end();
});

      /*fs.writeFileSync('download', file , 'utf8', (err) => {
        if (err) throw err;
        console.log('The file has been saved!');
}); */

    }
    /*else {
      console.log('Whoops. File is undefined')
    } */
    //res.location('/')
    //res.end();

    });


});

//Create index for messages if doesn't already exist
 if(esClient.indices.exists({index: 'messages'}) == false){
esClient.indices.create({
  index: 'messages'
},function(err,resp,status) {
  if(err) {
    console.log(err);
  }
  else {
    console.log("create",resp);
  }
});

}

var oembed = require("oembed-auto");
var og = require('open-graph');



//Socket is the socket of a client
io.sockets.on('connection', function(socket){
  socket.name = userNowName;       //Might not work
  socket.username = userNowUsername;



  if(clientsWithUsername.hasOwnProperty(userNowUsername) == false) {
    //To be encrypted
    //Add to database later
     clientsWithUsername[userNowUsername] = {name:socket.name, id:socket.id};

   }

   function linkPreview(currLink, senderName, location, msg, otherUser){

     var messagesAdd = '';
     preview({
       url: currLink,
       proxy: ""
     }, function(err, data) {

         if(!err) {
           console.log(data); //Prints the meta data about the page

         //  console.log(location);
           console.log(data.title);
           if(data.loadFailed == false){
             console.log(data.title);
             console.log(data.images[0])
               console.log('hihihihihihihihhihi')
               //messagesToAdd += data.title;

               messagesAdd = '<div style="width:100%; font-size:1em">' + data.title /*+ '<img src=' + data.images[0]  + '>' */ + data.description + '</div>'
               messagesAdd += '<div style="width:100%; font-size:1em"><span style="color:grey; width:100%; font-size:1em">' +  senderName + '</span>' + '<br>' + '<span>' + msg.substring(0, location) + '<a href='+ currLink + '>' + msg.substring(location, location + currLink.length+1)  + '</a>'+ msg.substring(location + currLink.length+1) + '</span></div>';
               //socket.emit('addToChat')
               socket.emit('addMessages', messagesAdd, otherUser);

           }


             //messagesToAdd += '<div>' + data.title + '</div>'
             //messagesToAdd += '<div style="width:100%; font-size:1em"><span style="color:grey; width:100%; font-size:1em">' + hits[i]._source.sender_name + '</span>' + '<br>' + '<span>' + hits[i]._source.message.substring(0, location) + '<a href='+ currLink + '>' + hits[i]._source.message.substring(location, location + currLink.length+1)  + '</a>'+ hits[i]._source.message.substring(location + currLink.length+1) + '</span></div>';
         }
         else{
           console.log(err);
         }
     });

   }

   io.sockets.emit('currentClients', clientsWithUsername);

  socket.emit('message', { message: 'Welcome to the chat'});

  socket.on('send', function(data){
    io.sockets.emit('message', data);
  });

  socket.on('privMessage', function(to, msg, userID, receiver){
    //alert("HI")

    io.sockets.connected[to].emit('addToChat', socket.username, msg, userID, receiver);

  });

  socket.on('initAddToMessages', function(userCurrent, otherUser, recentMessage){

    //search for messages between two users and add to div

  esClient.search({

  index: 'messages',
  size: '3000',
  body: {
    "query": {
      "bool": {
        "must": [
    {
      "term": {
        "participants":userCurrent
      }
    },
    {
      "term": {
        "participants":otherUser
        }
    }
    ]
  }
},
"sort" : [
  {"date" : {"order" : "asc"}}
]
  }

    }, function(err, response){
      //gives array of hit documents
      var hits = response.hits.hits;




      //For finding links
      //var reg = new RegExp("(http|ftp|https)://([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?", 'i');

      //console.log(hits);
      messagesToAdd = '';
      for (i in hits){
        console.log(hits[i]._source.message)

        //To handle async call of preview
        var matchBool = false;

        var match;
        //returns a set
        if(hits[i]._source.attachment == null){
        match = getUrls(hits[i]._source.message, {'stripWWW': false});
        console.log(match);

        //var match = reg.exec(hits[i]._source.message);

        if(match.size != 0){
          //Iterator object
          var setIter = match.values();
          var currLink = setIter.next().value;

          var numLinksInMessage = match.size;
          var location = hits[i]._source.message.indexOf(currLink)

          var msg = hits[i]._source.message;
          var senderName = hits[i]._source.sender_name;

          //EDIT HERE FOR LINK PREVIEW

          var title = linkPreview(currLink, senderName, location, msg, otherUser);



          //messagesToAdd += '<div style="width:100%; font-size:1em"><span style="color:grey; width:100%; font-size:1em">' + hits[i]._source.sender_name + '</span>' + '<br>' + '<span>' + hits[i]._source.message.substring(0, location) + '<a href='+ currLink + '>' + hits[i]._source.message.substring(location, location + currLink.length+1)  + '</a>'+ hits[i]._source.message.substring(location + currLink.length+1) + '</span></div>';




        }
        else {

        if(hits[i]._source.sender_username == userCurrent){
        messagesToAdd += '<div style="width:65%; background-color:#ccffef; font-size:1em; text-align:right; margin-left:6px; margin-right:6px; margin-bottom:6px; float:right"><span style="color:grey; font-size:1em;">' + hits[i]._source.sender_name + '</span>' + '<br>' + '<span">' + hits[i]._source.message + '</span></div></div><br>'
      }
      else {
        messagesToAdd += '<div style="margin-left:6px; margin-bottom:6px; margin-right:6px; width:65%; float:left; background-color:white"><span style="color:grey; width:100%; font-size:1em; display:inline">' + hits[i]._source.sender_name + '</span>' + '<br>' + '<span>' + hits[i]._source.message + '</span></div>' + '<br>'
      }
    }



      }

      //To check if message was an attachment
      if(hits[i]._source.attachment != null){

        messagesToAdd += '<div style="width:65%; background-color:#ccffef; font-size:1em; text-align:right; margin-left:6px; margin-right:6px; margin-bottom:6px; float:right"><span style="color:grey; font-size:1em;">' + hits[i]._source.sender_name + '</span>' + '<br>' + '<span><a href=/upload/'+hits[i]._source.file_name + ' target="_blank">' + hits[i]._source.file_name + '</a></span></div><br>';
      }

    }

      if(recentMessage != null){
        if(hits[i]._source.message != null){
        if(getUrls(hits[i]._source.message, {'stripWWW': false}).size != 0){
        //FIX THIS!!!!!!!!
        var setIter = match.values();
        var currLink = setIter.next().value
        og(currLink, function(err, meta){
            if(err){
              console.log(err);
            }
            else {
              console.log(meta);
              var title;
              var description;
              if(meta.title != '' && meta.title!= null){
                title = meta.title;
              }
              if(meta.description != '' && meta.description!= null){
                description = meta.description;
              }
              var thisdiv = '<div style="width:100%;">' + title + "    " + description + '</div>';
              console.log('Hi - ' + title);
              messagesToAdd +=  thisdiv;

            }
        });



        var insertion = recentMessage.indexOf('</span>');
        console.log(recentMessage);
        console.log(insertion);
        // 7 is value to pass span
        recentMessageFirst = recentMessage.substring(0, insertion+6+1);
        recentMessageSecond = recentMessage.substring(insertion+6+1);
        messagesToAdd += recentMessageFirst + '<a href='+ "'" + recentMessage + "'" + '>'+ recentMessageSecond + '</a>';
        }
        else {
          if(hits[i]._source.attachment != null) {
            //messagesToAdd += '<a href=/upload/'+hits[i]._source.fileName + '>' + hits[i]._source.fileName + '</a>'
          }
          else {
          messagesToAdd += recentMessage
        }
        }
      }

    }

      //userNowUsername might not work
      //userCurrentID = clientsWithUsername[userNowUsername].id;
      otherUserID = clientsWithUsername[otherUser].id;

      socket.emit('addMessages', messagesToAdd, otherUser);
    });



  });



  socket.on('addToElastic', function(bodyObj){

    esClient.index({
      index: 'messages',
      type: 'message',
      //id determined by elasticsearch
      //bodyObj from client-side
      body: bodyObj
  }, function(err, res){
    if(err){
      console.log(err);
    }
  });

});

  socket.on('searchingMessages', function(username, userQuery, msg){

    esClient.search({

    "index": "messages",
    "size": "3000",
    "body": {
      "query": {
        "bool": {
          "must": [
      {
        "term": {
          "participants":username
        }
      },
      {
        "term": {
          "participants":userQuery
          }
      },
      {
        "term": {
          "message":msg
        }
      }
      ]
    }
  },
  "sort" : [
    {"date" : {"order" : "desc"}}
  ]
    }

      }, function(err, response){
        //gives array of hit documents
        if(err){
          console.log(err);
        }
        var hits = response.hits.hits;

        //console.log(hits);
        messagesToAdd = '';
        for (i in hits){
          console.log(hits[i]._source.message)

          var date = new Date(hits[i]._source.date);

          messagesToAdd += '<div style="width:100%; font-size:1em"><span style="color:grey; width:100%; font-size:1em">' + hits[i]._source.sender_name + '</span>' + '<br>' + '<span>' + hits[i]._source.message + '</span>'+'<br>'+'<span>'+ date +'<br><br></span>'+'</div>';
        }

        socket.emit('searchResults', messagesToAdd);

      });

  });

  socket.on('fileAttachment', function(fileName, file, receiverID, receiver, bodyObj){

    //save to esClient as type:attachment

    bodyObj.attachment = Buffer.from(file);

    //esClient.putMapping()

    esClient.index({
      index: 'messages',
      type: "attachment",
      /*  "mappings": {
          "attachment": {
            "properties": {
          "blob": {
            "type": "binary"
          }
        }
      }
    }
  }, */
      //id determined by elasticsearch
      //bodyObj from client-side
      body: bodyObj
    }, function(err, res){
    if(err){
      console.log(err);
    }
    console.log('FILE ADDEDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD');
    console.log(Buffer.from(file));
  });

    var to = receiverID;
    console.log('Sent back to client');



    io.sockets.connected[to].emit('addFileToChat', socket.username, fileName, receiver);

    /*fs.writeFile(fileName, file, (err) => {
      if (err) throw err;
      console.log('The file has been saved!');
    }); */

    var tempFile = fs.createWriteStream(fileName);
    tempFile.on('open', function(fd) {
      tempFile.write(Buffer.from(file));

    });

  });

  socket.on('base64 file', function (msg) {
    console.log('received base64 file from' + msg.username);
    socket.username = msg.username;
    // socket.broadcast.emit('base64 image', //exclude sender
    io.sockets.emit('base64 file',  //include sender

        {
          username: socket.username,
          file: msg.file,
          fileName: msg.fileName
        }

    );
    });

  socket.on('disconnect', function(){
    console.log('Disconnected');
    //clientsWithUsername.splice(clientsWithUsername.indexOf([socket.username]), 1);
    delete clientsWithUsername[socket.username];

    io.sockets.emit('currentClients', clientsWithUsername);

  });


})
console.log("Listenting on port " + port);
