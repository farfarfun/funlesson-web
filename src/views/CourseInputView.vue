<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'

import { createCourse } from '../api/client'

const router = useRouter()
const message = useMessage()

const url = ref('')
const submitting = ref(false)

async function handleSubmit() {
  if (!url.value.trim()) {
    message.warning('请先粘贴课程视频链接')
    return
  }
  submitting.value = true
  try {
    const job = await createCourse(url.value.trim())
    router.push({ name: 'course-result', params: { id: job.id } })
  } catch (e) {
    message.error(e instanceof Error ? e.message : '提交失败')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="page">
    <h1>funlesson</h1>
    <p class="subtitle">粘贴课程视频链接，自动生成大纲、思维导图、PPT 和架构图</p>
    <div class="form">
      <n-input
        v-model:value="url"
        placeholder="例如 https://www.bilibili.com/video/BVxxxxxxxx"
        @keyup.enter="handleSubmit"
      />
      <n-button type="primary" :loading="submitting" @click="handleSubmit">生成</n-button>
    </div>
  </div>
</template>

<style scoped>
.page {
  max-width: 640px;
  margin: 96px auto;
  padding: 0 24px;
  text-align: center;
}
.subtitle {
  color: #666;
  margin-bottom: 32px;
}
.form {
  display: flex;
  gap: 12px;
}
</style>
