import { RouterProvider } from 'react-router-dom'
import router from './routes/router'
import { AuthProvider } from './lib/auth'
import GlobalLoadingBar from './components/GlobalLoadingBar'

function App() {
  return (
    <AuthProvider>
      <GlobalLoadingBar />
      <RouterProvider router={router} />
    </AuthProvider>
  )
}

export default App
