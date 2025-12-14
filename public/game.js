const socket = io()
const { createApp } = Vue


createApp({
data() {
return {
screen: 'start',
code: '',
name: '',
game: null,
player: null,
show: false
}
},
methods: {
createGame() {
socket.emit('create-game', { mafia: 2, civil: 4, sheriff: true, doctor: true })
},
joinGame() {
socket.emit('join-game', { code: this.code, name: this.name })
}
},
mounted() {
socket.on('game-created', ({ code }) => {
this.code = code
this.screen = 'host'
})
socket.on('update', game => this.game = game)
socket.on('your-role', player => {
this.player = player
this.screen = 'player'
setTimeout(() => this.show = true, 400)
})
}
}).mount('#app')
