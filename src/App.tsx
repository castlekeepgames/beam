import { DeviceSetup } from './components/DeviceSetup'
import { Home } from './components/Home'
import { SignIn } from './components/SignIn'
import { CenteredCard, Logo, Page } from './components/ui'
import { useDevice } from './hooks/useDevice'
import { useSession } from './hooks/useSession'
import { configError } from './lib/supabase'

export default function App() {
  if (configError) {
    return (
      <CenteredCard title="Beam isn't configured">
        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">{configError}</p>
      </CenteredCard>
    )
  }
  return <AuthGate />
}

function AuthGate() {
  const { session, loading } = useSession()
  if (loading) return <Splash />
  if (!session) return <SignIn />
  return <DeviceGate key={session.user.id} userId={session.user.id} />
}

function DeviceGate({ userId }: { userId: string }) {
  const { state, register, rename } = useDevice()
  if (state.status === 'loading') return <Splash />
  if (state.status === 'needs-name') return <DeviceSetup onSave={register} />
  return <Home userId={userId} device={state.device} onRename={rename} />
}

function Splash() {
  return (
    <Page>
      <div className="flex flex-1 items-center justify-center">
        <Logo className="h-14 w-14 animate-pulse" />
      </div>
    </Page>
  )
}
