import fetch from 'cross-fetch';
import { GameState, APISnake } from "./types"
import chalk from 'chalk'

const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const DEVICE_ID = process.env.DEVICE_ID
const particleUrl = `https://api.particle.io/v1/devices/${DEVICE_ID}`
const PIXEL_COUNT = 24

const colors: Record<string,string> = {}

export async function onGameStart(gameState: GameState) {
    const { board, game } = gameState
    if (!ACCESS_TOKEN) {
        console.error('Particle Access Token missing')
        return
    }
    // get the colors from 
    const colorArray: string[] = []
    const numLights = Math.floor(PIXEL_COUNT / board.snakes.length)
    const gameUrl = `https://engine.battlesnake.com/games/${game.id}/frames?offset=0&limit=1`
    const response = await fetch(gameUrl)

    const gameData = await response.json()
    if (gameData.error) {
        console.log(gameUrl)
        console.error(gameData.error)
        return
    }

    const d = new Date()
    console.log(
        chalk.green(d, '- Started', chalk.yellow(`${gameState.game.ruleset.name}`), 'game'),
        chalk.green('from', chalk.yellow(`${gameState.game.source}`))
    )
    console.log(chalk.blue(`https://play.battlesnake.com/g/${game.id}/`))
    gameData.Frames[0].Snakes.forEach((snake: APISnake) => {
        const snakeColor = snake.Color.substr(1) || 'FF00FF'
        // console.log(chalk.green('test'))
        console.log(chalk.hex(snake.Color).bold(`◀■■■◗ ${snake.Name}`))
        colors[snake.Name] = snakeColor
        for (let i = 0; i < numLights - 1; i++) {
            if (i === 0 && snake.ID === gameState.you.id) {
                colorArray.push('FFFFFF')
            } else {
                colorArray.push(snakeColor)
            }
        }
        colorArray.push('000000') // Space between each player
    })

    while(colorArray.length < PIXEL_COUNT) {
        colorArray.push('000000')
    }

    const colorString = colorArray.reverse().join('')
    await sendCloudFunction('colors', colorString)
    await sendCloudFunction('speed', '2000')
}

export async function onGameEnd(gameState: GameState) {
    const { board, you } = gameState
    if (!ACCESS_TOKEN) {
        console.error('Particle Access Token missing')
        return
    }
    let color = "000000"
    const colorArray = []
    console.log(
        chalk.green('Ended', chalk.yellow(`${gameState.game.ruleset.name}`), 'game'),
        chalk.green('from', chalk.yellow(`${gameState.game.source}`)),
        chalk.green('in', chalk.yellow(`${gameState.turn}`), 'moves')
    )
    if (board.snakes.length) {
        const winner = board.snakes[0]
        color = colors[winner.name] || "FF00FF"
        const snakeText = "◀" + "".padStart(winner.length - 2, "■") + "◗"
        if (board.snakes[0].id === gameState.you.id) {
            console.log(
                chalk.hex(`#${color}`).bold(`${snakeText} ${winner.name}`),
                chalk.yellow(`- I WON`)
            )
            colorArray.push('FFFFFF')
        } else {
            console.log(chalk.hex(`#${color}`).bold(`${snakeText} ${winner.name} WINS`))
        }
    } else {
        console.log(chalk.grey.bold("IT'S A DRAW"))
    }
    while (colorArray.length < PIXEL_COUNT - 3) {
        colorArray.push(color)
    }
    while (colorArray.length < PIXEL_COUNT) {
        colorArray.push('000000')
    }
    
    const colorString = colorArray.reverse().join('')
    sendCloudFunction('colors', colorString)
    sendCloudFunction('speed', '6000')
}

async function sendCloudFunction(path: string, args: string) {
    const response = await fetch(`${particleUrl}/${path}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            args
        })
    })
    return response
}
