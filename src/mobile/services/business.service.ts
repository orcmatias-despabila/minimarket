import type { User } from '@supabase/supabase-js'
import type {
  BusinessInvitation,
  BusinessMembership,
  BusinessPermissionKey,
  BusinessTenant,
  UserRole,
} from '../../types/domain'
import { supabaseClient } from '../../../lib/supabase'
import type {
  BusinessMemberRecord,
  BusinessRecord,
  InvitationRecord,
} from '../types/supabase'

const businessesTableName =
  process.env.EXPO_PUBLIC_SUPABASE_BUSINESSES_TABLE ?? 'businesses'
const businessMembersTableName =
  process.env.EXPO_PUBLIC_SUPABASE_BUSINESS_MEMBERS_TABLE ?? 'business_members'
const legacyBusinessMembersTableName =
  process.env.EXPO_PUBLIC_SUPABASE_BUSINESS_MEMBERSHIPS_TABLE ?? 'business_memberships'
const businessInvitationsTableName =
  process.env.EXPO_PUBLIC_SUPABASE_BUSINESS_INVITATIONS_TABLE ?? 'business_invitations'

export interface WorkspaceSnapshot {
  business: BusinessTenant
  membership: BusinessMembership | null
}

export interface BusinessMembersSnapshot {
  members: BusinessMembership[]
  invitations: BusinessInvitation[]
}

export interface CreateBusinessInput {
  name: string
  legalName?: string
  owner: Pick<User, 'id'>
}

export interface CreateBusinessInvitationInput {
  businessId: string
  email: string
  fullName?: string
  role: UserRole
  invitedByUserId: string
}

export interface AcceptInvitationInput {
  invitationId: string
  user: Pick<User, 'id' | 'email'>
}

export interface UpdateMembershipAccessInput {
  businessId: string
  membershipId: string
  role: UserRole
  permissions?: BusinessPermissionKey[] | null
}

const ensureClient = () => {
  if (!supabaseClient) {
    throw new Error('Configura Supabase para habilitar negocios.')
  }

  return supabaseClient
}

const isMissingRelationError = (message: string) =>
  message.includes('relation') || message.includes('column') || message.includes('schema cache')

const normalizePermissions = (
  permissions?: BusinessMemberRecord['permissions'],
): BusinessPermissionKey[] | undefined => {
  if (!permissions) return undefined
  if (Array.isArray(permissions)) {
    return permissions as BusinessPermissionKey[]
  }

  return Object.entries(permissions)
    .filter(([, value]) => Boolean(value))
    .map(([key]) => key as BusinessPermissionKey)
}

const toBusiness = (record: BusinessRecord): BusinessTenant => ({
  id: record.id,
  name: record.name,
  legalName: record.legal_name ?? undefined,
  ownerUserId: record.owner_user_id ?? undefined,
  isCloudSyncEnabled: true,
})

const toMembership = (record: BusinessMemberRecord): BusinessMembership => ({
  id: record.id,
  businessId: record.business_id,
  userId: record.profile_id ?? record.user_id ?? '',
  role: record.role,
  permissions: normalizePermissions(record.permissions),
  visibleCode: record.visible_code ?? undefined,
  joinedAt: record.created_at ?? undefined,
})

const toInvitation = (record: InvitationRecord): BusinessInvitation => {
  const nestedBusiness = Array.isArray(record.businesses)
    ? record.businesses[0]
    : record.businesses

  return {
    id: record.id,
    businessId: record.business_id,
    businessName: nestedBusiness?.name,
    email: record.email,
    fullName: record.full_name ?? undefined,
    role: record.role,
    status: record.status,
    invitedByUserId: record.invited_by_user_id,
    acceptedByUserId: record.accepted_by_user_id ?? undefined,
    invitationToken: record.invitation_token ?? undefined,
    createdAt: record.created_at,
    acceptedAt: record.accepted_at ?? undefined,
  }
}

const buildOwnerMembership = (business: BusinessRecord): BusinessMembership | null => {
  if (!business.owner_user_id) return null

  return {
    id: `owner-${business.id}`,
    businessId: business.id,
    userId: business.owner_user_id,
    role: 'owner',
    visibleCode: 'OWN-001',
  }
}

const roleCodePrefix: Record<UserRole, string> = {
  owner: 'OWN',
  admin: 'ADM',
  cashier: 'CAJ',
  inventory: 'INV',
}

const buildVisibleCode = (role: UserRole, sequence: number) =>
  `${roleCodePrefix[role]}-${String(sequence).padStart(3, '0')}`

const getBusinessMembersTableNames = () => [
  businessMembersTableName,
  legacyBusinessMembersTableName,
]

const loadBusinessByOwner = async (userId: string): Promise<BusinessRecord | null> => {
  const client = ensureClient()
  const result = await client
    .from(businessesTableName)
    .select('id, name, legal_name, owner_user_id')
    .eq('owner_user_id', userId)
    .limit(1)
    .maybeSingle<BusinessRecord>()

  if (result.error) {
    throw new Error(`No pudimos consultar el negocio: ${result.error.message}`)
  }

  return result.data ?? null
}

const loadMembershipByUser = async (userId: string) => {
  const client = ensureClient()

  for (const tableName of getBusinessMembersTableNames()) {
    const profileColumn = tableName === businessMembersTableName ? 'profile_id' : 'user_id'
    const result = await client
      .from(tableName)
      .select(
        `id, business_id, ${profileColumn}, role, permissions, visible_code, created_at, businesses:business_id ( id, name, legal_name, owner_user_id )`,
      )
      .eq(profileColumn, userId)
      .limit(1)
      .maybeSingle<BusinessMemberRecord & { businesses: BusinessRecord | BusinessRecord[] | null }>()

    if (!result.error && result.data) {
      return { tableName, profileColumn, data: result.data }
    }

    if (result.error && !isMissingRelationError(result.error.message)) {
      throw new Error(`No pudimos consultar el negocio: ${result.error.message}`)
    }
  }

  return null
}

const listMembersFromTable = async (
  businessId: string,
  tableName: string,
): Promise<BusinessMembership[]> => {
  const client = ensureClient()
  const profileColumn = tableName === businessMembersTableName ? 'profile_id' : 'user_id'
  const result = await client
    .from(tableName)
    .select(`id, business_id, ${profileColumn}, role, permissions, visible_code, created_at`)
    .eq('business_id', businessId)
    .order('created_at', { ascending: true })

  if (result.error) {
    throw new Error(`No pudimos consultar los miembros: ${result.error.message}`)
  }

  return (result.data ?? []).map((item) => toMembership(item as BusinessMemberRecord))
}

const getWorkingBusinessMembersTable = async (businessId?: string) => {
  const client = ensureClient()
  for (const tableName of getBusinessMembersTableNames()) {
    const probe = client.from(tableName).select('id').limit(1)
    if (businessId) probe.eq('business_id', businessId)
    const result = await probe
    if (!result.error || !isMissingRelationError(result.error.message)) {
      if (!result.error) {
        return tableName
      }
      throw new Error(`No pudimos consultar miembros: ${result.error.message}`)
    }
  }

  return legacyBusinessMembersTableName
}

const generateMembershipVisibleCode = async (
  businessId: string,
  role: UserRole,
): Promise<string> => {
  const client = ensureClient()
  const tableName = await getWorkingBusinessMembersTable(businessId)
  const result = await client
    .from(tableName)
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('role', role)

  if (result.error) {
    throw new Error(`No pudimos generar el codigo visible: ${result.error.message}`)
  }

  return buildVisibleCode(role, (result.count ?? 0) + 1)
}

export const businessService = {
  async getUserWorkspace(userId: string): Promise<WorkspaceSnapshot | null> {
    const membershipResult = await loadMembershipByUser(userId)

    if (membershipResult?.data) {
      const nestedBusiness = Array.isArray(membershipResult.data.businesses)
        ? membershipResult.data.businesses[0]
        : membershipResult.data.businesses

      if (nestedBusiness) {
        return {
          business: toBusiness(nestedBusiness),
          membership: toMembership(membershipResult.data),
        }
      }
    }

    const ownerBusiness = await loadBusinessByOwner(userId)
    if (!ownerBusiness) return null

    return {
      business: toBusiness(ownerBusiness),
      membership: buildOwnerMembership(ownerBusiness),
    }
  },

  async createBusinessForOwner(input: CreateBusinessInput): Promise<WorkspaceSnapshot> {
    const client = ensureClient()

    const { data: business, error } = await client
      .from(businessesTableName)
      .insert({
        name: input.name.trim(),
        legal_name: input.legalName?.trim() || null,
        owner_user_id: input.owner.id,
      })
      .select('id, name, legal_name, owner_user_id')
      .single<BusinessRecord>()

    if (error) {
      throw new Error(`No pudimos crear el negocio: ${error.message}`)
    }

    const tableName = await getWorkingBusinessMembersTable(business.id)
    const profileColumn = tableName === businessMembersTableName ? 'profile_id' : 'user_id'
    const membershipInsert = await client
      .from(tableName)
      .insert({
        business_id: business.id,
        [profileColumn]: input.owner.id,
        role: 'owner',
        visible_code: 'OWN-001',
      })
      .select(`id, business_id, ${profileColumn}, role, permissions, visible_code, created_at`)
      .single<BusinessMemberRecord>()

    if (membershipInsert.error && !isMissingRelationError(membershipInsert.error.message)) {
      throw new Error(
        `No pudimos asociar el usuario al negocio: ${membershipInsert.error.message}`,
      )
    }

    return {
      business: toBusiness(business),
      membership: membershipInsert.data ? toMembership(membershipInsert.data) : null,
    }
  },

  async listBusinessMembers(businessId: string): Promise<BusinessMembersSnapshot> {
    const client = ensureClient()
    const tableName = await getWorkingBusinessMembersTable(businessId)
    const members = await listMembersFromTable(businessId, tableName)

    const invitationsResult = await client
      .from(businessInvitationsTableName)
      .select(
        'id, business_id, email, full_name, role, status, invitation_token, invited_by_user_id, accepted_by_user_id, created_at, accepted_at, businesses:business_id ( id, name )',
      )
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })

    if (invitationsResult.error && !isMissingRelationError(invitationsResult.error.message)) {
      throw new Error(
        `No pudimos consultar las invitaciones: ${invitationsResult.error.message}`,
      )
    }

    const ownerBusiness = await client
      .from(businessesTableName)
      .select('id, name, legal_name, owner_user_id')
      .eq('id', businessId)
      .maybeSingle<BusinessRecord>()

    if (ownerBusiness.error && !isMissingRelationError(ownerBusiness.error.message)) {
      throw new Error(`No pudimos consultar el owner del negocio: ${ownerBusiness.error.message}`)
    }

    const ownerMembership = ownerBusiness.data ? buildOwnerMembership(ownerBusiness.data) : null
    const normalizedMembers =
      ownerMembership && !members.some((item) => item.userId === ownerMembership.userId)
        ? [ownerMembership, ...members]
        : members

    return {
      members: normalizedMembers,
      invitations: (invitationsResult.data ?? []).map((item) =>
        toInvitation(item as InvitationRecord),
      ),
    }
  },

  async createInvitation(input: CreateBusinessInvitationInput): Promise<BusinessInvitation> {
    const client = ensureClient()
    const normalizedEmail = input.email.trim().toLowerCase()

    if (!normalizedEmail) {
      throw new Error('Ingresa un correo valido para invitar.')
    }

    const insertResult = await client
      .from(businessInvitationsTableName)
      .insert({
        business_id: input.businessId,
        email: normalizedEmail,
        full_name: input.fullName?.trim() || null,
        role: input.role,
        status: 'pending',
        invited_by_user_id: input.invitedByUserId,
      })
      .select(
        'id, business_id, email, full_name, role, status, invitation_token, invited_by_user_id, accepted_by_user_id, created_at, accepted_at, businesses:business_id ( id, name )',
      )
      .single<InvitationRecord>()

    if (insertResult.error) {
      throw new Error(`No pudimos crear la invitacion: ${insertResult.error.message}`)
    }

    return toInvitation(insertResult.data)
  },

  async listPendingInvitationsByEmail(email: string): Promise<BusinessInvitation[]> {
    const client = ensureClient()
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) return []

    const result = await client
      .from(businessInvitationsTableName)
      .select(
        'id, business_id, email, full_name, role, status, invitation_token, invited_by_user_id, accepted_by_user_id, created_at, accepted_at, businesses:business_id ( id, name )',
      )
      .eq('email', normalizedEmail)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (result.error && !isMissingRelationError(result.error.message)) {
      throw new Error(`No pudimos consultar tus invitaciones: ${result.error.message}`)
    }

    return (result.data ?? []).map((item) => toInvitation(item as InvitationRecord))
  },

  async acceptInvitation(input: AcceptInvitationInput): Promise<WorkspaceSnapshot> {
    const client = ensureClient()
    const invitationResult = await client
      .from(businessInvitationsTableName)
      .select(
        'id, business_id, email, full_name, role, status, invitation_token, invited_by_user_id, accepted_by_user_id, created_at, accepted_at, businesses:business_id ( id, name )',
      )
      .eq('id', input.invitationId)
      .maybeSingle<InvitationRecord>()

    if (invitationResult.error) {
      throw new Error(`No pudimos abrir la invitacion: ${invitationResult.error.message}`)
    }

    const invitation = invitationResult.data
    if (!invitation || invitation.status !== 'pending') {
      throw new Error('Esta invitacion ya no esta disponible.')
    }

    const normalizedInvitationEmail = invitation.email.trim().toLowerCase()
    const normalizedUserEmail = input.user.email?.trim().toLowerCase() ?? ''
    if (!normalizedUserEmail || normalizedInvitationEmail !== normalizedUserEmail) {
      throw new Error('Esta invitacion no corresponde al correo autenticado.')
    }

    const tableName = await getWorkingBusinessMembersTable(invitation.business_id)
    const profileColumn = tableName === businessMembersTableName ? 'profile_id' : 'user_id'
    const nextVisibleCode = await generateMembershipVisibleCode(
      invitation.business_id,
      invitation.role,
    )

    const membershipInsert = await client
      .from(tableName)
      .upsert(
        {
          business_id: invitation.business_id,
          [profileColumn]: input.user.id,
          role: invitation.role,
          permissions: null,
          visible_code: nextVisibleCode,
        },
        { onConflict: `business_id,${profileColumn}` },
      )
      .select(`id, business_id, ${profileColumn}, role, permissions, visible_code, created_at`)
      .single<BusinessMemberRecord>()

    if (membershipInsert.error) {
      throw new Error(`No pudimos unirte al negocio: ${membershipInsert.error.message}`)
    }

    const invitationUpdate = await client
      .from(businessInvitationsTableName)
      .update({
        status: 'accepted',
        accepted_by_user_id: input.user.id,
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invitation.id)

    if (invitationUpdate.error) {
      throw new Error(
        `Te unimos al negocio, pero no pudimos cerrar la invitacion: ${invitationUpdate.error.message}`,
      )
    }

    const businessResult = await client
      .from(businessesTableName)
      .select('id, name, legal_name, owner_user_id')
      .eq('id', invitation.business_id)
      .single<BusinessRecord>()

    if (businessResult.error) {
      throw new Error(`No pudimos cargar el negocio: ${businessResult.error.message}`)
    }

    return {
      business: toBusiness(businessResult.data),
      membership: toMembership(membershipInsert.data),
    }
  },

  async updateMembershipAccess(input: UpdateMembershipAccessInput): Promise<BusinessMembership> {
    const client = ensureClient()
    const tableName = await getWorkingBusinessMembersTable(input.businessId)
    const profileColumn = tableName === businessMembersTableName ? 'profile_id' : 'user_id'

    const currentMembership = await client
      .from(tableName)
      .select(`id, business_id, ${profileColumn}, role, permissions, visible_code, created_at`)
      .eq('id', input.membershipId)
      .eq('business_id', input.businessId)
      .single<BusinessMemberRecord>()

    if (currentMembership.error) {
      throw new Error(`No pudimos cargar la membresia: ${currentMembership.error.message}`)
    }

    const nextVisibleCode =
      !currentMembership.data.visible_code || currentMembership.data.role !== input.role
        ? await generateMembershipVisibleCode(input.businessId, input.role)
        : currentMembership.data.visible_code

    const result = await client
      .from(tableName)
      .update({
        role: input.role,
        permissions: input.permissions ?? null,
        visible_code: nextVisibleCode,
      })
      .eq('id', input.membershipId)
      .eq('business_id', input.businessId)
      .select(`id, business_id, ${profileColumn}, role, permissions, visible_code, created_at`)
      .single<BusinessMemberRecord>()

    if (result.error) {
      throw new Error(`No pudimos actualizar permisos: ${result.error.message}`)
    }

    return toMembership(result.data)
  },
}
