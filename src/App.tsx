import './index.css'
import { WebAuthProvider } from './web/auth/AuthProvider'
import { WebWorkspaceProvider } from './web/workspace/WorkspaceProvider'
import { WebAppRouter } from './web/WebAppRouter'

function App() {
  return (
    <WebAuthProvider>
      <WebWorkspaceProvider>
        <WebAppRouter />
      </WebWorkspaceProvider>
    </WebAuthProvider>
  )
}

export default App
