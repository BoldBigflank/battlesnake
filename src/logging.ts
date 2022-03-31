import fetch from 'cross-fetch';
import { GameState, APISnake } from "./types"
import chalk from 'chalk'

const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const DEVICE_ID = process.env.DEVICE_ID
const particleUrl = `https://api.particle.io/v1/devices/${DEVICE_ID}`
const PIXEL_COUNT = 24

export async function onGameStart(gameState: GameState) {
    const { board, game } = gameState

    // SnakeLED
    const url = `http://bymy.selfip.com:5556/?gameId=${game.id}`
    fetch(url)
        .catch(err => {
            console.log(chalk.red('Unable to contact SnakeLED'))
        })

    // Pixelring
    const colorArray: string[] = []
    const numLights = Math.floor(PIXEL_COUNT / board.snakes.length)

    // Chalk Logging
    const d = new Date()
    console.log(
        chalk.green(d, '- Started', chalk.yellow(`${gameState.game.ruleset.name}`), 'game'),
        chalk.green('from', chalk.yellow(`${gameState.game.source}`))
    )
    console.log(chalk.blue(`https://play.battlesnake.com/g/${game.id}/`))
    gameState.board.snakes.forEach((snake) => {
        const snakeColor = snake.customizations.color.substring(1) || 'FF00FF'
        // Chalk Logging
        console.log(chalk.hex(snake.customizations.color).bold(`◀■■■◗ ${snake.name}`))

        // Pixelring
        for (let i = 0; i < numLights - 1; i++) {
            if (i === 0 && snake.id === gameState.you.id) {
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
    // await sendCloudFunction('colors', colorString)
    // await sendCloudFunction('speed', '2000')
}

export async function onGameEnd(gameState: GameState) {
    const { board, you } = gameState
    let color = "000000"
    const colorArray = []
    console.log(
        chalk.green('Ended', chalk.yellow(`${gameState.game.ruleset.name}`), 'game'),
        chalk.green('from', chalk.yellow(`${gameState.game.source}`)),
        chalk.green('in', chalk.yellow(`${gameState.turn}`), 'moves')
    )
    if (board.snakes.length) {
        const winner = board.snakes[0]
        color = winner.customizations.color.substring(1)
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
    // sendCloudFunction('colors', colorString)
    // sendCloudFunction('speed', '6000')
}

async function sendCloudFunction(path: string, args: string) {
    if (!ACCESS_TOKEN) {
        console.log(chalk.red('Particle Access Token missing'))
        return
    }
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
