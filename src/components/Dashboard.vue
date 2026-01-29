<template>
  <div class="release-dashboard">
    <section class="release-board">
      <div class="board-columns">
        <div
          v-for="environment in sortedEnvironments"
          :key="environment.id"
          class="board-column"
          @dragover.prevent
          @dragenter.prevent
          @drop="handleDrop($event, environment.id)"
        >
          <div class="board-column-header">
            <h3>{{ environment.name }}</h3>
          </div>

          <div class="board-column-body">
            <div
              v-for="deployment in getDeploymentsByEnvironment(environment.id).filter(d => d.type === 'release')"
              :key="`release-${deployment.itemId}-${environment.id}`"
              class="release-card draggable-item"
              :data-type="'release'"
              :data-id="deployment.itemId"
              draggable="true"
              @dragstart="handleDragStart"
              @dragover.prevent
              @dragenter.prevent
              @drop="handleDropOnDeployedRelease($event, deployment.itemId)"
            >
              <div class="release-card-header">
                <div>
                  <h4>{{ getReleaseById(deployment.itemId)?.name }}</h4>
                  <p class="release-meta">Desplegado: {{ formatDate(deployment.deployedAt) }}</p>
                </div>
              </div>

              <div class="release-items">
                <div
                  v-for="item in getDeployedReleaseItems(deployment)"
                  :key="item.id"
                  class="release-item"
                  :class="`type-${item.type}`"
                >
                  <span class="badge" :class="`badge-${item.type}`">
                    <span v-if="item.type === 'feature'">★ Feature</span>
                    <span v-else-if="item.type === 'fix'">🔧 Fix</span>
                    <span v-else>🔥 Hotfix</span>
                  </span>
                  <span class="release-item-title">{{ item.title }}</span>
                  <div class="item-actions">
                    <span class="icon">ⓘ</span>
                    <span class="icon">✎</span>
                  </div>
                </div>
              </div>
            </div>

            <div
              v-for="deployment in getDeploymentsByEnvironment(environment.id).filter(d => d.type === 'item')"
              :key="`item-${deployment.itemId}-${environment.id}`"
              class="release-item-single draggable-item"
              :class="`type-${getItemById(deployment.itemId)?.type}`"
              :data-type="'item'"
              :data-id="deployment.itemId"
              draggable="true"
              @dragstart="handleDragStart"
            >
              <span class="badge" :class="`badge-${getItemById(deployment.itemId)?.type}`">
                {{ getItemById(deployment.itemId)?.type }}
              </span>
              <span class="release-item-title">{{ getItemById(deployment.itemId)?.title }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <aside class="release-sidebar">
      <div class="sidebar-card">
        <h3>Alta Rápida</h3>
        <label class="field-label">Número de release</label>
        <input
          v-model="newRelease.name"
          type="text"
          placeholder="Ej: 3.2.1"
          class="field-input"
        />
        <label class="field-label">Nombre del release</label>
        <input
          v-model="newReleaseTitle"
          type="text"
          placeholder="Descripción breve"
          class="field-input"
        />
        <button
          class="action-btn"
          @click="createNewRelease"
          :disabled="!newRelease.name.trim() || isDuplicateRelease"
        >
          Crear release
        </button>
        <p v-if="isDuplicateRelease" class="form-error">⚠️ Ya existe un release con este número</p>
      </div>

      <div class="sidebar-card">
        <h3>Agregar ítem</h3>
        <label class="field-label">Tipo</label>
        <select v-model="newItem.type" class="field-input">
          <option value="feature">Feature</option>
          <option value="fix">Fix</option>
          <option value="hotfix">Hotfix</option>
        </select>
        <label class="field-label">Nombre del ítem</label>
        <input
          v-model="newItem.title"
          type="text"
          placeholder="Nombre del ítem"
          class="field-input"
        />
        <button
          class="action-btn secondary"
          @click="createNewItem"
          :disabled="!newItem.title.trim()"
        >
          Agregar al release
        </button>
      </div>
    </aside>
  </div>
</template>

<script setup>
import { defineComponent, ref, computed } from 'vue'

// ==========================================
// MODELOS DE DATOS
// ==========================================

/**
 * Modelo de Item
 * @typedef {Object} Item
 * @property {string} id - Identificador único
 * @property {string} title - Título del item
 * @property {string} description - Descripción del item
 * @property {'feature'|'fix'|'hotfix'} type - Tipo de item
 */

/**
 * Modelo de Release
 * @typedef {Object} Release
 * @property {string} id - Identificador único
 * @property {string} name - Nombre del release
 * @property {string} description - Descripción del release
 * @property {Item[]} items - Array de items incluidos
 */

/**
 * Modelo de Ambiente
 * @typedef {Object} Environment
 * @property {string} id - Identificador único
 * @property {string} name - Nombre del ambiente
 * @property {string} description - Descripción del ambiente
 */

/**
 * Modelo de Despliegue
 * @typedef {Object} Deployment
 * @property {string} id - Identificador único
 * @property {string} itemId - ID del item o release desplegado
 * @property {'item'|'release'} type - Tipo de despliegue
 * @property {string} environmentId - ID del ambiente
 * @property {Date} deployedAt - Fecha de despliegue
 * @property {string[]} snapshotItemIds - Solo para releases: IDs de items que estaban disponibles al momento del despliegue
 */

// ==========================================
// DATOS REACTIVOS
// ==========================================

// Items independientes (sin release)
const standaloneItems = ref([
  {
    id: 'item-standalone-1',
    title: 'Validación de QA',
    description: 'Checklist de validación funcional',
    type: 'feature',
    priority: 'medium'
  }
])

// Releases con items
const releases = ref([
  {
    id: 'release-3-2-1',
    name: 'Release 3.2.1',
    description: 'Actualización de permisos y validaciones',
    items: [
      {
        id: 'item-101',
        title: 'Validación de permisos en inspecciones',
        description: 'Revisión de permisos por rol',
        type: 'feature',
        priority: 'high'
      },
      {
        id: 'item-102',
        title: 'Donación de ítem',
        description: 'Ajustes en flujos de donación',
        type: 'fix',
        priority: 'medium'
      },
      {
        id: 'item-103',
        title: 'Validación del hotfix',
        description: 'Hotfix crítico para producción',
        type: 'hotfix',
        priority: 'critical'
      },
      {
        id: 'item-104',
        title: 'Validación de QA',
        description: 'Checklist QA de release',
        type: 'feature',
        priority: 'low'
      }
    ]
  }
])

// Ambientes de despliegue
const environments = ref([
  {
    id: 'dev',
    name: 'Desarrollo',
    description: 'Ambiente de desarrollo',
    order: 1
  },
  {
    id: 'qa',
    name: 'QA',
    description: 'Ambiente de QA',
    order: 2
  },
  {
    id: 'staging',
    name: 'Staging',
    description: 'Ambiente pre-productivo',
    order: 3
  },
  {
    id: 'prod',
    name: 'Producción',
    description: 'Ambiente productivo',
    order: 4
  }
])

// Despliegues actuales
const deployments = ref([
  {
    id: 'deploy-dev',
    itemId: 'release-3-2-1',
    type: 'release',
    environmentId: 'dev',
    deployedAt: new Date('2026-01-29T10:30:00'),
    snapshotItemIds: ['item-101', 'item-102', 'item-103', 'item-104']
  },
  {
    id: 'deploy-qa',
    itemId: 'release-3-2-1',
    type: 'release',
    environmentId: 'qa',
    deployedAt: new Date('2026-01-29T10:30:00'),
    snapshotItemIds: ['item-101', 'item-102', 'item-103', 'item-104']
  },
  {
    id: 'deploy-staging',
    itemId: 'release-3-2-1',
    type: 'release',
    environmentId: 'staging',
    deployedAt: new Date('2026-01-29T10:30:00'),
    snapshotItemIds: ['item-101', 'item-102', 'item-103', 'item-104']
  },
  {
    id: 'deploy-prod',
    itemId: 'release-3-2-1',
    type: 'release',
    environmentId: 'prod',
    deployedAt: new Date('2026-01-29T10:30:00'),
    snapshotItemIds: ['item-101', 'item-102', 'item-103', 'item-104']
  }
])

// Variable para almacenar datos del drag
const dragData = ref(null)

// Variables para el formulario de nuevo item
const showNewItemForm = ref(false)
const newItem = ref({
  title: '',
  type: 'feature'
})
const titleInput = ref(null)

// Variables para el formulario de nuevo release
const showNewReleaseForm = ref(false)
const newRelease = ref({
  name: ''
})
const newReleaseTitle = ref('')
const releaseNameInput = ref(null)

// Variables para el formulario de nuevo ambiente
const showNewEnvironmentForm = ref(false)
const newEnvironment = ref({
  name: ''
})
const environmentNameInput = ref(null)

// ==========================================
// MÉTODOS COMPUTADOS
// ==========================================

/**
 * Obtiene releases que no están desplegados en ningún ambiente
 */
const availableReleases = computed(() => {
  const deployedReleaseIds = deployments.value
    .filter(d => d.type === 'release')
    .map(d => d.itemId)
  
  return releases.value.filter(r => !deployedReleaseIds.includes(r.id))
})

/**
 * Obtiene items standalone que no están desplegados en ningún ambiente
 */
const availableStandaloneItems = computed(() => {
  const deployedItemIds = deployments.value
    .filter(d => d.type === 'item')
    .map(d => d.itemId)
  
  return standaloneItems.value.filter(i => !deployedItemIds.includes(i.id))
})

/**
 * Obtiene los items que estaban disponibles cuando se desplegó un release
 */
const getDeployedReleaseItems = (deployment) => {
  if (deployment.type !== 'release' || !deployment.snapshotItemIds) {
    return []
  }
  
  const release = getReleaseById(deployment.itemId)
  if (!release) return []
  
  // Filtrar solo los items que estaban en el snapshot y ordenar por tipo
  const items = release.items.filter(item => deployment.snapshotItemIds.includes(item.id))
  
  // Ordenar por tipo: 'hotfix' primero, luego 'fix', luego 'feature'
  return items.sort((a, b) => {
    const typeOrder = { 'hotfix': 1, 'fix': 2, 'feature': 3 }
    return (typeOrder[a.type] || 999) - (typeOrder[b.type] || 999)
  })
}
/**
 * Para cada release disponible, filtrar sus items que no están desplegados individualmente
 */
const getAvailableItemsForRelease = (release) => {
  const deployedItemIds = deployments.value
    .filter(d => d.type === 'item')
    .map(d => d.itemId)
  
  return release.items.filter(i => !deployedItemIds.includes(i.id))
}

/**
 * Verifica si el nombre del release a crear ya existe
 */
const isDuplicateRelease = computed(() => {
  if (!newRelease.value.name.trim()) return false
  
  const fullReleaseName = `Release ${newRelease.value.name.trim()}`
  return releases.value.some(r => r.name === fullReleaseName)
})

/**
 * Verifica si el nombre del ambiente a crear ya existe
 */
const isDuplicateEnvironment = computed(() => {
  if (!newEnvironment.value.name.trim()) return false
  
  return environments.value.some(env => env.name.toLowerCase() === newEnvironment.value.name.trim().toLowerCase())
})

/**
 * Obtiene los ambientes ordenados por su propiedad order
 */
const sortedEnvironments = computed(() => {
  return [...environments.value].sort((a, b) => (a.order || 999) - (b.order || 999))
})

/**
 * Obtiene los despliegues de un ambiente específico
 */
const getDeploymentsByEnvironment = (environmentId) => {
  return deployments.value.filter(d => d.environmentId === environmentId)
}

/**
 * Busca un release por ID
 */
const getReleaseById = (releaseId) => {
  return releases.value.find(r => r.id === releaseId)
}

/**
 * Busca un item por ID (en releases o standalone)
 */
const getItemById = (itemId) => {
  // Buscar en items standalone
  let item = standaloneItems.value.find(i => i.id === itemId)
  if (item) return item

  // Buscar en items de releases
  for (const release of releases.value) {
    item = release.items.find(i => i.id === itemId)
    if (item) return item
  }
  return null
}

// ==========================================
// FUNCIONALIDAD NUEVO ITEM
// ==========================================

/**
 * Muestra/oculta el formulario de nuevo item
 */
const toggleNewItemForm = () => {
  showNewItemForm.value = !showNewItemForm.value
  
  if (showNewItemForm.value) {
    // Focus en el input después del próximo tick del DOM
    setTimeout(() => {
      titleInput.value?.focus()
    }, 50)
  } else {
    // Resetear formulario al cerrar
    resetNewItemForm()
  }
}

/**
 * Crea un nuevo item independiente
 */
const createNewItem = () => {
  const title = newItem.value.title.trim()
  
  if (!title) {
    console.warn('❌ El título del item es requerido')
    return
  }

  // Crear nuevo item
  const item = {
    id: `item-${Date.now()}`,
    title: title,
    description: `Item creado el ${formatDate(new Date())}`,
    type: newItem.value.type,
    priority: 'medium' // Valor por defecto
  }

  // Agregar a la lista de items standalone
  standaloneItems.value.push(item)

  console.log(`✅ Nuevo item creado: ${item.title}`)

  // Resetear formulario y cerrar
  resetNewItemForm()
  showNewItemForm.value = false
}

/**
 * Cancela la creación del nuevo item
 */
const cancelNewItem = () => {
  resetNewItemForm()
  showNewItemForm.value = false
}

/**
 * Resetea el formulario de nuevo item
 */
const resetNewItemForm = () => {
  newItem.value = {
    title: '',
    type: 'feature'
  }
}

// ==========================================
// FUNCIONALIDAD NUEVO RELEASE
// ==========================================

/**
 * Muestra/oculta el formulario de nuevo release
 */
const toggleNewReleaseForm = () => {
  showNewReleaseForm.value = !showNewReleaseForm.value
  
  if (showNewReleaseForm.value) {
    // Focus en el input después del próximo tick del DOM
    setTimeout(() => {
      releaseNameInput.value?.focus()
    }, 50)
  } else {
    // Resetear formulario al cerrar
    resetNewReleaseForm()
  }
}

/**
 * Crea un nuevo release
 */
const createNewRelease = () => {
  const name = newRelease.value.name.trim()
  
  if (!name) {
    console.warn('❌ El nombre del release es requerido')
    return
  }

  const fullReleaseName = `Release ${name}`

  // Verificar que no exista ya un release con el mismo nombre
  const existingRelease = releases.value.find(r => r.name === fullReleaseName)
  if (existingRelease) {
    console.warn(`❌ Ya existe un release con el nombre "${fullReleaseName}"`)
    return
  }

  // Crear nuevo release con "Release" agregado al nombre
  const release = {
    id: `release-${Date.now()}`,
    name: fullReleaseName,
    description: newReleaseTitle.value.trim(),
    items: [] // Inicialmente sin items
  }

  // Agregar a la lista de releases
  releases.value.push(release)

  console.log(`✅ Nuevo release creado: ${release.name}`)

  // Resetear formulario y cerrar
  resetNewReleaseForm()
  showNewReleaseForm.value = false
}

/**
 * Cancela la creación del nuevo release
 */
const cancelNewRelease = () => {
  resetNewReleaseForm()
  showNewReleaseForm.value = false
}

/**
 * Resetea el formulario de nuevo release
 */
const resetNewReleaseForm = () => {
  newRelease.value = {
    name: ''
  }
  newReleaseTitle.value = ''
}

// ==========================================
// FUNCIONALIDAD NUEVO AMBIENTE
// ==========================================

/**
 * Muestra/oculta el formulario de nuevo ambiente
 */
const toggleNewEnvironmentForm = () => {
  showNewEnvironmentForm.value = !showNewEnvironmentForm.value
  
  if (showNewEnvironmentForm.value) {
    // Focus en el input después del próximo tick del DOM
    setTimeout(() => {
      environmentNameInput.value?.focus()
    }, 50)
  } else {
    // Resetear formulario al cerrar
    resetNewEnvironmentForm()
  }
}

/**
 * Crea un nuevo ambiente
 */
const createNewEnvironment = () => {
  const name = newEnvironment.value.name.trim()
  
  if (!name) {
    console.warn('❌ El nombre del ambiente es requerido')
    return
  }

  // Verificar que no exista ya un ambiente con el mismo nombre
  const existingEnvironment = environments.value.find(env => env.name.toLowerCase() === name.toLowerCase())
  if (existingEnvironment) {
    console.warn(`❌ Ya existe un ambiente con el nombre "${name}"`)
    return
  }

  // Obtener el siguiente número de orden
  const maxOrder = Math.max(...environments.value.map(env => env.order || 0), 0)

  // Crear nuevo ambiente
  const environment = {
    id: `env-${Date.now()}`,
    name: name,
    description: `Ambiente ${name}`,
    order: maxOrder + 1
  }

  // Agregar a la lista de ambientes
  environments.value.push(environment)

  console.log(`✅ Nuevo ambiente creado: ${environment.name}`)

  // Resetear formulario y cerrar
  resetNewEnvironmentForm()
  showNewEnvironmentForm.value = false
}

/**
 * Cancela la creación del nuevo ambiente
 */
const cancelNewEnvironment = () => {
  resetNewEnvironmentForm()
  showNewEnvironmentForm.value = false
}

/**
 * Resetea el formulario de nuevo ambiente
 */
const resetNewEnvironmentForm = () => {
  newEnvironment.value = {
    name: ''
  }
}

/**
 * Mueve un ambiente hacia arriba en el orden
 */
const moveEnvironmentUp = (environmentId) => {
  const sortedEnvs = sortedEnvironments.value
  const envIndex = sortedEnvs.findIndex(env => env.id === environmentId)
  if (envIndex <= 0) return // Ya está en la primera posición o no existe
  
  const currentEnv = sortedEnvs[envIndex]
  const prevEnv = sortedEnvs[envIndex - 1]
  
  // Intercambiar órdenes
  const tempOrder = currentEnv.order
  currentEnv.order = prevEnv.order
  prevEnv.order = tempOrder
  
  console.log(`◄ Ambiente ${currentEnv.name} movido hacia la izquierda`)
}

/**
 * Mueve un ambiente hacia abajo en el orden
 */
const moveEnvironmentDown = (environmentId) => {
  const sortedEnvs = sortedEnvironments.value
  const envIndex = sortedEnvs.findIndex(env => env.id === environmentId)
  if (envIndex >= sortedEnvs.length - 1 || envIndex === -1) return // Ya está en la última posición o no existe
  
  const currentEnv = sortedEnvs[envIndex]
  const nextEnv = sortedEnvs[envIndex + 1]
  
  // Intercambiar órdenes
  const tempOrder = currentEnv.order
  currentEnv.order = nextEnv.order
  nextEnv.order = tempOrder
  
  console.log(`► Ambiente ${currentEnv.name} movido hacia la derecha`)
}

// ==========================================
// FUNCIONALIDAD DRAG AND DROP
// ==========================================

/**
 * Maneja el drop en releases desplegados en ambientes (para agregar items desde otros ambientes)
 */
const handleDropOnDeployedRelease = (event, releaseId) => {
  event.preventDefault()
  event.stopPropagation()
  
  if (!dragData.value) {
    console.warn('❌ No hay datos de drag disponibles')
    return
  }

  const { type, id } = dragData.value
  
  // Solo permitir agregar items a releases
  if (type !== 'item') {
    console.warn('❌ Solo se pueden agregar items a releases')
    resetDragVisuals()
    return
  }

  // Obtener el item y el release
  const item = getItemById(id)
  const release = getReleaseById(releaseId)
  
  if (!item || !release) {
    console.warn('❌ Item o release no encontrado')
    resetDragVisuals()
    return
  }

  // Verificar que el item no esté ya en este release
  const itemAlreadyInRelease = release.items.some(i => i.id === id)
  if (itemAlreadyInRelease) {
    console.warn('❌ Este item ya está en el release')
    resetDragVisuals()
    return
  }

  // Remover el despliegue individual del item si existe
  deployments.value = deployments.value.filter(d => d.itemId !== id)

  // Si el item estaba en items standalone, removerlo de ahí
  const isStandalone = standaloneItems.value.some(i => i.id === id)
  if (isStandalone) {
    standaloneItems.value = standaloneItems.value.filter(i => i.id !== id)
  } else {
    // Si no era standalone, estaba en otro release, removerlo de ahí
    for (const rel of releases.value) {
      if (rel.id !== releaseId) {
        rel.items = rel.items.filter(i => i.id !== id)
      }
    }
  }

  // Agregar el item al release destino
  release.items.push(item)

  // Actualizar el snapshot del release desplegado si existe
  const releaseDeployment = deployments.value.find(d => d.itemId === releaseId && d.type === 'release')
  if (releaseDeployment && releaseDeployment.snapshotItemIds) {
    if (!releaseDeployment.snapshotItemIds.includes(id)) {
      releaseDeployment.snapshotItemIds.push(id)
    }
  }

  console.log(`✅ Item ${id} agregado al release desplegado ${releaseId}`)

  // Limpiar datos del drag
  dragData.value = null
  resetDragVisuals()
}

/**
 * Maneja el drop en los releases (para agregar items independientes)
 */
const handleDropOnRelease = (event, releaseId) => {
  event.preventDefault()
  event.stopPropagation()
  
  if (!dragData.value) {
    console.warn('❌ No hay datos de drag disponibles')
    return
  }

  const { type, id } = dragData.value
  
  // Solo permitir agregar items independientes a releases
  if (type !== 'item') {
    console.warn('❌ Solo se pueden agregar items a releases')
    resetDragVisuals()
    return
  }

  // Verificar que el item sea standalone (no esté en otro release)
  const item = getItemById(id)
  const isStandalone = standaloneItems.value.some(i => i.id === id)
  
  if (!isStandalone) {
    console.warn('❌ Este item ya pertenece a un release')
    resetDragVisuals()
    return
  }

  // Agregar el item al release
  const release = getReleaseById(releaseId)
  if (release) {
    // Remover de items standalone
    standaloneItems.value = standaloneItems.value.filter(i => i.id !== id)
    
    // Agregar al release
    release.items.push(item)
    
    console.log(`✅ Item ${id} agregado al release ${releaseId}`)
  }

  // Limpiar datos del drag
  dragData.value = null
  resetDragVisuals()
}

/**
 * Maneja el inicio del drag
 */
const handleDragStart = (event) => {
  const element = event.target
  const type = element.dataset.type
  const id = element.dataset.id
  const releaseId = element.dataset.releaseId

  dragData.value = {
    type,
    id,
    releaseId
  }

  // Efectos visuales durante el drag
  element.style.opacity = '0.5'
  
  console.log(`🚀 Iniciando drag: ${type} ${id}`, dragData.value)
}

/**
 * Maneja el drop en los ambientes
 */
const handleDrop = (event, environmentId) => {
  event.preventDefault()
  
  if (!dragData.value) {
    console.warn('❌ No hay datos de drag disponibles')
    return
  }

  const { type, id, releaseId } = dragData.value
  
  // Verificar si ya existe un despliegue para este item/release en este ambiente
  const existingDeployment = deployments.value.find(
    d => d.itemId === id && d.environmentId === environmentId
  )

  if (existingDeployment) {
    console.warn(`⚠️  ${type} ${id} ya está desplegado en ${environmentId}`)
    resetDragVisuals()
    return
  }

  // Eliminar cualquier despliegue existente de este item/release en otros ambientes
  deployments.value = deployments.value.filter(d => d.itemId !== id)

  // Crear nuevo despliegue
  const newDeployment = {
    id: `deploy-${Date.now()}`,
    itemId: id,
    type: type,
    environmentId: environmentId,
    deployedAt: new Date()
  }

  // Si es un release, capturar snapshot de items disponibles
  if (type === 'release') {
    const release = getReleaseById(id)
    if (release) {
      newDeployment.snapshotItemIds = getAvailableItemsForRelease(release).map(item => item.id)
    }
  }

  deployments.value.push(newDeployment)

  // Generar evento de despliegue
  generateDeploymentEvent(type, id, environmentId, releaseId)

  // Limpiar datos del drag
  dragData.value = null
  resetDragVisuals()
}

/**
 * Genera y loguea el evento de despliegue
 */
const generateDeploymentEvent = (type, itemId, environmentId, releaseId = null) => {
  const environment = environments.value.find(env => env.id === environmentId)
  const timestamp = new Date().toISOString()
  
  let eventData = {
    eventType: 'DEPLOYMENT',
    timestamp,
    environment: {
      id: environmentId,
      name: environment?.name
    }
  }

  if (type === 'release') {
    const release = getReleaseById(itemId)
    eventData.release = {
      id: itemId,
      name: release?.name,
      itemsCount: release?.items.length
    }
    console.log(`📦 EVENTO DE DESPLIEGUE - Release desplegado:`, eventData)
  } else {
    const item = getItemById(itemId)
    eventData.item = {
      id: itemId,
      title: item?.title,
      type: item?.type,
      priority: item?.priority
    }
    if (releaseId) {
      eventData.sourceRelease = releaseId
    }
    console.log(`🔧 EVENTO DE DESPLIEGUE - Item desplegado:`, eventData)
  }

  // Aquí podrías enviar el evento a un backend o sistema de eventos
  // Por ahora solo se loguea en consola como solicitado
}

/**
 * Resetea los efectos visuales del drag
 */
const resetDragVisuals = () => {
  const draggedElements = document.querySelectorAll('[draggable="true"]')
  draggedElements.forEach(el => {
    el.style.opacity = '1'
  })
}

/**
 * Formatea fecha para mostrar
 */
const formatDate = (date) => {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

// ==========================================
// EVENTOS DEL CICLO DE VIDA
// ==========================================

// Cleanup al finalizar drag
document.addEventListener('dragend', () => {
  resetDragVisuals()
  dragData.value = null
})

// Efectos visuales para drag over en releases
document.addEventListener('dragenter', (e) => {
  if (e.target.classList.contains('release-card') && dragData.value?.type === 'item') {
    e.target.classList.add('drag-over')
  }
})

document.addEventListener('dragleave', (e) => {
  if (e.target.classList.contains('release-card')) {
    e.target.classList.remove('drag-over')
  }
})

document.addEventListener('drop', () => {
  // Limpiar efectos visuales en releases
  document.querySelectorAll('.release-card').forEach(el => {
    el.classList.remove('drag-over')
  })
})
</script>

<style scoped>
.release-dashboard {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 24px;
  align-items: start;
  width: 100%;
  min-height: calc(100vh - 140px);
}

.release-board {
  width: 100%;
}

.board-columns {
  display: grid;
  grid-template-columns: repeat(4, minmax(230px, 1fr));
  gap: 18px;
}

.board-column {
  background: #eef2f7;
  border: 1px solid #dbe2ee;
  border-radius: 12px;
  padding: 12px;
  min-height: 640px;
  display: flex;
  flex-direction: column;
}

.board-column-header {
  padding: 8px 8px 12px;
  border-bottom: 1px solid #dbe2ee;
  margin-bottom: 12px;
}

.board-column-header h3 {
  margin: 0;
  font-size: 1.05rem;
  color: #1f2937;
  font-weight: 700;
}

.board-column-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.release-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.08);
}

.release-card.drag-over {
  border-color: #94a3b8;
  background: #f8fafc;
  box-shadow: 0 0 0 3px rgba(148, 163, 184, 0.25);
}

.release-card-header h4 {
  margin: 0;
  font-size: 1rem;
  color: #0f172a;
  font-weight: 700;
}

.release-meta {
  margin: 4px 0 10px;
  font-size: 0.78rem;
  color: #6b7280;
}

.release-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.release-item,
.release-item-single {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 10px;
}

.release-item {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.release-item-single {
  background: #ffffff;
  border: 1px dashed #cbd5e1;
}

.release-item-title {
  flex: 1;
  font-size: 0.85rem;
  color: #111827;
  font-weight: 600;
}

.item-actions {
  display: flex;
  gap: 6px;
  color: #94a3b8;
  font-size: 0.75rem;
}

.item-actions .icon {
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 2px 6px;
  background: #ffffff;
}

.badge {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 999px;
  white-space: nowrap;
}

.badge-feature {
  background: #dbeafe;
  color: #1d4ed8;
}

.badge-fix {
  background: #dcfce7;
  color: #15803d;
}

.badge-hotfix {
  background: #fee2e2;
  color: #b91c1c;
}

.release-sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sidebar-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
}

.sidebar-card h3 {
  margin: 0 0 12px;
  font-size: 1rem;
  color: #111827;
}

.field-label {
  display: block;
  font-size: 0.78rem;
  color: #6b7280;
  margin-bottom: 6px;
}

.field-input {
  width: 100%;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px 10px;
  margin-bottom: 12px;
  font-size: 0.85rem;
  background: #ffffff;
}

.field-input:focus {
  outline: none;
  border-color: #94a3b8;
  box-shadow: 0 0 0 3px rgba(148, 163, 184, 0.2);
}

.action-btn {
  width: 100%;
  border: none;
  padding: 10px 12px;
  border-radius: 10px;
  background: #7c8ca6;
  color: #ffffff;
  font-weight: 600;
  cursor: pointer;
}

.action-btn:hover {
  background: #66748b;
}

.action-btn.secondary {
  background: #94a3b8;
}

.action-btn.secondary:hover {
  background: #7c8ca6;
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-error {
  margin: 6px 0 0;
  font-size: 0.75rem;
  color: #ef4444;
}

.draggable-item {
  position: relative;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.draggable-item:hover {
  transform: translateY(-2px);
}

.board-column.drag-over {
  border-color: #94a3b8;
  box-shadow: 0 0 0 3px rgba(148, 163, 184, 0.2);
}

@media (max-width: 1200px) {
  .release-dashboard {
    grid-template-columns: 1fr;
  }

  .board-columns {
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  }
}

@media (max-width: 768px) {
  .board-columns {
    grid-template-columns: 1fr;
  }

  .board-column {
    min-height: auto;
  }
}
</style>