import { GameState, Board, Coord } from "./types"

export class BoardMarks {
    tiles: Record<string,string[]>
    gameState: GameState

    constructor(gameState: GameState) {
        this.tiles = {}
        this.gameState = gameState
        const isWrapped = gameState.game.ruleset.name === 'wrapped'
        const { width, height } = gameState.board
        const directionHeight = isWrapped ? height : 0
        const directionWidth = isWrapped ? width : 0

        // Mark food
        gameState.board.food.forEach((food) => {
            this.markTile(food, 'food')
        })
        // Mark hazard
        gameState.board.hazards.forEach((hazard) => {
            this.markTile(hazard, 'hazard')
        })
        // Mark around scary snakes
        gameState.board.snakes
        .filter((snake) => snake.length > gameState.you.length)
        .forEach((snake) => {
            this.markTile(up(snake.head, 1, directionHeight), 'scary')
            this.markTile(right(snake.head, 1, directionHeight), 'scary')
            this.markTile(down(snake.head, 1, directionHeight), 'scary')
            this.markTile(left(snake.head, 1, directionHeight), 'scary')
        })
        // Mark around yummy snakes
        gameState.board.snakes
        .filter((snake) => snake.length < gameState.you.length)
        .forEach((snake) => {
            this.markTile(up(snake.head, 1, directionHeight), 'yummy')
            this.markTile(right(snake.head, 1, directionHeight), 'yummy')
            this.markTile(down(snake.head, 1, directionHeight), 'yummy')
            this.markTile(left(snake.head, 1, directionHeight), 'yummy')
        })
        
    }

    markTile(coord: Coord, mark: string) {
        const key = coordKey(coord)
        if (!this.tiles[key]) this.tiles[key] = []
        this.tiles[key].push(mark)
    }

    getMarks(coord: Coord): string[] {
        return this.tiles[coordKey(coord)] || []
    }
}

export function coordDistance(a: Coord, b: Coord, width: number = 0, height: number = 0) {
    let dx = Math.abs(b.x - a.x)
    let dy = Math.abs(b.y - a.y)

    // Wrapped boards
    if (width > 0 && height > 0) {
        if (dx > width / 2) {
            dx = width - dx
        }
        if (dy > height / 2) {
            dy = height - dy
        }
    }

    // Tile distance
    return dx + dy
}

export function coordEqual(a: Coord, b: Coord) {
    return a.x === b.x && a.y === b.y
}

export function isAdjacent(a: Coord, b: Coord): boolean {
    // BEWARE: This doesn't work on wrapped boards
    return coordDistance(a, b) === 1
}

export function hasFood(gameState: GameState, coord: Coord) {
    return gameState.board.food.some((food) => {
        return food.x === coord.x && food.y === coord.y
    })
}

export function up(coord: Coord, distance: number = 1, height: number = 0): Coord {
    const result = { ...coord } 
    result.y = coord.y + distance
    if (height) result.y = result.y % height
    return result
}
export function down(coord: Coord, distance: number = 1, height: number = 0): Coord {
    const result = { ...coord } 
    result.y = coord.y - distance
    if (height) result.y = (result.y + height) % height
    return result
}
export function right(coord: Coord, distance: number = 1, width: number = 0): Coord {
    const result = { ...coord } 
    result.x = coord.x + distance
    if (width) result.x = result.x % width
    return result
}
export function left(coord: Coord, distance: number = 1, width: number = 0): Coord {
    const result = { ...coord } 
    result.x = coord.x - distance
    if (width) result.x = (result.x + width) % width
    return result
}

export function coordKey(coord: Coord) {
    return `${coord.x},${coord.y}`
}