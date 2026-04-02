# Flow Track

Flow Track es una SPA en Vue 3 + Vite para gestionar items, releases y despliegues por ambiente. Ahora carga y persiste el estado completo del tablero directamente en Supabase mediante un snapshot JSON compartido.

## Stack

- Vue 3.5
- Vite 5
- @supabase/supabase-js

## Persistencia

La aplicación usa una tabla única en Supabase para guardar el estado completo del tablero:

- Tabla por defecto: `flow_track_snapshots`
- Scope compartido por defecto: `global/default`
- Estrategia: snapshot JSON completo con `standaloneItems`, `releases`, `environments` y `deployments`

La capa de acceso a datos quedó separada de la UI y del dominio en `src/services/persistence/`.

## Configuración

1. Copia `.env.example` a `.env`.
2. Completa `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
3. Ejecuta el script SQL de `supabase/schema.sql` en tu proyecto Supabase.

Variables disponibles:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_FLOW_TRACK_TABLE` opcional, por defecto `flow_track_snapshots`
- `VITE_FLOW_TRACK_SCOPE_KEY` opcional, por defecto `global/default`

## Desarrollo

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Estructura relevante

- `src/composables/useFlowTrackDomain.js`: orquesta estado reactivo, carga inicial y persistencia por operación.
- `src/domain/flowTrackDomain.js`: reglas puras del dominio.
- `src/services/persistence/flowTrackSnapshotRepository.js`: repositorio del snapshot en Supabase.
- `src/services/persistence/flowTrackSnapshotMapper.js`: serialización, deserialización y clonación del estado.
- `src/services/persistence/supabaseClient.js`: inicialización del cliente Supabase.
- `supabase/schema.sql`: esquema inicial de la tabla de snapshots.

## Alcance actual

- El dashboard sigue siendo compartido por todos los usuarios.
- No hay sincronización en tiempo real.
- No hay autenticación ni RLS todavía.
- Si falta la configuración de Supabase, la app muestra error de inicialización y bloquea las interacciones.
