<template>
  <canvas ref="myCanvas"></canvas>
  <div v-if="error !== ''"> Uncaught exception: {{ error }} </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Main from './examples/wind/wind'

const myCanvas = ref<HTMLCanvasElement | null>(null)
const error = ref('');

onMounted(() => {
  const canvas = myCanvas.value
  if (!canvas) {
    error.value = 'Canvas not found';
    return;
  }
  canvas.width = 1200
  canvas.height = 1200
  // canvas.style.background = '#f0a0a0'

  try {
    new Main(canvas).run();
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  }
})
</script>