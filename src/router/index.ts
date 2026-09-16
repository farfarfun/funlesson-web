import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'input',
      component: () => import('../views/CourseInputView.vue'),
    },
    {
      path: '/courses/:id',
      name: 'course-result',
      component: () => import('../views/CourseResultView.vue'),
      props: true,
    },
  ],
})

export default router
