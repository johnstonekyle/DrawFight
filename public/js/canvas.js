var path;
var currentColor = "#000000";

tool.minDistance = 8;

function changeColor(color) {
    currentColor = color;
}

function onMouseDown(event) {
    // If we produced a path before, deselect it:
    if (path) {
        path.selected = false;
    }

    // Create a new path and set its stroke color to black:
    path = new Path({
        segments: [event.point],
        strokeColor: currentColor,
        strokeWidth: 15,
        strokeCap: 'round',
        strokeJoin: 'round'
    });
}

// While the user drags the mouse, points are added to the path
// at the position of the mouse:
function onMouseDrag(event) {
    path.add(event.point);
}

// When the mouse is released, we simplify the path:
function onMouseUp(event) {
    console.log(currentColor);
    if(currentColor !== "#ffffff"){
        path.simplify(30);
    }
    var svg = decodeURI(project.exportSVG({asString: true}));
    document.getElementById("output").innerHTML = svg;
}

document.getElementById('color-black').addEventListener('click', function() {
    currentColor = "#111111";
})

document.getElementById('color-grey').addEventListener('click', function() {
    currentColor = "#999999";
})

document.getElementById('color-white').addEventListener('click', function() {
    currentColor = "#ffffff";
})

document.getElementById('color-pink').addEventListener('click', function() {
    currentColor = "#fdb7dd";
})

document.getElementById('color-red').addEventListener('click', function() {
    currentColor = "#F45B69";
})

document.getElementById('color-brown').addEventListener('click', function() {
    currentColor = "#654320";
})

document.getElementById('color-orange').addEventListener('click', function() {
    currentColor = "#fb7f03";
})

document.getElementById('color-yellow').addEventListener('click', function() {
    currentColor = "#f3e370";
})

document.getElementById('color-green').addEventListener('click', function() {
    currentColor = "#62AD71";
})

document.getElementById('color-lightblue').addEventListener('click', function() {
    currentColor = "#acd3f4";
})

document.getElementById('color-blue').addEventListener('click', function() {
    currentColor = "#4879AF";
})

document.getElementById('color-purple').addEventListener('click', function() {
    currentColor = "#785cb4";
})