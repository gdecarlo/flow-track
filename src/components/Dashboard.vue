<template>
  <div class="deployment-dashboard">
    
    <div class="dashboard-container">
      <!-- Columna Izquierda: Lista de Artefactos -->
      <div class="left-column">
        <h2 class="section-title">Artefactos</h2>
        
        <!-- Releases con Items -->
        <div class="releases-container">
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
                    <span class="item-type">{{ item.type.toUpperCase() }}</span>
                    <span class="item-title">{{ item.title }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Items sin Release -->
        <div class="standalone-items">
          <h3 class="subsection-title">Items Independientes</h3>
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
                <span class="item-type">{{ item.type.toUpperCase() }}</span>
                <span class="item-title">{{ item.title }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Columna Derecha: Tablero Kanban de Ambientes -->
      <div class="right-column">
        <h2 class="section-title">Ambientes de Despliegue</h2>
        
        <div class="kanban-board">
          <div 
            v-for="environment in environments" 
            :key="environment.id"
            class="environment-column"
            @dragover.prevent
            @dragenter.prevent
            @drop="handleDrop($event, environment.id)"
          >
            <div class="environment-header">
              <h3>{{ environment.name }}</h3>
              <span class="deployment-count">
                {{ getDeploymentCount(environment.id) }} despliegues
              </span>
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
                    <span class="item-type" :class="item.type">{{ item.type.toUpperCase() }}</span>
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
                  <span class="item-type">{{ getItemById(deployment.itemId)?.type.toUpperCase() }}</span>
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
 * @property {'feature'|'fix'} type - Tipo de item
 * @property {'low'|'medium'|'high'|'critical'} priority - Prioridad
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
        type: 'feature',
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
    id: 'test1',
    name: 'Test 1',
    description: 'Ambiente de pruebas unitarias'
  },
  {
    id: 'test2',
    name: 'Test 2',
    description: 'Ambiente de pruebas de integración'
  },
  {
    id: 'demo',
    name: 'Demo',
    description: 'Ambiente de demostración para clientes'
  },
  {
    id: 'prod',
    name: 'Prod',
    description: 'Ambiente de producción'
  }
])

// Despliegues actuales
const deployments = ref([
  {
    id: 'deploy-1',
    itemId: 'release-2',
    type: 'release',
    environmentId: 'test1',
    deployedAt: new Date('2025-07-29T10:30:00'),
    snapshotItemIds: ['item-6', 'item-7'] // Items que estaban disponibles cuando se desplegó
  },
  {
    id: 'deploy-2',
    itemId: 'item-1',
    type: 'item',
    environmentId: 'test2',
    deployedAt: new Date('2025-07-29T14:15:00')
  }
])

// Variable para almacenar datos del drag
const dragData = ref(null)

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
  
  // Filtrar solo los items que estaban en el snapshot
  return release.items.filter(item => deployment.snapshotItemIds.includes(item.id))
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
 * Obtiene el número de despliegues por ambiente
 */
const getDeploymentCount = (environmentId) => {
  return deployments.value.filter(d => d.environmentId === environmentId).length
}

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
// FUNCIONALIDAD DRAG AND DROP
// ==========================================

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
  if (e.target.classList.contains('release-header') && dragData.value?.type === 'item') {
    e.target.classList.add('drag-over')
  }
})

document.addEventListener('dragleave', (e) => {
  if (e.target.classList.contains('release-header')) {
    e.target.classList.remove('drag-over')
  }
})

document.addEventListener('drop', (e) => {
  // Limpiar efectos visuales en releases
  document.querySelectorAll('.release-header').forEach(el => {
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
  margin: 0 auto;
  padding: 20px;
  background-color: #f8fafc;
  min-height: 100vh;
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
  grid-template-columns: 0.5fr 2.5fr;
  gap: 30px;
  height: calc(100vh - 120px);
}

.left-column, .right-column {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  overflow-y: auto;
}

.section-title {
  color: #334155;
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 20px;
  border-bottom: 2px solid #e2e8f0;
  padding-bottom: 10px;
}

/* ==========================================
   COLUMNA IZQUIERDA - RELEASES E ITEMS
   ========================================== */

.releases-container {
  margin-bottom: 30px;
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

/* Estilos para release header que acepta drops */
.release-header.drag-over {
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

.subsection-title {
  color: #475569;
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 16px;
}

/* ==========================================
   COLUMNA DERECHA - TABLERO KANBAN
   ========================================== */

.kanban-board {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  height: 100%;
}

.environment-column {
  background: #f1f5f9;
  border-radius: 8px;
  padding: 16px;
  min-height: 400px;
  border: 2px dashed #cbd5e1;
  transition: all 0.2s ease;
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

.environment-header h3 {
  margin: 0 0 4px 0;
  color: #334155;
  font-size: 1rem;
  font-weight: 600;
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
  padding: 6px 8px;
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
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .dashboard-title {
    font-size: 1.5rem;
  }
  
  .kanban-board {
    grid-template-columns: 1fr;
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