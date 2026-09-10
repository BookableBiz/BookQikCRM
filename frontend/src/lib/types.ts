export interface CrmStaff {
  id: number
  name: string
  email: string
  role: string
}

// Mapped access levels returned by /crm/v1/login (see backend CrmAuthService::ACCESS_LEVELS):
// admin -> 'super_admin', manager -> 'admin', sales -> 'sales'.
export function canManageLeads(staff: CrmStaff | null): boolean {
  return staff?.role !== 'sales'
}

export function isAdmin(staff: CrmStaff | null): boolean {
  return staff?.role === 'super_admin'
}

export type CrmRole = 'admin' | 'manager' | 'sales'

export const CRM_ROLES: { value: CrmRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'sales', label: 'Sales' },
]

export interface CrmStaffMember {
  id: number
  name: string
  email: string
  role: string
  status?: number
}

export interface Paginated<T> {
  data: T[]
  total: number
  current_page: number
  per_page: number
  last_page: number
}

export type LeadSource = 'justdial' | 'google_my_business' | 'direct_visit' | 'meta_ads' | 'google_ads' | 'other'

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'

export const LEAD_STATUSES: { value: LeadStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'converted', label: 'Converted' },
  { value: 'lost', label: 'Lost' },
]

export const LEAD_SOURCES: { value: LeadSource; label: string }[] = [
  { value: 'justdial', label: 'JustDial' },
  { value: 'google_my_business', label: 'Google My Business' },
  { value: 'direct_visit', label: 'Direct Visit' },
  { value: 'meta_ads', label: 'Meta Ads' },
  { value: 'google_ads', label: 'Google Ads' },
  { value: 'other', label: 'Other' },
]

export interface LeadNoteEntry {
  content: string
  added_by: number
  added_at: string
}

export interface LeadVisitEntry {
  visited_by: number
  visited_at: string
  notes: string | null
}

export interface Lead {
  id: number
  name: string
  email: string | null
  phone: string
  business_name: string | null
  category_id: number | null
  city: string
  address: string | null
  source: LeadSource
  source_detail: string | null
  status: LeadStatus
  assigned_to: number | null
  created_by: number | null
  converted_vendor_id: number | null
  notes: LeadNoteEntry[]
  visits: LeadVisitEntry[]
  tasks?: LeadTask[]
  created_at: string
}

export interface LeadImportRowIssue {
  row: number
  reason: string
}

export interface LeadImportResult {
  imported: number
  skipped: LeadImportRowIssue[]
  errors: LeadImportRowIssue[]
}

export interface LeadTask {
  id: number
  vendor_lead_id: number
  lead?: { id: number; name: string }
  task_type: string
  due_date: string
  assigned_to: number | null
  status: number
}

export interface VendorCategory {
  id: number
  name: string
}

export interface Vendor {
  id: number
  name: string
  email: string
  phone: string | null
  status: number
  business_name: string | null
  category: string | null
  category_id: number | null
  plan_name: string | null
  created_at: string
}

export interface VendorMonthCount {
  month: string
  count: number
}

export interface VendorCategoryCount {
  category_id: number
  category: string
  count: number
}

export interface VendorSummary {
  total: number
  active: number
  this_month: number
  by_month: VendorMonthCount[]
  by_category: VendorCategoryCount[]
}

export type AssetCampaignBucket = 'not_started' | 'in_progress' | 'approved'

export type AssetType = 'qr' | 'decal_door' | 'welcome_desk_poster' | 'large_poster'

export interface VendorAssetsCampaignRow {
  id: number
  name: string
  business_name: string | null
  pincode: string | null
  assets: Record<AssetType, boolean>
  approved: boolean
  approved_by: string | null
  approved_at: string | null
  audit_note: string | null
}

export interface AssetsCampaignSummary {
  vendor_count: number
  placed_total: number
  placed_possible: number
  approved_count: number
  flagged_count: number
  buckets: Record<AssetCampaignBucket, number>
}
