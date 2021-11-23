import { GameState, Coord } from "./types"

export function coordDistance(a: Coord, b: Coord) {
    const dx = (b.x - a.x)
    const dy = (b.y - a.y)
    // Tile distance
    return Math.abs(dx) + Math.abs(dy)
}

export function isAdjacent(a: Coord, b: Coord): boolean {
    return coordDistance(a, b) === 1
}

export function hasFood(gameState: GameState, coord: Coord) {
    return gameState.board.food.some((food) => {
        return food.x === coord.x && food.y === coord.y
    })
}

export function up(coord: Coord, distance: number = 1): Coord {
    return {
        ...coord,
        y: coord.y += distance
    }
}
export function down(coord: Coord, distance: number = 1): Coord {
    return {
        ...coord,
        y: coord.y -= distance
    }
}
export function right(coord: Coord, distance: number = 1): Coord {
    return {
        ...coord,
        x: coord.x += distance
    }
}
export function left(coord: Coord, distance: number = 1): Coord {
    return {
        ...coord,
        x: coord.x -= distance
    }
}
