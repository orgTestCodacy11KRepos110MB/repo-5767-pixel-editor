const ToolManager = (() => {
    brush = new BrushTool("brush", {type: 'html'}, switchTool);
    eraser = new EraserTool("eraser", {type: 'html'}, switchTool);
    rectangle = new RectangleTool("rectangle", {type: 'html'}, switchTool);

    currTool = brush;

    Events.on("mouseup", window, onMouseUp);
    Events.on("mousemove", window, onMouseMove);
    Events.on("mousedown", window, onMouseDown);

    function onMouseDown(mouseEvent) {
        if (!Startup.documentCreated())
            return;

        let mousePos = Input.getCursorPosition(mouseEvent);

        switch(mouseEvent.which) {
            case 1:
                if (!Input.isDragging()) {
                    currTool.onStart(mousePos);
                }
                break;
            case 2:
                break;
            case 3:
                break;
            default:
                break;
        }
    }

    function onMouseMove(mouseEvent) {
        if (!Startup.documentCreated())
            return;
        let mousePos = Input.getCursorPosition(mouseEvent);
        // Call the hover event
        currTool.onHover(mousePos, mouseEvent.target);

        if (Input.isDragging()) {
            currTool.onDrag(mousePos, mouseEvent.target);
        }
    }

    function onMouseUp(mouseEvent) {
        if (!Startup.documentCreated())
            return;
        let mousePos = Input.getCursorPosition(mouseEvent);

        switch(mouseEvent.which) {
            case 1:
                if (Input.isDragging()) {
                    currTool.onEnd(mousePos);
                }
                break;
            case 2:
                break;
            case 3:
                break;
            default:
                break;
        }
    }

    function currentTool() {
        return currTool;
    }

    function switchTool(newTool) {
        currTool.onDeselect();
        currTool = newTool;
        currTool.onSelect();
    }

    return {
        currentTool
    }
})();