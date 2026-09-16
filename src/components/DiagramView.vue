<script setup lang="ts">
import mermaid from 'mermaid'
import { nextTick, onMounted, watch } from 'vue'

import type { DiagramSpec } from '../api/types'

const props = defineProps<{ diagrams: DiagramSpec[] }>()

mermaid.initialize({ startOnLoad: false })

async function render() {
  await nextTick()
  await mermaid.run({ querySelector: '.diagram-code' })
}

onMounted(render)
watch(() => props.diagrams, render)
</script>

<template>
  <div v-for="(d, i) in diagrams" :key="i" class="diagram-block">
    <h4>{{ d.title }}</h4>
    <pre class="diagram-code mermaid">{{ d.mermaid }}</pre>
  </div>
</template>

<style scoped>
.diagram-block {
  margin-bottom: 32px;
}
</style>
