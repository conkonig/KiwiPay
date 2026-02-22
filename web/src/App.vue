<script setup lang="ts">
import { ref, onMounted } from "vue";
import ChargesTable from "./components/ChargesTable.vue";

const apiHealth = ref<{ ok?: boolean } | null>(null);
const apiError = ref<string | null>(null);
const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

onMounted(async () => {
  try {
    const res = await fetch(`${apiUrl}/health`);
    apiHealth.value = await res.json();
  } catch (e) {
    apiError.value = e instanceof Error ? e.message : "Failed to fetch health";
  }
});
</script>

<template>
  <div class="app">
    <header class="header">
      <div class="header-inner">
        <div class="header-brand">
          <div class="logo">K</div>
          <h1 class="title">KiwiPay Dashboard</h1>
        </div>
        <span v-if="apiHealth" :class="['badge', apiHealth.ok ? 'badge--ok' : 'badge--warn']">
          <span class="badge-dot" />
          API {{ apiHealth.ok ? "Connected" : "Not OK" }}
        </span>
        <span v-else-if="apiError" class="badge badge--error">
          <span class="badge-dot" />
          {{ apiError }}
        </span>
        <span v-else class="badge badge--loading">
          <span class="badge-dot" />
          Connecting…
        </span>
      </div>
    </header>
    <main class="main">
      <ChargesTable />
    </main>
  </div>
</template>
