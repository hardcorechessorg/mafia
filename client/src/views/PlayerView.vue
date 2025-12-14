<template>
  <div class="p-6">
    <h2>Ваша роль</h2>
    <p>{{ role.name }}</p>
    <p>{{ role.desc }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { socket } from '../socket'

const role = ref({})

socket.on('your-role', r => role.value = r)
</script>
