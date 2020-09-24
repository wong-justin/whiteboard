// whiteboard implementation meeting custom needs
// Justin Wong

// example usage:
// var settings = {
//     showOverlays: true,
//     blackBackground: true;
// };
// whiteboard.init(settings);

const app = (() => {
    // html elements
    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d');
    let parent = document.body;
    let zoomControlArea = document.createElement('div');
    let undoControlArea = document.createElement('div');
    let cursor = document.createElement('div');
    let link = document.createElement('a');
    //
//    const Modes = {Pen:'pen', Pan:'pan', Zoom:'zoom', Undo:'undo'};//, erase:5};
    const Modes = {Pen:1, Pan:2, Zoom:3, Undo:4, Erase:5};
    let currMode = null;
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
//    let commandStack = [];
//    let redoStack = [];
    let backgroundColor = 'white';//'green';  // eraser
    let foregroundColor = 'black';  // current pen
    let currPath = [];
    let cursorWidth = 6;
    let eraserWidth = 12;
    
    function init(settings) {
        initCSS();
        resize();   // inits canvas size and pen
        addEventListeners();
    }
    
    function initCSS() {
        parent.insertBefore(canvas, parent.firstChild); //parent.appendChild(canvas);
        parent.style.margin = '0%'; // need to draw to edge of whiteboard
        canvas.style.display = 'block'; // prevent scrollbars
//        canvas.style.border = '1px solid black';
        
        // full window area:        
        canvas.style.height = '100vh';//%';
        canvas.style.width = '100vw';//%';
        
        // control area(s)
        document.body.appendChild(zoomControlArea);
        zoomControlArea.style.position = 'fixed';
        zoomControlArea.style.right = '0px';
        zoomControlArea.style.top = '100px';
        zoomControlArea.style.width = '75px';
        zoomControlArea.style.height = '250px';
//        zoomControlArea.style.border = '1px solid red';
        zoomControlArea.style.pointerEvents = 'none';
        
        // cursor
        parent.style.cursor = 'none';
        cursor.style.position = 'fixed';
        cursor.style.pointerEvents = 'none';
        document.body.appendChild(cursor);
        defaultCursorStyle();
        
        // misc?
        link.style.display = 'none';
        link.setAttribute('download', 'whiteboard.png');
    }
    
    function initPen() {
        // canvas context stroking
        ctx.strokeStyle = foregroundColor;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
    }
    
    function defaultCursorStyle() {
        cursor.style.display = 'block'
        cursor.style.width = cursorWidth + 'px';
        cursor.style.height = cursorWidth + 'px';
        cursor.style.borderRadius = '50%';
        cursor.style.background = foregroundColor;
        cursor.style.border = 'none';
    }
    
    function addEventListeners() {
        // mouse events
        canvas.addEventListener('mousedown', onMouseDown);
        canvas.addEventListener('mouseup', onMouseUp);
        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('contextmenu', (e)=>e.preventDefault());
        // key events
        window.addEventListener('keydown', onKeyPress);
        window.addEventListener('keydown', onKeyToggleOn);
        window.addEventListener('keyup', onKeyToggleOff);
        // window events
        window.addEventListener('resize', resize);
        parent.addEventListener('mouseout', onMouseOut);
    }
    
    // EVENT HANDLERS 
    // window
    
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
            unsetMode();
        }
    }
    
    // mouse
    
    function onMouseDown(e) {
        switch (e.button) {
            case 0: // left click
                if (currMode == Modes.Undo) {// && insideArea(e, undoControlArea)) {
                    lastDirection = null;
                }
                else if (currMode === null) {
                    startDraw(e);
                }
                break;
            case 2: // right click  
                if (insideArea(e, zoomControlArea)) {
                    setMode(Modes.Zoom);
                }
                else {
                    setMode(Modes.Pan);
                }
                break;
        }
    }
    
    function onMouseUp(e) {
        switch (e.button) {
            case 0: // left click
//                if (currMode == Modes.Undo) {
//                    unsetMode();
//                }
                if (currMode == Modes.Pen) {
                    stopDraw(e);
                }
                break;
            case 2: // right click
                unsetMode();
                break;
        }
    }
    
    function onMouseMove(e) {
        cursor.style.left = e.clientX - cursorWidth/2 + 'px';
        cursor.style.top = e.clientY - cursorWidth/2 + 'px';
        
        switch (currMode) {
            case Modes.Pen:
                draw(e);
                break;
            case Modes.Pan:
                pan(e);
                break;
            case Modes.Zoom:
                var factor = calcZoomFactor(e);
                zoom(factor);
                break;
            case Modes.Undo:
                if ( switchedDirection(e) ) {undo();}
                break;
            case Modes.Erase:
                erase(e);
                break;
        }
        
//        lastCoords[0] = e.clientX;
//        lastCoords[1] =  e.clientY;
        var mousePos = getRelativeMousePos(e);
        
        lastCoords[0] = mousePos[0];
        lastCoords[1] = mousePos[1];
        
        // ? 
//        requestAnimationFrame(() => onMouseMove(e));
    }
    
    // keypresses
    
    function onKeyToggleOn(e) {
        switch (e.key) {
            case 'Shift':
                setMode(Modes.Erase);
        }
    }
    
    function onKeyToggleOff(e) {
        switch (e.key) {
            case 'Shift':
                unsetMode();
        }
    }
    
    function onKeyPress(e) {
//        console.log(e.key)
        
        if (e.ctrlKey) {
            switch (e.key) {
                case 'z':
                    undo();
                    break;
                case 'y':
                    redo();
                    break;
                case 's':
                    e.preventDefault();
                    save();
                    break;
            }
        }
        else{
            switch (e.key) {
                case ' ':   // clear canvas and data
                    paths = [];
                    clearAll();
                    break;
                case 'r':
                    setForegroundColor('red');
                    break;
                case 'g':
                    setForegroundColor('green');
                    break;
                case 'b':
                    setForegroundColor('blue');
                    break;
                case 'f':
                    setForegroundColor('black');
                    break;
            }
        }
    }
        
    // MAIN COMMANDS
    
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
    
    function pan(e) {
        var mousePos = getRelativeMousePos(e);
        var dx = mousePos[0] - lastCoords[0];
        var dy = mousePos[1] - lastCoords[1];
        
        paths = paths.map(pathObj => {
            return {
                path: pathObj.path.map(pt => translatePoint(pt, dx, dy)),
                color: pathObj.color};
        });
        clearAll();
        redrawAll();
    }   
    
    function zoom(factor) {
        paths = paths.map(pathObj => {
            return {
                path: pathObj.path.map(pt => scale(pt, factor, origin)),
                color: pathObj.color};
        });
        clearAll();
        redrawAll();
    }
    
    function undo() {
        var lastPath = paths.pop();
        if (lastPath) {
//            redoStack.push(lastPath);
            clearAll();
            redrawAll();
        } 
    }
    
    /*
    function redo() {
//        var undidPath = redoStack.pop();
//        if (undidPath) {
//            paths.push(undidPath);
//            clearAll();
//            redrawAll();
//        }  
    }
    */
    
    function erase(e) {
        
        // crossedPaths = paths.filter(path => isIntersecting(mousePos));
        // paths.pop(crossedPaths);
        
        var erasedSomething = false;
        
        var mousePos = getRelativeMousePos(e);
        var mouseMoveBox = boundingBox(mousePos, lastCoords);
        mouseMoveBox.xmin -= eraserWidth / 2;
        mouseMoveBox.ymin -= eraserWidth / 2;
        mouseMoveBox.xmax += eraserWidth / 2;
        mouseMoveBox.ymax += eraserWidth / 2;
        
        var i = paths.length - 1;
        for (i; i >=0; i--) {
            var path = paths[i].path;
            
            if ( boxIntersectsPath(mouseMoveBox, path) ) {
                paths.splice(i, 1);
                erasedSomething = true;
            }
        }
        
        if (erasedSomething) {
            clearAll();
            redrawAll();
        } 
    }

    /* 
    function eraseAsAcceleratingWhitePath() {
        // increase line width for bigger strokes

//        var dx = e.clientX - lastCoords[0];
//        var dy = e.clientY - lastCoords[1];
//        var dist = dx * dx + dy * dy;
//
//        var largeAcceleration = dist - lastDist > 10;
//        var largeMovement = dist > 200;
//
//        if (largeAcceleration || largeMovement) {
//            ctx.lineWidth = Math.min(ctx.lineWidth + 10,
//                                     200);
//        } else {
//            ctx.lineWidth = Math.max(ctx.lineWidth - 10,
//                                     30);
//        }
//
//        lastDist = dist;
//
//        draw(e);
    }
    */
    
    let clearAll = () => ctx.clearRect(0, 0, canvas.width, canvas.height);  // just whites canvas but not data
    let redrawAll = () => paths.map((path) => drawPath(path.path, path.color));
    
    // HELPERS
    // draw
    
    function startDraw(e) {
        setMode(Modes.Pen);
        currPath = [];  // reset curr path
        draw(e);    // draw a dot, covering case of single click
    }

    function stopDraw(e) {
        paths.push({path:currPath, color:foregroundColor}); // finish curr path
//        commandStack.push({fn: drawPath, path:currPath, color: foregroundColor});
        
        unsetMode();
    }
    
    function drawPath(path, color) {
        ctx.strokeStyle = color;    // temporarily set ctx color for this path
        
        var i = 0;
        var numPts = path.length;        
        lastPt = path[i];
        i += 1
        if (numPts == 1) {  // case of just a dot
            drawLine(lastPt[0], 
                     lastPt[1],
                     lastPt[0], 
                     lastPt[1]);
            return;
        }
        
        while (i < numPts) {
            
            currPt = path[i];
            drawLine(lastPt[0], 
                     lastPt[1],
                     currPt[0],
                     currPt[1]);
            
            lastPt = currPt;
            i += 1;
        } 
        
        ctx.strokeStyle = foregroundColor;  // return to old
    }
    
    function drawLine(x0, y0, x1, y1) {
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
    }
    
    // zoom
    
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
    
    function calcZoomFactor(e) {
        var dy = e.clientY - lastCoords[1];
        dy = Math.min(dy, 90)  // avoid zooming by nonpositive factor:
        return 1 - (dy/100);    // arbitrary descaling by 100
    }
    
    // pan
                  
    function translatePoint(pt, dx, dy) {
        return [pt[0] + dx, pt[1] + dy];
    }
    
    // undo
    
    function switchedDirection(e) {
        
        var currDirection = e.clientX > lastCoords[0];  // curr pos is right of prev pos
        
        //  if first stroke, set direction
        if (lastDirection == null) {
            lastDirection = currDirection;
        }
        
        // compare to last direction
        if (currDirection != lastDirection) {
            lastDirection = currDirection;  // set new direction now that it has changed
            return true;
        }
        else {return false;}    // hasn't switched direction yet
    }

    // erase
    
    /*
    function lineIntersectsPath(p0, p1, path) {
        var i = 0;
        var lastPt = path[0];
        i++;
        var numPts = path.length;
        while (i < numPts) {
            var currPt = path[i];
            if ( linesIntersect(p0, p1, lastPt, currPt) ) {
                return true;
            }
            
            lastPt = currPt;
            i++;
        }
        return false;
    }
    */
    
    function boxIntersectsPath(box, path) {

        var lastPt = path[0];        
        var numPts = path.length;
        if (numPts == 1) {
            return pointInBox(lastPt, box);
        }
        
        var i = 1;  
        while (i < numPts) {
            var currPt = path[i];
            if ( boxIntersectsLine(box, lastPt, currPt) ) {
                return true;
            }
            
            lastPt = currPt;
            i++;
        }
        return false;
    }
    
    function boxIntersectsLine(box, q0, q1) {
        if ( boxesOverlap(box, boundingBox(q0, q1)) ) {
            // check for real intersection
            
            return true;
        } else {return false;}  // doesn't pass this approx initial check
    }
    
    /*
    function linesIntersect(p0, p1, q0, q1) {
        var pBox = boundingBox(p0, p1);
        var qBox = boundingBox(q0, q1);
                
        if ( boxesOverlap(pBox, qBox) ) {
            // check for real intersection
            return true;
            
        } else {return false;}  // doesn't pass this approx initial check
    }
    */
    
    function boundingBox(ptA, ptB) {
        var xmin,
            xmax,
            ymin,
            ymax;
        
        if (ptA[0] < ptB[0]) {
            xmin = ptA[0];
            xmax = ptB[0];
        }
        else {
            xmin = ptB[0];
            xmax = ptA[0];
        }
        if (ptA[1] < ptB[1]) {
            ymin = ptA[1];
            ymax = ptB[1];
        }
        else {
            ymin = ptB[1];
            ymax = ptA[1];
        }
//        return [xmin, xmax, ymin, ymax];
        return {xmin:xmin, xmax:xmax, ymin:ymin, ymax:ymax};
    }
    
    function boxesOverlap(A, B) {
        return (A.xmin < B.xmin &&
                A.xmax > B.xmin &&
                A.ymin < B.ymin &&
                A.ymax > B.ymin) ||
               (B.xmin < A.xmin &&
                B.xmax > A.xmin &&
                B.ymin < A.ymin &&
                B.ymax > A.ymin);
    }
    
    function pointInBox(pt, box) {
        return (pt[0] >= box.xmin && 
                pt[0] <= box.xmax &&
                pt[1] >= box.ymin &&
                pt[1] <= box.ymax);
    }
    
    
    // event handler callback helpers and misc for transitioning/detecting
    
    function getRelativeMousePos(e) {
        var rect = e.target.getBoundingClientRect();
        return [
            e.clientX - rect.left,
            e.clientY - rect.top
        ];
    }
    
    function insideArea(e, div) {
        return ptInside(
            [e.clientX, e.clientY],
            div.getBoundingClientRect()
        );
    }
    
    function ptInside(pt, rect) {
        return (pt[0] > rect.left && 
                pt[0] < rect.right &&
                pt[1] > rect.top && 
                pt[1] < rect.bottom);
    }
    
    function setForegroundColor(newColor) {
        foregroundColor = newColor;
        ctx.strokeStyle = foregroundColor;
        cursor.style.background = foregroundColor;
    }
    
    function setMode(newMode) {
        switch (newMode) {
            case Modes.Zoom:
                hideCursor();
                break;
            case Modes.Undo:
                hideCursor();
                break;
            case Modes.Erase:
                eraserCursor();
        }
        currMode = newMode;
    }
    
    function unsetMode() {
//        switch (currMode) {
//            case Modes.Zoom:
//                showCursor();
//                break;
//            case Modes.Undo:
//                showCursor();
//                break;
//            case Modes.Erase:
//                eraseCursorOff();
//        }
        defaultCursorStyle();
        currMode = null;
    }
    
    let hideCursor = () => cursor.style.display = 'none';
    
    function eraserCursor() {
        cursor.style.borderRadius = '0%';
        cursor.style.background = backgroundColor;
        cursor.style.border = '1px solid black';
        cursor.style.width = eraserWidth + 'px';
        cursor.style.height = eraserWidth + 'px';
        cursor.style.border = '1px solid black';
        
    }
    
    // saving
    
    function save() {
        var ptArrs = paths.map(pathObj => pathObj.path);
        var xs = ptArrs.map(path => path.map(pt => pt[0])).flat();
        var ys = ptArrs.map(path => path.map(pt => pt[1])).flat();
        var xmin = min(xs),
            xmax = max(xs),
            ymin = min(ys),
            ymax = max(ys);
        
        console.log(xmin, xmax, ymin, ymax);
        
        var margin = 100;
        var totalWidth = (xmax - xmin) + 2*margin,
            totalHeight = (ymax - ymin) + 2*margin;
        
        var newCanvas = document.createElement('canvas');
        var newCtx = newCanvas.getContext('2d');
        newCanvas.width = totalWidth;
        newCanvas.height = totalHeight;
        
        var newPaths = paths.map(pathObj => {
            return {
                path: pathObj.path.map(pt => translatePoint(pt, 
                                                            -xmin + margin, 
                                                            -ymin + margin)),
                color: pathObj.color  
            };
        });
        
        var oldCtx = ctx,
            oldCanvas = canvas,
            oldPaths = paths;
        
        canvas = newCanvas;
        ctx = newCtx;
        paths = newPaths;
        
        initPen();
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        redrawAll();
        
        link.setAttribute('href', canvas.toDataURL("image/png").replace("image/png", "image/octet-stream"));
        link.click();
        
        canvas = oldCanvas;
        ctx = oldCtx;
        paths = oldPaths;
    }
    
    let min = (arr) => Math.min(...arr);
    let max = (arr) => Math.max(...arr);
        
    
    
    
    // command examples:
    //var drawCommand = {fn:drawPath, path:path, color:color}
    //var eraseCommand = {fn:drawErasePath, path:}
    //translatePoint.apply(args);
    
    

    
    // export global whiteboard.init
    
//    init(); //window.addEventListener('load', init());
    window.whiteboard = {init: (settings) => init(settings)};
})();