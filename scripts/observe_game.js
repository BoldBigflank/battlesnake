const WebSocket = require('isomorphic-ws')

const engineWsUrl = (gameId) => {
    return `wss://engine.battlesnake.com/games/${gameId}/events`
}

const sleep = (n) => { return new Promise(r => setTimeout(r, n)); }

const main = async () => {
    const GAME_ID = process.argv[2]
    if (!GAME_ID) {
        console.log('Please include a game id')
        process.exit(1)
    }
    console.log('connecting')
    const webSocket = new WebSocket(engineWsUrl(GAME_ID))
    webSocket.onmessage = handleMessage
    webSocket.onclose = handleClose
    
    await sleep(2000)
    console.log()
}

const handleMessage = (event) => {
    const message = JSON.parse(event.data)
    console.log('received event', message)
    if (message.Type === 'game_end') {
        console.log('game ended', Object.keys(event))
        event.target.close()
    }
    if (message.Type === 'frame') {
        // Pass that frame to the board queue
        
    }
}

const handleClose = (event) => {
    console.log('closing')
}

main()