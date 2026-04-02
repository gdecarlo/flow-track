<template>
  <div class="deployment-dashboard">
    <div v-if="isReady" class="dashboard-status-bar" :class="{ 'has-error': persistenceError }">
      <span>{{ isSaving ? 'Guardando cambios en Supabase...' : 'Supabase conectado' }}</span>
      <span v-if="lastSavedLabel" class="status-meta">{{ lastSavedLabel }}</span>
      <span v-if="persistenceError" class="status-error">{{ persistenceError }}</span>
    </div>

    <div v-if="isInitializing" class="dashboard-state-panel">
      <h2 class="dashboard-state-title">Cargando tablero</h2>
      <p class="dashboard-state-copy">Recuperando el snapshot compartido desde Supabase.</p>
    </div>

    <div v-else-if="!isReady" class="dashboard-state-panel error-state">
      <h2 class="dashboard-state-title">No se pudo inicializar la persistencia</h2>
      <p class="dashboard-state-copy">{{ persistenceError || 'Revisa la configuración de Supabase y vuelve a intentar.' }}</p>
      <button class="state-action-btn" @click="retryInitialize">Reintentar</button>
    </div>

    <div v-else class="dashboard-container">
      <!-- Columna Izquierda: Lista de Artefactos -->
      <div class="left-column">
        <h2 class="section-title">Artefactos</h2>
        
        <!-- Releases con Items -->
        <div class="releases-container">
          <div class="subsection-header">
            <h3 class="subsection-title">Releases</h3>
            <button 
              class="add-item-btn"
              @click="toggleNewReleaseForm"
              :disabled="isBusy"
              :class="{ 'active': showNewReleaseForm }"
            >
              <span class="add-icon">{{ showNewReleaseForm ? '×' : '+' }}</span>
            </button>
          </div>

          <!-- Formulario para nuevo release -->
          <div v-if="showNewReleaseForm" class="new-item-form">
            <input
              ref="releaseNameInput"
              v-model="newRelease.name"
              type="text"
              placeholder="Numero de release. Ej: 3.2.1"
              :disabled="isBusy"
              class="item-title-input"
              :class="{ 'error': isDuplicateRelease }"
              @keyup.enter="createNewRelease"
              @keyup.escape="cancelNewRelease"
            />
            <div v-if="isDuplicateRelease" class="error-message">
              ⚠️ Ya existe un release con este nombre
            </div>
            <div class="form-controls">
              <div class="form-buttons">
                <button @click="createNewRelease" class="save-btn" :disabled="!newRelease.name.trim() || isDuplicateRelease">
                  ✓
                </button>
                <button @click="cancelNewRelease" class="cancel-btn" :disabled="isSaving">
                  ×
                </button>
              </div>
            </div>
          </div>

          <div 
            v-for="release in availableReleases" 
            :key="release.id" 
            class="release-card"
          >
            <div 
              class="release-header draggable-item"
              :data-type="'release'"
              :data-id="release.id"
              :draggable="!isBusy"
              @dragstart="handleDragStart"
              @dragover.prevent
              @dragenter.prevent
              @drop="handleDropOnRelease($event, release.id)"
            >
              <h3>{{ release.name }}</h3>
              <p class="release-description">{{ release.description }}</p>
              <span class="item-count">{{ getAvailableItemsForRelease(release).length }} items disponibles</span>
            </div>
            
            <!-- Items dentro del Release que están disponibles -->
            <div class="items-container" v-if="getAvailableItemsForRelease(release).length > 0">
              <div
                v-for="item in getAvailableItemsForRelease(release)"
                :key="item.id"
                class="item-card draggable-item"
                :class="`item-${item.type}`"
                :data-type="'item'"
                :data-id="item.id"
                :data-release-id="release.id"
                draggable="true"
                @dragstart="handleDragStart"
              >
                <div class="item-header">
                  <div class="item-info">
                    <span class="item-type-badge" :class="`badge-${item.type}`">
                      <span class="badge-icon">{{ item.type === 'feature' ? '★' : item.type === 'fix' ? '🔧' : '⚠' }}</span>
                      {{ item.type.charAt(0).toUpperCase() + item.type.slice(1) }}
                    </span>
                  </div>
                  <div class="item-actions">
                    <button class="action-btn info-btn" title="Información">
                      <span>ⓘ</span>
                    </button>
                    <button class="action-btn edit-btn" title="Editar">
                      <span>✎</span>
                    </button>
                  </div>
                </div>
                <p class="item-title">{{ item.title }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Items sin Release -->
        <div class="standalone-items">
          <div class="subsection-header">
            <h3 class="subsection-title">Items Independientes</h3>
            <button 
              class="add-item-btn"
              @click="toggleNewItemForm"
              :disabled="isBusy"
              :class="{ 'active': showNewItemForm }"
            >
              <span class="add-icon">{{ showNewItemForm ? '×' : '+' }}</span>
            </button>
          </div>

          <!-- Formulario para nuevo item -->
          <div v-if="showNewItemForm" class="new-item-form">
            <input
              ref="titleInput"
              v-model="newItem.title"
              type="text"
              placeholder="Título del item..."
              :disabled="isBusy"
              class="item-title-input"
              @keyup.enter="createNewItem"
              @keyup.escape="cancelNewItem"
            />
            <div class="form-controls">
              <select v-model="newItem.type" class="item-type-select" :disabled="isBusy">
                <option value="feature">Feature</option>
                <option value="fix">Fix</option>
                <option value="hotfix">Hotfix</option>
              </select>
              <div class="form-buttons">
                <button @click="createNewItem" class="save-btn" :disabled="!newItem.title.trim() || isBusy">
                  ✓
                </button>
                <button @click="cancelNewItem" class="cancel-btn" :disabled="isSaving">
                  ×
                </button>
              </div>
            </div>
          </div>

          <div
            v-for="item in availableStandaloneItems"
            :key="item.id"
            class="item-card draggable-item"
            :class="`item-${item.type}`"
            :data-type="'item'"
            :data-id="item.id"
            :draggable="!isBusy"
            @dragstart="handleDragStart"
          >
            <div class="item-header">
              <div class="item-info">
                <span class="item-type-badge" :class="`badge-${item.type}`">
                  <span class="badge-icon">{{ item.type === 'feature' ? '★' : item.type === 'fix' ? '🔧' : '⚠' }}</span>
                  {{ item.type.charAt(0).toUpperCase() + item.type.slice(1) }}
                </span>
              </div>
              <div class="item-actions">
                <button class="action-btn info-btn" title="Información">
                  <span>ⓘ</span>
                </button>
                <button class="action-btn edit-btn" title="Editar">
                  <span>✎</span>
                </button>
              </div>
            </div>
            <p class="item-title">{{ item.title }}</p>
          </div>
        </div>
      </div>

      <!-- Columna Derecha: Tablero Kanban de Ambientes -->
      <div class="right-column">
        <div class="section-header">
          <h2 class="section-title">Ambientes de Despliegue</h2>
          <button 
            class="add-item-btn"
            @click="toggleNewEnvironmentForm"
            :disabled="isBusy"
            :class="{ 'active': showNewEnvironmentForm }"
            title="Agregar ambiente"
          >
            <span class="add-icon">{{ showNewEnvironmentForm ? '×' : '+' }}</span>
          </button>
        </div>

        <!-- Formulario para nuevo ambiente -->
        <div v-if="showNewEnvironmentForm" class="new-environment-form">
          <input
            ref="environmentNameInput"
            v-model="newEnvironment.name"
            type="text"
            placeholder="Nombre del ambiente..."
            :disabled="isBusy"
            class="environment-name-input"
            @keyup.enter="createNewEnvironment"
            @keyup.escape="cancelNewEnvironment"
          />
          <div class="form-controls">
            <div class="form-buttons">
              <button @click="createNewEnvironment" class="save-btn" :disabled="!newEnvironment.name.trim() || isDuplicateEnvironment || isBusy">
                ✓
              </button>
              <button @click="cancelNewEnvironment" class="cancel-btn" :disabled="isSaving">
                ×
              </button>
            </div>
          </div>
          <div v-if="isDuplicateEnvironment" class="error-message">
            ⚠️ Ya existe un ambiente con este nombre
          </div>
        </div>
        
        <div class="kanban-board">
          <div 
            v-for="environment in sortedEnvironments" 
            :key="environment.id"
            class="environment-column"
            @dragover.prevent
            @dragenter.prevent
            @drop="handleDrop($event, environment.id)"
          >
            <div class="environment-header">
              <div class="environment-title">
                <h3>{{ environment.name }}</h3>
                <div class="environment-controls">
                  <button 
                    @click="moveEnvironmentUp(environment.id)"
                    class="move-btn"
                    :disabled="isBusy || sortedEnvironments.findIndex(env => env.id === environment.id) <= 0"
                    title="Mover hacia la izquierda"
                  >
                    ◄
                  </button>
                  <button 
                    @click="moveEnvironmentDown(environment.id)"
                    class="move-btn"
                    :disabled="isBusy || sortedEnvironments.findIndex(env => env.id === environment.id) >= sortedEnvironments.length - 1"
                    title="Mover hacia la derecha"
                  >
                    ►
                  </button>
                </div>
              </div>
            </div>
            
            <div class="deployments-container">
              <!-- Releases desplegados -->
              <div
                v-for="deployment in getDeploymentsByEnvironment(environment.id).filter(d => d.type === 'release')"
                :key="`release-${deployment.itemId}`"
                class="deployed-release draggable-item"
                :data-type="'release'"
                :data-id="deployment.itemId"
                :draggable="!isBusy"
                @dragstart="handleDragStart"
                @dragover.prevent
                @dragenter.prevent
                @drop="handleDropOnDeployedRelease($event, deployment.itemId)"
              >
                <div class="deployment-header">
                  <h4>{{ getReleaseById(deployment.itemId)?.name }}</h4>
                  <span class="deployment-date">{{ formatDate(deployment.deployedAt) }}</span>
                </div>
                <p class="deployment-description">
                  {{ getReleaseById(deployment.itemId)?.description }}
                </p>
                <div class="deployment-items">
                  <div v-for="item in getDeployedReleaseItems(deployment)" 
                        :key="item.id" 
                        class="deployed-item-detail"
                        :class="`item-${item.type}`">
                    <span class="item-type-badge" :class="`badge-${item.type}`">
                      <span class="badge-icon">{{ item.type === 'feature' ? '★' : item.type === 'fix' ? '🔧' : '⚠' }}</span>
                      {{ item.type.charAt(0).toUpperCase() + item.type.slice(1) }}
                    </span>
                    <span class="item-title">{{ item.title }}</span>
                    <div class="item-actions-small">
                      <button class="action-btn-small" title="Información">ⓘ</button>
                      <button class="action-btn-small" title="Editar">✎</button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Items individuales desplegados -->
              <div
                v-for="deployment in getDeploymentsByEnvironment(environment.id).filter(d => d.type === 'item')"
                :key="`item-${deployment.itemId}`"
                class="deployed-item draggable-item"
                :class="`item-${getItemById(deployment.itemId)?.type}`"
                :data-type="'item'"
                :data-id="deployment.itemId"
                :draggable="!isBusy"
                @dragstart="handleDragStart"
              >
                <div class="deployment-header">
                  <span class="item-type-badge" :class="`badge-${getItemById(deployment.itemId)?.type}`">
                    <span class="badge-icon">{{ getItemById(deployment.itemId)?.type === 'feature' ? '★' : getItemById(deployment.itemId)?.type === 'fix' ? '🔧' : '⚠' }}</span>
                    {{ getItemById(deployment.itemId)?.type?.charAt(0).toUpperCase() + getItemById(deployment.itemId)?.type?.slice(1) }}
                  </span>
                  <div class="item-actions">
                    <button class="action-btn info-btn" title="Información"><span>ⓘ</span></button>
                    <button class="action-btn edit-btn" title="Editar"><span>✎</span></button>
                  </div>
                </div>
                <p class="deployed-item-title">{{ getItemById(deployment.itemId)?.title }}</p>
                <span class="deployment-date">{{ formatDate(deployment.deployedAt) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

import { useFlowTrackDomain } from '../composables/useFlowTrackDomain'

const {
  initialize,
  isInitializing,
  isSaving,
  isReady,
  persistenceError,
  lastSavedAt,
  availableReleases,
  availableStandaloneItems,
  sortedEnvironments,
  formatDate,
  getAvailableItemsForRelease,
  getDeploymentsByEnvironment,
  getReleaseById,
  getItemById,
  getDeployedReleaseItems,
  hasDuplicateReleaseName,
  hasDuplicateEnvironmentName,
  createNewItem: createDomainItem,
  createNewRelease: createDomainRelease,
  createNewEnvironment: createDomainEnvironment,
  moveEnvironmentUp: persistMoveEnvironmentUp,
  moveEnvironmentDown: persistMoveEnvironmentDown,
  addItemToRelease,
  addItemToActiveRelease,
  deployArtifact
} = useFlowTrackDomain()

const dragData = ref(null)

const showNewItemForm = ref(false)
const newItem = ref({
  title: '',
  type: 'feature'
})
const titleInput = ref(null)

const showNewReleaseForm = ref(false)
const newRelease = ref({
  name: ''
})
const releaseNameInput = ref(null)

const showNewEnvironmentForm = ref(false)
const newEnvironment = ref({
  name: ''
})
const environmentNameInput = ref(null)

const isDuplicateRelease = computed(() => {
  return hasDuplicateReleaseName(newRelease.value.name)
})

const isDuplicateEnvironment = computed(() => {
  return hasDuplicateEnvironmentName(newEnvironment.value.name)
})

const isBusy = computed(() => {
  return isInitializing.value || isSaving.value
})

const lastSavedLabel = computed(() => {
  if (!lastSavedAt.value) {
    return ''
  }

  return `Último guardado ${formatDate(lastSavedAt.value)}`
})

const ensureInteractive = () => {
  if (isInitializing.value) {
    console.warn('⏳ El tablero todavía está cargando desde Supabase')
    return false
  }

  if (isSaving.value) {
    console.warn('⏳ Espera a que termine el guardado actual')
    return false
  }

  if (!isReady.value) {
    console.warn(persistenceError.value || '❌ La persistencia no está disponible')
    return false
  }

  return true
}

const retryInitialize = async () => {
  const result = await initialize()
  if (!result.ok) {
    console.warn(result.reason)
  }
}

const focusInput = async inputRef => {
  await nextTick()
  inputRef.value?.focus()
}

const resetNewItemForm = () => {
  newItem.value = {
    title: '',
    type: 'feature'
  }
}

const resetNewReleaseForm = () => {
  newRelease.value = {
    name: ''
  }
}

const resetNewEnvironmentForm = () => {
  newEnvironment.value = {
    name: ''
  }
}

const toggleNewItemForm = async () => {
  if (!showNewItemForm.value && !ensureInteractive()) {
    return
  }

  showNewItemForm.value = !showNewItemForm.value

  if (showNewItemForm.value) {
    await focusInput(titleInput)
    return
  }

  resetNewItemForm()
}

const toggleNewReleaseForm = async () => {
  if (!showNewReleaseForm.value && !ensureInteractive()) {
    return
  }

  showNewReleaseForm.value = !showNewReleaseForm.value

  if (showNewReleaseForm.value) {
    await focusInput(releaseNameInput)
    return
  }

  resetNewReleaseForm()
}

const toggleNewEnvironmentForm = async () => {
  if (!showNewEnvironmentForm.value && !ensureInteractive()) {
    return
  }

  showNewEnvironmentForm.value = !showNewEnvironmentForm.value

  if (showNewEnvironmentForm.value) {
    await focusInput(environmentNameInput)
    return
  }

  resetNewEnvironmentForm()
}

const createNewItem = async () => {
  if (!ensureInteractive()) {
    return
  }

  const result = await createDomainItem(newItem.value)
  if (!result.ok) {
    console.warn(result.reason)
    return
  }

  resetNewItemForm()
  showNewItemForm.value = false
}

const cancelNewItem = () => {
  resetNewItemForm()
  showNewItemForm.value = false
}

const createNewRelease = async () => {
  if (!ensureInteractive()) {
    return
  }

  const result = await createDomainRelease(newRelease.value.name)
  if (!result.ok) {
    console.warn(result.reason)
    return
  }

  resetNewReleaseForm()
  showNewReleaseForm.value = false
}

const cancelNewRelease = () => {
  resetNewReleaseForm()
  showNewReleaseForm.value = false
}

const createNewEnvironment = async () => {
  if (!ensureInteractive()) {
    return
  }

  const result = await createDomainEnvironment(newEnvironment.value.name)
  if (!result.ok) {
    console.warn(result.reason)
    return
  }

  resetNewEnvironmentForm()
  showNewEnvironmentForm.value = false
}

const cancelNewEnvironment = () => {
  resetNewEnvironmentForm()
  showNewEnvironmentForm.value = false
}

const clearDragState = () => {
  resetDragVisuals()
  dragData.value = null
}

const handleDropOnDeployedRelease = async (event, releaseId) => {
  event.preventDefault()
  event.stopPropagation()

  if (!ensureInteractive()) {
    clearDragState()
    return
  }

  if (!dragData.value) {
    console.warn('❌ No hay datos de drag disponibles')
    return
  }

  if (dragData.value.type !== 'item') {
    console.warn('❌ Solo se pueden agregar items a releases')
    clearDragState()
    return
  }

  const result = await addItemToActiveRelease(dragData.value.id, releaseId)
  if (!result.ok) {
    console.warn(result.reason)
    clearDragState()
    return
  }

  console.log(`✅ Item ${dragData.value.id} agregado al release desplegado ${releaseId}`)
  clearDragState()
}

const handleDropOnRelease = async (event, releaseId) => {
  event.preventDefault()
  event.stopPropagation()

  if (!ensureInteractive()) {
    clearDragState()
    return
  }

  if (!dragData.value) {
    console.warn('❌ No hay datos de drag disponibles')
    return
  }

  if (dragData.value.type !== 'item') {
    console.warn('❌ Solo se pueden agregar items a releases')
    clearDragState()
    return
  }

  const result = await addItemToRelease(dragData.value.id, releaseId)
  if (!result.ok) {
    console.warn(result.reason)
    clearDragState()
    return
  }

  console.log(`✅ Item ${dragData.value.id} agregado al release ${releaseId}`)
  clearDragState()
}

const handleDragStart = event => {
  if (!ensureInteractive()) {
    event.preventDefault()
    clearDragState()
    return
  }

  const element = event.currentTarget
  const { type, id, releaseId } = element.dataset

  dragData.value = {
    type,
    id,
    releaseId
  }

  element.style.opacity = '0.5'
  console.log(`🚀 Iniciando drag: ${type} ${id}`, dragData.value)
}

const moveEnvironmentUp = async environmentId => {
  if (!ensureInteractive()) {
    return
  }

  const result = await persistMoveEnvironmentUp(environmentId)
  if (!result.ok) {
    console.warn(result.reason)
  }
}

const moveEnvironmentDown = async environmentId => {
  if (!ensureInteractive()) {
    return
  }

  const result = await persistMoveEnvironmentDown(environmentId)
  if (!result.ok) {
    console.warn(result.reason)
  }
}

const handleDrop = async (event, environmentId) => {
  event.preventDefault()

  if (!ensureInteractive()) {
    clearDragState()
    return
  }

  const result = await deployArtifact(dragData.value, environmentId)
  if (!result.ok) {
    console.warn(result.reason)
    clearDragState()
    return
  }

  clearDragState()
}

const resetDragVisuals = () => {
  const draggedElements = document.querySelectorAll('[draggable="true"]')
  draggedElements.forEach(element => {
    element.style.opacity = '1'
  })
}

const clearReleaseHighlights = () => {
  document.querySelectorAll('.release-header, .deployed-release').forEach(element => {
    element.classList.remove('drag-over')
  })
}

const findReleaseDropTarget = event => {
  if (!(event.target instanceof Element)) {
    return null
  }

  return event.target.closest('.release-header, .deployed-release')
}

const handleDocumentDragEnd = () => {
  clearDragState()
}

const handleDocumentDragEnter = event => {
  if (dragData.value?.type !== 'item') {
    return
  }

  const dropTarget = findReleaseDropTarget(event)
  dropTarget?.classList.add('drag-over')
}

const handleDocumentDragLeave = event => {
  const dropTarget = findReleaseDropTarget(event)
  dropTarget?.classList.remove('drag-over')
}

const handleDocumentDrop = () => {
  clearReleaseHighlights()
}

onMounted(async () => {
  const result = await initialize()
  if (!result.ok) {
    console.warn(result.reason)
  }

  document.addEventListener('dragend', handleDocumentDragEnd)
  document.addEventListener('dragenter', handleDocumentDragEnter)
  document.addEventListener('dragleave', handleDocumentDragLeave)
  document.addEventListener('drop', handleDocumentDrop)
})

onBeforeUnmount(() => {
  document.removeEventListener('dragend', handleDocumentDragEnd)
  document.removeEventListener('dragenter', handleDocumentDragEnter)
  document.removeEventListener('dragleave', handleDocumentDragLeave)
  document.removeEventListener('drop', handleDocumentDrop)
})
</script>

<style scoped>
/* ==========================================
   ESTILOS GENERALES
   ========================================== */

.deployment-dashboard {
  font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  margin: 0;
  padding: 24px;
  background-color: #f8fafc;
  min-height: calc(100vh - 64px);
  width: 100%;
  box-sizing: border-box;
}

.dashboard-status-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  margin-bottom: 16px;
  border-radius: 14px;
  background: #e0f2fe;
  color: #0f172a;
  font-size: 0.9rem;
}

.dashboard-status-bar.has-error {
  background: #fee2e2;
}

.status-meta {
  color: #475569;
}

.status-error {
  color: #b91c1c;
}

.dashboard-state-panel {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  padding: 28px;
  border-radius: 20px;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.dashboard-state-title {
  margin: 0;
  color: #0f172a;
}

.dashboard-state-copy {
  margin: 0;
  color: #475569;
}

.state-action-btn {
  border: none;
  border-radius: 999px;
  padding: 10px 18px;
  background: #0f172a;
  color: white;
  cursor: pointer;
}

.error-state {
  border: 1px solid #fecaca;
}

.dashboard-title {
  text-align: center;
  color: #1e293b;
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 30px;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* ==========================================
   LAYOUT PRINCIPAL
   ========================================== */

.dashboard-container {
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 24px;
  height: calc(100vh - 150px);
  width: 100%;
}

.left-column, .right-column {
  background: white;
  border-radius: 20px;
  padding: 28px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.left-column {
  overflow-y: auto;
}

.right-column {
  overflow: hidden;
  width: 100%;
  background: #f8fafc;
}

.section-title {
  color: #0f172a;
  font-size: 1.4rem;
  font-weight: 700;
  margin-bottom: 24px;
  border-bottom: none;
  padding-bottom: 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.section-header .section-title {
  margin-bottom: 0;
  border-bottom: none;
  padding-bottom: 0;
}

/* ==========================================
   COLUMNA IZQUIERDA - RELEASES E ITEMS
   ========================================== */

.releases-container {
  margin-bottom: 30px;
}

.subsection-title {
  color: #475569;
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
}

.release-card {
  border: none;
  border-radius: 16px;
  margin-bottom: 16px;
  overflow: hidden;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.release-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.release-header {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  color: #1e293b;
  padding: 20px;
  cursor: grab;
  transition: all 0.2s ease;
  border-bottom: 1px solid #e2e8f0;
}

.release-header:active {
  cursor: grabbing;
}

.release-header h3 {
  margin: 0 0 6px 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: #0f172a;
}

.release-description {
  margin: 0 0 10px 0;
  opacity: 0.7;
  font-size: 0.85rem;
  color: #475569;
}

.item-count {
  background: #e2e8f0;
  color: #475569;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
}

/* Items dentro de releases */
.items-container {
  padding: 16px;
  background: white;
  border-radius: 0 0 16px 16px;
}

.item-card {
  background: white;
  border: none;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  cursor: grab;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.item-card:active {
  cursor: grabbing;
}

.item-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.item-info {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  flex: 1;
}

/* Badge de tipo con icono */
.item-type-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: capitalize;
}

.badge-icon {
  font-size: 0.85rem;
}

/* Feature Badge - Azul */
.badge-feature {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #1d4ed8;
  border: 1px solid #93c5fd;
}

.badge-feature .badge-icon {
  color: #2563eb;
}

/* Fix Badge - Verde */
.badge-fix {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  color: #166534;
  border: 1px solid #86efac;
}

.badge-fix .badge-icon {
  color: #22c55e;
}

/* Hotfix Badge - Rojo */
.badge-hotfix {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  color: #dc2626;
  border: 1px solid #fca5a5;
}

.badge-hotfix .badge-icon {
  color: #ef4444;
}

/* Botones de acciones */
.item-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.action-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid #e2e8f0;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  font-size: 0.9rem;
  padding: 0;
}

.action-btn:hover {
  background: #f1f5f9;
  color: #475569;
  border-color: #cbd5e1;
}

.info-btn:hover {
  color: #3b82f6;
  border-color: #93c5fd;
  background: #eff6ff;
}

.edit-btn:hover {
  color: #8b5cf6;
  border-color: #c4b5fd;
  background: #f5f3ff;
}

.item-title {
  font-weight: 600;
  color: #1e293b;
  font-size: 0.95rem;
  line-height: 1.4;
  margin: 0;
}

/* Ocultar item-type antiguo */
.item-type {
  display: none;
}

.item-description {
  color: #64748b;
  font-size: 0.85rem;
  margin: 0 0 8px 0;
  line-height: 1.4;
}

.item-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
}

.item-id {
  color: #94a3b8;
  font-weight: 500;
}

/* Colores por tipo de item - Sin bordes laterales para estilo minimalista */
.item-feature,
.item-fix,
.item-hotfix {
  border-left: none;
}

/* Estilos para release header que acepta drops */
.release-header.drag-over,
.deployed-release.drag-over {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%) !important;
  transform: scale(1.01);
}

/* Colores por prioridad */
.item-priority {
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
  text-transform: uppercase;
}

.priority-low {
  background: #d1fae5;
  color: #065f46;
}

.priority-medium {
  background: #fef3c7;
  color: #92400e;
}

.priority-high {
  background: #fecaca;
  color: #991b1b;
}

.priority-critical {
  background: #fca5a5;
  color: #7f1d1d;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* Items independientes */
.standalone-items {
  border-top: 1px solid #e2e8f0;
  padding-top: 20px;
}

.subsection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.subsection-title {
  color: #475569;
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
}

.add-item-btn {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  border: none;
  background: #f1f5f9;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 1.3rem;
  font-weight: 500;
}

.add-item-btn:hover {
  background: #e2e8f0;
  color: #334155;
  transform: scale(1.05);
}

.add-item-btn.active {
  background: #fee2e2;
  color: #dc2626;
}

.add-item-btn.active:hover {
  background: #fecaca;
  color: #b91c1c;
}

.add-icon {
  display: inline-block;
  transition: transform 0.2s ease;
}

.add-item-btn.active .add-icon {
  transform: rotate(45deg);
}

/* Formulario de nuevo item */
.new-item-form {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 20px;
  margin-bottom: 16px;
  animation: slideDown 0.3s ease;
}

/* Formulario de nuevo ambiente */
.new-environment-form {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 20px;
  margin-bottom: 20px;
  animation: slideDown 0.3s ease;
}

.environment-name-input {
  width: 100%;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 14px;
  font-size: 0.9rem;
  margin-bottom: 12px;
  transition: all 0.2s ease;
  background: white;
  box-sizing: border-box;
}

.environment-name-input:focus {
  outline: none;
  border-color: #94a3b8;
  box-shadow: 0 0 0 3px rgba(148, 163, 184, 0.1);
}

.environment-name-input::placeholder {
  color: #94a3b8;
  font-style: normal;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
    max-height: 0;
  }
  to {
    opacity: 1;
    transform: translateY(0);
    max-height: 200px;
  }
}

.item-title-input {
  width: 100%;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 14px;
  font-size: 0.9rem;
  margin-bottom: 12px;
  transition: all 0.2s ease;
  background: white;
  box-sizing: border-box;
}

.item-title-input:focus {
  outline: none;
  border-color: #94a3b8;
  box-shadow: 0 0 0 3px rgba(148, 163, 184, 0.1);
}

.item-title-input.error {
  border-color: #fca5a5;
  background: #fef2f2;
}

.item-title-input.error:focus {
  border-color: #f87171;
  box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.1);
}

.item-title-input::placeholder {
  color: #94a3b8;
  font-style: normal;
}

.error-message {
  color: #ef4444;
  font-size: 0.8rem;
  font-weight: 500;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.form-controls {
  display: flex;
  gap: 8px;
  align-items: center;
}

.item-type-select {
  padding: 10px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: white;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  flex: 1;
}

.item-type-select:focus {
  outline: none;
  border-color: #94a3b8;
}

.form-buttons {
  display: flex;
  gap: 6px;
  margin-left: auto;
}

.save-btn,
.cancel-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.save-btn {
  background: #dcfce7;
  color: #16a34a;
}

.save-btn:hover:not(:disabled) {
  background: #bbf7d0;
  transform: scale(1.05);
}

.save-btn:disabled {
  background: #f1f5f9;
  color: #cbd5e1;
  cursor: not-allowed;
  opacity: 0.6;
}

.cancel-btn {
  background: #fee2e2;
  color: #dc2626;
}

.cancel-btn:hover {
  background: #fecaca;
  transform: scale(1.05);
}

/* ==========================================
   COLUMNA DERECHA - TABLERO KANBAN
   ========================================== */

.kanban-board {
  display: flex;
  gap: 16px;
  height: calc(100vh - 250px);
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 16px;
  width: 100%;
  box-sizing: border-box;
}

/* Mejorar apariencia del scrollbar */
.kanban-board::-webkit-scrollbar {
  height: 8px;
}

.kanban-board::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}

.kanban-board::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.kanban-board::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.environment-column {
  background: white;
  border-radius: 16px;
  padding: 20px;
  border: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
  overflow-y: auto;
  min-height: 100%;
  width: 280px;
  flex-shrink: 0;
  flex-grow: 0;
}

.environment-column:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.environment-header {
  text-align: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f1f5f9;
}

.environment-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.environment-header h3 {
  margin: 0;
  color: #0f172a;
  font-size: 1.1rem;
  font-weight: 700;
  flex: 1;
  text-align: left;
}

.environment-controls {
  display: flex;
  flex-direction: row;
  gap: 4px;
}

.move-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: #f1f5f9;
  color: #64748b;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.7rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.move-btn:hover:not(:disabled) {
  background: #e2e8f0;
  color: #334155;
  transform: scale(1.05);
}

.move-btn:disabled {
  background: #f8fafc;
  color: #cbd5e1;
  cursor: not-allowed;
  opacity: 0.4;
}

.deployment-count {
  color: #64748b;
  font-size: 0.8rem;
  background: white;
  padding: 2px 8px;
  border-radius: 12px;
}

/* Despliegues */
.deployments-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.deployed-release, .deployed-item {
  background: #f8fafc;
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: none;
  cursor: grab;
  transition: all 0.2s ease;
  border: none;
}

.deployed-release:active, .deployed-item:active {
  cursor: grabbing;
}

.deployed-release:hover, .deployed-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  background: #f1f5f9;
}

.deployed-release {
  border-left: none;
}

.deployed-item.item-feature,
.deployed-item.item-fix,
.deployed-item.item-hotfix {
  border-left: none;
}

.deployed-item-title {
  font-weight: 600;
  color: #1e293b;
  font-size: 0.9rem;
  line-height: 1.4;
  margin: 12px 0 8px 0;
}

.deployment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  flex-wrap: wrap;
  gap: 8px;
}

.deployment-header h4 {
  margin: 0;
  color: #334155;
  font-size: 0.9rem;
  font-weight: 600;
}

.deployment-date {
  color: #64748b;
  font-size: 0.7rem;
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
}

.deployment-description {
  color: #64748b;
  font-size: 0.8rem;
  margin: 0 0 8px 0;
  line-height: 1.3;
}

.deployment-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.deployed-item-detail {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: #f8fafc;
  border-radius: 12px;
  margin-bottom: 8px;
}

.deployed-item-detail .item-type-badge {
  padding: 4px 10px;
  font-size: 0.7rem;
}

.deployed-item-detail .item-title {
  font-weight: 600;
  color: #1e293b;
  font-size: 0.85rem;
  flex: 1;
}

.item-actions-small {
  display: flex;
  gap: 4px;
}

.action-btn-small {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: none;
  background: #f1f5f9;
  color: #94a3b8;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  font-size: 0.7rem;
  padding: 0;
}

.action-btn-small:hover {
  background: #e2e8f0;
  color: #475569;
}

.deployed-item-tag {
  background: #e2e8f0;
  color: #475569;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 500;
}

.deployed-item-tag.item-feature {
  background: #d1fae5;
  color: #065f46;
}

.deployed-item-tag.item-fix {
  background: #fef3c7;
  color: #92400e;
}

.deployed-item-tag.item-hotfix {
  background: #fecaca;
  color: #991b1b;
}

/* ==========================================
   EFECTOS DRAG AND DROP
   ========================================== */

.draggable-item {
  position: relative;
  transition: all 0.2s ease;
}

.draggable-item:hover {
  transform: translateX(2px);
}

.draggable-item[draggable="true"]:hover::after {
  content: "📌 Arrastra para desplegar";
  position: absolute;
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
  background: #0f172a;
  color: white;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 0.75rem;
  white-space: nowrap;
  z-index: 1000;
  font-weight: 500;
}

/* Estados durante drag */
.environment-column.drag-over {
  background: #f0fdf4;
  box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.3);
}

/* ==========================================
   RESPONSIVE DESIGN
   ========================================== */

@media (max-width: 1024px) {
  .dashboard-container {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  
  .kanban-board {
    display: flex;
    overflow-x: auto;
    height: auto;
    width: 100%;
  }
  
  .environment-column {
    min-height: 400px;
    width: 280px;
    flex-shrink: 0;
  }
}

@media (max-width: 768px) {
  .deployment-dashboard {
    padding: 16px;
  }
  
  .dashboard-title {
    font-size: 1.5rem;
  }
  
  .kanban-board {
    display: flex;
    overflow-x: auto;
    height: auto;
    width: 100%;
  }
  
  .environment-column {
    min-height: 400px;
    width: 250px;
    flex-shrink: 0;
    overflow-y: auto;
  }
  
  .left-column, .right-column {
    padding: 16px;
  }
}

/* ==========================================
   UTILIDADES
   ========================================== */

.text-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>