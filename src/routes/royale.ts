import { InfoResponse, GameState, MoveResponse, Coord, Battlesnake } from "../types"
import Grid from '../grid'
import FloodFill from "../floodfill"
import PriorityList from "../priorityList"
import { up, down, left, right, coordEqual, BoardMarks } from "../util"
import { endGame, startGame } from "../storage"
import { Router, Request, Response } from "express"
import fetch from 'cross-fetch'

const DEBUG = process.env.DEBUG

const PRIORITIES = {
    TO_FOOD: 4, // Steal from an equal snake, ignore for a guaranteed yummy snake
    SCARY_SNAKE: -7, // -9, -8 or -7 if enemy has 1, 2, or 3 move options
    EQUAL_SNAKE: -8, // -7, -6, or -5 if enemy has 1, 2, or 3 move options
    YUMMY_SNAKE: 5, // 5 if they have 1 move option, 1 otherwise
    TUNNEL: -6
}

export function routes(router: Router) {
    router.get("/", (req: Request, res: Response) => {
        res.send(info())
    });

    router.post("/start", (req: Request, res: Response) => {
        res.send(start(req.body))
        startGame(req.body)
    });

    router.post("/move", (req: Request, res: Response) => {
        res.send(move(req.body))
    });

    router.post("/end", (req: Request, res: Response) => {
        res.send(end(req.body))
        endGame(req.body)
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
        tail: "shiny",
        version: '1.0.0'
    }
    return response
}

function start(gameState: GameState): void {
    const url = `http://bymy.selfip.com:5556/?gameId=${gameState.game.id}`
    fetch(url) // Don't need to await since we don't care about the result
    .catch(err => {
        console.error("Unable to contact SnakeLED")
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
}

function move(gameState: GameState): MoveResponse {
    const priorityMoves = new PriorityList()
    const marks = new BoardMarks(gameState)

    const myHead = gameState.you.head
    const myLength = gameState.you.length

    // TODO: Step 1 - Don't hit walls.
    // Use information in gameState to prevent your Battlesnake from moving beyond the boundaries of the board.
    // 0, 0 is bottom left square
    const isWrapped = gameState.game.ruleset.name === 'wrapped'
    const { width, height } = gameState.board
    const directionHeight = isWrapped ? height : 0
    const directionWidth = isWrapped ? width : 0

    if (DEBUG) console.log('* Checking walls')
    if (gameState.game.ruleset.name !== 'wrapped') {
        if (myHead.x === 0) {
            priorityMoves.left = 0
        }
        if (myHead.x === width - 1) {
            priorityMoves.right = 0
        }
        if (myHead.y === 0) {
            priorityMoves.down = 0
        }
        if (myHead.y === height - 1) {
            priorityMoves.up = 0
        }
    }

    // Step 0: Don't let your Battlesnake move back on its own neck
    // Step 2 - Don't hit yourself.
    // Step 3 - Don't collide with others.
    // Use information in gameState to prevent your Battlesnake from colliding with itself.
    if (DEBUG) console.log('* Checking other snakes')
    gameState.board.snakes.forEach((snake) => {
        snake.body.forEach((coord, i) => {
            const blockValue = (snake.id === gameState.you.id) ? 0 : 2
            if (i === snake.body.length - 1) return // You can move onto people's tails
            if (coord.x === (myHead.x - 1 + width) % width && coord.y === myHead.y) {
                priorityMoves.left = blockValue
            } else if (coord.x === (myHead.x + 1) % width && coord.y === myHead.y) {
                priorityMoves.right = blockValue
            } else if (coord.y === (myHead.y - 1 + height) % height && coord.x === myHead.x) {
                priorityMoves.down = blockValue
            } else if (coord.y === (myHead.y + 1) % height && coord.x === myHead.x) {
                priorityMoves.up = blockValue
            }
        })
    })

    /*
        Deprioritize tiles that will kill us
    */
   if (gameState.game.ruleset.settings.hazardDamagePerTurn + 1 >= gameState.you.health) {
       gameState.board.hazards.forEach((hazard) => {
            // It's fine if it is also food
            if (gameState.board.food.some((food) => coordEqual(food, hazard))) return 

            if (coordEqual(up(myHead, 1, directionHeight), hazard)) priorityMoves.up = 1
            if (coordEqual(down(myHead, 1, directionHeight), hazard)) priorityMoves.down = 1
            if (coordEqual(left(myHead, 1, directionWidth), hazard)) priorityMoves.left = 1
            if (coordEqual(right(myHead, 1, directionWidth), hazard)) priorityMoves.right = 1
       })
   }

    /*
        Deprioritize dead ends
    */
    const floodFill = new FloodFill(gameState)
    const fillSpace = floodFill.buildGrid(myHead)
    if (DEBUG) console.log('* Checking for tunnels', fillSpace)
    const goalSpace = Math.min(myLength * 1.2, fillSpace.max)
    if (fillSpace.up > 0 && fillSpace.up < goalSpace) {
        priorityMoves.up += PRIORITIES.TUNNEL
    }
    if (fillSpace.right > 0 && fillSpace.right < goalSpace) {
        priorityMoves.right += PRIORITIES.TUNNEL
    }
    if (fillSpace.down > 0 && fillSpace.down < goalSpace) {
        priorityMoves.down += PRIORITIES.TUNNEL
    }
    if (fillSpace.left > 0 && fillSpace.left < goalSpace) {
        priorityMoves.left += PRIORITIES.TUNNEL
    }
    
    /*
        Prioritize the direction that goes toward the closest food
    */
    // New way, build and use a grid
    if (DEBUG) console.log('* Checking path to food')
    const grid = new Grid(gameState, myHead)
    let chosenPath: string[] = []
    gameState.board.food.forEach((food) => {
        try {
            const path = grid.findBestPath(food, true)
            if (!path.length) return
            if (!chosenPath.length || path.length < chosenPath.length ) {
                chosenPath = path
            }
        } catch (error) {
            // console.log(`${gameState.game.id} ${gameState.you.id} no path to food`)
        }
    })
    if (DEBUG) console.log(chosenPath.length === 0 ? '* No good path to food found' : `* Found ${chosenPath.length - 1} step path`)
    // Move to my own tail otherwise
    if (!chosenPath.length) {
        try {
            const path = grid.findBestPath(gameState.you.body[gameState.you.length-1])
            if (path.length > 1) { // Gotta have space
                // TODO: Make sure we don't hit our tail right after eating
                // TODO: Make sure we don't go from open to hazard
                const pathCount = path.findIndex((key) => {
                    return isHazard(grid.coordValue(key), gameState)
                })
                if (pathCount <= 0) chosenPath = path
            }
        } catch (error) {
            // console.log(`${gameState.game.id} ${gameState.you.id} no path to my tail`)
        }
    }
    if (chosenPath.length > 1) {
        const direction = getDirection(myHead, chosenPath[1], gameState)
        let foodPriority = PRIORITIES.TO_FOOD
        if (marks.getMarks(grid.coordValue(chosenPath[1])).some((mark) => mark === 'scary')) {
            if (DEBUG) console.log('* Food blocked by scary snake')
            foodPriority = -1 * foodPriority
        }
        if (direction === 'up') priorityMoves.up += foodPriority
        if (direction === 'down') priorityMoves.down += foodPriority
        if (direction === 'left') priorityMoves.left += foodPriority
        if (direction === 'right') priorityMoves.right += foodPriority
    } else {
        if (DEBUG) console.log('* No good path to tail found, just avoiding adjacent hazards')
        // In this case, just deprioritize adjacent hazards
        gameState.board.hazards.forEach((hazard) => {
            if (coordEqual(up(myHead, 1, directionHeight), hazard)) priorityMoves.up -= PRIORITIES.TO_FOOD
            if (coordEqual(right(myHead, 1, directionWidth), hazard)) priorityMoves.right -= PRIORITIES.TO_FOOD
            if (coordEqual(down(myHead, 1, directionHeight), hazard)) priorityMoves.down -= PRIORITIES.TO_FOOD
            if (coordEqual(left(myHead, 1, directionWidth), hazard)) priorityMoves.left -= PRIORITIES.TO_FOOD
        })
    }

    /*
        Deprioritize spaces that might be taken by bigger snakes
    */
    if (DEBUG) console.log('* Checking snake positions')
    gameState.board.snakes.forEach((snake) => {
        const snakeHead = snake.head
        
        if (grid.findDistance(myHead, snakeHead) !== 2) return
        let snakePriority = 5
        if (snake.length > myLength) {
            snakePriority = PRIORITIES.SCARY_SNAKE // -5
            snakePriority -= 3 - validMoves(gameState, snake)
            // snake with 3 moves -> -5
            // snake with 1 move -> -7
        } else if (snake.length < myLength) {
            snakePriority = PRIORITIES.YUMMY_SNAKE // 5
            snakePriority -= 2 * (validMoves(gameState, snake) - 1)
            snakePriority = (validMoves(gameState, snake) === 1) ? PRIORITIES.YUMMY_SNAKE : 1
            // snake with 1 move -> 5 - 1 = 5
            // snake with 2 moves -> 5 - 2 = 1
            // snake with 3 moves -> 5 - 3 = 1
        } else {
            snakePriority = PRIORITIES.EQUAL_SNAKE // -6
            snakePriority += validMoves(gameState, snake)
            // snake with 3 moves -> -5
            // snake with 1 move -> -7
        }
        
        if (snakeHead.y === up(myHead, 1, directionHeight).y ||
            snakeHead.y === up(myHead, 2, directionHeight).y) {
            priorityMoves.up += snakePriority
        } else if (snakeHead.y === down(myHead, 1, directionHeight).y ||
            snakeHead.y === down(myHead, 2, directionHeight).y) {
            priorityMoves.down += snakePriority
        }
        if (snakeHead.x === right(myHead, 1, directionWidth).x ||
            snakeHead.x === right(myHead, 2, directionWidth).x) {
            priorityMoves.right += snakePriority
        } else if (snakeHead.x === left(myHead, 1, directionWidth).x ||
            snakeHead.x === left(myHead, 2, directionWidth).x) {
            priorityMoves.left += snakePriority
        }
    })

    // Take the highest priority move
    if (DEBUG) console.log('>>', priorityMoves)
    const move = priorityMoves.getDirection()

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
function isHazard(coord: Coord, gameState: GameState): boolean {
    return gameState.board.hazards.some((hazard) => {
        return coordEqual(hazard, coord)
    })
}

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

function validMoves(gameState: GameState, snake: Battlesnake): number {
    const snakeHead = snake.head
    const isWrapped = gameState.game.ruleset.name === 'wrapped'
    const { width, height } = gameState.board
    const directionHeight = isWrapped ? height : 0
    const directionWidth = isWrapped ? width : 0

    let result = [
        up(snakeHead, 1, directionHeight),
        down(snakeHead, 1, directionHeight),
        left(snakeHead, 1, directionWidth),
        right(snakeHead, 1, directionWidth)
    ]

    result = result.filter((c) => 
        c.x >= 0 &&
        c.x < width &&
        c.y >= 0 &&
        c.y < height
    )

    gameState.board.snakes.forEach((snake) => {
        snake.body.forEach((coord) => {
            result = result.filter((c) => !coordEqual(coord, c))
        })
    })

    return result.length
}
