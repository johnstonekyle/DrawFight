const isDevMode = true;
const isMobile = window.innerWidth <= 480;
const isPWA = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
var socket = io();

var HATS = [];
var FACES = [];

const gameStates = {
    INSTALL: 'install',
    HOME: 'home',
    LOBBY: 'lobby',
    ROOM: 'room',
    DRAW: 'draw',
    WAIT: 'wait'
}
const initialGameState = gameStates.INSTALL;
const nextGameState = gameStates.HOME;
socket.gameState = initialGameState;

let generatedSelects = false;

if (isPWA || isDevMode || !isMobile) {  
    socket.gameState = nextGameState;
}

scaleCanvas();

//////////////////////////////////////////
// Functions
//////////////////////////////////////////

function scaleCanvas() {
    const c = $('#sheet');
    const ctx = c[0].getContext('2d');
    const container = $('.canvas-container').first();
    const toolbarHeight = 50;
    console.log(toolbarHeight);
    if(window.innerWidth <= 480) {
        ctx.canvas.width = window.innerWidth;
        container.width(window.innerWidth);
    } else {
        ctx.canvas.width = Math.round(window.innerHeight / 2);
        container.width(window.innerHeight / 2);
    }
    ctx.canvas.height = window.innerHeight - toolbarHeight;
}

function createRipple(event) {
    var button = event.currentTarget;
    var circle = document.createElement("span");
    var diameter = Math.max(button.clientWidth, button.clientHeight);
    var radius = diameter / 2;

    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${event.clientX - (button.offsetLeft + radius)}px`;
    circle.style.top = `${event.clientY - (button.offsetTop + radius)}px`;
    circle.classList.add("ripple");

    var ripple = button.getElementsByClassName("ripple")[0];
    if (ripple) {
        ripple.remove();
    }

    button.appendChild(circle);
}

function changeGameState(state) {
    Object.values(gameStates).forEach(gs => {
        if (gs !== state) $(gs).hide();
    });
    $(state).show();
}

function updateClient(client) {
    if (client.ready) {
        $('#btn-ready').hide();
        $('#loading-room').show();
    } else {
        $('#btn-ready').show();
        $('#loading-room').hide();
    }
}

function updateRoom(data) {
    socket.room = data.id;
    changeGameState(socket.gameState);

    if (socket.gameState === gameStates.LOBBY) {
        $('.selects').not('.slick-initialized').slick({
            infinite: true,
            slidesToShow: 3,
            slidesToScroll: 1,
            arrows: true,
            dots: false,
            centerMode: true,
            centerPadding: '0',
            prevArrow:"<i class='material-icons text-light a-left control-c prev slick-prev'>keyboard_arrow_left</i>",
            nextArrow:"<i class='material-icons text-light a-right control-c next slick-next'>keyboard_arrow_right</i>",
            responsive: [
                {
                    breakpoint: 480,
                    settings: {
                        slidesToShow: 1,
                    }
                }
            ]
        });
    }

    if (socket.gameState === gameStates.ROOM) {
        $('#display-room').html(data.id);

        var html = '';
        data.clients.forEach(client => {
            nickname = client.nickname ? client.nickname : client.id;
            var ready = client.ready ? 'Ready' : 'Not Ready';
            var readyClass = client.ready ? 'ready' : 'not-ready';
            html += `
            <li>
                <div class="avatar-container m-auto">
                    <img class="avatar-face" src="img/avatar/faces/${client.avatar.face}.svg">
                    <img class="avatar-hat" src="img/avatar/hats/${client.avatar.hat}.svg">
                </div>
                <div class="text-light mt-2">${nickname}</div>
                <div class="text-${readyClass}">${ready}</div>
            </li>`;
        });
        $('#display-clients').html(html);
    }
}

function generateAvatarSelector() {
    var displayHats = $('.select-hat');
    var displayFaces = $('.select-face');
    HATS.forEach(hat => {
        displayHats.append(`<div class="items"><img src="img/avatar/hats/${hat}.svg"></div>`);
    });
    FACES.forEach(face => {
        displayFaces.append(`<div class="items"><img src="img/avatar/faces/${face}.svg"></div>`);
    });
}

//////////////////////////////////////////
// Sending
//////////////////////////////////////////

$(window).resize(() => {
    scaleCanvas();
})

$('.color-btn').on('click', () => {
    $('#display-color-container').toggle();
})

$('#btn-color-picker').on('click', () => {
    $('#display-color-container').toggle();
});

$('#btn-save').on('click', () => {
    var svg = document.getElementById("output").innerHTML;
    socket.emit('server.svg.save', svg);
    socket.gameState = gameStates.WAIT;
});

$('#btn-ready').on('click', () => {
    socket.emit('server.ready');
});

$('#btn-go').on('click', event => {
    createRipple(event);
    socket.gameState = gameStates.LOBBY;
});

$('#btn-join').on('click', event => {
    createRipple(event);
    var nickname = $('#input-nickname').val();
    var roomId = $('#input-roomcode').val();
    var hat = $('.select-hat .slick-center')[0].firstElementChild.src.split('/').pop().split('.')[0];
    var face = $('.select-face .slick-center')[0].firstElementChild.src.split('/').pop().split('.')[0];

    var avatar = { hat: hat, face: face };

    if (nickname !== "" && roomId !== "" && avatar.hat !== "" && avatar.face !== "") {
        socket.nickname = nickname;
        socket.avatar = avatar;
        socket.emit('server.nickname', nickname);
        socket.emit('server.avatar', avatar);
        socket.emit('server.room.join', roomId);
        socket.gameState = gameStates.ROOM;
    }
});

$('#btn-create').on('click', () => {
    socket.emit('server.room.create');
});

$('#btn-leave').on('click', () => {
    socket.emit('server.room.leave');
});

//////////////////////////////////////////
// Receiving
//////////////////////////////////////////

socket.on('client.init', data => {
    updateRoom(data);
    socket.avatar = data.avatar;
    HATS = data.hats;
    FACES = data.faces;
    generateAvatarSelector();
});

socket.on('client.room.update', data => {
    updateRoom(data);
});

socket.on('client.ready', () => {
    socket.gameState = gameStates.DRAW;
    scaleCanvas();
});

socket.on("client.sock.update", client => {
    updateClient(client);
});