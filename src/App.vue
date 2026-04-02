<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

import Dashboard from './components/Dashboard.vue';

const lastSavedLabel = ref('')

const handleLastSavedLabel = event => {
  lastSavedLabel.value = event.detail || ''
}

onMounted(() => {
  window.addEventListener('flowtrack:last-saved-label', handleLastSavedLabel)
})

onBeforeUnmount(() => {
  window.removeEventListener('flowtrack:last-saved-label', handleLastSavedLabel)
})

</script>

<template>
  <div class="app">
    <!-- Navbar minimalista -->
    <nav class="navbar">
      <div class="navbar-container">
        <div class="brand-group">
          <h1 class="app-title">Flow Track</h1>
          <span v-if="lastSavedLabel" class="last-saved-inline">{{ lastSavedLabel }}</span>
        </div>
        
      </div>
    </nav>
    
    <!-- Contenido principal -->
    <main class="main-content">
      <Dashboard />
    </main>
  </div>
</template>

<style scoped>
/* ==========================================
   APLICACIÓN PRINCIPAL
   ========================================== */

.app {
  min-height: 100vh;
  background-color: #f8fafc;
}

/* ==========================================
   NAVBAR
   ========================================== */

.navbar {
  background: white;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.navbar-container {
  width: 100%;
  padding: 0 24px;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  height: 64px;
}

.brand-group {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.app-title {
  color: #1e293b;
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: none;
}

.last-saved-inline {
  color: #64748b;
  font-size: 0.85rem;
  font-weight: 500;
  font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.navbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-indicator {
  color: #10b981;
  font-size: 0.75rem;
  animation: pulse 2s infinite;
}

.status-text {
  color: #64748b;
  font-size: 0.875rem;
  font-weight: 500;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* ==========================================
   CONTENIDO PRINCIPAL
   ========================================== */

.main-content {
  width: 100%;
  padding: 0;
}

/* ==========================================
   RESPONSIVE
   ========================================== */

@media (max-width: 768px) {
  .navbar-container {
    padding: 0 16px;
    height: 56px;
  }
  
  .app-title {
    font-size: 1.5rem;
  }

  .brand-group {
    gap: 8px;
  }

  .last-saved-inline {
    font-size: 0.75rem;
  }
  
  .status-text {
    display: none;
  }
}

/* ==========================================
   UTILIDADES GLOBALES
   ========================================== */

.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}

.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}

.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
