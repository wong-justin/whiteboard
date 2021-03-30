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

    // const html = {
    //     parent: ,
    //     canvas: ,
    //     ctx: ,
    //     zoomControlArea: ,
    //     undoControlArea: ,
    //     cursor: ,
    // }

    // some constants, enums, managers
    const Mode = {PEN:1, PAN:2, ZOOM:3, UNDO:4, ERASE:5, current: null}
    const Commands = utils.CommandManager.add({
        CREATE_PATH: {
            undo: (id) => {
                paths.transfer(id, deleted);
                repaint();
            },
            redo: (id) => {
                deleted.transfer(id, paths);
                repaint();
            },
        },
        DELETE_PATHS: {
            undo: (ids) => {
                ids.forEach(id => deleted.transfer(id, paths));
                repaint();
            },
            redo: (ids) => {
                ids.forEach(id => paths.transfer(id, deleted));
                repaint();
            },
        }
    });
    const Color = {
        BLACK: 'black',
        WHITE: 'white',
        RED: 'red',
        BLUE: 'blue',
        GREEN: 'green',
        foreground: 'white',  // default start in dark mode
        background: 'black',
        // opposite of background, aka default foreground
        get default() {return (Color.background == Color.WHITE ? Color.BLACK : Color.WHITE)},
    }
    const Export = utils.Export.setTypes({
        PNG: {
            filename: 'whiteboard.png',   // timestamp?
            generateDataURL: generatePNG,
        },
        JSON: {
            filename: 'whiteboard.json',  // timestamp?
            generateDataURL: generateJSON,
        }
    });

    const CURSOR_WIDTH = 6,
          ERASER_WIDTH = 12;

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

    const whiteboardData = {
        renderedPaths: new utils.MyMap(),
        deletedPaths : new utils.MyMap(),
        currPath: [],
        currErasures: [],
        lastMousePos: [null, null],
        origin: [0, 0],
        penDown: false,
        // lastDist: 0,
        // lastDirection: null,
    }



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
           - undo (for drawing and erasing)
          Ctrl + Y
           - redo
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
            width: CURSOR_WIDTH + 'px',
            height: CURSOR_WIDTH + 'px',
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
            width: ERASER_WIDTH + 'px',
            height: ERASER_WIDTH + 'px',
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

        // setForegroundColor(Color.background);
        setBackgroundColor(Color.default);

        // invert the paths of default color
        paths = paths.map(invertDefaultColor);
        repaint();
    }

    function invertDefaultColor(path) {
      // change black to white or vice versa; leave other colors alone
      // called after background color has been changed
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

        // window events
        utils.addListeners(window, {'resize'  : onResize});
        utils.addListeners(parent, {'mouseout': onMouseOut});
        // mouse events
        utils.addListeners(canvas, {
            'mousedown': onMouseDown,
            'mouseup': onMouseUp,
            'mousemove': onMouseMove,
            'contextmenu': (e) => e.preventDefault(),
        });
        // key events
        utils.KeypressListeners.add({
            onHold: {
                'Shift': {
                    start: () => setMode(Mode.ERASE),
                    end: () => {
                        if (Mode.current == Mode.ERASE) {
                            stopErase();
                        }
                        unsetMode();
                    }
                }
            },
            onPress: {
                ' ': eraseAllPaths,
                'f': () => setForegroundColor(Color.default),
                'r': () => setForegroundColor(Color.RED),
                'g': () => setForegroundColor(Color.GREEN),
                'b': () => setForegroundColor(Color.BLUE),
                'd': toggleDarkMode,
            },
            onCtrlPress: {
                'z': () => Commands.undo(),
                'y': () => Commands.redo(),
                's': (e) => {
                    e.preventDefault();
                    // exportPNG();
                    // exportJSON();
                    Export.JSON();
                }
            }
        });
    }

    // window

    function onResize() {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        origin = [canvas.width / 2, canvas.height / 2];
        // because board state has been reset:
        setDefaultPen();  // restore default stroke
        redrawAll();      // canvas was cleared
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
                // if (Mode.current == Mode.UNDO) {// && insideDiv(e, undoControlArea)) {
                //     lastDirection = null;
                // } else
                if (Mode.current === null) {
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
        cursor.style.left = e.clientX - CURSOR_WIDTH/2 + 'px';
        cursor.style.top = e.clientY - CURSOR_WIDTH/2 + 'px';

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

    /**** MAIN WHITEBOARD COMMANDS, BUSINESS LOGIC ****/

    // creating, deleting

    function draw(e) {
        // update newest point of current path
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
        let mouseMoveRect = utils.boundingRect(mousePos, lastCoords);
        utils.expandRect(mouseMoveRect, ERASER_WIDTH / 2);

        paths.forEach((path, id) => {
            if ( utils.rectIntersectsPath(mouseMoveRect, path.path) ) {
                // deleted.set(id, path);
                // paths.delete(id);
                paths.transfer(id, deleted)
                currErasures.push(id);
                erasedSomething = true;
            }
        });

        if (erasedSomething) repaint();
    }

    function eraseAllPaths() {
        if (paths.size > 0) {
            Commands.record({type: Commands.DELETE_PATHS, args: Array.from(paths.keys())})
            deleted = deleted.merge(paths);
            paths.clear();

            clearScreen();
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

    // modifying for view

    function pan(e) {
        let mousePos = getRelativeMousePos(e);
        let dx = mousePos[0] - lastCoords[0];
        let dy = mousePos[1] - lastCoords[1];

        paths = paths.map(p => ({
            path: p.path.map(pt => utils.translatePoint(pt, dx, dy)),
            color: p.color,
        }));
        repaint();
    }

    function zoom(factor) {

        paths = paths.map(p => ({
            path: p.path.map(pt => utils.scale(pt, factor, origin)),
            color: p.color,
        }));
        repaint();
    }

    // other views

    function clearScreen() {
        // just whites canvas but not data
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    function redrawAll() {
        paths.forEach(drawPath);
    }

    function repaint() {
        clearScreen();
        redrawAll();
    }

    // I/O

    function generatePNG() {
    // function generatePNG(state)
        if (paths.size == 0) return;

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
        // link.setAttribute('href', canvas.toDataURL("image/png").replace("image/png", "image/octet-stream"));
        // link.click();
        let dataURL = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream")

        canvas = oldCanvas;
        ctx = oldCtx;
        paths = oldPaths;

        return dataURL;
    }

    function generateJSON() {
    // function generateJSON(state)

        let state = currentState();

        let jsonStr = JSON.stringify({
            timestamp: Date.now(),
            darkMode: state.darkMode,
            paths: stripIDs(state.paths),
        });

        // link.href = 'data:application/json,' + jsonStr;
        // link.download = 'whiteboard.json';
        // link.click();
        return 'data:application/json,' + jsonStr;
    }

    let currentState = () => ({
        // timestamp: Date.now(),
        darkMode: (Color.background == Color.BLACK),
        paths: paths,
        // deleted: deleted,
        // history: Commands.history,
        // undoHistory: Commands.undoHistory,
    });

    function stripIDs(pathsWithIDs) {
        // returns simple array of {path, color} objs
        return Array.from(pathsWithIDs.values());
    }

    function addIDs(paths) {
        return new utils.MyMap(
            paths.map(p => [newID(), p])
        );
    }

    function clearCurrentState() {
        paths.clear();
        deleted.clear();
        Commands.history = [];
        Commands.undoHistory = [];
    }

    function importState(state) {

        clearCurrentState();

        // add paths
        // state.paths.forEach(path => paths.set(newID(), path));
        paths = addIDs(state.paths);

        // render
        let currentDarkMode = (Color.background == Color.BLACK);
        if (currentDarkMode != state.darkMode) {
            toggleDarkMode();
        }
        repaint();


        // safe version:
        /*
        let {paths, deleted, commandHistory} = getState();
        try {
            let {timestamp, paths} = JSON.parse(json);
            restoreState({paths,})
        }
        catch {
            console.log('error importing');
            restoreState({paths, deleted, commandHistory});
        }
        */
    }

    // preventing default drag behavior
    document.addEventListener('dragover', e => e.preventDefault());
    document.addEventListener('dragenter', e => {
    // document.addEventListener('dragstart', e => {
        // e.preventDefault()
        // e.dataTransfer.effectAllowed = 'copy';
        console.log(e.dataTransfer.effectAllowed, e.dataTransfer.dropEffect);
        // e.dataTransfer.dropEffect = 'none';
    });

    document.addEventListener('drop', (e) => {
        e.preventDefault();
        console.log(e.dataTransfer.effectAllowed, e.dataTransfer.dropEffect);
        // chromium: copyMove, none
        // firefox:  uninitialized, move


        // investigating fman solution
        /*
        console.log(e.dataTransfer.getData('text'));
        // return;

        let a = e.dataTransfer.items[0];
        console.log(a);
        // a.getAsFileSystemHandle().then(result => console.log(result))
        // a.getAsString(s => console.log(s));
        // return;

        let f = new FileReader();
        f.onload = (e) => {
            console.log(e.target.result)
        }
        f.readAsDataURL(a.getAsFile());
        */

        // standard; works with fman on firefox but not chrome
        let file = e.dataTransfer.items[0].getAsFile();
        console.log(file);

        readJSONFile(file).then(result => {
            console.log(result);
            importState(result);
        });



        // if (e.dataTransfer.items) {
        //
        //
        // }
    });

    function readJSONFile(file) {
        return new Promise(resolve => {
            let reader = new FileReader();
            reader.onload = (e) => {
                let text = e.target.result;
                resolve(JSON.parse(text));
            };
            reader.readAsText(file);
        });
    }

    /**** HELPERS ****/

    // drawing

    let newID = (() => {
      // generates unique id every call
      count = 0;
      return () => count++;
    })();

    function startDraw(e) {
        setMode(Mode.PEN);
        currPath = [];  // reset curr path
        draw(e);        // draw a dot, covering case of single click
    }

    function stopDraw() {
        // penup; finish the path
        let id = newID();
        paths.set(id, {path: currPath, color: Color.foreground});
        Commands.record({type: Commands.CREATE_PATH, args: id})
    }

    function stopErase() {
        if (currErasures.length > 0) {
            Commands.record({type: Commands.DELETE_PATHS, args: currErasures});
            currErasures = [];
        }
    }

    function drawPath(p) {
        // connect series of points on canvas
        ctx.strokeStyle = p.color;    // temporarily set ctx color for this path

        let i = 0;
        let numPts = p.path.length;
        lastPt = p.path[i];
        i += 1
        if (numPts == 1) {  // case of just a dot
            drawLine(lastPt, lastPt);
            return;
        }

        while (i < numPts) {

            currPt = p.path[i];
            drawLine(lastPt, currPt);

            lastPt = currPt;
            i += 1;
        }

        ctx.strokeStyle = Color.foreground;  // return to old
    }

    function drawLine(pt1, pt2) {
        // straight line on canvas
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
                setEraserCursor();
        }
        Mode.current = newMode;
    }

    function unsetMode() {
        setDefaultCursor();
        Mode.current = null;
    }






    /**** export globals ****/

    //    init(); //window.addEventListener('load', init);  // load automatically, no outside customization
    window.whiteboard = {init,}; // let caller decide when to load by using whiteboard.init()
    window.p = () => paths;
})();
