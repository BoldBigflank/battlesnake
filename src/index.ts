if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}
import express, { Request, Response } from "express"
import cors from "cors"

import { routes as royale } from "./routes/royale";
import { routes as standard } from './routes/standard'
import { routes as maze } from './routes/maze'

const app = express()
app.use(express.json())

const corsOptions = {
    origin: ['http://127.0.0.1:5555',
        'http://127.0.0.1:3000',
        /\.battlensnake\.com$/
    ]
}
app.use(cors(corsOptions))

const port = process.env.PORT || 5555

// snake2_v3_FINAL_final(1)
app.use('/', royale(express.Router()))
// Hisstin Milioti
app.use('/standard', standard(express.Router()))
// Arcade Maze Runner
app.use('/maze', maze(express.Router()))

// Start the Express server
app.listen(port, () => {
    console.log(`${Date.now()} Battlesnake Server Started at http://0.0.0.0:${port}`)
});
