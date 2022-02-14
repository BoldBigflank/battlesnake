/// <reference path='./dijkstra.d.ts' />
import { InfoResponse, GameState, Game, Board, Battlesnake, MoveResponse, Coord, Graph, Edges } from "./types"
import { coordEqual, up, down, left, right } from "./util"
import * as dijkstra from 'dijkstrajs'

type Directions = {
    up: number,
    right: number,
    down: number,
    left: number
}

export default class FloodFill {
    game: Game
    graph: {}
    board: Board
    start: Coord
    you: Battlesnake

    fillSquares: Coord[]
    queue: Coord[]

    constructor(gameState: GameState) {
        this.game = gameState.game
        this.graph = {}
        this.board = gameState.board
        this.you = gameState.you
        this.start = this.you.head
        this.fillSquares = []
        this.queue = []
    }

    buildGrid(start: Coord): Directions {
        this.start = start
        return {
            up: this.floodFill(up(start)),
            right: this.floodFill(right(start)),
            down: this.floodFill(down(start)),
            left: this.floodFill(left(start))
        }
    }

    floodFill(start: Coord): number {
        this.fillSquares = []
        this.queue = [start]

        while (this.queue.length > 0) {
            var c = this.queue[0]
            if (this.isAvailable(c)) {
                // TODO: Handle wrapped mode
                this.queue.push(up(c))
                this.queue.push(right(c))
                this.queue.push(down(c))
                this.queue.push(left(c))
                this.fillSquares.push(c)
            }

            this.queue.shift()
        }
        return this.fillSquares.length
    }
    
    isAvailable(coord: Coord): boolean {
        // Is it outside the boundary?
        if (coord.x < 0 || coord.x >= this.board.width) {
            return false
        }
        if (coord.y < 0 || coord.y >= this.board.height) {
            return false
        }
        // Is there a snake there?
        for (let i = 0; i < this.board.snakes.length; i++) {
            let snake = this.board.snakes[i]
            for (let j = 0; j < snake.length; j++) {
                if (coordEqual(coord, snake.body[j])) {
                    return false
                }
            }
        }
        // Is it marked?
        for (let i = 0; i < this.fillSquares.length; i++) {
            if (coordEqual(coord, this.fillSquares[i])) {
                return false
            }
        }
        return true
    }
}

