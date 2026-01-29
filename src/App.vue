<script setup>
import Dashboard from './components/Dashboard.vue';

</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <div class="topbar-left">
        <h1 class="topbar-title">Gestión de Releases</h1>
      </div>
      <div class="topbar-actions">
        <div class="select-wrapper">
          <select class="project-select" aria-label="Seleccionar proyecto">
            <option>Proyecto A (CRM Interno)</option>
            <option>Proyecto B (App Móvil)</option>
            <option>Proyecto C (Web Pública)</option>
          </select>
        </div>
        <button class="primary-btn">Nuevo Release</button>
      </div>
    </header>

    <main class="content-area">
      <Dashboard />
    </main>
  </div>
</template>

<style scoped>
/* ==========================================
   APLICACIÓN PRINCIPAL
   ========================================== */

.app-shell {
  min-height: 100vh;
  background: #f4f6fb;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
}

.topbar-title {
  margin: 0;
  font-size: 1.6rem;
  font-weight: 700;
  color: #1f2937;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.select-wrapper {
  position: relative;
}

.project-select {
  appearance: none;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  padding: 8px 36px 8px 12px;
  border-radius: 8px;
  font-size: 0.9rem;
  color: #1f2937;
  box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.05);
}

.project-select:focus {
  outline: none;
  border-color: #94a3b8;
  box-shadow: 0 0 0 3px rgba(148, 163, 184, 0.2);
}

.select-wrapper::after {
  content: '▾';
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #64748b;
  pointer-events: none;
  font-size: 0.75rem;
}

.primary-btn {
  border: none;
  background: #1e3a8a;
  color: #ffffff;
  padding: 8px 16px;
  border-radius: 10px;
  font-weight: 600;
  box-shadow: 0 8px 16px rgba(30, 58, 138, 0.2);
  cursor: pointer;
}

.primary-btn:hover {
  background: #1e40af;
}

.content-area {
  padding: 16px 20px 28px;
}

@media (max-width: 900px) {
  .topbar {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}
</style>
