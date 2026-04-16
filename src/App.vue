<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

import Dashboard from './components/Dashboard.vue';

const lastSavedLabel = ref('')
const isEditMode = ref(false)
const dashboardRef = ref(null)
const createMenuRef = ref(null)

const handleLastSavedLabel = event => {
  lastSavedLabel.value = event.detail || ''
}

const toggleEditMode = () => {
  isEditMode.value = !isEditMode.value
}

const handleOutsideClick = event => {
  if (!dashboardRef.value?.isCreateMenuOpen || !createMenuRef.value) {
    return
  }
  if (!createMenuRef.value.contains(event.target)) {
    dashboardRef.value.toggleCreateMenu()
  }
}

onMounted(() => {
  window.addEventListener('flowtrack:last-saved-label', handleLastSavedLabel)
  document.addEventListener('pointerdown', handleOutsideClick)
})

onBeforeUnmount(() => {
  window.removeEventListener('flowtrack:last-saved-label', handleLastSavedLabel)
  document.removeEventListener('pointerdown', handleOutsideClick)
})

</script>

<template>
  <div class="app">
    <nav class="navbar">
      <div class="navbar-container">
        <div class="brand-group">
          <h1 class="app-title">Flow Track</h1>
          <p class="app-subtitle">Arrastrá desde el Pool hacia un ambiente</p>
        </div>

        <div class="navbar-actions">
          <span v-if="lastSavedLabel" class="last-saved-inline">{{ lastSavedLabel }}</span>
          <div v-if="dashboardRef?.isReady" ref="createMenuRef" class="create-menu-wrap">
            <button
              class="navbar-btn navbar-btn-primary"
              :class="{ active: dashboardRef?.isCreateMenuOpen }"
              :disabled="dashboardRef?.isBusy"
              type="button"
              @click="dashboardRef?.toggleCreateMenu()"
            >
              Crear
            </button>
            <div v-if="dashboardRef?.isCreateMenuOpen" class="create-menu-panel" role="menu" aria-label="Opciones de creación">
              <button
                v-for="action in dashboardRef?.creationActions"
                :key="action.kind"
                class="create-menu-item"
                type="button"
                :disabled="dashboardRef?.isBusy"
                @click="dashboardRef?.selectCreationAction(action.kind)"
              >
                <img :src="action.icon" alt="" class="create-menu-icon" aria-hidden="true" />
                <span class="create-menu-label">{{ action.label }}</span>
              </button>
            </div>
          </div>
          <button
            v-if="dashboardRef?.isReady"
            class="navbar-btn"
            :disabled="dashboardRef?.isBusy"
            type="button"
            @click="dashboardRef?.togglePoolTray()"
          >
            {{ dashboardRef?.showPoolTray ? 'Ocultar Pool' : 'Mostrar Pool' }}
          </button>
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

    <main class="main-content">
      <Dashboard ref="dashboardRef" :is-edit-mode="isEditMode" />
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
  --font-display: 'Minimalist', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  --font-body: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  --surface-canvas: #f6f7f4;
  --surface-panel: #ffffff;
  --surface-subtle: #f8fafc;
  --surface-muted: #f1f5f9;
  --border-subtle: #e2e8f0;
  --border-strong: #cbd5e1;
  --text-strong: #0f172a;
  --text-primary: #1e293b;
  --text-secondary: #475569;
  --text-muted: #64748b;
  --accent: #15803d;
  --accent-strong: #166534;
  --accent-soft: #dcfce7;
  --danger: #b91c1c;
  --danger-soft: #fee2e2;
  --radius-sm: 0;
  --radius-md: 0;
  --radius-lg: 0;
  --type-display: 3.8rem;
  --type-title: 1.9rem;
  --type-body: 1.0625rem;
  --type-meta: 0.9375rem;
  --type-micro: 0.75rem;
  min-height: 100vh;
  background-color: var(--surface-canvas);
  color: var(--text-primary);
  font-family: var(--font-body);
}

.navbar {
  background: rgba(255, 255, 255, 0.94);
  border-bottom: 3px solid #1a1a1a;
  position: sticky;
  top: 0;
  z-index: 100;
}

.navbar-container {
  width: 100%;
  padding: 0 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  min-height: 88px;
  box-sizing: border-box;
}

.brand-group {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  min-width: 0;
  flex-shrink: 1;
}

.app-title {
  margin: 0;
  font-family: var(--font-display);
  color: var(--text-strong);
  font-size: var(--type-display);
  font-weight: 400;
  line-height: 0.95;
  letter-spacing: 0.01em;
}

.app-subtitle {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--type-body);
  line-height: 1.4;
}

.last-saved-inline {
  color: var(--text-muted);
  font-size: var(--type-meta);
  font-weight: 400;
  white-space: nowrap;
}

.navbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.create-menu-wrap {
  position: relative;
}

.create-menu-panel {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  min-width: 240px;
  padding: 10px;
  border: 1px solid var(--border-subtle);
  background: var(--surface-panel);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 110;
}

.create-menu-item {
  width: 100%;
  border: none;
  background: transparent;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-primary);
  font-size: 0.95rem;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
}

.create-menu-item:hover:not(:disabled) {
  background: var(--surface-subtle);
}

.create-menu-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.create-menu-icon {
  width: 18px;
  height: 18px;
  object-fit: contain;
}

.create-menu-label {
  line-height: 1.3;
}

.navbar-btn {
  border: 1px solid #1a1a1a;
  background: var(--surface-panel);
  color: var(--text-primary);
  height: 44px;
  padding: 0 16px;
  border-radius: 0;
  font-size: var(--type-meta);
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.navbar-btn:hover:not(:disabled) {
  background: #f5f5f5;
}

.navbar-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.navbar-btn-primary {
  background: #1a1a1a;
  color: #ffffff;
}

.navbar-btn-primary:hover:not(:disabled) {
  background: #333333;
}

.navbar-btn-primary.active {
  background: #333333;
}

.edit-mode-toggle {
  border: 1px solid #1a1a1a;
  background: var(--surface-panel);
  color: var(--text-primary);
  height: 44px;
  padding: 0 16px;
  border-radius: 0;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

.edit-mode-toggle:hover {
  border-color: #1a1a1a;
  background: #f5f5f5;
  color: var(--text-strong);
}

.edit-mode-toggle.active {
  background: #1a1a1a;
  color: #ffffff;
  border-color: #1a1a1a;
}

.edit-mode-toggle-icon {
  width: 18px;
  height: 18px;
}

.edit-mode-toggle-label {
  font-size: var(--type-meta);
  font-weight: 600;
}

.main-content {
  width: 100%;
  padding: 0;
}

@media (max-width: 768px) {
  .navbar-container {
    padding: 0 16px;
    min-height: 72px;
    flex-wrap: wrap;
    justify-content: flex-start;
  }

  .app-title {
    font-size: 2rem;
  }

  .app-subtitle {
    font-size: 0.875rem;
  }

  .last-saved-inline {
    font-size: var(--type-micro);
  }

  .edit-mode-toggle {
    height: 36px;
    padding: 0 12px;
  }

  .edit-mode-toggle-label {
    font-size: 0.78rem;
  }

  .navbar-actions {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
