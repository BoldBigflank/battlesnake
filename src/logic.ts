import { InfoResponse, GameState, MoveResponse, Coord } from "./types"

export function info(): InfoResponse {
    console.log("INFO")
    const response: InfoResponse = {
        apiversion: "1",
        author: "boldbigflank",
        color: "#1778B5",
        head: "pixel",
        tail: "pixel"
    }
    return response
}

export function start(gameState: GameState): void {
    console.log(`${gameState.game.id} START`)
}

export function end(gameState: GameState): void {
    console.log(`${gameState.game.id} END\n`)
}

export function move(gameState: GameState): MoveResponse {
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
    const myBody = gameState.you.body
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

    /*
        Prioritize the direction that goes toward the closest food
    */
    const food = gameState.board.food || []
    if (food.length) {
        const closestFood: Coord = gameState.board.food.sort((foodA: Coord, foodB: Coord) => {
            return coordDistance(foodA, myHead) - coordDistance(foodB, myHead)
        })[0]
        // Prioritize the direction of the furthest axis
        const dx = closestFood.x - myHead.x
        const dy = closestFood.y - myHead.y
        priorityMoves.right += dx
        priorityMoves.left -= dx
        priorityMoves.up += dy
        priorityMoves.down -= dy
    }

    /*
        Deprioritize spaces that might be taken by bigger snakes
    */
    gameState.board.snakes.forEach((snake) => {
        const snakeHead = snake.head
        if (coordDistance(myHead, snakeHead) !== 2) return
        const attack = (gameState.you.length > snake.length) ? 1 : -1
        if (snakeHead.y > myHead.y) {
            priorityMoves.up += attack * 50
        } else if (snakeHead.y < myHead.y) {
            priorityMoves.down += attack * 50
        }
        if (snakeHead.x > myHead.x) {
            priorityMoves.right += attack * 50
        } else if (snakeHead.x < myHead.x) {
            priorityMoves.left += attack * 50
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
    console.log(`${gameState.game.id} MOVE ${gameState.turn}: ${response.move}`)
    return response
}

// HELPER FUNCTIONS
function coordDistance(a: Coord, b: Coord) {
    const dx = (b.x - a.x)
    const dy = (b.y - a.y)
    // Tile distance
    return Math.abs(dx) + Math.abs(dy)
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