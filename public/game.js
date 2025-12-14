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

  template: `
  <div class="max-w-4xl mx-auto p-4 text-gray-100">

    <h1 class="text-2xl font-bold text-purple-400 mb-6">
      <i class="fa-solid fa-mask"></i> Мафия — Онлайн
    </h1>

    <!-- START -->
    <div v-if="screen === 'start'" class="grid md:grid-cols-2 gap-6">
      <div class="bg-black/40 p-6 rounded-xl border border-red-800">
        <h2 class="text-xl font-semibold mb-4 text-red-400">Ведущий</h2>
        <button @click="createGame"
          class="w-full bg-red-600 hover:bg-red-700 py-3 rounded-lg font-semibold">
          Создать игру
        </button>
      </div>

      <div class="bg-black/40 p-6 rounded-xl border border-purple-800">
        <h2 class="text-xl font-semibold mb-4 text-purple-400">Игрок</h2>
        <input v-model="code" placeholder="Код игры"
          class="w-full mb-2 p-2 rounded bg-black border border-purple-700"/>
        <input v-model="name" placeholder="Имя"
          class="w-full mb-2 p-2 rounded bg-black border border-purple-700"/>
        <button @click="joinGame"
          class="w-full bg-purple-600 hover:bg-purple-700 py-3 rounded-lg font-semibold">
          Получить роль
        </button>
      </div>
    </div>

    <!-- HOST -->
    <div v-if="screen === 'host'" class="bg-black/50 p-6 rounded-xl border border-red-800">
      <h2 class="text-xl text-red-400 font-bold mb-2">Ведущий</h2>
      <p class="mb-4">Код игры: <span class="font-mono text-purple-400">{{ code }}</span></p>

      <h3 class="font-semibold mb-2">Игроки</h3>
      <ul>
        <li v-for="p in game.players" :key="p.name">
          {{ p.name }} — {{ p.role.name }}
        </li>
      </ul>
    </div>

    <!-- PLAYER -->
    <div v-if="screen === 'player'" class="text-center">
      <h2 class="text-xl mb-4">{{ player.name }}, ваша роль:</h2>

      <div class="card mx-auto w-64 h-40"
           :class="{flipped: show}"
           @click="show = true">
        <div class="card-inner w-full h-full relative">
          <div class="card-face absolute inset-0 flex items-center justify-center bg-purple-800 rounded-xl">
            Нажмите
          </div>
          <div class="card-face card-back absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-black">
            <h3 class="font-bold text-lg">{{ player.role.name }}</h3>
            <p class="text-sm mt-2 px-2">{{ player.role.desc }}</p>
          </div>
        </div>
      </div>
    </div>

  </div>
  `,

  methods: {
    createGame() {
      socket.emit('create-game', {
        mafia: 2,
        civil: 4,
        sheriff: true,
        doctor: true
      })
    },
    joinGame() {
      socket.emit('join-game', {
        code: this.code,
        name: this.name
      })
    }
  },

  mounted() {
    socket.on('game-created', ({ code }) => {
      this.code = code
      this.screen = 'host'
    })

    socket.on('update', game => {
      this.game = game
    })

    socket.on('your-role', player => {
      this.player = player
      this.screen = 'player'
      setTimeout(() => this.show = true, 300)
    })
  }
}).mount('#app')
