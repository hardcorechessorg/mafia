import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'


const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer)


app.use(express.static('public'))


const games = {}


io.on('connection', socket => {


socket.on('create-game', settings => {
const code = 'MAFIA-' + Math.floor(1000 + Math.random() * 9000)
games[code] = { settings, players: [] }
socket.join(code)
socket.emit('game-created', { code })
})


socket.on('join-game', ({ code, name }) => {
const game = games[code]
if (!game) return


const role = assignRole(game)
const player = { name, role }
game.players.push(player)


io.to(code).emit('update', game)
socket.emit('your-role', player)
})
})


function assignRole(game) {
const pool = []
for (let i = 0; i < game.settings.mafia; i++) pool.push('mafia')
if (game.settings.sheriff) pool.push('sheriff')
if (game.settings.doctor) pool.push('doctor')
for (let i = 0; i < game.settings.civil; i++) pool.push('civil')


const used = game.players.map(p => p.role.key)
const available = pool.filter(r => !used.includes(r))
const key = available[Math.floor(Math.random() * available.length)]


return roleMap[key]
}


const roleMap = {
mafia: { key: 'mafia', name: 'Мафия', team: 'black', desc: 'Ночью устраняете игроков' },
sheriff: { key: 'sheriff', name: 'Шериф', team: 'red', desc: 'Проверяете игроков' },
doctor: { key: 'doctor', name: 'Доктор', team: 'red', desc: 'Лечите игроков' },
civil: { key: 'civil', name: 'Мирный', team: 'red', desc: 'Выживайте' }
}


const PORT = process.env.PORT || 3000
httpServer.listen(PORT, () => {
  console.log('Mafia Dealer running on port', PORT)
})

