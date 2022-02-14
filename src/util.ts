import { GameState, Coord } from "./types"

export function coordDistance(a: Coord, b: Coord) {
    // BEWARE: This doesn't work on wrapped boards
    const dx = (b.x - a.x)
    const dy = (b.y - a.y)
    // Tile distance
    return Math.abs(dx) + Math.abs(dy)
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

export function up(coord: Coord, distance: number = 1): Coord {
    const result = { ...coord } 
    result.y = coord.y + distance
    return result
}
export function down(coord: Coord, distance: number = 1): Coord {
    const result = { ...coord } 
    result.y = coord.y - distance
    return result
}
export function right(coord: Coord, distance: number = 1): Coord {
    const result = { ...coord } 
    result.x = coord.x + distance
    return result
}
export function left(coord: Coord, distance: number = 1): Coord {
    const result = { ...coord } 
    result.x = coord.x - distance
    return result
}
