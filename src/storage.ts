import { GameState } from "./types"
import * as AWS from 'aws-sdk'
var pjson = require('../package.json')
var version = pjson.version

AWS.config.update({region: 'us-east-1'})
const docClient = new AWS.DynamoDB.DocumentClient();

export async function startGame(gameState: GameState) {
    const time = Date.now()
    const gameId: string = gameState.game.id
    const snakes = gameState.board.snakes.map((snake) => snake.name)
    const ruleset = gameState.game.ruleset.name
    const source = gameState.game.source
    const name = gameState.you.name
    
    const params: AWS.DynamoDB.DocumentClient.PutItemInput = {
        TableName: 'battlesnake',
        Item: {
            gameId,
            time,
            snakes,
            version,
            ruleset,
            source,
            name
        }
    }
    const data = await docClient.put(params).promise()
}

export async function endGame(gameState: GameState) {
    const table = "battlesnake"

    const gameId: string = gameState.game.id || (new Date()).toString()
    const outcome = gameState.board.snakes.length === 0 ? 'draw' :
        gameState.board.snakes[0].id === gameState.you.id ? 'win' : 'loss'
    const winner = gameState.board.snakes.length === 0 ? '' : gameState.board.snakes[0].name
    const turns = `${gameState.turn}`

    const params = {
        TableName: table,
        Key: {
            gameId
        },
        UpdateExpression: 'set winner = :w, outcome = :o, turns = :t',
        ExpressionAttributeValues: {
            ":w": winner,
            ":o": outcome,
            ":t": turns
        },
        ReturnValues: "UPDATED_NEW"
    }
    const data = await docClient.update(params).promise()
}