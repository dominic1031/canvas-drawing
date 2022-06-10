// Set Canvas
const canvas = document.getElementById("canvas");
canvas.width = window.innerWidth;
canvas.height = 400;

// Set Context
let backgroundColor = "#FFFFFF";
const context = canvas.getContext("2d");
context.fillStyle = backgroundColor;
context.fillRect(0, 0, canvas.width, canvas.height);

// Set Pen Options
let drawWidth = document.getElementsByClassName("pen-range")[0].value;
let currentTool = "pen";
let drawColor = "#000000";
let isDrawing = false;

// Set stack for Undo/Redo button
let undoStack = [];
let redoStack = [];

// Set Event Listeners
// mobile
canvas.addEventListener("touchstart", mouseDownEvent, false);
canvas.addEventListener("touchmove", mouseMoveEvent, false);
canvas.addEventListener("touchend", mouseUpEvent, false);
// desktop
canvas.addEventListener("mousedown", mouseDownEvent, false);
canvas.addEventListener("mousemove", mouseMoveEvent, false);
canvas.addEventListener("mouseup", mouseUpEvent, false);
canvas.addEventListener("mouseout", mouseOutEvent, false);

// Functions
function mouseDownEvent(event) {
  switch (currentTool) {
    case "bucket":
      break;
    case "pen":
    default:
      startDrawing(event);
      break;
  }
}

function mouseMoveEvent(event) {
  switch (currentTool) {
    case "bucket":
      break;
    case "pen":
    default:
      whileDrawing(event);
      break;
  }
}

function mouseUpEvent(event) {
  switch (currentTool) {
    case "bucket":
      floodFill(event);
      break;
    case "pen":
    default:
      stopDrawing(event);
      break;
  }
}

function mouseOutEvent(event) {
  switch (currentTool) {
    case "bucket":
      break;
    case "pen":
    default:
      stopDrawing(event);
      break;
  }
}

function setTool(name) {
  currentTool = name;
  console.log(currentTool);
}

function setColor(element) {
  // coverts text in this format "rgb(#, #, #)" to hex
  const rgbToHex = (rgb) =>
    `#${rgb
      .match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/)
      .slice(1)
      .map((n) => parseInt(n, 10).toString(16).padStart(2, "0"))
      .join("")}`;

  if (element.className == "color-field") {
    drawColor = rgbToHex(element.style.background);
    const colorPicker = document.getElementsByClassName("color-picker")[0];
    colorPicker.value = drawColor;
  } else if (element.className == "color-picker") {
    drawColor = element.value; // = hex value
  }
}

function floodFill(event) {
  // Helper Functions
  const hexToRgb = (hex) => {
    return hex
      .replace(
        /^#?([a-f\d])([a-f\d])([a-f\d])$/i,
        (m, r, g, b) => "#" + r + r + g + g + b + b
      )
      .substring(1)
      .match(/.{2}/g)
      .map((x) => parseInt(x, 16));
  };

  function getRgb(imageData, x, y) {
    const pixelIndex = (y * canvas.width + x) * 4;
    const [r, g, b, a] = imageData.data.slice(pixelIndex, pixelIndex + 4);
    return [r, g, b];
  }

  function isEqual(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  // Function Begins Here
  event.preventDefault();
  let x = event.clientX - canvas.offsetLeft;
  let y = event.clientY - canvas.offsetTop;

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const startColorRgb = getRgb(imageData, x, y);
  const fillColorRgb = hexToRgb(drawColor);
  const stack = [];
  stack.push([x, y]);
  const visited = new Set();

  const isInvalid = (x, y) => {
    return (
      x < 0 ||
      x >= canvas.width ||
      y < 0 ||
      y >= canvas.height ||
      visited.has([x, y])
    );
  };

  while (stack.length) {
    [x, y] = stack.pop();
    if (isInvalid(x, y)) {
      continue;
    }
    const currentColorRgb = getRgb(imageData, x, y);

    if (
      !isEqual(currentColorRgb, startColorRgb) ||
      isEqual(currentColorRgb, fillColorRgb)
    ) {
      continue;
    }
    visited.add([x, y]);

    const i = (y * canvas.width + x) * 4;
    imageData.data[i] = fillColorRgb[0];
    imageData.data[i + 1] = fillColorRgb[1];
    imageData.data[i + 2] = fillColorRgb[2];
    imageData.data[i + 3] = 255;

    const neighbors = [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ];
    neighbors.forEach((el) => {
      if (isInvalid(el[0], el[1])) return;
      stack.push(el);
    });
  }
  context.putImageData(imageData, 0, 0);
  undoStack.push(imageData);
  console.log("Done Filling");
}

function startDrawing(event) {
  event.preventDefault();
  isDrawing = true;
  context.beginPath();
  context.moveTo(
    event.clientX - canvas.offsetLeft,
    event.clientY - canvas.offsetTop
  );
}

function whileDrawing(event) {
  event.preventDefault();
  if (!isDrawing) return;

  context.lineTo(
    event.clientX - canvas.offsetLeft,
    event.clientY - canvas.offsetTop
  );
  context.strokeStyle = drawColor;
  context.lineWidth = drawWidth;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.stroke();
}

function stopDrawing(event) {
  event.preventDefault();
  if (!isDrawing) return;

  context.stroke();
  context.closePath();
  isDrawing = false;

  // record current canvas into history when drawing is done
  if (["mouseup", "mouseout", "touchend"].includes(event.type)) {
    undoStack.push(context.getImageData(0, 0, canvas.width, canvas.height));
    redoStack = []; // prevent any previously available redos
  }
}

// Makes the canvas completely white again
function clearCanvas() {
  context.fillStyle = backgroundColor;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillRect(0, 0, canvas.width, canvas.height);

  if (undoStack.length == 0) return;
  undoStack.push(context.getImageData(0, 0, canvas.width, canvas.height));
}

// Takes the previous drawing, and puts it back on the canvas
function undo() {
  if (undoStack.length == 0) return; // nothing to undo, so just return
  const imageData = undoStack.pop(); // remove current imageData from undo stack
  redoStack.push(imageData); // allow for redo of current imageData

  if (undoStack.length == 0) {
    // clear the canvas if no previous imageData available
    clearCanvas();
  } else {
    // otherwise replace current imageData previous imageData
    context.putImageData(undoStack[undoStack.length - 1], 0, 0);
  }
}

// Takes the most recently undone drawing, and puts it back on the canvas
function redo() {
  if (redoStack.length == 0) return; // nothing to redo, so just return
  const imageData = redoStack.pop(); // get most recent undone imageData
  undoStack.push(imageData); // put it in undoStack because it's the current imageData now
  context.putImageData(imageData, 0, 0); // update the current imageData
}
