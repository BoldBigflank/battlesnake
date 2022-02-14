import { InfoResponse, GameState, MoveResponse, Coord } from "./types"
import Grid from './grid'
import FloodFill from "./floodfill"
import { up, down, left, right } from "./util"
import { onGameEnd, onGameStart } from "./pixelring"
import { Router, Request, Response } from "express"

const DEBUG = false

const PRIORITIES = {
    TO_FOOD: 3,
    SCARY_SNAKE: -5,
    YUMMY_SNAKE: 5,
    HAZARD_SAUCE: -4,
    TUNNEL: -5
}

export function routes(router: Router) {
    router.get("/", (req: Request, res: Response) => {
        res.send(info())
    });

    router.post("/start", (req: Request, res: Response) => {
        res.send(start(req.body))
    });

    router.post("/move", (req: Request, res: Response) => {
        res.send(move(req.body))
    });

    router.post("/end", (req: Request, res: Response) => {
        res.send(end(req.body))
    });

    return router
}

function info(): InfoResponse {
    console.log("INFO")
    const response: InfoResponse = {
        apiversion: "1",
        author: "boldbigflank",
        color: "#1778B5",
        head: "orca",
        tail: "round-bum"
    }
    return response
}

function start(gameState: GameState): void {
    // console.log(`${gameState.game.id} ${gameState.you.id} START`)
    onGameStart(gameState).catch((error) => {
        console.warn('failed to update pixelring')
    })
}

function end(gameState: GameState): void {
    let result = 'UNKNONWN'
    if (gameState.board.snakes.length === 0) {
        result = 'DRAW'
    } else {
        const winningSnake = gameState.board.snakes[0]
        const name = gameState.board.snakes[0].name
        result = `${name} WINS`
        if (winningSnake.id === gameState.you.id) {
            result = `${name} - I WON!`
        }
    }
    // console.log(`${gameState.game.id} ${gameState.you.id} END - ${result}\n`)
    onGameEnd(gameState)
}

function move(gameState: GameState): MoveResponse {
    let priorityMoves: { [key: string]: number } = {
        down: 100,
        left: 100,
        up: 100,
        right: 100
    }

    const myHead = gameState.you.head
    const myLength = gameState.you.length

    // TODO: Step 1 - Don't hit walls.
    // Use information in gameState to prevent your Battlesnake from moving beyond the boundaries of the board.
    // 0, 0 is bottom left square
    const boardWidth = gameState.board.width
    const boardHeight = gameState.board.height

    if (gameState.game.ruleset.name !== 'wrapped') {
        if (myHead.x === 0) {
            priorityMoves.left = 0
        }
        if (myHead.x === boardWidth - 1) {
            priorityMoves.right = 0
        }
        if (myHead.y === 0) {
            priorityMoves.down = 0
        }
        if (myHead.y === boardHeight - 1) {
            priorityMoves.up = 0
        }
    }

    // Step 0: Don't let your Battlesnake move back on its own neck
    // Step 2 - Don't hit yourself.
    // Step 3 - Don't collide with others.
    // Use information in gameState to prevent your Battlesnake from colliding with itself.
    const allSnakes = gameState.board.snakes
    allSnakes.forEach((snake) => {
        snake.body.forEach((coord, i) => {
            if (i === snake.body.length - 1) return // You can move onto people's tails
            if (coord.x === (myHead.x - 1 + boardWidth) % boardWidth && coord.y === myHead.y) {
                priorityMoves.left = 0
            } else if (coord.x === (myHead.x + 1) % boardWidth && coord.y === myHead.y) {
                priorityMoves.right = 0
            } else if (coord.y === (myHead.y - 1 + boardHeight) % boardHeight && coord.x === myHead.x) {
                priorityMoves.down = 0
            } else if (coord.y === (myHead.y + 1) % boardHeight && coord.x === myHead.x) {
                priorityMoves.up = 0
            }
        })
    })

    /*
        Deprioritize dead ends
    */
    const floodFill = new FloodFill(gameState)
    const fillSpace = floodFill.buildGrid(myHead)
    if (DEBUG) console.log('fillSpace', fillSpace)
    if (fillSpace.up > 0 && fillSpace.up < myLength * 1.5) {
        priorityMoves.up += PRIORITIES.TUNNEL
    }
    if (fillSpace.right > 0 && fillSpace.right < myLength * 1.5) {
        priorityMoves.right += PRIORITIES.TUNNEL
    }
    if (fillSpace.down > 0 && fillSpace.down < myLength * 1.5) {
        priorityMoves.down += PRIORITIES.TUNNEL
    }
    if (fillSpace.down > 0 && fillSpace.left < myLength * 1.5) {
        priorityMoves.left += PRIORITIES.TUNNEL
    }
    
    /*
        Prioritize the direction that goes toward the closest food
    */
    // New way, build and use a grid
    const grid = new Grid(gameState, myHead)
    let chosenPath: string[] = []
    gameState.board.food.forEach((food) => {
        try {
            const path = grid.findPath(food)
            if (!chosenPath.length || path.length < chosenPath.length) {
                chosenPath = path
            }
        } catch (error) {
            // console.log(`${gameState.game.id} ${gameState.you.id} no path to food`)
        }
    })
    // Move to my own tail otherwise
    if (!chosenPath.length) {
        try {
            const path = grid.findPath(gameState.you.body[gameState.you.length-1])
            if (path.length > 1) { // Gotta have space
                // TODO: Make sure we don't hit our tail right after eating
                chosenPath = path
            }
        } catch (error) {
            // console.log(`${gameState.game.id} ${gameState.you.id} no path to my tail`)
        }
    }
    if (chosenPath.length > 1) {
        const direction = getDirection(myHead, chosenPath[1], gameState)
        if (direction) priorityMoves[direction] += PRIORITIES.TO_FOOD
    }

    /*
        Deprioritize spaces that might be taken by bigger snakes
    */
    gameState.board.snakes.forEach((snake) => {
        const snakeHead = snake.head
        const isWrapped = gameState.game.ruleset.name === 'wrapped'
        const { width, height } = gameState.board

        if (grid.findDistance(myHead, snakeHead) !== 2) return
        if (gameState.you.length > snake.length) { // Yummy snake
            if (snakeHead.y === up(myHead, 1, isWrapped ? height : 0).y) {
                priorityMoves.up += PRIORITIES.YUMMY_SNAKE
            } else if (snakeHead.y === down(myHead, 1, isWrapped ? height : 0).y) {
                priorityMoves.down += PRIORITIES.YUMMY_SNAKE
            }
            if (snakeHead.x === right(myHead, 1, isWrapped ? width : 0).x) {
                priorityMoves.right += PRIORITIES.YUMMY_SNAKE
            } else if (snakeHead.x === left(myHead, 1, isWrapped ? width : 0).x) {
                priorityMoves.left += PRIORITIES.YUMMY_SNAKE
            }
        } else { // Scary snake
            if (snakeHead.y === up(myHead, 1, isWrapped ? height : 0).y) {
                priorityMoves.up += PRIORITIES.SCARY_SNAKE
            } else if (snakeHead.y === down(myHead, 1, isWrapped ? height : 0).y) {
                priorityMoves.down += PRIORITIES.SCARY_SNAKE
            }
            if (snakeHead.x === right(myHead, 1, isWrapped ? width : 0).x) {
                priorityMoves.right += PRIORITIES.SCARY_SNAKE
            } else if (snakeHead.x === left(myHead, 1, isWrapped ? width : 0).x) {
                priorityMoves.left += PRIORITIES.SCARY_SNAKE
            }
        }

    })

    // Take the highest priority move
    if (DEBUG) console.log('priorityMoves', priorityMoves)
    const move = Object.keys(priorityMoves)
        .sort((moveA, moveB) => priorityMoves[moveB] - priorityMoves[moveA])[0]

    // Finally, choose a move from the available safe moves.
    const response: MoveResponse = {
        move
    }

    if (move === undefined) {
        response.shout = "AARGH!"
    } else {
        response.shout = `Moving ${move}!`
    }

    if (gameState.thoughts) {
        response.thoughts = []
        if (chosenPath.length > 1) response.thoughts = chosenPath.splice(1).map((coord) => ({
            x: parseInt(coord.split(',')[0], 10),
            y: parseInt(coord.split(',')[1], 10),
            color: '#000000',
            r: 3
        }))
        const chosenDot = {
            color: '#00ff00',
            r: 2
        }
        if (move === 'up') response.thoughts.push(up({
            ...myHead,
            ...chosenDot
        }))
        if (move === 'down') response.thoughts.push(down({
            ...myHead,
            ...chosenDot
        }))
        if (move === 'left') response.thoughts.push(left({
            ...myHead,
            ...chosenDot
        }))
        if (move === 'right') response.thoughts.push(right({
            ...myHead,
            ...chosenDot
        }))
    }
    
    // console.log(`${gameState.game.id} ${gameState.you.id} MOVE ${gameState.turn}: ${response.move}`)
    return response
}

// HELPER FUNCTIONS
function getDirection(start: Coord, key: string, gameState: GameState): string | undefined {
    const [keyX, keyY] = key.split(',')
    const { width, height } = gameState.board
    const end: Coord = {x: parseInt(keyX), y: parseInt(keyY)}
    if (start.x === end.x) {
        // same row
        if ((start.y + 1) % height === end.y) return 'up'
        if ((start.y - 1 + height) % height === end.y) return 'down'
    }
    if (start.y === end.y) {
        // same column
        if ((start.x + 1) % width === end.x) return 'right'
        if ((start.x - 1 + width) % width === end.x) return 'left'
    }
}

function direction(a: Coord, b: Coord): string {
    const dx = (b.x - a.x)
    const dy = (b.y - a.y)
    if (Math.abs(dx) > Math.abs(dy)) {
        return (dx > 0) ? 'right': 'left'
    } else {
        return (dy > 0) ? 'up' : 'down'
    }
}
