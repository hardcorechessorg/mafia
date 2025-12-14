<template>
  <div class="p-6">
    <h2>Ведущий — {{ code }}</h2>
    <ul>
      <li v-for="p in game.players" :key="p.name">
        {{ p.name }} — {{ p.role.name }}
      </li>
    </ul>
  </div>
</template>

<script setup>
import { socket } from '../socket'
import { ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const code = route.params.code
const game = ref({ players: [] })

socket.on('game-update', g => game.value = g)
</script>
