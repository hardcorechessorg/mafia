import { createRouter, createWebHistory } from 'vue-router'
import StartView from './views/StartView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: StartView
    }
  ]
})

export default router

