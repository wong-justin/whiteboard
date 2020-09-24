#whiteboard

Simple whiteboard implementation meeting custom needs.
(minimal UI and using a drawing tablet with 2-button pen)

##Features

gesture ideas:
- [x] right click and drag to pan
- [x] shift click to erase
    - [-] faster wiggles back and forth to erase -> larger eraser radius
    - [x] erase by deleting paths,
    not just creating white lines?
    - [ ] erase by selecting polygon around paths to delete?

other features:
- [x] undo
    - [x] wiggling for many redos, ie undo each time detect change in direction
- [ ] redo
    - [ ] track commands for controls like redo, smart panning, ...
    standard draw command: path, color, line width
    erase command: path, zipped with line widths at each point
    change color command
- [x] clear all (small button like top right corner or something)
- [x] zoom in/out
    - [x] slider on the side/corner? easy access but not in the way
    
- [~] change colors (r,g,b, keep it simple)

- [ ] shift drag to select points
    - [ ] delete with some gesture?
    - [ ] drag selected

- [ ] for better performance, investigate clipping mask on canvas redraw?
    - [ ] store less points in paths or interpolate or curve, eg remove super close points in a path

    down the road...
    - [ ] networking to communicate between two people??i guess just hosted on a little server using sockets or something
    - [ ] local bluetooth?????
        https://developer.android.com/guide/topics/connectivity/bluetooth#ConnectDevices

- [x] export as image



