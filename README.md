# whiteboard

Simple whiteboard implementation meeting custom needs.
Designed for no UI and for use with 2-button stylus (mapped to right click and shift).

https://wong-justin.github.io/whiteboard/

## Features

| Controls                                             | Command                            |
|------------------------------------------------------|------------------------------------|
| `Shift` + mouse move                                 | erase                              |
| `Space`                                              | erase all                          |
| Right click + mouse move                             | pan                                |
| Right click upper right margin + mouse move up/down  | zoom in/out                        |
| `R`,`G`,`B`                                          | pen colors                         |
| `F`                                                  | default pen color (white or black) |
| `Ctrl` + `Z`                                         | undo                               |
| `Ctrl` + `Y`                                         | redo                               |
| `Ctrl` + `P`                                         | save as image                      |
| `Ctrl` + `S`                                         | export whiteboard                  |
| `Ctrl` + `O` or drag and drop                        | import whiteboard                  |
| `D`                                                  | toggle dark mode                   |


gesture ideas:
- [x] right click and drag to pan
- [x] shift click to erase

- [-] deprecated: wiggle back and forth, like to increase eraser size or to undo again every wiggle. just not feeling it for now.

- [ ] shift drag to select paths
    - [ ] hold x instead of shift? whichever one is more important to prioritize bt erase and select
    - [ ] delete with some gesture? drag to corner maybe
    - [ ] drag selection
    - [ ] pan and zoom surroundings leave selection unaffected?
    - [ ] erase by selecting polygon around paths to delete?

other features:
- [x] undo
- [x] redo
- [x] clear all (spacebar)
- [x] pan infinitely
- [x] zoom in/out
    - [x] right click + drag slider at top right

- [x] change colors (r,g,b keys and f for black)
    - [ ] custom color codes?

- [ ] custom keybindings? like for stylus not having shift or right click

- [x] export as image (ctrl-s)
- [x] import/export state
    - [x] import json state by dragging file into page, like uploading an image to a website
    - [x] or maybe override ctrl-o

- [ ] restore default settings, if customizable settings allowed
- [ ] remember recent state in case of emergency
    - [ ] cookie for last session?
    - [ ] update backup on interval? (eg every 3 min)
    - [ ] local browser storage (as string?)

other whiteboard renderables besides drawn paths:
- [ ] import any image (ctrl i?)
- [ ] simple text box (hit Enter to start typing at cursor?)


for better performance...
- [ ] requestAnimationFrame() for quicker polling than onmousemove? Onmousemove slows considerably with heavy computer usage like screensharing + videoconferencing
- [ ] cursor display on canvas instead of div element forcing update
- [ ] investigate clipping mask on canvas redraw?
- [ ] store less points in paths or interpolate or curve, eg remove super close points in a path
- [ ] only track last n commands for undo, ie delete oldest unused paths from memory

down the road...
- [ ] networking to communicate between two people??i guess just hosted on a little server using sockets or something
- [ ] local bluetooth app?????
    https://developer.android.com/guide/topics/connectivity/bluetooth#ConnectDevices
- [ ] or student scans QR code that will go to website, connected to my whiteboard session
- [ ] favicon
- [ ] screencapture demo video/gif => embed in this readme
- [ ] consistent internal naming for discerning types (eg what is a path?)
    - [ ] typescript??
