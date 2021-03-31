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


#### gesture ideas:
- [x] right click and drag to pan
- [x] shift click to erase

- [-] deprecated: wiggle back and forth, like to increase eraser size or to undo again every wiggle. just not feeling it for now.

- [ ] shift drag to select paths
    - [ ] hold x instead of shift? whichever one is more important to prioritize bt erase and select
    - [ ] delete with some gesture? drag to corner maybe
    - [ ] drag selection
    - [ ] pan and zoom surroundings leave selection unaffected?
    - [ ] erase by selecting polygon around paths to delete?
    - [ ] change color of selected paths - {command.CHANGE_COLOR, ids, oldColors, newColor}

#### other features:
- [ ] custom color codes?

- [ ] custom keybindings? like for stylus not having shift or right click
    - [ ] also other settings, maybe on init, like show invisible divs (ie zoom boundaries)

- [ ] restore default settings, if customizable settings allowed
- [ ] remember recent state in case of emergency
    - [ ] cookie for last session?
    - [ ] update backup on interval? (eg every 3 min)
    - [ ] local browser storage (as string?)

#### other renderables besides drawn paths:
- [ ] import any image (ctrl i?) (probably drag and drop actually) repr: {type: 'image', boundingRect, originalImageData?, ...? }
- [ ] simple text box (hit Enter to start typing at cursor?) repr: {type: 'text', boundingRect, [fontSize determined by bounds?]}
- [ ] resizeable (scale text or image)

#### bug hunting:
- [ ] on mouse leave, unfinished path artifact stays on screen until paths re-rendered - erase right away instead
- [ ] don't allow eraser mode to interrupt other mode (eg while drawing or panning)
- [ ] cursor is wrong color after certain transitions; maybe related to above?
- [ ] can't start draw in place immediately after color switch


#### for better performance...
- [ ] requestAnimationFrame() for quicker polling than onmousemove? Onmousemove slows considerably with heavy computer usage like screensharing + videoconferencing
- [ ] cursor display on canvas instead of div element forcing update
- [ ] investigate clipping mask on canvas redraw?
- [ ] store less points in paths or interpolate or curve, eg remove super close points in a path
- [ ] only track last n commands for undo, ie delete oldest unused paths from memory

#### down the road...
- [ ] networking to communicate between two people??i guess just hosted on a little server using sockets or something
- [ ] local bluetooth app?????
    https://developer.android.com/guide/topics/connectivity/bluetooth#ConnectDevices
- [ ] or student scans QR code that will go to website, connected to my whiteboard session
- [ ] favicon
- [ ] screencapture demo video/gif => embed in this readme
- [ ] add this readme as /about page to gh-pages.io site
- [ ] consistent internal naming for discerning types (eg what is a path?)
    - [ ] typescript??
