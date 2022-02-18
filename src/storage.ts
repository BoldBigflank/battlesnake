import { GameState } from "./types"
import * as AWS from 'aws-sdk'
var pjson = require('../package.json')
var util = require('util')
var version = pjson.version

AWS.config.update({region: 'us-east-1'})
const ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'})
const putItem = util.promisify(ddb.putItem)

export async function saveGame(gameState: GameState) {
    const gameId: string = gameState.game.id || (new Date()).toString()
    const outcome = gameState.board.snakes.length === 0 ? 'draw' :
        gameState.board.snakes[0].id === gameState.you.id ? 'win' : 'loss'
    const winner = gameState.board.snakes.length === 0 ? '' : gameState.board.snakes[0].name
    const ruleset = gameState.game.ruleset.name
    const source = gameState.game.source
    const turns = `${gameState.turn}`

    const params: AWS.DynamoDB.PutItemInput = {
        TableName: 'battlesnake',
        Item: {
            'gameId': { S: gameId },
            'version': { S: version },
            'outcome': { S: outcome },
            'winner': { S: winner },
            'ruleset': { S: ruleset },
            'source': { S: source },
            'turns': { N: turns }

        }
    }
    const data = await ddb.putItem(params).promise()
}