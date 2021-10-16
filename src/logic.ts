import { InfoResponse, GameState, MoveResponse, Game } from "./types"

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
    let possibleMoves: { [key: string]: boolean } = {
        down: true,
        left: true,
        up: true,
        right: true
    }

    const myHead = gameState.you.head

    // TODO: Step 1 - Don't hit walls.
    // Use information in gameState to prevent your Battlesnake from moving beyond the boundaries of the board.
    // 0, 0 is bottom left square
    const boardWidth = gameState.board.width
    const boardHeight = gameState.board.height
    if (myHead.x === 0) {
        possibleMoves.left = false
    }
    if (myHead.x === boardWidth - 1) {
        possibleMoves.right = false
    }
    if (myHead.y === 0) {
        possibleMoves.down = false
    }
    if (myHead.y === boardHeight - 1) {
        possibleMoves.up = false
    }

    // Step 0: Don't let your Battlesnake move back on its own neck
    // Step 2 - Don't hit yourself.
    // Step 3 - Don't collide with others.
    // Use information in gameState to prevent your Battlesnake from colliding with itself.
    const myBody = gameState.you.body
    const allSnakes = gameState.board.snakes
    allSnakes.forEach((snake) => {
        snake.body.forEach((coord) => {
            if (coord.x === myHead.x - 1 && coord.y === myHead.y) {
                possibleMoves.left = false
            } else if (coord.x === myHead.x + 1 && coord.y === myHead.y) {
                possibleMoves.right = false
            } else if (coord.y === myHead.y - 1 && coord.x === myHead.x) {
                possibleMoves.down = false
            } else if (coord.y === myHead.y + 1 && coord.x === myHead.x) {
                possibleMoves.up = false
            }
        })
    })

    // TODO: Step 4 - Find food.
    // TODO: Step 5 - Select a move to make based on strategy, rather than random.
    // Use information in gameState to seek out and find food.
    const safeMoves = Object.keys(possibleMoves).filter(key => possibleMoves[key])
    const foods = gameState.board.food
    let foodIs: { [key: string]: boolean } = {
        left: false,
        right: false,
        up: false,
        down: false
    }
    foods.forEach((food) => {
        if (food.x < myHead.x) {
            foodIs.left = true
        }
        if (food.x > myHead.x) {
            foodIs.right = true
        }
        if (food.y < myHead.y) {
            foodIs.down = true
        }
        if (food.y > myHead.y) {
            foodIs.up = true
        }
    })
    const safeMovesWithFood = Object.keys(possibleMoves).filter(key => possibleMoves[key] && foodIs[key])
    const move = (safeMovesWithFood.length > 0) ? safeMovesWithFood[0] : safeMoves[0]
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
