// whiteboard implementation meeting custom needs
// Justin Wong

// example usage:
// let settings = {
//     showOverlays: true,
//     blackBackground: true;
// };
// whiteboard.init(settings);

/**
 * some important structures:
 *
 * path - array of [x,y] arrs
 * pathObj aka displayedPath - {path: [...], color: '...'}
 *
 *
 *
 **/

// possibile actions implementation for undo/redo:
// command(args) // eg drawPath(path, color)
//  > append to actions history
// undo - pop last actions history into redoable stack and inverseAction(action, ...args)
// redo - perform top action in redoable stack action(...args) and append to actions history
//  > redo stack is cleared once new history begins

// inverseAction(func, ...args)
//   switch(func)
//     drawPath: erase(path)
//     erase: drawPath(path, color)
//     clearAll: drawPaths(paths)
//

// Colors = {
//  BLACK: 'black',
//  foreground: 'white',
//  background:
// toggleDarkMode: () => {}
// }

(() => {
    // html elements
    let parent = document.body;
    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d');
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
    let paths = [];
//    let commandStack = [];
//    let redoStack = [];
    let backgroundColor = 'black';  // eraser
    let foregroundColor = 'white';  // current pen
    let currPath = [];
    let cursorWidth = 6;
    let eraserWidth = 12;

    function showHelpMessage() {
      let message = `
        Controls:

        Shift + mouse move
         - erase
        Space
         - erase all
        Right click + mouse move
         - pan
        Right click upper right margin + mouse move up/down
         - zoom in/out
        R,G,B
         - pen colors
        F
         - default pen color (white or black)
        Ctrl + Z
         - erase last path
        Ctrl + S
         - save as image
        D
         - toggle dark mode
      `.replace(/  +/g, '');  // remove indents
      console.log(message);
    }

    function init(settings) {
        initElements();     // onetime inits on load
        addEventListeners();
        onResize();         // canvas size init
        setDefaultPen();    // stroke color
        setDefaultCursor(); // cursor style

        showHelpMessage();  // instructions
    }

    /**** STYLING ****/

    function initElements() {
        // called once on page load; adding and styling page elements

        // canvas
        parent.insertBefore(canvas, parent.firstChild); //parent.appendChild(canvas);
        parent.style.margin = '0%'; // full window area
        setStyle(canvas, {
            display: 'block', // prevent scrollbars
            height: '100vh',  // full window area. 100vh != 100%
            width: '100vw',
            backgroundColor: backgroundColor,
            // border: '1px solid black';
        });

        // control area(s)
        document.body.appendChild(zoomControlArea);
        setStyle(zoomControlArea, {
            position: 'fixed',
            right: '0px',
            top: '100px',
            width: '75px',
            height: '250px',
            // border: '1px solid red', // for visual testing
            pointerEvents: 'none',
        });

        // cursor
        parent.style.cursor = 'none'; // get rid of default mouse pointer
        document.body.appendChild(cursor);
        setStyle(cursor, {
            position: 'fixed',
            pointerEvents: 'none',
        });


        // misc? background download element
        link.style.display = 'none';      // invisible
        link.download = 'whiteboard.png'; // filename; make renameable? auto increment count, eg whiteboard_2.png?
        // link.setAttribute('download', 'whiteboard.png');
    }

    function setDefaultPen() {
        // canvas context stroking
        setProperties(ctx, {
            strokeStyle: foregroundColor,
            lineWidth: 4,
            lineCap: 'round',
        });
    }

    function setDefaultCursor() {
        setStyle(cursor, {
            display: 'block',
            width: cursorWidth + 'px',
            height: cursorWidth + 'px',
            borderRadius: '50%',
            background: foregroundColor,
            border: 'none',
        });
    }

    function hideCursor() {
      cursor.style.display = 'none'
    }

    function setEraserCursor() {
        setStyle(cursor, {
            borderRadius: '0%',
            background: backgroundColor,
            width: eraserWidth + 'px',
            height: eraserWidth + 'px',
            // border: '1px solid ' + foregroundColor,
            border: '1px solid ' + invert(backgroundColor),
        });
    }

    function setForegroundColor(newColor) {
        foregroundColor = newColor;
        ctx.strokeStyle = foregroundColor;
        // if cursor.style.background is default(black or white), invert it now; else leave it alone
        cursor.style.background = foregroundColor;
    }

    function setBackgroundColor(newColor) {
        backgroundColor = newColor;
        canvas.style.backgroundColor = backgroundColor;
    }

    function toggleDarkMode() {

        setForegroundColor(backgroundColor);
        setBackgroundColor(invert(backgroundColor));

        // invert the paths of default color
        paths = paths.map(pathObj => ({
            path: pathObj.path,
            // color: (pathObj.color == 'black' || pathObj.color == 'white') ?
            color: (pathObj.color == backgroundColor) ?
                // foregroundColor :
                invert(backgroundColor) :
                pathObj.color
        }));
        redrawAll();
    }

    /**** EVENT LISTENERS ****/

    function addEventListeners() {
        // called once on page load

        // mouse events
        addListeners(canvas, {
            'mousedown': onMouseDown,
            'mouseup': onMouseUp,
            'mousemove': onMouseMove,
            'contextmenu': (e) => e.preventDefault(),
        });
        // key events
        addListeners(window, {
            'keydown': (e) => {
                onKeyPress(e);
                onKeyToggleOn(e)
            },
            'keyup': onKeyToggleOff,
        });
        // window events
        addListeners(window, {'resize'  : onResize});
        addListeners(parent, {'mouseout': onMouseOut});
    }

    // window

    function onResize() {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        origin = [canvas.width / 2, canvas.height / 2];
        // because board state has been reset:
        setDefaultPen();  // restore defult stroke
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
                if (currMode == Modes.Undo) {// && insideDiv(e, undoControlArea)) {
                    lastDirection = null;
                }
                else if (currMode === null) {
                    startDraw(e);
                }
                break;
            case 2: // right click
                if (insideDiv(e, zoomControlArea)) {
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
                let factor = calcZoomFactor(e);
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
        let mousePos = getRelativeMousePos(e);

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
                    setForegroundColor(invert(backgroundColor));
                    break;
                case 'd':
                    toggleDarkMode();
            }
        }
    }

    /**** MAIN WHITEBOARD COMMANDS, BUSINESS LOGIC ****/

    // create/delete paths

    function draw(e) {

//        drawLine(lastCoords.x,
//                 lastCoords.y,
//                 e.clientX,
//                 e.clientY);
//
//        currPath.push([e.clientX, e.clientY]);

        let mousePos = getRelativeMousePos(e);

        drawLine(lastCoords[0],
                 lastCoords[1],
                 mousePos[0],
                 mousePos[1]);

        currPath.push([mousePos[0], mousePos[1]]);
    }

    function undo() {
        let lastPath = paths.pop();
        if (lastPath) {
//            redoStack.push(lastPath);
            clearAll();
            redrawAll();
        }
    }

    /*
    function redo() {
//        let undidPath = redoStack.pop();
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

        let erasedSomething = false;

        let mousePos = getRelativeMousePos(e);
        let mouseMoveBox = geometry.boundingBox(mousePos, lastCoords);
        mouseMoveBox.xmin -= eraserWidth / 2;
        mouseMoveBox.ymin -= eraserWidth / 2;
        mouseMoveBox.xmax += eraserWidth / 2;
        mouseMoveBox.ymax += eraserWidth / 2;

        let i = paths.length - 1;
        for (i; i >=0; i--) {
            let path = paths[i].path;

            if ( geometry.boxIntersectsPath(mouseMoveBox, path) ) {
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

//        let dx = e.clientX - lastCoords[0];
//        let dy = e.clientY - lastCoords[1];
//        let dist = dx * dx + dy * dy;
//
//        let largeAcceleration = dist - lastDist > 10;
//        let largeMovement = dist > 200;
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

    // changing views

    function pan(e) {
        let mousePos = getRelativeMousePos(e);
        let dx = mousePos[0] - lastCoords[0];
        let dy = mousePos[1] - lastCoords[1];

        paths = paths.map(pathObj => {
            return {
                path: pathObj.path.map(pt => geometry.translatePoint(pt, dx, dy)),
                color: pathObj.color
            };
        });
        clearAll();
        redrawAll();
    }

    function zoom(factor) {
        paths = paths.map(pathObj => {
            return {
                path: pathObj.path.map(pt => geometry.scale(pt, factor, origin)),
                color: pathObj.color};
        });
        clearAll();
        redrawAll();
    }

    function clearAll() {
      // just whites canvas but not data
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    function redrawAll() {
      paths.map((path) => drawPath(path.path, path.color));
    }

    /**** HELPERS ****/

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

        let i = 0;
        let numPts = path.length;
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

    // other

    function calcZoomFactor(e) {
        // helper for zoom command
        let dy = e.clientY - lastCoords[1];
        dy = Math.min(dy, 90)  // avoid zooming by nonpositive factor:
        return 1 - (dy/100);    // arbitrary descaling by 100
    }

    function switchedDirection(e) {
        // helper for deprecated undo command (the back and forth accelerating one)

        let currDirection = e.clientX > lastCoords[0];  // curr pos is right of prev pos

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

    function getRelativeMousePos(e) {
        // helper for erase command
        let rect = e.target.getBoundingClientRect();
        return [
            e.clientX - rect.left,
            e.clientY - rect.top
        ];
    }

    function insideDiv(e, div) {
        return geometry.pointInRect(
            [e.clientX, e.clientY],
            div.getBoundingClientRect()
        );
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
                // eraserCursor();
                setEraserCursor();
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
        // defaultCursorStyle();
        setDefaultCursor();
        currMode = null;
    }

    // saving

    function save() {
        let ptArrs = paths.map(pathObj => pathObj.path);
        let xs = ptArrs.map(path => path.map(pt => pt[0])).flat();
        let ys = ptArrs.map(path => path.map(pt => pt[1])).flat();
        let left = geometry.min(xs),
            right = geometry.max(xs),
            bottom = geometry.min(ys),
            top = geometry.max(ys);

        // console.log(xmin, xmax, ymin, ymax);

        let margin = 100;
        let totalWidth  = (right - left) + 2*margin,
            totalHeight = (top - bottom) + 2*margin;

        let tempCanvas = document.createElement('canvas');
        let tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = totalWidth;
        tempCanvas.height = totalHeight;

        let tempPaths = paths.map(pathObj => {
            return {
                path: pathObj.path.map(pt => geometry.translatePoint(pt,
                                                                    -left + margin,
                                                                    -bottom + margin)),
                color: pathObj.color
            };
        });

        let oldCtx = ctx,
            oldCanvas = canvas,
            oldPaths = paths;

        canvas = tempCanvas;
        ctx = tempCtx;
        paths = tempPaths;

        setDefaultPen();
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        redrawAll();

        link.setAttribute('href', canvas.toDataURL("image/png").replace("image/png", "image/octet-stream"));
        link.click();

        canvas = oldCanvas;
        ctx = oldCtx;
        paths = oldPaths;
    }

    // convenience, readability

    let setStyle = (obj, styles) => Object.assign(obj.style, styles);
    let setProperties = (obj, props) => Object.assign(obj, props);

    // listeners = {'event type': function, ...}
    let addListeners = (obj, listeners) => Object.keys(listeners).forEach(type => {
        let callback = listeners[type];
        obj.addEventListener(type, callback);
    });

    // opposite of black or white only
    let invert = (color) => (color == 'white' ? 'black' : 'white');



    // command examples:
    //let drawCommand = {fn:drawPath, args: [...]}
    //let eraseCommand = {fn:drawErasePath, path:}
    //translatePoint.apply(args);


    // function undoCommand(func, ...args) {
    //     switch (func) {
    //         case drawPath:
    //             return undoDrawPath(...args);
    //         case erasePath:
    //             return undoErasePath(...args);
    //         case clearAll:
    //             return undoClearAll(...args);
    //     }
    // }
    //
    // function redo(command, ...args) {
    //
    // }
    //
    // function undoDrawPath(path) {
    //     let path = paths.pop(-1);
    //     if (path) {
    //         clearAll();
    //         redrawAll();
    //     }
    //     history.append(drawPath, path);
    // }
    //
    // function undoClearAll(paths) {
    //
    // }



    /**** export globals ****/

    //    init(); //window.addEventListener('load', init());  // load automatically
    window.whiteboard = {init,}; // let caller decide when to load by using whiteboard.init()
})();
