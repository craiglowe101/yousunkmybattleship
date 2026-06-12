// Game Constants
const BOARD_SIZE = 10;
const SHIPS = [
    { name: 'Carrier', size: 5 },
    { name: 'Battleship', size: 4 },
    { name: 'Cruiser', size: 3 },
    { name: 'Submarine', size: 3 },
    { name: 'Destroyer', size: 2 }
];

function createEmptyBoard() {
    return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
}

function createShips() {
    return SHIPS.map(ship => ({ ...ship, placed: false, hits: 0 }));
}

function isValidCell(row, col) {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function getShipCells(row, col, size, horizontal) {
    const cells = [];
    for (let i = 0; i < size; i++) {
        if (horizontal) {
            cells.push([row, col + i]);
        } else {
            cells.push([row + i, col]);
        }
    }
    return cells;
}

function canPlaceShip(board, row, col, size, horizontal) {
    const cells = getShipCells(row, col, size, horizontal);
    return cells.every(([r, c]) => isValidCell(r, c) && !board[r][c]?.ship);
}

function placeShip(board, row, col, size, horizontal, name) {
    const cells = getShipCells(row, col, size, horizontal);
    cells.forEach(([r, c]) => {
        board[r][c] = { ship: name, hit: false };
    });
}

function placeShipsRandomly(board, ships) {
    ships.forEach(ship => {
        let placed = false;
        let attempts = 0;
        const maxAttempts = 1000;
        while (!placed && attempts < maxAttempts) {
            attempts++;
            const row = Math.floor(Math.random() * BOARD_SIZE);
            const col = Math.floor(Math.random() * BOARD_SIZE);
            const horizontal = Math.random() > 0.5;

            if (canPlaceShip(board, row, col, ship.size, horizontal)) {
                placeShip(board, row, col, ship.size, horizontal, ship.name);
                placed = true;
            }
        }
        if (!placed) {
            throw new Error(`Failed to place ${ship.name} after ${maxAttempts} attempts`);
        }
    });
}

function attack(board, row, col, ships) {
    if (!isValidCell(row, col)) {
        return { hit: false, sunk: false };
    }

    const cell = board[row][col];

    if (cell?.ship) {
        cell.hit = true;
        const ship = ships.find(s => s.name === cell.ship);
        if (!ship) {
            return { hit: true, ship: cell.ship, sunk: false };
        }
        ship.hits++;

        const isSunk = ship.hits >= ship.size;
        if (isSunk) {
            markSunk(board, ship.name);
        }

        return { hit: true, ship: cell.ship, sunk: isSunk };
    } else {
        board[row][col] = { miss: true };
        return { hit: false, sunk: false };
    }
}

function markSunk(board, shipName) {
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            if (board[row][col]?.ship === shipName) {
                board[row][col].sunk = true;
            }
        }
    }
}

function checkWin(ships) {
    return ships.every(ship => ship.hits === ship.size);
}

function getBombCells(row, col) {
    const cells = [];
    for (let r = row - 1; r <= row + 1; r++) {
        for (let c = col - 1; c <= col + 1; c++) {
            if (isValidCell(r, c)) cells.push([r, c]);
        }
    }
    return cells;
}

function hardAIPick(playerBoard, playerShips, aiVisitedCells, aiHuntMode, aiPotentialTargets) {
    // If there are known hit cells not yet sunk, target them first
    if (aiHuntMode && aiPotentialTargets.length > 0) {
        return aiPotentialTargets.shift();
    }

    // Build probability density grid
    const density = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0));
    const remainingShips = playerShips.filter(s => s.hits < s.size);

    for (const ship of remainingShips) {
        // Horizontal placements
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c <= BOARD_SIZE - ship.size; c++) {
                const cells = getShipCells(r, c, ship.size, true);
                const valid = cells.every(([cr, cc]) => !aiVisitedCells.has(`${cr},${cc}`) || playerBoard[cr][cc]?.hit);
                if (valid) cells.forEach(([cr, cc]) => density[cr][cc]++);
            }
        }
        // Vertical placements
        for (let r = 0; r <= BOARD_SIZE - ship.size; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const cells = getShipCells(r, c, ship.size, false);
                const valid = cells.every(([cr, cc]) => !aiVisitedCells.has(`${cr},${cc}`) || playerBoard[cr][cc]?.hit);
                if (valid) cells.forEach(([cr, cc]) => density[cr][cc]++);
            }
        }
    }

    // Zero out already-visited cells
    for (const key of aiVisitedCells) {
        const [r, c] = key.split(',').map(Number);
        if (!playerBoard[r][c]?.hit) density[r][c] = 0;
    }

    // Pick highest density unvisited cell
    let bestScore = -1;
    let bestCells = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (!aiVisitedCells.has(`${r},${c}`)) {
                if (density[r][c] > bestScore) {
                    bestScore = density[r][c];
                    bestCells = [{ row: r, col: c }];
                } else if (density[r][c] === bestScore) {
                    bestCells.push({ row: r, col: c });
                }
            }
        }
    }
    if (bestCells.length === 0) {
        return null;
    }
    return bestCells[Math.floor(Math.random() * bestCells.length)];
}

module.exports = {
    BOARD_SIZE,
    SHIPS,
    createEmptyBoard,
    createShips,
    isValidCell,
    getShipCells,
    canPlaceShip,
    placeShip,
    placeShipsRandomly,
    attack,
    markSunk,
    checkWin,
    getBombCells,
    hardAIPick
};
