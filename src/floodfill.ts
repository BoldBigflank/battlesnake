/// <reference path='./dijkstra.d.ts' />
import { InfoResponse, GameState, Game, Board, Battlesnake, MoveResponse, Coord, Graph, Edges } from "./types"
import { coordEqual, up, down, left, right, coordDistance } from "./util"
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
    snakeSquares: Coord[]
    queue: Coord[]
    bumpySnakes: Coord[][]

    constructor(gameState: GameState) {
        this.game = gameState.game
        this.graph = {}
        this.board = gameState.board
        this.you = gameState.you
        this.start = this.you.head
        this.fillSquares = []
        this.snakeSquares = []
        this.queue = []

        this.bumpySnakes = this.board.snakes.map((snake) => {
            // Add bumps at each distance from food
            const bumpyBody = [...snake.body]
            this.board.food
            .map((food) => coordDistance(bumpyBody[0], food)) // Get distance
            .sort().reverse() // Sort descending
            .forEach((foodDist) => {
                if (foodDist >= bumpyBody.length) return
                const newIndex = bumpyBody.length - foodDist - 1
                bumpyBody.splice(newIndex, 0, bumpyBody[newIndex])
            })
            return bumpyBody
        })
    }

    buildGrid(start: Coord): Directions {
        const isWrapped = this.game.ruleset.name === 'wrapped'
        const { width, height } = this.board
        const directionWidth = isWrapped ? width : 0
        const directionHeight = isWrapped ? height : 0

        return {
            up: this.floodFill(up(start, 1, directionHeight)),
            right: this.floodFill(right(start, 1, directionWidth)),
            down: this.floodFill(down(start, 1, directionHeight)),
            left: this.floodFill(left(start, 1, directionWidth))
        }
    }

    floodFill(start: Coord): number {
        this.start = start
        this.fillSquares = []
        this.snakeSquares = []
        this.queue = [start]
        const isWrapped = this.game.ruleset.name === 'wrapped'
        const { width, height } = this.board
        const directionWidth = isWrapped ? width : 0
        const directionHeight = isWrapped ? height : 0
        // Start by filling the area around snakes based on the distance of the snake head
        this.board.snakes
        .filter((snake) => snake.id !== this.you.id)
        .forEach((snake) => {
            this.snakeSquares.push(up(snake.head, 1, directionHeight))
            this.snakeSquares.push(down(snake.head, 1, directionHeight))
            this.snakeSquares.push(left(snake.head, 1, directionWidth))
            this.snakeSquares.push(right(snake.head, 1, directionWidth))
        })
        // Remove self if I added it
        this.snakeSquares = this.snakeSquares.filter((c) => {
            return !coordEqual(c, start)
        })

        while (this.queue.length > 0) {
            var c = this.queue[0]
            if (this.isAvailable(c)) {
                // TODO: Handle wrapped mode
                this.queue.push(up(c, 1, directionHeight))
                this.queue.push(right(c, 1, directionWidth))
                this.queue.push(down(c, 1, directionHeight))
                this.queue.push(left(c, 1, directionWidth))
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
        // Is there a snake there? Ignore tails
        const distance = coordDistance(coord, this.you.head, this.board.width, this.board.height)
        for (let i = 0; i < this.bumpySnakes.length; i++) {
            let snake = this.bumpySnakes[i]
            for (let j = 0; j < snake.length; j++) {
                if (distance >= (snake.length - j)) {
                    continue
                }
                if (coordEqual(coord, snake[j])) {
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
        // Is it near a snake
        for (let i = 0; i < this.snakeSquares.length; i++) {
            if (coordEqual(coord, this.snakeSquares[i])) {
                return false
            }
        }
        return true
    }
}

