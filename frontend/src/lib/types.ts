export interface CrmStaff {
  id: number
  name: string
  email: string
  role: string
}

export interface Paginated<T> {
  data: T[]
  total: number
  current_page: number
  per_page: number
  last_page: number
}

export interface Lead {
  id: number
  email: string
  role: string
  name: string
  phone: string
  sources: string
  message: string | null
  status: number
  created_at: string
}

export interface LeadTask {
  id: number
  leadname: string
  lead_id: number
  assign: string
  tasktype: string
  duedate: string
  status: number
}

export interface LeadNote {
  id: number
  leadname: string
  lead_id: number
  addedby: string
  content: string
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
