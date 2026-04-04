<template>
  <div class="deployment-dashboard">
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
      <aside class="action-rail" aria-label="Acciones de creación">
        <button
          v-for="action in creationActions"
          :key="action.kind"
          class="action-rail-btn"
          :class="{ active: activeModal === action.kind }"
          :disabled="isBusy"
          :title="action.label"
          @click="openCreationModal(action.kind)"
        >
          <img :src="action.icon" :alt="action.label" class="action-rail-icon" />
          <span class="sr-only">{{ action.label }}</span>
        </button>
      </aside>

      <section class="board-shell">
        <div class="kanban-board">
          <div
            v-for="environment in boardEnvironments"
            :key="environment.id"
            class="environment-column"
            :class="{
              'is-pool': isPoolEnvironment(environment),
              'is-production': isProductionEnvironment(environment),
              'is-fixed': isFixedEnvironment(environment)
            }"
            @dragover.prevent
            @dragenter.prevent
            @drop="handleDrop($event, environment.id)"
          >
            <div
              class="environment-header"
              :class="{
                'is-drag-source': draggedEnvironmentId === environment.id,
                'is-drag-over': dragOverEnvironmentId === environment.id,
                'is-static': !canReorderEnvironment(environment)
              }"
              :draggable="canReorderEnvironment(environment)"
              @dragstart="handleEnvironmentDragStart($event, environment.id)"
              @dragover.prevent="handleEnvironmentDragOver($event, environment.id)"
              @drop="handleEnvironmentDrop($event, environment.id)"
              @dragend="handleEnvironmentDragEnd"
            >
              <div class="environment-title-wrap">
                <h3 class="environment-title">{{ environment.name }}</h3>
                <span v-if="isPoolEnvironment(environment)" class="environment-chip">origen</span>
              </div>
            </div>

            <div class="deployments-container">
              <template v-if="isPoolEnvironment(environment)">
                <div
                  v-for="release in poolReleases"
                  :key="release.id"
                  class="release-card available-release"
                  :class="{ 'drag-over': activeReleaseDropZone.type === 'release' && activeReleaseDropZone.id === release.id }"
                  @dragover.prevent="handleReleaseDragOver($event, 'release', release.id)"
                  @drop="handleDropOnRelease($event, release.id)"
                >
                  <div
                    class="release-header draggable-item"
                    :data-type="'release'"
                    :data-id="release.id"
                    :draggable="!isBusy"
                    @dragstart="handleDragStart"
                  >
                    <h4>{{ release.name }}</h4>
                    <p v-if="release.description" class="release-description">{{ release.description }}</p>
                  </div>

                  <div v-if="getAvailableItemsForRelease(release).length > 0" class="items-container">
                    <div
                      v-for="item in getAvailableItemsForRelease(release)"
                      :key="item.id"
                      class="item-card draggable-item"
                      :class="`item-${item.type}`"
                      :data-type="'item'"
                      :data-id="item.id"
                      :data-release-id="release.id"
                      :draggable="!isBusy"
                      @dragstart="handleDragStart"
                    >
                      <div class="item-header-row">
                        <p class="item-title">{{ item.title }}</p>
                        <button
                          class="item-detach-btn"
                          title="Desenganchar del release"
                          @click.stop="handleDetachItem(item.id, release.id)"
                        >
                          <img src="/unlocked.png" alt="Desenganchar item" class="item-detach-icon" />
                        </button>
                      </div>
                      <p class="item-description">{{ getItemMetaLabel(item) }}</p>
                      <div class="item-footer">
                        <div class="item-area-group">
                          <button
                            v-for="area in itemAreas"
                            :key="`${item.id}-${area}`"
                            class="item-area-tag"
                            :class="{ active: isAreaSelected(item, area) }"
                            @click.stop="handleToggleItemArea(item.id, area)"
                          >
                            {{ area }}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  v-for="item in poolItems"
                  :key="item.id"
                  class="item-card draggable-item"
                  :class="`item-${item.type}`"
                  :data-type="'item'"
                  :data-id="item.id"
                  :draggable="!isBusy"
                  @dragstart="handleDragStart"
                >
                  <p class="item-title">{{ item.title }}</p>
                  <p class="item-description">{{ getItemMetaLabel(item) }}</p>
                  <div class="item-footer">
                    <div class="item-area-group">
                      <button
                        v-for="area in itemAreas"
                        :key="`${item.id}-${area}`"
                        class="item-area-tag"
                        :class="{ active: isAreaSelected(item, area) }"
                        @click.stop="handleToggleItemArea(item.id, area)"
                      >
                        {{ area }}
                      </button>
                    </div>
                  </div>
                </div>

                <p v-if="poolReleases.length === 0 && poolItems.length === 0" class="empty-column-copy">
                  Todo lo nuevo aparece acá.
                </p>
              </template>

              <template v-else>
                <div
                  v-for="deployment in getReleaseDeployments(environment.id)"
                  :key="`release-${deployment.itemId}`"
                  class="deployed-release draggable-item"
                  :class="{ 'drag-over': activeReleaseDropZone.type === 'deployed-release' && activeReleaseDropZone.id === deployment.itemId }"
                  :data-type="'release'"
                  :data-id="deployment.itemId"
                  :draggable="!isBusy"
                  @dragstart="handleDragStart"
                  @dragover.prevent="handleReleaseDragOver($event, 'deployed-release', deployment.itemId)"
                  @drop="handleDropOnDeployedRelease($event, deployment.itemId)"
                >
                  <div class="deployment-header">
                    <h4>{{ getReleaseById(deployment.itemId)?.name }}</h4>
                    <span class="deployment-date">{{ formatRelativeTime(deployment.deployedAt) }}</span>
                  </div>

                  <div class="deployment-items">
                    <div
                      v-for="item in getDeployedReleaseItems(deployment)"
                      :key="item.id"
                      class="deployed-item-detail"
                      :class="`item-${item.type}`"
                    >
                      <div class="item-header-row">
                        <span class="item-title">{{ item.title }}</span>
                        <button
                          class="item-detach-btn"
                          title="Desenganchar del release"
                          @click.stop="handleDetachItem(item.id, deployment.itemId, deployment.environmentId)"
                        >
                          <img src="/unlocked.png" alt="Desenganchar item" class="item-detach-icon" />
                        </button>
                      </div>
                      <p class="item-description">{{ getItemMetaLabel(item, getDeploymentItemTime(deployment, item.id)) }}</p>
                      <div class="item-footer">
                        <div class="item-area-group">
                          <button
                            v-for="area in itemAreas"
                            :key="`${item.id}-${area}`"
                            class="item-area-tag"
                            :class="{ active: isAreaSelected(item, area) }"
                            @click.stop="handleToggleItemArea(item.id, area)"
                          >
                            {{ area }}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  v-for="deployment in getItemDeployments(environment.id)"
                  :key="`item-${deployment.itemId}`"
                  class="deployed-item draggable-item"
                  :class="`item-${getItemById(deployment.itemId)?.type}`"
                  :data-type="'item'"
                  :data-id="deployment.itemId"
                  :draggable="!isBusy"
                  @dragstart="handleDragStart"
                >
                  <p class="deployed-item-title">{{ getItemById(deployment.itemId)?.title }}</p>
                  <p class="item-description">{{ getItemMetaLabel(getItemById(deployment.itemId), deployment.deployedAt) }}</p>
                  <div class="item-footer">
                    <div class="item-area-group">
                      <button
                        v-for="area in itemAreas"
                        :key="`${deployment.itemId}-${area}`"
                        class="item-area-tag"
                        :class="{ active: isAreaSelected(getItemById(deployment.itemId), area) }"
                        @click.stop="handleToggleItemArea(deployment.itemId, area)"
                      >
                        {{ area }}
                      </button>
                    </div>
                  </div>
                </div>

                <p
                  v-if="getReleaseDeployments(environment.id).length === 0 && getItemDeployments(environment.id).length === 0"
                  class="empty-column-copy"
                >
                  Sin despliegues todavía.
                </p>
              </template>
            </div>
          </div>
        </div>
      </section>
    </div>

    <div v-if="activeModal" class="creation-modal-backdrop" @click="handleBackdropClick">
      <div class="creation-modal" role="dialog" aria-modal="true" :aria-labelledby="`modal-title-${activeModal}`" @click.stop>
        <div class="creation-modal-header">
          <div>
            <p class="creation-modal-kicker">Crear</p>
            <h2 :id="`modal-title-${activeModal}`" class="creation-modal-title">{{ modalTitle }}</h2>
          </div>
          <button class="modal-close-btn" type="button" :disabled="isSaving" @click="closeCreationModal">×</button>
        </div>

        <form class="creation-modal-form" @submit.prevent="submitActiveModal">
          <template v-if="isItemModal">
            <label class="field-label" for="item-title">Título</label>
            <input
              id="item-title"
              ref="titleInput"
              v-model="newItem.title"
              type="text"
              class="text-input"
              placeholder="Título del item..."
              :disabled="isBusy"
            />
          </template>

          <template v-else-if="activeModal === 'release'">
            <label class="field-label" for="release-name">Número</label>
            <input
              id="release-name"
              ref="releaseNameInput"
              v-model="newRelease.name"
              type="text"
              class="text-input"
              :class="{ error: isDuplicateRelease }"
              placeholder="Número de release. Ej: 3.2.1"
              :disabled="isBusy"
            />
            <div v-if="isDuplicateRelease" class="error-message">⚠️ Ya existe un release con este nombre</div>
          </template>

          <template v-else-if="activeModal === 'environment'">
            <label class="field-label" for="environment-name">Nombre</label>
            <input
              id="environment-name"
              ref="environmentNameInput"
              v-model="newEnvironment.name"
              type="text"
              class="text-input"
              :class="{ error: isDuplicateEnvironment }"
              placeholder="Nombre del ambiente..."
              :disabled="isBusy"
            />
            <div v-if="isDuplicateEnvironment" class="error-message">⚠️ Ya existe un ambiente con este nombre</div>
          </template>

          <div class="modal-actions">
            <button type="button" class="secondary-btn" :disabled="isSaving" @click="closeCreationModal">Cancelar</button>
            <button type="submit" class="primary-btn" :disabled="isModalSubmitDisabled">{{ modalSubmitLabel }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

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
  poolEnvironment,
  formatDate,
  isPoolEnvironment,
  isProductionEnvironment,
  isFixedEnvironment,
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
  reorderEnvironment,
  addItemToRelease,
  addItemToActiveRelease,
  deployArtifact,
  toggleItemArea,
  detachItem
} = useFlowTrackDomain()

const dragData = ref(null)
const draggedEnvironmentId = ref('')
const dragOverEnvironmentId = ref('')
const activeReleaseDropZone = ref({ type: '', id: '' })
const activeModal = ref('')

const newItem = ref({
  title: '',
  type: 'feature'
})

const newRelease = ref({
  name: ''
})

const newEnvironment = ref({
  name: ''
})

const titleInput = ref(null)
const releaseNameInput = ref(null)
const environmentNameInput = ref(null)

const creationActions = [
  { kind: 'release', label: 'Nuevo release', icon: '/new-release.png' },
  { kind: 'feature', label: 'Nuevo feature', icon: '/new-feature.png' },
  { kind: 'environment', label: 'Nuevo ambiente', icon: '/environment.png' },
  { kind: 'hotfix', label: 'Nuevo hotfix', icon: '/hotfix.png' }
]

const itemAreas = ['front', 'back', 'app']
const relativeTimeFormatter = new Intl.RelativeTimeFormat('es-ES', { numeric: 'auto' })

const boardEnvironments = computed(() => sortedEnvironments.value)

const isDuplicateRelease = computed(() => {
  return hasDuplicateReleaseName(newRelease.value.name)
})

const isDuplicateEnvironment = computed(() => {
  return hasDuplicateEnvironmentName(newEnvironment.value.name)
})

const isBusy = computed(() => {
  return isInitializing.value || isSaving.value
})

const isItemModal = computed(() => {
  return activeModal.value === 'feature' || activeModal.value === 'hotfix'
})

const modalTitle = computed(() => {
  if (activeModal.value === 'feature') {
    return 'Nuevo feature'
  }

  if (activeModal.value === 'hotfix') {
    return 'Nuevo hotfix'
  }

  if (activeModal.value === 'release') {
    return 'Nuevo release'
  }

  if (activeModal.value === 'environment') {
    return 'Nuevo ambiente'
  }

  return ''
})

const modalSubmitLabel = computed(() => {
  if (activeModal.value === 'environment') {
    return 'Crear ambiente'
  }

  if (activeModal.value === 'release') {
    return 'Crear release'
  }

  if (activeModal.value === 'hotfix') {
    return 'Crear hotfix'
  }

  return 'Crear feature'
})

const isModalSubmitDisabled = computed(() => {
  if (isBusy.value) {
    return true
  }

  if (activeModal.value === 'release') {
    return !newRelease.value.name.trim() || isDuplicateRelease.value
  }

  if (activeModal.value === 'environment') {
    return !newEnvironment.value.name.trim() || isDuplicateEnvironment.value
  }

  if (isItemModal.value) {
    return !newItem.value.title.trim()
  }

  return true
})

const lastSavedLabel = computed(() => {
  if (!lastSavedAt.value) {
    return ''
  }

  return `Último guardado ${formatDate(lastSavedAt.value)}`
})

const poolReleases = computed(() => {
  const releasesById = new Map()
  const poolId = poolEnvironment.value?.id

  if (poolId) {
    getDeploymentsByEnvironment(poolId)
      .filter(deployment => deployment.type === 'release')
      .forEach(deployment => {
        const release = getReleaseById(deployment.itemId)
        if (release) {
          releasesById.set(release.id, release)
        }
      })
  }

  availableReleases.value.forEach(release => {
    if (!releasesById.has(release.id)) {
      releasesById.set(release.id, release)
    }
  })

  return Array.from(releasesById.values())
})

const poolItems = computed(() => {
  const itemsById = new Map()
  const poolId = poolEnvironment.value?.id

  if (poolId) {
    getDeploymentsByEnvironment(poolId)
      .filter(deployment => deployment.type === 'item')
      .forEach(deployment => {
        const item = getItemById(deployment.itemId)
        if (item) {
          itemsById.set(item.id, item)
        }
      })
  }

  availableStandaloneItems.value.forEach(item => {
    if (!itemsById.has(item.id)) {
      itemsById.set(item.id, item)
    }
  })

  return Array.from(itemsById.values())
})

watch(lastSavedLabel, label => {
  window.dispatchEvent(new CustomEvent('flowtrack:last-saved-label', { detail: label }))
}, { immediate: true })

watch(activeModal, async modalKind => {
  if (!modalKind) {
    return
  }

  if (modalKind === 'feature' || modalKind === 'hotfix') {
    await focusInput(titleInput)
    return
  }

  if (modalKind === 'release') {
    await focusInput(releaseNameInput)
    return
  }

  if (modalKind === 'environment') {
    await focusInput(environmentNameInput)
  }
})

const getItemCreatedAt = item => {
  const rawId = item?.id?.split('-')?.at(-1)
  const timestamp = Number(rawId)

  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return null
  }

  const date = new Date(timestamp)
  return Number.isNaN(date.getTime()) ? null : date
}

const getItemMetaLabel = (item, dateValue = null) => {
  const timestamp = dateValue || getItemCreatedAt(item)
  return formatRelativeTime(timestamp)
}

const isAreaSelected = (item, area) => {
  return Array.isArray(item?.areas) && item.areas.includes(area)
}

const getDeploymentItemTime = (deployment, itemId) => {
  if (deployment?.itemDeploymentTimes?.[itemId]) {
    return deployment.itemDeploymentTimes[itemId]
  }

  return deployment?.deployedAt
}

const formatRelativeTime = dateValue => {
  if (!dateValue) {
    return 'sin fecha'
  }

  const date = dateValue instanceof Date ? dateValue : new Date(dateValue)
  if (Number.isNaN(date.getTime())) {
    return 'sin fecha'
  }

  const elapsedInSeconds = Math.floor((Date.now() - date.getTime()) / 1000)

  if (elapsedInSeconds < 60) {
    return relativeTimeFormatter.format(-elapsedInSeconds, 'second')
  }

  const elapsedInMinutes = Math.floor(elapsedInSeconds / 60)
  if (elapsedInMinutes < 60) {
    return relativeTimeFormatter.format(-elapsedInMinutes, 'minute')
  }

  const elapsedInHours = Math.floor(elapsedInMinutes / 60)
  if (elapsedInHours < 24) {
    return relativeTimeFormatter.format(-elapsedInHours, 'hour')
  }

  const elapsedInDays = Math.floor(elapsedInHours / 24)
  if (elapsedInDays < 30) {
    return relativeTimeFormatter.format(-elapsedInDays, 'day')
  }

  const elapsedInMonths = Math.floor(elapsedInDays / 30)
  if (elapsedInMonths < 12) {
    return relativeTimeFormatter.format(-elapsedInMonths, 'month')
  }

  const elapsedInYears = Math.floor(elapsedInDays / 365)
  return relativeTimeFormatter.format(-elapsedInYears, 'year')
}

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

const resetModalForms = () => {
  resetNewItemForm()
  resetNewReleaseForm()
  resetNewEnvironmentForm()
}

const openCreationModal = modalKind => {
  if (!ensureInteractive()) {
    return
  }

  if (modalKind === 'feature' || modalKind === 'hotfix') {
    newItem.value.type = modalKind
  }

  activeModal.value = modalKind
}

const closeCreationModal = () => {
  if (isSaving.value) {
    return
  }

  activeModal.value = ''
  resetModalForms()
}

const handleBackdropClick = () => {
  closeCreationModal()
}

const submitActiveModal = async () => {
  if (!ensureInteractive()) {
    return
  }

  if (activeModal.value === 'release') {
    const result = await createDomainRelease(newRelease.value.name)
    if (!result.ok) {
      console.warn(result.reason)
      return
    }

    closeCreationModal()
    return
  }

  if (activeModal.value === 'environment') {
    const result = await createDomainEnvironment(newEnvironment.value.name)
    if (!result.ok) {
      console.warn(result.reason)
      return
    }

    closeCreationModal()
    return
  }

  if (activeModal.value === 'feature' || activeModal.value === 'hotfix') {
    const result = await createDomainItem(newItem.value)
    if (!result.ok) {
      console.warn(result.reason)
      return
    }

    closeCreationModal()
  }
}

const canReorderEnvironment = environment => {
  return !isBusy.value && !isFixedEnvironment(environment)
}

const getReleaseDeployments = environmentId => {
  return getDeploymentsByEnvironment(environmentId).filter(deployment => deployment.type === 'release')
}

const getItemDeployments = environmentId => {
  return getDeploymentsByEnvironment(environmentId).filter(deployment => deployment.type === 'item')
}

const clearDragState = () => {
  resetDragVisuals()
  activeReleaseDropZone.value = { type: '', id: '' }
  dragData.value = null
}

const resolveDropPayload = event => {
  if (dragData.value) {
    return { ...dragData.value }
  }

  const serializedPayload = event.dataTransfer?.getData('application/json')
  if (!serializedPayload) {
    return null
  }

  try {
    const parsedPayload = JSON.parse(serializedPayload)
    if (!parsedPayload?.type || !parsedPayload?.id) {
      return null
    }

    return parsedPayload
  } catch {
    return null
  }
}

const handleReleaseDragOver = (event, dropZoneType, dropZoneId) => {
  event.preventDefault()

  if (dragData.value?.type !== 'item') {
    return
  }

  activeReleaseDropZone.value = {
    type: dropZoneType,
    id: dropZoneId
  }
}

const handleDropOnDeployedRelease = async (event, releaseId) => {
  event.preventDefault()
  event.stopPropagation()

  if (!ensureInteractive()) {
    clearDragState()
    return
  }

  const dropPayload = resolveDropPayload(event)
  if (!dropPayload) {
    console.warn('❌ No hay datos de drag disponibles')
    clearDragState()
    return
  }

  if (dropPayload.type !== 'item') {
    console.warn('❌ Solo se pueden agregar items a releases')
    clearDragState()
    return
  }

  const result = await addItemToActiveRelease(dropPayload.id, releaseId)
  if (!result.ok) {
    console.warn(result.reason)
    clearDragState()
    return
  }

  clearDragState()
}

const handleDropOnRelease = async (event, releaseId) => {
  event.preventDefault()
  event.stopPropagation()

  if (!ensureInteractive()) {
    clearDragState()
    return
  }

  const dropPayload = resolveDropPayload(event)
  if (!dropPayload) {
    console.warn('❌ No hay datos de drag disponibles')
    clearDragState()
    return
  }

  if (dropPayload.type !== 'item') {
    console.warn('❌ Solo se pueden agregar items a releases')
    clearDragState()
    return
  }

  const result = await addItemToRelease(dropPayload.id, releaseId)
  if (!result.ok) {
    console.warn(result.reason)
    clearDragState()
    return
  }

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

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('application/json', JSON.stringify(dragData.value))
  }

  element.style.opacity = '0.5'
}

const handleEnvironmentDragStart = (event, environmentId) => {
  const environment = boardEnvironments.value.find(currentEnvironment => currentEnvironment.id === environmentId)
  if (!environment || !canReorderEnvironment(environment) || !ensureInteractive()) {
    event.preventDefault()
    return
  }

  draggedEnvironmentId.value = environmentId

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', environmentId)
  }
}

const handleEnvironmentDragOver = (event, environmentId) => {
  event.preventDefault()
  event.stopPropagation()

  const environment = boardEnvironments.value.find(currentEnvironment => currentEnvironment.id === environmentId)
  if (!environment || !canReorderEnvironment(environment)) {
    return
  }

  if (!draggedEnvironmentId.value || draggedEnvironmentId.value === environmentId) {
    return
  }

  dragOverEnvironmentId.value = environmentId
}

const handleEnvironmentDrop = async (event, environmentId) => {
  event.preventDefault()
  event.stopPropagation()

  const targetEnvironment = boardEnvironments.value.find(currentEnvironment => currentEnvironment.id === environmentId)
  if (!targetEnvironment || !canReorderEnvironment(targetEnvironment)) {
    draggedEnvironmentId.value = ''
    dragOverEnvironmentId.value = ''
    return
  }

  if (!ensureInteractive()) {
    draggedEnvironmentId.value = ''
    dragOverEnvironmentId.value = ''
    return
  }

  const sourceEnvironmentId = draggedEnvironmentId.value
  if (!sourceEnvironmentId || sourceEnvironmentId === environmentId) {
    draggedEnvironmentId.value = ''
    dragOverEnvironmentId.value = ''
    return
  }

  const result = await reorderEnvironment(sourceEnvironmentId, environmentId)
  if (!result.ok) {
    console.warn(result.reason)
  }

  draggedEnvironmentId.value = ''
  dragOverEnvironmentId.value = ''
}

const handleEnvironmentDragEnd = () => {
  draggedEnvironmentId.value = ''
  dragOverEnvironmentId.value = ''
}

const handleToggleItemArea = async (itemId, area) => {
  if (!ensureInteractive()) {
    return
  }

  const result = await toggleItemArea(itemId, area)
  if (!result.ok) {
    console.warn(result.reason)
  }
}

const handleDetachItem = async (itemId, releaseId, environmentId = null) => {
  if (!ensureInteractive()) {
    return
  }

  const result = await detachItem(itemId, releaseId, environmentId ? { environmentId } : {})
  if (!result.ok) {
    console.warn(result.reason)
  }
}

const handleDrop = async (event, environmentId) => {
  event.preventDefault()

  if (draggedEnvironmentId.value) {
    return
  }

  if (!ensureInteractive()) {
    clearDragState()
    return
  }

  const dropPayload = resolveDropPayload(event)
  if (!dropPayload) {
    clearDragState()
    return
  }

  const result = await deployArtifact({ ...dropPayload }, environmentId)
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

const handleDocumentDragEnd = () => {
  clearDragState()
}

const handleDocumentKeydown = event => {
  if (event.key === 'Escape' && activeModal.value) {
    closeCreationModal()
  }
}

onMounted(async () => {
  const result = await initialize()
  if (!result.ok) {
    console.warn(result.reason)
  }

  document.addEventListener('dragend', handleDocumentDragEnd)
  document.addEventListener('keydown', handleDocumentKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('dragend', handleDocumentDragEnd)
  document.removeEventListener('keydown', handleDocumentKeydown)
})
</script>

<style scoped>
.deployment-dashboard {
  font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  margin: 0;
  padding: 24px;
  background:
    radial-gradient(circle at top left, rgba(22, 163, 74, 0.08), transparent 28%),
    linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  min-height: calc(100vh - 64px);
  width: 100%;
  box-sizing: border-box;
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

.dashboard-container {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);
  gap: 20px;
  min-height: calc(100vh - 150px);
  width: 100%;
}

.action-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  padding: 22px 12px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(12px);
}

.action-rail-btn {
  width: 52px;
  height: 52px;
  border: 0;
  border-radius: 16px;
  background: transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
}

.action-rail-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  background: rgba(15, 23, 42, 0.06);
}

.action-rail-btn.active {
  background: #4ade80;
  box-shadow: 0 12px 28px rgba(74, 222, 128, 0.35);
}

.action-rail-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.action-rail-icon {
  width: 24px;
  height: 24px;
  object-fit: contain;
}

.board-shell {
  min-width: 0;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.66);
  box-shadow: 0 14px 40px rgba(15, 23, 42, 0.08);
  overflow: hidden;
}

.kanban-board {
  display: flex;
  gap: 18px;
  min-height: calc(100vh - 150px);
  padding: 22px;
  overflow-x: auto;
  overflow-y: hidden;
}

.environment-column {
  width: 300px;
  min-width: 300px;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 24px;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
}

.environment-column.is-pool {
  background: linear-gradient(180deg, rgba(240, 253, 244, 0.98) 0%, rgba(255, 255, 255, 0.96) 100%);
  border-color: rgba(134, 239, 172, 0.9);
}

.environment-column.is-production {
  border-color: rgba(148, 163, 184, 0.95);
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.32), 0 10px 24px rgba(15, 23, 42, 0.06);
}

.environment-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 18px 18px 16px;
  border-bottom: 1px solid #e2e8f0;
  cursor: grab;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.environment-header.is-static {
  cursor: default;
}

.environment-header.is-drag-source {
  opacity: 0.65;
}

.environment-header.is-drag-over {
  background: #eff6ff;
  border-bottom-color: #93c5fd;
}

.environment-title-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.environment-title {
  margin: 0;
  color: #0f172a;
  font-size: 1rem;
  font-weight: 700;
}

.environment-chip {
  border-radius: 999px;
  padding: 4px 9px;
  background: rgba(22, 163, 74, 0.12);
  color: #15803d;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.deployments-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  overflow-y: auto;
}

.empty-column-copy {
  margin: 0;
  border: 1px dashed #cbd5e1;
  border-radius: 18px;
  padding: 18px;
  color: #64748b;
  font-size: 0.9rem;
  text-align: center;
  background: rgba(248, 250, 252, 0.9);
}

.release-card,
.deployed-release {
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  padding: 14px;
  background: #fff;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.release-card:hover,
.deployed-release:hover {
  border-color: #cbd5e1;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
}

.release-card.drag-over,
.deployed-release.drag-over {
  border-width: 2px;
  border-color: #475569;
}

.release-header {
  cursor: grab;
}

.release-header h4,
.deployment-header h4 {
  margin: 0;
  color: #0f172a;
  font-size: 0.95rem;
  font-weight: 700;
}

.release-description {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 0.82rem;
}

.items-container,
.deployment-items {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
}

.item-card,
.deployed-item,
.deployed-item-detail {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  background: #f8fafc;
  border: 1px solid transparent;
  border-radius: 18px;
  padding: 14px 14px 12px;
  box-shadow: 0 3px 10px rgba(15, 23, 42, 0.08);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.item-card::before,
.deployed-item::before,
.deployed-item-detail::before {
  content: '';
  position: absolute;
  top: 6px;
  right: 10px;
  bottom: 6px;
  width: 38%;
  background-image: var(--item-watermark-icon);
  background-repeat: no-repeat;
  background-position: center right;
  background-size: auto 94%;
  opacity: 0.035;
  pointer-events: none;
  z-index: 0;
}

.item-card > *,
.deployed-item > *,
.deployed-item-detail > * {
  position: relative;
  z-index: 1;
}

.item-card:hover,
.deployed-item:hover,
.deployed-item-detail:hover {
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.12);
  transform: translateY(-2px);
}

.item-card,
.deployed-item {
  cursor: grab;
}

.item-feature {
  --item-watermark-icon: url('/new-feature.png');
  border-color: rgba(147, 197, 253, 0.7);
}

.item-fix {
  --item-watermark-icon: url('/new-feature.png');
  border-color: rgba(134, 239, 172, 0.7);
}

.item-hotfix {
  --item-watermark-icon: url('/hotfix.png');
  border-color: rgba(252, 165, 165, 0.75);
  background: linear-gradient(180deg, rgba(254, 242, 242, 0.98) 0%, rgba(255, 255, 255, 0.96) 100%);
}

.item-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.item-header-row .item-title {
  flex: 1;
  margin: 0;
}

.item-detach-btn {
  border: none;
  background: transparent;
  padding: 0;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  color: #64748b;
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.item-detach-btn:hover {
  background: #e2e8f0;
  color: #0f172a;
}

.item-detach-icon {
  width: 14px;
  height: 14px;
  display: block;
}

.item-title,
.deployed-item-title {
  font-weight: 600;
  color: #0f172a;
  font-size: 0.95rem;
  line-height: 1.4;
  margin: 0 0 8px;
  overflow-wrap: anywhere;
}

.item-description {
  color: #64748b;
  font-size: 0.82rem;
  margin: 0 0 10px;
  line-height: 1.45;
}

.item-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.item-area-group {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.item-area-tag {
  border: none;
  border-radius: 999px;
  background: #e2e8f0;
  color: #64748b;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 4px 8px;
  text-transform: lowercase;
  opacity: 0.55;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.item-area-tag:hover {
  opacity: 0.85;
  transform: translateY(-1px);
}

.item-area-tag.active {
  opacity: 1;
  background: #cbd5e1;
  color: #0f172a;
}

.deployment-date {
  font-size: 0.78rem;
  color: #475569;
  white-space: nowrap;
}

.deployment-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.creation-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.42);
  backdrop-filter: blur(6px);
}

.creation-modal {
  width: min(480px, 100%);
  border-radius: 28px;
  background: white;
  box-shadow: 0 24px 80px rgba(15, 23, 42, 0.24);
  padding: 24px;
}

.creation-modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 22px;
}

.creation-modal-kicker {
  margin: 0 0 8px;
  color: #16a34a;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.creation-modal-title {
  margin: 0;
  color: #0f172a;
  font-size: 1.5rem;
}

.modal-close-btn {
  border: none;
  background: #f1f5f9;
  color: #475569;
  width: 36px;
  height: 36px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 1.3rem;
  line-height: 1;
}

.creation-modal-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.field-label {
  color: #334155;
  font-size: 0.85rem;
  font-weight: 700;
}

.text-input {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 16px;
  padding: 14px 16px;
  font-size: 1rem;
  color: #0f172a;
  background: #fff;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  box-sizing: border-box;
}

.text-input:focus {
  border-color: #22c55e;
  box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.14);
}

.text-input.error {
  border-color: #ef4444;
}

.error-message {
  color: #b91c1c;
  font-size: 0.84rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;
}

.primary-btn,
.secondary-btn {
  border: none;
  border-radius: 999px;
  padding: 11px 18px;
  font-weight: 700;
  cursor: pointer;
}

.primary-btn {
  background: #16a34a;
  color: white;
}

.secondary-btn {
  background: #e2e8f0;
  color: #0f172a;
}

.primary-btn:disabled,
.secondary-btn:disabled,
.modal-close-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 920px) {
  .dashboard-container {
    grid-template-columns: 1fr;
  }

  .action-rail {
    flex-direction: row;
    justify-content: center;
  }
}

@media (max-width: 640px) {
  .deployment-dashboard {
    padding: 16px;
  }

  .kanban-board {
    padding: 16px;
  }

  .environment-column {
    width: 280px;
    min-width: 280px;
  }

  .creation-modal-backdrop {
    padding: 16px;
  }

  .creation-modal {
    padding: 20px;
  }
}
</style>
