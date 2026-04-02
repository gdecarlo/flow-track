import {
  createEmptyFlowTrackState,
  deserializeFlowTrackState,
  serializeFlowTrackState
} from './flowTrackSnapshotMapper'
import { getSupabaseClient } from './supabaseClient'

const tableName = import.meta.env.VITE_FLOW_TRACK_TABLE?.trim() || 'flow_track_snapshots'
const scopeKey = import.meta.env.VITE_FLOW_TRACK_SCOPE_KEY?.trim() || 'global/default'
const snapshotColumns = 'id, scope_key, state_json, version, updated_at'

const buildMetadata = row => ({
  id: row.id,
  scopeKey: row.scope_key,
  version: row.version ?? 1,
  updatedAt: row.updated_at ? new Date(row.updated_at) : null
})

const buildRepositoryError = error => {
  if (typeof error === 'string') {
    return error
  }

  return error?.message ?? 'No se pudo completar la operación de persistencia en Supabase.'
}

const upsertSnapshot = async (client, state, version) => {
  const payload = {
    scope_key: scopeKey,
    state_json: serializeFlowTrackState(state),
    version,
    updated_at: new Date().toISOString()
  }

  return client
    .from(tableName)
    .upsert(payload, { onConflict: 'scope_key' })
    .select(snapshotColumns)
    .single()
}

export const createFlowTrackSnapshotRepository = () => {
  return {
    async loadSnapshot() {
      const clientResult = getSupabaseClient()
      if (!clientResult.ok) {
        return { ok: false, reason: clientResult.reason }
      }

      const { client } = clientResult
      const { data, error } = await client
        .from(tableName)
        .select(snapshotColumns)
        .eq('scope_key', scopeKey)
        .maybeSingle()

      if (error) {
        return { ok: false, reason: buildRepositoryError(error) }
      }

      if (!data) {
        const bootstrapResult = await upsertSnapshot(client, createEmptyFlowTrackState(), 1)

        if (bootstrapResult.error) {
          return { ok: false, reason: buildRepositoryError(bootstrapResult.error) }
        }

        return {
          ok: true,
          state: deserializeFlowTrackState(bootstrapResult.data.state_json),
          metadata: buildMetadata(bootstrapResult.data)
        }
      }

      return {
        ok: true,
        state: deserializeFlowTrackState(data.state_json),
        metadata: buildMetadata(data)
      }
    },

    async saveSnapshot(state, options = {}) {
      const clientResult = getSupabaseClient()
      if (!clientResult.ok) {
        return { ok: false, reason: clientResult.reason }
      }

      const { client } = clientResult
      const nextVersion = (options.expectedVersion ?? 0) + 1
      const { data, error } = await upsertSnapshot(client, state, nextVersion)

      if (error) {
        return { ok: false, reason: buildRepositoryError(error) }
      }

      return {
        ok: true,
        metadata: buildMetadata(data)
      }
    }
  }
}