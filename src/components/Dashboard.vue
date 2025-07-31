<template>
  <div class="deployment-dashboard">
    
    <div class="dashboard-container">
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
                <button @click="cancelNewRelease" class="cancel-btn">
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
              draggable="true"
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
                    <span class="item-type">{{ item.type }}</span>
                    <span class="item-title">{{ item.title }}</span>
                  </div>
                </div>
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
              class="item-title-input"
              @keyup.enter="createNewItem"
              @keyup.escape="cancelNewItem"
            />
            <div class="form-controls">
              <select v-model="newItem.type" class="item-type-select">
                <option value="feature">Feature</option>
                <option value="fix">Fix</option>
                <option value="hotfix">Hotfix</option>
              </select>
              <div class="form-buttons">
                <button @click="createNewItem" class="save-btn" :disabled="!newItem.title.trim()">
                  ✓
                </button>
                <button @click="cancelNewItem" class="cancel-btn">
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
            draggable="true"
            @dragstart="handleDragStart"
          >
            <div class="item-header">
              <div class="item-info">
                <span class="item-type">{{ item.type }}</span>
                <span class="item-title">{{ item.title }}</span>
              </div>
            </div>
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
            class="environment-name-input"
            @keyup.enter="createNewEnvironment"
            @keyup.escape="cancelNewEnvironment"
          />
          <div class="form-controls">
            <div class="form-buttons">
              <button @click="createNewEnvironment" class="save-btn" :disabled="!newEnvironment.name.trim() || isDuplicateEnvironment">
                ✓
              </button>
              <button @click="cancelNewEnvironment" class="cancel-btn">
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
                    :disabled="sortedEnvironments.findIndex(env => env.id === environment.id) <= 0"
                    title="Mover hacia la izquierda"
                  >
                    ◄
                  </button>
                  <button 
                    @click="moveEnvironmentDown(environment.id)"
                    class="move-btn"
                    :disabled="sortedEnvironments.findIndex(env => env.id === environment.id) >= sortedEnvironments.length - 1"
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
                draggable="true"
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
                    <span class="item-type" :class="item.type">{{ item.type }}</span>
                    <span class="item-title">{{ item.title }}</span>
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
                draggable="true"
                @dragstart="handleDragStart"
              >
                <div class="deployment-header">
                  <span class="item-type">{{ getItemById(deployment.itemId)?.type }}</span>
                  <span class="item-title">{{ getItemById(deployment.itemId)?.title }}</span>
                  <span class="deployment-date">{{ formatDate(deployment.deployedAt) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
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
    id: 'item-1',
    title: 'Implementar autenticación OAuth',
    description: 'Agregar soporte para login con Google y GitHub',
    type: 'feature',
    priority: 'high'
  },
  {
    id: 'item-2',
    title: 'Corregir bug en paginación',
    description: 'Error al navegar a la última página',
    type: 'fix',
    priority: 'medium'
  }
])

// Releases con items
const releases = ref([
  {
    id: 'release-1',
    name: 'Release 2.1.0',
    description: 'Mejoras de seguridad y nuevas funcionalidades',
    items: [
      {
        id: 'item-3',
        title: 'Dashboard de métricas',
        description: 'Panel de control con estadísticas en tiempo real',
        type: 'feature',
        priority: 'high'
      },
      {
        id: 'item-4',
        title: 'Optimización de consultas SQL',
        description: 'Mejorar rendimiento de queries complejas',
        type: 'fix',
        priority: 'medium'
      },
      {
        id: 'item-5',
        title: 'API de notificaciones',
        description: 'Sistema de notificaciones push',
        type: 'hotfix',
        priority: 'low'
      }
    ]
  },
  {
    id: 'release-2',
    name: 'Release v2.0.1',
    description: 'Correcciones críticas y patches de seguridad',
    items: [
      {
        id: 'item-6',
        title: 'Parche de seguridad XSS',
        description: 'Corregir vulnerabilidad en formularios',
        type: 'fix',
        priority: 'critical'
      },
      {
        id: 'item-7',
        title: 'Actualizar dependencias',
        description: 'Actualizar librerías a versiones seguras',
        type: 'fix',
        priority: 'high'
      }
    ]
  }
])

// Ambientes de despliegue
const environments = ref([
  {
    id: 'test',
    name: 'Test',
    description: 'Ambiente de pruebas',
    order: 1
  },
  {
    id: 'demo',
    name: 'Demo',
    description: 'Ambiente de demostración',
    order: 2
  },
  {
    id: 'prod',
    name: 'Prod',
    description: 'Ambiente de producción',
    order: 3
  }
])

// Despliegues actuales
const deployments = ref([
  {
    id: 'deploy-1',
    itemId: 'release-2',
    type: 'release',
    environmentId: 'test',
    deployedAt: new Date('2025-07-29T10:30:00'),
    snapshotItemIds: ['item-6', 'item-7'] // Items que estaban disponibles cuando se desplegó
  },
  {
    id: 'deploy-2',
    itemId: 'item-1',
    type: 'item',
    environmentId: 'demo',
    deployedAt: new Date('2025-07-29T14:15:00')
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
    description: '', // Descripción vacía como solicitado
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
  if ((e.target.classList.contains('release-header') || e.target.classList.contains('deployed-release')) && dragData.value?.type === 'item') {
    e.target.classList.add('drag-over')
  }
})

document.addEventListener('dragleave', (e) => {
  if (e.target.classList.contains('release-header') || e.target.classList.contains('deployed-release')) {
    e.target.classList.remove('drag-over')
  }
})

document.addEventListener('drop', (e) => {
  // Limpiar efectos visuales en releases
  document.querySelectorAll('.release-header, .deployed-release').forEach(el => {
    el.classList.remove('drag-over')
  })
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
  gap: 30px;
  height: calc(100vh - 150px);
  width: 100%;
}

.left-column, .right-column {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.left-column {
  overflow-y: auto;
}

.right-column {
  overflow: hidden;
  width: 100%;
}

.section-title {
  color: #334155;
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 20px;
  border-bottom: 2px solid #e2e8f0;
  padding-bottom: 10px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
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
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  margin-bottom: 16px;
  overflow: hidden;
  transition: all 0.2s ease;
}

.release-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.release-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 16px;
  cursor: grab;
  transition: all 0.2s ease;
}

.release-header:active {
  cursor: grabbing;
}

.release-header h3 {
  margin: 0 0 8px 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.release-description {
  margin: 0 0 8px 0;
  opacity: 0.9;
  font-size: 0.9rem;
}

.item-count {
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

/* Items dentro de releases */
.items-container {
  padding: 12px;
  background: #f8fafc;
}

.item-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 8px;
  cursor: grab;
  transition: all 0.2s ease;
}

.item-card:active {
  cursor: grabbing;
}

.item-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.item-type {
  background: #e2e8f0;
  color: #475569;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  width: fit-content;
}

.item-title {
  font-weight: 600;
  color: #334155;
  font-size: 0.85rem;
  line-height: 1.2;
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

/* Colores por tipo de item */
.item-feature .item-type {
  background: #10b981;
  color: white;
}

.item-fix .item-type {
  background: #f59e0b;
  color: white;
}

.item-hotfix .item-type {
  background: #ef4444;
  color: white;
}

/* Estilos para release header que acepta drops */
.release-header.drag-over,
.deployed-release.drag-over {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
  transform: scale(1.02);
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
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid #10b981;
  background: white;
  color: #10b981;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 1.2rem;
  font-weight: bold;
}

.add-item-btn:hover {
  background: #10b981;
  color: white;
  transform: scale(1.1);
}

.add-item-btn.active {
  background: #ef4444;
  border-color: #ef4444;
  color: white;
}

.add-item-btn.active:hover {
  background: #dc2626;
  border-color: #dc2626;
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
  border: 2px dashed #cbd5e1;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  animation: slideDown 0.3s ease;
}

/* Formulario de nuevo ambiente */
.new-environment-form {
  background: #f0f9ff;
  border: 2px dashed #0ea5e9;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
  animation: slideDown 0.3s ease;
}

.environment-name-input {
  width: 100%;
  border: 2px solid #0ea5e9;
  border-radius: 6px;
  padding: 12px;
  font-size: 0.9rem;
  margin-bottom: 12px;
  transition: border-color 0.2s ease;
  background: white;
  box-sizing: border-box;
}

.environment-name-input:focus {
  outline: none;
  border-color: #0284c7;
  box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
}

.environment-name-input::placeholder {
  color: #94a3b8;
  font-style: italic;
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
  border: 2px solid #e2e8f0;
  border-radius: 6px;
  padding: 12px;
  font-size: 0.9rem;
  margin-bottom: 12px;
  transition: border-color 0.2s ease;
  background: white;
  box-sizing: border-box;
}

.item-title-input:focus {
  outline: none;
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

.item-title-input.error {
  border-color: #ef4444;
  background: #fef2f2;
}

.item-title-input.error:focus {
  border-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.item-title-input::placeholder {
  color: #94a3b8;
  font-style: italic;
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
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  background: white;
  font-size: 0.85rem;
  cursor: pointer;
  transition: border-color 0.2s ease;
  flex: 1;
}

.item-type-select:focus {
  outline: none;
  border-color: #10b981;
}

.form-buttons {
  display: flex;
  gap: 4px;
  margin-left: auto;
}

.save-btn,
.cancel-btn {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  font-weight: bold;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.save-btn {
  background: #10b981;
  color: white;
}

.save-btn:hover:not(:disabled) {
  background: #059669;
  transform: scale(1.05);
}

.save-btn:disabled {
  background: #d1d5db;
  cursor: not-allowed;
  opacity: 0.5;
}

.cancel-btn {
  background: #ef4444;
  color: white;
}

.cancel-btn:hover {
  background: #dc2626;
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
  background: #f1f5f9;
  border-radius: 8px;
  padding: 16px;
  border: 2px dashed #cbd5e1;
  transition: all 0.2s ease;
  overflow-y: auto;
  min-height: 100%;
  width: 280px;
  flex-shrink: 0;
  flex-grow: 0;
}

.environment-column:hover {
  border-color: #94a3b8;
  background: #e2e8f0;
}

.environment-header {
  text-align: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #cbd5e1;
}

.environment-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.environment-header h3 {
  margin: 0;
  color: #334155;
  font-size: 1rem;
  font-weight: 600;
  flex: 1;
  text-align: left;
}

.environment-controls {
  display: flex;
  flex-direction: row;
  gap: 4px;
}

.move-btn {
  width: 20px;
  height: 20px;
  border: 1px solid #cbd5e1;
  background: white;
  color: #64748b;
  border-radius: 3px;
  cursor: pointer;
  font-size: 0.7rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.move-btn:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: #94a3b8;
  color: #475569;
  transform: scale(1.1);
}

.move-btn:disabled {
  background: #f8fafc;
  color: #cbd5e1;
  cursor: not-allowed;
  opacity: 0.5;
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
  background: white;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border-left: 4px solid #3b82f6;
  cursor: grab;
  transition: all 0.2s ease;
}

.deployed-release:active, .deployed-item:active {
  cursor: grabbing;
}

.deployed-release:hover, .deployed-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.deployed-release {
  border-left-color: #8b5cf6;
}

.deployment-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
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
  gap: 8px;
  padding: 4px 0px;
  background: #f8fafc;
  border-radius: 4px;
}

.deployed-item-detail .item-type {
  background: #e2e8f0;
  color: #475569;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  min-width: 40px;
  text-align: center;
}

.deployed-item-detail.item-feature .item-type {
  background: #10b981;
  color: white;
}

.deployed-item-detail.item-fix .item-type {
  background: #f59e0b;
  color: white;
}

.deployed-item-detail.item-hotfix .item-type {
  background: #ef4444;
  color: white;
}

.deployed-item-detail .item-title {
  font-weight: 500;
  color: #334155;
  font-size: 0.85rem;
  flex: 1;
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
  background: #1f2937;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  white-space: nowrap;
  z-index: 1000;
}

/* Estados durante drag */
.environment-column.drag-over {
  border-color: #3b82f6;
  background: #dbeafe;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
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