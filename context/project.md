# Flow Track

## Resumen

Flow Track es una SPA construida con Vue 3 y Vite para visualizar y mover releases e items entre ambientes de despliegue. La aplicación ahora integra persistencia directa con Supabase mediante un snapshot JSON compartido del tablero.

## Objetivo funcional actual

La interfaz modela un flujo simple de despliegue:

- Un rail lateral minimalista permite crear releases, features, hotfixes y ambientes mediante modales centrados.
- El tablero muestra un carril inicial `Pool` y luego los ambientes de despliegue en formato kanban.
- Los elementos se pueden arrastrar entre zonas para simular despliegues.
- También se pueden crear nuevos items, releases y ambientes desde la UI.

## Stack técnico

- Vue 3.5
- Vite 5
- `@supabase/supabase-js`
- Single File Components con `<script setup>`
- CSS escrito manualmente dentro de los componentes
- Drag and drop implementado con eventos nativos del DOM

## Proyecto Supabase activo

- Proyecto actual de desarrollo: `flowtrack-v2`
- Project ref: `yanputhpfseufpffzejv`
- URL base configurada localmente en `.env`
- `.env` incluye tanto `VITE_SUPABASE_PUBLISHABLE_KEY` como la `VITE_SUPABASE_ANON_KEY` heredada; el cliente prioriza la publishable key.
- La tabla `public.flow_track_snapshots` ya fue creada y bootstrappeada con el scope `global/default`

## Dependencias

- `vue`: framework principal.
- `@supabase/supabase-js`: cliente de persistencia web hacia Supabase.
- `vue-draggable-next`: instalada pero actualmente no se usa en el código.

## Estructura relevante

- `src/main.js`: monta la aplicación Vue.
- `src/App.vue`: layout principal con navbar y carga del dashboard.
- `src/components/Dashboard.vue`: concentra el rail de creación, los modales, el tablero de ambientes y la coordinación de eventos de drag and drop.
- `src/composables/useFlowTrackDomain.js`: expone el estado reactivo del dominio, inicializa el snapshot desde Supabase y persiste cada operación del tablero.
- `src/domain/flowTrackDomain.js`: contiene reglas y utilidades del dominio para releases, items, ambientes y despliegues.
- `src/domain/flowTrackSeed.js`: quedó como referencia histórica, pero ya no participa en el flujo runtime principal.
- `src/services/persistence/flowTrackSnapshotRepository.js`: encapsula carga y guardado del snapshot compartido en Supabase.
- `src/services/persistence/flowTrackSnapshotMapper.js`: serializa, deserializa y clona el estado persistido.
- `src/services/persistence/supabaseClient.js`: centraliza la configuración del cliente Supabase.
- `.env.example`: referencia de variables de entorno para Supabase.
- `supabase/schema.sql`: script SQL para crear la tabla `flow_track_snapshots`.
- `src/style.css`: existe pero no está importado actualmente desde `src/main.js`.
- `index.html`: plantilla base de Vite; todavía conserva el título `Vite + Vue`.

## Estado actual del dominio

La aplicación maneja cuatro conceptos principales persistidos como un único snapshot:

- `Item`: unidad individual de trabajo con `id`, `title`, `description`, `type`, `priority` y `areas` (`front`, `back`, `app`).
- `Release`: agrupación de items con `id`, `name`, `description` e `items`.
- `Environment`: ambiente de despliegue con `id`, `name`, `description`, `order`, `kind` (`pool`, `standard`, `production`) e `isFixed`.
- `Deployment`: relación entre un item o release y un ambiente, con fecha de despliegue, snapshot de items y timestamps por item en releases desplegados (`itemDeploymentTimes`).

## Funcionalidades implementadas

- Visualización de un carril `Pool` al inicio del tablero para artefactos recién creados o devueltos.
- Visualización de ambientes ordenados por la propiedad `order`, con `Pool` al inicio y `Prod` fijo.
- Carga inicial del tablero desde Supabase al montar la UI.
- Persistencia del snapshot completo en Supabase después de cada mutación válida.
- Creación de features y hotfixes desde modales centrados disparados por iconos.
- Creación de releases vacíos desde modal centrado.
- Creación de nuevos ambientes desde modal centrado.
- Reordenamiento de ambientes por drag and drop desde la cabecera, excepto ambientes fijos.
- Drag and drop de items y releases hacia ambientes.
- Drag and drop de items standalone hacia releases.
- Drag and drop de items ya desplegados hacia releases desplegados.
- Generación de eventos de despliegue mediante `console.log`.
- Validación básica para evitar nombres duplicados de releases y ambientes.
- Rollback local si falla un guardado en Supabase.
- Estado explícito de carga, guardado y error de persistencia en el dashboard.
- Tags de alcance técnico por item (`front`, `back`, `app`) con persistencia en Supabase.
- Tiempo relativo en ambientes (`hace X`) y tiempo por item dentro de releases desplegados.
- Los items dentro de un release se pueden desenganchar con un icono `🔓`; si estaban dentro de un release desplegado, pasan a desplegarse como item individual en el mismo ambiente.
- Al desenganchar desde releases no desplegados, el item vuelve a quedar disponible y reaparece en `Pool`.
- Los snapshots viejos se normalizan automáticamente para agregar `Pool` y tipar `Prod` como ambiente fijo de producción.

## Reglas de comportamiento observadas

- Un release desplegado guarda un snapshot de los items disponibles en el momento del despliegue.
- Un item o release solo puede estar desplegado en un ambiente a la vez; al moverlo, se elimina el despliegue anterior.
- Los items desplegados individualmente dejan de aparecer como disponibles en su origen.
- Un item standalone puede incorporarse a un release mediante drag and drop.
- Un item también puede moverse entre releases disponibles mediante drag and drop.
- Un item que ya pertenece a un release no puede agregarse a otro release, salvo cuando se mueve explícitamente hacia un release desplegado, caso en el que se remueve del origen.
- Al incorporar un item a un release disponible, se limpia su despliegue individual activo para que vuelva a verse dentro del release y no quede oculto por filtros de disponibilidad.
- `Pool` y `Prod` son ambientes fijos; no participan del reordenamiento horizontal.
- `Prod` queda marcado como ambiente especial mediante metadata (`kind: production`) y un tratamiento visual sutilmente distinto.

## Limitaciones y deuda técnica visibles

- No hay sincronización en tiempo real ni resolución de conflictos entre múltiples clientes.
- El dashboard sigue siendo compartido; todavía no existe autenticación ni separación por usuario.
- La app depende de `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`; si faltan, bloquea la operación con un error de inicialización.
- La persistencia actual usa snapshot JSON único; todavía no hay tablas normalizadas por entidad ni auditoría detallada.
- Aunque la lógica de dominio fue extraída a módulos dedicados, `Dashboard.vue` todavía mantiene un template grande y estilos locales extensos.
- Los botones de información y edición están renderizados, pero no tienen comportamiento implementado.
- `src/style.css` no participa en el render porque la importación está comentada en `src/main.js`.
- `index.html` sigue con metadatos iniciales de plantilla y no refleja la marca del producto.
- La dependencia `vue-draggable-next` está instalada, pero el tablero usa drag and drop nativo.
- No hay tests, linting ni tipado estático.
- `Nuevo fix` ya no existe en UI; los items `fix` previos siguen cargando por compatibilidad.

## UI actual

- Diseño claro y orientado a dashboard.
- Navbar superior simple con el nombre Flow Track.
- El texto `Último guardado ...` se muestra inline junto al título `Flow Track` en la navbar.
- El texto `Último guardado ...` usa la misma familia tipográfica que los items, manteniendo el tamaño actual.
- Rail lateral vertical con iconos para `Nuevo release`, `Nuevo feature`, `Nuevo ambiente` y `Nuevo hotfix`.
- Modales centrados con overlay para las altas.
- Tablero horizontal de ambientes con `Pool` como primera columna.
- Badges visuales por tipo de item: feature, fix y hotfix.
- Tarjetas de item con estructura visual fija: slot superior para `hotfix`, título con wrap, descripción y footer de chips.
- En items dentro de release, la acción de desenganche usa el SVG `public/lock-unlocked.svg` y queda alineada al extremo derecho del header.
- Contenedores de release con borde gris claro y radio para delimitar grupos con bajo peso visual.
- Los releases disponibles (no desplegados) mantienen el mismo lenguaje visual que los releases en ambientes y no muestran contador de cantidad de items.
- Durante drag sobre releases, el estado de drop target realza solo el borde (sin fondo verde), con trazo más oscuro y más grueso, aplicado sobre toda la superficie del release.
- El flujo de drag/drop entre releases protege contra estado de drag nulo (`dragData`) para evitar errores de consola al mover items entre releases.
- El drag/drop usa payload serializado en `dataTransfer` como respaldo del estado reactivo para evitar pérdidas intermitentes de contexto al soltar sobre releases o ambientes.
- Se eliminó la barra/toast superior del dashboard que mostraba estado de guardado.

## Estado de build verificado

El proyecto compila correctamente con `npm run build` después de integrar la persistencia con Supabase.

## Comandos disponibles

- `npm run dev`: levanta el servidor de desarrollo con Vite.
- `npm run build`: genera el build de producción.
- `npm run preview`: sirve localmente el build generado.

## Lectura rápida para futuras tareas

Si se quiere evolucionar el proyecto, lo más natural sería trabajar en este orden:

- Definir autenticación y RLS cuando el dashboard deje de ser compartido.
- Decidir si la evolución será hacia Realtime o seguirá con guardado por snapshot.
- Dividir `Dashboard.vue` en subcomponentes de presentación para releases, items y columnas de ambiente.
- Implementar acciones reales para editar y ver detalle de items/releases.
- Normalizar estilos globales y metadatos base.
- Agregar pruebas sobre reglas de despliegue y movimiento.

