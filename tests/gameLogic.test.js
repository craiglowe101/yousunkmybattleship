const {
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
} = require('../src/gameLogic');

// ─────────────────────────────────────────────────────────────────────────────
// Board Management
// ─────────────────────────────────────────────────────────────────────────────

describe('createEmptyBoard', () => {
    it('creates a 10x10 board filled with null', () => {
        const board = createEmptyBoard();
        expect(board.length).toBe(BOARD_SIZE);
        board.forEach(row => {
            expect(row.length).toBe(BOARD_SIZE);
            row.forEach(cell => expect(cell).toBeNull());
        });
    });

    it('returns independent rows (mutating one does not affect others)', () => {
        const board = createEmptyBoard();
        board[0][0] = { ship: 'Test' };
        expect(board[1][0]).toBeNull();
    });
});

describe('createShips', () => {
    it('returns 5 ships with correct properties', () => {
        const ships = createShips();
        expect(ships).toHaveLength(5);
        ships.forEach(ship => {
            expect(ship).toHaveProperty('name');
            expect(ship).toHaveProperty('size');
            expect(ship.placed).toBe(false);
            expect(ship.hits).toBe(0);
        });
    });

    it('does not share references with the SHIPS constant', () => {
        const ships = createShips();
        ships[0].hits = 3;
        const ships2 = createShips();
        expect(ships2[0].hits).toBe(0);
    });
});

describe('isValidCell', () => {
    it('returns true for all cells within the board', () => {
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                expect(isValidCell(r, c)).toBe(true);
            }
        }
    });

    it('returns false for negative row', () => {
        expect(isValidCell(-1, 0)).toBe(false);
    });

    it('returns false for negative column', () => {
        expect(isValidCell(0, -1)).toBe(false);
    });

    it('returns false for row equal to BOARD_SIZE', () => {
        expect(isValidCell(BOARD_SIZE, 0)).toBe(false);
    });

    it('returns false for column equal to BOARD_SIZE', () => {
        expect(isValidCell(0, BOARD_SIZE)).toBe(false);
    });

    it('returns false for row beyond BOARD_SIZE', () => {
        expect(isValidCell(15, 5)).toBe(false);
    });

    it('returns true for corner cells', () => {
        expect(isValidCell(0, 0)).toBe(true);
        expect(isValidCell(0, 9)).toBe(true);
        expect(isValidCell(9, 0)).toBe(true);
        expect(isValidCell(9, 9)).toBe(true);
    });
});

describe('getShipCells', () => {
    it('returns correct cells for horizontal placement', () => {
        const cells = getShipCells(2, 3, 4, true);
        expect(cells).toEqual([[2, 3], [2, 4], [2, 5], [2, 6]]);
    });

    it('returns correct cells for vertical placement', () => {
        const cells = getShipCells(2, 3, 4, false);
        expect(cells).toEqual([[2, 3], [3, 3], [4, 3], [5, 3]]);
    });

    it('returns single cell for size 1', () => {
        const cells = getShipCells(5, 5, 1, true);
        expect(cells).toEqual([[5, 5]]);
    });

    it('returns cells that may go off-board (validation is separate)', () => {
        const cells = getShipCells(0, 8, 5, true);
        expect(cells).toHaveLength(5);
        expect(cells[4]).toEqual([0, 12]);
    });

    it('returns correct number of cells for each ship size', () => {
        SHIPS.forEach(ship => {
            const cells = getShipCells(0, 0, ship.size, true);
            expect(cells).toHaveLength(ship.size);
        });
    });
});

describe('canPlaceShip', () => {
    let board;

    beforeEach(() => {
        board = createEmptyBoard();
    });

    it('allows placement on an empty board within bounds (horizontal)', () => {
        expect(canPlaceShip(board, 0, 0, 5, true)).toBe(true);
    });

    it('allows placement on an empty board within bounds (vertical)', () => {
        expect(canPlaceShip(board, 0, 0, 5, false)).toBe(true);
    });

    it('rejects placement that goes off the right edge', () => {
        expect(canPlaceShip(board, 0, 8, 5, true)).toBe(false);
    });

    it('rejects placement that goes off the bottom edge', () => {
        expect(canPlaceShip(board, 8, 0, 5, false)).toBe(false);
    });

    it('rejects placement that overlaps an existing ship', () => {
        placeShip(board, 3, 3, 3, true, 'Cruiser');
        expect(canPlaceShip(board, 3, 4, 2, false)).toBe(false);
    });

    it('allows placement adjacent to an existing ship', () => {
        placeShip(board, 3, 3, 3, true, 'Cruiser');
        expect(canPlaceShip(board, 4, 3, 3, true)).toBe(true);
    });

    it('allows placement at the edge of the board', () => {
        expect(canPlaceShip(board, 0, 5, 5, true)).toBe(true);
        expect(canPlaceShip(board, 5, 0, 5, false)).toBe(true);
    });

    it('rejects single-cell placement on an occupied cell', () => {
        board[5][5] = { ship: 'Test', hit: false };
        expect(canPlaceShip(board, 5, 5, 1, true)).toBe(false);
    });
});

describe('placeShip', () => {
    let board;

    beforeEach(() => {
        board = createEmptyBoard();
    });

    it('places a ship horizontally on the board', () => {
        placeShip(board, 0, 0, 3, true, 'Cruiser');
        expect(board[0][0]).toEqual({ ship: 'Cruiser', hit: false });
        expect(board[0][1]).toEqual({ ship: 'Cruiser', hit: false });
        expect(board[0][2]).toEqual({ ship: 'Cruiser', hit: false });
        expect(board[0][3]).toBeNull();
    });

    it('places a ship vertically on the board', () => {
        placeShip(board, 2, 4, 4, false, 'Battleship');
        expect(board[2][4]).toEqual({ ship: 'Battleship', hit: false });
        expect(board[3][4]).toEqual({ ship: 'Battleship', hit: false });
        expect(board[4][4]).toEqual({ ship: 'Battleship', hit: false });
        expect(board[5][4]).toEqual({ ship: 'Battleship', hit: false });
        expect(board[6][4]).toBeNull();
    });

    it('does not affect cells outside the ship', () => {
        placeShip(board, 5, 5, 2, true, 'Destroyer');
        expect(board[5][4]).toBeNull();
        expect(board[5][7]).toBeNull();
        expect(board[4][5]).toBeNull();
        expect(board[6][5]).toBeNull();
    });
});

describe('placeShipsRandomly', () => {
    it('places all ships on the board', () => {
        const board = createEmptyBoard();
        const ships = createShips();
        placeShipsRandomly(board, ships);

        // Count total ship cells
        let shipCells = 0;
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (board[r][c]?.ship) shipCells++;
            }
        }
        const expectedCells = SHIPS.reduce((sum, s) => sum + s.size, 0);
        expect(shipCells).toBe(expectedCells);
    });

    it('places ships without overlaps', () => {
        const board = createEmptyBoard();
        const ships = createShips();
        placeShipsRandomly(board, ships);

        const shipCellNames = [];
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (board[r][c]?.ship) {
                    shipCellNames.push(`${r},${c}`);
                }
            }
        }
        const unique = new Set(shipCellNames);
        expect(unique.size).toBe(shipCellNames.length);
    });

    it('all placed cells are within board bounds', () => {
        const board = createEmptyBoard();
        const ships = createShips();
        placeShipsRandomly(board, ships);

        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (board[r][c]?.ship) {
                    expect(isValidCell(r, c)).toBe(true);
                }
            }
        }
    });

    it('produces different layouts on repeated calls', () => {
        const boards = [];
        for (let i = 0; i < 5; i++) {
            const board = createEmptyBoard();
            const ships = createShips();
            placeShipsRandomly(board, ships);
            boards.push(JSON.stringify(board));
        }
        const unique = new Set(boards);
        expect(unique.size).toBeGreaterThan(1);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Attack Logic
// ─────────────────────────────────────────────────────────────────────────────

describe('attack', () => {
    let board;
    let ships;

    beforeEach(() => {
        board = createEmptyBoard();
        ships = [{ name: 'Destroyer', size: 2, placed: true, hits: 0 }];
        placeShip(board, 0, 0, 2, true, 'Destroyer');
    });

    it('returns hit:true when attacking a ship cell', () => {
        const result = attack(board, 0, 0, ships);
        expect(result.hit).toBe(true);
        expect(result.ship).toBe('Destroyer');
        expect(result.sunk).toBe(false);
    });

    it('marks the cell as hit', () => {
        attack(board, 0, 0, ships);
        expect(board[0][0].hit).toBe(true);
    });

    it('increments ship.hits on a hit', () => {
        attack(board, 0, 0, ships);
        expect(ships[0].hits).toBe(1);
    });

    it('returns hit:false and marks miss when attacking empty cell', () => {
        const result = attack(board, 5, 5, ships);
        expect(result.hit).toBe(false);
        expect(board[5][5]).toEqual({ miss: true });
    });

    it('returns sunk:true when the last cell of a ship is hit', () => {
        attack(board, 0, 0, ships);
        const result = attack(board, 0, 1, ships);
        expect(result.sunk).toBe(true);
        expect(result.ship).toBe('Destroyer');
    });

    it('marks all cells as sunk when a ship is sunk', () => {
        attack(board, 0, 0, ships);
        attack(board, 0, 1, ships);
        expect(board[0][0].sunk).toBe(true);
        expect(board[0][1].sunk).toBe(true);
    });

    it('returns hit:false for out-of-bounds attack', () => {
        const result = attack(board, -1, 0, ships);
        expect(result.hit).toBe(false);
        expect(result.sunk).toBe(false);
    });

    it('handles attack on cell with unknown ship name gracefully', () => {
        board[5][5] = { ship: 'Unknown', hit: false };
        const result = attack(board, 5, 5, ships);
        expect(result.hit).toBe(true);
        expect(result.sunk).toBe(false);
    });
});

describe('markSunk', () => {
    it('marks all cells of a named ship as sunk', () => {
        const board = createEmptyBoard();
        placeShip(board, 2, 2, 3, true, 'Cruiser');
        placeShip(board, 5, 5, 2, false, 'Destroyer');

        markSunk(board, 'Cruiser');

        expect(board[2][2].sunk).toBe(true);
        expect(board[2][3].sunk).toBe(true);
        expect(board[2][4].sunk).toBe(true);
        expect(board[5][5].sunk).toBeUndefined();
    });

    it('does nothing if ship name is not on the board', () => {
        const board = createEmptyBoard();
        placeShip(board, 0, 0, 2, true, 'Destroyer');
        markSunk(board, 'Nonexistent');
        expect(board[0][0].sunk).toBeUndefined();
    });
});

describe('checkWin', () => {
    it('returns false when no ships are sunk', () => {
        const ships = createShips();
        expect(checkWin(ships)).toBe(false);
    });

    it('returns false when some ships are partially hit', () => {
        const ships = createShips();
        ships[0].hits = 3; // Carrier has size 5
        expect(checkWin(ships)).toBe(false);
    });

    it('returns false when some but not all ships are sunk', () => {
        const ships = createShips();
        ships[4].hits = ships[4].size; // Destroyer sunk
        expect(checkWin(ships)).toBe(false);
    });

    it('returns true when all ships are fully hit', () => {
        const ships = createShips();
        ships.forEach(ship => { ship.hits = ship.size; });
        expect(checkWin(ships)).toBe(true);
    });

    it('returns true for an empty ships array', () => {
        expect(checkWin([])).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Bomb Mechanics
// ─────────────────────────────────────────────────────────────────────────────

describe('getBombCells', () => {
    it('returns 9 cells for a center-board target', () => {
        const cells = getBombCells(5, 5);
        expect(cells).toHaveLength(9);
        expect(cells).toContainEqual([4, 4]);
        expect(cells).toContainEqual([4, 5]);
        expect(cells).toContainEqual([4, 6]);
        expect(cells).toContainEqual([5, 4]);
        expect(cells).toContainEqual([5, 5]);
        expect(cells).toContainEqual([5, 6]);
        expect(cells).toContainEqual([6, 4]);
        expect(cells).toContainEqual([6, 5]);
        expect(cells).toContainEqual([6, 6]);
    });

    it('returns 4 cells for a corner target (0,0)', () => {
        const cells = getBombCells(0, 0);
        expect(cells).toHaveLength(4);
        expect(cells).toContainEqual([0, 0]);
        expect(cells).toContainEqual([0, 1]);
        expect(cells).toContainEqual([1, 0]);
        expect(cells).toContainEqual([1, 1]);
    });

    it('returns 4 cells for a corner target (9,9)', () => {
        const cells = getBombCells(9, 9);
        expect(cells).toHaveLength(4);
        expect(cells).toContainEqual([8, 8]);
        expect(cells).toContainEqual([8, 9]);
        expect(cells).toContainEqual([9, 8]);
        expect(cells).toContainEqual([9, 9]);
    });

    it('returns 6 cells for an edge target (0,5)', () => {
        const cells = getBombCells(0, 5);
        expect(cells).toHaveLength(6);
    });

    it('returns 6 cells for an edge target (5,0)', () => {
        const cells = getBombCells(5, 0);
        expect(cells).toHaveLength(6);
    });

    it('only returns valid cells', () => {
        const cells = getBombCells(0, 0);
        cells.forEach(([r, c]) => {
            expect(isValidCell(r, c)).toBe(true);
        });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// AI Logic
// ─────────────────────────────────────────────────────────────────────────────

describe('hardAIPick', () => {
    it('returns a potential target when in hunt mode with targets available', () => {
        const board = createEmptyBoard();
        const ships = createShips();
        const visited = new Set();
        const targets = [{ row: 3, col: 4 }, { row: 5, col: 6 }];

        const result = hardAIPick(board, ships, visited, true, targets);
        expect(result).toEqual({ row: 3, col: 4 });
        expect(targets).toHaveLength(1);
    });

    it('uses probability density when not in hunt mode', () => {
        const board = createEmptyBoard();
        const ships = createShips();
        const visited = new Set();

        const result = hardAIPick(board, ships, visited, false, []);
        expect(result).not.toBeNull();
        expect(result).toHaveProperty('row');
        expect(result).toHaveProperty('col');
        expect(isValidCell(result.row, result.col)).toBe(true);
    });

    it('does not pick already-visited cells', () => {
        const board = createEmptyBoard();
        const ships = [{ name: 'Destroyer', size: 2, placed: true, hits: 0 }];
        placeShip(board, 0, 0, 2, true, 'Destroyer');

        const visited = new Set();
        // Visit all cells except (0,0)
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (r !== 0 || c !== 0) {
                    visited.add(`${r},${c}`);
                }
            }
        }

        const result = hardAIPick(board, ships, visited, false, []);
        expect(result).toEqual({ row: 0, col: 0 });
    });

    it('returns null when all cells have been visited', () => {
        const board = createEmptyBoard();
        const ships = createShips();
        const visited = new Set();
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                visited.add(`${r},${c}`);
            }
        }

        const result = hardAIPick(board, ships, visited, false, []);
        expect(result).toBeNull();
    });

    it('prefers cells with higher ship placement probability', () => {
        const board = createEmptyBoard();
        // Only one small ship remaining
        const ships = [{ name: 'Destroyer', size: 2, placed: true, hits: 0 }];
        const visited = new Set();

        // Visit most of the board, leaving a few cells
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (!(r === 4 && (c === 4 || c === 5)) && !(r === 0 && c === 0)) {
                    visited.add(`${r},${c}`);
                }
            }
        }

        const result = hardAIPick(board, ships, visited, false, []);
        expect(result).not.toBeNull();
        // Should pick from the adjacent pair (4,4)/(4,5) since they form a valid placement
        expect([
            JSON.stringify({ row: 4, col: 4 }),
            JSON.stringify({ row: 4, col: 5 })
        ]).toContain(JSON.stringify(result));
    });

    it('falls back to density pick when hunt mode is true but targets are empty', () => {
        const board = createEmptyBoard();
        const ships = createShips();
        const visited = new Set();

        const result = hardAIPick(board, ships, visited, true, []);
        expect(result).not.toBeNull();
        expect(isValidCell(result.row, result.col)).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Integration-style tests
// ─────────────────────────────────────────────────────────────────────────────

describe('full game flow', () => {
    it('can play through a complete game until checkWin is true', () => {
        const board = createEmptyBoard();
        const ships = createShips();
        placeShipsRandomly(board, ships);

        // Attack every cell until all ships are sunk
        for (let r = 0; r < BOARD_SIZE && !checkWin(ships); r++) {
            for (let c = 0; c < BOARD_SIZE && !checkWin(ships); c++) {
                attack(board, r, c, ships);
            }
        }

        expect(checkWin(ships)).toBe(true);
    });

    it('bomb attack can sink a ship in one blow', () => {
        const board = createEmptyBoard();
        const ships = [{ name: 'Destroyer', size: 2, placed: true, hits: 0 }];
        placeShip(board, 5, 5, 2, true, 'Destroyer');

        // Bomb centered at (5,5) covers (4,4)-(6,6), hitting (5,5) and (5,6)
        const bombCells = getBombCells(5, 5);
        bombCells.forEach(([r, c]) => {
            if (!board[r][c]?.hit && !board[r][c]?.miss) {
                attack(board, r, c, ships);
            }
        });

        expect(checkWin(ships)).toBe(true);
        expect(ships[0].hits).toBe(2);
    });
});
