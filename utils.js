
(() => {

    /**** geometry ****/

    function scale(pt, factor, origin) {
        let rel = relativeTo(pt, origin);
        let scaled = [
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

    function translatePoint(pt, dx, dy) {
        return [pt[0] + dx, pt[1] + dy];
    }

    /*
    function lineIntersectsPath(p0, p1, path) {
        let i = 0;
        let lastPt = path[0];
        i++;
        let numPts = path.length;
        while (i < numPts) {
            let currPt = path[i];
            if ( linesIntersect(p0, p1, lastPt, currPt) ) {
                return true;
            }

            lastPt = currPt;
            i++;
        }
        return false;
    }
    */

    function rectIntersectsPath(rect, path) {

        let lastPt = path[0];
        let numPts = path.length;
        if (numPts == 1) {
            return pointInRect(lastPt, rect);
        }

        let i = 1;
        while (i < numPts) {
            let currPt = path[i];
            if ( rectIntersectsLine(rect, lastPt, currPt) ) {
                return true;
            }

            lastPt = currPt;
            i++;
        }
        return false;
    }

    function rectIntersectsLine(rect, q0, q1) {
        if ( rectsOverlap(rect, boundingRect(q0, q1)) ) {
            // check for real intersection

            return true;
        } else {return false;}  // doesn't pass this approx initial check
    }

    /*
    function linesIntersect(p0, p1, q0, q1) {
        let pRect = boundingRect(p0, p1);
        let qRect = boundingRect(q0, q1);

        if ( rectsOverlap(pRect, qRect) ) {
            // check for real intersection
            return true;

        } else {return false;}  // doesn't pass this approx initial check
    }
    */

    function boundingRect(ptA, ptB) {
        let left,
            right,
            bottom,
            top;

        if (ptA[0] < ptB[0]) {
            left  = ptA[0];
            right = ptB[0];
        }
        else {
            left  = ptB[0];
            right = ptA[0];
        }
        if (ptA[1] < ptB[1]) {
            bottom = ptA[1];
            top    = ptB[1];
        }
        else {
            bottom = ptB[1];
            top    = ptA[1];
        }
        return {left, right, bottom, top};
    }

    function rectsOverlap(A, B) {
        return (A.left   < B.left   &&
                A.right  > B.left   &&
                A.bottom < B.bottom &&
                A.top    > B.bottom) ||
               (B.left   < A.left   &&
                B.right  > A.left   &&
                B.bottom < A.bottom &&
                B.top    > A.bottom);
    }

    function pointInRect(pt, rect) {
        return (pt[0] > rect.left &&
                pt[0] < rect.right &&
                pt[1] > rect.top &&
                pt[1] < rect.bottom);
    }

    function expandRect(rect, margin) {
      rect.left   -= margin;
      rect.bottom -= margin;
      rect.right  += margin;
      rect.top    += margin;
      return rect;
    }

    /**** misc/convenience ****/

    let min = (arr) => Math.min(...arr);

    let max = (arr) => Math.max(...arr);

    class MyMap extends Map {

        map(fn) {
            // fn(val) returns newVal for key
            // map({A: 2, B:4}, (v) => v+1) = {A:3, B:5}
            return new MyMap( Array.from(this, ([k,v]) => [k, fn(v)]) );
        }

        merge(other) {
            let _this = this;
            return new MyMap(function*() {
                yield* _this;
                yield* other;
            }());
        }

        transfer(key, other) {
            let val = this.get(key);
            this.delete(key);
            other.set(key, val);
        }
    }

    let setStyle = (obj, styles) => Object.assign(obj.style, styles);

    let setProperties = (obj, props) => Object.assign(obj, props);

    // listeners = {'event type': fn, ...}
    let addListeners = (obj, listeners) => Object.keys(listeners).forEach(type => {
        let callback = listeners[type];
        obj.addEventListener(type, callback);
    });

    /**** generalized managers ****/

    let KeypressListeners = {
        // KeypressListeners.add({
        //   onPress: {'key': fn, ...},
        //   onHold: {'key': {start: fn, end: fn}, ...},
        //   onCtrlPress: {'key': fn, ...},
        // })
        add({onPress, onCtrlPress, onHold}) {
            // main setup function to be called
            this.onPress = onPress;
            this.onCtrlPress = onCtrlPress;
            this.onHold = onHold;
            this._finalize();
        },
        // {key: fn}
        onPress: {},
        // {key: fn}
        onCtrlPress: {},
        // {key: {start: fn, end: fn}}
        set onHold(keysCallbacks) {
            // has to be separated into keydown, keyup events
            for (let [key, {start, end}] of Object.entries(keysCallbacks)) {
                this._onHoldStart[key] = start;
                this._onHoldEnd[key] = end;
            }
        },
        _onHoldStart: {},
        _onHoldEnd: {},
        _finalize() {
            // add all event listeners to window
            window.addEventListener('keydown', (e) => {
                if (e.ctrlKey) {
                    safelyCall(e.key, this.onCtrlPress)(e);
                }
                else {
                    safelyCall(e.key, this.onPress)(e);
                    safelyCall(e.key, this._onHoldStart)(e);
                }
            });
            window.addEventListener('keyup', (e) => {
                safelyCall(e.key, this._onHoldEnd)(e);
            });
        },
    }

    function safelyCall(key, dict) {
       if (key in dict) {
         return dict[key];
       }
       else return () => {};
    }

    let CommandManager = {
        // CommandManager.add({command_name: {undo: fn, redo: fn}, ...})
        _enumCount: 0,
        history: [],
        undoHistory: [],
        undoHandlers: {},
        redoHandlers: {},
        add: function(commands) {
            // setup, creating enums for command types and registering undo/redo callbacks
            for (let [type, {undo, redo}] of Object.entries(commands)) {
                this[type] = this._enumCount++;
                this.undoHandlers[this[type]] = undo;
                this.redoHandlers[this[type]] = redo;
            }
            return this;
        },
        record: function({type, args}) {
            // add an executed command to history
            // not a standard execute() according to the pattern
            //  bc of the delayed and multipart nature of these particular commands

            // if (perform) {
            //   this.executeHandlers[type](...args);
            // }
            this.history.push({type, args});

            // reset redos in case there were any possible; no more allowed once new commands performed
            this.undoHistory = [];
        },
        undo: function() {
            if (this.history.length == 0) return;

            let {type, args} = this.history.pop();
            this.undoHandlers[type](args);

            this.undoHistory.push({type, args});
        },
        redo: function() {
            if (this.undoHistory.length == 0) return;

            let {type, args} = this.undoHistory.pop();
            this.redoHandlers[type](args);

            this.history.push({type, args});
        },
    }

    let Export = {
        // Export.set({PNG: {filename: 'export.png', generateDataURL: fn}})
        // Export.PNG();
        link: createHiddenLink(),
        setTypes: function(types) {
            for (let [type, {filename, generateDataURL}] of Object.entries(types)) {
                this[type] = () => {
                    this.link.download = filename;
                    this.link.href = generateDataURL();
                    this.link.click();
                }
            }
            return this;
        },
    }

    function createHiddenLink() {
        let link = document.createElement('a');
        link.style.display = 'none'
        return link;
    }

    window.utils = {
        scale,
        // relativeTo,
        // unrelativeTo,
        translatePoint,
        rectIntersectsPath,
        // rectIntersectsLine,
        boundingRect,
        // rectsOverlap,
        pointInRect,
        expandRect,
        min,
        max,
        MyMap,
        setStyle,
        setProperties,
        addListeners,
        KeypressListeners,
        CommandManager,
        Export
    }

})();
