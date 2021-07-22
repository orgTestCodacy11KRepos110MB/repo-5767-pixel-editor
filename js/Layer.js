// TODO: add undo for layer drag n drop

// REFACTOR: Put it somewhere
let oldLayerName = null;

// REFACTOR: LayerMenu
// HTML element that contains the layer entries
let layerList;

// REFACTOR: LayerMenu, probably
// A single layer entry (used as a prototype to create the new ones)
let layerListEntry;

// Layer menu
// REFACTOR: LayerMenu along with the right click menu
let layerOptions = document.getElementById("layer-properties-menu");

// Is the user currently renaming a layer?
// REFACTOR: this one's tricky, might be part of EditorState
let isRenamingLayer = false;

// REFACTOR: keep in layer class, it's only used here
let dragStartLayer;

// Binding the add layer button to the function
Events.on('click',"add-layer-button", LayerList.addLayer, false);

/** Handler class for a single canvas (a single layer)
 *
 * @param width Canvas width
 * @param height Canvas height
 * @param canvas HTML canvas element or the ID of the canvas related to the layer
 */
class Layer {
    static layerCount = 1;
    static maxZIndex = 3;
    
    static unusedIDs = [];
    static currentID = 1;

    constructor(width, height, canvas, menuEntry) {
        // REFACTOR: this could just be an attribute of a Canvas class
        this.canvasSize = [width, height];
        // REFACTOR: the canvas should actually be a Canvas instance
        this.canvas = Util.getElement(canvas);
        // REFACOTR: the context could be an attribute of the canvas class, but it's a bit easier
        // to just type layer.context, we should discuss this
        this.context = this.canvas.getContext('2d');
        this.isSelected = false;
        this.isVisible = true;
        this.isLocked = false;
        this.menuEntry = menuEntry;

        let id = Layer.unusedIDs.pop();

        if (id == null) {
            id = Layer.currentID;
            Layer.currentID++;
        }

        this.id = "layer" + id;

        // Binding the events
        if (menuEntry != null) {
            this.name = menuEntry.getElementsByTagName("p")[0].innerHTML;
            menuEntry.id = "layer" + id;
            menuEntry.onmouseover = () => this.hover();
            menuEntry.onmouseout = () => this.unhover();
            menuEntry.onclick = () => this.selectLayer();
            menuEntry.getElementsByTagName("button")[0].onclick = () => this.toggleLock();
            menuEntry.getElementsByTagName("button")[1].onclick = () => this.toggleVisibility();

            menuEntry.addEventListener("mouseup", this.openOptionsMenu, false);
            menuEntry.addEventListener("dragstart", this.layerDragStart, false);
            menuEntry.addEventListener("drop", this.layerDragDrop, false);
            menuEntry.addEventListener("dragover", this.layerDragOver, false);
            menuEntry.addEventListener("dragleave", this.layerDragLeave, false);
            menuEntry.addEventListener("dragend", this.layerDragEnd, false);

            menuEntry.getElementsByTagName("canvas")[0].getContext('2d').imageSmoothingEnabled = false;
        }

        this.initialize();
    }

    // Initializes the canvas
    initialize() {
        //resize canvas
        this.canvas.width = this.canvasSize[0];
        this.canvas.height = this.canvasSize[1];
        this.canvas.style.width = (this.canvas.width*zoom)+'px';
        this.canvas.style.height = (this.canvas.height*zoom)+'px';

        //show canvas
        this.canvas.style.display = 'block';

        //center canvas in window
        this.canvas.style.left = 64+canvasView.clientWidth/2-(this.canvasSize[0]*zoom/2)+'px';
        this.canvas.style.top = 48+canvasView.clientHeight/2-(this.canvasSize[1]*zoom/2)+'px';

        this.context.imageSmoothingEnabled = false;
        this.context.mozImageSmoothingEnabled = false;
    }

    hover() {
        // Hides all the layers but the current one
        for (let i=1; i<layers.length - nAppLayers; i++) {
            if (layers[i] !== this) {
                layers[i].canvas.style.opacity = 0.3;
            }
        }
    }

    unhover() {
        // Shows all the layers again
        for (let i=1; i<layers.length - nAppLayers; i++) {
            if (layers[i] !== this) {
                layers[i].canvas.style.opacity = 1;
            }
        }
    }

    setID(id) {
        this.id = id;
        if (this.menuEntry != null) {
            this.menuEntry.id = id;
        }
    }

    // Resizes canvas
    resize() {
        let newWidth = (this.canvas.width * zoom) + 'px';
        let newHeight = (this.canvas.height *zoom)+ 'px';

        this.canvas.style.width = newWidth;
        this.canvas.style.height = newHeight;
    }

    setCanvasOffset (offsetLeft, offsetTop) {
        //horizontal offset
        var minXOffset = -this.canvasSize[0] * zoom;
        var maxXOffset = window.innerWidth - 300;
    
        if 	(offsetLeft < minXOffset)
            this.canvas.style.left = minXOffset +'px';
        else if (offsetLeft > maxXOffset)
            this.canvas.style.left = maxXOffset +'px';
        else
            this.canvas.style.left = offsetLeft +'px';
    
        //vertical offset
        var minYOffset = -this.canvasSize[1] * zoom + 164;
        var maxYOffset = window.innerHeight - 100;
    
        if 	(offsetTop < minYOffset)
            this.canvas.style.top = minYOffset +'px';
        else if (offsetTop > maxYOffset)
            this.canvas.style.top = maxYOffset +'px';
        else
            this.canvas.style.top = offsetTop +'px';
    }

    // Copies the otherLayer's position and size
    copyData(otherLayer) {
        this.canvas.style.width = otherLayer.canvas.style.width;
        this.canvas.style.height = otherLayer.canvas.style.height;
        
        this.canvas.style.left = otherLayer.canvas.style.left;
        this.canvas.style.top = otherLayer.canvas.style.top;
    }

    openOptionsMenu(event) {
        if (event.which == 3) {
            let selectedId;
            let target = event.target;

            while (target != null && target.classList != null && !target.classList.contains("layers-menu-entry")) {
                target = target.parentElement;
            }

            selectedId = target.id;

            layerOptions.style.visibility = "visible";
            layerOptions.style.top = "0";
            layerOptions.style.marginTop = "" + (event.clientY - 25) + "px";

            LayerList.getLayerByID(selectedId).selectLayer();
        }
    }

    closeOptionsMenu(event) {
        layerOptions.style.visibility = "hidden";
        currentLayer.menuEntry.getElementsByTagName("p")[0].setAttribute("contenteditable", false);
        isRenamingLayer = false;

        if (this.oldLayerName != null) {
            let name = this.menuEntry.getElementsByTagName("p")[0].innerHTML;
            this.name = name;

            new HistoryState().RenameLayer(this.oldLayerName, name, currentLayer);
            this.oldLayerName = null;
        }
    }

    selectLayer(layer) {
        if (layer == null) {
            // Deselecting the old layer
            currentLayer.deselectLayer();

            // Selecting the current layer
            this.isSelected = true;
            this.menuEntry.classList.add("selected-layer");
            currentLayer = LayerList.getLayerByName(this.menuEntry.getElementsByTagName("p")[0].innerHTML);
        }
        else {
            currentLayer.deselectLayer();

            layer.isSelected = true;
            layer.menuEntry.classList.add("selected-layer");
            currentLayer = layer;
        }
    }

    toggleLock() {
        if (this.isLocked) {
            this.unlock();
        }
        else {
            this.lock();
        }
    }

    toggleVisibility() {
        if (this.isVisible) {
            this.hide();
        }
        else {
            this.show();
        }
    }

    deselectLayer() {
        this.isSelected = false;
        this.menuEntry.classList.remove("selected-layer");
    }

    lock() {
        this.isLocked = true;
        this.menuEntry.getElementsByClassName("layer-button")[0].style.visibility = "visible";

        this.menuEntry.getElementsByClassName("default-icon")[0].style.display = "none";
        this.menuEntry.getElementsByClassName("edited-icon")[0].style.display = "inline-block";
    }

    unlock() {
        this.isLocked = false;
        this.menuEntry.getElementsByClassName("layer-button")[0].style.visibility = "hidden";

        this.menuEntry.getElementsByClassName("default-icon")[0].style.display = "inline-block";
        this.menuEntry.getElementsByClassName("edited-icon")[0].style.display = "none";
    }

    show() {
        this.isVisible = true;
        this.canvas.style.visibility = "visible";
        this.menuEntry.getElementsByClassName("layer-button")[1].style.visibility = "hidden";

        // Changing icon
        this.menuEntry.getElementsByClassName("default-icon")[1].style.display = "inline-block";
        this.menuEntry.getElementsByClassName("edited-icon")[1].style.display = "none";
    }

    hide() {
        this.isVisible = false;
        this.canvas.style.visibility = "hidden";
        this.menuEntry.getElementsByClassName("layer-button")[1].style.visibility = "visible";

        // Changing icon
        this.menuEntry.getElementsByClassName("default-icon")[1].style.display = "none";
        this.menuEntry.getElementsByClassName("edited-icon")[1].style.display = "inline-block";
    }

    updateLayerPreview() {
        // Getting the canvas
        let destination = this.menuEntry.getElementsByTagName("canvas")[0];
        let widthRatio = this.canvasSize[0] / this.canvasSize[1];
        let heightRatio = this.canvasSize[1] / this.canvasSize[0];

        // Computing width and height for the preview image
        let previewWidth = destination.width;
        let previewHeight = destination.height;

        // If the sprite is rectangular, I apply the ratio to the preview as well
        if (widthRatio < 1) {
            previewWidth = destination.width * widthRatio;
        }
        else if (widthRatio > 1) {
            previewHeight = destination.height * heightRatio;
        }

        // La appiccico sulla preview
        destination.getContext('2d').clearRect(0, 0, destination.width, destination.height);
        destination.getContext('2d').drawImage(this.canvas,
            // This is necessary to center the preview in the canvas
            (destination.width - previewWidth) / 2, (destination.height - previewHeight) / 2,
            previewWidth, previewHeight);
    }
}

// REFACTOR: LayerMenu
layerList = document.getElementById("layers-menu");