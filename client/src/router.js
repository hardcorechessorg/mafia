import { createRouter, createWebHistory } from 'vue-router'
import StartView from './views/StartView.vue'
import HostView from './views/HostView.vue'
import PlayerView from './views/PlayerView.vue'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: StartView },
    { path: '/host/:code', component: HostView },
    { path: '/player/:code', component: PlayerView }
  ]
})
