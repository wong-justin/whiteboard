// whiteboard implementation meeting custom needs
// Justin Wong

// example usage:
// let settings = {
//     showOverlays: true,
//     blackBackground: true;
// };
// whiteboard.init(settings);



// paths:
// {id => path}
//
// path:
// {points: point[], color: enum/str}
//
// point: [x,y]

(() => {

    // global vars
    const data = {
        paths: new utils.MyMap(),
        deletedPaths : new utils.MyMap(),
        currPoints: [],
        currErasures: [],
        lastMousePos: [null, null],
        origin: [0, 0],
        // penDown: false,
        // lastDist: 0,
        // lastDirection: null,
    }

    const html = {
        parent: document.body,  // maybe have caller initialize this?
        canvas: document.createElement('canvas'),
        zoomControlArea: document.createElement('div'),
        // undoControlArea: document.createElement('div'),
        cursor: document.createElement('div'),
    }
    html.ctx = html.canvas.getContext('2d');

    // some enums, managers, constants
    const Mode = {PEN:1, PAN:2, ZOOM:3, UNDO:4, ERASE:5, current: null};
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
    };
		const Commands = new utils.CommandManager({
        CREATE_PATH: {
            undo: (id) => {
                data.paths.transfer(id, data.deletedPaths);
                repaint();
            },
            redo: (id) => {
                data.deletedPaths.transfer(id, data.paths);
                repaint();
            },
        },
        DELETE_PATHS: {
            undo: (ids) => {
                ids.forEach(id => data.deletedPaths.transfer(id, data.paths));
                repaint();
            },
            redo: (ids) => {
                ids.forEach(id => data.paths.transfer(id, data.deletedPaths));
                repaint();
            },
        }
    });
		const Export = new utils.ExportManager({
        PNG: {
            filename: 'whiteboard.png',   // timestamp?
            generateDataURL: generatePNG,
        },
        JSON: {
            filename: 'whiteboard.json',  // timestamp?
            generateDataURL: generateJSON,
        }
    });
    // const PathManager = {
    //       existing: new MyMap(),
    //       deleted: new MyMap(),
    //       currPoints: [],
    //       currDeletions: [],
		// 			createPath: function() {},
		// 			deletePaths: function() {},
    // }
    const CURSOR_WIDTH = 6,
          ERASER_WIDTH = 12;
    const HELP_MESSAGE = `
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

    function init(settings) {
        initHTML();         // load page elements
        addEventListeners();
        onResize();         // canvas size init
        setDefaultPen();    // stroke color
        setDefaultCursor(); // cursor style

        console.log(HELP_MESSAGE);  // instructions
    }

    /**** STYLING ****/

    function initHTML() {
        // called once on page load; adding and styling page elements

        // canvas
        html.parent.insertBefore(html.canvas, html.parent.firstChild); //parent.appendChild(canvas);
        html.parent.style.margin = '0%'; // full window area
        utils.setStyle(html.canvas, {
            display: 'block', // prevent scrollbars
            height: '100vh',  // full window area. 100vh != 100%
            width: '100vw',
            backgroundColor: Color.background,
            // border: '1px solid black';   // outline if embedded in other page content
        });

        // control area(s)
        document.body.appendChild(html.zoomControlArea);
        utils.setStyle(html.zoomControlArea, {
            position: 'fixed',
            right: '0px',
            top: '100px',
            width: '75px',
            height: '250px',
            // border: '1px solid red', // for visual testing
            pointerEvents: 'none',
        });

        // cursor
        html.parent.style.cursor = 'none'; // get rid of default mouse pointer
        document.body.appendChild(html.cursor);
        utils.setStyle(html.cursor, {
            position: 'fixed',
            pointerEvents: 'none',
        });
    }

    function setDefaultPen() {
        // canvas context stroking
        utils.setProperties(html.ctx, {
            strokeStyle: Color.default,
            lineWidth: 4,
            lineCap: 'round',
        });
    }

    function setDefaultCursor() {
        utils.setStyle(html.cursor, {
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
        html.cursor.style.display = 'none'
    }

    function setEraserCursor() {
        utils.setStyle(html.cursor, {
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
        html.ctx.strokeStyle = Color.foreground;
        // if cursor.style.background is default(black or white), invert it now; else leave it alone
        html.cursor.style.background = Color.foreground;
    }

    function setBackgroundColor(newColor) {
        Color.background = newColor;
        html.canvas.style.backgroundColor = Color.background;
    }

    function toggleDarkMode() {

        // setForegroundColor(Color.background);
        setBackgroundColor(Color.default);

        // invert the paths of default color
        data.paths = data.paths.map(invertDefaultColor);
        repaint();
    }

    function invertDefaultColor(path) {
      // change black to white or vice versa; leave other colors alone
      // called after background color has been changed
        return {
            points: path.points,
            color: (path.color == Color.background) ?
                Color.default :
                path.color
        }
    }

    /**** EVENT LISTENERS ****/

    function addEventListeners() {
        // called once on page load

        // window events
        utils.addListeners(window, {'resize' : onResize});
        utils.addListeners(html.parent, {'mouseout': onMouseOut});
        // mouse events
        utils.addListeners(html.canvas, {
            'mousedown': onMouseDown,
            'mouseup': onMouseUp,
            'mousemove': onMouseMove,
            'contextmenu': (e) => e.preventDefault(),
        });
        // key events
				utils.setKeypressListeners({
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
        html.canvas.width = html.canvas.clientWidth;
        html.canvas.height = html.canvas.clientHeight;
        data.origin = [html.canvas.width / 2, html.canvas.height / 2];
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
                if (insideDiv(e, html.zoomControlArea)) {
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
        html.cursor.style.left = e.clientX - CURSOR_WIDTH/2 + 'px';
        html.cursor.style.top  = e.clientY - CURSOR_WIDTH/2 + 'px';

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
            // case Mode.UNDO:
            //     if ( switchedDirection(e) ) {undo();}
            //     break;
            case Mode.ERASE:
                erase(e);
                break;
        }


        // update curr pos to become last pos
        data.lastMousePos = getRelativeMousePos(e);

        // ?
//        requestAnimationFrame(() => onMouseMove(e));
    }

    /**** MAIN WHITEBOARD COMMANDS, BUSINESS LOGIC ****/

    // creating, deleting

    function draw(e) {
        // update newest point of current path
        let mousePos = getRelativeMousePos(e);
        drawLine(data.lastMousePos, mousePos);
        data.currPoints.push(mousePos);
    }

    function erase(e) {
        // need to fix case for single dot

        // crossedPaths = paths.filter(path => isIntersecting(mousePos));
        // paths.pop(crossedPaths);

        let erasedSomething = false;

        let mousePos = getRelativeMousePos(e);
        let mouseMoveRect = utils.boundingRect(mousePos, data.lastMousePos);
        utils.expandRect(mouseMoveRect, ERASER_WIDTH / 2);

        data.paths.forEach((path, id) => {
            if ( utils.rectIntersectsPath(mouseMoveRect, path.points) ) {
                // data.deletedPaths.set(id, path);
                // data.paths.delete(id);
                data.paths.transfer(id, data.deletedPaths)
                data.currErasures.push(id);
                erasedSomething = true;
            }
        });

        if (erasedSomething) repaint();
    }

    function eraseAllPaths() {
        if (data.paths.size > 0) {
            Commands.record({type: Commands.DELETE_PATHS, args: Array.from(data.paths.keys())})
            data.deletedPaths = data.deletedPaths.merge(data.paths);
            data.paths.clear();

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
        let dx = mousePos[0] - data.lastMousePos[0];
        let dy = mousePos[1] - data.lastMousePos[1];

        data.paths = data.paths.map(p => ({
            points: p.points.map(pt => utils.translatePoint(pt, dx, dy)),
            color: p.color,
        }));
        repaint();
    }

    function zoom(factor) {

        data.paths = data.paths.map(p => ({
            points: p.points.map(pt => utils.scale(pt, factor, data.origin)),
            color: p.color,
        }));
        repaint();
    }

    // other views

    function clearScreen() {
        // just whites canvas but not data
        html.ctx.clearRect(0, 0, html.canvas.width, html.canvas.height);
    }

    function redrawAll() {
        data.paths.forEach(drawPath);
    }

    function repaint() {
        clearScreen();
        redrawAll();
    }

    // I/O

    function generatePNG() {
    // function generatePNG(state)
        if (data.paths.size == 0) return;

        let ptArrs = Array.from(data.paths.values()).map(p => p.points);
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

        let tempPaths = data.paths.map(path => ({
            points: path.points.map(
                 pt => utils.translatePoint(pt,
                                            -left + margin,
                                            -bottom + margin)
            ),
            color: path.color
        }));

        let oldCtx = html.ctx,
            oldCanvas = html.canvas,
            oldPaths = data.paths;

        html.canvas = tempCanvas;
        html.ctx = tempCtx;
        data.paths = tempPaths;

        setDefaultPen();
        html.ctx.fillStyle = Color.background;
        html.ctx.fillRect(0, 0, html.canvas.width, html.canvas.height);
        redrawAll();

        let dataURL = html.canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");

        html.canvas = oldCanvas;
        html.ctx = oldCtx;
        data.paths = oldPaths;

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

        return 'data:application/json,' + jsonStr;
    }

    let currentState = () => ({
        // timestamp: Date.now(),
        darkMode: (Color.background == Color.BLACK),
        paths: data.paths,
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
        data.paths.clear();
        data.deletedPaths.clear();
        Commands.history = [];
        Commands.undoHistory = [];
    }

    function importState(state) {

        clearCurrentState();

        // add paths
        // state.paths.forEach(path => paths.set(newID(), path));
        data.paths = addIDs(state.paths);

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
        data.currPoints = [];  // reset curr path
        draw(e);        // draw a dot, covering case of single click
    }

    function stopDraw() {
        // penup; finish the path
        let id = newID();
        data.paths.set(id, {points: data.currPoints, color: Color.foreground});
        Commands.record({type: Commands.CREATE_PATH, args: id})
    }

    function stopErase() {
        if (data.currErasures.length > 0) {
            Commands.record({type: Commands.DELETE_PATHS, args: data.currErasures});
            data.currErasures = [];
        }
    }

    function drawPath(path) {
        // connect series of points on canvas
        html.ctx.strokeStyle = path.color;    // temporarily set ctx color for this path

        let i = 0;
        let numPts = path.points.length;
        lastPt = path.points[i];
        i += 1
        if (numPts == 1) {  // case of just a dot
            drawLine(lastPt, lastPt);
            return;
        }

        while (i < numPts) {

            currPt = path.points[i];
            drawLine(lastPt, currPt);

            lastPt = currPt;
            i += 1;
        }

        html.ctx.strokeStyle = Color.foreground;  // return to old
    }

    function drawLine(pt1, pt2) {
        // straight line on canvas
        // called during each frame of live draw, or multiple times for rendering a stored path
        html.ctx.beginPath();
        html.ctx.moveTo(...pt1);
        html.ctx.lineTo(...pt2);
        html.ctx.stroke();
    }

    // other

    function calcZoomFactor(e) {
        // helper for zoom command
        let dy = e.clientY - data.lastMousePos[1];
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
    window.p = () => data.paths;
})();
