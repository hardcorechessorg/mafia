import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import path from 'path'
import { fileURLToPath } from 'url'

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer)

/* ======= path setup (ESM-safe) ======= */
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/* ======= in-memory game store ======= */
const games = new Map()

function generateCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase()
}

/* ======= socket logic ======= */
io.on('connection', socket => {
  console.log('Connected:', socket.id)

  socket.on('create-game', config => {
    const code = generateCode()
    games.set(code, {
      code,
      config,
      players: []
    })

    socket.emit('game-created', { code })
  })

  socket.on('join-game', ({ code, name }) => {
    const game = games.get(code)
    if (!game) return

    const player = {
      id: socket.id,
      name,
      role: null
    }

    game.players.push(player)
    socket.join(code)

    io.to(code).emit('players-update', game.players)
  })

  socket.on('disconnect', () => {
    for (const game of games.values()) {
      game.players = game.players.filter(p => p.id !== socket.id)
      io.to(game.code).emit('players-update', game.players)
    }
  })
})

/* ======= serve frontend ======= */
app.use(express.static(path.join(__dirname, 'client/dist')))

app.get('*', (_, res) => {
  res.sendFile(path.join(__dirname, 'client/dist/index.html'))
})

/* ======= start ======= */
const PORT = process.env.PORT || 3000
httpServer.listen(PORT, () => {
  console.log('Server running on port', PORT)
})
