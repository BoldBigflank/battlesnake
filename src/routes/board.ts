import { InfoResponse, GameState, MoveResponse, Coord, Battlesnake } from "../types"
import { Router, Request, Response } from "express"
import BoardQueue from "../ledboard";

const DEBUG = process.env.DEBUG

const boardQueue = (process.env.USE_LED_BOARD === 'true') ? new BoardQueue() : null

// TODO: Only do this when there's a physical board attached
export function routes(router: Router) {
    router.get("/", (req: Request, res: Response) => {
        res.send(info())
    });

    router.get("/game", (req: Request, res: Response) => {
        res.send(game(req.query.gameId as string))
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

function game(gameId: string): Record<string,any> {
    if (!boardQueue) return { error: "No LED Board Loaded" }
    console.log(`${gameId} START`)
    boardQueue.pushGameId(gameId)
    // Push the game id to the led board's queue
    // Fire up the led board if necessary
    return { success: true }
}
