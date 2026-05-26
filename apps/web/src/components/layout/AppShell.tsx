import { useEffect, useState } from 'react'
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'

const navItems = [
  { to: '/', label: 'Dashboard', disabled: false as const },
  { to: '/customers', label: 'Customers', disabled: false as const },
  { to: '/products', label: 'Products', disabled: false as const },
  { to: '/estimates', label: 'Estimates', disabled: false as const },
  { to: '/branding', label: 'Branding', disabled: false as const },
  { to: '/reports', label: 'Reports', disabled: false as const },
  { to: '/settings', label: 'Settings', disabled: true },
] as const

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-0.5 p-3" aria-label="Main">
      {navItems.map((item) =>
        item.disabled ? (
          <span
            key={item.to}
            className="cursor-not-allowed rounded-lg px-3 py-2.5 text-sm text-stone-400"
            title="Coming in a future phase"
          >
            {item.label}
          </span>
        ) : (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              [
                'rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-cherry-100 text-cherry-900 shadow-sm ring-1 ring-cherry-200/60'
                  : 'text-stone-700 hover:bg-stone-200/80 hover:text-stone-900',
              ].join(' ')
            }
          >
            {item.label}
          </NavLink>
        ),
      )}
    </nav>
  )
}

function SidebarFooter({
  profileLabel,
  onSignOut,
}: {
  profileLabel: string | null | undefined
  onSignOut: () => void
}) {
  return (
    <div className="border-t border-stone-200 p-3">
      <p className="truncate px-3 text-xs font-medium text-stone-500">Signed in</p>
      <p className="truncate px-3 text-sm text-stone-800">{profileLabel ?? 'Owner'}</p>
      <button
        type="button"
        onClick={onSignOut}
        className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-2 text-left text-sm font-medium text-stone-700 hover:bg-stone-100"
      >
        Sign out
      </button>
    </div>
  )
}

export function AppShell() {
  const { signOut, profile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  const profileLabel = profile?.display_name

  const sidebarBody = (
    <>
      <div className="border-b border-stone-200 px-4 py-5">
        <Link
          to="/"
          className="text-lg font-semibold tracking-tight text-cherry-800"
          onClick={() => setMobileOpen(false)}
        >
          Cherry
        </Link>
        <p className="mt-1 text-xs text-stone-500">Bakery operations</p>
      </div>
      <SidebarNav onNavigate={() => setMobileOpen(false)} />
      <SidebarFooter profileLabel={profileLabel} onSignOut={() => void handleSignOut()} />
    </>
  )

  return (
    <div className="min-h-screen bg-stone-100 lg:flex">
      {/* Mobile: dim overlay */}
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-stone-900/40 lg:hidden"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-stone-200 bg-white px-3 shadow-sm lg:hidden">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-stone-700 hover:bg-stone-100"
          onClick={() => setMobileOpen((o) => !o)}
          aria-expanded={mobileOpen}
          aria-controls="app-sidebar"
        >
          {mobileOpen ? <CloseIcon /> : <MenuIcon />}
          <span className="sr-only">{mobileOpen ? 'Close menu' : 'Open menu'}</span>
        </button>
        <Link to="/" className="font-semibold text-cherry-800" onClick={() => setMobileOpen(false)}>
          Cherry
        </Link>
      </header>

      {/* Sidebar: drawer on small screens, column on large */}
      <aside
        id="app-sidebar"
        className={[
          'fixed bottom-0 left-0 top-0 z-50 flex w-[min(100vw,16rem)] flex-col border-r border-stone-200 bg-white shadow-xl transition-transform duration-200 ease-out lg:static lg:z-0 lg:min-h-screen lg:w-56 lg:flex-shrink-0 lg:translate-x-0 lg:shadow-none',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
      >
        {/* Padding under fixed mobile header only when sidebar is full overlay */}
        <div className="flex min-h-0 flex-1 flex-col pt-14 lg:pt-0">
          {sidebarBody}
        </div>
      </aside>

      {/* Main workspace */}
      <div className="flex min-h-screen flex-1 flex-col pt-14 lg:pt-0">
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-5xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
