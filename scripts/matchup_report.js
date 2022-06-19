require("dotenv").config();
const AWS = require('aws-sdk')

AWS.config.update({region: 'us-east-1'})
const docClient = new AWS.DynamoDB.DocumentClient();

const now = Date.now()
console.log(now)

const START_OF_LEAGUE = 1646976275000
const END_OF_LEAGUE = 1647313944111

const main = async () => {
    const winnersCount = {}
    const wonAgainst = {}
    const playedCount = {}

    const params = {
        TableName: "battlesnake",
        ProjectionExpression: "#ts, ruleset, #source, gameId, winner, version, snakes, outcome, #n",
        FilterExpression: "ruleset = :ruleset and #ts between :t1 and :t2",
        ExpressionAttributeNames:{
            "#ts": "time",
            "#n": "name",
            "#source": "source"
        },
        ExpressionAttributeValues: {
            ":t1": END_OF_LEAGUE,
            ":t2": now,
            ":ruleset": "wrapped"
        }
    }

    const data = await docClient.scan(params).promise()
    data.Items.forEach((item) => {
        if (!item.winner) return
        const { gameId, winner, snakes, outcome } = item
        // console.log(` - ${item.gameId}: ${item.version} ${item.winner}`)
        // console.log(item)
        if (!winnersCount[winner]) winnersCount[winner] = []
        winnersCount[winner].push(`http://127.0.0.1:3000/?engine=https://engine.battlesnake.com&game=${gameId}`)
        snakes.forEach((snake) => {
            if (!playedCount[snake]) playedCount[snake] = 0
            playedCount[snake] += 1

            if (!wonAgainst[snake]) wonAgainst[snake] = 0
            if (outcome === 'win') {
                wonAgainst[snake] += 1
            }
        })
    })

    Object.keys(winnersCount).sort((a, b) => { return winnersCount[a].length/wonAgainst[a] - winnersCount[b].length/wonAgainst[b] }).forEach((name) => {
        console.log(`${name} -> ${wonAgainst[name]}-${winnersCount[name].length}`)
        winnersCount[name].forEach((url) => {
            console.log(` - ${url}`)
        })
    })

}

main()