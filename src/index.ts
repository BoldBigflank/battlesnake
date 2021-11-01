if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}
import express, { Request, Response } from "express"

import { routes as royale } from "./royale_logic";
import { routes as standard } from './standard_logic'

const app = express()
app.use(express.json())

const port = process.env.PORT || 5555

app.use('/', royale(express.Router()))
app.use('/standard', standard(express.Router()))

// Start the Express server
app.listen(port, () => {
    console.log(`Starting Battlesnake Server at http://0.0.0.0:${port}...`)
});
