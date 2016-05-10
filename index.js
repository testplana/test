var app = require('express')();
var http = require('http').Server(app);
var util = require('util');
var fs  = require('fs');
var io = require('socket.io')(http);
var os = require("os");
var hname = os.hostname();
var name;
var id;
app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});
// usernames which are currently connected to the chat
var usernames = {};
var user = [];
// rooms which are currently available in chat
var rooms = ['General'];

io.sockets.on('connection', function (socket) {
	console.log( socket.request.headers['x-real-ip']  || socket.request.connection.remoteAddress + " is connected.");
	
	// when the client emits 'adduser', this listens and executes
	socket.on('adduser', function(username){
		// store the username in the socket session for this client
		if(usernames.hasOwnProperty(username)){
			socket.emit('currentUsers', "error");			
		}else{
			socket.username = username;
			// store the room name in the socket session for this client
			socket.room = 'General';
			// add the client's username to the global list
			usernames[username] = username;
			user.push(username);
			// send client to room General
			socket.join('General');		
			socket.emit('updaterooms', rooms, 'General');
			io.sockets.in(socket.room).emit('updatePeople', user);
		}
		
		
	});
	
	// when the client emits 'sendchat', this listens and executes
	socket.on('sendchat', function (data) {
		console.log(data)
		// we tell the client to execute 'updatechat' with 2 parameters
		io.sockets.in(socket.room).emit('updatechat', socket.username, data);

	});
	var Files = {};



	socket.on('base64 file', function (data) {
        io.sockets.in(socket.room).emit('base64 file',
            {
              username: socket.username,
              file: data.Data,
              fileName: data.Name
            }
        );
    });
	socket.on('switchRoom', function(newroom){
		socket.leave(socket.room);
		socket.join(newroom);		
		// update socket session room title
		socket.room = newroom;

		var clientRooms = rooms.slice();
		for(var i = 1; i < rooms.length; i++){
			if(rooms[i].indexOf(socket.username)==-1){				
				clientRooms.splice(i,1);
			}
		}
		console.log(clientRooms)
		socket.emit('updaterooms', rooms, newroom);
	});
	socket.on('createGroup', function(toUser){		
		var fromUser = socket.username;
		var newRoom = fromUser +" - "+ toUser;
		socket.broadcast.emit('invitePeople', fromUser, toUser, newRoom);
		socket.leave(socket.room);
		if(rooms.indexOf(newRoom)==-1){
			rooms.push(newRoom);
		}
		socket.join(newRoom);		
		socket.room = newRoom;		
		socket.emit('updaterooms', rooms, newRoom);
	});
	socket.on('addToGroup', function(toUser, toRoom){
		var fromUser = socket.username;
		var newRoom = toRoom;
		socket.broadcast.emit('invitePeople', fromUser, toUser, newRoom);
		socket.leave(socket.room);
		socket.join(newRoom);		
		socket.room = newRoom;		
		socket.emit('updaterooms', rooms, newRoom);
	});
	socket.on('updateRoomName', function(data){
		/*if(rooms.indexOf(data.newRoomName)==-1){
			rooms.push(data.newRoomName);
		}
		var clients = io.sockets.in(data.oldRoomName)
		console.log(clients)
		for (var i= 0; i < clients.length; i++){
			clients[i].leave(data.oldRoomName);
			clients[i].join(data.newRoomName);	
		}
		rooms.splice(rooms.indexOf(data.oldRoomName),1);		
		*/
	});

	// when the user disconnects.. perform this
	socket.on('disconnect', function(){
		// remove the username from global usernames list
		delete usernames[socket.username];
		// update list of users in chat, client-side
		io.sockets.emit('updateusers', usernames);
		var index = user.indexOf(socket.username);
		user.splice(index, 1);
		socket.broadcast.emit('updatePeople', user);
		socket.leave(socket.room);
	});
	
});

http.listen(process.env.PORT || 3000, function(){
  console.log('listening on *:3000');
});
