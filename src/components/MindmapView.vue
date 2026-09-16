<script setup lang="ts">
import { Transformer } from 'markmap-lib'
import { Markmap } from 'markmap-view'
import { onMounted, ref, watch } from 'vue'

const props = defineProps<{ markdown: string }>()

const svgRef = ref<SVGSVGElement | null>(null)
let markmap: Markmap | null = null
const transformer = new Transformer()

function render() {
  if (!svgRef.value) return
  const { root } = transformer.transform(props.markdown)
  if (!markmap) {
    markmap = Markmap.create(svgRef.value)
  }
  markmap.setData(root)
  markmap.fit()
}

onMounted(render)
watch(() => props.markdown, render)
</script>

<template>
  <svg ref="svgRef" class="mindmap"></svg>
</template>

<style scoped>
.mindmap {
  width: 100%;
  height: 560px;
}
</style>
