// whiteboard implementation meeting custom needs
// Justin Wong

// example usage:
// var settings = {
//     showOverlays: false,
// };
// whiteboard.init(settings);

const app = (() => {
    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d');
    let parent = document.body;
    let zoomControlArea = document.createElement('div');
    let undoControlArea = document.createElement('div');
    
    let lastCoords = [null, null];
    let origin = [0, 0];
    let lastDist = 0;
    let lastDirection = null;
    let penDown = false;
    let eraserMode = false;
    let panMode = false;
    let zoomMode = false;
    let undoMode = false;
    let paths = [];
//    let redoStack = [];
    let backgroundColor = 'white';//'green';  // eraser
    let foregroundColor = 'black';  // current pen
    let currPath = [];
    
    function init(settings) {
        initCSS();
        resize();   // inits canvas size and pen
        addEventListeners();
    }
    
    function initCSS() {
//        parent.appendChild(canvas);
        parent.insertBefore(canvas, parent.firstChild);
        parent.style.margin = '0%'; // need to draw to edge of whiteboard
        canvas.style.display = 'block'; // prevent scrollbars
//        canvas.style.border = '1px solid black';
        
        // full window area:        
        canvas.style.height = '100vh';//%';//vh';
        canvas.style.width = '100vw';//%';//vw';
        
        // control areas
        document.body.appendChild(zoomControlArea);
        zoomControlArea.style.position = 'fixed';
        zoomControlArea.style.right = '0px';
        zoomControlArea.style.top = '100px';
        zoomControlArea.style.width = '75px';
        zoomControlArea.style.height = '250px';
        zoomControlArea.style.border = '1px solid red';
        zoomControlArea.style.pointerEvents = 'none';
        
//        document.body.appendChild(undoControlArea);
//        undoControlArea.style.position = 'fixed';
//        undoControlArea.style.left = '100px';
//        undoControlArea.style.top = '0px';
//        undoControlArea.style.width = '250px';
//        undoControlArea.style.height = '50px';
//        undoControlArea.style.border = '1px solid red';
//        undoControlArea.style.pointerEvents = 'none'
        
    }

    function initPen() {
        setEraserMode(false);
        ctx.lineCap = 'round';
    }
    
    function addEventListeners() {
        // mouse events
        canvas.addEventListener('mousedown', onMouseDown);
        canvas.addEventListener('mouseup', onMouseUp);
        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('contextmenu', (e)=>e.preventDefault());
        // key events
        window.addEventListener('keydown', performCommand);
        window.addEventListener('keydown', setMode);
        window.addEventListener('keyup', unsetMode);
        // window events
        window.addEventListener('resize', resize);
        parent.addEventListener('mouseout', onMouseOut);
    }
    
    // drawing

    function startDraw(e) {
        penDown = true;
        currPath = [];  // reset curr path
        draw(e);    // draw a dot, covering case of single click
    }

    function stopDraw(e) {
        paths.push(currPath); // finish curr path
        penDown = false;
    }
    
    function draw(e) {
        
//        drawLine(lastCoords.x, 
//                 lastCoords.y, 
//                 e.clientX, 
//                 e.clientY);
//
//        currPath.push([e.clientX, e.clientY]);
        
        var mousePos = getRelativeMousePos(e);
        
        drawLine(lastCoords[0],
                 lastCoords[1], 
                 mousePos[0],
                 mousePos[1]);
        
        currPath.push([mousePos[0], mousePos[1]]);
    }
    
    function erase(e) {
        // increase line width for bigger strokes
        var dx = e.clientX - lastCoords[0];
        var dy = e.clientY - lastCoords[1];
        var dist = dx * dx + dy * dy;

        var largeAcceleration = dist - lastDist > 10;
        var largeMovement = dist > 200;

        if (largeAcceleration || largeMovement) {
            ctx.lineWidth = Math.min(ctx.lineWidth + 10,
                                     200);
        } else {
            ctx.lineWidth = Math.max(ctx.lineWidth - 10,
                                     30);
        }

        lastDist = dist;

        draw(e);
    }
    
    function drawLine(x0, y0, x1, y1) {
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
    }
     
    function onMouseDown(e) {
        switch (e.button) {
            case 0: // left click
                if (eraserMode) {// && insideUndoArea(e)) {
                    undoMode = true;
                    lastDirection = null;
                    setEraserMode(false);
                }
                else {
                    startDraw(e);
                }
                break;
            case 2: // right click  
                if (insideZoomArea(e)) {
                    zoomMode = true;
                }
                else {
                    panMode = true;
                }
                break;
        }
    }
    
    function onMouseUp(e) {
        switch (e.button) {
            case 0: // left click
                if (undoMode) {
                    undoMode = false;
                }
                else {
                    stopDraw(e);
                }
                break;
            case 2: // right click
//                stopPan(e);
                if (zoomMode) {
                    zoomMode = false;
                }
                else {
                    panMode = false;
                }
                break;
        }
    }
    
    function onMouseMove(e) {
        if (panMode) {
            pan(e);
        }
        else if (zoomMode) {
            var factor = calcZoomFactor(e);
            zoom(factor);
        }
        else if (undoMode) {
            if ( switchedDirection(e) ) {
                undo();
            }
        }
        else if (penDown) {
            draw(e);
        }
        else if (eraserMode) {
//            erase(e);            
        }
        
//        lastCoords[0] = e.clientX;
//        lastCoords[1] =  e.clientY;
        var mousePos = getRelativeMousePos(e);
        
        lastCoords[0] = mousePos[0];
        lastCoords[1] = mousePos[1];
    }
    
    // keypresses
    
    function setMode(e) {
        switch (e.key) {
            case 'Shift':
                setEraserMode(true);
                break;
        }
    }
    
    function unsetMode(e) {
        switch (e.key) {
            case 'Shift':
                setEraserMode(false);
                break;
        }
    }
    
    function setEraserMode(on=true) {
        // change pen style accordingly
        eraserMode = on;
        if (on) {
//            ctx.strokeStyle = backgroundColor;
//            ctx.lineWidth = 50;
        } else {
//            stopDraw(); // penup even if mousedown still
//            ctx.strokeStyle = foregroundColor;
            ctx.lineWidth = 4;
        }
    }
    
    function performCommand(e) {
//        console.log(e.key)
        
        if (e.key == ' ') {
            // clear canvas and data
            paths = [];
            clearAll();
        }
        else if (e.ctrlKey && e.key == 'z') {
            undo();
        }
        else if (e.ctrlKey && e.key == 'y') {
            redo();
        }
//        else if (e.key == '+') {
//            zoom(3/2);
//        }
//        else if (e.key == '-') {
//            zoom(2/3);
//        }
    }
    
    // commands and related
    
    function undo() {
        var lastPath = paths.pop();
        if (lastPath) {
//            redoStack.push(lastPath);
            clearAll();
            redrawAll();
        } 
    }
    
    function redo() {
//        var undidPath = redoStack.pop();
//        if (undidPath) {
//            paths.push(undidPath);
//            clearAll();
//            redrawAll();
//        }  
    }
    
    function redrawAll() {
        paths.map(path => drawPath(path));
    }
    
    function clearAll() {
        // just clears canvas but not data
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    function drawPath(path) {
        var i = 0;
        var numPts = path.length;
        lastPt = path[i];
        i += 1
        
        while (i < numPts) {
            
            currPt = path[i];
            drawLine(lastPt[0], 
                     lastPt[1],
                     currPt[0],
                     currPt[1])
            
            lastPt = currPt;
            i += 1;
        } 
    }
    
    function zoom(factor) {
        paths = paths.map(path => path.map(pt => scale(pt, factor, origin)));
        clearAll();
        redrawAll();
    }
    
    function scale(pt, factor, origin) {
        var rel = relativeTo(pt, origin);
        var scaled = [
            rel[0] * factor,
            rel[1] * factor
        ];
        return unrelativeTo(scaled, origin);
    }
    
    function relativeTo(pt, origin) {
        return [
            pt[0] - origin[0],
            pt[1] - origin[1]
        ];
    }
    
    function unrelativeTo(pt, origin) {
        return [
            pt[0] + origin[0],
            pt[1] + origin[1]
        ];
    }
    
    function pan(e) {
        var mousePos = getRelativeMousePos(e);
        var dx = mousePos[0] - lastCoords[0];
        var dy = mousePos[1] - lastCoords[1];
        
        paths = paths.map(path => path.map(pt => translatePoint(pt, dx, dy)));
        clearAll();
        redrawAll();
    }
                  
    function translatePoint(pt, dx, dy) {
        return [pt[0] + dx, pt[1] + dy];
    }
    
    // any other window stuff
    
    function resize() {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        origin = [canvas.width / 2, canvas.height / 2];
        // because board state has been reset:
        initPen();
        redrawAll();    
    }
    
    function onMouseOut(e) {
        if (!e.relatedTarget && !e.toElement) {
//            console.log('mouse out, mouse was up (normal)');
        }
        else {
//            console.log('left window during mousedown!');
            // cancel any mousedown modes that need to be cancelled upon leaving window
            // eg 
            penDown = false;
            panMode = false;
            eraserMode = false;
            zoomMode = false;
        }
    }
    
    function getRelativeMousePos(e) {
        var rect = e.target.getBoundingClientRect();
        return [
            e.clientX - rect.left,
            e.clientY - rect.top
        ];
    }
    
    function insideUndoArea(e) {
        return ptInside(
            [e.clientX, e.clientY],
            undoControlArea.getBoundingClientRect()
        );
    }
    
    function insideZoomArea(e) {
        return ptInside(
            [e.clientX, e.clientY],
            zoomControlArea.getBoundingClientRect()
        );
    }
    
    function ptInside(pt, rect) {
        return (pt[0] > rect.left && 
                pt[0] < rect.right &&
                pt[1] > rect.top && 
                pt[1] < rect.bottom);
    }
    
    function calcZoomFactor(e) {
        var dy = e.clientY - lastCoords[1];
        // avoid zooming by 0:
        if (dy == 100) {
            dy = 101;
        }
        return 1 - (dy/100);
    }
    
    function switchedDirection(e) {
        var currDirection = e.clientX > lastCoords[0];
        //  if first stroke, setting direction:
        if (lastDirection == null) {
            lastDirection = currDirection;
        }
        // compare to last direction
        if (currDirection != lastDirection) {
            lastDirection = currDirection;
            return true;
        }
        else {return false;}
    }
    
    // draw command:
    //var drawCommand = {fn:drawPath, path:path, color:color}
    //var eraseCommand = {fn:drawErasePath, path:}
    
    //translatePoint.apply(args);
    

//    init(); //window.addEventListener('load', init());
    
    // export global 
    window.whiteboard = {init: (settings) => init(settings)};
})();