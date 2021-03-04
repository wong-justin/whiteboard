# whiteboard

Simple whiteboard implementation meeting custom needs.
Designed for no UI and for use with 2-button stylus (mapped to right click and shift).

https://wong-justin.github.io/whiteboard/

## Features

gesture ideas:
- [x] right click and drag to pan
- [x] shift click to erase
    - [-] faster wiggles back and forth to erase -> larger eraser radius
    - [x] erase by deleting paths,
    not just creating white lines
    - [ ] erase by selecting polygon around paths to delete?

other features:
- [~] undo (currently just pops last drawings and won't undo erasures or any other commands) (ctrl-z)
    - [x] wiggling for many redos, ie undo each time detect change in direction
- [ ] redo
    - [ ] track commands for controls like redo, smart panning, ...
    standard draw command: path, color, line width
    erase command: path, zipped with line widths at each point
    change color command
- [x] clear all (spacebar)
- [x] zoom in/out
    - [x] right click + drag slider at top right?

- [x] change colors (r,g,b keys and f for black)

- [ ] shift drag to select points
    - [ ] delete with some gesture?
    - [ ] drag selected

- [ ] import/export state
- [ ] import image (ctrl i?)
- [ ] simple text box (hit Enter to start typing at cursor?)

for better performance...
- [ ] requestAnimationFrame() for quicker polling than onmousemove? Onmousemove slows considerably with heavy computer usage like screensharing + videoconferencing
- [ ] cursor display on canvas instead of div element forcing update
- [ ] investigate clipping mask on canvas redraw?
- [ ] store less points in paths or interpolate or curve, eg remove super close points in a path

down the road...
- [ ] networking to communicate between two people??i guess just hosted on a little server using sockets or something
- [ ] local bluetooth app?????
    https://developer.android.com/guide/topics/connectivity/bluetooth#ConnectDevices

- [x] export as image (ctrl-s)
