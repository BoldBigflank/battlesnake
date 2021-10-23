import { Coord } from "./types"

export function coordDistance(a: Coord, b: Coord) {
    const dx = (b.x - a.x)
    const dy = (b.y - a.y)
    // Tile distance
    return Math.abs(dx) + Math.abs(dy)
}

export function isAdjacent(a: Coord, b: Coord): boolean {
    return coordDistance(a, b) === 1
}