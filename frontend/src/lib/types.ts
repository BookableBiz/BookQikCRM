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
