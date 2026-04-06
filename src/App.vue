<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

import Dashboard from './components/Dashboard.vue';

const lastSavedLabel = ref('')
const isEditMode = ref(false)

const handleLastSavedLabel = event => {
  lastSavedLabel.value = event.detail || ''
}

const toggleEditMode = () => {
  isEditMode.value = !isEditMode.value
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

        <div class="navbar-actions">
          <button
            class="edit-mode-toggle"
            :class="{ active: isEditMode }"
            :aria-pressed="isEditMode"
            type="button"
            @click="toggleEditMode"
          >
            <svg class="edit-mode-toggle-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M13.75 3.75L16.25 6.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M4.16699 15.833H6.52533L15.4163 6.94199C15.7468 6.61155 15.7468 6.07579 15.4163 5.74534L14.2547 4.58367C13.9242 4.25322 13.3884 4.25322 13.058 4.58367L4.16699 13.4747V15.833Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span class="edit-mode-toggle-label">Modo edición</span>
          </button>
        </div>
      </div>
    </nav>
    
    <!-- Contenido principal -->
    <main class="main-content">
      <Dashboard :is-edit-mode="isEditMode" />
    </main>
  </div>
</template>

<style scoped>
@font-face {
  font-family: 'Minimalist';
  src: url('./assets/Minimalist-BF66d6c11b6b54d.otf') format('opentype');
  font-weight: 400;
  font-style: normal;
}

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
  font-family: 'Minimalist', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  color: #1e293b;
  font-size: 3.75rem;
  font-weight: 700;
  margin: 10px;
  background: rgba(0, 0, 0, 0.853);
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
  margin-left: auto;
}

.edit-mode-toggle {
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(248, 250, 252, 0.96);
  color: #334155;
  height: 40px;
  padding: 0 14px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.edit-mode-toggle:hover {
  transform: translateY(-1px);
  border-color: rgba(100, 116, 139, 0.55);
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
}

.edit-mode-toggle.active {
  background: #0f172a;
  color: #f8fafc;
  border-color: rgba(15, 23, 42, 0.88);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.16);
}

.edit-mode-toggle-icon {
  width: 16px;
  height: 16px;
}

.edit-mode-toggle-label {
  font-size: 0.85rem;
  font-weight: 700;
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

  .edit-mode-toggle {
    height: 36px;
    padding: 0 12px;
  }

  .edit-mode-toggle-label {
    font-size: 0.78rem;
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
