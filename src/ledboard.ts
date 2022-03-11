import { LedMatrix } from 'rpi-led-matrix';
import { LedMatrixInstance } from 'rpi-led-matrix/src/types'
import { Battlesnake, Coord, GameState } from './types';
import WebSocket = require('isomorphic-ws')

class BoardQueue {
    games: string[] = []
    frames: GameState[] = []
    running: boolean = false
    matrix?: LedMatrixInstance = undefined
    conn: WebSocket

    constructor() {
        this.games = []
        this.frames = []
        this.matrix = new LedMatrix(
            LedMatrix.defaultMatrixOptions(),
            LedMatrix.defaultRuntimeOptions()
        )
    }

    pushGameId(gameId: string) {
        this.games.push(gameId)
        this.start()
    }

    start() {
        if (this.running) return
        this.running = true
        // While games exist
        // Pop the first game
        // Open a websocket connection
        // Get the events until the end for that one
        // stop running
    }

    async loadNextGame() {
        if (this.games.length === 0) return
        const gameId = this.games.shift()
        // Get the static info from the http endpoint
        const url = `https://engine.battlesnake.com/games/${gameId}`
        const response = await fetch(url)
        const GameData = await response.json()
        const gameState = this.parseGameData(GameData)

        // Get the frames via the websocket connection
        const wsUrl = `wss://engine.battlesnake.com/games/${gameId}/events`
        const webSocket = new WebSocket(wsUrl)
        webSocket.onmessage = (event: any) => {
            const message = JSON.parse(event.data)
            switch (message.Type) {
                case 'frame':
                    const frameData = this.parseFrameData(message.Data, gameState)
                    this.frames.push(frameData)
                    break;
                case 'game_end':
                    // Maybe add a pause to the frames queue?
                    event.target.close()
                    break;
                default:
                    break;
            }
        }
        webSocket.onclose = () => {
            void this.loadNextGame()
        }

    }

    displayNextFrame() {
        if (!this.matrix) return
        if (this.frames.length === 0) return
        const gameState: GameState = this.frames.shift()!

        // Shift everything so the board is in the middle
        const shiftX = Math.floor((this.matrix.width() - gameState.board.width) / 2)
        const shiftY = Math.floor((this.matrix.height() - gameState.board.height) / 2)

        this.matrix.clear().brightness(100)
        // The Board
        this.matrix
            .fgColor(parseInt('FFFFFF', 16)) // White
            .drawRect(shiftX, shiftY, gameState?.board.width, gameState?.board.height)
        
        this.matrix.fgColor(parseInt('FF0000', 16)) // Red
        gameState.board.hazards.forEach((item) => {
            this.matrix!.setPixel(shiftX + item.x, shiftY + item.y)
        })

        this.matrix.fgColor(parseInt('00FF00', 16)) // Green
        gameState.board.food.forEach((item) => {
            this.matrix!.setPixel(shiftX + item.x, shiftY + item.y)
        })
        
        gameState.board.snakes.forEach((snake) => {
            const color = snake.customizations.color.substring(1)
            this.matrix!.fgColor(parseInt(color, 16)) // The snake color
            snake.body.forEach((item) => {
                this.matrix!.setPixel(shiftX + item.x, shiftY + item.y)
            })
        })

        // The Scoreboard/Health

        this.matrix.sync()
    }

    parseSnakeData(snake: any): Battlesnake {
        return {
            id: snake.ID,
            name: snake.Name,
            health: snake.Health,
            body: snake.Body.map((coord: Record<string,string>) => ({ x: coord.X, y: coord.Y })),
            latency: snake.Latency,
            head: { x: snake.Body[0].X, y: snake.Body[0].Y },
            length: snake.Body.length,
            customizations: {
                color: snake.Color,
                head: snake.HeadType,
                tail: snake.TailType
            },
            shout: snake.Shout,
            squad: snake.Squad
        }
    }

    parseFrameData(data: any, gameState: GameState): GameState {
        // Put the Turn, Snakes, Food, Hazards in the correct spot
        const turn = data.Turn
        const snakes = data.Snakes.map(this.parseSnakeData)
        const food = data.Food.map((coord: Record<string,string>) => ({ x: coord.X, y: coord.Y }))
        const hazards = data.Hazards.map((coord: Record<string,string>) => ({ x: coord.X, y: coord.Y }))

        return {
            ...gameState,
            turn,
            board: {
                ...gameState.board,
                food,
                snakes,
                hazards
            }
        }
    }

    parseGameData(data: any): GameState {
        const { Game, LastFrame } = data

        const snakes = LastFrame.Snakes.map(this.parseSnakeData)

        // Who cares, it's an observer
        const you = snakes[0]

        return {
            game: {
                id: Game.ID,
                ruleset: {
                    name: Game.Ruleset.name,
                    version: Game.Ruleset.version,
                    settings: {
                        foodSpawnChance: Game.Ruleset.foodSpawnChance,
                        minimumFood: Game.Ruleset.minimumFood,
                        hazardDamagePerTurn: Game.Ruleset.damagePerTurn,
                        royale: {
                            shrinkEveryNTurns: 1
                        },
                        squad: {
                            allowBodyCollisions: true,
                            sharedElimination: true,
                            sharedHealth: true,
                            sharedLength: true
                        }
                    }
                },
                timeout: Game.SnakeTimeout,
                source: Game.Source
            },
            turn: LastFrame.Turn,
            board: {
                height: Game.Height,
                width: Game.width,
                food: LastFrame.Food.map((coord: Record<string,string>) => ({ x: coord.X, y: coord.Y })),
                snakes,
                hazards: LastFrame.Hazards.map((coord: Record<string, string>) => ({ x: coord.X, y: coord.Y }))
            },
            you
        }
    }
}

export default BoardQueue