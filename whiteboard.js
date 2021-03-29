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


// path:
// {id, points, color}

(() => {
    // html elements
    let parent = document.body;
    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d');
    let zoomControlArea = document.createElement('div');
    let undoControlArea = document.createElement('div');
    let cursor = document.createElement('div');
    let link = document.createElement('a');
    // some constants, enums
    const Mode = {PEN:1, PAN:2, ZOOM:3, UNDO:4, ERASE:5, current: null}
    const Command = {CREATE_PATH: 1, DELETE_PATHS: 2}
    // let CommandManager = {
    //     addType({type, execute, undo}) {
      //   // this.setAttribute(type, this._enumCount++);
      //   this.executeHandlers[type] = execute;
      //   this.undoHandlers[type] = undo
      // }
    // }
    const Color = {
        BLACK: 'black',
        WHITE: 'white',
        RED: 'red',
        BLUE: 'blue',
        GREEN: 'green',
        foreground: 'white',
        background: 'black',
        // opposite of background, aka default foreground
        get default() {return (Color.background == Color.WHITE ? Color.BLACK : Color.WHITE)},
    }
    let cursorWidth = 6;
    let eraserWidth = 12;

    // rest of the globally used vars that change
    let origin = [0, 0];
    let penDown = false;

    let lastCoords = [null, null];
    let lastDist = 0;
    let lastDirection = null;
    let currPath = [];
    let currErasures = [];

    let paths = new utils.MyMap();
    let deleted = new utils.MyMap();
    let history = [];
    let undoHistory = [];

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
        utils.setStyle(canvas, {
            display: 'block', // prevent scrollbars
            height: '100vh',  // full window area. 100vh != 100%
            width: '100vw',
            backgroundColor: Color.background,
            // border: '1px solid black';   // outline if embedded in other page content
        });

        // control area(s)
        document.body.appendChild(zoomControlArea);
        utils.setStyle(zoomControlArea, {
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
        utils.setStyle(cursor, {
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
        utils.setProperties(ctx, {
            strokeStyle: Color.default,
            lineWidth: 4,
            lineCap: 'round',
        });
    }

    function setDefaultCursor() {
        utils.setStyle(cursor, {
            display: 'block',
            width: cursorWidth + 'px',
            height: cursorWidth + 'px',
            borderRadius: '50%',
            background: Color.foreground,
            // background: Color.default,
            border: 'none',
        });
    }

    function hideCursor() {
      cursor.style.display = 'none'
    }

    function setEraserCursor() {
        utils.setStyle(cursor, {
            borderRadius: '0%',
            background: Color.background,
            width: eraserWidth + 'px',
            height: eraserWidth + 'px',
            // border: '1px solid ' + foregroundColor,
            border: '1px solid ' + Color.default,
        });
    }

    function setForegroundColor(newColor) {
        Color.foreground = newColor;
        ctx.strokeStyle = Color.foreground;
        // if cursor.style.background is default(black or white), invert it now; else leave it alone
        cursor.style.background = Color.foreground;
    }

    function setBackgroundColor(newColor) {
        Color.background = newColor;
        canvas.style.backgroundColor = Color.background;
    }

    function toggleDarkMode() {

        setForegroundColor(Color.background);
        setBackgroundColor(Color.default);

        // invert the paths of default color
        paths = paths.map(invertPathColor);
        clearScreen();
        redrawAll();
    }

    function invertPathColor(path) {
      // change black to white or vice versa; leave other colors alone
        return {
            path: path.path,
            color: (path.color == Color.background) ?
                Color.default :
                path.color
        }
    }

    /**** EVENT LISTENERS ****/

    function addEventListeners() {
        // called once on page load

        // mouse events
        utils.addListeners(canvas, {
            'mousedown': onMouseDown,
            'mouseup': onMouseUp,
            'mousemove': onMouseMove,
            'contextmenu': (e) => e.preventDefault(),
        });
        // key events
        utils.addListeners(window, {
            'keydown': (e) => {
                onKeyPress(e);
                onKeyToggleOn(e)
            },
            'keyup': onKeyToggleOff,
        });
        // window events
        utils.addListeners(window, {'resize'  : onResize});
        utils.addListeners(parent, {'mouseout': onMouseOut});
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
                if (Mode.current == Mode.UNDO) {// && insideDiv(e, undoControlArea)) {
                    lastDirection = null;
                }
                else if (Mode.current === null) {
                    startDraw(e);
                }
                break;
            case 2: // right click
                if (insideDiv(e, zoomControlArea)) {
                    setMode(Mode.ZOOM);
                }
                else {
                    setMode(Mode.PAN);
                }
                break;
        }
    }

    function onMouseUp(e) {
        switch (e.button) {
            case 0: // left click
                if (Mode.current == Mode.PEN) {
                    stopDraw();
                }
                unsetMode();
                break;
            case 2: // right click
                unsetMode();
                break;
        }
    }

    function onMouseMove(e) {
        cursor.style.left = e.clientX - cursorWidth/2 + 'px';
        cursor.style.top = e.clientY - cursorWidth/2 + 'px';

        switch (Mode.current) {
            case Mode.PEN:
                draw(e);
                break;
            case Mode.PAN:
                pan(e);
                break;
            case Mode.ZOOM:
                let factor = calcZoomFactor(e);
                zoom(factor);
                break;
            case Mode.UNDO:
                if ( switchedDirection(e) ) {undo();}
                break;
            case Mode.ERASE:
                erase(e);
                break;
        }


        // update curr pos to become last pos
        lastCoords = getRelativeMousePos(e);

        // ?
//        requestAnimationFrame(() => onMouseMove(e));
    }

    // keypresses

    function onKeyToggleOn(e) {
        switch (e.key) {
            case 'Shift':
                setMode(Mode.ERASE);
        }
    }

    function onKeyToggleOff(e) {
        switch (e.key) {
            case 'Shift':
                if (Mode.current == Mode.ERASE) {
                    stopErase();
                }
                unsetMode();
        }
    }

    function onKeyPress(e) {

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
                    eraseAllPaths();
                    break;
                case 'r':
                    setForegroundColor(Color.RED);
                    break;
                case 'g':
                    setForegroundColor(Color.GREEN);
                    break;
                case 'b':
                    setForegroundColor(Color.BLUE);
                    break;
                case 'f':
                    setForegroundColor(Color.default);
                    break;
                case 'd':
                    toggleDarkMode();
            }
        }
    }

    /**** MAIN WHITEBOARD COMMANDS, BUSINESS LOGIC ****/

    // changing data

    function draw(e) {

        let mousePos = getRelativeMousePos(e);

        drawLine(lastCoords, mousePos);

        currPath.push(mousePos);
    }

    function erase(e) {
        // need to fix case for single dot

        // crossedPaths = paths.filter(path => isIntersecting(mousePos));
        // paths.pop(crossedPaths);

        let erasedSomething = false;

        let mousePos = getRelativeMousePos(e);
        let mouseMoveBox = utils.boundingBox(mousePos, lastCoords);
        utils.expandRect(mouseMoveBox, eraserWidth / 2);

        paths.forEach((path, id) => {
            if ( utils.rectIntersectsPath(mouseMoveBox, path.path) ) {
                deleted.set(id, path);
                paths.delete(id);
                currErasures.push(id);
                erasedSomething = true;
            }
        });

        if (erasedSomething) {
            clearScreen();
            redrawAll();
        }
    }

    function eraseAllPaths() {
        if (paths.size > 0) {
            history.push({type: Command.DELETE_PATHS, arg: Array.from(paths.keys())})
            deleted = deleted.merge(paths);
            paths.clear();

            clearScreen();
        }
    }

    function undo() {

        let command = history.pop();
        if (command) {
            switch (command.type) {
                case Command.CREATE_PATH:
                    let id = command.arg;
                    let path = paths.get(id);
                    paths.delete(id);
                    deleted.set(id, path);
                    break;

                case Command.DELETE_PATHS:
                    let ids = command.arg;
                    ids.forEach(id => {
                        let path = deleted.get(id);
                        deleted.delete(id);
                        paths.set(id, path);
                    })
                    break;
            }
            undoHistory.push(command)

            clearScreen();
            redrawAll();
        }
    }

    function redo() {
       let command = undoHistory.pop();
       if (command) {

           switch (command.type) {
               case Command.CREATE_PATH:

                   break;

               case Command.DELETE_PATHS:

                   break;
           }

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

        paths = paths.map(p => ({
            path: p.path.map(pt => utils.translatePoint(pt, dx, dy)),
            color: p.color,
        }));
        clearScreen();
        redrawAll();
    }

    function zoom(factor) {

        paths = paths.map(p => ({
            path: p.path.map(pt => utils.scale(pt, factor, origin)),
            color: p.color,
        }));
        clearScreen();
        redrawAll();
    }

    function clearScreen() {
        // just whites canvas but not data
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    function redrawAll() {
        paths.forEach((path, _) => drawPath(path.path, path.color));
    }

    // I/O

    function save() {
        let ptArrs = Array.from(paths.values()).map(p => p.path);
        let xs = ptArrs.map(path => path.map(pt => pt[0])).flat();
        let ys = ptArrs.map(path => path.map(pt => pt[1])).flat();
        let left   = utils.min(xs),
            right  = utils.max(xs),
            bottom = utils.min(ys),
            top    = utils.max(ys);

        console.log(left, right, top, bottom);

        let margin = 100;
        let totalWidth  = (right - left) + 2*margin,
            totalHeight = (top - bottom) + 2*margin;

        let tempCanvas = document.createElement('canvas');
        let tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = totalWidth;
        tempCanvas.height = totalHeight;

        let tempPaths = paths.map(pathObj => ({
            path: pathObj.path.map(
                 pt => utils.translatePoint(pt,
                                            -left + margin,
                                            -bottom + margin)
            ),
            color: pathObj.color
        }));

        let oldCtx = ctx,
            oldCanvas = canvas,
            oldPaths = paths;

        canvas = tempCanvas;
        ctx = tempCtx;
        paths = tempPaths;

        setDefaultPen();
        ctx.fillStyle = Color.background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        redrawAll();

        // create and download file
        link.setAttribute('href', canvas.toDataURL("image/png").replace("image/png", "image/octet-stream"));
        link.click();

        canvas = oldCanvas;
        ctx = oldCtx;
        paths = oldPaths;
    }

    /*
    function export() {

        link.href = JSON.writes(paths);


    }

    function import() {

    }
    */

    /**** HELPERS ****/

    // drawing

    let newID = (() => {
      count = 0;
      return () => count++;
    })();

    function startDraw(e) {
        setMode(Mode.PEN);
        currPath = [];  // reset curr path
        draw(e);    // draw a dot, covering case of single click
    }

    function stopDraw() {
        // let id = ID.new();
        let id = newID();
        paths.set(id, {path: currPath, color: Color.foreground});
        history.push({type: Command.CREATE_PATH, arg: id});

        // unsetMode();
    }

    function stopErase() {
        if (currErasures.length > 0) {
            history.push({type: Command.DELETE_PATHS, arg: currErasures});
            currErasures = [];
        }
    }

    function drawPath(path, color) {
        ctx.strokeStyle = color;    // temporarily set ctx color for this path

        let i = 0;
        let numPts = path.length;
        lastPt = path[i];
        i += 1
        if (numPts == 1) {  // case of just a dot
            drawLine(lastPt, lastPt);
            return;
        }

        while (i < numPts) {

            currPt = path[i];
            drawLine(lastPt, currPt);

            lastPt = currPt;
            i += 1;
        }

        ctx.strokeStyle = Color.foreground;  // return to old
    }

    function drawLine(pt1, pt2) {
        ctx.beginPath();
        ctx.moveTo(...pt1);
        ctx.lineTo(...pt2);
        ctx.stroke();
    }

    // other

    function calcZoomFactor(e) {
        // helper for zoom command
        let dy = e.clientY - lastCoords[1];
        dy = Math.min(dy, 90)  // avoid zooming by nonpositive factor:
        return 1 - (dy/100);    // arbitrary descaling by 100
    }

    /*
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
    */

    function getRelativeMousePos(e) {
        // helper for erase command
        let rect = e.target.getBoundingClientRect();
        return [
            e.clientX - rect.left,
            e.clientY - rect.top
        ];
    }

    function insideDiv(e, div) {
        return utils.pointInRect(
            [e.clientX, e.clientY],
            div.getBoundingClientRect()
        );
    }

    function setMode(newMode) {
        switch (newMode) {
            case Mode.ZOOM:
                hideCursor();
                break;
            case Mode.UNDO:
                hideCursor();
                break;
            case Mode.ERASE:
                // eraserCursor();
                setEraserCursor();
        }
        Mode.current = newMode;
    }

    function unsetMode() {
        setDefaultCursor();
        Mode.current = null;
    }






    /**** export globals ****/

    //    init(); //window.addEventListener('load', init());  // load automatically
    window.whiteboard = {init,}; // let caller decide when to load by using whiteboard.init()

    window.p = () => paths;
    window.h = history
})();
