import { InfoResponse, GameState, MoveResponse, Coord } from "./types"
import Grid from './grid'
import { coordDistance } from "./util"
import { onGameEnd, onGameStart } from "./pixelring"
import { Router, Request, Response } from "express"

const PRIORITIES = {
    WANDER: 2,
    TO_FOOD: 3,
    SCARY_SNAKE: -5,
    YUMMY_SNAKE: 5,
    HAZARD_SAUCE: -4
}

// const MOORE_PATH = [
//     ['➡','⬇','⬇','⬇','⬇','⬇','⬇','⬇','⬇','⬇','⬅'],
//     ['➡','➡','➡','⬇','➡','➡','⬇','➡','➡','⬇','⬅'],
//     ['➡','⬆','⬅','➡','⬆','⬆','➡','⬆','⬇','⬅','⬅'],
//     ['➡','➡','⬆','⬇','⬅','⬅','⬇','⬅','➡','⬇','⬅'],
//     ['➡','⬆','⬅','⬅','⬆','⬆','⬇','⬆','⬅','⬅','⬅'],
//     ['➡','➡','➡','⬇','⬆','⬆','⬇','➡','➡','⬇','⬅'],
//     ['➡','⬆','⬅','➡','⬆','⬆','➡','⬆','⬇','⬅','⬅'],
//     ['➡','➡','⬆','⬇','⬅','⬅','⬇','⬅','➡','⬇','⬅'],
//     ['➡','⬆','⬅','⬅','⬆','⬆','⬅','⬆','⬅','⬅','⬅'],
//     ['➡','⬆','⬆','⬆','⬆','⬆','⬆','⬆','⬆','⬆','⬅'],
//     ['➡','⬆','⬆','⬆','⬆','⬆','⬆','⬆','⬆','⬅','⬅']
// ]

const MOORE_PATH = [
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
        author: "Alex Swan",
        color: "#4BC377",
        head: "happy",
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

    // TODO: Step 1 - Don't hit walls.
    // Use information in gameState to prevent your Battlesnake from moving beyond the boundaries of the board.
    // 0, 0 is bottom left square
    const boardWidth = gameState.board.width
    const boardHeight = gameState.board.height
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

    // Step 0: Don't let your Battlesnake move back on its own neck
    // Step 2 - Don't hit yourself.
    // Step 3 - Don't collide with others.
    // Use information in gameState to prevent your Battlesnake from colliding with itself.
    const allSnakes = gameState.board.snakes
    allSnakes.forEach((snake) => {
        snake.body.forEach((coord, i) => {
            if (i === snake.body.length - 1) return // You can move onto people's tails
            if (coord.x === myHead.x - 1 && coord.y === myHead.y) {
                priorityMoves.left = 0
            } else if (coord.x === myHead.x + 1 && coord.y === myHead.y) {
                priorityMoves.right = 0
            } else if (coord.y === myHead.y - 1 && coord.x === myHead.x) {
                priorityMoves.down = 0
            } else if (coord.y === myHead.y + 1 && coord.x === myHead.x) {
                priorityMoves.up = 0
            }
        })
    })

    // TODO: Step 4 - Find food.
    // TODO: Step 5 - Select a move to make based on strategy, rather than random.
    // Use information in gameState to seek out and find food.

    // /*
    //     Prioritize the direction that goes toward the closest food
    // */
    // // New way, build and use a grid
    // const grid = new Grid(gameState, myHead)
    // let chosenPath: string[] = []
    // gameState.board.food.forEach((food) => {
    //     try {
    //         const path = grid.findPath(food)
    //         if (!chosenPath.length || chosenPath.length > path.length) {
    //             chosenPath = path
    //         }
    //     } catch (error) {
    //         // console.log(`${gameState.game.id} ${gameState.you.id} no path to food`)
    //     }
    // })
    // // Move to my own tail otherwise
    // if (!chosenPath.length) {
    //     try {
    //         const path = grid.findPath(gameState.you.body[gameState.you.length-1])
    //         if (path.length > 1) { // Gotta have space
    //             // TODO: Make sure we don't hit our tail right after eating
    //             chosenPath = path
    //         }
    //     } catch (error) {
    //         // console.log(`${gameState.game.id} ${gameState.you.id} no path to my tail`)
    //     }
    // }
    // if (chosenPath.length > 1) {
    //     const direction = getDirection(myHead, chosenPath[1])
    //     if (direction) priorityMoves[direction] += PRIORITIES.TO_FOOD
    // }

    const moorePathArrow: string = MOORE_PATH[MOORE_PATH.length - myHead.y - 1][myHead.x]
    const moorePathDirection: string = AS_DIRECTION[moorePathArrow]
    priorityMoves[moorePathDirection] += PRIORITIES.WANDER

    /*
        Deprioritize spaces that might be taken by bigger snakes
    */
    gameState.board.snakes.forEach((snake) => {
        const snakeHead = snake.head
        if (coordDistance(myHead, snakeHead) !== 2) return
        if (gameState.you.length > snake.length) { // Yummy snake
            if (snakeHead.y > myHead.y) {
                priorityMoves.up += PRIORITIES.YUMMY_SNAKE
            } else if (snakeHead.y < myHead.y) {
                priorityMoves.down += PRIORITIES.YUMMY_SNAKE
            }
            if (snakeHead.x > myHead.x) {
                priorityMoves.right += PRIORITIES.YUMMY_SNAKE
            } else if (snakeHead.x < myHead.x) {
                priorityMoves.left += PRIORITIES.YUMMY_SNAKE
            }
        } else { // Scary snake
            if (snakeHead.y > myHead.y) {
                priorityMoves.up += PRIORITIES.SCARY_SNAKE
            } else if (snakeHead.y < myHead.y) {
                priorityMoves.down += PRIORITIES.SCARY_SNAKE
            }
            if (snakeHead.x > myHead.x) {
                priorityMoves.right += PRIORITIES.SCARY_SNAKE
            } else if (snakeHead.x < myHead.x) {
                priorityMoves.left += PRIORITIES.SCARY_SNAKE
            }
        }

    })

    // Take the highest priority move
    const move = Object.keys(priorityMoves)
        .sort((moveA, moveB) => priorityMoves[moveB] - priorityMoves[moveA])[0]
    // Finally, choose a move from the available safe moves.
    const response: MoveResponse = {
        move,
    }

    if (move === undefined) {
        response.shout = "AARGH!"
    } else {
        response.shout = `Moving ${move}!`
    }
    // console.log(`${gameState.game.id} ${gameState.you.id} MOVE ${gameState.turn}: ${response.move}`)
    return response
}

// HELPER FUNCTIONS
function getDirection(start: Coord, key: string): string | undefined {
    const [keyX, keyY] = key.split(',')
    const x = parseInt(keyX)
    const y = parseInt(keyY)
    if (start.x === x && start.y - 1 === y) return 'down'
    if (start.x === x && start.y + 1 === y) return 'up'
    if (start.x - 1 === x && start.y === y) return 'left'
    if (start.x + 1 === x && start.y === y) return 'right'
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
