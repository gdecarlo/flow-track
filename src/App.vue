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
    <nav class="navbar">
      <div class="navbar-container">
        <div class="brand-group">
          <h1 class="app-title">Flow Track</h1>
          <p class="app-subtitle">Arrastrá desde el Pool hacia un ambiente</p>
        </div>

        <div class="navbar-actions">
          <span v-if="lastSavedLabel" class="last-saved-inline">{{ lastSavedLabel }}</span>
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
  --radius-sm: 12px;
  --radius-md: 18px;
  --radius-lg: 24px;
  --type-display: 2.8rem;
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
  border-bottom: 1px solid var(--border-subtle);
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
}

.brand-group {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
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
  gap: 18px;
}

.edit-mode-toggle {
  border: 1px solid var(--border-strong);
  background: var(--surface-panel);
  color: var(--text-secondary);
  height: 44px;
  padding: 0 16px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

.edit-mode-toggle:hover {
  border-color: var(--text-secondary);
  color: var(--text-primary);
}

.edit-mode-toggle.active {
  background: var(--surface-subtle);
  color: var(--text-strong);
  border-color: var(--text-primary);
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
