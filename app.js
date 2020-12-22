var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var path = require('path');
var validator = require('validator');

var DEFAULT_ROOM = 'lobby';

//////////////////////////////////////////
// temp data storage
//////////////////////////////////////////
var ROOMS = [];
var FACES = ['yellow', 'blue', 'green', 'lightblue', 'orange', 'pink', 'purple', 'red', 'white'];
var HATS = ['none', 'beanie', 'fedora', 'nurse', 'pirate', 'sailor', 'tophat', 'witch', 'wizard'];
var CATEGORIES = ['Looking Cool', 'The Swamp', 'Social Cues'];
var GAME_STATES = ['room', 'round-one', 'round-two'];

class Avatar {
    constructor (hat, face) {
        this.hat = hat;
        this.face = face;
    }
}

class Room {
    constructor (id, clients) {
        this.id = id;
        this.clients = clients;
        this.state = 'room';
    }
}

class Sock {
    constructor (id, score, nickname, avatar, svgs, ready, room, categories, category) {
        this.id = id;
        this.score = score;
        this.nickname = nickname;
        this.avatar = avatar;
        this.svgs = svgs;
        this.ready = ready;
        this.room = room;
        this.categories = categories;
        this.category = category;
    }
}

app.use(express.static(path.join(__dirname, '/public')));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

io.on('connection', socket => {

    //////////////////////////////////////////
    // socket setup
    //////////////////////////////////////////

    socket.score = 0;
    socket.nickname = '';
    socket.avatar = new Avatar('none','yellow');
    socket.svgs = [];
    socket.ready = false;
    socket.categories = [];
    socket.category = "";

    //set room
    socket.rooms.forEach(room => {
        socket.leave(room);
    });
    socket.room = DEFAULT_ROOM;
    socket.join(DEFAULT_ROOM);

    console.log(`socket connection received by ${socket.id}`);

    //////////////////////////////////////////
    // functions
    //////////////////////////////////////////

    //sanitizes the input
    //returns string of sanitized input
    function sanitizeString(text) {
        return validator.escape( validator.trim(text) );
    }

    function sanitizeSVG(svg) {
        //no idea how to do this yet
    }

    //checks if the ready state for every client in the room is true/false
    function isRoomReady() {
        var allClientsReady = true;
        getClientSocketsInRoom(socket.room).forEach( clientSocket => {
            if(!clientSocket.ready) allClientsReady = false;
        });
        return allClientsReady;
    }

    //sets the ready state (socket.ready) of every client in the room to true/false
    function setReadyStateForRoom(ready) {
        getClientSocketsInRoom(socket.room).forEach( clientSocket => {
            clientSocket.ready = ready;
        })
    }

    //gets the stored room from temp storage
    //not to be used for getting socket information i.e. socket.ready or socket.svgs
    //returns object of class Room
    function getStoredRoom() {
        return ROOMS.find( room => room.id === socket.room );
    }

    //get sockets of a specific 
    function getClientSocketsInRoom(roomId) {
        if(!socket.adapter.rooms.get(roomId)) return [];
        var clientIds = Array.from(socket.adapter.rooms.get(roomId));
        var clients = [];
        clientIds.forEach( socketId => {
            var socket = io.sockets.sockets.get(socketId);
            clients.push(new Sock(socket.id, socket.score, socket.nickname, socket.avatar, socket.svgs, socket.ready, socket.room, socket.categories, socket.category));
        });
        return clients;
    }

    //get actual socket from socket id
    function getSocket(socketId) {
        return io.sockets.sockets.get(socketId);
    }

    //changes the game state to the next round, chooses categories
    function nextRound() {
        //block entry to room

        if(getStoredRoom().state === 'round-one') {
            getStoredRoom().state = 'round-two';

        } else {
            console.log('next round');
            getStoredRoom().state = 'round-one';
            var cats = [];
            while (cats.length < getStoredRoom().clients.length && CATEGORIES.length >= getStoredRoom().clients.length) {
                console.log("cats length", cats.length);
                console.log("clients length", getStoredRoom().clients.length);
                var cat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
                if(!cats.includes(cat)) {
                    cats.push(cat);
                    console.log('add cat', cat);
                }
            }

            getStoredRoom().clients.forEach( (sock, index) => {
                getSocket(sock.id).emit("client.categories.init", {categories: cats, category: cats[index]});
            })
        }
    }

    //////////////////////////////////////////
    // init
    //////////////////////////////////////////

    socket.emit('client.init', {id: socket.room, clients: getClientSocketsInRoom(), avatar: socket.avatar, hats: HATS, faces: FACES});

    socket.on('server.nickname', nickname => {
        socket.nickname = sanitizeString(nickname);
    });

    socket.on('server.avatar', avatar => {
        if(avatar.hat && avatar.face) {
            if(HATS.includes(avatar.hat) && FACES.includes(avatar.face)) {
                socket.avatar = new Avatar(sanitizeString(avatar.hat), sanitizeString(avatar.face));
            }
        }
    });

    //////////////////////////////////////////
    // rooms
    //////////////////////////////////////////

    socket.on('server.room.join', roomId => {
        cleanRoomId = sanitizeString(roomId);
        socket.rooms.forEach(room => {
            socket.leave(room);
        });
        socket.join(cleanRoomId);
        socket.room = cleanRoomId;
        console.log(`${socket.id} has joined room ${cleanRoomId}`);
    });

    socket.on('server.room.create', () => {
        socket.rooms.forEach(room => {
            socket.leave(room);
        });
        socket.join(socket.id);
        socket.room = socket.id;
        console.log(`${socket.id} has created room ${socket.id}`);
    });

    socket.on('server.room.leave', () => {
        socket.rooms.forEach(room => {
            socket.leave(room);
        });
        socket.join(DEFAULT_ROOM);
        socket.room = DEFAULT_ROOM;
        console.log(`${socket.id} has left all rooms and joined ${DEFAULT_ROOM}`);
    });

    //////////////////////////////////////////
    // game
    //////////////////////////////////////////

    socket.on('server.ready', () => {
        socket.ready = true;
        if(isRoomReady()) {
            nextRound();
            io.to(socket.room).emit('client.ready');
            setReadyStateForRoom(false);
        }
    });

    socket.on("server.categories.init", data => {
        socket.category = data.category;
        socket.categories = data.categories;
    })

    socket.on('server.svg.save', svg => {
        socket.svgs.push(svg);
        socket.ready = true;

        if(isRoomReady()) {
            var storedRoom = getStoredRoom();
            switch(storedRoom.state){
                case 'round-one':
                    storedRoom.state = 'round-two';
                    break;
                case 'round-two':
                    storedRoom.state = 'over';
                    break;
            }
            io.to(socket.room).emit('client.ready');
            setReadyStateForRoom(false);
        };
    });

    //////////////////////////////////////////
    // on disconnect
    //////////////////////////////////////////

    socket.on('disconnect', () => {
        console.log(`socket ${socket.id} disconnected`);
    });
});

http.listen(3000, () => {
    console.log('listening on http://localhost:3000/');
});

setInterval(function(){
    for( var i = 0; i < ROOMS.length; i++) {
        if(!ROOMS[i].clients) ROOMS.splice(i, 1);
        else if(!ROOMS[i].clients.length <= 0) ROOMS.splice(i, 1);
    }

    for (var [roomId, clientSet] of io.sockets.adapter.rooms.entries()) {
        var clientIds = Array.from(clientSet);
        var clients = [];
        clientIds.forEach( socketId => {
            var socket = io.sockets.sockets.get(socketId);
            var client = new Sock(socket.id, socket.score, socket.nickname, socket.avatar, socket.svgs, socket.ready, socket.room, socket.categories, socket.category);
            clients.push(client);
            socket.emit("client.sock.update", client);
        });
        var room = new Room(roomId, clients);
        io.to(roomId).emit('client.room.update', room);

        //update local rooms storage
        if(!ROOMS.includes(roomId)) ROOMS.push(room);
    }
}, 1000/25);
  