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
                if (x > 0) edges[`${x-1},${y}`] = 1 // to the left
                if (x < boardWidth - 1) edges[`${x+1},${y}`] = 1 // to the right
                if (y > 0) edges[`${x},${y-1}`] = 1
                if (y < boardHeight - 1) edges[`${x},${y+1}`] = 1

                // Wrapped mode edges
                if (this.game.ruleset.name === 'wrapped') {
                    if (x === 0) edges[`${boardWidth-1},${y}`] = 1
                    if (x === boardWidth - 1) edges[`${0},${y}`] = 1
                    if (y === 0) edges[`${x},${boardHeight-1}`] = 1
                    if (y === boardHeight - 1) edges[`${x},${0}`] = 1
                }
                graph[key] = edges

                // Distance graph stuff
                const distanceEdges: Edges = { ...edges }
                this.distanceGraph[key] = distanceEdges
            }
        }
        
        /*
            Add weight to hazard sauce
        */ 
        const hazardDamagePerTurn = this.game.ruleset.settings.hazardDamagePerTurn
        this.board.hazards.forEach((hazard) => {
            this.setAllEdges(this.graph, hazard, 1 + hazardDamagePerTurn)
        })

        // Food costs 0 to move bc it sets health to 100 without subtracting
        this.board.food.forEach((food) => {
            this.setAllEdges(this.graph, food, 0)
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
                const distance = this.findDistance(this.you.head, coord)
                if (distance >= (snake.length - i)) return // It's gonna be gone then
                // There's a small chance that the snake might run out of health or
                // Move out of bounds and be removed before our move resolves
                // So it's better to move into another snake than into a wall.
                const weight = (snake.id === this.you.id) ? 9999999 : 1000000 + snake.health
                this.setAllEdges(this.graph, coord, weight)
                this.setAllEdges(this.distanceGraph, coord, weight)
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

    setAllEdges(graph: Graph, coord: Coord, value: number) {
        const adjCoords = this.adjKeys(coord)
        const coordKey = this.keyName(coord)
        adjCoords.forEach((adjCoord) => {
            const adjKey = this.keyName(adjCoord)
            if (graph[adjKey] && graph[adjKey][coordKey]) {
                const edges = graph[adjKey]
                if (!edges[coordKey]) return
                else edges[coordKey] = value
            }
        })
    }

    findHealthiestPath(coord: Coord): string[] {
        return dijkstra.find_path(this.graph, this.keyName(this.start), this.keyName(coord))
    }

    findShortestPath(coord: Coord): string[] {
        return dijkstra.find_path(this.distanceGraph, this.keyName(this.start), this.keyName(coord))
    }

    findBestPath(coord: Coord): string[] {
        let chosenPath: string[] = []
        const myHealth = this.you.health
        // If we can afford to go the fewest steps, do it
        const path = this.findShortestPath(coord)
        const cost = this.getHealthCost(path)
        // console.log('short path', path, cost, myHealth)
        if (cost < myHealth) {
            console.log('short path is good')
            chosenPath = path
        }

        // If there's a healthy option, do it
        const healthyPath = this.findHealthiestPath(coord)
        const healthyCost = this.getHealthCost(healthyPath)
        // console.log('healthiest path', healthyPath, healthyCost, myHealth)
        if (healthyCost < myHealth) {
            if (!chosenPath.length || path.length < chosenPath.length) {
                chosenPath = healthyPath
            }
        }
        return chosenPath
    }

    findDistance(start: Coord, coord: Coord) {
        return dijkstra.find_path(
            this.distanceGraph,
            this.keyName(start), 
            this.keyName(coord)
        ).length - 1
    }

    getHealthCost(path: string[]): number {
        let cost = 0
        for (let i = 0; i < path.length - 1; i++) {
            let nodeA = path[i]
            let nodeB = path[i + 1]
            cost += parseInt(`${this.graph[nodeA][nodeB]}`)
        }
        return cost
    }
}

