import fetch from 'cross-fetch';
import { GameState, APISnake } from "./types"

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
    let colorString = ''
    const numLights = Math.floor(PIXEL_COUNT / board.snakes.length)
    const gameUrl = `https://engine.battlesnake.com/games/${game.id}/frames?offset=0&limit=1`
    const response = await fetch(gameUrl)

    const gameData = await response.json()
    if (gameData.error) {
        console.log(gameUrl)
        console.error(gameData.error)
        return
    }
    gameData.Frames[0].Snakes.forEach((snake: APISnake) => {
        const snakeColor = snake.Color.substr(1) || 'FF00FF'
        colors[snake.Name] = snakeColor
        for (let i = 0; i < numLights; i++) {
            colorString += snakeColor
        }
    })

    colorString = colorString.padEnd(PIXEL_COUNT * 6, '0')
    await sendCloudFunction('colors', colorString)
    await sendCloudFunction('speed', '2000')
}

export async function onGameEnd(gameState: GameState) {
    const { board } = gameState
    if (!ACCESS_TOKEN) {
        console.error('Particle Access Token missing')
        return
    }
    let color = "000000"
    if (board.snakes.length) {
        const winner = board.snakes[0].name
        color = colors[winner] || "FF00FF"
    }
    const colorArray = []
    for (let i = 0; i < PIXEL_COUNT; i++) {
        colorArray.push(color)
    }
    const colorString = colorArray.join('')
    sendCloudFunction('colors', colorString)
    sendCloudFunction('speed', '0')
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
/*
    The function to scrape names/colors from 
    var colors = {}
    var r = document.querySelectorAll('.ladder-row')
    Array.from(r).forEach((e) => {
        const name = e.querySelector('.arena-leaderboard-name').childNodes[2].textContent.trim()
        const hex = e.querySelector('.d-snake-body').attributes.style.textContent.replace(/.*#(\S{6});.+/, '$1')
        colors[name] = hex
    })
    colors
*/