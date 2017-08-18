$( document ).ready(function() {

var universalClientAccess;

var username = document.getElementById('content').getAttribute('data-myValue');



var messages = [];
//For https
var socket = io.connect('http://localhost:8080', {secure: true});
console.log(socket.username);
var field = document.getElementById('field');
var sendButton = document.getElementById('send');
var content = document.getElementById('content');
var createGroup = document.getElementById('createGroup');
var groupName = document.getElementById('groupName');

var chatSidebar = document.getElementById('chat-sidebar')

var privField;



$("#messageSearch,#userSearch").keypress(function(event){
  if(event.which == 13){
    event.preventDefault();
    user = document.getElementById('userSearch');
    query = document.getElementById('messageSearch');
    if(user.value != "" && query.value != ""){


        window.alert('HIIIIIIIIIIIIIIIII');
        socket.emit('searchingMessages', username, user.value, query.value);
        //return false;
      user.value = "";
      query.value = "";

    }
    else {
      alert('Search Box Empty')
    }
  }
});

//refer to an existing element and then access dynamically added element
$("body").on('keypress', '.popup-bottom', function(event) {
  if(event.which == 13){
  sendMessage();
  }
});

function sendMessage() {
//May only work for one person!


privField = document.getElementById('txt');
var val = privField.value;
var receiver = privField.name //Uses username
var receiverID = universalClientAccess[receiver].id;
var sender = universalClientAccess[username].name;

//For adding to own chat window\
var div = 'popup-messages_'+receiver;
var ownMessageDiv = document.getElementById(div)


var attachment = document.getElementById('files');
if(attachment.value != '' && attachment.value !=null && attachment.value !=undefined){
  alert(attachment.value.split('\\').pop());

  var date = new Date().getTime();

  var file = attachment.files[0];
  //var reader  = new FileReader();
  //reader.readAsDataURL(file);
  //var fileToUse = reader.result;

  //var fileBuffer = new TypedArray(file);

  alert("My name is "+file);

  var bodyObj = {

    'participants': [username,receiver],
    'sender_username': username,
    'sender_name': sender,
    'receiver_username': receiver,
    'receiver_name': universalClientAccess[receiver].name,
    'file_name':attachment.value.split('\\').pop(),
    'attachment': null,
    //ms since 1970
    'date':date

  }

  alert('Sent to server');

  //Adds attachment to own messageDiv

  ownMessageDiv.innerHTML += '<div style="width:65%; background-color:#ccffef; font-size:1em; text-align:right; margin-left:6px; margin-right:6px; margin-bottom:6px; float:right"><span style="color:grey; font-size:1em;">' + sender + '</span>' + '<br>' + '<span><a href=/upload/'+ attachment.value.split('\\').pop() + ' target="_blank">' + attachment.value.split('\\').pop() + '</a></span></div><br>';
  ownMessageDiv.scrollTop = ownMessageDiv.scrollHeight;
  socket.emit('fileAttachment', attachment.value.split('\\').pop(), attachment.files[0], receiverID, receiver, bodyObj);
}

else{



ownMessageDiv.innerHTML += '<div style="width:65%; background-color:#ccffef; font-size:1em; text-align:right; margin-left:6px; margin-right:6px; margin-bottom:6px; float:right"><span style="color:grey; width:100%; font-size:1em">'+ sender + '</span>' + '<br>' + "<span>" + val + '</span></div><br>';

ownMessageDiv.scrollTop = ownMessageDiv.scrollHeight;



socket.emit('privMessage', receiverID, val, socket.id, receiver);

privField.value = "";

}
}

socket.on('addFileToChat', function(usernameSender, fileName, receiver){

  alert('HIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII');
  var div = 'popup-messages_'+usernameSender;
  var messageDiv = document.getElementById(div);

  alert(usernameSender);

  senderName = universalClientAccess[usernameSender].name;

  if(messageDiv != null){

  html = '<div style="width:65%; background-color:#ccffef; font-size:1em; text-align:right; margin-left:6px; margin-right:6px; margin-bottom:6px; float:right"><span style="color:grey; font-size:1em;">' + senderName + '</span>' + '<br>' + '<span><a href=/upload/'+ fileName + ' target="_blank">' + fileName + '</a></span></div><br>';
  messageDiv.innerHTML += html;
  messageDiv.scrollTop = messageDiv.scrollHeight;

  }


});


socket.on('addToChat', function(usernameSender, message, userID, receiver){


  var div = 'popup-messages_'+usernameSender;
  var messageDiv = document.getElementById(div);

  senderName = universalClientAccess[usernameSender].name;

  //if not already open
  if(messageDiv == null){

    register_popup(usernameSender,senderName);
    div = 'popup-messages_'+usernameSender;
    messageDiv = document.getElementById(div);

    html = '<div style="width:65%; background-color:#ccffef; font-size:1em; text-align:right; margin-left:6px; margin-right:6px; margin-bottom:6px; float:right"><span style="color:grey; font-size:1em;">' + senderName + '</span>' + '<br>' + '<span">' + message + '</span></div></div><br>' ;

    socket.emit('initAddToMessages', receiver, usernameSender, html);

  }

  var date = new Date().getTime();

  //Use this for output into searching functionality -- for user to see date
  var dateString = new Date(date);

  console.log(dateString);

  socket.emit('addToElastic', {

    'participants': [usernameSender,receiver],
    'sender_username': usernameSender,
    'sender_name': senderName,
    'receiver_username': receiver,
    'receiver_name': universalClientAccess[receiver].name,
    'message': message,
    //ms since 1970
    'date':date

  });

  if(messageDiv != null){

  html = '<div style="width:65%; background-color:#ccffef; font-size:1em; text-align:right; margin-left:6px; margin-right:6px; margin-bottom:6px; float:right"><span style="color:grey; font-size:1em;">' + senderName + '</span>' + '<br>' + '<span">' + message + '</span></div></div><br>' ;
  messageDiv.innerHTML += html;

  }


  messageDiv.scrollTop = messageDiv.scrollHeight;



});

socket.on('searchResults', function(messagesToAdd){

  var div = 'searchResults';
  resultsDiv = document.getElementById(div)
  html = messagesToAdd;
  resultsDiv.innerHTML += html;

})

socket.on('message', function(data){
  if(data.message){
    messages.push(data);
    var html='';
    for(var i = 0; i<messages.length;i++) {

      // Condition ?(then) value if true :(else) value if false
      html += '<b>' + (messages[i].username ? messages[i].username : 'Server') + ': </b>';
                html += messages[i].message + '<br />';
    }
    content.innerHTML = html;
  } else {
    console.log("Problem: ", data);
  }
});

firstClick = true;
//Makes sure old messages are added to chat
window.init = function(userCurrent, otherUser){
  if(firstClick == true){
  socket.emit('initAddToMessages', userCurrent, otherUser, null);
  }
  firstClick = false;
}

socket.on('currentClients', function(data){

  universalClientAccess = data;
  var clients = data;


  var html = '';

  if(clients!=null) {


    users = Object.keys(clients);

    users.forEach(function(u){

      if(u!=username && u!='' && u!=undefined){


      //For spans, clients[i] does not already exist
      html += `
      <div class = "sidebar-name" id = "${clients[u].name}_remove">
      <a href = 'javascript:register_popup("${u}","${clients[u].name}");' onclick = 'window.init("${username}", "${u}");'>
      <img width="30" height="30" src="css/userprofile.jpg">
      <span>${clients[u].name}</span>
      </a>
      </div>`;
    }

    })


}

  // += makes chatSidebar have multiple instances of same user
  chatSidebar.innerHTML = "";
  chatSidebar.innerHTML = html;


});



socket.on('addMessages', function(messages, otherUser){

  var div = 'popup-messages_'+otherUser;
  messageDiv = document.getElementById(div);
  html = messages;
  messageDiv.innerHTML += html;
  messageDiv.scrollTop = messageDiv.scrollHeight;

});

//for removing div with online person
socket.on('removeClient', function(data){
  console.log('Remove action')
  var toRemove = document.getElementById(data+'_remove');
  toRemove.outerHTML = "";
  toRemove.innerHTML = "";

});


});
