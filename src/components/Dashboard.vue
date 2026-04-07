<template>
  <div class="deployment-dashboard">
    <div v-if="isInitializing" class="dashboard-state-panel">
      <h2 class="dashboard-state-title">Cargando tablero</h2>
    </div>

    <div v-else-if="!isReady" class="dashboard-state-panel error-state">
      <h2 class="dashboard-state-title">No se pudo inicializar la persistencia</h2>
      <p class="dashboard-state-copy">{{ persistenceError || 'Revisa la configuración de Supabase y vuelve a intentar.' }}</p>
      <button class="state-action-btn" @click="retryInitialize">Reintentar</button>
    </div>

    <div v-else class="dashboard-container">
      <section class="board-shell">
        <header class="board-toolbar">
          <div class="board-intro">
            
          </div>

          <div class="board-toolbar-actions">
            <div ref="createMenuRef" class="create-menu">
              <button
                class="board-primary-action"
                :class="{ active: isCreateMenuOpen }"
                :aria-expanded="isCreateMenuOpen"
                :disabled="isBusy"
                type="button"
                @click="toggleCreateMenu"
              >
                Crear
              </button>

              <div v-if="isCreateMenuOpen" class="create-menu-panel" role="menu" aria-label="Opciones de creación">
                <button
                  v-for="action in creationActions"
                  :key="action.kind"
                  class="create-menu-item"
                  type="button"
                  :disabled="isBusy"
                  @click="selectCreationAction(action.kind)"
                >
                  <img :src="action.icon" alt="" class="create-menu-icon" aria-hidden="true" />
                  <span class="create-menu-label">{{ action.label }}</span>
                </button>
              </div>
            </div>

            <button
              class="board-secondary-action"
              :aria-pressed="showPoolTray"
              :disabled="isBusy"
              type="button"
              @click="togglePoolTray"
            >
              {{ showPoolTray ? 'Ocultar Pool' : 'Mostrar Pool' }}
            </button>
          </div>
        </header>

        <transition name="pool-tray-visibility">
          <div
            v-show="showPoolTray && poolEnvironment"
            class="pool-tray"
            @dragover.prevent
            @dragenter.prevent
            @drop="handleDrop($event, poolEnvironment.id)"
          >
            <div class="pool-tray-header">
              <div>
                <h2 class="pool-tray-title">Pool</h2>
                <p class="pool-tray-copy">Todo lo nuevo aparece acá y desde acá se distribuye al resto de ambientes.</p>
              </div>
            </div>

            <div class="pool-tray-body" :class="{ 'has-two-groups': poolReleases.length > 0 && poolItems.length > 0 }">
              <div class="pool-section">
                <div v-if="poolReleases.length > 0" class="pool-release-grid">
                  <div
                    v-for="release in poolReleases"
                    :key="release.id"
                    class="release-card available-release pool-release-card"
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
                      <div v-if="props.isEditMode" class="entity-inline-actions">
                        <button
                          class="entity-icon-btn entity-icon-btn-delete"
                          type="button"
                          title="Eliminar release"
                          aria-label="Eliminar release"
                          :disabled="isBusy"
                          @mousedown.stop
                          @click.stop="openDeleteConfirmation('release', release.id, release.name)"
                        >
                          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                            <path d="M5.83301 7.5H14.1663" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                            <path d="M7.08301 7.5V14.1667C7.08301 14.6269 7.45611 15 7.91634 15H12.083C12.5432 15 12.9163 14.6269 12.9163 14.1667V7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                            <path d="M8.33301 5.41667C8.33301 4.95643 8.70611 4.58333 9.16634 4.58333H10.833C11.2932 4.58333 11.6663 4.95643 11.6663 5.41667V7.5H8.33301V5.41667Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div v-if="getAvailableItemsForRelease(release).length > 0" class="items-container pool-release-items">
                      <div
                        v-for="item in getAvailableItemsForRelease(release)"
                        :key="item.id"
                        class="item-card draggable-item pool-item-card"
                        :class="`item-${item.type}`"
                        :data-type="'item'"
                        :data-id="item.id"
                        :data-release-id="release.id"
                        :draggable="!isBusy && !isEditingItem(item.id)"
                        @dragstart="handleDragStart"
                      >
                        <div class="item-header-row compact-item-header-row">
                          <div class="item-header-main" :class="{ 'is-inline-editing': isEditingItem(item.id) }">
                            <template v-if="isEditingItem(item.id)">
                              <form class="inline-edit-form" @submit.prevent="submitItemEdition" @click.stop>
                                <input
                                  ref="itemEditionInput"
                                  v-model="pendingItemEdition.title"
                                  type="text"
                                  class="text-input inline-edit-input"
                                  placeholder="Nuevo nombre del item"
                                  :disabled="isBusy"
                                  @mousedown.stop
                                  @keydown.esc.stop.prevent="closeItemEdition"
                                />
                                <div class="inline-edit-actions">
                                  <button type="button" class="secondary-btn inline-edit-btn" :disabled="isBusy" @mousedown.stop @click.stop="closeItemEdition">Cancelar</button>
                                  <button type="submit" class="primary-btn inline-edit-btn" :disabled="isItemEditionSubmitDisabled" @mousedown.stop>Guardar</button>
                                </div>
                              </form>
                            </template>
                            <template v-else>
                              <p class="item-title">{{ item.title }}</p>
                              <div v-if="props.isEditMode" class="entity-inline-actions">
                                <button
                                  class="entity-icon-btn"
                                  type="button"
                                  title="Editar nombre del item"
                                  aria-label="Editar nombre del item"
                                  :disabled="isBusy"
                                  @mousedown.stop
                                  @click.stop="openItemEdition(item)"
                                >
                                  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                                    <path d="M13.75 3.75L16.25 6.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                                    <path d="M4.16699 15.833H6.52533L15.4163 6.94199C15.7468 6.61155 15.7468 6.07579 15.4163 5.74534L14.2547 4.58367C13.9242 4.25322 13.3884 4.25322 13.058 4.58367L4.16699 13.4747V15.833Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                                  </svg>
                                </button>
                                <button
                                  class="entity-icon-btn entity-icon-btn-delete"
                                  type="button"
                                  title="Eliminar item"
                                  aria-label="Eliminar item"
                                  :disabled="isBusy"
                                  @mousedown.stop
                                  @click.stop="openDeleteConfirmation('item', item.id, item.title)"
                                >
                                  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                                    <path d="M5.83301 7.5H14.1663" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                                    <path d="M7.08301 7.5V14.1667C7.08301 14.6269 7.45611 15 7.91634 15H12.083C12.5432 15 12.9163 14.6269 12.9163 14.1667V7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                                    <path d="M8.33301 5.41667C8.33301 4.95643 8.70611 4.58333 9.16634 4.58333H10.833C11.2932 4.58333 11.6663 4.95643 11.6663 5.41667V7.5H8.33301V5.41667Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                                  </svg>
                                </button>
                              </div>
                            </template>
                          </div>
                          <button
                            v-if="props.isEditMode"
                            class="item-detach-btn"
                            title="Desenganchar del release"
                            @click.stop="handleDetachItem(item.id, release.id)"
                          >
                            <img src="/unlocked.png" alt="Desenganchar item" class="item-detach-icon" />
                          </button>
                        </div>
                        <p class="item-description">{{ getItemMetaLabel(item) }}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <p v-else class="empty-inline-copy">Sin releases.</p>
              </div>

              <div class="pool-section pool-items-section">
                <div v-if="poolItems.length > 0" class="pool-item-grid">
                  <div
                    v-for="item in poolItems"
                    :key="item.id"
                    class="item-card draggable-item pool-item-card"
                    :class="`item-${item.type}`"
                    :data-type="'item'"
                    :data-id="item.id"
                    :draggable="!isBusy && !isEditingItem(item.id)"
                    @dragstart="handleDragStart"
                  >
                    <div class="item-header-row compact-item-header-row">
                      <div class="item-header-main" :class="{ 'is-inline-editing': isEditingItem(item.id) }">
                        <template v-if="isEditingItem(item.id)">
                          <form class="inline-edit-form" @submit.prevent="submitItemEdition" @click.stop>
                            <input
                              ref="itemEditionInput"
                              v-model="pendingItemEdition.title"
                              type="text"
                              class="text-input inline-edit-input"
                              placeholder="Nuevo nombre del item"
                              :disabled="isBusy"
                              @mousedown.stop
                              @keydown.esc.stop.prevent="closeItemEdition"
                            />
                            <div class="inline-edit-actions">
                              <button type="button" class="secondary-btn inline-edit-btn" :disabled="isBusy" @mousedown.stop @click.stop="closeItemEdition">Cancelar</button>
                              <button type="submit" class="primary-btn inline-edit-btn" :disabled="isItemEditionSubmitDisabled" @mousedown.stop>Guardar</button>
                            </div>
                          </form>
                        </template>
                        <template v-else>
                          <p class="item-title">{{ item.title }}</p>
                          <div v-if="props.isEditMode" class="entity-inline-actions">
                            <button
                              class="entity-icon-btn"
                              type="button"
                              title="Editar nombre del item"
                              aria-label="Editar nombre del item"
                              :disabled="isBusy"
                              @mousedown.stop
                              @click.stop="openItemEdition(item)"
                            >
                              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                                <path d="M13.75 3.75L16.25 6.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                                <path d="M4.16699 15.833H6.52533L15.4163 6.94199C15.7468 6.61155 15.7468 6.07579 15.4163 5.74534L14.2547 4.58367C13.9242 4.25322 13.3884 4.25322 13.058 4.58367L4.16699 13.4747V15.833Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                              </svg>
                            </button>
                            <button
                              class="entity-icon-btn entity-icon-btn-delete"
                              type="button"
                              title="Eliminar item"
                              aria-label="Eliminar item"
                              :disabled="isBusy"
                              @mousedown.stop
                              @click.stop="openDeleteConfirmation('item', item.id, item.title)"
                            >
                              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                                <path d="M5.83301 7.5H14.1663" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                                <path d="M7.08301 7.5V14.1667C7.08301 14.6269 7.45611 15 7.91634 15H12.083C12.5432 15 12.9163 14.6269 12.9163 14.1667V7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                                <path d="M8.33301 5.41667C8.33301 4.95643 8.70611 4.58333 9.16634 4.58333H10.833C11.2932 4.58333 11.6663 4.95643 11.6663 5.41667V7.5H8.33301V5.41667Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                              </svg>
                            </button>
                          </div>
                        </template>
                      </div>
                    </div>
                    <p class="item-description">{{ getItemMetaLabel(item) }}</p>
                    <div class="item-footer compact-item-footer">
                      <div class="item-area-group">
                        <button
                          v-for="area in itemAreas"
                          :key="`${item.id}-${area}`"
                          class="item-area-tag"
                          :class="{ active: isAreaSelected(item, area) }"
                          :style="getAreaTagStyle(area, isAreaSelected(item, area))"
                          @click.stop="handleToggleItemArea(item.id, area)"
                        >
                          {{ area }}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <p v-else class="empty-inline-copy">Sin items.</p>
              </div>
            </div>
          </div>
        </transition>

        <div class="environment-grid">
          <div
            v-for="environment in boardEnvironments"
            :key="environment.id"
            class="environment-column environment-panel"
            :class="{
              'is-production': isProductionEnvironment(environment),
              'is-fixed': isFixedEnvironment(environment),
              'is-artifact-drop-over': activeEnvironmentDropZoneId === environment.id
            }"
            @dragover.capture="handleEnvironmentArtifactDragOver($event, environment)"
            @drop.capture="handleEnvironmentArtifactDrop($event, environment)"
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
              </div>
            </div>

            <div class="deployments-container environment-panel-content">
              <template v-for="deployment in getOrderedDeployments(environment.id)" :key="`${deployment.type}-${deployment.itemId}`">
                <div
                  v-if="deployment.type === 'release'"
                  class="deployed-release draggable-item environment-release-card"
                  :class="{ 'drag-over': activeReleaseDropZone.type === 'deployed-release' && activeReleaseDropZone.id === deployment.itemId }"
                  :data-type="'release'"
                  :data-id="deployment.itemId"
                  :draggable="!isBusy"
                  @dragstart="handleDragStart"
                  @dragover.prevent="handleReleaseDragOver($event, 'deployed-release', deployment.itemId)"
                  @drop="handleDropOnDeployedRelease($event, deployment.itemId)"
                >
                  <div class="deployment-header">
                    <div class="release-title-line">
                      <h4>{{ getReleaseById(deployment.itemId)?.name }}</h4>
                      <div v-if="props.isEditMode" class="entity-inline-actions">
                        <button
                          class="entity-icon-btn entity-icon-btn-delete"
                          type="button"
                          title="Eliminar release"
                          aria-label="Eliminar release"
                          :disabled="isBusy"
                          @mousedown.stop
                          @click.stop="openDeleteConfirmation('release', deployment.itemId, getReleaseById(deployment.itemId)?.name || 'Release')"
                        >
                          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                            <path d="M5.83301 7.5H14.1663" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                            <path d="M7.08301 7.5V14.1667C7.08301 14.6269 7.45611 15 7.91634 15H12.083C12.5432 15 12.9163 14.6269 12.9163 14.1667V7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                            <path d="M8.33301 5.41667C8.33301 4.95643 8.70611 4.58333 9.16634 4.58333H10.833C11.2932 4.58333 11.6663 4.95643 11.6663 5.41667V7.5H8.33301V5.41667Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <span class="deployment-date">{{ formatRelativeTime(deployment.deployedAt) }}</span>
                  </div>

                  <div class="deployment-items environment-release-items">
                    <div
                      v-for="item in getDeployedReleaseItems(deployment)"
                      :key="item.id"
                      class="deployed-item-detail compact-deployed-item"
                      :class="`item-${item.type}`"
                    >
                      <div class="item-header-row compact-item-header-row">
                        <div class="item-header-main" :class="{ 'is-inline-editing': isEditingItem(item.id) }">
                          <template v-if="isEditingItem(item.id)">
                            <form class="inline-edit-form" @submit.prevent="submitItemEdition" @click.stop>
                              <input
                                ref="itemEditionInput"
                                v-model="pendingItemEdition.title"
                                type="text"
                                class="text-input inline-edit-input"
                                placeholder="Nuevo nombre del item"
                                :disabled="isBusy"
                                @mousedown.stop
                                @keydown.esc.stop.prevent="closeItemEdition"
                              />
                              <div class="inline-edit-actions">
                                <button type="button" class="secondary-btn inline-edit-btn" :disabled="isBusy" @mousedown.stop @click.stop="closeItemEdition">Cancelar</button>
                                <button type="submit" class="primary-btn inline-edit-btn" :disabled="isItemEditionSubmitDisabled" @mousedown.stop>Guardar</button>
                              </div>
                            </form>
                          </template>
                          <template v-else>
                            <span class="item-title">{{ item.title }}</span>
                            <div v-if="props.isEditMode" class="entity-inline-actions">
                              <button
                                class="entity-icon-btn"
                                type="button"
                                title="Editar nombre del item"
                                aria-label="Editar nombre del item"
                                :disabled="isBusy"
                                @mousedown.stop
                                @click.stop="openItemEdition(item)"
                              >
                                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                                  <path d="M13.75 3.75L16.25 6.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                                  <path d="M4.16699 15.833H6.52533L15.4163 6.94199C15.7468 6.61155 15.7468 6.07579 15.4163 5.74534L14.2547 4.58367C13.9242 4.25322 13.3884 4.25322 13.058 4.58367L4.16699 13.4747V15.833Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                                </svg>
                              </button>
                              <button
                                class="entity-icon-btn entity-icon-btn-delete"
                                type="button"
                                title="Eliminar item"
                                aria-label="Eliminar item"
                                :disabled="isBusy"
                                @mousedown.stop
                                @click.stop="openDeleteConfirmation('item', item.id, item.title)"
                              >
                                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                                  <path d="M5.83301 7.5H14.1663" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                                  <path d="M7.08301 7.5V14.1667C7.08301 14.6269 7.45611 15 7.91634 15H12.083C12.5432 15 12.9163 14.6269 12.9163 14.1667V7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                                  <path d="M8.33301 5.41667C8.33301 4.95643 8.70611 4.58333 9.16634 4.58333H10.833C11.2932 4.58333 11.6663 4.95643 11.6663 5.41667V7.5H8.33301V5.41667Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                                </svg>
                              </button>
                            </div>
                          </template>
                        </div>
                        <button
                          v-if="props.isEditMode"
                          class="item-detach-btn"
                          title="Desenganchar del release"
                          @click.stop="handleDetachItem(item.id, deployment.itemId, deployment.environmentId)"
                        >
                          <img src="/unlocked.png" alt="Desenganchar item" class="item-detach-icon" />
                        </button>
                      </div>
                      <p class="item-description">{{ getItemMetaLabel(item, getDeploymentItemTime(deployment, item.id)) }}</p>
                      <div class="item-footer compact-item-footer">
                        <div class="item-area-group">
                          <button
                            v-for="area in itemAreas"
                            :key="`${item.id}-${area}`"
                            class="item-area-tag"
                            :class="{ active: isAreaSelected(item, area) }"
                            :style="getAreaTagStyle(area, isAreaSelected(item, area))"
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
                  v-else
                  class="deployed-item draggable-item compact-deployed-item"
                  :class="`item-${getItemById(deployment.itemId)?.type}`"
                  :data-type="'item'"
                  :data-id="deployment.itemId"
                  :draggable="!isBusy && !isEditingItem(deployment.itemId)"
                  @dragstart="handleDragStart"
                >
                  <div class="item-header-row compact-item-header-row">
                    <div class="item-header-main" :class="{ 'is-inline-editing': isEditingItem(deployment.itemId) }">
                      <template v-if="isEditingItem(deployment.itemId)">
                        <form class="inline-edit-form" @submit.prevent="submitItemEdition" @click.stop>
                          <input
                            ref="itemEditionInput"
                            v-model="pendingItemEdition.title"
                            type="text"
                            class="text-input inline-edit-input"
                            placeholder="Nuevo nombre del item"
                            :disabled="isBusy"
                            @mousedown.stop
                            @keydown.esc.stop.prevent="closeItemEdition"
                          />
                          <div class="inline-edit-actions">
                            <button type="button" class="secondary-btn inline-edit-btn" :disabled="isBusy" @mousedown.stop @click.stop="closeItemEdition">Cancelar</button>
                            <button type="submit" class="primary-btn inline-edit-btn" :disabled="isItemEditionSubmitDisabled" @mousedown.stop>Guardar</button>
                          </div>
                        </form>
                      </template>
                      <template v-else>
                        <p class="item-title deployed-item-title">{{ getItemById(deployment.itemId)?.title }}</p>
                        <div v-if="props.isEditMode" class="entity-inline-actions">
                          <button
                            class="entity-icon-btn"
                            type="button"
                            title="Editar nombre del item"
                            aria-label="Editar nombre del item"
                            :disabled="isBusy"
                            @mousedown.stop
                            @click.stop="openItemEdition(getItemById(deployment.itemId))"
                          >
                            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                              <path d="M13.75 3.75L16.25 6.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                              <path d="M4.16699 15.833H6.52533L15.4163 6.94199C15.7468 6.61155 15.7468 6.07579 15.4163 5.74534L14.2547 4.58367C13.9242 4.25322 13.3884 4.25322 13.058 4.58367L4.16699 13.4747V15.833Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                            </svg>
                          </button>
                          <button
                            class="entity-icon-btn entity-icon-btn-delete"
                            type="button"
                            title="Eliminar item"
                            aria-label="Eliminar item"
                            :disabled="isBusy"
                            @mousedown.stop
                            @click.stop="openDeleteConfirmation('item', deployment.itemId, getItemById(deployment.itemId)?.title || 'Item')"
                          >
                            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                              <path d="M5.83301 7.5H14.1663" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                              <path d="M7.08301 7.5V14.1667C7.08301 14.6269 7.45611 15 7.91634 15H12.083C12.5432 15 12.9163 14.6269 12.9163 14.1667V7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                              <path d="M8.33301 5.41667C8.33301 4.95643 8.70611 4.58333 9.16634 4.58333H10.833C11.2932 4.58333 11.6663 4.95643 11.6663 5.41667V7.5H8.33301V5.41667Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                            </svg>
                          </button>
                        </div>
                      </template>
                    </div>
                  </div>
                  <p class="item-description">{{ getItemMetaLabel(getItemById(deployment.itemId), deployment.deployedAt) }}</p>
                  <div class="item-footer compact-item-footer">
                    <div class="item-area-group">
                      <button
                        v-for="area in itemAreas"
                        :key="`${deployment.itemId}-${area}`"
                        class="item-area-tag"
                        :class="{ active: isAreaSelected(getItemById(deployment.itemId), area) }"
                        :style="getAreaTagStyle(area, isAreaSelected(getItemById(deployment.itemId), area))"
                        @click.stop="handleToggleItemArea(deployment.itemId, area)"
                      >
                        {{ area }}
                      </button>
                    </div>
                  </div>
                </div>
              </template>

              <p
                v-if="getOrderedDeployments(environment.id).length === 0"
                class="empty-column-copy"
              >
                - 
              </p>
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

    <div v-if="isDeleteModalOpen" class="creation-modal-backdrop" @click="handleDeleteBackdropClick">
      <div class="creation-modal delete-confirmation-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-modal-title" @click.stop>
        <div class="creation-modal-header">
          <div>
            <p class="creation-modal-kicker delete-modal-kicker">Eliminar</p>
            <h2 id="delete-modal-title" class="creation-modal-title">{{ pendingDeletion?.label }}</h2>
          </div>
          <button class="modal-close-btn" type="button" :disabled="isSaving" @click="closeDeleteConfirmation">×</button>
        </div>

        <p class="delete-confirmation-copy">
          {{ deleteModalCopy }}
         
        </p>

        <div class="modal-actions">
          <button type="button" class="secondary-btn" :disabled="isSaving" @click="closeDeleteConfirmation">Cancelar</button>
          <button type="button" class="danger-btn" :disabled="isSaving" @click="handleConfirmDelete">Eliminar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { useFlowTrackDomain } from '../composables/useFlowTrackDomain'

const props = defineProps({
  isEditMode: {
    type: Boolean,
    default: false
  }
})

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
  detachItem,
  deleteItem,
  renameItem,
  deleteRelease
} = useFlowTrackDomain()

const dragData = ref(null)
const draggedEnvironmentId = ref('')
const dragOverEnvironmentId = ref('')
const activeEnvironmentDropZoneId = ref('')
const activeReleaseDropZone = ref({ type: '', id: '' })
const activeModal = ref('')
const showPoolTray = ref(true)
const isCreateMenuOpen = ref(false)
const createMenuRef = ref(null)

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
const itemEditionInput = ref(null)
const pendingDeletion = ref(null)
const pendingItemEdition = ref(null)

const creationActions = [
  { kind: 'release', label: 'Nuevo release', icon: '/new-release.png' },
  { kind: 'feature', label: 'Nuevo feature', icon: '/new-feature.png' },
  { kind: 'environment', label: 'Nuevo ambiente', icon: '/environment.png' },
  { kind: 'hotfix', label: 'Nuevo hotfix', icon: '/hotfix.png' }
]

const itemTypeLabels = {
  feature: 'Feature',
  fix: 'Fix',
  hotfix: 'Hotfix'
}

const itemAreaPalettes = {
  web: {
    background: '#2563EB',
    secondary: '#1E3A8A',
    accent: '#1D4ED8'
  },
  api: {
    background: '#475569',
    secondary: '#334155',
    accent: '#334155'
  },
  mobile: {
    background: '#0F766E',
    secondary: '#134E4A',
    accent: '#115E59'
  }
}

const withHexAlpha = (hex, alpha) => {
  if (typeof hex !== 'string' || !hex.startsWith('#')) {
    return hex
  }

  let normalizedHex = hex.slice(1)
  if (normalizedHex.length === 3) {
    normalizedHex = normalizedHex.split('').map(character => `${character}${character}`).join('')
  }

  if (normalizedHex.length !== 6) {
    return hex
  }

  const normalizedAlpha = Math.round(Math.min(Math.max(alpha, 0), 1) * 255)
  const alphaHex = normalizedAlpha.toString(16).padStart(2, '0').toUpperCase()

  return `#${normalizedHex}${alphaHex}`
}

const itemAreas = Object.keys(itemAreaPalettes)
const relativeTimeFormatter = new Intl.RelativeTimeFormat('es-ES', { numeric: 'auto' })

const boardEnvironments = computed(() => {
  return sortedEnvironments.value.filter(environment => !isPoolEnvironment(environment))
})

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

const isDeleteModalOpen = computed(() => {
  return Boolean(pendingDeletion.value)
})

const isItemEditionSubmitDisabled = computed(() => {
  if (isBusy.value || !pendingItemEdition.value) {
    return true
  }

  const trimmedTitle = pendingItemEdition.value.title.trim()
  return !trimmedTitle || trimmedTitle === pendingItemEdition.value.originalTitle
})

const deleteModalTitle = computed(() => {
  if (pendingDeletion.value?.type === 'release') {
    return 'Eliminar release'
  }

  return 'Eliminar item'
})

const deleteModalCopy = computed(() => {
  if (pendingDeletion.value?.type === 'release') {
    return 'Esta acción eliminará el release y también todos los items que tiene asociados. No se puede deshacer.'
  }

  return 'Esta acción eliminará el item de forma permanente y limpiará cualquier despliegue asociado. No se puede deshacer.'
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

watch(() => pendingItemEdition.value?.id, async itemId => {
  if (!itemId) {
    return
  }

  await focusInput(itemEditionInput)
})

watch(() => props.isEditMode, isEditMode => {
  if (!isEditMode) {
    closeItemEdition()
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

const getItemTypeLabel = item => {
  return itemTypeLabels[item?.type] ?? 'Item'
}

const getItemMetaLabel = (item, dateValue = null) => {
  const timestamp = dateValue || getItemCreatedAt(item)
  return `${getItemTypeLabel(item)} · ${formatRelativeTime(timestamp)}`
}

const isAreaSelected = (item, area) => {
  return Array.isArray(item?.areas) && item.areas.includes(area)
}

const getAreaTagStyle = (area, isActive) => {
  const palette = itemAreaPalettes[area]
  if (!palette) {
    return {}
  }

  if (isActive) {
    return {
      background: withHexAlpha(palette.background, 0.16),
      color: area === 'mobile' ? palette.secondary : palette.accent,
      borderColor: withHexAlpha(palette.background, 0.32),
      opacity: 0.9
    }
  }

  return {
    background: 'rgba(255, 255, 255, 0.92)',
    color: 'rgba(71, 85, 105, 0.92)',
    borderColor: 'rgba(203, 213, 225, 0.96)',
    opacity: 1
  }
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

const closeCreateMenu = () => {
  isCreateMenuOpen.value = false
}

const toggleCreateMenu = () => {
  if (!ensureInteractive()) {
    return
  }

  pendingDeletion.value = null
  closeItemEdition()
  isCreateMenuOpen.value = !isCreateMenuOpen.value
}

const selectCreationAction = modalKind => {
  closeCreateMenu()
  openCreationModal(modalKind)
}

const openCreationModal = modalKind => {
  if (!ensureInteractive()) {
    return
  }

  closeCreateMenu()
  closeItemEdition()

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

const togglePoolTray = () => {
  if (!ensureInteractive()) {
    return
  }

  closeCreateMenu()
  showPoolTray.value = !showPoolTray.value
}

const handleBackdropClick = () => {
  closeCreationModal()
}

const isEditingItem = itemId => {
  return pendingItemEdition.value?.id === itemId
}

const openItemEdition = item => {
  if (!item || !ensureInteractive()) {
    return
  }

  closeCreateMenu()
  pendingDeletion.value = null
  pendingItemEdition.value = {
    id: item.id,
    title: item.title,
    originalTitle: item.title.trim()
  }
}

const closeItemEdition = () => {
  if (isSaving.value) {
    return
  }

  pendingItemEdition.value = null
}

const submitItemEdition = async () => {
  if (!pendingItemEdition.value || !ensureInteractive()) {
    return
  }

  const edition = pendingItemEdition.value
  const trimmedTitle = edition.title.trim()

  if (trimmedTitle === edition.originalTitle) {
    closeItemEdition()
    return
  }

  const result = await renameItem(edition.id, trimmedTitle)
  if (!result.ok) {
    console.warn(result.reason)
    return
  }

  closeItemEdition()
}

const openDeleteConfirmation = (type, id, label) => {
  if (!ensureInteractive()) {
    return
  }

  closeCreateMenu()
  closeItemEdition()

  pendingDeletion.value = {
    type,
    id,
    label
  }
}

const closeDeleteConfirmation = () => {
  if (isSaving.value) {
    return
  }

  pendingDeletion.value = null
}

const handleDeleteBackdropClick = () => {
  closeDeleteConfirmation()
}

const handleConfirmDelete = async () => {
  if (!pendingDeletion.value || !ensureInteractive()) {
    return
  }

  const deletion = pendingDeletion.value
  const result = deletion.type === 'release'
    ? await deleteRelease(deletion.id)
    : await deleteItem(deletion.id)

  if (!result.ok) {
    console.warn(result.reason)
    return
  }

  closeDeleteConfirmation()
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

const getOrderedDeployments = environmentId => {
  return getDeploymentsByEnvironment(environmentId)
}

const clearDragState = () => {
  resetDragVisuals()
  activeEnvironmentDropZoneId.value = ''
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

const shouldCaptureEnvironmentArtifactDrop = (environment, event) => {
  if (!isProductionEnvironment(environment) || draggedEnvironmentId.value) {
    return false
  }

  const payload = resolveDropPayload(event)
  return Boolean(payload?.type && payload?.id)
}

const handleEnvironmentArtifactDragOver = (event, environment) => {
  if (!shouldCaptureEnvironmentArtifactDrop(environment, event)) {
    activeEnvironmentDropZoneId.value = ''
    return
  }

  activeEnvironmentDropZoneId.value = environment.id
  event.preventDefault()
  event.stopPropagation()
}

const handleEnvironmentArtifactDrop = async (event, environment) => {
  if (!shouldCaptureEnvironmentArtifactDrop(environment, event)) {
    return
  }

  event.preventDefault()
  event.stopPropagation()
  await handleDrop(event, environment.id)
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

const handleDocumentPointerDown = event => {
  if (!isCreateMenuOpen.value || !createMenuRef.value) {
    return
  }

  if (!createMenuRef.value.contains(event.target)) {
    closeCreateMenu()
  }
}

const handleDocumentKeydown = event => {
  if (event.key !== 'Escape') {
    return
  }

  if (isDeleteModalOpen.value) {
    closeDeleteConfirmation()
    return
  }

  if (pendingItemEdition.value) {
    closeItemEdition()
    return
  }

  if (activeModal.value) {
    closeCreateMenu()
    closeCreationModal()
    return
  }

  if (isCreateMenuOpen.value) {
    closeCreateMenu()
  }
}

onMounted(async () => {
  const result = await initialize()
  if (!result.ok) {
    console.warn(result.reason)
  }

  document.addEventListener('dragend', handleDocumentDragEnd)
  document.addEventListener('pointerdown', handleDocumentPointerDown)
  document.addEventListener('keydown', handleDocumentKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('dragend', handleDocumentDragEnd)
  document.removeEventListener('pointerdown', handleDocumentPointerDown)
  document.removeEventListener('keydown', handleDocumentKeydown)
})
</script>

<style scoped>
.deployment-dashboard {
  font-family: var(--font-body, 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif);
  margin: 0;
  padding: 20px 24px 28px;
  background: var(--surface-canvas, #f6f7f4);
  min-height: calc(100vh - 64px);
  width: 100%;
  box-sizing: border-box;
}

.dashboard-state-panel {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 14px;
  padding: 32px;
  border-radius: var(--radius-lg, 24px);
  border: 1px solid var(--border-subtle, #e2e8f0);
  background: var(--surface-panel, #ffffff);
}

.dashboard-state-title {
  margin: 0;
  color: var(--text-strong, #0f172a);
  font-size: var(--type-title, 1.25rem);
  font-weight: 600;
}

.dashboard-state-copy {
  margin: 0;
  color: var(--text-secondary, #475569);
}

.state-action-btn {
  border: none;
  border-radius: 999px;
  padding: 10px 18px;
  background: var(--accent, #15803d);
  color: #ffffff;
  cursor: pointer;
  font-weight: 600;
}

.error-state {
  border-color: rgba(185, 28, 28, 0.18);
}

.dashboard-container {
  display: block;
  min-height: calc(100vh - 150px);
  width: 100%;
}

.board-shell {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 28px;
  border-radius: var(--radius-lg, 24px);
  background: var(--surface-panel, #ffffff);
  border: 1px solid var(--border-subtle, #e2e8f0);
}

.board-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-subtle, #e2e8f0);
}

.board-intro {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 680px;
}

.board-kicker {
  margin: 0;
  color: var(--text-muted, #64748b);
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.board-title {
  margin: 0;
  color: var(--text-strong, #0f172a);
  font-size: var(--type-title, 1.9rem);
  font-weight: 600;
  line-height: 1.1;
}

.board-copy {
  margin: 0;
  color: var(--text-secondary, #475569);
  font-size: var(--type-body, 1.0625rem);
  line-height: 1.5;
}

.board-toolbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.create-menu {
  position: relative;
}

.board-primary-action,
.board-secondary-action {
  min-height: 48px;
  border-radius: 999px;
  padding: 0 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-strong, #cbd5e1);
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.board-primary-action {
  background: var(--accent, #15803d);
  border-color: var(--accent, #15803d);
  color: #ffffff;
}

.board-primary-action:hover:not(:disabled),
.board-primary-action.active {
  background: var(--accent-strong, #166534);
  border-color: var(--accent-strong, #166534);
}

.board-secondary-action {
  background: var(--surface-panel, #ffffff);
  color: var(--text-secondary, #475569);
}

.board-secondary-action:hover:not(:disabled) {
  border-color: var(--text-secondary, #475569);
  color: var(--text-primary, #1e293b);
}

.board-primary-action:disabled,
.board-secondary-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.create-menu-panel {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  min-width: 240px;
  padding: 10px;
  border-radius: var(--radius-md, 18px);
  border: 1px solid var(--border-subtle, #e2e8f0);
  background: var(--surface-panel, #ffffff);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 10;
}

.create-menu-item {
  width: 100%;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm, 12px);
  padding: 12px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-primary, #1e293b);
  font-size: 0.95rem;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
}

.create-menu-item:hover:not(:disabled) {
  background: var(--surface-subtle, #f8fafc);
}

.create-menu-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.create-menu-icon {
  width: 18px;
  height: 18px;
  object-fit: contain;
}

.create-menu-label {
  line-height: 1.3;
}

.environment-column {
  display: flex;
  flex-direction: column;
  background: var(--surface-panel, #ffffff);
  border: 1px solid var(--border-subtle, #e2e8f0);
  border-radius: var(--radius-lg, 24px);
}

.pool-tray {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 22px 22px;
  overflow: hidden;
  border-radius: var(--radius-md, 18px);
  background: var(--surface-subtle, #f8fafc);
  border: 1px solid var(--border-subtle, #e2e8f0);
}

.pool-tray-visibility-enter-active,
.pool-tray-visibility-leave-active {
  overflow: hidden;
  transition: opacity 0.24s ease, transform 0.24s ease, max-height 0.3s ease, margin 0.3s ease, padding 0.3s ease;
  transform-origin: top center;
}

.pool-tray-visibility-enter-to,
.pool-tray-visibility-leave-from {
  max-height: 540px;
}

.pool-tray-visibility-enter-from,
.pool-tray-visibility-leave-to {
  opacity: 0;
  transform: translateY(-10px) scaleY(0.985);
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.pool-tray-header {
  display: flex;
  align-items: baseline;
  justify-content: flex-start;
  gap: 14px;
}

.pool-tray-title {
  margin: 0;
  color: var(--text-strong, #0f172a);
  font-size: 1.6rem;
  font-weight: 600;
  line-height: 1.1;
}

.pool-tray-copy {
  margin: 0;
  color: var(--text-secondary, #475569);
  font-size: 1rem;
  max-width: 620px;
}

.pool-tray-body {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.9fr);
  gap: 16px;
}

.pool-tray-body.has-two-groups .pool-items-section {
  padding-left: 16px;
  border-left: 1px solid var(--border-subtle, #e2e8f0);
}

.pool-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.pool-release-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 12px;
}

.pool-item-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 12px;
}

.pool-release-card {
  padding: 10px;
  min-height: 132px;
  background: rgba(255, 255, 255, 0.88);
}

.pool-release-items {
  gap: 8px;
}

.pool-item-card {
  min-height: 98px;
  background: rgba(255, 255, 255, 0.78);
}

.empty-inline-copy {
  margin: 0;
  border: 1px solid var(--border-subtle, #e2e8f0);
  border-radius: var(--radius-sm, 12px);
  padding: 16px 18px;
  color: var(--text-secondary, #475569);
  font-size: 0.95rem;
  font-weight: 500;
  background: var(--surface-subtle, #f8fafc);
}

.environment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 20px;
  align-items: start;
}

.environment-panel {
  min-width: 0;
  min-height: 320px;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.environment-column.is-production {
  border-color: var(--border-strong, #cbd5e1);
}

.environment-column.is-production.is-artifact-drop-over {
  border-color: var(--accent, #15803d);
  background: rgba(220, 252, 231, 0.32);
}

.environment-column.is-production.is-artifact-drop-over .environment-header {
  background: rgba(220, 252, 231, 0.5);
  border-bottom-color: rgba(21, 128, 61, 0.16);
}

.environment-column.is-production.is-artifact-drop-over .environment-title {
  color: var(--text-strong, #0f172a);
}

.environment-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 22px 20px 18px;
  border-bottom: 1px solid var(--border-subtle, #e2e8f0);
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
  background: var(--surface-subtle, #f8fafc);
  border-bottom-color: var(--border-strong, #cbd5e1);
}

.environment-title-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.environment-title {
  margin: 0;
  color: var(--text-strong, #0f172a);
  font-size: 1.8rem;
  font-weight: 600;
  font-family: var(--font-body, 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif);
  line-height: 1.05;
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
  padding: 20px;
}

.environment-panel-content {
  min-height: 250px;
}

.empty-column-copy {
  margin: 0;
  border: 1px dashed var(--border-subtle, #e2e8f0);
  border-radius: var(--radius-md, 18px);
  padding: 20px;
  color: var(--text-muted, #475569);
  font-size: 0.95rem;
  font-weight: 300;
  text-align: center;
  background: var(--surface-subtle, #f8fafc);
}

.release-card,
.deployed-release {
  border: 1px solid var(--border-subtle, #e2e8f0);
  border-radius: var(--radius-md, 18px);
  padding: 16px;
  background: var(--surface-panel, #ffffff);
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.release-card:hover,
.deployed-release:hover {
  border-color: var(--border-strong, #cbd5e1);
}

.release-card.drag-over,
.deployed-release.drag-over {
  border-width: 2px;
  border-color: var(--text-secondary, #475569);
}

.release-header {
  cursor: grab;
  display: flex;
  align-items: center;
  gap: 10px;
}

.release-header h4,
.deployment-header h4 {
  margin: 0;
  color: var(--text-strong, #0f172a);
  font-size: 1rem;
  font-weight: 600;
}

.release-description {
  margin: 6px 0 0;
  color: var(--text-muted, #64748b);
  font-size: var(--type-meta, 0.875rem);
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
  background: var(--surface-panel, #ffffff);
  border: 1px solid var(--border-subtle, #e2e8f0);
  border-radius: 16px;
  padding: 14px;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.item-card::before,
.deployed-item::before,
.deployed-item-detail::before {
  display: none;
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
  border-color: var(--border-strong, #cbd5e1);
}

.item-card,
.deployed-item {
  cursor: grab;
}

.item-feature {
  border-color: var(--border-subtle, #e2e8f0);
}

.item-fix {
  border-color: var(--border-subtle, #e2e8f0);
}

.item-hotfix {
  border-color: rgba(185, 28, 28, 0.18);
  background: rgba(254, 242, 242, 0.72);
}

.item-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.compact-item-header-row {
  margin-bottom: 6px;
}

.item-header-row .item-title {
  flex: 1;
  margin: 0;
}

.item-header-main,
.release-title-line {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.item-header-main.is-inline-editing {
  display: block;
}

.entity-inline-actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 4px;
  opacity: 0.78;
}

.entity-icon-btn {
  width: 22px;
  height: 22px;
  border: 1px solid var(--border-subtle, #e2e8f0);
  border-radius: 6px;
  background: var(--surface-panel, #ffffff);
  color: var(--text-muted, #64748b);
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

.entity-icon-btn svg {
  width: 13px;
  height: 13px;
}

.entity-icon-btn:hover:not(:disabled) {
  background: var(--surface-subtle, #f8fafc);
  border-color: var(--border-strong, #cbd5e1);
  color: var(--text-primary, #1e293b);
}

.entity-icon-btn:disabled {
  opacity: 0.48;
  cursor: not-allowed;
}

.entity-icon-btn-delete {
  border-color: rgba(185, 28, 28, 0.18);
  background: rgba(254, 242, 242, 0.72);
  color: var(--danger, #b91c1c);
}

.entity-icon-btn-delete:hover:not(:disabled) {
  background: var(--danger-soft, #fee2e2);
  color: #991b1b;
}

.inline-edit-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.inline-edit-input {
  padding: 10px 12px;
  border-radius: 12px;
  font-size: 0.9rem;
}

.inline-edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.inline-edit-btn {
  padding: 8px 12px;
  font-size: 0.74rem;
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
  background: var(--surface-subtle, #f8fafc);
  color: var(--text-primary, #1e293b);
}

.item-detach-icon {
  width: 14px;
  height: 14px;
  display: block;
}

.item-title,
.deployed-item-title {
  font-weight: 600;
  color: var(--text-strong, #0f172a);
  font-size: 1rem;
  line-height: 1.4;
  margin: 0 0 10px;
  overflow-wrap: anywhere;
}

.item-description {
  color: var(--text-secondary, #475569);
  font-size: 0.9rem;
  margin: 0 0 10px;
  line-height: 1.45;
}

.item-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.compact-item-footer {
  gap: 8px;
}

.item-area-group {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.item-area-tag {
  border: 1px solid var(--border-subtle, #e2e8f0);
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 5px 10px;
  text-transform: lowercase;
  letter-spacing: 0.01em;
  transition: border-color 0.2s ease, background-color 0.2s ease, color 0.2s ease;
}

.item-area-tag:hover {
  border-color: var(--border-strong, #cbd5e1);
}

.deployment-date {
  font-size: 0.9rem;
  color: var(--text-muted, #64748b);
  white-space: nowrap;
}

.deployment-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.environment-release-card {
  min-height: 132px;
}

.compact-deployed-item {
  min-height: 96px;
}

.creation-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.28);
}

.creation-modal {
  width: min(540px, 100%);
  border-radius: var(--radius-lg, 24px);
  background: var(--surface-panel, #ffffff);
  border: 1px solid var(--border-subtle, #e2e8f0);
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.12);
  padding: 28px;
}

.creation-modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.creation-modal-kicker {
  margin: 0 0 8px;
  color: var(--text-muted, #64748b);
  font-size: var(--type-micro, 0.75rem);
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.creation-modal-title {
  margin: 0;
  color: var(--text-strong, #0f172a);
  font-size: 1.625rem;
  font-weight: 600;
  line-height: 1.15;
}

.modal-close-btn {
  border: 1px solid var(--border-subtle, #e2e8f0);
  background: var(--surface-subtle, #f8fafc);
  color: var(--text-secondary, #475569);
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
  gap: 14px;
}

.field-label {
  color: var(--text-secondary, #475569);
  font-size: 0.95rem;
  font-weight: 600;
}

.text-input {
  width: 100%;
  border: 1px solid var(--border-strong, #cbd5e1);
  border-radius: 16px;
  padding: 15px 16px;
  font-size: 1.02rem;
  color: var(--text-strong, #0f172a);
  background: var(--surface-panel, #ffffff);
  outline: none;
  transition: border-color 0.2s ease, background-color 0.2s ease;
  box-sizing: border-box;
}

.text-input:focus {
  border-color: var(--accent, #15803d);
  background: #ffffff;
}

.text-input.error {
  border-color: var(--danger, #b91c1c);
}

.error-message {
  color: var(--danger, #b91c1c);
  font-size: 0.9rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
}

.primary-btn,
.secondary-btn,
.danger-btn {
  border: none;
  border-radius: 999px;
  min-height: 44px;
  padding: 0 18px;
  font-weight: 600;
  cursor: pointer;
}

.primary-btn {
  background: var(--accent, #15803d);
  color: #ffffff;
}

.secondary-btn {
  background: var(--surface-muted, #f1f5f9);
  color: var(--text-primary, #1e293b);
  border: 1px solid var(--border-subtle, #e2e8f0);
}

.danger-btn {
  background: var(--danger, #b91c1c);
  color: #ffffff;
}

.primary-btn:disabled,
.secondary-btn:disabled,
.danger-btn:disabled,
.modal-close-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.delete-confirmation-modal {
  width: min(460px, 100%);
}

.delete-modal-kicker {
  color: var(--danger, #b91c1c);
}

.delete-confirmation-copy {
  margin: 0;
  color: var(--text-secondary, #475569);
  font-size: 0.94rem;
  line-height: 1.6;
}

.delete-confirmation-name {
  display: block;
  margin-top: 10px;
  color: #0f172a;
  font-size: 1rem;
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

@media (max-width: 1350px) {
  .board-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .board-toolbar-actions {
    justify-content: flex-start;
  }

  .environment-title {
    font-size: 1.65rem;
  }

  .pool-tray-body {
    grid-template-columns: 1fr;
  }

  .pool-tray-body.has-two-groups .pool-items-section {
    padding-left: 0;
    padding-top: 14px;
    border-left: none;
    border-top: 1px solid var(--border-subtle, #e2e8f0);
  }

  .environment-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 920px) {
  .deployment-dashboard {
    padding: 16px;
  }

  .board-shell {
    padding: 22px;
  }

  .board-title {
    font-size: 1.6rem;
  }

  .board-copy {
    font-size: 0.95rem;
  }

  .board-toolbar-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .create-menu,
  .board-primary-action,
  .board-secondary-action {
    width: 100%;
  }

  .create-menu-panel {
    left: 0;
    right: auto;
  }

  .environment-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .creation-modal-backdrop {
    padding: 16px;
  }

  .creation-modal {
    padding: 20px;
  }

  .pool-tray {
    padding: 18px;
  }

  .environment-title {
    font-size: 1.45rem;
  }
}
</style>
