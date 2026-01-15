const svgNS = "http://www.w3.org/2000/svg"; // SVG Reference
const canvas = document.querySelector("#canvas"); // Main game display canvas
const shopCanvas = document.querySelector("#shopCanvas"); // Shop display canvas
const healthDisplay = document.querySelector("#healthDisplay"); // Display for current health
const heartsDisplay = document.querySelector("#healthDisplayHearts"); // Display for hearts
const moneyDisplay = document.querySelector("#moneyDisplay"); // Display for current money
const waveDisplay = document.querySelector("#waveDisplay"); // Display for current wave

let startButton = document.querySelector("#startWave"); // Button to start a wave
let upgradeButton = document.querySelector("#upgrade"); // Button to upgrade towers
let resetButton = document.querySelector("#reset"); // Button to reset the game
let trackButton = document.querySelector("#newTrack"); // Button to generate a new track
let easyButton = document.querySelector("#easyMode"); // Button to set difficulty to easy
let mediumButton = document.querySelector("#mediumMode"); // Button to set difficulty to medium
let hardButton = document.querySelector("#hardMode"); // Button to set difficulty to hard
let hardcoreButton = document.querySelector("#hardcoreMode"); // Button to activate hardcore mode

let colours = ["saddlebrown", "grey", "greenyellow", "blue", "purple", "orange", "firebrick", "deeppink", "gold"]; // Tower level colours
let mapRects = []; // All map rect elements
let width = 10; // Width of map rect elements
let height = 10; // Height of map rect elements
let trackPath = []; // Index's of the generated path, in order
let selectedTiles = []; // All currently selected tiles
let towers = []; // All active towers
let waveCount = 0; // Current wave
let playerHealth = 10; // Player starting health
let playerMoney = 20; // Player starting money
let hardcore = false; // Hardcore mode toggle

let towerDamage = 12; // Base damage
let towerFireRate = 1000; // Base fire rate
let towerRange = 150; // Base range
let totalCost; // Total cost to upgrade all currently selected towers
let currentDifficulty; // The currently active game difficulty

let activeEnemies = []; // All currently alive enemies
let enemySpeed; // Enemy movement speed
let enemyHealth; // Enemy health
let enemySpawnRate; // Time between enemy spawns inside the same wave
let enemyCountMultipler; // Multiplier for number of enemies to spawn in a wave depending on difficulty
let waveInterval; // Timer for controlling enemy spawning

/**
 * Resets the game
 */
function reset() {
    // Delete all enemies
    for (i = 0; i < activeEnemies.length; i++) {
        activeEnemies[i].circle.remove();
    }
    // Delete all towers
    for (i = 0; i < towers.length; i++) {
        towers[i].circle.remove();
    }
    // Clear arrays and delete spawn interval
    activeEnemies.length = 0;
    towers.length = 0;
    clearInterval(waveInterval);
    // Redraw the level
    drawLevel()

    // Reset the state of all buttons
    resetButton.classList.add("disabled");
    trackButton.classList.remove("disabled");
    easyButton.classList.remove("disabled");
    mediumButton.classList.remove("disabled");
    hardButton.classList.remove("disabled");
    hardcoreButton.classList.remove("disabled");
    // Reset stat tracking displays
    waveCount = 0;
    waveDisplay.textContent = "Current Wave:";
    playerHealth = 10;
    playerMoney = 20;
    updatePlayer();
}

/**
 * Draws the initial game level, without the path
 */
function drawLevel() {

    // Reset the track coordinate and map tile arrays
    trackPath.length = 0;
    mapRects.length = 0;

    // Create all tiles in a 10x10 grid
    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            
                // Set up tile visuals
                let block = document.createElementNS(svgNS, "rect");
                block.setAttribute("x", i*50);
                block.setAttribute("y", j*50);
                block.setAttribute("width", 50);
                block.setAttribute("height", 50);

                block.setAttribute("id", "mapTile");

                block.setAttribute("fill", "green");
                block.setAttribute("stroke", "darkgreen");
                block.setAttribute("onmouseover", "updateMouse(this)");
                
                mapRects.push(block);
                canvas.appendChild(block);
        }
    }
    // Generate the track
    generateTrack();
}

/**
 * Draw the tower shop
 */
function drawShop() {
    // Draw the laser tower graphic
    let laserTower = document.createElementNS(svgNS, "circle")
    laserTower.setAttribute("cx", 50);
    laserTower.setAttribute("cy", 55);
    laserTower.setAttribute("r", 20);
    laserTower.setAttribute("fill", "saddlebrown");
    laserTower.setAttribute("stroke", "black");
    laserTower.setAttribute("onclick", "placeTowers(selectedTiles)");
    let laserBarrel = document.createElementNS(svgNS, "rect");
    laserBarrel.setAttribute("x", 45);
    laserBarrel.setAttribute("y", 15);
    laserBarrel.setAttribute("width", 10);
    laserBarrel.setAttribute("height", 20);
    laserBarrel.setAttribute("fill", "black");

    // Add the tower to the shopCanvas
    shopCanvas.appendChild(laserBarrel);
    shopCanvas.appendChild(laserTower);
}

/**
 * Updates current game difficulty
 * @param {number} difficulty Value to set the game difficulty to
 */
function setDifficulty(difficulty) {

    // Allow the user to start the game
    startButton.classList.remove("disabled");

    // Adjust difficulty settings
    if (difficulty == 0) {
        enemySpeed = 0.5;
        enemyHealth = 65;
        enemySpawnRate = 1500;
        enemyCountMultipler = 1;
        currentDifficulty = 0;
    } else if (difficulty == 1) {
        enemySpeed = 0.75;
        enemyHealth = 85;
        enemySpawnRate = 1250;
        enemyCountMultipler = 2;
        currentDifficulty = 1;
    } else if (difficulty == 2) {
        enemySpeed = 1;
        enemyHealth = 100;
        enemySpawnRate = 1000;
        enemyCountMultipler = 3;
        currentDifficulty = 2;
    }
}

/**
 * Toggle hardcore mode
 */
function toggleHardcore() {

    // If hardcore is turned on, limit the player to a single heart
    if (hardcore == false) {
        playerHealth = 1;
        hardcore = true;
        updatePlayer();
    } else {
        playerHealth = 10;
        hardcore = false;
        updatePlayer();
    }
    
}

/**
 * Generates a new randomized track layout, providing a visual path and waypoint data for enemies to follow
 */
function generateTrack() {
    // Generate random start position
    let nextIndex = Math.floor(Math.random() * 10);

    let moveDirection;
    let prevIndex;

    // Randomly generate the track until we run off the right side of the screen
    while (nextIndex <= 99) {

        trackPath.push(nextIndex); // Store the next waypoint in the track path for enemy movement

        // Draw the track tile
        mapRects[nextIndex].setAttribute("fill", "darkgrey");
        mapRects[nextIndex].setAttribute("stroke", "black");

        // Update generator variables
        prevIndex = nextIndex;
        prevMove = moveDirection;

        moveDirection = Math.round(Math.random()); // Randomly choose to move in the x or y direction (0 for right, 1 for up/down)

        if (prevMove == 1) { // If we last moved in the y axis, move right instead
            nextIndex += 10;
            
        } else {
            if (moveDirection == 0) { // Move right
            nextIndex += 10;

            } else {
                let upORdown = Math.round(Math.random()); // Randomly choose to move up or down (0 for down, 1 for up)
                if (upORdown == 0) {
                    if (prevIndex % 10 == 9) { // If we're about to leave the map area, move the opposite direction
                        nextIndex -= 1; // Move up
                    } else {
                        nextIndex += 1; // Move down
                    } 

                } else {
                    if (prevIndex % 10 == 0) { // If we're about to leave the map area, move the opposite direction
                        nextIndex += 1; // Move down
                    } else {
                        nextIndex -= 1; // Move up
                    }
                }
            }
        }
    }
}

/**
 * Updates the hovered tile colour
 * @param {rect} hoveredRect
 */
function updateMouse(hoveredRect) {
    if (hoveredRect.getAttribute("fill") == "green") {
        hoveredRect.setAttribute("fill", "lightgreen");
    }
    refreshMap(hoveredRect); // Refresh the map
}

/**
 * Selects the currently hovered map tile
 * @param {rect} tile 
 * @returns null
 */
function selectTile(tile) {

    // If the tile already has a tower on it, don't allow it to be selected
    for (i = 0; i < towers.length; i++) {
        if (worldSpaceToIndex(parseInt(tile.getAttribute("x")), parseInt(tile.getAttribute("y")), 0) == towers[i].tileIndex) {
            return;
        }
    }

    // If clicking anywhere not on a tile, or on a track tile, don't allow it to be selected
    if (tile == null || tile.getAttribute("fill") == "darkgrey") {
        return;
    } else if (tile.getAttribute("fill") == "lightgreen") { // Select the tile
        tile.setAttribute("fill", "darkgreen");
        selectedTiles.push(tile);

    } else if (tile.getAttribute("fill", "darkgreen")) { // If already selected, deselect the tile
        tile.setAttribute("fill", "lightgreen");
        selectedTiles.splice(tile);
    }
    refreshMap(tile); // Refresh the map
}

/**
 * Converts a set of coordinates inside the SVG to one of 3 different outputs based on the requested mode
 * Mode 0 simply returns the tile index value at the selected location
 * Mode 1 returns the SVG rect element of the TILE at the selected index
 * Mode 2 returns the SVG circle element of the TOWER at the selected index
 * @param {number} mouseX The current mouse relative x position
 * @param {number} mouseY The current mouse relative y position
 * @param {number} type The function mode (0-2)
 * @returns map index value(int), rect element, or circle element, depending on mode
 */
function worldSpaceToIndex(mouseX, mouseY, mode) {
    // Calculate the X and Y index locations from the coordinates
    let levelX = Math.floor(mouseX / 50);
    let levelY = Math.floor(mouseY / 50);
    let index =  parseInt(String(levelX) + String(levelY)); // Convert the seperate X and Y index values into a single index value (conv. to string and concat, then back to integer)

    if (mode == 0) {
        return index;
    } else if (mode == 1) {
        return getTile(index);
    } else if (mode == 2) {
        return getTower(index);
    }
}

/**
 * Gets a tile rect element at a specific index
 * @param {number} index // The index location of the mouse click
 * @returns The rect element at the given index
 */
function getTile(index) {
    return mapRects[index];
}

/**
 * Gets a circle element from a tower at a specific index
 * @param {number} index // The index location of the mouse click
 * @returns The circle element of the tower at the given index
 */
function getTower(index) {
    for (i = 0; i < towers.length; i++) {
        if (towers[i].tileIndex == index) {
            return towers[i].circle;
        }
    }
    // If no tower is found at the location, return null
    return;
}

/**
 * Listen for left clicks
 */
document.addEventListener("click", (event) => {
    // Get the current mouse position relative to the game window
    let mouseX = event.clientX - canvas.getBoundingClientRect().left;
    let mouseY = event.clientY - canvas.getBoundingClientRect().top;
    // Get the tile at the index where we clicked
    let selectedObj = worldSpaceToIndex(mouseX, mouseY, 1);
    if (selectedObj != null) { // If there's a tile there, select it
        selectTile(selectedObj);
    }
});

/**
 * Listen for right clicks
 */
document.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    // Get the current mouse position relative to the game window
    let mouseX = event.clientX - canvas.getBoundingClientRect().left;
    let mouseY = event.clientY - canvas.getBoundingClientRect().top;
    // Get the tower at the index where we clicked
    let selectedObj = worldSpaceToIndex(mouseX, mouseY, 2);
    if (selectedObj != null) { // If there's a tower there, select it
        selectTower(selectedObj);
    }
});

/**
 * Selects the tower we clicked on
 * @param {circle} tower // Circle element of the clicked tower
 */
function selectTower(tower) {

    totalCost = 0; // Clear the total upgrade cost

    // Find the tower that the circle we selected belongs to
    for (i = 0; i < towers.length; i++) {
        if (tower === towers[i].circle) {
            // If the tower isn't already selected, select it, and display a visual indicator for its max firing range
            if (towers[i].selected == false) {
                towers[i].selected = true;
                towers[i].rangeView = document.createElementNS(svgNS, "circle");
                towers[i].rangeView.setAttribute("cx", towers[i].location[0])
                towers[i].rangeView.setAttribute("cy", towers[i].location[1])
                towers[i].rangeView.setAttribute("r", towers[i].range)
                towers[i].rangeView.setAttribute("fill", "none")
                towers[i].rangeView.setAttribute("stroke", "red")
                towers[i].rangeView.setAttribute("stroke-width", "1")
                canvas.appendChild(towers[i].rangeView);
            } else { // If the was already selected, deselect it and remove the range visualizer
                towers[i].selected = false;
                towers[i].rangeView.remove();
            }
        }
    }
    // Find all selected towers and total their upgrade costs
    for (i = 0; i < towers.length; i++) {
        if (towers[i].selected  && towers[i].level != 9) {
            totalCost += towers[i].upgradeCost;
        }
    }
    upgradeButton.textContent = "Upgrade: $" + totalCost; // Display the cost to the user
}

/**
 * Start upgrading all selected towers, until we run out of money
 * 
 * I've done it this way to allow for panic upgrading of as many selected towers as possible if you don't have 
 * enough money to upgrade all selected towers, and don't have time to deselect enough towers to afford it all at once
 */
function upgradeTowers() {
    totalCost = 0;
    // Find all selected towers, upgrading them one at a time until we run out of money or all have been upgraded once
    for (i = 0; i < towers.length; i++) {
        if (towers[i].selected) {
            if (playerMoney >= towers[i].upgradeCost && towers[i].level < 9) {
                towers[i].damage += 3;
                towers[i].fireRate -= 100;
                towers[i].range += 25;
                playerMoney -= towers[i].upgradeCost; // Deduct the spent money
                towers[i].level++;
                towers[i].upgradeCost = 5 * towers[i].level; // Increase the upgrade cost of the tower
                // Update the range visualizer
                towers[i].circle.setAttribute("fill", colours[towers[i].level - 1])
                towers[i].rangeView.setAttribute("r", towers[i].range)
                
                updatePlayer(); // Refresh the player's info displays
            }
        }
    }
    // Calculate an updated total upgrade cost
    for (i = 0; i < towers.length; i++) {
        if (towers[i].selected && towers[i].level != 9) {
            totalCost += towers[i].upgradeCost;
        }
    }
    upgradeButton.textContent = "Upgrade: $" + totalCost;
}

/**
 * Refresh all map tiles, avoiding trails of highlighted tiles
 * @param {rect} hoveredRect Currently hovered rect element
 */
function refreshMap(hoveredRect) {
    for (let i = 0; i < mapRects.length; i++) {
        if (mapRects[i] !== hoveredRect && mapRects[i].getAttribute("fill") == "lightgreen") {
            mapRects[i].setAttribute("fill", "green");
        }
    }
}

/**
 * Place towers on all selected tiles (as many as money permits)
 * 
 * This operates similarly to the upgrade system, where it will place as many towers as it can until all selected tiles are filled or you run out of money
 * @param {rect[]} selectedTiles Array of currently selected map tiles
 */
function placeTowers(selectedTiles) {
    // Build a new tower object on every selected tile, as long as money allows
    for (let i = 0; i < selectedTiles.length; i++) {
        if (playerMoney >= 10) {
            let tower = {};

            // Create the tower body
            tower.circle = document.createElementNS(svgNS, "circle");
            tower.circle.setAttribute("cx", parseInt(selectedTiles[i].getAttribute("x")) + 25);
            tower.circle.setAttribute("cy", parseInt(selectedTiles[i].getAttribute("y")) + 25);
            tower.circle.setAttribute("r", 12);
            tower.circle.setAttribute("fill", "saddlebrown");
            tower.circle.setAttribute("stroke", "black");

            // Create the barrel
            tower.towerBarrel = document.createElementNS(svgNS, "line");
            tower.towerBarrel.setAttribute("x1", tower.circle.getAttribute("cx"));
            tower.towerBarrel.setAttribute("y1", tower.circle.getAttribute("cy"));
            tower.towerBarrel.setAttribute("x2", tower.circle.getAttribute("cx"));
            tower.towerBarrel.setAttribute("y2", parseInt(tower.circle.getAttribute("cy")) - 25);
            tower.towerBarrel.setAttribute("fill", "black");
            tower.towerBarrel.setAttribute("stroke", "black");
            tower.towerBarrel.setAttribute("stroke-width", "7");

            tower.damage = towerDamage;
            tower.range = towerRange;
            tower.fireRate = towerFireRate;
            tower.isLoaded = true;
            tower.target = null;
            tower.location = [tower.circle.getAttribute("cx"), tower.circle.getAttribute("cy")]; // Coordinate position
            tower.selected = false;
            tower.level = 1;
            tower.upgradeCost = 5 * tower.level;
            tower.tileIndex = worldSpaceToIndex(parseInt(selectedTiles[i].getAttribute("x")), parseInt(selectedTiles[i].getAttribute("y")), 0); // Map index position

            // Didn't realise this was possible...took a little while. When we fire, start a timeout to start our reload time.
            tower.startReload = function() {
                setTimeout(function() {
                        tower.isLoaded = true;
                    }, tower.fireRate);
                }

            playerMoney -= 10;
            
            // Reset selected tiles to original colour
            for (let i = 0; i < mapRects.length; i++) {
                if (mapRects[i].getAttribute("fill") == "darkgreen") {
                    mapRects[i].setAttribute("fill", "green");
                }
            }
            
            // Add the tower to the array of active towers, catalogue its position in the array, and add it to the DOM
            towers.push(tower);
            tower.index = towers.length - 1;
            canvas.appendChild(tower.towerBarrel);
            canvas.appendChild(tower.circle);
        }
    }
    // Clear selected tiles
    selectedTiles.length = 0;
    updatePlayer();
}

/**
 * Gets the range between 2 points
 * @param {number[]} point1 Coordinates of first point
 * @param {number[]} point2 Coordinates of second point
 * @returns range between two points(double)
 */
function getRange(point1, point2) {
    return Math.hypot(point2[0] - point1[0], point2[1] - point1[1]);
}

/**
 * Finds the point to draw the end of the tower's barrel to (getting this working right was one of the hardest parts of the entire project)
 * @param {number[]} point1 Coordinates of the tower
 * @param {number[]} point2 Coordinates of targetted enemy
 * @returns number[] Coordinates where the end of the barrel should be
 */
function calcBarrelPos(point1, point2) {
    // Get the differences in the x and y directions
    let dx = point2[0] - point1[0];
    let dy = point2[1] - point1[1];

    // Get the Euclidean distance between the two points
    let length = getRange(point1, point2);

    // Calculate a new point on the line between the tower and the enemy, 25 pixels from the tower center(end of the barrel)
    let newX = ((dx / length) * (length - 25)) + point1[0];
    let newY = ((dy / length) * (length - 25)) + point1[1];

    return [newX, newY]
}

/**
 * Update each tower's status (border colour if selected, current target data, fire if possible)
 */
function updateTowers() {

    // Make sure all towers are showing whether they are selected
    for (i = 0; i < towers.length; i++) {
        if (towers[i].selected) {
            towers[i].circle.setAttribute("stroke", "white");
        } else {
            towers[i].circle.setAttribute("stroke", "black");
        }
    }

    // Determine if there are enemies on screen
    if (activeEnemies.length != 0) {

        // For each tower,
        for (i = 0; i < towers.length; i++) {

            // Find the closest target
            let closestTarget = activeEnemies[0];
            for (j = 0; j < activeEnemies.length; j++) {
                if (getRange(activeEnemies[j].currentPosition, towers[i].location) < getRange(closestTarget, towers[i].location)) {
                    closestTarget = activeEnemies[j];
                }
            }

            // If the closest target is in range, set them as the active target and start tracking them with the barrel
            if (getRange(closestTarget.currentPosition, towers[i].location) < towers[i].range) {
                towers[i].target = closestTarget;
            } else {
                towers[i].target = null;
            }

            if (towers[i].target != null) {

                towers[i].towerBarrel.setAttribute("x2", calcBarrelPos(closestTarget.currentPosition, towers[i].location)[0]);
                towers[i].towerBarrel.setAttribute("y2", calcBarrelPos(closestTarget.currentPosition, towers[i].location)[1]);
                
                if (towers[i].isLoaded) { // If we're loaded and have a target, fire a shot from the tip of the barrel to the enemy
                    let shot = document.createElementNS(svgNS, "line")
                    shot.setAttribute("x1", calcBarrelPos(closestTarget.currentPosition, towers[i].location)[0]);
                    shot.setAttribute("y1", calcBarrelPos(closestTarget.currentPosition, towers[i].location)[1]);
                    shot.setAttribute("x2", towers[i].target.circle.getAttribute("cx"));
                    shot.setAttribute("y2", towers[i].target.circle.getAttribute("cy"));
                    shot.setAttribute("fill", "yellow");
                    shot.setAttribute("stroke", "yellow");
                    shot.setAttribute("stroke-width", "3");

                    canvas.appendChild(shot);
                    towers[i].target.health -= towers[i].damage; // Damage the enemy
                    // Delete the shot graphic after 50ms
                    setTimeout(function() {
                        shot.remove();
                    }, 50);
                    // Set the gun to unloaded, and start the reload process
                    towers[i].isLoaded = false;
                    towers[i].startReload();
                }
            }
        }
    }
}

/**
 * Update each active enemy's status(position, next waypoint, health/death)
 */
function updateEnemies() {
    let enemies = document.querySelectorAll("#enemy");
    if (enemies.length > 0) {
        // Loop through each enemy
        for (let i = 0; i < enemies.length; i++) {

            // Update ther movement direction and position of the enemy
            if (activeEnemies[i] != null) {
                if (activeEnemies[i].currentPosition[0] <= activeEnemies[i].targetPosition[0]) { // Move right
                activeEnemies[i].currentPosition[0] += enemySpeed;
                } else if (activeEnemies[i].currentPosition[1] < activeEnemies[i].targetPosition[1]) { // Move down
                    activeEnemies[i].currentPosition[1] += enemySpeed;
                } else if (activeEnemies[i].currentPosition[1] > activeEnemies[i].targetPosition[1]) { // Move up
                    activeEnemies[i].currentPosition[1] -= enemySpeed;
                }

                // If weve reached the target position, set the next target position
                if (closeEnough(activeEnemies[i].currentPosition[0], activeEnemies[i].targetPosition[0]) && closeEnough(activeEnemies[i].currentPosition[1], activeEnemies[i].targetPosition[1])) {
                    activeEnemies[i].targetPosition = indexToCoordinates(trackPath[activeEnemies[i].pathIndex + 1]); // Set the next target position
                    activeEnemies[i].pathIndex++; // Increment the path index
                }
                
                // Update the enemy's shown position on the DOM
                activeEnemies[i].circle.setAttribute("cx", activeEnemies[i].currentPosition[0]);
                activeEnemies[i].circle.setAttribute("cy", activeEnemies[i].currentPosition[1]);

                // Change the enemy's colour based on remaining health
                if (activeEnemies[i].health < activeEnemies[i].maxHealth / 2 && activeEnemies[i].health > activeEnemies[i].maxHealth / 3) { // If the enemy is below 1/2 health, change colour to darkred
                    activeEnemies[i].circle.setAttribute("fill", "darkred");
                } else if (activeEnemies[i].health < activeEnemies[i].maxHealth / 4 && activeEnemies[i].circle.getAttribute("fill") != "black") { // If the enemy is below a 1/4 health, change colour to black
                    activeEnemies[i].circle.setAttribute("fill", "black");
                }
                if (activeEnemies[i].health <= 0) { // If the enemy is dead, remove it and give the player some money
                    activeEnemies[i].circle.remove();
                    activeEnemies.splice(i, 1);
                    playerMoney += 10;
                    updatePlayer();
                }
            }
        }

        for (let i = 0; i < activeEnemies.length; i++) {
            if (activeEnemies[i].targetPosition[0] == 500 && activeEnemies[i].targetPosition[1] == 500) { // Remove the enemy if it reaches the end of the track, and damage the player
                activeEnemies[i].circle.remove();
                activeEnemies.splice(i, 1);
                damagePlayer();
                updatePlayer();
            }
        }
    }
}

/**
 * Function to check if 2 points are "close enough" together to consider them having reached eachother.
 * This became necessary after higher enemy speeds at higher difficulties started to cause enemies to miss their
 * waypoint by a couple of pixels, causing them to get stuck.
 * @param {*} pos1 The enemy's current position
 * @param {*} pos2 The enemy's target position
 * @returns boolean, if enemy is "close enough" to their objective or not
 */
function closeEnough(pos1, pos2) {
    return Math.abs(pos1 - pos2) < 2;
}

/**
 * Converts a track path index to pixel coordinates
 * @param {number} index The given map tile index
 * @returns number[] Coordinates relative to the canvas
 */
function indexToCoordinates(index) {
    // If we're in the leftmost row, ensure x is 0, otherwise parse the first digit
    // Without this, x becomes the same as y due to their only being 1 digit in the index.
    if (index <= 99) {
        if (index.toString().length == 1) {
        x = 0;
        } else {
            x = parseInt(index.toString().charAt(0))
        }
        y = index % width
        return [x * 50 + 25, y * 50 + 25]; // Convert to pixel coordinates (center of the tile)
    } else {
        return [500, 500]; // Position to trigger deletion when the enemy reaches the end of the track
    }
}

/**
 * Spawns in a new enemy
 */
function spawnEnemy() {
    // Create a new enemy object and set their SVG parameters and stats
    let enemy = {};
    enemy.circle = document.createElementNS(svgNS, "circle");
    
    y = trackPath[0] % width
    let spawnPos = indexToCoordinates(trackPath[0]); // Center the enemy in the tile

    enemy.circle.setAttribute("cx", spawnPos[0]);
    enemy.circle.setAttribute("cy", spawnPos[1]);
    enemy.circle.setAttribute("r", 10);
    enemy.circle.setAttribute("fill", "red");
    enemy.circle.setAttribute("stroke", "black");
    enemy.circle.setAttribute("id", "enemy"); // Unique ID for each enemy


    enemy.currentPosition = spawnPos; // Set the initial position
    enemy.nextPosition = indexToCoordinates(trackPath[0]); // Set the next position in the track path
    enemy.targetPosition = indexToCoordinates(trackPath[1]); // Set the target position for the first move
    enemy.health = enemyHealth + waveCount; // Starting health
    enemy.maxHealth = enemyHealth + waveCount; // Maximum health
    enemy.speed = enemySpeed;
    enemy.pathIndex = 0; // Start at the beginning of the track path

    activeEnemies.push(enemy);
    canvas.appendChild(enemy.circle);
}

/**
 * Starts the next wave of enemies
 */
function startNextWave() {

    // Update status of buttons
    trackButton.classList.add("disabled");
    easyButton.classList.add("disabled");
    mediumButton.classList.add("disabled");
    hardButton.classList.add("disabled");
    hardcoreButton.classList.add("disabled");
    resetButton.classList.remove("disabled");

    // Increment the current wave
    waveCount++;
    waveDisplay.textContent = "Current Wave: " + waveCount;

    let enemiesToSpawn = waveCount * enemyCountMultipler; // Increase the number of enemies each wave

    let scaledRate = enemySpawnRate * (1 - (waveCount / 30)) // Scale the spawnrate so later waves have enemies spawning faster
    
    // Lock minimum spawnrates to ensure it never gets too crazy
    if (currentDifficulty == 0) {
        if (scaledRate < 1000) {
            scaledRate = 1000;
        }
    } else if (currentDifficulty == 1) {
        if (scaledRate < 500) {
            scaledRate = 500;
        }
    } else if (currentDifficulty == 2) {
        if (scaledRate < 100) {
            scaledRate = 100;
        }
    }
    
    // Start spawning enemies at the given interval
    waveInterval = setInterval(function() {
        if (enemiesToSpawn > 0) {
            spawnEnemy();
            enemiesToSpawn--;
        } else {
            clearInterval(this); // Stop spawning when the wave is complete
        }
    }, scaledRate);
}

/**
 * Reduce player health by 1
 */
function damagePlayer() {
    playerHealth--;
}

/**
 * Update all info displays for the user
 */
function updatePlayer() {
    if (playerHealth >= 0) {
        healthDisplay.textContent = "Health: " + playerHealth;
        heartsDisplay.textContent = "♥".repeat(playerHealth);
        moneyDisplay.textContent = "$" + playerMoney;
    }
    // If the user runs out of health, end the game
    if (playerHealth <= 0) {
        heartsDisplay.textContent = "💀";
        gameOver();
    }
}

/**
 * End the game by disabling the ability to start another wave
 */
function gameOver() {
    startButton.classList.add("disabled");
}

// Startup Routine
drawLevel();
drawShop();

// Update Routine
setInterval( function() {
    updateEnemies();
    updateTowers();
}, 16.6);