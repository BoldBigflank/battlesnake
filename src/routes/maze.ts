import { InfoResponse, GameState, MoveResponse, Coord, Battlesnake } from "../types"
import Grid from '../grid'
import FloodFill from "../floodfill"
import PriorityList from "../priorityList"
import { up, down, left, right, coordEqual, BoardMarks } from "../util"
import { onGameStart, onGameEnd } from "../logging"
// import { endGame, startGame } from "../storage"
import { Router, Request, Response } from "express"
import fetch from 'cross-fetch'

const DEBUG = process.env.DEBUG

type Skin = {
    color: string
    head: string
    tail: string
}

export function routes(router: Router) {
    router.get("/", (req: Request, res: Response) => {
        const color = req.query.color ? req.query.color as string : "#1778B5"
        const head = req.query.head ? req.query.head as string : "orca"
        const tail = req.query.tail ? req.query.tail as string : "shiny"
        res.send(info({color, head, tail}))
    });

    router.post("/start", (req: Request, res: Response) => {
        res.send(start(req.body))
        // startGame(req.body)
    });

    router.post("/move", (req: Request, res: Response) => {
        res.send(move(req.body))
    });

    router.post("/end", (req: Request, res: Response) => {
        res.send(end(req.body))
        // endGame(req.body)
    });

    return router
}

function info(skin: Skin): InfoResponse {
    console.log("INFO", skin)
    const response: InfoResponse = {
        ...skin,
        apiversion: "1",
        author: "boldbigflank",
        version: '1.0.0'
    }
    return response
}

function start(gameState: GameState): void {
    onGameStart(gameState)
        .catch(err => {
            console.warn('failed to update logging')
        })
}

function end(gameState: GameState): void {
    onGameEnd(gameState)
}

function move(gameState: GameState): MoveResponse {
    const { width, height } = gameState.board
    const myHead = gameState.you.head
    const marks = new BoardMarks(gameState)

    let possibleMoves: { [key: string]: boolean } = {
        up: true,
        down: true,
        left: true,
        right: true
    }

    if (marks.hasSomeMarks(up(myHead, 1, height), ['hazard', 'snake'])) possibleMoves.up = false
    if (marks.hasSomeMarks(down(myHead, 1, height), ['hazard', 'snake'])) possibleMoves.down = false
    if (marks.hasSomeMarks(left(myHead, 1, width), ['hazard', 'snake'])) possibleMoves.left = false
    if (marks.hasSomeMarks(right(myHead, 1, width), ['hazard', 'snake'])) possibleMoves.right = false

    // TODO: Step 1 - Don't hit walls.
    // Use information in gameState to prevent your Battlesnake from moving beyond the boundaries of the board.
    // const boardWidth = gameState.board.width
    // const boardHeight = gameState.board.height

    // TODO: Step 2 - Don't hit yourself.
    // Use information in gameState to prevent your Battlesnake from colliding with itself.
    // const mybody = gameState.you.body

    // TODO: Step 3 - Don't collide with others.
    // Use information in gameState to prevent your Battlesnake from colliding with others.

    // TODO: Step 4 - Find food.
    // Use information in gameState to seek out and find food.

    // Finally, choose a move from the available safe moves.
    // TODO: Step 5 - Select a move to make based on strategy, rather than random.
    const safeMoves = Object.keys(possibleMoves).filter(key => possibleMoves[key])
    const fill = marks.getFill()
    const bestMove = Object.keys(fill).sort((a, b) => fill[b] - fill[a])[0]
    const response: MoveResponse = {
        move: bestMove
    }
    if (gameState.thoughts) {
        response.thoughts = marks.getThoughts()
    }

    // console.log(`${gameState.game.id} MOVE ${gameState.turn}: ${response.move}`)
    return response
}
