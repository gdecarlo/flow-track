import { computed, ref } from 'vue'

import {
  addItemToDeployedRelease,
  addStandaloneItemToRelease,
  createDeployment,
  createEnvironment,
  createRelease,
  createStandaloneItem,
  formatDate,
  getAvailableItemsForRelease,
  getAvailableReleases,
  getAvailableStandaloneItems,
  getDeployedReleaseItems,
  getDeploymentsByEnvironment,
  getItemById,
  getReleaseById,
  hasDuplicateEnvironmentName,
  hasDuplicateReleaseName,
  reorderEnvironmentOrder,
  toggleItemAreaSelection
} from '../domain/flowTrackDomain'
import { createFlowTrackSnapshotRepository } from '../services/persistence/flowTrackSnapshotRepository'
import {
  cloneFlowTrackState,
  createEmptyFlowTrackState
} from '../services/persistence/flowTrackSnapshotMapper'

export const useFlowTrackDomain = () => {
  const snapshotRepository = createFlowTrackSnapshotRepository()
  const standaloneItems = ref([])
  const releases = ref([])
  const environments = ref([])
  const deployments = ref([])
  const isInitializing = ref(false)
  const isSaving = ref(false)
  const isReady = ref(false)
  const persistenceError = ref('')
  const snapshotVersion = ref(0)
  const lastSavedAt = ref(null)

  const applyState = state => {
    standaloneItems.value = state.standaloneItems
    releases.value = state.releases
    environments.value = state.environments
    deployments.value = state.deployments
  }

  const restoreEmptyState = () => {
    applyState(createEmptyFlowTrackState())
  }

  const currentState = () => ({
    standaloneItems: standaloneItems.value,
    releases: releases.value,
    environments: environments.value,
    deployments: deployments.value
  })

  const initialize = async () => {
    if (isInitializing.value || isReady.value) {
      return { ok: true }
    }

    isInitializing.value = true
    persistenceError.value = ''

    const result = await snapshotRepository.loadSnapshot()

    if (!result.ok) {
      restoreEmptyState()
      persistenceError.value = result.reason
      isInitializing.value = false
      return result
    }

    applyState(result.state)
    snapshotVersion.value = result.metadata.version
    lastSavedAt.value = result.metadata.updatedAt
    isReady.value = true
    isInitializing.value = false

    return { ok: true }
  }

  const runPersistedMutation = async mutateState => {
    if (!isReady.value) {
      return {
        ok: false,
        reason: persistenceError.value || 'La persistencia todavía no está inicializada.'
      }
    }

    const previousState = cloneFlowTrackState(currentState())
    const mutationResult = mutateState()

    if (!mutationResult.ok) {
      return mutationResult
    }

    isSaving.value = true
    persistenceError.value = ''

    const saveResult = await snapshotRepository.saveSnapshot(currentState(), {
      expectedVersion: snapshotVersion.value
    })

    if (!saveResult.ok) {
      applyState(previousState)
      persistenceError.value = saveResult.reason
      isSaving.value = false

      return {
        ok: false,
        reason: saveResult.reason
      }
    }

    snapshotVersion.value = saveResult.metadata.version
    lastSavedAt.value = saveResult.metadata.updatedAt
    isSaving.value = false

    return mutationResult
  }

  const availableReleases = computed(() => {
    return getAvailableReleases(releases.value, deployments.value)
  })

  const availableStandaloneItems = computed(() => {
    return getAvailableStandaloneItems(standaloneItems.value, deployments.value)
  })

  const sortedEnvironments = computed(() => {
    return [...environments.value].sort((firstEnvironment, secondEnvironment) => {
      return (firstEnvironment.order || 999) - (secondEnvironment.order || 999)
    })
  })

  const createNewItem = draft => {
    return runPersistedMutation(() => {
      const title = draft.title.trim()
      if (!title) {
        return { ok: false, reason: '❌ El título del item es requerido' }
      }

      const item = createStandaloneItem(draft)
      standaloneItems.value.push(item)
      console.log(`✅ Nuevo item creado: ${item.title}`)

      return { ok: true, item }
    })
  }

  const createNewRelease = rawName => {
    return runPersistedMutation(() => {
      const trimmedName = rawName.trim()
      if (!trimmedName) {
        return { ok: false, reason: '❌ El nombre del release es requerido' }
      }

      if (hasDuplicateReleaseName(releases.value, trimmedName)) {
        return {
          ok: false,
          reason: `❌ Ya existe un release con el nombre "Release ${trimmedName}"`
        }
      }

      const release = createRelease(trimmedName)
      releases.value.push(release)
      console.log(`✅ Nuevo release creado: ${release.name}`)

      return { ok: true, release }
    })
  }

  const createNewEnvironment = rawName => {
    return runPersistedMutation(() => {
      const trimmedName = rawName.trim()
      if (!trimmedName) {
        return { ok: false, reason: '❌ El nombre del ambiente es requerido' }
      }

      if (hasDuplicateEnvironmentName(environments.value, trimmedName)) {
        return {
          ok: false,
          reason: `❌ Ya existe un ambiente con el nombre "${trimmedName}"`
        }
      }

      const environment = createEnvironment(trimmedName, environments.value)
      environments.value.push(environment)
      console.log(`✅ Nuevo ambiente creado: ${environment.name}`)

      return { ok: true, environment }
    })
  }

  const reorderEnvironment = (sourceEnvironmentId, targetEnvironmentId) => {
    return runPersistedMutation(() => {
      const environment = reorderEnvironmentOrder(
        environments.value,
        sourceEnvironmentId,
        targetEnvironmentId
      )

      if (environment) {
        console.log(`↕ Ambiente ${environment.name} reordenado por drag and drop`)
      }

      return { ok: true, environment }
    })
  }

  const addItemToRelease = (itemId, releaseId) => {
    return runPersistedMutation(() => addStandaloneItemToRelease(currentState(), itemId, releaseId))
  }

  const addItemToActiveRelease = (itemId, releaseId) => {
    return runPersistedMutation(() => addItemToDeployedRelease(currentState(), itemId, releaseId))
  }

  const deployArtifact = (dragData, environmentId) => {
    return runPersistedMutation(() => {
      const result = createDeployment(currentState(), dragData, environmentId)

      if (result.ok && result.event) {
        console.log(result.event.label, result.event.eventData)
      }

      return result
    })
  }

  const toggleItemArea = (itemId, area) => {
    return runPersistedMutation(() => toggleItemAreaSelection(currentState(), itemId, area))
  }

  return {
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
    getAvailableItemsForRelease: release => getAvailableItemsForRelease(release, deployments.value),
    getDeploymentsByEnvironment: environmentId => getDeploymentsByEnvironment(deployments.value, environmentId),
    getReleaseById: releaseId => getReleaseById(releases.value, releaseId),
    getItemById: itemId => getItemById(currentState(), itemId),
    getDeployedReleaseItems: deployment => getDeployedReleaseItems(currentState(), deployment),
    hasDuplicateReleaseName: rawName => hasDuplicateReleaseName(releases.value, rawName),
    hasDuplicateEnvironmentName: rawName => hasDuplicateEnvironmentName(environments.value, rawName),
    createNewItem,
    createNewRelease,
    createNewEnvironment,
    reorderEnvironment,
    addItemToRelease,
    addItemToActiveRelease,
    deployArtifact,
    toggleItemArea
  }
}