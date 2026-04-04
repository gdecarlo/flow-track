export const createInitialStandaloneItems = () => [
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
]

export const createInitialReleases = () => [
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
]

export const createInitialEnvironments = () => [
  {
    id: 'pool',
    name: 'Pool',
    description: 'Contenedor inicial de artefactos',
    order: 1,
    kind: 'pool',
    isFixed: true
  },
  {
    id: 'test',
    name: 'Test',
    description: 'Ambiente de pruebas',
    order: 2,
    kind: 'standard',
    isFixed: false
  },
  {
    id: 'demo',
    name: 'Demo',
    description: 'Ambiente de demostración',
    order: 3,
    kind: 'standard',
    isFixed: false
  },
  {
    id: 'prod',
    name: 'Prod',
    description: 'Ambiente de producción',
    order: 4,
    kind: 'production',
    isFixed: true
  }
]

export const createInitialDeployments = () => [
  {
    id: 'deploy-1',
    itemId: 'release-2',
    type: 'release',
    environmentId: 'test',
    deployedAt: new Date('2025-07-29T10:30:00'),
    snapshotItemIds: ['item-6', 'item-7']
  },
  {
    id: 'deploy-2',
    itemId: 'item-1',
    type: 'item',
    environmentId: 'demo',
    deployedAt: new Date('2025-07-29T14:15:00')
  }
]