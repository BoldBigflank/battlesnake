import fetch from 'cross-fetch';
import { Board } from "./types"

const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const DEVICE_ID = process.env.DEVICE_ID
const particleUrl = `https://api.particle.io/v1/devices/${DEVICE_ID}`
const PIXEL_COUNT = 24

const colors: Record<string,string> = {
    "Prüzze v2": "C91F37",
    "Salazar Slitherin": "1a472a",
    "WhitishMeteor": "E2E2E2",
    "Cobra Kai Never Die": "000000",
    "haspid": "660033",
    "Nessegrev-gamma": "28398F",
    "😎 Nerdy Caterpillar 🐛": "ff8c08",
    "Pea Eater": "7EA45B",
    "nomblegomble": "6ad7e5",
    "Fer-De-Lance": "dbc696",
    "Black Heart 🖤": "000000",
    "Secret Snake": "bbb088",
    "💀💀💀💀💀": "52024a",
    "Got 'Em in Autumn": "0000ee",
    "Serpentor": "fc8403",
    "hawthhhh++": "fcba03",
    "Rinzler": "c678dd",
    "bsnekGo": "888888",
    "Battlesnakev2.0": "2B398F",
    "Rocket Scarf": "316000",
    "Giskard": "888888",
    "⚛️➡️Snake⬆️⚛️": "013ADF",
    "BattlePolar": "20205f",
    "Demifemme (She or They pronouns)": "ffaec9",
    "Untimely Neglected Wearable": "306448",
    "Rhumba": "0da8a8",
    "ChoffesBattleSnakeV1": "b7410e",
    "sharptooth": "89e17e",
    "testOne": "888888",
    "trentren-vilu": "6b3e2e",
    "Venusian 2": "dcc010",
    "GaneshTheDestroyer": "f7c244",
    "Rufio the Tenacious": "DF0000",
    "Ava": "00a8ff",
    "Exploradora": "930318",
    "Fairy Rust": "bb77cc",
    "king crimson": "FF0F3F",
    "pastaz": "FF0002",
    "snakos": "ff8645",
    "Nodaconda-RED": "a22222",
    "Shai-Hulud": "930318",
    "anaconda blue": "03d3fc",
    "Devious Devin": "99cc00",
    "Kisnake": "99FF00",
    "Ready, Set, Hike!": "008ECC",
    "lil snek": "f6cce7",
    "Kuro": "CAF7E3",
    "Hunter": "59FFFF",
    "pacevedo": "11FF00",
    "Polar Unicorn": "0F52BA",
    "π-thon": "0b6623",
    "ekmek_the_snek": "beef69",
    "EzSnek": "4fddac",
    "Crimson": "990000",
    "royal bank of poogers": "ff00ff",
    "Silly Sea Noodle": "30D5C8",
    "Akira": "666666",
    "Strawberry Boom!": "F92016",
    "Idzol": "FF00FF",
    "snake2_v3_FINAL_final": "1778B5",
    "Black Kuwahara": "000000",
    "hungry hungry carlos": "2B398F",
    "RedDragon": "FF0000",
    "Snake Eyes 2": "FF7518",
    "a noodle full of danger": "134106",
    "SociableSnake": "00711c",
    "Dutch Viper (Pofadder)": "ff00aa",
    "Snake Plissken": "3dcd58",
    "dancing-mamba": "B727F1",
    "Ouroboros": "34ebb7",
    "Bobby Witt": "888888",
    "Steven Cheeseburger": "FF69B4",
    "RoboSnake - Raptor": "2c8ed4",
    "clj-hench": "61EB42",
    "LongChamp": "39FF14",
    "ruby-danger-noodle": "48ffa8",
    "Wheat Bread": "F3D5A5",
    "Tickle McWiggleWorm": "238270",
    "Augustus": "66023C",
    "CorneliusCodes": "F09383",
    "Ophion": "0FB6E9",
    "Cabeza": "CC2936",
    "TunnelSnakes": "3E338F",
    "Badly Coded Snake": "316000",
    "cautious-octo-pancake": "00D084",
    "Pumpkin Pie": "ffa64d",
    "Alarming Scarf": "a32100",
    "Naive, but kinda hungry": "1a0a74",
    "Potoooooooo": "826a21",
    "Dipstick": "2B398F",
    "^SandySnek^": "ff9933",
    "DragoSnek Mk 2": "32b3fb",
    "tr0usersnake": "42C0FB",
    "mudbuzzer": "990000",
    "Avenger": "7c0a02",
    "Henry": "ff0000",
    "Eve": "0022cc",
    "Bushmaster2.0": "A40606",
    "New Age": "2B398F",
    "equis": "669d83",
    "Have you seen a snake?": "00cc99",
    "JS Defensive Hungry Snake": "328da8",
    "Super Awesome Chaos Snek": "3E338F",
    "Dr7": "9090ff",
    "test": "99ff99",
    "kunals-best-snake": "306448",
    "foobax 101": "ffc0cb",
    "blobSnake": "FF5733",
    "MinoTAURO": "888888",
    "007": "40ee35",
    "bun": "f05627",
    "Becca Lyria": "451c70",
    "Megaton Collective": "113380",
    "Hypatia": "ff8a05",
    "Nagini": "2EB5E0",
    "vomc": "8080ff",
    "BasicSnake": "888888",
    "SimpleSnake": "888888",
    "first": "fd9f09",
    "Phil the Cheese Snek": "f08a45",
    "jestyjanet": "736CCB",
    "BasicStrats": "ff0000",
    "Appelmoes Coderdojo": "FFFF00",
    "Blindschleiche 😎": "6c63ff",
    "JS-Snake": "A6C1D5",
    "MiniSnake": "b33dc3",
    "Snek": "ff1a75",
    "🐍 Sneki Snek 🐍": "E0115F",
    "swattz": "C0C0C0",
    "test snake": "000000",
    "Toby Flendersnake": "2B398F",
    "MuddyMan": "4d0019",
    "Legendary Snake": "736CCB",
    "sizzle": "888888",
    "challenge": "6600ff",
    "Tentative Tiger": "0000FF",
    "ekans v1": "800080",
    "LoopSnake": "FC6D26",
    "Tiberius Fjord": "ebb22d",
    "He/Him/Hiss": "0f3d17",
    "T-1000": "111111",
    "team-snake01": "88ff88"
}

export async function onGameStart(board: Board) {
    let colorString = ''
    const numLights = Math.floor(PIXEL_COUNT / board.snakes.length)
    board.snakes.forEach((snake) => {
        const snakeColor = colors[snake.name] || 'FF00FF'
        for (let i = 0; i < numLights; i++) {
            colorString += snakeColor
        }
    })

    colorString = colorString.padEnd(PIXEL_COUNT * 6, '0')
    await sendCloudFunction('colors', colorString)
    await sendCloudFunction('speed', '2000')
}

export async function onGameEnd(board: Board) {
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