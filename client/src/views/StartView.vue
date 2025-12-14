<template>
  <div class="p-6">
    <h1 class="text-2xl mb-4">Мафия Онлайн</h1>

    <button @click="createGame">Создать игру</button>

    <input v-model="code" placeholder="Код игры" />
    <input v-model="name" placeholder="Имя" />

    <button @click="joinGame">Войти</button>
  </div>
</template>

<script setup>
import { socket } from '../socket'
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const code = ref('')
const name = ref('')

function createGame() {
  socket.emit('create-game', {
    mafia: 2,
    civil: 4,
    sheriff: true,
    doctor: true
  })
}

function joinGame() {
  socket.emit('join-game', {
    code: code.value,
    name: name.value
  })
  router.push(`/player/${code.value}`)
}

function onGameCreated(game) {
  router.push(`/host/${game.code}`)
}

onMounted(() => {
  socket.on('game-created', onGameCreated)
})

onUnmounted(() => {
  socket.off('game-created', onGameCreated)
})
</script>
