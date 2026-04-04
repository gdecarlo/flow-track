const deployedTypeOrder = {
  hotfix: 1,
  fix: 2,
  feature: 3
}

export const environmentKinds = {
  pool: 'pool',
  standard: 'standard',
  production: 'production'
}

export const poolEnvironmentId = 'pool'
export const poolEnvironmentName = 'Pool'

const validAreas = ['front', 'back', 'app']

const fixedKindOrder = {
  [environmentKinds.pool]: 1,
  [environmentKinds.standard]: 2,
  [environmentKinds.production]: 3
}

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

export const isPoolEnvironment = environment => environment?.kind === environmentKinds.pool

export const isProductionEnvironment = environment => environment?.kind === environmentKinds.production

export const isFixedEnvironment = environment => Boolean(environment?.isFixed)

export const sortEnvironments = environments => {
  return [...environments].sort((firstEnvironment, secondEnvironment) => {
    const firstOrder = Number.isFinite(firstEnvironment?.order) ? firstEnvironment.order : 999
    const secondOrder = Number.isFinite(secondEnvironment?.order) ? secondEnvironment.order : 999

    if (firstOrder !== secondOrder) {
      return firstOrder - secondOrder
    }

    const firstKindOrder = fixedKindOrder[firstEnvironment?.kind] || 999
    const secondKindOrder = fixedKindOrder[secondEnvironment?.kind] || 999

    return firstKindOrder - secondKindOrder
  })
}

export const normalizeEnvironmentLayout = environments => {
  const poolEnvironments = sortEnvironments(environments).filter(isPoolEnvironment)
  const standardEnvironments = sortEnvironments(environments).filter(environment => {
    return environment?.kind === environmentKinds.standard
  })
  const productionEnvironments = sortEnvironments(environments).filter(isProductionEnvironment)

  const orderedEnvironments = [
    ...poolEnvironments,
    ...standardEnvironments,
    ...productionEnvironments
  ]

  orderedEnvironments.forEach((environment, index) => {
    environment.order = index + 1
  })

  return environments
}

export const createPoolEnvironment = () => ({
  id: poolEnvironmentId,
  name: poolEnvironmentName,
  description: 'Contenedor inicial de artefactos',
  order: 1,
  kind: environmentKinds.pool,
  isFixed: true
})

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

const insertDeploymentForEnvironment = (state, deployment, environmentId) => {
  const targetEnvironment = state.environments.find(environment => environment.id === environmentId)

  if (isProductionEnvironment(targetEnvironment)) {
    state.deployments.unshift(deployment)
    return
  }

  state.deployments.push(deployment)
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
  const environment = {
    id: `env-${Date.now()}`,
    name: rawName.trim(),
    description: `Ambiente ${rawName.trim()}`,
    order: Math.max(...environments.map(currentEnvironment => currentEnvironment.order || 0), 0) + 1,
    kind: environmentKinds.standard,
    isFixed: false
  }

  environments.push(environment)
  normalizeEnvironmentLayout(environments)

  return environment
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

  const sourceEnvironment = environments.find(environment => environment.id === sourceEnvironmentId)
  const targetEnvironment = environments.find(environment => environment.id === targetEnvironmentId)

  if (!sourceEnvironment || !targetEnvironment) {
    return null
  }

  if (isFixedEnvironment(sourceEnvironment) || isFixedEnvironment(targetEnvironment)) {
    return null
  }

  const sortedEnvironments = sortEnvironments(environments)
  const movableEnvironments = sortedEnvironments.filter(environment => !isFixedEnvironment(environment))

  const sourceIndex = movableEnvironments.findIndex(environment => environment.id === sourceEnvironmentId)
  const targetIndex = movableEnvironments.findIndex(environment => environment.id === targetEnvironmentId)

  if (sourceIndex === -1 || targetIndex === -1) {
    return null
  }

  const [movedEnvironment] = movableEnvironments.splice(sourceIndex, 1)
  movableEnvironments.splice(targetIndex, 0, movedEnvironment)

  const fixedEnvironments = sortedEnvironments.filter(isFixedEnvironment)
  const poolEnvironments = fixedEnvironments.filter(isPoolEnvironment)
  const productionEnvironments = fixedEnvironments.filter(isProductionEnvironment)

  ;[
    ...poolEnvironments,
    ...movableEnvironments,
    ...productionEnvironments
  ].forEach((environment, index) => {
    environment.order = index + 1
  })

  return movedEnvironment
}

export const addStandaloneItemToRelease = (state, itemId, releaseId) => {
  const { standaloneItems, releases, deployments } = state
  const item = getItemById(state, itemId)
  const release = getReleaseById(releases, releaseId)

  if (!item || !release) {
    return { ok: false, reason: '❌ Item o release no encontrado' }
  }

  const itemAlreadyInRelease = release.items.some(releaseItem => releaseItem.id === itemId)
  if (itemAlreadyInRelease) {
    removeDeploymentByItemId(deployments, itemId)
    return { ok: true, item, release }
  }

  const isStandaloneItem = standaloneItems.some(standaloneItem => standaloneItem.id === itemId)

  if (isStandaloneItem) {
    removeDeploymentByItemId(deployments, itemId)
    removeStandaloneItemById(standaloneItems, itemId)
    release.items.push(item)

    return { ok: true, item, release }
  }

  removeDeploymentByItemId(deployments, itemId)
  removeItemFromOtherReleases(releases, itemId, releaseId)
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
    standaloneItems.unshift(item)
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

  const deployment = {
    id: `deploy-${Date.now()}`,
    itemId,
    type: 'item',
    environmentId: targetEnvironmentId,
    deployedAt: new Date()
  }

  insertDeploymentForEnvironment(state, deployment, targetEnvironmentId)

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

  insertDeploymentForEnvironment(state, deployment, environmentId)

  return {
    ok: true,
    deployment,
    event: buildDeploymentEvent(state, { type, id, environmentId, releaseId })
  }
}