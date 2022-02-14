/// <reference path='./dijkstra.d.ts' />
import { InfoResponse, GameState, Game, Board, Battlesnake, MoveResponse, Coord, Graph, Edges } from "./types"
import * as dijkstra from 'dijkstrajs'

export default class Grid {
    game: Game
    graph: Graph
    distanceGraph: Graph
    board: Board
    start: Coord
    you: Battlesnake

    constructor(gameState: GameState, start: Coord) {
        this.game = gameState.game
        this.graph = {}
        this.distanceGraph = {}
        this.board = gameState.board
        this.you = gameState.you
        this.start = start
        this.buildGrid()
    }

    buildGrid(): void {
        this.graph = {}
        this.distanceGraph = {}
        const graph = this.graph
        const boardWidth = this.board.width
        const boardHeight = this.board.height
        for (let y = 0; y < boardHeight; y++) {
            for (let x = 0; x < boardWidth; x++) {
                const key = this.keyName({x, y})
                const edges: Edges = {}
                if (x > 0) edges[`${x-1},${y}`] = boardWidth - x + 10 // to the left
                if (x < boardWidth - 1) edges[`${x+1},${y}`] = x + 10 // to the right
                if (y > 0) edges[`${x},${y-1}`] = boardHeight - y + 10
                if (y < boardHeight - 1) edges[`${x},${y+1}`] = y + 10

                // Wrapped mode edges
                if (this.game.ruleset.name === 'wrapped') {
                    if (x === 0) edges[`${boardWidth-1},${y}`] = 10
                    if (x === boardWidth - 1) edges[`${0},${y}`] = 10
                    if (y === 0) edges[`${x},${boardHeight-1}`] = 10
                    if (y === boardHeight - 1) edges[`${x},${0}`] = 10
                }
                graph[key] = edges

                // Distance graph stuff
                const distanceEdges: Edges = {}
                if (x > 0) distanceEdges[`${x-1},${y}`] = 1
                if (x < boardWidth - 1) distanceEdges[`${x+1},${y}`] = 1
                if (y > 0) distanceEdges[`${x},${y-1}`] = 1
                if (y < boardHeight - 1) distanceEdges[`${x},${y+1}`] = 1

                if (this.game.ruleset.name === 'wrapped') {
                    if (x === 0) distanceEdges[`${boardWidth-1},${y}`] = 1
                    if (x === boardWidth - 1) distanceEdges[`${0},${y}`] = 1
                    if (y === 0) distanceEdges[`${x},${boardHeight-1}`] = 1
                    if (y === boardHeight - 1) distanceEdges[`${x},${0}`] = 1
                }
                this.distanceGraph[key] = distanceEdges
            }
        }
        
        /*
            Add weight to hazard sauce
            Counterintuitively, hazard sauce should be low weight on square that are
            close to our head. This will prioritize going into the sauce early and
            use our health as a resource to get to the food. Then ideally the way out
            of the sauce is shorter.
        */ 
       const hazardDamagePerTurn = this.game.ruleset.settings.hazardDamagePerTurn
        this.board.hazards.forEach((hazard) => {
            this.setAllEdges(hazard, hazardDamagePerTurn * 10)
        })

        // Remove paths with snakes in them
        this.board.snakes.forEach((snake) => {
            // If the snake's gonna die this turn, ignore it
            if (
                snake.id !== this.you.id
                && snake.health === 1
                && !this.board.food.some((food) => this.findDistance(snake.head, food) === 1)
            ) {
                return
            }
            snake.body.forEach((coord, i) => {
                const distance = this.findDistance(snake.head, coord)
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
        const boardWidth = this.board.width
        const boardHeight = this.board.height
        return [
            { x: coord.x, y: (coord.y + 1) % boardHeight },
            { x: coord.x, y: (coord.y - 1 + boardHeight) % boardHeight },
            { x: (coord.x + 1) % boardWidth, y: coord.y },
            { x: (coord.x - 1 + boardWidth) % boardWidth, y: coord.y }
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

    findDistance(start: Coord, coord: Coord) {
        console.log('findDistance', dijkstra.find_path(this.distanceGraph, this.keyName(start), this.keyName(coord)))
        return dijkstra.find_path(this.distanceGraph, this.keyName(start), this.keyName(coord)).length - 1
    }
}

