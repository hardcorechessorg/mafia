<script setup>
import { ref } from 'vue'
import { socket } from '../socket'
import { useRouter } from 'vue-router'

const name = ref('')
const router = useRouter()

function createGame() {
  socket.emit('create-room', { name: name.value || 'Игрок' })
}

socket.on('room-created', ({ code }) => {
  router.push(`/host/${code}`)
})
</script>

<template>
  <div>
    <h1>Мафия Онлайн</h1>
    <input v-model="name" placeholder="Имя" />
    <button @click="createGame">Создать игру</button>
  </div>
</template>
