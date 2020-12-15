var path;
var currentColor = "#000000";

tool.minDistance = 8;

function changeColor(color) {
    currentColor = color;
}

document.getElementById('color-red').addEventListener('click', function() {
    currentColor = "#F45B69";
})

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
    path.simplify(30);
    var svg = decodeURI(project.exportSVG({asString: true}));
    document.getElementById("output").innerHTML = svg;
}