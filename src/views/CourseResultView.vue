<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import DiagramView from '../components/DiagramView.vue'
import MindmapView from '../components/MindmapView.vue'
import OutlineTree from '../components/OutlineTree.vue'
import { getCourse, pptDownloadUrl } from '../api/client'
import type { CourseJob } from '../api/types'

const props = defineProps<{ id: string }>()

const job = ref<CourseJob | null>(null)
const errorMessage = ref('')
let timer: ReturnType<typeof setTimeout> | null = null

const stepLabel: Record<string, string> = {
  fetch: '下载视频音频',
  asr: '语音转写',
  outline: '生成大纲',
  mindmap: '生成思维导图',
  ppt: '生成 PPT',
  diagram: '生成架构图',
}

const statusText = computed(() => {
  if (!job.value) return '加载中...'
  if (job.value.status === 'pending') return '排队中...'
  if (job.value.status === 'running') {
    return `处理中：${stepLabel[job.value.step ?? ''] ?? job.value.step}`
  }
  if (job.value.status === 'failed') return `处理失败：${job.value.error}`
  return '完成'
})

// 只有语音转写（asr）这一步有 whisper 内部逐帧算出来的精确百分比，
// 其余步骤仍然只是"进行中"这个粗粒度信息，用不确定态的转圈表示。
const asrPercentage = computed(() => {
  if (!job.value) return null
  if (job.value.status !== 'running' || job.value.step !== 'asr') return null
  if (job.value.progress == null) return null
  return Math.round(job.value.progress * 100)
})

async function poll() {
  try {
    job.value = await getCourse(props.id)
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : '加载失败'
    return
  }
  if (job.value.status === 'pending' || job.value.status === 'running') {
    timer = setTimeout(poll, 2000)
  }
}

onMounted(poll)
onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
})
</script>

<template>
  <div class="page">
    <n-alert v-if="errorMessage" type="error" :title="errorMessage" />
    <template v-else>
      <n-h2>{{ job?.result?.outline.title || job?.url || id }}</n-h2>
      <n-p>{{ statusText }}</n-p>
      <n-progress
        v-if="asrPercentage !== null"
        type="line"
        :percentage="asrPercentage"
        :processing="asrPercentage < 100"
      />
      <n-spin
        v-else-if="job?.status === 'pending' || job?.status === 'running'"
        size="large"
      />

      <div v-if="job?.status === 'done' && job.result" class="result">
        <n-tabs type="line" animated>
          <n-tab-pane name="outline" tab="大纲">
            <OutlineTree :nodes="job.result.outline.nodes" />
          </n-tab-pane>
          <n-tab-pane name="mindmap" tab="思维导图">
            <MindmapView :markdown="job.result.mindmap" />
          </n-tab-pane>
          <n-tab-pane v-if="job.result.diagrams.length" name="diagram" tab="架构图">
            <DiagramView :diagrams="job.result.diagrams" />
          </n-tab-pane>
          <n-tab-pane name="ppt" tab="PPT">
            <n-button tag="a" :href="pptDownloadUrl(id)" type="primary">下载 PPT</n-button>
          </n-tab-pane>
          <n-tab-pane name="transcript" tab="逐字稿">
            <p class="transcript">{{ job.result.transcript.full_text }}</p>
          </n-tab-pane>
        </n-tabs>
      </div>
    </template>
  </div>
</template>

<style scoped>
.page {
  max-width: 960px;
  margin: 48px auto;
  padding: 0 24px;
}
.result {
  margin-top: 24px;
}
.transcript {
  white-space: pre-wrap;
  line-height: 1.8;
}
</style>
