class MoveSelectionTool extends DrawingTool {
    currSelection = undefined;
    selectionTool = undefined;
    endTool = undefined;
    switchFunc = undefined;
    lastCopiedSelection = undefined;
    cutting = false;

    constructor (name, options, switchFunc, endTool) {
        super(name, options, switchFunc);

        this.switchFunc = switchFunc;
        this.endTool = endTool;

        Events.onCustom("esc-pressed", this.endSelection.bind(this));

        Events.onCustom("ctrl+c", this.copySelection.bind(this), true);
        Events.onCustom("ctrl+x", this.cutSelection.bind(this), true);
        Events.onCustom("ctrl+v", this.pasteSelection.bind(this));
    }

    copySelection(event) {
        this.lastCopiedSelection = this.currSelection;
        this.cutting = false;

        if (event)
            this.switchFunc(this.selectionTool);
    }

    cutSelection(event) {
        if (currFile.currentLayer.isLocked)
            return;
        this.cutting = true;
        this.lastCopiedSelection = this.currSelection;
        this.endSelection();
        this.currSelection = this.lastCopiedSelection;
        // Cut the data
        this.selectionTool.cutSelection();

        if (event)
            this.switchFunc(this.selectionTool);
        
        new HistoryState().EditCanvas();
    }

    pasteSelection() {
        if (currFile.currentLayer.isLocked)
            return;
        if (this.lastCopiedSelection === undefined)
            return;
        if (!(this.currMousePos[0]/currFile.zoom >= 0 && this.currMousePos[1]/currFile.zoom >= 0 && 
            this.currMousePos[0]/currFile.zoom < currFile.canvasSize[0] && this.currMousePos[1]/currFile.zoom < currFile.canvasSize[1]))
            this.currMousePos = [currFile.canvasSize[0]*currFile.zoom / 2, currFile.canvasSize[1]*currFile.zoom /2];
        
        // Finish the current selection and start a new one with the same data
        if (!this.cutting) {
            this.endSelection();
        }
        this.cutting = false;

        this.switchFunc(this);
        this.currSelection = this.lastCopiedSelection;
        this.selectionTool.drawSelectedArea();

        // Putting the vfx layer on top of everything
        currFile.VFXLayer.canvas.style.zIndex = MAX_Z_INDEX;
        this.onDrag(this.currMousePos);

        new HistoryState().EditCanvas();
    }

    onStart(mousePos, mouseTarget) {
        super.onStart(mousePos, mouseTarget);
    }

    onDrag(mousePos) {
        super.onDrag(mousePos);

        this.selectionTool.moveOffset = 
            [Math.floor(mousePos[0] / currFile.zoom - currFile.canvasSize[0] / 2  - (this.selectionTool.boundingBoxCenter[0] - currFile.canvasSize[0]/2)), 
            Math.floor(mousePos[1] / currFile.zoom - currFile.canvasSize[1] / 2- (this.selectionTool.boundingBoxCenter[1] - currFile.canvasSize[1]/2))];
        // clear the entire tmp layer
        currFile.TMPLayer.context.clearRect(0, 0, currFile.TMPLayer.canvas.width, currFile.TMPLayer.canvas.height);        
        // put the image data on the tmp layer with offset
        currFile.TMPLayer.context.putImageData(this.currSelection, 
            this.selectionTool.moveOffset[0], this.selectionTool.moveOffset[1]);
        
        // Draw the selection area and outline
        this.selectionTool.drawOutline();
        this.selectionTool.drawSelectedArea();
        this.selectionTool.drawBoundingBox();
    }

    onEnd(mousePos, mouseTarget) {
        super.onEnd(mousePos, mouseTarget);

        if (!this.selectionTool.cursorInSelectedArea(mousePos) && 
            !Util.isChildOfByClass(mouseTarget, "editor-top-menu")) {
            this.endSelection();
            // Switch to selection tool
            this.switchFunc(this.selectionTool);
        }
    }

    onSelect() {
        super.onSelect();
    }

    onDeselect() {
        super.onDeselect();
        this.endSelection();
    }

    setSelectionData(data, tool) {
        this.currSelection = data;
        this.selectionTool = tool;
        this.firstTimeMove = true;
    }

    onHover(mousePos) {
        super.onHover(mousePos);

        if (this.selectionTool.cursorInSelectedArea(mousePos)) {
            currFile.canvasView.style.cursor = 'move';
        }
        else {
            currFile.canvasView.style.cursor = 'default';
        }
    }

    endSelection(event) {
        if (this.currSelection == undefined)
            return;
        this.currSelection = undefined;
        this.selectionTool.pasteSelection();

        if (event)
            this.switchFunc(this.selectionTool);
    }
}