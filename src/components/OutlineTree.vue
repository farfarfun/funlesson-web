<script setup lang="ts">
import type { OutlineNode } from '../api/types'

defineProps<{ nodes: OutlineNode[] }>()

function formatTs(seconds: number | null): string {
  if (seconds === null) return ''
  const total = Math.floor(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => n.toString().padStart(2, '0')
  return h ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}
</script>

<template>
  <ul class="outline">
    <li v-for="node in nodes" :key="node.title + node.start">
      <span>{{ node.title }}</span>
      <span v-if="node.start !== null" class="ts">（{{ formatTs(node.start) }}）</span>
      <OutlineTree v-if="node.children.length" :nodes="node.children" />
    </li>
  </ul>
</template>

<style scoped>
.outline {
  list-style: disc;
  padding-left: 20px;
}
.ts {
  color: #999;
  font-size: 12px;
}
</style>
