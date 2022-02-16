type DirectionString = "up" | "down" | "left" | "right"

const DEBUG = process.env.DEBUG

export default class PriorityList {
    priorityMoves: Record<DirectionString,number>
    constructor() {
        this.priorityMoves = {
            up: 100,
            down: 100,
            left: 100,
            right: 100
        }
    }

    get up() {
        return this.priorityMoves.up
    }

    set up(value) {
        if (DEBUG) console.log(`>> set up ${this.priorityMoves.up} -> ${value}`)
        this.priorityMoves.up = value
    }

    get down() {
        return this.priorityMoves.down
    }

    set down(value) {
        if (DEBUG) console.log(`>> set down ${this.priorityMoves.down} -> ${value}`)
        this.priorityMoves.down = value
    }

    get left() {
        return this.priorityMoves.left
    }

    set left(value) {
        if (DEBUG) console.log(`>> set left ${this.priorityMoves.left} -> ${value}`)
        this.priorityMoves.left = value
    }

    get right() {
        return this.priorityMoves.right
    }

    set right(value) {
        if (DEBUG) console.log(`>> set right ${this.priorityMoves.right} -> ${value}`)
        this.priorityMoves.right = value
    }

    getDirection() {
        const directions = [
            'up',
            'down',
            'left',
            'right'
        ]
        return directions
        .sort((moveA, moveB) => this.priorityMoves[moveB as DirectionString] - this.priorityMoves[moveA as DirectionString])[0]
    }
}

