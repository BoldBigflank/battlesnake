if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}
import express, { Request, Response } from "express"
import cors from "cors"

import { routes as royale } from "./routes/royale";
import { routes as standard } from './routes/standard'
import { routes as board } from './routes/board'

const app = express()
app.use(express.json())
app.use(cors({
    origin: ['http://127.0.0.1:3000']
}))

const port = process.env.PORT || 5555

// snake2_v3_FINAL_final(1)
app.use('/', royale(express.Router()))
// Hisstin Milioti
app.use('/standard', standard(express.Router()))
// LED Board
app.use('/board', board(express.Router()))

// Start the Express server
app.listen(port, () => {
    console.log(`Starting Battlesnake Server at http://0.0.0.0:${port}...`)
});
