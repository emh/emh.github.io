const canvas = document.getElementById('app');
const ctx = canvas.getContext('2d');

// Game settings
let gridSize = 20; // Size of each grid cell in pixels (will be adjusted)
let playerX = 0; // Player position in grid coordinates (not pixels)
let playerY = 0;
const moveSpeed = 500; // Time in ms to move one grid cell
let lastMoveTime = 0; // Last time the player moved
let directionX = 0; // Current movement direction (-1, 0, 1)
let directionY = 0; // Current movement direction (-1, 0, 1)
let moving = false; // Whether the player is currently moving
let boxes = []; // Array of box positions: {x, y}
let treasures = []; // Array of treasure positions: {x, y}
let score = 0; // Player's score
let moveCount = 0; // Number of moves made
let roomsVisited = 1; // Number of rooms visited (starting room counts as 1)
let gameOver = false; // Whether the game is over
let showWelcomeScreen = true; // Show welcome screen on first load

// UI settings
const headerHeight = 40; // Height of the header in pixels

// Enemy settings
let enemies = []; // Array of enemy objects: {x, y, lastMoveTime}
const enemyMoveSpeed = 800; // Time in ms for enemy to move one grid cell
const enemySpawnDelay = 5000; // Wait 5 seconds before spawning first enemy
const enemySpawnInterval = 15000; // Spawn a new enemy every 15 seconds
let lastEnemySpawnTime = 0; // Tracks the last time an enemy was spawned
let gameStartTime = 0; // When the game started
let gameActive = false; // Whether the game has started

// Room generation settings
let currentRoom = null;
let gridWidth = 0;
let gridHeight = 0;
let prevExitDirection = null; // Tracks which direction the player entered from

// Touch handling variables
let touchStartX = 0;
let touchStartY = 0;
const minSwipeDistance = 30; // Minimum swipe distance to detect a direction

// Find the greatest common divisor
function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

// Calculate the best grid size that evenly divides screen dimensions
function calculateGridSize(width, height) {
  // Get GCD of width and height
  const divisor = gcd(width, height);
  
  // Target grid size around 20px
  const targetSize = 20;
  
  // Find factors of the GCD that are close to the target size
  let bestFactor = 1;
  let bestDifference = Infinity;
  
  for (let i = 1; i <= Math.sqrt(divisor); i++) {
    if (divisor % i === 0) {
      // Check the factor
      const difference = Math.abs(i - targetSize);
      if (difference < bestDifference) {
        bestFactor = i;
        bestDifference = difference;
      }
      
      // Check the paired factor
      const pairedFactor = divisor / i;
      const pairedDifference = Math.abs(pairedFactor - targetSize);
      if (pairedDifference < bestDifference) {
        bestFactor = pairedFactor;
        bestDifference = pairedDifference;
      }
    }
  }
  
  // Ensure the grid size is between 15-25px
  return Math.max(15, Math.min(25, bestFactor));
}

// Set canvas dimensions to match window size
function resizeCanvas() {
  // Calculate available space with margins
  const topMargin = 0;
  // Add bottom margin to account for mobile browser footer areas
  const bottomMargin = 0;
  const sideMargin = 0;
  
  const availableWidth = window.innerWidth - (sideMargin * 2);
  const availableHeight = window.innerHeight - topMargin - bottomMargin - headerHeight;
  
  // Find a grid size that divides evenly into both dimensions
  gridSize = calculateGridSize(availableWidth, availableHeight);
  
  // Calculate grid dimensions
  gridWidth = Math.floor(availableWidth / gridSize);
  gridHeight = Math.floor(availableHeight / gridSize);
  
  // Set canvas size to match exact grid dimensions plus header
  canvas.width = gridWidth * gridSize;
  canvas.height = gridHeight * gridSize + headerHeight;
  
  // Position canvas with margin at top to avoid browser chrome
  canvas.style.position = 'absolute';
  canvas.style.top = `${topMargin}px`;
  canvas.style.left = `${sideMargin}px`;
  
  // Generate initial room
  if (!currentRoom) {
    currentRoom = generateRoom();
    // Place the player in the center of the main room
    playerX = Math.floor(gridWidth / 2);
    playerY = Math.floor(gridHeight / 2);
    // Generate boxes and treasures in the room
    generateBoxes();
    generateTreasures();
    // Reset game stats
    score = 0;
    moveCount = 0;
    roomsVisited = 1;
    gameOver = false;
  }
}

// Create a new room layout - revised algorithm with improved corridor connections
function generateRoom(enteringFrom = null, entrancePos = null) {
  // Room is represented as a 2D grid
  // 0 = empty space, 1 = wall, 2 = exit (for tracking purposes)
  const room = Array(gridHeight).fill().map(() => Array(gridWidth).fill(1)); // Start with all walls
  
  // Track all created rooms and exits
  const rooms = [];
  const exits = [];
  
  // Define sizing parameters
  const padding = 2; // Space between rooms and borders
  const roomMinSize = 5; // Minimum room dimension
  const roomMaxSize = Math.min(Math.floor(gridWidth * 0.4), Math.floor(gridHeight * 0.4));
  
  // Create main central room first
  const mainRoomWidth = Math.floor(Math.random() * (roomMaxSize - roomMinSize)) + roomMinSize;
  const mainRoomHeight = Math.floor(Math.random() * (roomMaxSize - roomMinSize)) + roomMinSize;
  const mainRoomX = Math.floor((gridWidth - mainRoomWidth) / 2);
  const mainRoomY = Math.floor((gridHeight - mainRoomHeight) / 2);
  
  const mainRoom = {
    x: mainRoomX,
    y: mainRoomY,
    width: mainRoomWidth,
    height: mainRoomHeight,
    isMain: true
  };
  
  rooms.push(mainRoom);
  
  // Carve out main room
  for (let y = mainRoomY; y < mainRoomY + mainRoomHeight; y++) {
    for (let x = mainRoomX; x < mainRoomX + mainRoomWidth; x++) {
      room[y][x] = 0;
    }
  }
  
  // Create entrance first if specified
  if (enteringFrom && entrancePos !== null) {
    let entranceX, entranceY;
    let entranceConnected = false;
    
    // Store a reference to track if we've successfully connected to the main room
    let connectedToRoom = false;
    
    switch(enteringFrom) {
      case 'north':
        entranceX = entrancePos;
        entranceY = 0;
        
        // Ensure the entrance connects to the main room
        // Check if the entrance aligns with the main room
        if (entranceX >= mainRoomX && entranceX < mainRoomX + mainRoomWidth) {
          // Entrance aligns directly with main room, create straight corridor
          for (let y = 0; y <= mainRoomY; y++) {
            room[y][entranceX] = 0;
          }
          connectedToRoom = true;
        } else {
          // Create corridor from entrance to nearest point of main room
          // First create vertical part to align with main room's Y
          for (let y = 0; y <= mainRoomY; y++) {
            room[y][entranceX] = 0;
          }
          
          // Then create horizontal part to connect to main room
          const targetX = Math.max(mainRoomX, Math.min(mainRoomX + mainRoomWidth - 1, entranceX));
          const corridorY = mainRoomY;
          
          // Create horizontal part to connect to main room
          for (let x = Math.min(entranceX, targetX); x <= Math.max(entranceX, targetX); x++) {
            room[corridorY][x] = 0;
          }
          connectedToRoom = true;
        }
        
        exits.push({ x: entranceX, y: entranceY, direction: 'north' });
        break;
        
      case 'south':
        entranceX = entrancePos;
        entranceY = gridHeight - 1;
        
        // Check if entrance aligns with main room
        if (entranceX >= mainRoomX && entranceX < mainRoomX + mainRoomWidth) {
          // Entrance aligns with main room, create straight corridor
          for (let y = gridHeight - 1; y >= mainRoomY + mainRoomHeight - 1; y--) {
            room[y][entranceX] = 0;
          }
          connectedToRoom = true;
        } else {
          // Create corridor from entrance to nearest point of main room
          // First create vertical part
          for (let y = gridHeight - 1; y >= mainRoomY + mainRoomHeight - 1; y--) {
            room[y][entranceX] = 0;
          }
          
          // Then create horizontal part to connect to main room
          const targetX = Math.max(mainRoomX, Math.min(mainRoomX + mainRoomWidth - 1, entranceX));
          const corridorY = mainRoomY + mainRoomHeight - 1;
          
          // Create horizontal connection
          for (let x = Math.min(entranceX, targetX); x <= Math.max(entranceX, targetX); x++) {
            room[corridorY][x] = 0;
          }
          connectedToRoom = true;
        }
        
        exits.push({ x: entranceX, y: entranceY, direction: 'south' });
        break;
        
      case 'east':
        entranceX = gridWidth - 1;
        entranceY = entrancePos;
        
        // Check if entrance aligns with main room
        if (entranceY >= mainRoomY && entranceY < mainRoomY + mainRoomHeight) {
          // Entrance aligns with main room, create straight corridor
          for (let x = gridWidth - 1; x >= mainRoomX + mainRoomWidth - 1; x--) {
            room[entranceY][x] = 0;
          }
          connectedToRoom = true;
        } else {
          // Create corridor from entrance to nearest point of main room
          // First create horizontal part
          for (let x = gridWidth - 1; x >= mainRoomX + mainRoomWidth - 1; x--) {
            room[entranceY][x] = 0;
          }
          
          // Then create vertical part to connect to main room
          const targetY = Math.max(mainRoomY, Math.min(mainRoomY + mainRoomHeight - 1, entranceY));
          const corridorX = mainRoomX + mainRoomWidth - 1;
          
          // Create vertical connection
          for (let y = Math.min(entranceY, targetY); y <= Math.max(entranceY, targetY); y++) {
            room[y][corridorX] = 0;
          }
          connectedToRoom = true;
        }
        
        exits.push({ x: entranceX, y: entranceY, direction: 'east' });
        break;
        
      case 'west':
        entranceX = 0;
        entranceY = entrancePos;
        
        // Check if entrance aligns with main room
        if (entranceY >= mainRoomY && entranceY < mainRoomY + mainRoomHeight) {
          // Entrance aligns with main room, create straight corridor
          for (let x = 0; x <= mainRoomX; x++) {
            room[entranceY][x] = 0;
          }
          connectedToRoom = true;
        } else {
          // Create corridor from entrance to nearest point of main room
          // First create horizontal part
          for (let x = 0; x <= mainRoomX; x++) {
            room[entranceY][x] = 0;
          }
          
          // Then create vertical part to connect to main room
          const targetY = Math.max(mainRoomY, Math.min(mainRoomY + mainRoomHeight - 1, entranceY));
          const corridorX = mainRoomX;
          
          // Create vertical connection
          for (let y = Math.min(entranceY, targetY); y <= Math.max(entranceY, targetY); y++) {
            room[y][corridorX] = 0;
          }
          connectedToRoom = true;
        }
        
        exits.push({ x: entranceX, y: entranceY, direction: 'west' });
        break;
    }
    
    // Verify that our entrance is connected to a room
    if (!connectedToRoom) {
      console.error("Failed to connect entrance to room");
    }
  }
  
  // Define the quadrants for room placement
  const quadrants = [
    { name: 'north', offsetX: 0, offsetY: -1 },
    { name: 'south', offsetX: 0, offsetY: 1 },
    { name: 'east', offsetX: 1, offsetY: 0 },
    { name: 'west', offsetX: -1, offsetY: 0 }
  ];
  
  // Shuffle the quadrants for variety
  for (let i = quadrants.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [quadrants[i], quadrants[j]] = [quadrants[j], quadrants[i]];
  }
  
  // Create secondary rooms in each quadrant
  for (const quadrant of quadrants) {
    // Skip if this is where we entered from (already handled)
    if (quadrant.name === enteringFrom) continue;
    
    let roomX, roomY, roomWidth, roomHeight, exitX, exitY;
    
    // Determine room position based on quadrant
    switch(quadrant.name) {
      case 'north':
        roomWidth = Math.floor(Math.random() * (roomMaxSize - roomMinSize)) + roomMinSize;
        roomHeight = Math.floor(Math.random() * (roomMaxSize - roomMinSize)) + roomMinSize;
        roomX = Math.floor(Math.random() * (gridWidth - roomWidth - 2 * padding)) + padding;
        roomY = padding;
        exitX = roomX + Math.floor(roomWidth / 2);
        exitY = 0;
        break;
        
      case 'south':
        roomWidth = Math.floor(Math.random() * (roomMaxSize - roomMinSize)) + roomMinSize;
        roomHeight = Math.floor(Math.random() * (roomMaxSize - roomMinSize)) + roomMinSize;
        roomX = Math.floor(Math.random() * (gridWidth - roomWidth - 2 * padding)) + padding;
        roomY = gridHeight - roomHeight - padding;
        exitX = roomX + Math.floor(roomWidth / 2);
        exitY = gridHeight - 1;
        break;
        
      case 'east':
        roomWidth = Math.floor(Math.random() * (roomMaxSize - roomMinSize)) + roomMinSize;
        roomHeight = Math.floor(Math.random() * (roomMaxSize - roomMinSize)) + roomMinSize;
        roomX = gridWidth - roomWidth - padding;
        roomY = Math.floor(Math.random() * (gridHeight - roomHeight - 2 * padding)) + padding;
        exitX = gridWidth - 1;
        exitY = roomY + Math.floor(roomHeight / 2);
        break;
        
      case 'west':
        roomWidth = Math.floor(Math.random() * (roomMaxSize - roomMinSize)) + roomMinSize;
        roomHeight = Math.floor(Math.random() * (roomMaxSize - roomMinSize)) + roomMinSize;
        roomX = padding;
        roomY = Math.floor(Math.random() * (gridHeight - roomHeight - 2 * padding)) + padding;
        exitX = 0;
        exitY = roomY + Math.floor(roomHeight / 2);
        break;
    }
    
    // Add room to list
    rooms.push({
      x: roomX,
      y: roomY,
      width: roomWidth,
      height: roomHeight,
      isMain: false,
      quadrant: quadrant.name
    });
    
    // Carve out secondary room
    for (let y = roomY; y < roomY + roomHeight; y++) {
      for (let x = roomX; x < roomX + roomWidth; x++) {
        room[y][x] = 0;
      }
    }
    
    // Create exit path from room to edge of screen
    switch(quadrant.name) {
      case 'north':
        // Ensure the exit path is within the room
        if (exitX >= roomX && exitX < roomX + roomWidth) {
          for (let y = 0; y <= roomY; y++) {
            room[y][exitX] = 0;
          }
        } else {
          // Adjust exitX to be within room
          exitX = roomX + Math.floor(roomWidth / 2);
          for (let y = 0; y <= roomY; y++) {
            room[y][exitX] = 0;
          }
        }
        break;
      case 'south':
        // Ensure the exit path is within the room
        if (exitX >= roomX && exitX < roomX + roomWidth) {
          for (let y = roomY + roomHeight - 1; y < gridHeight; y++) {
            room[y][exitX] = 0;
          }
        } else {
          // Adjust exitX to be within room
          exitX = roomX + Math.floor(roomWidth / 2);
          for (let y = roomY + roomHeight - 1; y < gridHeight; y++) {
            room[y][exitX] = 0;
          }
        }
        break;
      case 'east':
        // Ensure the exit path is within the room
        if (exitY >= roomY && exitY < roomY + roomHeight) {
          for (let x = roomX + roomWidth - 1; x < gridWidth; x++) {
            room[exitY][x] = 0;
          }
        } else {
          // Adjust exitY to be within room
          exitY = roomY + Math.floor(roomHeight / 2);
          for (let x = roomX + roomWidth - 1; x < gridWidth; x++) {
            room[exitY][x] = 0;
          }
        }
        break;
      case 'west':
        // Ensure the exit path is within the room
        if (exitY >= roomY && exitY < roomY + roomHeight) {
          for (let x = 0; x <= roomX; x++) {
            room[exitY][x] = 0;
          }
        } else {
          // Adjust exitY to be within room
          exitY = roomY + Math.floor(roomHeight / 2);
          for (let x = 0; x <= roomX; x++) {
            room[exitY][x] = 0;
          }
        }
        break;
    }
    
    // Add exit to list
    exits.push({ x: exitX, y: exitY, direction: quadrant.name });
  }
  
  // Connect all rooms to main room with corridors
  for (let i = 1; i < rooms.length; i++) {
    const secondaryRoom = rooms[i];
    const mainRoom = rooms[0];
    
    // Calculate center points
    const mainCenterX = mainRoom.x + Math.floor(mainRoom.width / 2);
    const mainCenterY = mainRoom.y + Math.floor(mainRoom.height / 2);
    
    // Find a good point on the edge of the secondary room to connect from
    let secConnectX, secConnectY;
    
    // Calculate secondary room center (not used for connection, but for direction)
    const secCenterX = secondaryRoom.x + Math.floor(secondaryRoom.width / 2);
    const secCenterY = secondaryRoom.y + Math.floor(secondaryRoom.height / 2);
    
    // Determine the best edge of the secondary room to connect from
    // This will be the edge closest to the main room
    if (secondaryRoom.quadrant === 'north') {
      // Connect from bottom edge of secondary room
      secConnectX = secCenterX;
      secConnectY = secondaryRoom.y + secondaryRoom.height - 1;
    } else if (secondaryRoom.quadrant === 'south') {
      // Connect from top edge of secondary room
      secConnectX = secCenterX;
      secConnectY = secondaryRoom.y;
    } else if (secondaryRoom.quadrant === 'east') {
      // Connect from left edge of secondary room
      secConnectX = secondaryRoom.x;
      secConnectY = secCenterY;
    } else if (secondaryRoom.quadrant === 'west') {
      // Connect from right edge of secondary room
      secConnectX = secondaryRoom.x + secondaryRoom.width - 1;
      secConnectY = secCenterY;
    }
    
    // Find the nearest point on the main room's perimeter
    let mainConnectX, mainConnectY;
    
    // Determine if we should connect to the top/bottom or left/right edge of main room
    const connectToVerticalEdge = Math.abs(secConnectX - mainCenterX) > Math.abs(secConnectY - mainCenterY);
    
    if (connectToVerticalEdge) {
      // Connect to top or bottom edge
      mainConnectX = Math.max(mainRoom.x, Math.min(mainRoom.x + mainRoom.width - 1, secConnectX));
      
      if (secConnectY < mainCenterY) {
        // Secondary room is above main room, connect to top edge
        mainConnectY = mainRoom.y;
      } else {
        // Secondary room is below main room, connect to bottom edge
        mainConnectY = mainRoom.y + mainRoom.height - 1;
      }
    } else {
      // Connect to left or right edge
      mainConnectY = Math.max(mainRoom.y, Math.min(mainRoom.y + mainRoom.height - 1, secConnectY));
      
      if (secConnectX < mainCenterX) {
        // Secondary room is to the left of main room, connect to left edge
        mainConnectX = mainRoom.x;
      } else {
        // Secondary room is to the right of main room, connect to right edge
        mainConnectX = mainRoom.x + mainRoom.width - 1;
      }
    }
    
    // Create corridor between the two points
    // Use L-shaped corridors: first horizontal, then vertical
    
    // Determine the corner point of our L-shaped corridor
    let cornerX, cornerY;
    
    // Randomly decide if we go horizontal-then-vertical or vertical-then-horizontal
    if (Math.random() < 0.5) {
      // Horizontal then vertical
      cornerX = mainConnectX;
      cornerY = secConnectY;
    } else {
      // Vertical then horizontal
      cornerX = secConnectX;
      cornerY = mainConnectY;
    }
    
    // Draw first segment of corridor (from secondary room to corner)
    const corridor1X1 = Math.min(secConnectX, cornerX);
    const corridor1X2 = Math.max(secConnectX, cornerX);
    const corridor1Y1 = Math.min(secConnectY, cornerY);
    const corridor1Y2 = Math.max(secConnectY, cornerY);
    
    // Carve out first segment (horizontal or vertical)
    if (secConnectY === cornerY) {
      // Horizontal segment
      for (let x = corridor1X1; x <= corridor1X2; x++) {
        // Make corridor 3 cells wide for better navigation
        for (let dy = -1; dy <= 1; dy++) {
          const y = cornerY + dy;
          if (y >= 0 && y < gridHeight && x >= 0 && x < gridWidth) {
            room[y][x] = 0;
          }
        }
      }
    } else {
      // Vertical segment
      for (let y = corridor1Y1; y <= corridor1Y2; y++) {
        // Make corridor 3 cells wide for better navigation
        for (let dx = -1; dx <= 1; dx++) {
          const x = cornerX + dx;
          if (y >= 0 && y < gridHeight && x >= 0 && x < gridWidth) {
            room[y][x] = 0;
          }
        }
      }
    }
    
    // Draw second segment of corridor (from corner to main room)
    const corridor2X1 = Math.min(cornerX, mainConnectX);
    const corridor2X2 = Math.max(cornerX, mainConnectX);
    const corridor2Y1 = Math.min(cornerY, mainConnectY);
    const corridor2Y2 = Math.max(cornerY, mainConnectY);
    
    // Carve out second segment (horizontal or vertical)
    if (cornerY === mainConnectY) {
      // Horizontal segment
      for (let x = corridor2X1; x <= corridor2X2; x++) {
        // Make corridor 3 cells wide for better navigation
        for (let dy = -1; dy <= 1; dy++) {
          const y = mainConnectY + dy;
          if (y >= 0 && y < gridHeight && x >= 0 && x < gridWidth) {
            room[y][x] = 0;
          }
        }
      }
    } else {
      // Vertical segment
      for (let y = corridor2Y1; y <= corridor2Y2; y++) {
        // Make corridor 3 cells wide for better navigation
        for (let dx = -1; dx <= 1; dx++) {
          const x = mainConnectX + dx;
          if (y >= 0 && y < gridHeight && x >= 0 && x < gridWidth) {
            room[y][x] = 0;
          }
        }
      }
    }
  }
  
  return { grid: room, exits: exits };
}

// Generate random boxes in the room
function generateBoxes() {
  // Clear existing boxes
  boxes = [];
  
  // Count empty squares in the room
  let emptySquares = 0;
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      if (currentRoom.grid[y][x] === 0 && !isExit(x, y)) {
        emptySquares++;
      }
    }
  }
  
  // Calculate number of boxes to place (10% of empty squares)
  const boxPercentage = 0.1; // 10%
  let numBoxes = Math.floor(emptySquares * boxPercentage);
  
  // Ensure a reasonable number of boxes (between 3 and 15)
  numBoxes = Math.max(3, Math.min(15, numBoxes));
  
  // Try to place boxes (up to 100 attempts per box)
  for (let i = 0; i < numBoxes; i++) {
    let placed = false;
    let attempts = 0;
    
    while (!placed && attempts < 100) {
      // Choose random position
      const x = Math.floor(Math.random() * gridWidth);
      const y = Math.floor(Math.random() * gridHeight);
      
      // Check if position is valid
      if (isValidBoxPosition(x, y)) {
        // Place box
        boxes.push({x, y});
        placed = true;
      }
      
      attempts++;
    }
  }
}

// Check if a position is valid for placing a box
function isValidBoxPosition(x, y) {
  // Check if the position is within bounds
  if (x < 0 || x >= gridWidth || y < 0 || y >= gridHeight) {
    return false;
  }
  
  // Check if position is an empty space (not a wall)
  if (currentRoom.grid[y][x] !== 0) {
    return false;
  }
  
  // Check if position is not an exit
  if (isExit(x, y)) {
    return false;
  }
  
  // Check if position is not where the player is
  if (x === playerX && y === playerY) {
    return false;
  }
  
  // Check if position is not already occupied by another box
  if (hasBox(x, y)) {
    return false;
  }
  
  // Count adjacent walls
  let adjacentWallCount = 0;
  
  // Check all four directions for walls
  if (x > 0 && currentRoom.grid[y][x-1] === 1) adjacentWallCount++; // Left
  if (x < gridWidth-1 && currentRoom.grid[y][x+1] === 1) adjacentWallCount++; // Right
  if (y > 0 && currentRoom.grid[y-1][x] === 1) adjacentWallCount++; // Up
  if (y < gridHeight-1 && currentRoom.grid[y+1][x] === 1) adjacentWallCount++; // Down
  
  // Don't place boxes with 2 or more adjacent walls
  if (adjacentWallCount >= 2) {
    return false;
  }
  
  // Check if position is not adjacent to another box
  const hasAdjacentBox = (
    (x > 0 && hasBox(x-1, y)) ||
    (x < gridWidth-1 && hasBox(x+1, y)) ||
    (y > 0 && hasBox(x, y-1)) ||
    (y < gridHeight-1 && hasBox(x, y+1))
  );
  
  if (hasAdjacentBox) {
    return false;
  }
  
  // All checks passed, position is valid
  return true;
}

// Check if a position is an exit
function isExit(x, y) {
  for (const exit of currentRoom.exits) {
    if (exit.x === x && exit.y === y) {
      return true;
    }
  }
  return false;
}

// Check if there's a box at the specified position
function hasBox(x, y) {
  for (const box of boxes) {
    if (box.x === x && box.y === y) {
      return true;
    }
  }
  return false;
}

// Get the box at a specific position
function getBoxAt(x, y) {
  for (let i = 0; i < boxes.length; i++) {
    if (boxes[i].x === x && boxes[i].y === y) {
      return i;
    }
  }
  return -1;
}

// Try to push a box
function tryPushBox(boxIndex, dirX, dirY) {
  const box = boxes[boxIndex];
  const newBoxX = box.x + dirX;
  const newBoxY = box.y + dirY;
  
  // Check if the destination is valid (within bounds and empty)
  if (newBoxX >= 0 && newBoxX < gridWidth && 
      newBoxY >= 0 && newBoxY < gridHeight &&
      currentRoom.grid[newBoxY][newBoxX] === 0 && 
      !hasBox(newBoxX, newBoxY) &&
      !isExit(newBoxX, newBoxY)) {
    
    // Move the box
    boxes[boxIndex].x = newBoxX;
    boxes[boxIndex].y = newBoxY;
    return true;
  }
  
  return false;
}

// Spawn a new enemy from a random exit (not where the player is)
function spawnEnemy() {
  if (!currentRoom || currentRoom.exits.length <= 1) return;
  
  // Find valid exits (not where the player is)
  const validExits = currentRoom.exits.filter(exit => 
    !(exit.x === playerX && exit.y === exit.y)
  );
  
  if (validExits.length === 0) return;
  
  // Choose a random exit
  const randomIndex = Math.floor(Math.random() * validExits.length);
  const spawnExit = validExits[randomIndex];
  
  // Create a new enemy
  const enemy = {
    x: spawnExit.x,
    y: spawnExit.y,
    lastMoveTime: performance.now() // Use current timestamp
  };
  
  // Add enemy to the list
  enemies.push(enemy);
  
  // Update last spawn time
  lastEnemySpawnTime = performance.now(); // Use current timestamp
}

// Check if there's a direct line of sight between two points
function checkLineOfSight(x0, y0, x1, y1) {
  // Use Bresenham's line algorithm to check for walls or boxes in the path
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  
  let currentX = x0;
  let currentY = y0;
  
  // Check each cell along the line
  while (!(currentX === x1 && currentY === y1)) {
    // Skip the starting point
    if (!(currentX === x0 && currentY === y0)) {
      // If we hit a wall, there's no line of sight
      if (currentX < 0 || currentX >= gridWidth || currentY < 0 || currentY >= gridHeight ||
          currentRoom.grid[currentY][currentX] === 1) {
        return false;
      }
      
      // If we hit a box, there's no line of sight
      if (hasBox(currentX, currentY)) {
        return false;
      }
    }
    
    // Calculate next point in the line
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      currentX += sx;
    }
    if (e2 < dx) {
      err += dx;
      currentY += sy;
    }
  }
  
  // If we reached the end point without hitting any walls or boxes, there is line of sight
  return true;
}

// Update enemy positions using an exploration algorithm
function updateEnemies(timestamp) {
  // Check if it's time to spawn a new enemy
  if (gameActive && timestamp - lastEnemySpawnTime > enemySpawnInterval) {
    spawnEnemy();
  }
  
  // Update each enemy's position
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    
    // Initialize enemy state properties if they don't exist
    if (enemy.visitedCells === undefined) {
      enemy.visitedCells = {}; // Track visited cells
      enemy.lastX = enemy.x;
      enemy.lastY = enemy.y;
      enemy.previousMoves = []; // Remember last few moves
      enemy.stuckCount = 0;
    }
    
    // Mark current cell as visited
    const cellKey = `${enemy.x},${enemy.y}`;
    if (!enemy.visitedCells[cellKey]) {
      enemy.visitedCells[cellKey] = 0;
    }
    enemy.visitedCells[cellKey]++; // Increment visit count
    
    // Only move if enough time has passed
    if (timestamp - enemy.lastMoveTime > enemyMoveSpeed) {
      // Check if stuck (same position)
      if (enemy.lastX === enemy.x && enemy.lastY === enemy.y) {
        enemy.stuckCount++;
      } else {
        enemy.stuckCount = 0;
      }
      
      // Update last position
      enemy.lastX = enemy.x;
      enemy.lastY = enemy.y;
      
      // All possible move directions
      const directions = [
        { dx: 0, dy: -1 }, // Up
        { dx: 0, dy: 1 },  // Down
        { dx: -1, dy: 0 }, // Left
        { dx: 1, dy: 0 }   // Right
      ];
      
      // Shuffle array to randomize direction order
      for (let i = directions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [directions[i], directions[j]] = [directions[j], directions[i]];
      }
      
      // First check if enemy has direct line of sight to player
      const hasLineOfSight = checkLineOfSight(enemy.x, enemy.y, playerX, playerY);
      
      // If enemy has line of sight, move directly toward player
      if (hasLineOfSight) {
        // Find direction that moves closer to player
        let bestDir = null;
        let bestDistance = Infinity;
        
        for (const dir of directions) {
          const newX = enemy.x + dir.dx;
          const newY = enemy.y + dir.dy;
          
          // Skip invalid moves
          if (!isValidEnemyMove(newX, newY)) {
            continue;
          }
          
          // Calculate new distance to player
          const distToPlayer = Math.abs(newX - playerX) + Math.abs(newY - playerY);
          
          // Keep the move that gets us closest to the player
          if (distToPlayer < bestDistance) {
            bestDistance = distToPlayer;
            bestDir = dir;
          }
        }
        
        // If we found a valid move, make it
        if (bestDir) {
          enemy.x += bestDir.dx;
          enemy.y += bestDir.dy;
          enemy.lastMoveTime = timestamp;
          
          // Remember this move
          enemy.previousMoves.unshift({ x: enemy.x, y: enemy.y });
          if (enemy.previousMoves.length > 5) {
            enemy.previousMoves.pop();
          }
          
          // Check for collision with player
          if (enemy.x === playerX && enemy.y === playerY) {
            // Player is caught!
            endGame();
          }
          
          // Skip the normal movement logic
          continue;
        }
      }
      
      // If no line of sight or no valid direct move, use weighted decision making
      const moveOptions = [];
      
      for (const dir of directions) {
        const newX = enemy.x + dir.dx;
        const newY = enemy.y + dir.dy;
        
        // Skip invalid moves
        if (!isValidEnemyMove(newX, newY)) {
          continue;
        }
        
        // Base score starts at 1
        let score = 1;
        
        // Distance to player factor (higher score for moves closer to player)
        const distToPlayer = Math.abs(newX - playerX) + Math.abs(newY - playerY);
        const maxPossibleDist = gridWidth + gridHeight;
        
        // Calculate player influence based on distance
        let playerInfluence;
        
        if (distToPlayer < 10) {
          // When close to player (within 10 cells), very strongly prioritize moving toward them
          playerInfluence = 5 - (distToPlayer * 0.4); // 5.0 when adjacent, down to 1.0 at distance 10
        } else {
          // Normal influence at medium distances
          playerInfluence = 1 + (maxPossibleDist - distToPlayer) / maxPossibleDist * 2;
        }
        
        // If on same row or column as player, add extra incentive to move directly toward them
        if (newX === playerX || newY === playerY) {
          playerInfluence *= 1.5;
        }
        
        score *= playerInfluence;
        
        // Exploration factor (prefer less visited cells)
        const newCellKey = `${newX},${newY}`;
        const visitCount = enemy.visitedCells[newCellKey] || 0;
        
        // Exploration factor (higher score for less visited cells)
        // Unvisited cells get the maximum bonus
        let explorationFactor = 1 + 1 / (visitCount + 1);
        
        // Reduce exploration importance when close to the player
        if (distToPlayer < 5) {
          // Diminish exploration when very close to player
          explorationFactor = 1 + 0.1 / (visitCount + 1);
        }
        
        score *= explorationFactor;
        
        // Avoid backtracking (lower score for recent positions)
        let backtrackPenalty = 1.0;
        for (let i = 0; i < enemy.previousMoves.length; i++) {
          const prevMove = enemy.previousMoves[i];
          if (prevMove.x === newX && prevMove.y === newY) {
            // Apply stronger penalty for more recent backtracking
            backtrackPenalty = 0.5 / (enemy.previousMoves.length - i);
            break;
          }
        }
        score *= backtrackPenalty;
        
        // Add random variation to prevent predictability
        // Less randomness when close to the player for more focused pursuit
        let randomVariation;
        if (distToPlayer < 5) {
          // Minimal randomness when very close
          randomVariation = 0.05;
        } else {
          // More randomness at a distance
          randomVariation = 0.2;
        }
        
        const randomFactor = 1 - randomVariation + (Math.random() * randomVariation * 2);
        score *= randomFactor;
        
        // If very stuck, give bonus to any move
        if (enemy.stuckCount > 3) {
          score *= 2;
        }
        
        // Add to options
        moveOptions.push({
          x: newX,
          y: newY,
          dx: dir.dx,
          dy: dir.dy,
          score: score
        });
      }
      
      // Choose the best move (highest score)
      if (moveOptions.length > 0) {
        // Sort by score (highest first)
        moveOptions.sort((a, b) => b.score - a.score);
        const bestMove = moveOptions[0];
        
        // Move the enemy
        enemy.x = bestMove.x;
        enemy.y = bestMove.y;
        enemy.lastMoveTime = timestamp;
        
        // Remember this move (limit to last 5 moves)
        enemy.previousMoves.unshift({ x: bestMove.x, y: bestMove.y });
        if (enemy.previousMoves.length > 5) {
          enemy.previousMoves.pop();
        }
        
        // Check for collision with player
        if (enemy.x === playerX && enemy.y === playerY) {
          // Player is caught!
          endGame();
        }
      }
    }
  }
}

// Generate random treasures in the room
function generateTreasures() {
  // Clear existing treasures
  treasures = [];
  
  // Number of treasures to place (between 3-7 treasures)
  const numTreasures = Math.floor(Math.random() * 5) + 3;
  
  // Try to place treasures (up to 50 attempts per treasure)
  for (let i = 0; i < numTreasures; i++) {
    let placed = false;
    let attempts = 0;
    
    while (!placed && attempts < 50) {
      // Choose random position
      const x = Math.floor(Math.random() * gridWidth);
      const y = Math.floor(Math.random() * gridHeight);
      
      // Check if position is valid (empty space, not an exit, not where the player is, not a box)
      if (isValidTreasurePosition(x, y)) {
        // Place treasure
        treasures.push({x, y});
        placed = true;
      }
      
      attempts++;
    }
  }
}

// Check if a position is valid for placing a treasure
function isValidTreasurePosition(x, y) {
  // Check bounds and if position is an empty space
  if (x < 0 || x >= gridWidth || y < 0 || y >= gridHeight || currentRoom.grid[y][x] !== 0) {
    return false;
  }
  
  // Check if position is not an exit
  if (isExit(x, y)) {
    return false;
  }
  
  // Check if position is not where the player is
  if (x === playerX && y === playerY) {
    return false;
  }
  
  // Check if position doesn't have a box
  if (hasBox(x, y)) {
    return false;
  }
  
  // Check if position doesn't already have a treasure
  for (const treasure of treasures) {
    if (treasure.x === x && treasure.y === y) {
      return false;
    }
  }
  
  return true;
}

// Check if the player has collected a treasure
function checkTreasureCollection() {
  for (let i = treasures.length - 1; i >= 0; i--) {
    if (treasures[i].x === playerX && treasures[i].y === playerY) {
      // Collected a treasure!
      score += 100; // Add points
      treasures.splice(i, 1); // Remove the treasure
    }
  }
}

// Check if a move is valid for an enemy
function isValidEnemyMove(x, y) {
  // Check bounds
  if (x < 0 || x >= gridWidth || y < 0 || y >= gridHeight) {
    return false;
  }
  
  // Check if the position is a wall
  if (currentRoom.grid[y][x] !== 0) {
    return false;
  }
  
  // Check if position has a box
  if (hasBox(x, y)) {
    return false;
  }
  
  // Check if position is an exit
  if (isExit(x, y)) {
    return false; // Enemies can't leave the room
  }
  
  // Check if position has another enemy
  for (const enemy of enemies) {
    if (enemy.x === x && enemy.y === y) {
      return false; // Enemies can't occupy the same space
    }
  }
  
  // Position is valid
  return true;
}

// This function has been replaced by the endGame() function

// Start the game (called when player first moves)
function startGame() {
  if (!gameActive) {
    gameActive = true;
    gameStartTime = performance.now();
    lastEnemySpawnTime = performance.now();
    
    // Spawn first enemy after initial delay
    setTimeout(spawnEnemy, enemySpawnDelay);
  }
}

// Check if the player is at an exit
function checkForExit() {
  if (!currentRoom) return false;
  
  // Check if the player is at an exit
  for (const exit of currentRoom.exits) {
    if (playerX === exit.x && playerY === exit.y) {
      // Determine entrance position for new room
      let entrancePos;
      
      switch (exit.direction) {
        case 'north':
          // Entering from south
          entrancePos = playerX;
          playerY = gridHeight - 1;
          break;
        case 'south':
          // Entering from north
          entrancePos = playerX;
          playerY = 0;
          break;
        case 'east':
          // Entering from west
          entrancePos = playerY;
          playerX = 0;
          break;
        case 'west':
          // Entering from east
          entrancePos = playerY;
          playerX = gridWidth - 1;
          break;
      }
      
      // Generate new room with entrance matching the exit direction
      const oppositeDirection = {
        'north': 'south',
        'south': 'north',
        'east': 'west',
        'west': 'east'
      }[exit.direction];
      
      // Ensure entrancePos is within grid bounds
      entrancePos = Math.max(0, Math.min(
        oppositeDirection === 'north' || oppositeDirection === 'south' ? gridWidth - 1 : gridHeight - 1, 
        entrancePos
      ));
      
      // Generate new room with entrance from the correct direction
      currentRoom = generateRoom(oppositeDirection, entrancePos);
      
      // Generate new boxes and treasures for the new room
      generateBoxes();
      generateTreasures();
      
      // Clear enemies when entering a new room
      enemies = [];
      
      // Increment rooms visited counter
      roomsVisited++;
      
      return true;
    }
  }
  
  return false;
}

// End the game when the player is caught
function endGame() {
  gameOver = true;
  gameActive = false;
  moving = false;
  
  // Add event listeners for the restart button (both mouse and touch)
  canvas.addEventListener('click', handleRestartClick);
  canvas.addEventListener('touchend', handleRestartClick);
}

// Handle click on the restart button
function handleRestartClick(event) {
  // Prevent default behavior
  event.preventDefault();
  
  // Calculate button position and size
  const buttonWidth = 200;
  const buttonHeight = 50;
  const buttonX = (canvas.width - buttonWidth) / 2;
  const buttonY = canvas.height / 2 + 60; // Updated to match the game over overlay
  
  // Get canvas position relative to viewport
  const canvasRect = canvas.getBoundingClientRect();
  
  // Get coordinates (works for both mouse and touch)
  let clientX, clientY;
  
  if (event.type === 'touchend') {
    // For touch events
    clientX = event.changedTouches[0].clientX - canvasRect.left;
    clientY = event.changedTouches[0].clientY - canvasRect.top;
  } else {
    // For mouse events
    clientX = event.clientX - canvasRect.left;
    clientY = event.clientY - canvasRect.top;
  }
  
  // Check if click/touch is within button bounds
  if (
    clientX >= buttonX &&
    clientX <= buttonX + buttonWidth &&
    clientY >= buttonY &&
    clientY <= buttonY + buttonHeight
  ) {
    // Restart the game
    resetGame();
    // Remove the event listeners
    canvas.removeEventListener('click', handleRestartClick);
    canvas.removeEventListener('touchend', handleRestartClick);
  }
}

// Reset game state
function resetGame() {
  // Reset game state
  playerX = Math.floor(gridWidth / 2);
  playerY = Math.floor(gridHeight / 2);
  directionX = 0;
  directionY = 0;
  moving = false;
  boxes = [];
  treasures = [];
  enemies = [];
  score = 0;
  moveCount = 0;
  roomsVisited = 1;
  gameOver = false;
  
  // Generate a new room
  currentRoom = generateRoom();
  generateBoxes();
  generateTreasures();
  
  // Reset game activity
  gameActive = false;
  gameStartTime = 0;
  lastEnemySpawnTime = 0;
}

// Check if a move is valid
function isValidMove(x, y) {
  // Check bounds
  if (x < 0 || x >= gridWidth || y < 0 || y >= gridHeight) {
    return false;
  }
  
  // Check if the position is a wall
  if (currentRoom.grid[y][x] !== 0) {
    return false;
  }
  
  // Check if there's a box at the position
  const boxIndex = getBoxAt(x, y);
  if (boxIndex >= 0) {
    // Try to push the box - this counts as a valid move
    // even though player position doesn't change in this case
    // we return a special value to the caller to indicate this
    return tryPushBox(boxIndex, x - playerX, y - playerY);
  }
  
  // Position is empty
  return true;
}

// Initial setup
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Handle keyboard input
window.addEventListener('keydown', (e) => {
  // Ignore keyboard input if welcome screen is showing
  if (showWelcomeScreen) {
    // Allow Enter or Space to start the game
    if (e.key === 'Enter' || e.key === ' ') {
      showWelcomeScreen = false;
    }
    return;
  }
  
  // Ignore keyboard input if game is over
  if (gameOver) {
    return;
  }
  
  let newDirectionX = 0;
  let newDirectionY = 0;
  let shouldMove = true;
  
  switch(e.key) {
    case 'ArrowUp':
    case 'w':
      newDirectionY = -1;
      newDirectionX = 0;
      // Stop if already moving in this direction
      if (moving && directionY === -1 && directionX === 0) {
        shouldMove = false;
      }
      break;
    case 'ArrowDown':
    case 's':
      newDirectionY = 1;
      newDirectionX = 0;
      // Stop if already moving in this direction
      if (moving && directionY === 1 && directionX === 0) {
        shouldMove = false;
      }
      break;
    case 'ArrowLeft':
    case 'a':
      newDirectionX = -1;
      newDirectionY = 0;
      // Stop if already moving in this direction
      if (moving && directionX === -1 && directionY === 0) {
        shouldMove = false;
      }
      break;
    case 'ArrowRight':
    case 'd':
      newDirectionX = 1;
      newDirectionY = 0;
      // Stop if already moving in this direction
      if (moving && directionX === 1 && directionY === 0) {
        shouldMove = false;
      }
      break;
    case ' ': // Spacebar to stop
      shouldMove = false;
      break;
    default:
      // Keep current direction if we don't recognize the key
      newDirectionX = directionX;
      newDirectionY = directionY;
      break;
  }
  
  if (!shouldMove) {
    // Stop moving
    moving = false;
    return;
  }
  
  // Set to move, check if the direction is valid
  if (isValidMove(playerX + newDirectionX, playerY + newDirectionY)) {
    directionX = newDirectionX;
    directionY = newDirectionY;
    moving = true;
  } else {
    // If the new direction is invalid, stop moving
    moving = false;
  }
});

// Touch handlers
canvas.addEventListener('touchstart', (e) => {
  // Skip game movement if welcome screen is showing or game is over
  // (handleStartClick will handle welcome screen touch events)
  if (showWelcomeScreen || gameOver) {
    e.preventDefault();
    return;
  }
  
  // Get canvas position relative to viewport
  const canvasRect = canvas.getBoundingClientRect();
  
  touchStartX = e.touches[0].clientX - canvasRect.left;
  touchStartY = e.touches[0].clientY - canvasRect.top - headerHeight;
  e.preventDefault(); // Prevent scrolling
});

canvas.addEventListener('touchend', (e) => {
  // Skip game movement if welcome screen is showing or game is over
  if (showWelcomeScreen || gameOver) {
    e.preventDefault();
    return;
  }
  
  // Get canvas position relative to viewport
  const canvasRect = canvas.getBoundingClientRect();
  
  const touchEndX = e.changedTouches[0].clientX - canvasRect.left;
  const touchEndY = e.changedTouches[0].clientY - canvasRect.top - headerHeight;
  
  // A simple tap (without much movement) will stop the player
  if (Math.abs(touchEndX - touchStartX) < minSwipeDistance &&
      Math.abs(touchEndY - touchStartY) < minSwipeDistance) {
    moving = false;
  }
  e.preventDefault();
});

canvas.addEventListener('touchmove', (e) => {
  // Skip game movement if welcome screen is showing or game is over
  if (showWelcomeScreen || gameOver) {
    e.preventDefault();
    return;
  }
  
  // Get canvas position relative to viewport
  const canvasRect = canvas.getBoundingClientRect();
  
  const touchX = e.touches[0].clientX - canvasRect.left;
  const touchY = e.touches[0].clientY - canvasRect.top - headerHeight;
  
  const diffX = touchX - touchStartX;
  const diffY = touchY - touchStartY;
  
  // Detect swipe direction if it's a significant movement
  if (Math.abs(diffX) > minSwipeDistance || Math.abs(diffY) > minSwipeDistance) {
    let newDirectionX = 0;
    let newDirectionY = 0;
    let shouldMove = true;
    
    // Determine the primary direction of the swipe
    if (Math.abs(diffX) > Math.abs(diffY)) {
      // Horizontal swipe
      newDirectionX = diffX > 0 ? 1 : -1;
      newDirectionY = 0;
      
      // Stop if already moving in this direction
      if (moving && directionX === newDirectionX && directionY === 0) {
        shouldMove = false;
        moving = false;
      }
    } else {
      // Vertical swipe
      newDirectionX = 0;
      newDirectionY = diffY > 0 ? 1 : -1;
      
      // Stop if already moving in this direction
      if (moving && directionY === newDirectionY && directionX === 0) {
        shouldMove = false;
        moving = false;
      }
    }
    
    if (shouldMove) {
      // Check if the new direction is valid
      if (isValidMove(playerX + newDirectionX, playerY + newDirectionY)) {
        directionX = newDirectionX;
        directionY = newDirectionY;
        moving = true;
      }
    }
  }
  
  e.preventDefault(); // Prevent scrolling
});

// Draw grid lines
function drawGrid() {
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1;
  
  // Vertical lines
  for (let x = 0; x <= gridWidth; x++) {
    ctx.beginPath();
    ctx.moveTo(x * gridSize, headerHeight);
    ctx.lineTo(x * gridSize, headerHeight + gridHeight * gridSize);
    ctx.stroke();
  }
  
  // Horizontal lines
  for (let y = 0; y <= gridHeight; y++) {
    ctx.beginPath();
    ctx.moveTo(0, headerHeight + y * gridSize);
    ctx.lineTo(gridWidth * gridSize, headerHeight + y * gridSize);
    ctx.stroke();
  }
}

// Draw the room
function drawRoom() {
  if (!currentRoom) return;
  
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      if (currentRoom.grid[y][x] === 1) { // Wall
        // Fill with a dark color
        ctx.fillStyle = '#333333';
        ctx.fillRect(x * gridSize, y * gridSize + headerHeight, gridSize, gridSize);
      }
    }
  }
  
  // Highlight exits
  ctx.fillStyle = 'rgba(100, 200, 100, 0.3)';
  for (const exit of currentRoom.exits) {
    ctx.beginPath();
    ctx.rect(exit.x * gridSize, exit.y * gridSize + headerHeight, gridSize, gridSize);
    ctx.fill();
  }
  
  // Draw boxes
  drawBoxes();
  
  // Draw treasures
  drawTreasures();
  
  // Draw enemies
  drawEnemies();
}

// Draw treasures
function drawTreasures() {
  ctx.fillStyle = '#FFD700'; // Gold color
  
  for (const treasure of treasures) {
    // Draw a gold coin
    const centerX = treasure.x * gridSize + gridSize / 2;
    const centerY = treasure.y * gridSize + gridSize / 2 + headerHeight;
    const radius = gridSize / 3;
    
    // Draw coin
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw shine effect
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(centerX - radius/3, centerY - radius/3, radius/5, 0, Math.PI * 2);
    ctx.fill();
    
    // Reset fill color
    ctx.fillStyle = '#FFD700';
  }
}

// Draw the enemies
function drawEnemies() {
  ctx.fillStyle = '#e74c3c'; // Red color for enemies
  
  for (const enemy of enemies) {
    // Draw enemy as a menacing diamond shape
    const centerX = enemy.x * gridSize + gridSize / 2;
    const centerY = enemy.y * gridSize + gridSize / 2 + headerHeight;
    const size = gridSize * 0.4;
    
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - size); // Top
    ctx.lineTo(centerX + size, centerY); // Right
    ctx.lineTo(centerX, centerY + size); // Bottom
    ctx.lineTo(centerX - size, centerY); // Left
    ctx.closePath();
    ctx.fill();
    
    // Add eyes
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(centerX - size * 0.3, centerY - size * 0.2, size * 0.15, 0, Math.PI * 2);
    ctx.arc(centerX + size * 0.3, centerY - size * 0.2, size * 0.15, 0, Math.PI * 2);
    ctx.fill();
    
    // Add pupils
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(centerX - size * 0.3, centerY - size * 0.2, size * 0.07, 0, Math.PI * 2);
    ctx.arc(centerX + size * 0.3, centerY - size * 0.2, size * 0.07, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Draw the boxes
function drawBoxes() {
  ctx.fillStyle = '#f1c40f'; // Yellow color for boxes
  ctx.strokeStyle = '#e67e22'; // Orange border
  ctx.lineWidth = 2;
  
  for (const box of boxes) {
    // Draw filled box
    ctx.fillRect(
      box.x * gridSize + 2, 
      box.y * gridSize + headerHeight + 2, 
      gridSize - 4, 
      gridSize - 4
    );
    
    // Draw border
    ctx.strokeRect(
      box.x * gridSize + 2, 
      box.y * gridSize + headerHeight + 2, 
      gridSize - 4, 
      gridSize - 4
    );
  }
}

// Draw the player
function drawPlayer() {
  ctx.fillStyle = '#3498db';
  
  // Get pixel coordinates from grid coordinates
  const centerX = playerX * gridSize + gridSize / 2;
  const centerY = playerY * gridSize + gridSize / 2 + headerHeight;
  const radius = gridSize / 3;
  
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();
}

// Update player position based on movement direction
function updatePlayerPosition(timestamp) {
  if (!moving || gameOver) return;
  
  // Start the game when player first moves
  if (!gameActive && (directionX !== 0 || directionY !== 0)) {
    startGame();
  }
  
  // Move the player every moveSpeed milliseconds
  if (timestamp - lastMoveTime > moveSpeed) {
    const newX = playerX + directionX;
    const newY = playerY + directionY;
    
    // Check if the move is valid
    if (isValidMove(newX, newY)) {
      // Only increment move counter if player actually changed position
      if (newX !== playerX || newY !== playerY) {
        moveCount++; // Increment move counter
      }
      
      // Update player position
      playerX = newX;
      playerY = newY;
      lastMoveTime = timestamp;
      
      // Check for treasure collection
      checkTreasureCollection();
      
      // Check for collision with enemy
      for (const enemy of enemies) {
        if (enemy.x === playerX && enemy.y === playerY) {
          endGame();
          return;
        }
      }
      
      // Check if player reached an exit
      checkForExit();
    } else {
      // Hit a wall, stop moving
      moving = false;
    }
  }
}

// Welcome screen handler
function handleStartClick(event) {
  // Prevent default behavior
  event.preventDefault();
  
  // Calculate button position and size
  const buttonWidth = 200;
  const buttonHeight = 50;
  const buttonX = (canvas.width - buttonWidth) / 2;
  const buttonY = canvas.height / 2 + 100;
  
  // Get canvas position relative to viewport
  const canvasRect = canvas.getBoundingClientRect();
  
  // Get coordinates (works for both mouse and touch)
  let clientX, clientY;
  
  if (event.type === 'touchend') {
    // For touch events
    clientX = event.changedTouches[0].clientX - canvasRect.left;
    clientY = event.changedTouches[0].clientY - canvasRect.top;
  } else {
    // For mouse events
    clientX = event.clientX - canvasRect.left;
    clientY = event.clientY - canvasRect.top;
  }
  
  // Check if click/touch is within button bounds
  if (
    clientX >= buttonX &&
    clientX <= buttonX + buttonWidth &&
    clientY >= buttonY &&
    clientY <= buttonY + buttonHeight
  ) {
    // Hide welcome screen and start the game
    showWelcomeScreen = false;
    
    // Remove event listeners
    canvas.removeEventListener('click', handleStartClick);
    canvas.removeEventListener('touchend', handleStartClick);
  }
}

// Draw welcome screen
function drawWelcomeScreen() {
  // Semi-transparent overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Welcome title
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('ROKOBAN', canvas.width / 2, canvas.height / 3 - 40);
  
  // Game instructions
  ctx.font = 'bold 20px Arial';
  const instructions = [
    "Welcome to Rokoban!",
    "",
    "• Use arrow keys or swipe to move",
    "• Collect gold coins to increase your score",
    "• Push boxes to clear your path or",
    "  block your enemies",
    "• Avoid the red enemies",
    "• Find exits to explore new rooms"
  ];
  
  // Draw each line of instructions
  let lineY = canvas.height / 3;
  for (const line of instructions) {
    ctx.fillText(line, canvas.width / 2, lineY);
    lineY += 30;
  }
  
  // Start button
  const buttonWidth = 200;
  const buttonHeight = 50;
  const buttonX = (canvas.width - buttonWidth) / 2;
  const buttonY = canvas.height / 2 + 100;
  
  // Button background
  ctx.fillStyle = '#3498db';
  ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
  
  // Button border
  ctx.strokeStyle = '#2980b9';
  ctx.lineWidth = 2;
  ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
  
  // Button text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 24px Arial';
  ctx.fillText('START GAME', canvas.width / 2, buttonY + 32);
  
  // Add event listeners for the start button if not already added
  canvas.addEventListener('click', handleStartClick);
  canvas.addEventListener('touchend', handleStartClick);
}

// Game loop
function gameLoop(timestamp) {
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Check if welcome screen should be shown
  if (showWelcomeScreen) {
    drawWelcomeScreen();
    // Request next frame and exit early
    requestAnimationFrame(gameLoop);
    return;
  }
  
  // Update player position
  updatePlayerPosition(timestamp);
  
  // Update enemies if game is active
  if (gameActive && !gameOver) {
    updateEnemies(timestamp);
  }
  
  // Draw header
  drawHeader();
  
  // Draw grid - offset by header height
  drawGrid();
  
  // Draw room - offset by header height
  drawRoom();
  
  // Draw player - offset by header height
  drawPlayer();
  
  // Draw direction indicator if moving
  if (moving) {
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 2;
    
    const centerX = playerX * gridSize + gridSize / 2;
    const centerY = playerY * gridSize + gridSize / 2 + headerHeight;
    const indicatorLength = gridSize / 2;
    
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(
      centerX + directionX * indicatorLength,
      centerY + directionY * indicatorLength
    );
    ctx.stroke();
  }
  
  // Draw game over overlay if game is over
  if (gameOver) {
    drawGameOverOverlay();
  }
  
  // Request next frame
  requestAnimationFrame(gameLoop);
}

// Draw header with game stats
function drawHeader() {
  // Draw header background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, headerHeight);
  
  // Draw bottom border
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, headerHeight);
  ctx.lineTo(canvas.width, headerHeight);
  ctx.stroke();
  
  // Draw game stats
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`Score: ${score}`, 20, headerHeight / 2 + 6);
  
  ctx.textAlign = 'center';
  ctx.fillText(`Moves: ${moveCount}`, canvas.width / 2, headerHeight / 2 + 6);
  
  ctx.textAlign = 'right';
  ctx.fillText(`Rooms: ${roomsVisited}`, canvas.width - 20, headerHeight / 2 + 6);
}

// Draw game over overlay
function drawGameOverOverlay() {
  // Semi-transparent overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Game over text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 50);
  
  // Final score and stats
  ctx.font = 'bold 24px Arial';
  ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2 - 10);
  ctx.font = 'bold 20px Arial';
  ctx.fillText(`Moves: ${moveCount} | Rooms: ${roomsVisited}`, canvas.width / 2, canvas.height / 2 + 20);
  
  // Restart button
  const buttonWidth = 200;
  const buttonHeight = 50;
  const buttonX = (canvas.width - buttonWidth) / 2;
  const buttonY = canvas.height / 2 + 60;
  
  // Button background
  ctx.fillStyle = '#3498db';
  ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
  
  // Button border
  ctx.strokeStyle = '#2980b9';
  ctx.lineWidth = 2;
  ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
  
  // Button text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 20px Arial';
  ctx.fillText('PLAY AGAIN', canvas.width / 2, buttonY + 30);
}

// Start the game loop
requestAnimationFrame(gameLoop);