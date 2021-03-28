
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

    function boxIntersectsPath(box, path) {

        let lastPt = path[0];
        let numPts = path.length;
        if (numPts == 1) {
            return pointInRect(lastPt, box);
        }

        let i = 1;
        while (i < numPts) {
            let currPt = path[i];
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
        let pBox = boundingBox(p0, p1);
        let qBox = boundingBox(q0, q1);

        if ( boxesOverlap(pBox, qBox) ) {
            // check for real intersection
            return true;

        } else {return false;}  // doesn't pass this approx initial check
    }
    */

    function boundingBox(ptA, ptB) {
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

    function boxesOverlap(A, B) {
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
    }

    let setStyle = (obj, styles) => Object.assign(obj.style, styles);

    let setProperties = (obj, props) => Object.assign(obj, props);

    // listeners = {'event type': function, ...}
    let addListeners = (obj, listeners) => Object.keys(listeners).forEach(type => {
        let callback = listeners[type];
        obj.addEventListener(type, callback);
    });

    window.utils = {
        scale,
        relativeTo,
        unrelativeTo,
        translatePoint,
        boxIntersectsPath,
        boxIntersectsLine,
        boundingBox,
        boxesOverlap,
        pointInRect,
        expandRect,
        min,
        max,
        MyMap,
        setStyle,
        setProperties,
        addListeners,
    }

})();
