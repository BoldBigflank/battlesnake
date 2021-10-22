import { Coord } from "./types"

export function coordDistance(a: Coord, b: Coord) {
    const dx = (b.x - a.x)
    const dy = (b.y - a.y)
    // Tile distance
    return Math.abs(dx) + Math.abs(dy)
}