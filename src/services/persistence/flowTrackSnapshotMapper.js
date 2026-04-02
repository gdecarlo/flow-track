export const createEmptyFlowTrackState = () => ({
  standaloneItems: [],
  releases: [],
  environments: [],
  deployments: []
})

const normalizeItem = item => ({
  id: item?.id ?? '',
  title: item?.title ?? '',
  description: item?.description ?? '',
  type: item?.type ?? 'feature',
  priority: item?.priority ?? 'medium'
})

const normalizeRelease = release => ({
  id: release?.id ?? '',
  name: release?.name ?? '',
  description: release?.description ?? '',
  items: Array.isArray(release?.items) ? release.items.map(normalizeItem) : []
})

const normalizeEnvironment = environment => ({
  id: environment?.id ?? '',
  name: environment?.name ?? '',
  description: environment?.description ?? '',
  order: Number.isFinite(environment?.order) ? environment.order : 0
})

const normalizeDeployment = deployment => ({
  id: deployment?.id ?? '',
  itemId: deployment?.itemId ?? '',
  type: deployment?.type ?? 'item',
  environmentId: deployment?.environmentId ?? '',
  deployedAt: deployment?.deployedAt instanceof Date
    ? deployment.deployedAt
    : new Date(deployment?.deployedAt ?? Date.now()),
  snapshotItemIds: Array.isArray(deployment?.snapshotItemIds) ? deployment.snapshotItemIds : undefined
})

export const deserializeFlowTrackState = state => {
  const sourceState = state && typeof state === 'object' ? state : createEmptyFlowTrackState()

  return {
    standaloneItems: Array.isArray(sourceState.standaloneItems)
      ? sourceState.standaloneItems.map(normalizeItem)
      : [],
    releases: Array.isArray(sourceState.releases)
      ? sourceState.releases.map(normalizeRelease)
      : [],
    environments: Array.isArray(sourceState.environments)
      ? sourceState.environments.map(normalizeEnvironment)
      : [],
    deployments: Array.isArray(sourceState.deployments)
      ? sourceState.deployments.map(normalizeDeployment)
      : []
  }
}

export const serializeFlowTrackState = state => {
  const hydratedState = deserializeFlowTrackState(state)

  return {
    standaloneItems: hydratedState.standaloneItems.map(item => ({ ...item })),
    releases: hydratedState.releases.map(release => ({
      ...release,
      items: release.items.map(item => ({ ...item }))
    })),
    environments: hydratedState.environments.map(environment => ({ ...environment })),
    deployments: hydratedState.deployments.map(deployment => ({
      ...deployment,
      deployedAt: deployment.deployedAt.toISOString(),
      snapshotItemIds: deployment.snapshotItemIds ? [...deployment.snapshotItemIds] : undefined
    }))
  }
}

export const cloneFlowTrackState = state => {
  return deserializeFlowTrackState(serializeFlowTrackState(state))
}