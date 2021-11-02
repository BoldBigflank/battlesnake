/// <reference path='./dijkstra.d.ts' />
import { InfoResponse, GameState, Game, Board, Battlesnake, MoveResponse, Coord, Graph, Edges } from "./types"
import { coordDistance, isAdjacent } from "./util"
import * as dijkstra from 'dijkstrajs'

const SNAKE_PATH = [
    ['➡','➡','⬇','➡','⬇','➡','⬇','➡','⬇','➡','⬇'],
    ['⬆','⬅','➡','⬆','➡','⬆','⬇','⬆','➡','⬆','⬇'],
    ['➡','⬆','⬇','⬅','⬅','⬇','⬅','⬆','⬅','⬇','⬅'],
    ['⬆','⬅','⬅','➡','⬆','⬇','➡','⬇','⬆','➡','⬇'],
    ['➡','➡','⬇','⬆','⬅','➡','⬆','➡','⬆','⬇','⬅'],
    ['⬆','⬅','➡','➡','⬆','⬆','⬇','⬅','⬅','➡','⬇'],
    ['➡','⬆','⬇','⬅','⬇','⬅','➡','⬇','⬆','⬅','⬅'],
    ['⬆','⬅','⬇','⬆','⬅','⬆','⬇','⬅','➡','➡','⬇'],
    ['➡','⬆','➡','⬇','➡','⬆','➡','➡','⬆','⬇','⬅'],
    ['⬆','⬇','⬅','⬇','⬆','⬇','⬅','⬇','⬇','➡','⬇'],
    ['⬆','⬅','⬆','⬅','⬆','⬅','⬆','⬅','⬆','⬅','⬅']
]

const AS_DIRECTION: Record<string, string> = {
    '➡': 'right',
    '⬆': 'up',
    '⬅': 'left',
    '⬇': 'down'
}

function SnakePathCoord(x: number, y: number) {
    return AS_DIRECTION[SNAKE_PATH[SNAKE_PATH.length - 1 - y][x]]
}

export default class Grid {
    game: Game
    graph: Graph
    board: Board
    start: Coord
    you: Battlesnake

    constructor(gameState: GameState, start: Coord) {
        this.game = gameState.game
        this.graph = {}
        this.board = gameState.board
        this.you = gameState.you
        this.start = start
        this.buildGrid()
    }

    buildGrid(): void {
        this.graph = {}
        const graph = this.graph
        // The base
        for (let y = 0; y < this.board.height; y++) {
            for (let x = 0; x < this.board.width; x++) {
                const key = this.keyName({x, y})
                const edges: Edges = {}

                const edgeWeight = this.you.health * 4
                if (x > 0) edges[`${x-1},${y}`] = edgeWeight
                if (x < this.board.width - 1) edges[`${x+1},${y}`] = edgeWeight
                if (y > 0) edges[`${x},${y-1}`] = edgeWeight
                if (y < this.board.height - 1) edges[`${x},${y+1}`] = edgeWeight

                graph[key] = edges
            }
        }

        /* 
            WANDER MODE
        */
       const shouldEat = (
            this.you.health <= 20 ||
            this.board.snakes.some((snake) => {
                return (
                    snake.id !== this.you.id
                    && snake.length >= this.you.length
                )
            })
        )
        if (!shouldEat) {
            for (let y = 0; y < this.board.height; y++) {
                for (let x = 0; x < this.board.width; x++) {
                    const key = this.keyName({x, y})
                    const edges: Edges = graph[key]
    
                    const path = SnakePathCoord(x, y)
                    if (path === 'up') {
                        // into this one
                        graph[this.keyName({x, y: y+1})][key] = 1
                        // backwards
                        edges[`${x},${y+1}`] = 1
                    }
                    if (path === 'down') {
                        graph[this.keyName({x, y: y-1})][key] = 1
                        edges[`${x},${y-1}`] = 1
                    }
                    if (path === 'left') {
                        graph[this.keyName({x: x-1, y})][key] = 1
                        edges[`${x-1},${y}`] = 1
                    }
                    if (path === 'right') {
                        graph[this.keyName({x: x+1, y})][key] = 1
                        edges[`${x+1},${y}`] = 1
                    }
                    
                    graph[key] = edges
                }
            }
        }

        // Remove paths with snakes in them
        this.board.snakes.forEach((snake) => {
            // If the snake's gonna die this turn, ignore it
            if (
                snake.id !== this.you.id
                && snake.health === 1
                && !this.board.food.some((food) => isAdjacent(food, snake.head))
            ) {
                return
            }
            snake.body.forEach((coord, i) => {
                const distance = coordDistance(this.start, coord)
                if (distance >= (snake.length - i)) return // It's gonna be gone then
                // There's a small chance that the snake might run out of health or
                // Move out of bounds and be removed before our move resolves
                // So it's better to move into another snake than into a wall.
                const weight = (snake.id === this.you.id) ? -1 : 1000000 + snake.health
                this.setAllEdges(coord, weight)
            })
        })
        this.graph = graph
    }

    keyName(coord: Coord): string {
        return `${coord.x},${coord.y}`
    }

    adjKeys(coord: Coord): Coord[] {
        return [
            { x: coord.x, y: coord.y + 1 },
            { x: coord.x, y: coord.y - 1 },
            { x: coord.x + 1, y: coord.y },
            { x: coord.x - 1, y: coord.y }
        ]
    }

    setAllEdges(coord: Coord, value: number) {
        const graph = this.graph
        const adjCoords = this.adjKeys(coord)
        const coordKey = this.keyName(coord)
        adjCoords.forEach((adjCoord) => {
            const adjKey = this.keyName(adjCoord)
            if (graph[adjKey] && graph[adjKey][coordKey]) {
                const edges = graph[adjKey]
                if (!edges[coordKey]) return
                if (value === -1) delete edges[coordKey]
                else edges[coordKey] = value
            }
        })
    }

    findPath(coord: Coord) {
        return dijkstra.find_path(this.graph, this.keyName(this.start), this.keyName(coord))
    }
}

