<script setup lang="ts">
import { ref, onMounted } from "vue";

interface Charge {
  id: string;
  amount: number;
  currency: string;
  status: string;
  idempotencyKey: string;
  requestHash: string;
}

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const charges = ref<Charge[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    const res = await fetch(`${apiUrl}/charges`);
    charges.value = await res.json();
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Failed to load charges";
  } finally {
    loading.value = false;
  }
});

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: currency || "NZD",
  }).format(amount / 100);
}

function statusClass(status: string): string {
  const s = (status || "").toLowerCase();
  if (s === "succeeded" || s === "completed") return "status--success";
  if (s === "pending") return "status--pending";
  if (s === "failed" || s === "cancelled") return "status--failed";
  return "status--default";
}
</script>

<template>
  <div class="section">
    <h2 class="section-title">Recent charges</h2>

    <div v-if="loading" class="card">
      <div class="spinner" />
      <p>Loading charges…</p>
    </div>

    <div v-else-if="error" class="card card--error">
      <p class="card-title">Couldn’t load charges</p>
      <p class="card-detail">{{ error }}</p>
    </div>

    <div v-else-if="charges.length === 0" class="card">
      <p>No charges yet.</p>
    </div>

    <div v-else class="card card--table">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Amount</th>
              <th>Status</th>
              <th>Idempotency key</th>
              <th>ID</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="charge in charges" :key="charge.id">
              <td>
                <span class="amount">{{
                  formatAmount(charge.amount, charge.currency)
                }}</span>
                <span class="amount-meta">{{ charge.currency }}</span>
              </td>
              <td>
                <span :class="['status', statusClass(charge.status)]">{{
                  charge.status
                }}</span>
              </td>
              <td>
                <code class="code">{{ charge.idempotencyKey || "—" }}</code>
              </td>
              <td>
                <code class="code">{{ charge.id }}</code>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
