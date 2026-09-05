import { useApiActivity } from '../lib/api'

export default function GlobalLoadingBar() {
  const isLoading = useApiActivity()

  if (!isLoading) return null

  return (
    <div className="fixed inset-x-0 top-0 z-50 h-1 overflow-hidden bg-transparent" role="status" aria-label="Loading">
      <div className="loading-bar-track h-full w-1/3 rounded-r-full bg-[#2a78d6]" />
    </div>
  )
}
