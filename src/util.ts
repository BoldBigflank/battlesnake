import { GameState, Board, Coord } from "./types"

type Tile = {
    name: string
    ttl: number
}

type CoordQueueItem = {
    coord: Coord
    mark: 'control'|'enemy-control'
    time: number
    move?: string
}

export class BoardMarks {
    tiles: Record<string,Tile[]>
    gameState: GameState
    coordQueue: CoordQueueItem[]
    fill: Record<string,number>

    constructor(gameState: GameState) {
        this.fill = {
            up: 0,
            right: 0,
            down: 0,
            left: 0
        }
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
            // Find the nearest food, add a segment that many turns away
            let modBody = [...snake.body]
            if (gameState.board.food) {
                let f = Number.MAX_SAFE_INTEGER
                gameState.board.food.forEach((food) => {
                    const foodDistance = coordDistance(snake.head, food, width, height)
                    f = Math.min(f, foodDistance)
                })
                if (f < modBody.length)  {
                    const modIndex = modBody.length - f - 1
                    modBody.splice(modIndex, 0, modBody[modIndex])
                }
            }
            
            
            // Fill the snake positions
            modBody.forEach((segment, i) => {
                this.markTile(segment, 'snake', modBody.length - i - 1)
            })
            if (snake.body.length > gameState.you.length) {
                this.markTile(up(snake.head, 1, directionHeight), 'scary')
                this.markTile(right(snake.head, 1, directionHeight), 'scary')
                this.markTile(down(snake.head, 1, directionHeight), 'scary')
                this.markTile(left(snake.head, 1, directionHeight), 'scary')
            }
            if (snake.body.length < gameState.you.length) {
                this.markTile(up(snake.head, 1, directionHeight), 'yummy')
                this.markTile(right(snake.head, 1, directionHeight), 'yummy')
                this.markTile(down(snake.head, 1, directionHeight), 'yummy')
                this.markTile(left(snake.head, 1, directionHeight), 'yummy')
            }
        })

        this.coordQueue = []
        gameState.board.snakes
        .sort((a, b) => {
            if (b.length !== a.length)
                return b.length - a.length
            // In the case where two snakes are equal
            // and there's only two left, be aggressive
            if (gameState.board.snakes.length > 2) return 0
            // Fill your board first
            return (b.id === gameState.you.id) ? 1 : -1
        })
        .forEach((snake) => {
            const markType = snake.id === gameState.you.id ? 'control' : 'enemy-control'
            this.coordQueue.push({
                coord: snake.head,
                mark: markType,
                time: 0
            })
        })

        while (this.coordQueue.length > 0) {
            const { coord, mark, time, move } = this.coordQueue.shift() as CoordQueueItem
            let direction: string|undefined = move
            const coords = [
                up(coord, 1, directionHeight),
                right(coord, 1, directionWidth),
                down(coord, 1, directionHeight),
                left(coord, 1, directionWidth)
            ]
            coords
            .filter((c) => {
                return (
                    c.x >= 0 &&
                    c.x < width &&
                    c.y >= 0 &&
                    c.y < height
                )
            })
            .forEach((adjCoord, i) => {
                if (mark === 'control') {
                    if (time === 0) {
                        // Set the move
                        if (coordEqual(up(coord, 1, directionHeight), adjCoord)) direction = 'up'
                        else if (coordEqual(right(coord, 1, directionWidth), adjCoord)) direction = 'right'
                        else if (coordEqual(down(coord, 1, directionHeight), adjCoord)) direction = 'down'
                        else if (coordEqual(left(coord, 1, directionWidth), adjCoord)) direction = 'left'
                    }
                }
                // Don't care about 'control' bc we're doing each direction as control
                const marksToAvoid = ['snake', 'hazard', 'enemy-control']
                if (mark === 'control') marksToAvoid.push(direction!)
                else marksToAvoid.push('control')
                if (!this.hasSomeMarks(adjCoord, marksToAvoid, time)) {
                    if (direction) this.fill[direction] += 1
                    this.markTile(adjCoord, mark)
                    if (mark === 'control') this.markTile(adjCoord, direction!)
                    this.coordQueue.push({
                        coord: adjCoord,
                        mark,
                        time: time + 1,
                        move: direction
                    })
                }
            })
        }
    }

    markTile(coord: Coord, name: string, ttl: number = -1) {
        const key = coordKey(coord)
        if (!this.tiles[key]) this.tiles[key] = []
        this.tiles[key].push({ name, ttl })
    }

    getMarks(coord: Coord): Tile[] {
        return this.tiles[coordKey(coord)] || []
    }

    getFill(): Record<string,number> {
        return this.fill
    }

    hasMark(coord: Coord, type: string): boolean {
        const marks = this.getMarks(coord)
        return marks.some((mark) => mark.name === type)
    }

    hasSomeMarks(coord: Coord, types: string[], time: number = -1): boolean {
        const marks = this.getMarks(coord)
        return marks
        .filter((mark) => mark.ttl === -1 || time < mark.ttl)
        .some((mark) => types.includes(mark.name))
    }

    getThoughts(): Coord[] {
        const thoughts: Coord[] = []
        Object.keys(this.tiles).forEach((key) => {
            const coord = coordValue(key)
            if (this.hasMark(coord, 'snake')) {
                thoughts.push({
                    ...coord,
                    r: 1,
                    color: '#000000'
                })
            }
            if (this.hasMark(coord, 'control')) {
                thoughts.push({
                    ...coord,
                    r: 4,
                    color: '#00ff00'
                })
            }
            if (this.hasMark(coord, 'enemy-control')) {
                thoughts.push({
                    ...coord,
                    r: 4,
                    color: '#000000'
                })
            }
            if (this.hasMark(coord, 'yummy')) {
                thoughts.push({
                    ...coord,
                    r: 2,
                    color: '#00ffff'
                })
            }
            if (this.hasMark(coord, 'scary')) {
                thoughts.push({
                    ...coord,
                    r: 2,
                    color: '#ff0000'
                })
            }
            
        })
        return thoughts
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

export function coordValue(key: string): Coord {
    const [x, y] = key.split(',')
    return {
        x: parseInt(x),
        y: parseInt(y)
    }
}