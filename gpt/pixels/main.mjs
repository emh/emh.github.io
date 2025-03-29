const canvas = document.getElementById('app');
const ctx = canvas.getContext('2d');

// Grid configuration
const CELL_SIZE = 20; // Size of each cell in pixels (constant)
const GRID_COLOR = '#d6e5f3'; // Very light blue for grid lines
const DEFAULT_FILL_COLOR = '#36454F'; // Charcoal gray for filled squares

// Palette configuration - dynamic based on screen width
// Height will be calculated during resize to ensure square buttons
let PALETTE_HEIGHT; // Height of the palette bar in pixels
let PALETTE_ROW_HEIGHT; // Height of each row (colors and tools)

// Calculate palette dimensions to ensure square buttons
function calculatePaletteSize() {
  // Each row needs to be 1/8 of the screen width (to make 8 square buttons)
  const buttonSize = Math.floor(canvas.width / 8);
  PALETTE_ROW_HEIGHT = buttonSize;
  PALETTE_HEIGHT = buttonSize * 2; // Two rows of buttons
}

// Color palette - 8 colors as requested
const COLORS = [
  '#000000', // Black
  '#FFFFFF', // White
  '#FF0000', // Red
  '#0000FF', // Blue
  '#FFFF00', // Yellow
  '#00FF00', // Green
  '#FFA500', // Orange
  '#800080', // Purple
];

// Drawing modes
const MODES = ['blend', 'overwrite', 'erase'];
let currentModeIndex = 0; // Start with blend mode

// Mode icons (7x7 pixel art)
const MODE_ICONS = {
  'blend': [
    [1, 0, 1, 0, 1, 0, 1],
    [0, 1, 0, 1, 0, 1, 0],
    [1, 0, 1, 0, 1, 0, 1],
    [0, 1, 0, 1, 0, 1, 0],
    [1, 0, 1, 0, 1, 0, 1],
    [0, 1, 0, 1, 0, 1, 0],
    [1, 0, 1, 0, 1, 0, 1]
  ],
  'overwrite': [
    [0, 0, 1, 1, 1, 0, 0],
    [0, 0, 1, 0, 1, 0, 0],
    [0, 0, 1, 1, 1, 0, 0],
    [0, 0, 1, 1, 1, 0, 0],
    [0, 0, 1, 1, 1, 0, 0],
    [0, 0, 0, 1, 0, 0, 0],
    [0, 0, 0, 1, 0, 0, 0]
  ],
  'erase': [
    [0, 0, 0, 1, 0, 0, 0],
    [0, 0, 0, 1, 0, 0, 0],
    [0, 0, 1, 1, 1, 0, 0],
    [0, 0, 1, 1, 1, 0, 0],
    [0, 0, 1, 1, 1, 0, 0],
    [0, 0, 1, 0, 1, 0, 0],
    [0, 0, 1, 1, 1, 0, 0]
  ]
};

// Drawing tools
const TOOLS = ['point', 'line', 'circle', 'rectangle', 'spray'];
let currentToolIndex = 0; // Start with point tool

// Tool type icons (7x7 pixel art)
const TOOL_TYPE_ICONS = {
  'point': [
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 1, 1, 1, 0, 0],
    [0, 0, 1, 1, 1, 0, 0],
    [0, 0, 1, 1, 1, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0]
  ],
  'line': [
    [0, 0, 0, 0, 0, 0, 0],
    [1, 0, 0, 0, 0, 0, 0],
    [0, 1, 0, 0, 0, 0, 0],
    [0, 0, 1, 0, 0, 0, 0],
    [0, 0, 0, 1, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 0],
    [0, 0, 0, 0, 0, 1, 0]
  ],
  'circle': [
    [0, 0, 1, 1, 1, 0, 0],
    [0, 1, 0, 0, 0, 1, 0],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [0, 1, 0, 0, 0, 1, 0],
    [0, 0, 1, 1, 1, 0, 0]
  ],
  'rectangle': [
    [0, 0, 0, 0, 0, 0, 0],
    [0, 1, 1, 1, 1, 1, 0],
    [0, 1, 0, 0, 0, 1, 0],
    [0, 1, 0, 0, 0, 1, 0],
    [0, 1, 0, 0, 0, 1, 0],
    [0, 1, 1, 1, 1, 1, 0],
    [0, 0, 0, 0, 0, 0, 0]
  ],
  'spray': [
    [0, 1, 0, 0, 1, 0, 1],
    [1, 0, 1, 0, 0, 0, 0],
    [0, 0, 0, 1, 1, 0, 0],
    [0, 1, 0, 0, 0, 1, 0],
    [1, 0, 0, 1, 0, 0, 1],
    [0, 0, 1, 0, 0, 1, 0],
    [1, 0, 0, 0, 1, 0, 0]
  ]
};

// Tool icons (pixel art style) - 7x7 resolution as 2D arrays (1 = filled pixel, 0 = empty)
const TOOL_ICONS = {
  'redo': [
    [0, 0, 1, 1, 1, 0, 1],
    [0, 1, 0, 0, 0, 1, 1],
    [1, 0, 0, 0, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0],
    [1, 0, 0, 0, 0, 0, 0],
    [0, 1, 0, 0, 0, 1, 0],
    [0, 0, 1, 1, 1, 0, 0]
  ],
  'undo': [
    [1, 0, 1, 1, 1, 0, 0],
    [1, 1, 0, 0, 0, 1, 0],
    [1, 1, 1, 0, 0, 0, 1],
    [0, 0, 0, 0, 0, 0, 1],
    [0, 0, 0, 0, 0, 0, 1],
    [0, 1, 0, 0, 0, 1, 0],
    [0, 0, 1, 1, 1, 0, 0]
  ],
  'zoomIn': [
    [0, 0, 0, 1, 0, 0, 0],
    [0, 0, 0, 1, 0, 0, 0],
    [0, 0, 0, 1, 0, 0, 0],
    [1, 1, 1, 1, 1, 1, 1],
    [0, 0, 0, 1, 0, 0, 0],
    [0, 0, 0, 1, 0, 0, 0],
    [0, 0, 0, 1, 0, 0, 0]
  ],
  'zoomOut': [
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [1, 1, 1, 1, 1, 1, 1],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0]
  ],
  'mode': [
    [1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 1, 0, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1]
  ],
  'tool': [
    [1, 0, 0, 0, 0, 0, 0],
    [1, 1, 0, 0, 0, 0, 0],
    [1, 0, 1, 0, 0, 0, 0],
    [1, 0, 0, 1, 0, 0, 0],
    [1, 0, 0, 0, 1, 0, 0],
    [1, 0, 0, 0, 0, 1, 0],
    [1, 1, 1, 1, 1, 1, 1]
  ],
  'new': [
    [1, 0, 0, 0, 0, 0, 1],
    [0, 1, 0, 0, 0, 1, 0],
    [0, 0, 1, 0, 1, 0, 0],
    [0, 0, 0, 1, 0, 0, 0],
    [0, 0, 1, 0, 1, 0, 0],
    [0, 1, 0, 0, 0, 1, 0],
    [1, 0, 0, 0, 0, 0, 1]
  ],
  'share': [
    [0, 0, 0, 1, 0, 0, 0],
    [0, 0, 1, 1, 1, 0, 0],
    [0, 0, 0, 1, 0, 0, 0],
    [1, 1, 0, 1, 0, 1, 1],
    [1, 0, 0, 1, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1]
  ]
};

// Define a checkmark icon for visual confirmation
const CHECKMARK_ICON = [
  [0, 0, 0, 0, 0, 0, 1],
  [0, 0, 0, 0, 0, 1, 0],
  [0, 0, 0, 0, 0, 1, 0],
  [0, 0, 0, 0, 1, 0, 0],
  [1, 0, 0, 1, 0, 0, 0],
  [0, 1, 0, 1, 0, 0, 0],
  [0, 0, 1, 0, 0, 0, 0]
];



// Tools configuration - 8 tools as requested
const TOOLS_CONFIG = [
  { id: 'undo', tooltip: 'Undo' },
  { id: 'redo', tooltip: 'Redo' },
  { id: 'zoomIn', tooltip: 'Zoom In' },
  { id: 'zoomOut', tooltip: 'Zoom Out' },
  { id: 'mode', tooltip: 'Mode: Blend/Overwrite/Erase' },
  { id: 'tool', tooltip: 'Tool: Point/Line/Circle/Rectangle/Spray' },
  { id: 'new', tooltip: 'New/Clear' },
  { id: 'share', tooltip: 'Share' }
];

// Represents a painted pixel with color, coordinates, and zoom level
class Pixel {
  constructor(x, y, zoomLevel, color) {
    this.x = x;                 // x coordinate
    this.y = y;                 // y coordinate
    this.zoomLevel = zoomLevel; // Zoom level where this pixel was painted
    this.color = color;         // Color of this pixel
  }
}

// PixelGrid manages a collection of pixels painted at different zoom levels
class PixelGrid {
  constructor() {
    this.pixels = []; // Array of all painted pixels
    this.currentZoomLevel = 10; // Start at zoom level 10 so users can zoom out
    
    // For undo/redo functionality
    this.history = []; // Array of past states
    this.redoStack = []; // Stack of states that were undone
    this.maxHistorySize = 50; // Limit history to prevent memory issues
    
    // For batch operations (e.g., when dragging to paint multiple cells)
    this.inBatchOperation = false;
  }
  
  // Start a batch operation (multiple cells painted in one action)
  startBatch() {
    if (!this.inBatchOperation) {
      this.inBatchOperation = true;
      this.saveState(); // Save state at start of batch
    }
  }
  
  // End a batch operation
  endBatch() {
    this.inBatchOperation = false;
  }
  
  // Save the current state to history
  saveState() {
    // Clear redo stack since we're creating a new history branch
    this.redoStack = [];
    
    // Save current state to history
    const currentState = {
      pixels: JSON.parse(JSON.stringify(this.pixels)),
      zoomLevel: this.currentZoomLevel
    };
    
    this.history.push(currentState);
    
    // Limit history size
    if (this.history.length > this.maxHistorySize) {
      this.history.shift(); // Remove oldest state
    }
  }
  
  // Undo the last action
  undo() {
    if (this.history.length === 0) return false; // Nothing to undo
    
    // Save current state to redo stack
    const currentState = {
      pixels: JSON.parse(JSON.stringify(this.pixels)),
      zoomLevel: this.currentZoomLevel
    };
    this.redoStack.push(currentState);
    
    // Pop the last state from history
    const previousState = this.history.pop();
    
    // Restore the previous state
    this.pixels = previousState.pixels;
    this.currentZoomLevel = previousState.zoomLevel;
    
    return true;
  }
  
  // Redo the last undone action
  redo() {
    if (this.redoStack.length === 0) return false; // Nothing to redo
    
    // Save current state to history
    const currentState = {
      pixels: JSON.parse(JSON.stringify(this.pixels)),
      zoomLevel: this.currentZoomLevel
    };
    this.history.push(currentState);
    
    // Pop the last state from redo stack
    const nextState = this.redoStack.pop();
    
    // Restore the next state
    this.pixels = nextState.pixels;
    this.currentZoomLevel = nextState.zoomLevel;
    
    return true;
  }
  
  // Check if a pixel exists at the given coordinates and zoom level
  hasPixel(x, y, z) {
    return this.pixels.some(p => p.x === x && p.y === y && p.zoomLevel === z);
  }
  
  // Get a pixel at the given coordinates and zoom level, or null if not exists
  getPixel(x, y, z) {
    return this.pixels.find(p => p.x === x && p.y === y && p.zoomLevel === z) || null;
  }
  
  // Remove a pixel at the given coordinates and zoom level if it exists
  removePixel(x, y, z) {
    const index = this.pixels.findIndex(p => p.x === x && p.y === y && p.zoomLevel === z);
    if (index !== -1) {
      this.pixels.splice(index, 1);
      return true;
    }
    return false;
  }
  
  // Set the color of a pixel at given coordinates and current zoom level
  setPixelColor(x, y, color, saveHistory = true) {
    // Save the current state before making changes, but only if not in a batch operation
    if (saveHistory && !this.inBatchOperation) {
      this.saveState();
    }
    
    const z = this.currentZoomLevel; // Use current zoom level
    
    // Check if there's already a pixel at this position
    const existingPixel = this.getPixel(x, y, z);
    
    if (color === null) {
      // If setting to null (erasing), remove the pixel if it exists
      if (existingPixel) {
        this.removePixel(x, y, z);
      }
    } else {
      // If setting a color
      if (existingPixel) {
        // Update existing pixel
        existingPixel.color = color;
      } else {
        // Create a new pixel
        this.pixels.push(new Pixel(x, y, z, color));
      }
    }
  }
  
  // Get the effective color of a pixel at given coordinates for the current zoom level
  getPixelColor(x, y) {
    return this.getPixelColorAt(x, y, this.currentZoomLevel);
  }
  
  // Get the color of a pixel at specific coordinates and zoom level
  getPixelColorAt(x, y, z) {
    // First check if there's a pixel exactly at this position and zoom level
    const exactPixel = this.getPixel(x, y, z);
    if (exactPixel) return exactPixel.color;
    
    // Look for higher-resolution pixels (smaller cells) within this cell
    if (z < 20) { // We can look for higher-resolution pixels
      const highResPixels = this.pixels.filter(
        p => p.zoomLevel > z && 
            Math.floor(p.x / Math.pow(2, p.zoomLevel - z)) === x &&
            Math.floor(p.y / Math.pow(2, p.zoomLevel - z)) === y
      );
      
      if (highResPixels.length > 0) {
        // Blend all colors from higher resolution pixels
        const colors = highResPixels.map(p => p.color);
        if (colors.length === 1) return colors[0];
        
        // Blend all colors
        let blended = colors[0];
        for (let i = 1; i < colors.length; i++) {
          blended = blendColors(blended, colors[i]);
        }
        return blended;
      }
    }
    
    // Look for lower-resolution pixels (larger cells) that contain this cell
    if (z > 0) {
      for (let lowerZ = z - 1; lowerZ >= 0; lowerZ--) {
        const parentX = Math.floor(x / Math.pow(2, z - lowerZ));
        const parentY = Math.floor(y / Math.pow(2, z - lowerZ));
        
        const parentPixel = this.getPixel(parentX, parentY, lowerZ);
        if (parentPixel) return parentPixel.color;
      }
    }
    
    // No color found at any zoom level
    return null;
  }
  
  // Zoom in - increase the zoom level
  zoomIn() {
    if (this.currentZoomLevel >= 20) return; // Maximum zoom level
    
    // Save state for undo/redo
    this.saveState();
    
    // Simply increase the zoom level
    this.currentZoomLevel++;
  }
  
  // Zoom out - decrease the zoom level
  zoomOut() {
    if (this.currentZoomLevel <= 0) return; // Minimum zoom level
    
    // Save state for undo/redo
    this.saveState();
    
    // Simply decrease the zoom level
    this.currentZoomLevel--;
  }
}

// State variables
let grid = new PixelGrid();
let viewportX = 0; // Scroll offset X
let viewportY = 0; // Scroll offset Y
let isDragging = false;
let lastTouchedCell = null;
let isEraseMode = false; // For backward compatibility, will be synced with currentModeIndex
let currentColor = COLORS[0]; // Current color selected from palette
let selectedSwatchIndex = 0;

// Tool-specific state variables
let toolStartCell = null;  // Starting cell for line tool
let toolEndCell = null;    // Current end cell for line tool (while dragging)
let isDrawingShape = false; // Whether we're currently drawing a shape (line, circle, etc.)

// Track touch/pointer events
let touchStartX = 0;
let touchStartY = 0;
let lastTouchX = 0;
let lastTouchY = 0;
let isTwoFingerGesture = false;

// Check if a point is in the palette area
function isInPalette(y) {
  return y > canvas.height - PALETTE_HEIGHT;
}

// Check if a point is in the color row of the palette
function isInColorRow(y) {
  return y > canvas.height - PALETTE_HEIGHT && y < canvas.height - PALETTE_HEIGHT + PALETTE_ROW_HEIGHT;
}

// Check if a point is in the tools row of the palette
function isInToolsRow(y) {
  return y >= canvas.height - PALETTE_HEIGHT + PALETTE_ROW_HEIGHT && y < canvas.height;
}

// Get the swatch index at a given point
function getSwatchAt(x, y) {
  if (!isInColorRow(y)) return -1;
  
  // Calculate swatch width based on screen width
  const swatchWidth = canvas.width / COLORS.length;
  
  // Determine which swatch was clicked
  const swatchIndex = Math.floor(x / swatchWidth);
  
  // Ensure we don't return an invalid index
  return (swatchIndex >= 0 && swatchIndex < COLORS.length) ? swatchIndex : -1;
}

// Get the tool id at a given point
function getToolAt(x, y) {
  if (!isInToolsRow(y)) return null;
  
  // Calculate tool button width based on screen width
  const toolButtonWidth = canvas.width / TOOLS_CONFIG.length;
  
  // Determine which tool was clicked
  const toolIndex = Math.floor(x / toolButtonWidth);
  
  // Ensure we don't return an invalid index
  return (toolIndex >= 0 && toolIndex < TOOLS_CONFIG.length) ? TOOLS_CONFIG[toolIndex].id : null;
}

// Check if the given point is over the share button (special case for mobile)
function isOverShareButton(x, y) {
  // Skip this check if the share button doesn't exist yet
  const shareButton = document.getElementById('share-button');
  if (!shareButton) return false;
  
  // Get button position and dimensions
  const rect = shareButton.getBoundingClientRect();
  
  // Check if the point is inside the button's rectangle
  return (
    x >= rect.left && 
    x <= rect.right && 
    y >= rect.top && 
    y <= rect.bottom
  );
}

// Resize canvas to fill the screen
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  // Recalculate palette dimensions to ensure square buttons
  calculatePaletteSize();
  
  render(); // Re-render after resize
}

// Convert screen coordinates to grid cell coordinates
function getCellCoords(screenX, screenY) {
  // Apply viewport offset
  const adjustedX = screenX + viewportX;
  const adjustedY = screenY + viewportY;
  
  // Calculate cell coordinates - this is straightforward as
  // the cell size is constant regardless of zoom level
  const cellX = Math.floor(adjustedX / CELL_SIZE);
  const cellY = Math.floor(adjustedY / CELL_SIZE);
  
  return { x: cellX, y: cellY };
}

// Helper function to parse a hex color
function hexToRgb(hex) {
  // Remove the # if present
  hex = hex.replace(/^#/, '');
  
  // Parse the hex values
  let r, g, b;
  if (hex.length === 3) {
    // Short notation (#RGB)
    r = parseInt(hex.charAt(0) + hex.charAt(0), 16);
    g = parseInt(hex.charAt(1) + hex.charAt(1), 16);
    b = parseInt(hex.charAt(2) + hex.charAt(2), 16);
  } else {
    // Full notation (#RRGGBB)
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  }
  
  return { r, g, b };
}

// Convert RGB to hex color
function rgbToHex(r, g, b) {
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// Blend two colors together (50/50 mix)
function blendColors(color1, color2) {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  // Simple 50/50 blend
  const blended = {
    r: Math.round((rgb1.r + rgb2.r) / 2),
    g: Math.round((rgb1.g + rgb2.g) / 2),
    b: Math.round((rgb1.b + rgb2.b) / 2)
  };
  
  return rgbToHex(blended.r, blended.g, blended.b);
}

// Generate all points along a line using Bresenham's algorithm
function getLinePoints(x0, y0, x1, y1) {
  const points = [];
  
  // Calculate differences and step direction
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  
  // Calculate error
  let err = dx - dy;
  
  // Current position
  let x = x0;
  let y = y0;
  
  while (true) {
    // Add current point
    points.push({ x, y });
    
    // Check if we've reached the end point
    if (x === x1 && y === y1) break;
    
    // Calculate next position
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
  
  return points;
}

// Generate all points for a rectangle outline
function getRectanglePoints(x0, y0, x1, y1) {
  const points = [];
  
  // Ensure x0,y0 is the top-left and x1,y1 is the bottom-right
  const left = Math.min(x0, x1);
  const right = Math.max(x0, x1);
  const top = Math.min(y0, y1);
  const bottom = Math.max(y0, y1);
  
  // Generate the four sides of the rectangle
  // Top edge
  for (let x = left; x <= right; x++) {
    points.push({ x, y: top });
  }
  
  // Right edge
  for (let y = top + 1; y <= bottom; y++) {
    points.push({ x: right, y });
  }
  
  // Bottom edge
  for (let x = right - 1; x >= left; x--) {
    points.push({ x, y: bottom });
  }
  
  // Left edge
  for (let y = bottom - 1; y > top; y--) {
    points.push({ x: left, y });
  }
  
  return points;
}

// Generate all points for a filled rectangle
function getFilledRectanglePoints(x0, y0, x1, y1) {
  const points = [];
  
  // Ensure x0,y0 is the top-left and x1,y1 is the bottom-right
  const left = Math.min(x0, x1);
  const right = Math.max(x0, x1);
  const top = Math.min(y0, y1);
  const bottom = Math.max(y0, y1);
  
  // Generate all points in the rectangle
  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      points.push({ x, y });
    }
  }
  
  return points;
}

// Generate all points for an ellipse/circle outline using Midpoint Ellipse Algorithm
function getEllipsePoints(x0, y0, x1, y1) {
  const points = [];
  
  // Ensure proper ordering of points
  const left = Math.min(x0, x1);
  const right = Math.max(x0, x1);
  const top = Math.min(y0, y1);
  const bottom = Math.max(y0, y1);
  
  // Calculate center and radii
  const centerX = Math.floor((left + right) / 2);
  const centerY = Math.floor((top + bottom) / 2);
  
  // Calculate semi-axes (half width/height)
  const radiusX = Math.floor((right - left) / 2);
  const radiusY = Math.floor((bottom - top) / 2);
  
  // Handle small/empty ellipses
  if (radiusX <= 0 || radiusY <= 0) {
    return points;
  }
  
  // Handle circle case (both radii the same)
  if (radiusX === radiusY) {
    return getCirclePoints(centerX, centerY, radiusX);
  }
  
  // Midpoint Ellipse Algorithm
  let a2 = radiusX * radiusX;
  let b2 = radiusY * radiusY;
  
  // First region
  let x = 0;
  let y = radiusY;
  let px = 0;
  let py = 2 * a2 * y;
  
  // Plot the initial point in each quadrant
  plotEllipsePoints(centerX, centerY, x, y, points);
  
  // Region 1
  let p = Math.round(b2 - (a2 * radiusY) + (0.25 * a2));
  while (px < py) {
    x++;
    px += 2 * b2;
    
    if (p < 0) {
      p += b2 + px;
    } else {
      y--;
      py -= 2 * a2;
      p += b2 + px - py;
    }
    
    plotEllipsePoints(centerX, centerY, x, y, points);
  }
  
  // Region 2
  p = Math.round(b2 * (x + 0.5) * (x + 0.5) + a2 * (y - 1) * (y - 1) - a2 * b2);
  while (y > 0) {
    y--;
    py -= 2 * a2;
    
    if (p > 0) {
      p += a2 - py;
    } else {
      x++;
      px += 2 * b2;
      p += a2 - py + px;
    }
    
    plotEllipsePoints(centerX, centerY, x, y, points);
  }
  
  return points;
}

// Helper function to add points in all four quadrants of the ellipse
function plotEllipsePoints(centerX, centerY, x, y, points) {
  points.push({ x: centerX + x, y: centerY + y });
  points.push({ x: centerX - x, y: centerY + y });
  points.push({ x: centerX + x, y: centerY - y });
  points.push({ x: centerX - x, y: centerY - y });
}

// Generate all points for a circle outline (special case of ellipse)
function getCirclePoints(centerX, centerY, radius) {
  const points = [];
  
  // Validate radius
  if (radius <= 0) return points;
  
  let x = radius;
  let y = 0;
  let err = 0;
  
  while (x >= y) {
    // Add the 8 octants
    points.push({ x: centerX + x, y: centerY + y });
    points.push({ x: centerX + y, y: centerY + x });
    points.push({ x: centerX - y, y: centerY + x });
    points.push({ x: centerX - x, y: centerY + y });
    points.push({ x: centerX - x, y: centerY - y });
    points.push({ x: centerX - y, y: centerY - x });
    points.push({ x: centerX + y, y: centerY - x });
    points.push({ x: centerX + x, y: centerY - y });
    
    // Adjust position
    y += 1;
    err += 1 + 2 * y;
    if (2 * (err - x) + 1 > 0) {
      x -= 1;
      err += 1 - 2 * x;
    }
  }
  
  return points;
}

// Generate points for a spray pattern
function getSprayPoints(centerX, centerY, radius = 3) {
  const points = [];
  
  // Create a 7x7 area (radius 3) centered at the given coordinates
  for (let y = centerY - radius; y <= centerY + radius; y++) {
    for (let x = centerX - radius; x <= centerX + radius; x++) {
      // Calculate distance from center
      const dx = x - centerX;
      const dy = y - centerY;
      const distance = Math.sqrt(dx*dx + dy*dy);
      
      // Only include points within the circular radius
      if (distance <= radius) {
        // Random chance (150%) to include each point
        if (Math.random() < 0.15) {
          points.push({ x, y });
        }
      }
    }
  }
  
  return points;
}

// Set, blend, or erase a cell's color based on current mode
function toggleCell(cellX, cellY, color = currentColor) {
  const currentMode = MODES[currentModeIndex];
  
  if (currentMode === 'erase') {
    // In erase mode, set the cell to null (transparent)
    grid.setPixelColor(cellX, cellY, null);
  } else if (currentMode === 'blend') {
    // Get current cell color
    const currentCellColor = grid.getPixelColor(cellX, cellY);
    
    if (currentCellColor) {
      // If cell is already colored, blend the new color with existing color
      const blendedColor = blendColors(currentCellColor, color);
      grid.setPixelColor(cellX, cellY, blendedColor);
    } else {
      // If cell is not colored, just set the new color
      grid.setPixelColor(cellX, cellY, color);
    }
  } else if (currentMode === 'overwrite') {
    // In overwrite mode, always set the new color regardless of existing color
    grid.setPixelColor(cellX, cellY, color);
  }
  
  // We don't want to update the favicon on every pixel change (would be too frequent)
  // So we'll use a debounce approach
  if (toggleCell.faviconUpdateTimer) {
    clearTimeout(toggleCell.faviconUpdateTimer);
  }
  toggleCell.faviconUpdateTimer = setTimeout(generateFavicon, 500); // Update favicon after 500ms of inactivity
}

// Zoom in: increase resolution by splitting each cell into 4
function zoomIn() {
  // Store center point of the screen before zooming
  const centerScreenX = canvas.width / 2;
  const centerScreenY = (canvas.height - PALETTE_HEIGHT) / 2;
  
  // Convert to grid coordinates at current zoom level
  const centerCellX = Math.floor((centerScreenX + viewportX) / CELL_SIZE);
  const centerCellY = Math.floor((centerScreenY + viewportY) / CELL_SIZE);
  
  // Keep track of the position within the center cell
  const cellOffsetX = (centerScreenX + viewportX) % CELL_SIZE;
  const cellOffsetY = (centerScreenY + viewportY) % CELL_SIZE;
  
  // Double the viewport position to maintain the same visual center
  // when the grid resolution doubles
  viewportX = centerCellX * 2 * CELL_SIZE + cellOffsetX * 2 - centerScreenX;
  viewportY = centerCellY * 2 * CELL_SIZE + cellOffsetY * 2 - centerScreenY;
  
  // Zoom in the grid (each cell becomes 4 cells)
  grid.zoomIn();
  
  render();
  generateFavicon();
}

// Zoom out: decrease resolution by merging sets of 4 cells
function zoomOut() {
  if (grid.currentZoomLevel <= 0) return; // Can't zoom out further
  
  // Store center point of the screen before zooming
  const centerScreenX = canvas.width / 2;
  const centerScreenY = (canvas.height - PALETTE_HEIGHT) / 2;
  
  // Convert to grid coordinates at current zoom level
  const centerCellX = Math.floor((centerScreenX + viewportX) / CELL_SIZE);
  const centerCellY = Math.floor((centerScreenY + viewportY) / CELL_SIZE);
  
  // Keep track of the position within the center cell
  const cellOffsetX = (centerScreenX + viewportX) % CELL_SIZE;
  const cellOffsetY = (centerScreenY + viewportY) % CELL_SIZE;
  
  // Halve the viewport position to maintain the same visual center
  // when the grid resolution halves
  viewportX = Math.floor(centerCellX / 2) * CELL_SIZE + Math.floor(cellOffsetX / 2) - centerScreenX;
  viewportY = Math.floor(centerCellY / 2) * CELL_SIZE + Math.floor(cellOffsetY / 2) - centerScreenY;
  
  // Zoom out the grid (4 cells become 1 cell)
  grid.zoomOut();
  
  render();
  generateFavicon();
}

// Draw the entire grid and filled cells
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Calculate visible grid range
  const cellsX = Math.ceil(canvas.width / CELL_SIZE) + 1;
  const cellsY = Math.ceil((canvas.height - PALETTE_HEIGHT) / CELL_SIZE) + 1;
  
  // Calculate starting cell coordinates
  const startCellX = Math.floor(viewportX / CELL_SIZE);
  const startCellY = Math.floor(viewportY / CELL_SIZE);
  const endCellX = startCellX + cellsX;
  const endCellY = startCellY + cellsY;
  
  // Draw the background
  ctx.fillStyle = '#f5f5f5';
  ctx.fillRect(0, 0, canvas.width, canvas.height - PALETTE_HEIGHT);
  
  // Draw all visible cells for the current zoom level
  for (let y = startCellY; y < endCellY; y++) {
    for (let x = startCellX; x < endCellX; x++) {
      const color = grid.getPixelColor(x, y);
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(
          x * CELL_SIZE - viewportX,
          y * CELL_SIZE - viewportY,
          CELL_SIZE,
          CELL_SIZE
        );
      }
    }
  }
  
  // Draw shape previews if currently drawing
  if (isDrawingShape) {
    ctx.fillStyle = currentColor;
    ctx.globalAlpha = 0.6; // Make the preview semi-transparent
    
    const currentTool = TOOLS[currentToolIndex];
    
    if (currentTool === 'line' && toolStartCell && toolEndCell) {
      // Line preview
      const linePoints = getLinePoints(
        toolStartCell.x, toolStartCell.y, 
        toolEndCell.x, toolEndCell.y
      );
      
      // Draw each point along the line
      for (const point of linePoints) {
        ctx.fillRect(
          point.x * CELL_SIZE - viewportX,
          point.y * CELL_SIZE - viewportY,
          CELL_SIZE,
          CELL_SIZE
        );
      }
    }
    else if (currentTool === 'rectangle' && toolStartCell && toolEndCell) {
      // Rectangle preview
      const rectPoints = getRectanglePoints(
        toolStartCell.x, toolStartCell.y,
        toolEndCell.x, toolEndCell.y
      );
      
      // Draw each point of the rectangle
      for (const point of rectPoints) {
        ctx.fillRect(
          point.x * CELL_SIZE - viewportX,
          point.y * CELL_SIZE - viewportY,
          CELL_SIZE,
          CELL_SIZE
        );
      }
    }
    else if (currentTool === 'circle' && toolStartCell && toolEndCell) {
      // Ellipse/circle preview
      const ellipsePoints = getEllipsePoints(
        toolStartCell.x, toolStartCell.y, 
        toolEndCell.x, toolEndCell.y
      );
      
      // Draw each point of the ellipse/circle
      for (const point of ellipsePoints) {
        ctx.fillRect(
          point.x * CELL_SIZE - viewportX,
          point.y * CELL_SIZE - viewportY,
          CELL_SIZE,
          CELL_SIZE
        );
      }
    }
    
    ctx.globalAlpha = 1.0; // Reset opacity
  }
  
  // Draw grid lines
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 1;
  
  // Offset for grid lines
  const offsetX = viewportX % CELL_SIZE;
  const offsetY = viewportY % CELL_SIZE;
  
  // Vertical lines
  for (let x = -offsetX; x <= canvas.width; x += CELL_SIZE) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, canvas.height - PALETTE_HEIGHT);
    ctx.stroke();
  }
  
  // Horizontal lines
  for (let y = -offsetY; y <= canvas.height - PALETTE_HEIGHT; y += CELL_SIZE) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(canvas.width, y + 0.5);
    ctx.stroke();
  }
  
  // Draw palette background
  ctx.fillStyle = '#e8e8e8';
  ctx.fillRect(0, canvas.height - PALETTE_HEIGHT, canvas.width, PALETTE_HEIGHT);
  
  // Draw divider between color swatches and tools
  ctx.fillStyle = '#d0d0d0';
  ctx.fillRect(0, canvas.height - PALETTE_HEIGHT + PALETTE_ROW_HEIGHT - 1, canvas.width, 2);
  
  // Draw color swatches
  const swatchWidth = canvas.width / COLORS.length;
  const swatchY = canvas.height - PALETTE_HEIGHT;
  
  for (let i = 0; i < COLORS.length; i++) {
    const swatchX = i * swatchWidth;
    
    // Draw swatch
    ctx.fillStyle = COLORS[i];
    ctx.fillRect(swatchX, swatchY, swatchWidth, PALETTE_ROW_HEIGHT);
    
    // Draw outer border (1px grey for all swatches)
    ctx.strokeStyle = '#999999'; // Grey border
    ctx.lineWidth = 1;
    ctx.strokeRect(swatchX, swatchY, swatchWidth, PALETTE_ROW_HEIGHT);
    
    // Draw inner border (1px black for selected swatch only)
    if (i === selectedSwatchIndex) {
      ctx.strokeStyle = i === 0 ? '#FFFFFF' : '#000000'; 
      ctx.lineWidth = 1;
      ctx.strokeRect(swatchX + 3, swatchY + 3, swatchWidth - 6, PALETTE_ROW_HEIGHT - 6);
    }
  }
  
  // Draw tool buttons
  const toolButtonWidth = canvas.width / TOOLS_CONFIG.length;
  const toolsY = canvas.height - PALETTE_HEIGHT + PALETTE_ROW_HEIGHT;
  
  ctx.font = '12px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Check if undo/redo are available
  const canUndo = grid.history.length > 0;
  const canRedo = grid.redoStack.length > 0;
  
  // Create/update share button HTML element if needed
  let shareButton = document.getElementById('share-button');
  if (!shareButton) {
    shareButton = document.createElement('button');
    shareButton.id = 'share-button';
    shareButton.setAttribute('aria-label', 'Share');
    shareButton.style.position = 'absolute';
    // Make button completely transparent but clickable
    shareButton.style.opacity = '0';
    shareButton.style.background = 'transparent';
    shareButton.style.border = 'none';
    shareButton.style.cursor = 'pointer';
    shareButton.style.outline = 'none';
    // Ensure it's on top of the canvas
    shareButton.style.zIndex = '10';
    // Ensure touch events work on mobile
    shareButton.style.WebkitTapHighlightColor = 'transparent';
    shareButton.style.touchAction = 'manipulation';
    document.body.appendChild(shareButton);
    
    // Add click event listener to the share button
    shareButton.addEventListener('click', () => {
      handleToolClick('share');
    });
  }
  
  for (let i = 0; i < TOOLS_CONFIG.length; i++) {
    const toolX = i * toolButtonWidth;
    const toolId = TOOLS_CONFIG[i].id;
    
    // Determine button background color based on state
    if (toolId === 'undo' && !canUndo) {
      ctx.fillStyle = '#e8e8e8'; // Disabled - slightly darker than palette background
    } else if (toolId === 'redo' && !canRedo) {
      ctx.fillStyle = '#e8e8e8'; // Disabled - slightly darker than palette background
    } else {
      ctx.fillStyle = '#ffffff';
    }
    
    // Draw tool button background
    ctx.fillRect(toolX, toolsY, toolButtonWidth, PALETTE_ROW_HEIGHT);
    
    // Draw button border - always 1px grey
    ctx.strokeStyle = '#999999'; // Grey border
    ctx.lineWidth = 1;
    ctx.strokeRect(toolX, toolsY, toolButtonWidth, PALETTE_ROW_HEIGHT);
    
    // Draw pixel art icon or label
    // Determine appropriate text/icon color
    const iconColor = (toolId === 'undo' && !canUndo) || (toolId === 'redo' && !canRedo) 
      ? '#aaaaaa'  // Grey for disabled buttons
      : '#333333'; // Dark grey for active buttons
    
    if (toolId === 'mode') {
      // Show current mode icon
      ctx.fillStyle = iconColor;
      
      // Get the icon for the current mode
      const currentMode = MODES[currentModeIndex];
      const modeIcon = MODE_ICONS[currentMode];
      
      if (modeIcon) {
        // Draw the specific mode icon
        drawSpecificIcon(modeIcon, toolX, toolsY, toolButtonWidth, PALETTE_ROW_HEIGHT);
      } else {
        // Fallback to generic icon if mode icon not found
        drawPixelIcon(toolId, toolX, toolsY, toolButtonWidth, PALETTE_ROW_HEIGHT);
      }
    } else if (toolId === 'tool') {
      // Show current tool icon
      ctx.fillStyle = iconColor;
      
      // Get the icon for the current tool
      const currentTool = TOOLS[currentToolIndex];
      const toolTypeIcon = TOOL_TYPE_ICONS[currentTool];
      
      if (toolTypeIcon) {
        // Draw the specific tool icon
        drawSpecificIcon(toolTypeIcon, toolX, toolsY, toolButtonWidth, PALETTE_ROW_HEIGHT);
      } else {
        // Fallback to generic icon if tool icon not found
        drawPixelIcon(toolId, toolX, toolsY, toolButtonWidth, PALETTE_ROW_HEIGHT);
      }      
    } else {
      // Draw pixel art icon
      
      if (toolId === 'share' && TOOL_ICONS['share'] === CHECKMARK_ICON) {
        ctx.fillStyle = '#00ff00';
      } else {
        ctx.fillStyle = iconColor;
      }
    
      drawPixelIcon(toolId, toolX, toolsY, toolButtonWidth, PALETTE_ROW_HEIGHT);
      
      // Position the actual share button over the drawn share icon when we reach it
      if (toolId === 'share') {
        // Update the position and size of the share button to match the drawn button
        shareButton.style.left = `${toolX}px`;
        shareButton.style.top = `${toolsY}px`;
        shareButton.style.width = `${toolButtonWidth}px`;
        shareButton.style.height = `${PALETTE_ROW_HEIGHT}px`;
      }
    }
  }
}

// Helper function to draw a specific pixel art icon from data
function drawSpecificIcon(iconData, x, y, width, height) {
  if (!iconData || !Array.isArray(iconData)) return;
  
  const iconHeight = iconData.length;
  const iconWidth = iconData[0].length;
  
  // Calculate pixel size to fit within the button
  // Leave a small margin around the icon (15% on each side)
  const margin = 0.15;
  const availableWidth = width * (1 - 2 * margin);
  const availableHeight = height * (1 - 2 * margin);
  
  const pixelSize = Math.min(
    Math.floor(availableWidth / iconWidth),
    Math.floor(availableHeight / iconHeight)
  );
  
  // Center the icon in the button
  const startX = x + (width - pixelSize * iconWidth) / 2;
  const startY = y + (height - pixelSize * iconHeight) / 2;
  
  // Use the current fill style which is set by the calling code
  for (let j = 0; j < iconHeight; j++) {
    for (let i = 0; i < iconWidth; i++) {
      // Check if this position should be filled
      if (iconData[j][i]) {
        ctx.fillRect(
          startX + i * pixelSize,
          startY + j * pixelSize,
          pixelSize,
          pixelSize
        );
      }
    }
  }
}

// Helper function to draw a pixel art icon by ID
function drawPixelIcon(iconId, x, y, width, height) {
  const iconData = TOOL_ICONS[iconId];
  if (!iconData || !Array.isArray(iconData)) return;
  
  drawSpecificIcon(iconData, x, y, width, height);
}

// Event handlers
function handleTouchStart(e) {
  e.preventDefault();
  
  const touch = e.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
  lastTouchX = touchStartX;
  lastTouchY = touchStartY;
  
  isTwoFingerGesture = e.touches.length >= 2;
  
  if (!isTwoFingerGesture) {
    // Check if touch is over the share button (special case)
    if (isOverShareButton(touchStartX, touchStartY)) {
      // The HTML button will handle the click itself
      return;
    }
    // Check if touch is in color palette row
    else if (isInColorRow(touchStartY)) {
      // Handle color swatch selection
      const swatchIndex = getSwatchAt(touchStartX, touchStartY);
      if (swatchIndex >= 0) {
        selectedSwatchIndex = swatchIndex;
        currentColor = COLORS[swatchIndex];
        render();
        return;
      }
    } 
    // Check if touch is in tools row
    else if (isInToolsRow(touchStartY)) {
      // Handle tool button click
      const toolId = getToolAt(touchStartX, touchStartY);
      if (toolId) {
        // Handle all tools except share (which uses its own HTML button)
        if (toolId !== 'share') {
          handleToolClick(toolId);
        }
        return;
      }
    } 
    // Touch is on the canvas
    else {
      const cell = getCellCoords(touch.clientX, touch.clientY);
      
      // Check which tool is active
      const currentTool = TOOLS[currentToolIndex];
      
      if (currentTool === 'point') {
        // Point tool works like the original behavior
        isDragging = true;
        lastTouchedCell = cell;
        
        // Start a batch operation and paint the first cell
        grid.startBatch();
        toggleCell(cell.x, cell.y, currentColor);
      } 
      else if (currentTool === 'spray') {
        // Spray tool applies random dots in a circular area
        isDragging = true;
        lastTouchedCell = cell;
        
        // Start a batch operation and spray the first area
        grid.startBatch();
        const sprayPoints = getSprayPoints(cell.x, cell.y);
        for (const point of sprayPoints) {
          toggleCell(point.x, point.y, currentColor);
        }
      }
      else if (currentTool === 'line' || currentTool === 'circle' || currentTool === 'rectangle') {
        isDrawingShape = true;
        toolStartCell = cell;
        toolEndCell = cell; // Initially both points are the same
      }
      
      render();
    }
  }
}

function handleTouchMove(e) {
  e.preventDefault();
  
  const touch = e.touches[0];
  const currentX = touch.clientX;
  const currentY = touch.clientY;
  
  if (isTwoFingerGesture && e.touches.length >= 2) {
    // Two-finger scroll
    const deltaX = currentX - lastTouchX;
    const deltaY = currentY - lastTouchY;
    
    viewportX -= deltaX;
    viewportY -= deltaY;
    
    render();
  } else if (!isInPalette(currentY)) {
    const cell = getCellCoords(currentX, currentY);
    const currentTool = TOOLS[currentToolIndex];
    
    if (isDragging && currentTool === 'point') {
      // Handle regular drawing with point tool
      // Only process if we moved to a new cell
      if (!lastTouchedCell || cell.x !== lastTouchedCell.x || cell.y !== lastTouchedCell.y) {
        lastTouchedCell = cell;
        toggleCell(cell.x, cell.y, currentColor);
        render();
      }
    }
    else if (isDragging && currentTool === 'spray') {
      // Handle spray tool
      if (!lastTouchedCell || cell.x !== lastTouchedCell.x || cell.y !== lastTouchedCell.y) {
        lastTouchedCell = cell;
        const sprayPoints = getSprayPoints(cell.x, cell.y);
        for (const point of sprayPoints) {
          toggleCell(point.x, point.y, currentColor);
        }
        render();
      }
    } 
    else if (isDrawingShape) {
      toolEndCell = cell;
      
      render(); // Re-render to show the updated preview
    }
  }
  
  lastTouchX = currentX;
  lastTouchY = currentY;
}

function handleTouchEnd(e) {
  e.preventDefault();
  
  if (e.touches.length === 0) {
    const currentTool = TOOLS[currentToolIndex];
    
    if (isDrawingShape) {
      grid.startBatch(); // Start batch so the entire shape is one undo operation
      
      if (currentTool === 'line' && toolStartCell && toolEndCell) {
        // Commit the line to the grid
        const linePoints = getLinePoints(
          toolStartCell.x, toolStartCell.y,
          toolEndCell.x, toolEndCell.y
        );
        
        for (const point of linePoints) {
          toggleCell(point.x, point.y, currentColor);
        }
        
        // Reset line drawing state
        toolStartCell = null;
        toolEndCell = null;
      }
      else if (currentTool === 'rectangle' && toolStartCell && toolEndCell) {
        // Commit the rectangle to the grid
        const rectPoints = getRectanglePoints(
          toolStartCell.x, toolStartCell.y,
          toolEndCell.x, toolEndCell.y
        );
        
        for (const point of rectPoints) {
          toggleCell(point.x, point.y, currentColor);
        }
        
        // Reset rectangle drawing state
        toolStartCell = null;
        toolEndCell = null;
      }
      else if (currentTool === 'circle' && toolStartCell && toolEndCell) {
        // Commit the circle to the grid
        const ellipsePoints = getEllipsePoints(
          toolStartCell.x, toolStartCell.y, 
          toolEndCell.x, toolEndCell.y
        );
          
        for (const point of ellipsePoints) {
          toggleCell(point.x, point.y, currentColor);
        }
        
        // Reset circle drawing state
        toolStartCell = null;
        toolEndCell = null;
      }
      
      // Instead of updating the favicon for each pixel toggle, update it once at the end
      // Clear any debounced updates that might be pending
      if (toggleCell.faviconUpdateTimer) {
        clearTimeout(toggleCell.faviconUpdateTimer);
        toggleCell.faviconUpdateTimer = null;
      }
      
      // Update favicon immediately after the batch is complete
      generateFavicon();

      if (isDragging || isDrawingShape) render();

      grid.endBatch(); // End batch
      isDrawingShape = false;
      isDragging = false;
    } else if (isDragging) {
      // If the user was dragging (free drawing), update the favicon
      generateFavicon();
      isDragging = false;
    }
    
    isTwoFingerGesture = false;
    lastTouchedCell = null;
  } else if (e.touches.length === 1) {
    // Switched from two-finger to one-finger
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    lastTouchX = touchStartX;
    lastTouchY = touchStartY;
    isTwoFingerGesture = false;
  }
}

// Mouse event handlers (for desktop support)
function handleMouseDown(e) {
  e.preventDefault();
  
  // Check if click is over the share button (special case)
  if (isOverShareButton(e.clientX, e.clientY)) {
    // The HTML button will handle the click itself
    return;
  }
  // Check if click is in color palette row
  else if (isInColorRow(e.clientY)) {
    // Handle color swatch selection
    const swatchIndex = getSwatchAt(e.clientX, e.clientY);
    if (swatchIndex >= 0) {
      selectedSwatchIndex = swatchIndex;
      currentColor = COLORS[swatchIndex];
      render();
      return;
    }
  } 
  // Check if click is in tools row
  else if (isInToolsRow(e.clientY)) {
    // Handle tool button click
    const toolId = getToolAt(e.clientX, e.clientY);
    if (toolId) {
      // Handle all tools except share (which uses its own HTML button)
      if (toolId !== 'share') {
        handleToolClick(toolId);
      }
      return;
    }
  } 
  // Click is on the canvas
  else {
    const cell = getCellCoords(e.clientX, e.clientY);
    const currentTool = TOOLS[currentToolIndex];
    
    if (currentTool === 'point') {
      // Point tool works like the original behavior
      isDragging = true;
      lastTouchedCell = cell;
      
      // Start a batch operation
      grid.startBatch();
      toggleCell(cell.x, cell.y, currentColor);
    }
    else if (currentTool === 'spray') {
      // Spray tool applies random dots in a circular area
      isDragging = true;
      lastTouchedCell = cell;
      
      // Start a batch operation and spray the first area
      grid.startBatch();
      const sprayPoints = getSprayPoints(cell.x, cell.y);
      for (const point of sprayPoints) {
        toggleCell(point.x, point.y, currentColor);
      }
    }
    else if (currentTool === 'line' || currentTool === 'circle' || currentTool === 'rectangle') {
      isDrawingShape = true;
      toolStartCell = cell;
      toolEndCell = cell; // Initially both points are the same
    }
  
    render();
  }
}

function handleMouseMove(e) {
  e.preventDefault();
  
  if (!isInPalette(e.clientY)) {
    const cell = getCellCoords(e.clientX, e.clientY);
    const currentTool = TOOLS[currentToolIndex];

    if (isDragging && currentTool === 'point') {
      // Handle regular drawing with point tool
      if (!lastTouchedCell || cell.x !== lastTouchedCell.x || cell.y !== lastTouchedCell.y) {
        lastTouchedCell = cell;
        toggleCell(cell.x, cell.y, currentColor);
        render();
      }
    }
    else if (isDragging && currentTool === 'spray') {
      // Handle spray tool
      // Always apply spray, even on the same cell (creates continuous random pattern)
      lastTouchedCell = cell;
      const sprayPoints = getSprayPoints(cell.x, cell.y);
      for (const point of sprayPoints) {
        toggleCell(point.x, point.y, currentColor);
      }
      render();
    }
    else if (isDrawingShape) {
      toolEndCell = cell;
      
      render(); // Re-render to show the updated preview
    }
  }
}

function handleMouseUp(e) {
  e.preventDefault();
  
  const currentTool = TOOLS[currentToolIndex];
  
  if (isDrawingShape) {
    grid.startBatch(); // Start batch so the entire shape is one undo operation
    
    if (currentTool === 'line' && toolStartCell && toolEndCell) {
      // Commit the line to the grid
      const linePoints = getLinePoints(
        toolStartCell.x, toolStartCell.y,
        toolEndCell.x, toolEndCell.y
      );
      
      for (const point of linePoints) {
        toggleCell(point.x, point.y, currentColor);
      }
      
      // Reset line drawing state
      toolStartCell = null;
      toolEndCell = null;
    }
    else if (currentTool === 'rectangle' && toolStartCell && toolEndCell) {
      // Commit the rectangle to the grid
      const rectPoints = getRectanglePoints(
        toolStartCell.x, toolStartCell.y,
        toolEndCell.x, toolEndCell.y
      );
      
      for (const point of rectPoints) {
        toggleCell(point.x, point.y, currentColor);
      }
      
      // Reset rectangle drawing state
      toolStartCell = null;
      toolEndCell = null;
    }
    else if (currentTool === 'circle' && toolStartCell && toolEndCell) {
      // Commit the circle to the grid
      const ellipsePoints = getEllipsePoints(
        toolStartCell.x, toolStartCell.y, 
        toolEndCell.x, toolEndCell.y
      );
        
      for (const point of ellipsePoints) {
        toggleCell(point.x, point.y, currentColor);
      }
      
      // Reset circle drawing state
      toolStartCell = null;
      toolEndCell = null;
    }
    
    // Instead of updating the favicon for each pixel toggle, update it once at the end
    // Clear any debounced updates that might be pending
    if (toggleCell.faviconUpdateTimer) {
      clearTimeout(toggleCell.faviconUpdateTimer);
      toggleCell.faviconUpdateTimer = null;
    }
    
    // Update favicon immediately after the batch is complete
    generateFavicon();
  }

  if (isDragging || isDrawingShape) render();

  grid.endBatch(); // End batch
  isDrawingShape = false;
  isDragging = false;
  
  lastTouchedCell = null;
}

// Serialize current grid state to a compact bit-packed encoding
function serializeGridToBase64() {
  // Only include pixels at the current zoom level
  const z = grid.currentZoomLevel;
  
  // Get all pixels at current zoom level
  const activePixels = grid.pixels.filter(pixel => pixel.zoomLevel === z);
  
  // If there are no pixels, return a minimal string
  if (activePixels.length === 0) {
    return btoa(`z${z}`);
  }
  
  // Find bounds of the drawing
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  
  for (const pixel of activePixels) {
    minX = Math.min(minX, pixel.x);
    minY = Math.min(minY, pixel.y);
    maxX = Math.max(maxX, pixel.x);
    maxY = Math.max(maxY, pixel.y);
  }
  
  // Width and height of our coordinate system
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  
  // Create an empty grid with the determined width and height
  // Fill with null (no color)
  const grid2D = Array(height).fill().map(() => Array(width).fill(null));
  
  // Fill the grid with pixels
  for (const pixel of activePixels) {
    const x = pixel.x - minX;
    const y = pixel.y - minY;
    grid2D[y][x] = pixel.color;
  }
  
  // Extract unique colors for the palette
  const uniqueColors = new Set();
  for (const row of grid2D) {
    for (const color of row) {
      if (color !== null) {
        uniqueColors.add(color);
      }
    }
  }
  
  // Convert to array
  const palette = Array.from(uniqueColors);
  
  // Determine number of bits needed for the color palette size
  // For example: 5 colors need 3 bits (2^3 = 8 possible values)
  const numColors = palette.length + 1; // +1 for transparent/empty
  
  // Calculate bits per pixel (minimum 3 bits, but could be more)
  let bitsPerPixel = 3;
  while ((1 << bitsPerPixel) < numColors) {
    bitsPerPixel++;
  }
  
  // log how many unique colors and bits per pixel needed
  console.log(`Encoding ${palette.length} unique colors with ${bitsPerPixel} bits per pixel`);
  
  // Create a map of color to index
  const colorToIndex = {};
  palette.forEach((color, index) => {
    colorToIndex[color] = index + 1; // +1 so that 0 can be used for null/transparent
  });
  
  // Encode the palette - each color is 3 bytes (RGB without the # prefix)
  let paletteBytes = '';
  for (let i = 0; i < palette.length; i++) {
    const color = palette[i];
    // Extract RGB values from the color (removing the '#')
    paletteBytes += color.substring(1);
  }
  
  // Calculate the number of bits needed for the entire grid
  const totalBits = width * height * bitsPerPixel;
  
  // Create a buffer to hold our bit-packed data
  // We'll use a string of 0s and 1s initially, then pack into bytes
  let bitString = '';
  
  // Pack the pixel data
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const color = grid2D[y][x];
      const colorIndex = color === null ? 0 : colorToIndex[color];
      
      // Convert to binary and pad to bitsPerPixel
      const bits = colorIndex.toString(2).padStart(bitsPerPixel, '0');
      bitString += bits;
    }
  }
  
  // Now convert the bit string to bytes
  const bytes = [];
  for (let i = 0; i < bitString.length; i += 8) {
    // Extract 8 bits, pad with 0s if needed
    const byte = bitString.substr(i, 8).padEnd(8, '0');
    // Convert binary to decimal
    const decimal = parseInt(byte, 2);
    // Add to our byte array
    bytes.push(decimal);
  }
  
  // Convert bytes to a binary string
  let binaryString = '';
  for (const byte of bytes) {
    binaryString += String.fromCharCode(byte);
  }

  // Construct our final format:
  // Format: [zoomLevel]:[minX]:[minY]:[width]:[height]:[bits per pixel]:[palette count]:[palette bytes]:[pixel data]
  const header = [
    z,                    // Zoom level
    minX,                 // Min X
    minY,                 // Min Y
    width,                // Width
    height,               // Height
    bitsPerPixel,         // Bits per pixel
    palette.length,       // Number of colors in palette
    paletteBytes          // Palette data (RGB values)
  ].join(':');
  
  // Combine header and binary data and encode for URL
  const encoded = header + ':' + btoa(binaryString);
  
  // Make the whole thing URL-safe with base64
  return btoa(encoded);
}

// Create a share URL from the current grid state
function createShareUrl() {
  // Get base URL (current URL without query parameters)
  const baseUrl = window.location.href.split('?')[0];
  
  // Serialize grid data to base64
  const encodedData = serializeGridToBase64();
  
  // Construct the full share URL
  return `${baseUrl}?pixels=${encodedData}`;
}

// Generate a thumbnail canvas for sharing
function generateThumbnailCanvas() {
  // Create a larger canvas for the thumbnail (256x256 is better for sharing)
  const thumbnailSize = 256;
  const thumbnailCanvas = document.createElement('canvas');
  thumbnailCanvas.width = thumbnailSize;
  thumbnailCanvas.height = thumbnailSize;
  const thumbnailCtx = thumbnailCanvas.getContext('2d');
  
  // Start with a transparent background
  thumbnailCtx.clearRect(0, 0, thumbnailSize, thumbnailSize);
  
  // If there are no pixels, create a simple default pattern
  if (grid.pixels.length === 0) {
    // Draw a simple pixel grid pattern (8x8 checkerboard)
    thumbnailCtx.fillStyle = '#ffffff';
    thumbnailCtx.fillRect(0, 0, thumbnailSize, thumbnailSize);
    
    thumbnailCtx.fillStyle = '#e8e8e8';
    const cellSize = thumbnailSize / 8;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        if ((x + y) % 2 === 0) {
          thumbnailCtx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      }
    }
    
    return thumbnailCanvas;
  }
  
  // Find the bounds of the drawing
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  
  const z = grid.currentZoomLevel;
  const activePixels = grid.pixels.filter(pixel => pixel.zoomLevel === z);
  
  for (const pixel of activePixels) {
    minX = Math.min(minX, pixel.x);
    minY = Math.min(minY, pixel.y);
    maxX = Math.max(maxX, pixel.x);
    maxY = Math.max(maxY, pixel.y);
  }
  
  // Adjust if no pixels are found (handle empty grid gracefully)
  if (minX === Infinity) {
    return thumbnailCanvas;
  }
  
  // Calculate the dimensions of the drawing
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  
  // Determine scale factor to fit the drawing in the thumbnail
  const scaleX = thumbnailSize / width;
  const scaleY = thumbnailSize / height;
  const scale = Math.min(scaleX, scaleY);
  
  // Center the drawing in the thumbnail
  const offsetX = (thumbnailSize - width * scale) / 2;
  const offsetY = (thumbnailSize - height * scale) / 2;
  
  // Draw grid if there's enough space (only if pixels are large enough)
  if (scale > 4) {
    // First draw a white background
    thumbnailCtx.fillStyle = '#ffffff';
    thumbnailCtx.fillRect(0, 0, thumbnailSize, thumbnailSize);
    
    // Draw grid lines
    thumbnailCtx.strokeStyle = '#f0f0f0';
    thumbnailCtx.lineWidth = 0.5;
    
    // Vertical grid lines
    for (let x = 0; x <= width; x++) {
      thumbnailCtx.beginPath();
      thumbnailCtx.moveTo(offsetX + x * scale, offsetY);
      thumbnailCtx.lineTo(offsetX + x * scale, offsetY + height * scale);
      thumbnailCtx.stroke();
    }
    
    // Horizontal grid lines
    for (let y = 0; y <= height; y++) {
      thumbnailCtx.beginPath();
      thumbnailCtx.moveTo(offsetX, offsetY + y * scale);
      thumbnailCtx.lineTo(offsetX + width * scale, offsetY + y * scale);
      thumbnailCtx.stroke();
    }
  } else {
    // For smaller pixels, just use a transparent background
    thumbnailCtx.clearRect(0, 0, thumbnailSize, thumbnailSize);
  }
  
  // Draw each pixel from the grid
  for (const pixel of activePixels) {
    const x = (pixel.x - minX) * scale + offsetX;
    const y = (pixel.y - minY) * scale + offsetY;
    const pixelSize = Math.max(1, scale); // Ensure at least 1px size
    
    thumbnailCtx.fillStyle = pixel.color;
    thumbnailCtx.fillRect(x, y, pixelSize, pixelSize);
  }
  
  return thumbnailCanvas;
}

// Generate a thumbnail as data URL
function generateThumbnail() {
  const canvas = generateThumbnailCanvas();
  const dataUrl = canvas.toDataURL('image/png');
  console.log('Generated data URL length:', dataUrl.length);
  return dataUrl;
}

// Debug function to help verify if the thumbnail is being generated correctly
function debugThumbnail() {
  const canvas = generateThumbnailCanvas();
  const dataURL = canvas.toDataURL('image/png');
  console.log('DEBUG - Thumbnail data URL length:', dataURL.length);
  console.log('DEBUG - First 100 chars of thumbnail:', dataURL.substring(0, 100));
  
  // Create a test element to verify the thumbnail works
  const testImg = document.createElement('img');
  testImg.src = dataURL;
  testImg.style.position = 'fixed';
  testImg.style.top = '10px';
  testImg.style.right = '10px';
  testImg.style.width = '50px';
  testImg.style.height = '50px';
  testImg.style.border = '1px solid black';
  testImg.style.zIndex = '9999';
  testImg.style.background = 'white';
  testImg.title = 'Debug Thumbnail';
  
  testImg.onload = () => { 
    console.log('DEBUG - Test thumbnail loaded successfully');
    // Remove after 3 seconds
    setTimeout(() => {
      if (testImg.parentNode) {
        testImg.parentNode.removeChild(testImg);
      }
    }, 3000);
  };
  
  testImg.onerror = (e) => {
    console.error('DEBUG - Test thumbnail failed to load:', e);
    testImg.style.background = 'red';
    testImg.style.color = 'white';
    testImg.textContent = 'Error';
  };
  
  document.body.appendChild(testImg);
}

// Try to load grid state from URL parameter or hash if present
function loadGridFromUrl() {
  // First try to get data from URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const pixelsParam = urlParams.get('pixels');
  
  // Then try to get from hash if parameter is not present (backward compatibility)
  const hashData = window.location.hash ? window.location.hash.substring(1) : null;
  
  // Use parameter data if available, otherwise use hash data if available
  const base64String = pixelsParam || hashData;
  
  // Check if we have data from either source
  if (base64String) {
    try {
      // Decode using our bit-packed format
      return loadGridFromBitPackedFormat(base64String);
    } catch (error) {
      console.error('Failed to load grid from URL:', error);
    }
  }
  
  return false;
}

// Generate a favicon from the pixel grid
function generateFavicon() {
  // Create a small canvas for the favicon (16x16 pixels is standard)
  const faviconSize = 16;
  const faviconCanvas = document.createElement('canvas');
  faviconCanvas.width = faviconSize;
  faviconCanvas.height = faviconSize;
  const faviconCtx = faviconCanvas.getContext('2d');
  
  // Start with a transparent background
  faviconCtx.clearRect(0, 0, faviconSize, faviconSize);
  
  // If there are no pixels, create a simple default icon
  if (grid.pixels.length === 0) {
    // Draw a simple pixel grid pattern
    faviconCtx.fillStyle = '#e8e8e8';
    faviconCtx.fillRect(0, 0, faviconSize, faviconSize);
    
    faviconCtx.fillStyle = '#666666';
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        if ((x + y) % 2 === 0) {
          faviconCtx.fillRect(x * 4, y * 4, 4, 4);
        }
      }
    }
  } else {
    // Find the bounds of the drawing
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    const z = grid.currentZoomLevel;
    const activePixels = grid.pixels.filter(pixel => pixel.zoomLevel === z);
    
    for (const pixel of activePixels) {
      minX = Math.min(minX, pixel.x);
      minY = Math.min(minY, pixel.y);
      maxX = Math.max(maxX, pixel.x);
      maxY = Math.max(maxY, pixel.y);
    }
    
    // Adjust if no pixels are found (handle empty grid gracefully)
    if (minX === Infinity) {
      return createDefaultFavicon();
    }
    
    // Calculate the dimensions of the drawing
    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    
    // Determine scale factor to fit the drawing in the favicon
    const scaleX = faviconSize / width;
    const scaleY = faviconSize / height;
    const scale = Math.min(scaleX, scaleY);
    
    // Center the drawing in the favicon
    const offsetX = (faviconSize - width * scale) / 2;
    const offsetY = (faviconSize - height * scale) / 2;
    
    // Fill with a background color
    faviconCtx.fillStyle = '#f5f5f5';
    faviconCtx.fillRect(0, 0, faviconSize, faviconSize);
    
    // Draw each pixel from the grid
    for (const pixel of activePixels) {
      const x = (pixel.x - minX) * scale + offsetX;
      const y = (pixel.y - minY) * scale + offsetY;
      const size = Math.max(1, scale); // Ensure at least 1px size
      
      faviconCtx.fillStyle = pixel.color;
      faviconCtx.fillRect(x, y, size, size);
    }
  }
  
  // Convert the canvas to a data URL and update the favicon
  const dataUrl = faviconCanvas.toDataURL('image/png');
  updateFavicon(dataUrl);
  
  return dataUrl;
}

// Create a default favicon when no drawing exists
function createDefaultFavicon() {
  const faviconSize = 16;
  const faviconCanvas = document.createElement('canvas');
  faviconCanvas.width = faviconSize;
  faviconCanvas.height = faviconSize;
  const faviconCtx = faviconCanvas.getContext('2d');
  
  // Draw a simple pixel grid pattern
  faviconCtx.fillStyle = '#e8e8e8';
  faviconCtx.fillRect(0, 0, faviconSize, faviconSize);
  
  faviconCtx.fillStyle = '#666666';
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      if ((x + y) % 2 === 0) {
        faviconCtx.fillRect(x * 4, y * 4, 4, 4);
      }
    }
  }
  
  const dataUrl = faviconCanvas.toDataURL('image/png');
  updateFavicon(dataUrl);
  
  return dataUrl;
}

// Update the favicon in the document
function updateFavicon(dataUrl) {
  // Look for existing favicon
  let link = document.querySelector('link[rel="icon"]') || 
             document.querySelector('link[rel="shortcut icon"]');
  
  // If not found, create a new link element
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  
  // Update the href attribute with the new data URL
  link.href = dataUrl;
  
  // Also update apple-touch-icon for iOS devices
  let appleLink = document.querySelector('link[rel="apple-touch-icon"]');
  if (!appleLink) {
    appleLink = document.createElement('link');
    appleLink.rel = 'apple-touch-icon';
    document.head.appendChild(appleLink);
  }
  appleLink.href = dataUrl;
}

// Update meta tags for social media sharing
function updateMetaTags(thumbnailUrl, shareUrl) {
  // Define the meta tags to add or update
  const metaTags = [
    // Open Graph image (Facebook)
    { property: 'og:image', content: thumbnailUrl },
    { property: 'og:url', content: shareUrl },
    // Twitter image
    { property: 'twitter:image', content: thumbnailUrl },
    { property: 'twitter:url', content: shareUrl }
  ];
  
  // Description text based on pixel count
  const pixelCount = grid.pixels.filter(pixel => pixel.zoomLevel === grid.currentZoomLevel).length;
  const description = pixelCount > 0 
    ? `Pixel art creation with ${pixelCount} pixels. Check it out and create your own!`
    : 'Create, edit, and share your pixel art creations with this simple web-based editor.';
  
  // Update description meta tags
  const descriptionMetaTags = [
    { name: 'description', content: description },
    { property: 'og:description', content: description },
    { property: 'twitter:description', content: description }
  ];
  
  // Add or update all meta tags
  [...metaTags, ...descriptionMetaTags].forEach(meta => {
    // Look for existing meta tag
    let metaTag = null;
    
    if (meta.property) {
      metaTag = document.querySelector(`meta[property="${meta.property}"]`);
    } else if (meta.name) {
      metaTag = document.querySelector(`meta[name="${meta.name}"]`);
    }
    
    // If not found, create a new meta tag
    if (!metaTag) {
      metaTag = document.createElement('meta');
      if (meta.property) metaTag.setAttribute('property', meta.property);
      if (meta.name) metaTag.setAttribute('name', meta.name);
      document.head.appendChild(metaTag);
    }
    
    // Update the content attribute
    metaTag.setAttribute('content', meta.content);
  });
}

// Load grid from our bit-packed format
function loadGridFromBitPackedFormat(base64String) {
  try {
    // Double base64 decode (first the outer wrapper, then the inner data)
    const outerDecoded = atob(base64String);
    
    // Check for minimal format (just zoom level)
    if (outerDecoded.startsWith('z') && !outerDecoded.includes(':')) {
      const zoomLevel = parseInt(outerDecoded.substring(1), 10);
      if (isNaN(zoomLevel)) {
        throw new Error('Invalid zoom level');
      }
      
      // Create a new empty grid with the specified zoom level
      const newGrid = new PixelGrid();
      newGrid.currentZoomLevel = zoomLevel;
      grid = newGrid;
      render();
      // Generate favicon
      generateFavicon();
      return true;
    }
    
    // Parse the header parts
    // Format: [zoomLevel]:[minX]:[minY]:[width]:[height]:[bits per pixel]:[palette count]:[palette bytes]:[pixel data]
    const parts = outerDecoded.split(':');
    if (parts.length < 9) {
      throw new Error('Invalid bit-packed format');
    }
    
    // Parse header values
    const zoomLevel = parseInt(parts[0], 10);
    const minX = parseInt(parts[1], 10);
    const minY = parseInt(parts[2], 10);
    const width = parseInt(parts[3], 10);
    const height = parseInt(parts[4], 10);
    const bitsPerPixel = parseInt(parts[5], 10);
    const paletteCount = parseInt(parts[6], 10);
    const paletteBytes = parts[7];
    
    // Binary data is the last part, base64 encoded
    const binaryData = atob(parts[8]);
    
    // Check that all values are valid
    if ([zoomLevel, minX, minY, width, height, bitsPerPixel, paletteCount].some(isNaN)) {
      throw new Error('Invalid values in bit-packed format');
    }
    
    // Reconstruct the color palette
    const palette = [];
    for (let i = 0; i < paletteCount; i++) {
      // Each color is 6 hex characters (3 bytes)
      const start = i * 6;
      if (start + 6 <= paletteBytes.length) {
        const hexColor = paletteBytes.substring(start, start + 6);
        palette.push(`#${hexColor}`);
      }
    }
    
    // Create a new grid
    const newGrid = new PixelGrid();
    newGrid.currentZoomLevel = zoomLevel;
    
    // Convert binary string to byte array
    const bytes = [];
    for (let i = 0; i < binaryData.length; i++) {
      bytes.push(binaryData.charCodeAt(i));
    }
    
    // Convert byte array to bit string
    let bitString = '';
    for (const byte of bytes) {
      bitString += byte.toString(2).padStart(8, '0');
    }
    
    // Process the bits to extract pixel colors
    // We process in groups of bitsPerPixel bits
    let bitIndex = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Extract bitsPerPixel bits
        if (bitIndex + bitsPerPixel <= bitString.length) {
          const colorBits = bitString.substring(bitIndex, bitIndex + bitsPerPixel);
          bitIndex += bitsPerPixel;
          
          // Convert bits to color index
          const colorIndex = parseInt(colorBits, 2);
          
          // Color index 0 means no color (transparent)
          if (colorIndex > 0 && colorIndex - 1 < palette.length) {
            const color = palette[colorIndex - 1];
            const pixelX = minX + x;
            const pixelY = minY + y;
            
            newGrid.pixels.push(new Pixel(pixelX, pixelY, zoomLevel, color));
          }
        }
      }
    }
    
    // Replace current grid
    grid = newGrid;
    render();
    // Generate favicon
    generateFavicon();
    return true;
  } catch (error) {
    console.error('Error in bit-packed format decoding:', error);
    throw error; // Re-throw to try other formats
  }
}


// Handle tool button clicks
function handleToolClick(toolId) {
  switch(toolId) {
    case 'undo':
      if (grid.undo()) {
        render();
        generateFavicon();
      }
      break;
    case 'redo':
      if (grid.redo()) {
        render();
        generateFavicon();
      }
      break;
    case 'zoomIn':
      zoomIn();
      break;
    case 'zoomOut':
      zoomOut();
      break;
    case 'mode':
      // Cycle through drawing modes (blend, overwrite, erase)
      currentModeIndex = (currentModeIndex + 1) % MODES.length;
      // Update isEraseMode for backward compatibility
      isEraseMode = MODES[currentModeIndex] === 'erase';
      render();
      break;
    case 'tool':
      // Cycle through drawing tools
      currentToolIndex = (currentToolIndex + 1) % TOOLS.length;
      render();
      break;
    case 'new':
      grid = new PixelGrid();
      render();
      createDefaultFavicon();
      break;
    case 'share':
      // Generate share URL
      const shareUrl = createShareUrl();
      
      // Store the original share icon
      const originalShareIcon = TOOL_ICONS['share'];
      
      // Show copy confirmation by replacing the share icon with a checkmark
      const showCopyConfirmation = () => {
        TOOL_ICONS['share'] = CHECKMARK_ICON;
        render(); // Re-render with checkmark
        
        // Reset to original icon after 500ms
        setTimeout(() => {
          TOOL_ICONS['share'] = originalShareIcon;
          render(); // Re-render with original icon
        }, 500);
      };
      
      // Run debug function to verify thumbnail generation is working
      debugThumbnail();
      
      // Generate a thumbnail image for sharing
      const thumbnailCanvas = generateThumbnailCanvas();
      
      // Convert canvas directly to data URL (more reliable than blob URL)
      const thumbnailUrl = thumbnailCanvas.toDataURL('image/png');
      console.log('Generated thumbnail data URL (length):', thumbnailUrl.length);
      
      // Log first few characters to verify it's a valid data URL
      console.log('Thumbnail URL starts with:', thumbnailUrl.substring(0, 30));
      
      // Update meta tags with the thumbnail for better social sharing
      updateMetaTags(thumbnailUrl, shareUrl);
      
      // Convert to blob for sharing via Web Share API
      thumbnailCanvas.toBlob(blob => {
        // Create a file from the thumbnail for sharing
        const thumbnailFile = new File([blob], 'pixels-artwork.png', { type: 'image/png' });
        console.log('Thumbnail file created directly from blob');
        
        // Share data for Web Share API with the thumbnail
        const shareData = {
          url: shareUrl
        };
        
        // Try to include the file if the browser supports it
        try {
          // Add the file to the share data if files are supported
          if (navigator.canShare && navigator.canShare({ files: [thumbnailFile] })) {
            console.log('adding file');
            shareData.files = [thumbnailFile];
          }
        } catch (e) {
          console.log('File sharing not supported', e);
        }
        
        // Try to use the Web Share API first if available (works well on mobile)
        if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
          navigator.share(shareData)
            .then(() => {
              showCopyConfirmation();
            })
            .catch((error) => {
              console.log('Share API error:', error);
              // If sharing fails, fallback to clipboard
              navigator.clipboard.writeText(shareUrl)
                .then(() => {
                  showCopyConfirmation();
                })
                .catch((clipError) => {
                  console.error('Error copying to clipboard:', clipError);
                  // Nothing to clean up with data URLs
                });
            });
        } else {
            // Create a visual popup with the thumbnail for non-mobile browsers
            const popup = document.createElement('div');
            popup.style.position = 'fixed';
            popup.style.top = '50%';
            popup.style.left = '50%';
            popup.style.transform = 'translate(-50%, -50%)';
            popup.style.backgroundColor = 'white';
            popup.style.padding = '20px';
            popup.style.borderRadius = '8px';
            popup.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            popup.style.zIndex = '1000';
            popup.style.textAlign = 'center';
            popup.style.maxWidth = '90%';
            
            // Create a container just for the thumbnail (to aid debugging)
            const thumbnailContainer = document.createElement('div');
            thumbnailContainer.style.width = '200px';
            thumbnailContainer.style.height = '200px';
            thumbnailContainer.style.margin = '0 auto 20px auto';
            thumbnailContainer.style.border = '2px solid #333';
            thumbnailContainer.style.borderRadius = '4px';
            thumbnailContainer.style.overflow = 'hidden';
            thumbnailContainer.style.backgroundColor = '#f0f0f0';
            thumbnailContainer.style.display = 'flex';
            thumbnailContainer.style.alignItems = 'center';
            thumbnailContainer.style.justifyContent = 'center';
            popup.appendChild(thumbnailContainer);
            
            // Create and add the image directly to the container
            const img = document.createElement('img');
            img.style.maxWidth = '100%';
            img.style.maxHeight = '100%';
            img.style.display = 'block';
            img.style.objectFit = 'contain'; // Ensure aspect ratio is maintained
            
            // Add the image directly - no need for placeholders with data URLs
            thumbnailContainer.appendChild(img);
            img.src = thumbnailUrl;
            
            // Add debugging text
            const debugText = document.createElement('div');
            debugText.textContent = `Image loaded from data URL (${thumbnailUrl.length} chars)`;
            debugText.style.fontSize = '10px';
            debugText.style.color = '#666';
            debugText.style.marginBottom = '10px';
            debugText.style.marginTop = '-15px';
            popup.appendChild(debugText);
            
            // Add event handlers for image load/error
            img.onload = () => {
                console.log('Thumbnail image loaded successfully in popup');
                debugText.textContent += ' ✓';
                debugText.style.color = 'green';
            };
            
            img.onerror = (e) => {
                console.error('Error loading thumbnail in popup:', e);
                thumbnailContainer.innerHTML = 'Error loading thumbnail';
                thumbnailContainer.style.color = 'red';
                debugText.textContent += ' ✗';
                debugText.style.color = 'red';
            };
            
            // Add share URL input
            const input = document.createElement('input');
            input.value = shareUrl;
            input.readOnly = true;
            input.style.width = '100%';
            input.style.padding = '8px';
            input.style.marginBottom = '15px';
            input.style.borderRadius = '4px';
            input.style.border = '1px solid #ccc';
            popup.appendChild(input);
            
            // Add copy button
            const copyBtn = document.createElement('button');
            copyBtn.textContent = 'Copy Link';
            copyBtn.style.padding = '8px 16px';
            copyBtn.style.backgroundColor = '#4a90e2';
            copyBtn.style.color = 'white';
            copyBtn.style.border = 'none';
            copyBtn.style.borderRadius = '4px';
            copyBtn.style.cursor = 'pointer';
            copyBtn.style.marginRight = '10px';
            copyBtn.onclick = () => {
              input.select();
              document.execCommand('copy');
              navigator.clipboard.writeText(shareUrl)
                .then(() => {
                  copyBtn.textContent = 'Copied!';
                  setTimeout(() => {
                    document.body.removeChild(popup);
                    showCopyConfirmation();
                  }, 1000);
                })
                .catch(err => {
                  console.error('Failed to copy: ', err);
                });
            };
            popup.appendChild(copyBtn);
            
            // Add close button
            const closeBtn = document.createElement('button');
            closeBtn.textContent = 'Close';
            closeBtn.style.padding = '8px 16px';
            closeBtn.style.backgroundColor = '#e0e0e0';
            closeBtn.style.color = '#333';
            closeBtn.style.border = 'none';
            closeBtn.style.borderRadius = '4px';
            closeBtn.style.cursor = 'pointer';
            closeBtn.onclick = () => {
              document.body.removeChild(popup);
            };
            popup.appendChild(closeBtn);
            
            // Add popup to the body
            document.body.appendChild(popup);
            
            // Auto-select the input field for easy copying
            input.select();
          }
        })
        .catch(error => {
          console.error('Error creating thumbnail file:', error);
          
          // Data URLs don't need to be revoked - no cleanup needed
          
          // Fallback to basic clipboard copy if there's an error
          navigator.clipboard.writeText(shareUrl)
            .then(() => {
              showCopyConfirmation();
            })
            .catch((clipError) => {
              console.error('Error copying to clipboard:', clipError);
            });
        });
      break;
  }
}

// Scroll event for desktop
function handleWheel(e) {
  e.preventDefault();
  viewportX += e.deltaX;
  viewportY += e.deltaY;
  render();
}

// Prevent context menu on right-click
function handleContextMenu(e) {
  e.preventDefault();
  return false;
}

// Setup event listeners
canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
canvas.addEventListener('mousedown', handleMouseDown);
canvas.addEventListener('mousemove', handleMouseMove);
canvas.addEventListener('mouseup', handleMouseUp);
canvas.addEventListener('mouseleave', handleMouseUp);
canvas.addEventListener('wheel', handleWheel, { passive: false });
canvas.addEventListener('contextmenu', handleContextMenu);
window.addEventListener('resize', resizeCanvas);

// Initial setup
calculatePaletteSize(); // Initial calculation of palette dimensions
resizeCanvas();

// Check if there's data in the URL hash and load it
if (!loadGridFromUrl()) {
  // If no URL data or loading failed, just render with the default grid
  render();
  // Generate default favicon
  createDefaultFavicon();
}