import { GameState, Board, Coord } from "./types"

type Tile = {
    name: string
    ttl: number
}

export class BoardMarks {
    tiles: Record<string,Tile[]>
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
        
        gameState.board.snakes
        .forEach((snake) => {
            // Fill the snake positions
            snake.body.forEach((segment, i) => {
                this.markTile(segment, 'snake', snake.body.length - i)
            })
            if (snake.length > gameState.you.length) {
                this.markTile(up(snake.head, 1, directionHeight), 'scary')
                this.markTile(right(snake.head, 1, directionHeight), 'scary')
                this.markTile(down(snake.head, 1, directionHeight), 'scary')
                this.markTile(left(snake.head, 1, directionHeight), 'scary')
            }
            // .filter((snake) => snake.length > gameState.you.length)
            if (snake.length < gameState.you.length) {
                this.markTile(up(snake.head, 1, directionHeight), 'yummy')
                this.markTile(right(snake.head, 1, directionHeight), 'yummy')
                this.markTile(down(snake.head, 1, directionHeight), 'yummy')
                this.markTile(left(snake.head, 1, directionHeight), 'yummy')
            }
        })

    }

    markTile(coord: Coord, name: string, ttl: number = -1) {
        const key = coordKey(coord)
        if (!this.tiles[key]) this.tiles[key] = []
        this.tiles[key].push({ name, ttl })
    }

    getMarks(coord: Coord): Tile[] {
        return this.tiles[coordKey(coord)] || []
    }

    hasMark(coord: Coord, type: string): boolean {
        const marks = this.getMarks(coord)
        return marks.some((mark) => mark.name === type)
    }

    hasSomeMarks(coord: Coord, types: string[]): boolean {
        const marks = this.getMarks(coord)
        return marks.some((mark) => types.includes(mark.name))
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