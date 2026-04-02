const deployedTypeOrder = {
  hotfix: 1,
  fix: 2,
  feature: 3
}

const validAreas = ['front', 'back', 'app']

const removeDeploymentByItemId = (deployments, itemId) => {
  for (let index = deployments.length - 1; index >= 0; index -= 1) {
    if (deployments[index].itemId === itemId) {
      deployments.splice(index, 1)
    }
  }
}

const removeStandaloneItemById = (standaloneItems, itemId) => {
  const itemIndex = standaloneItems.findIndex(item => item.id === itemId)
  if (itemIndex !== -1) {
    standaloneItems.splice(itemIndex, 1)
    return true
  }

  return false
}

const removeItemFromOtherReleases = (releases, itemId, targetReleaseId) => {
  releases.forEach(release => {
    if (release.id === targetReleaseId) {
      return
    }

    const itemIndex = release.items.findIndex(item => item.id === itemId)
    if (itemIndex !== -1) {
      release.items.splice(itemIndex, 1)
    }
  })
}

export const formatDate = date => {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

export const formatReleaseName = rawName => `Release ${rawName.trim()}`

export const getReleaseById = (releases, releaseId) => {
  return releases.find(release => release.id === releaseId) ?? null
}

export const getItemById = ({ standaloneItems, releases }, itemId) => {
  const standaloneItem = standaloneItems.find(item => item.id === itemId)
  if (standaloneItem) {
    return standaloneItem
  }

  for (const release of releases) {
    const releaseItem = release.items.find(item => item.id === itemId)
    if (releaseItem) {
      return releaseItem
    }
  }

  return null
}

export const getAvailableReleases = (releases, deployments) => {
  const deployedReleaseIds = deployments
    .filter(deployment => deployment.type === 'release')
    .map(deployment => deployment.itemId)

  return releases.filter(release => !deployedReleaseIds.includes(release.id))
}

export const getAvailableStandaloneItems = (standaloneItems, deployments) => {
  const deployedItemIds = deployments
    .filter(deployment => deployment.type === 'item')
    .map(deployment => deployment.itemId)

  return standaloneItems.filter(item => !deployedItemIds.includes(item.id))
}

export const getAvailableItemsForRelease = (release, deployments) => {
  const deployedItemIds = deployments
    .filter(deployment => deployment.type === 'item')
    .map(deployment => deployment.itemId)

  return release.items.filter(item => !deployedItemIds.includes(item.id))
}

export const getDeploymentsByEnvironment = (deployments, environmentId) => {
  return deployments.filter(deployment => deployment.environmentId === environmentId)
}

export const getDeployedReleaseItems = ({ releases }, deployment) => {
  if (deployment.type !== 'release' || !deployment.snapshotItemIds) {
    return []
  }

  const release = getReleaseById(releases, deployment.itemId)
  if (!release) {
    return []
  }

  return release.items
    .filter(item => deployment.snapshotItemIds.includes(item.id))
    .sort((firstItem, secondItem) => {
      return (deployedTypeOrder[firstItem.type] || 999) - (deployedTypeOrder[secondItem.type] || 999)
    })
}

export const hasDuplicateReleaseName = (releases, rawName) => {
  if (!rawName.trim()) {
    return false
  }

  const releaseName = formatReleaseName(rawName)
  return releases.some(release => release.name === releaseName)
}

export const hasDuplicateEnvironmentName = (environments, rawName) => {
  if (!rawName.trim()) {
    return false
  }

  const normalizedName = rawName.trim().toLowerCase()
  return environments.some(environment => environment.name.toLowerCase() === normalizedName)
}

export const createStandaloneItem = ({ title, type }, createdAt = new Date()) => {
  return {
    id: `item-${Date.now()}`,
    title: title.trim(),
    description: `Item creado el ${formatDate(createdAt)}`,
    type,
    priority: 'medium',
    areas: []
  }
}

export const createRelease = rawName => {
  return {
    id: `release-${Date.now()}`,
    name: formatReleaseName(rawName),
    description: '',
    items: []
  }
}

export const createEnvironment = (rawName, environments) => {
  const maxOrder = Math.max(...environments.map(environment => environment.order || 0), 0)

  return {
    id: `env-${Date.now()}`,
    name: rawName.trim(),
    description: `Ambiente ${rawName.trim()}`,
    order: maxOrder + 1
  }
}

export const moveEnvironmentOrder = (environments, environmentId, direction) => {
  const sortedEnvironments = [...environments].sort((firstEnvironment, secondEnvironment) => {
    return (firstEnvironment.order || 999) - (secondEnvironment.order || 999)
  })

  const currentIndex = sortedEnvironments.findIndex(environment => environment.id === environmentId)
  const nextIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1

  if (currentIndex === -1 || nextIndex < 0 || nextIndex >= sortedEnvironments.length) {
    return null
  }

  const currentEnvironment = sortedEnvironments[currentIndex]
  const adjacentEnvironment = sortedEnvironments[nextIndex]
  const previousOrder = currentEnvironment.order

  currentEnvironment.order = adjacentEnvironment.order
  adjacentEnvironment.order = previousOrder

  return currentEnvironment
}

export const reorderEnvironmentOrder = (environments, sourceEnvironmentId, targetEnvironmentId) => {
  if (sourceEnvironmentId === targetEnvironmentId) {
    return null
  }

  const sortedEnvironments = [...environments].sort((firstEnvironment, secondEnvironment) => {
    return (firstEnvironment.order || 999) - (secondEnvironment.order || 999)
  })

  const sourceIndex = sortedEnvironments.findIndex(environment => environment.id === sourceEnvironmentId)
  const targetIndex = sortedEnvironments.findIndex(environment => environment.id === targetEnvironmentId)

  if (sourceIndex === -1 || targetIndex === -1) {
    return null
  }

  const [sourceEnvironment] = sortedEnvironments.splice(sourceIndex, 1)
  sortedEnvironments.splice(targetIndex, 0, sourceEnvironment)

  sortedEnvironments.forEach((environment, index) => {
    environment.order = index + 1
  })

  return sourceEnvironment
}

export const addStandaloneItemToRelease = (state, itemId, releaseId) => {
  const { standaloneItems, releases } = state
  const item = getItemById(state, itemId)
  const release = getReleaseById(releases, releaseId)

  if (!item || !release) {
    return { ok: false, reason: '❌ Item o release no encontrado' }
  }

  const isStandaloneItem = standaloneItems.some(standaloneItem => standaloneItem.id === itemId)
  if (!isStandaloneItem) {
    return { ok: false, reason: '❌ Este item ya pertenece a un release' }
  }

  removeStandaloneItemById(standaloneItems, itemId)
  release.items.push(item)

  return { ok: true, item, release }
}

export const addItemToDeployedRelease = (state, itemId, releaseId) => {
  const { standaloneItems, releases, deployments } = state
  const item = getItemById(state, itemId)
  const release = getReleaseById(releases, releaseId)

  if (!item || !release) {
    return { ok: false, reason: '❌ Item o release no encontrado' }
  }

  const itemAlreadyInRelease = release.items.some(releaseItem => releaseItem.id === itemId)
  if (itemAlreadyInRelease) {
    return { ok: false, reason: '❌ Este item ya está en el release' }
  }

  removeDeploymentByItemId(deployments, itemId)

  const removedFromStandalone = removeStandaloneItemById(standaloneItems, itemId)
  if (!removedFromStandalone) {
    removeItemFromOtherReleases(releases, itemId, releaseId)
  }

  release.items.push(item)

  const releaseDeployment = deployments.find(deployment => {
    return deployment.itemId === releaseId && deployment.type === 'release'
  })

  if (releaseDeployment?.snapshotItemIds && !releaseDeployment.snapshotItemIds.includes(itemId)) {
    releaseDeployment.snapshotItemIds.push(itemId)
  }

  if (releaseDeployment) {
    releaseDeployment.itemDeploymentTimes = {
      ...(releaseDeployment.itemDeploymentTimes || {}),
      [itemId]: new Date().toISOString()
    }
  }

  return { ok: true, item, release }
}

export const toggleItemAreaSelection = (state, itemId, area) => {
  if (!validAreas.includes(area)) {
    return { ok: false, reason: `❌ Área inválida: ${area}` }
  }

  const item = getItemById(state, itemId)
  if (!item) {
    return { ok: false, reason: '❌ Item no encontrado' }
  }

  const currentAreas = Array.isArray(item.areas)
    ? item.areas.filter(currentArea => validAreas.includes(currentArea))
    : []

  if (currentAreas.includes(area)) {
    item.areas = currentAreas.filter(currentArea => currentArea !== area)
    return { ok: true, item }
  }

  item.areas = [...currentAreas, area]
  return { ok: true, item }
}

export const detachItemFromRelease = (state, itemId, releaseId, options = {}) => {
  const { releases, standaloneItems, deployments } = state
  const release = getReleaseById(releases, releaseId)

  if (!release) {
    return { ok: false, reason: '❌ Release no encontrado' }
  }

  const itemIndex = release.items.findIndex(item => item.id === itemId)
  if (itemIndex === -1) {
    return { ok: false, reason: '❌ Item no pertenece al release' }
  }

  const [item] = release.items.splice(itemIndex, 1)

  const existsInStandalone = standaloneItems.some(standaloneItem => standaloneItem.id === item.id)
  if (!existsInStandalone) {
    standaloneItems.push(item)
  }

  const releaseDeployment = deployments.find(deployment => {
    return deployment.type === 'release' && deployment.itemId === releaseId
  })

  if (releaseDeployment?.snapshotItemIds) {
    releaseDeployment.snapshotItemIds = releaseDeployment.snapshotItemIds.filter(snapshotItemId => {
      return snapshotItemId !== itemId
    })
  }

  if (releaseDeployment?.itemDeploymentTimes?.[itemId]) {
    delete releaseDeployment.itemDeploymentTimes[itemId]
  }

  const targetEnvironmentId = options.environmentId
  if (!targetEnvironmentId) {
    return { ok: true, item, release }
  }

  removeDeploymentByItemId(deployments, itemId)

  deployments.push({
    id: `deploy-${Date.now()}`,
    itemId,
    type: 'item',
    environmentId: targetEnvironmentId,
    deployedAt: new Date()
  })

  return {
    ok: true,
    item,
    release,
    environmentId: targetEnvironmentId
  }
}

export const buildDeploymentEvent = (state, payload) => {
  const { environments } = state
  const { type, id, environmentId, releaseId = null } = payload
  const environment = environments.find(currentEnvironment => currentEnvironment.id === environmentId)

  const eventData = {
    eventType: 'DEPLOYMENT',
    timestamp: new Date().toISOString(),
    environment: {
      id: environmentId,
      name: environment?.name
    }
  }

  if (type === 'release') {
    const release = getReleaseById(state.releases, id)
    eventData.release = {
      id,
      name: release?.name,
      itemsCount: release?.items.length
    }

    return {
      label: '📦 EVENTO DE DESPLIEGUE - Release desplegado:',
      eventData
    }
  }

  const item = getItemById(state, id)
  eventData.item = {
    id,
    title: item?.title,
    type: item?.type,
    priority: item?.priority
  }

  if (releaseId) {
    eventData.sourceRelease = releaseId
  }

  return {
    label: '🔧 EVENTO DE DESPLIEGUE - Item desplegado:',
    eventData
  }
}

export const createDeployment = (state, dragData, environmentId) => {
  const { deployments, releases } = state

  if (!dragData) {
    return { ok: false, reason: '❌ No hay datos de drag disponibles' }
  }

  const { type, id, releaseId = null } = dragData
  const existingDeployment = deployments.find(deployment => {
    return deployment.itemId === id && deployment.environmentId === environmentId
  })

  if (existingDeployment) {
    return { ok: false, reason: `⚠️  ${type} ${id} ya está desplegado en ${environmentId}` }
  }

  removeDeploymentByItemId(deployments, id)

  const deployment = {
    id: `deploy-${Date.now()}`,
    itemId: id,
    type,
    environmentId,
    deployedAt: new Date()
  }

  if (type === 'release') {
    const release = getReleaseById(releases, id)
    if (!release) {
      return { ok: false, reason: '❌ Release no encontrado' }
    }

    const snapshotItemIds = getAvailableItemsForRelease(release, deployments).map(item => item.id)
    deployment.snapshotItemIds = snapshotItemIds
    deployment.itemDeploymentTimes = snapshotItemIds.reduce((accumulator, itemId) => {
      accumulator[itemId] = deployment.deployedAt.toISOString()
      return accumulator
    }, {})
  }

  deployments.push(deployment)

  return {
    ok: true,
    deployment,
    event: buildDeploymentEvent(state, { type, id, environmentId, releaseId })
  }
}