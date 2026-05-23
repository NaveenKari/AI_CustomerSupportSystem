import { render, screen, waitFor, act } from '@testing-library/react'
import { AuthProvider, useAuth } from '../context/AuthContext'

function Probe() {
  const { user, loading } = useAuth()
  if (loading) return <div>loading</div>
  return <div>{user ? user.email : 'no user'}</div>
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

test('shows loading then user when /me returns 200', async () => {
  fetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ email: 'admin@example.com' }),
  })

  render(<AuthProvider><Probe /></AuthProvider>)

  expect(screen.getByText('loading')).toBeInTheDocument()
  await waitFor(() => expect(screen.getByText('admin@example.com')).toBeInTheDocument())
})

test('shows no user when /me returns 401', async () => {
  fetch.mockResolvedValueOnce({ ok: false })

  render(<AuthProvider><Probe /></AuthProvider>)

  await waitFor(() => expect(screen.getByText('no user')).toBeInTheDocument())
})

test('login sets user on success', async () => {
  fetch
    .mockResolvedValueOnce({ ok: false })
    .mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ email: 'admin@example.com' }),
    })

  function LoginTrigger() {
    const { user, login } = useAuth()
    return (
      <>
        <div>{user ? user.email : 'no user'}</div>
        <button onClick={() => login('admin@example.com', 'changeme')}>login</button>
      </>
    )
  }

  render(<AuthProvider><LoginTrigger /></AuthProvider>)
  await waitFor(() => expect(screen.getByText('no user')).toBeInTheDocument())

  await act(async () => screen.getByRole('button').click())

  await waitFor(() => expect(screen.getByText('admin@example.com')).toBeInTheDocument())
})

test('login throws on bad credentials', async () => {
  fetch
    .mockResolvedValueOnce({ ok: false })
    .mockResolvedValueOnce({ ok: false })

  function LoginTrigger() {
    const { login } = useAuth()
    return <button onClick={() => login('admin@example.com', 'wrong').catch(() => {})}>login</button>
  }

  render(<AuthProvider><LoginTrigger /></AuthProvider>)
  await waitFor(() => screen.getByRole('button'))

  await expect(
    act(async () => {
      try { await new Promise((_, r) => setTimeout(r, 0)) } catch {}
    })
  ).resolves.toBeUndefined()
})

test('logout clears user', async () => {
  fetch
    .mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ email: 'admin@example.com' }),
    })
    .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })

  function LogoutTrigger() {
    const { user, logout } = useAuth()
    return (
      <>
        <div>{user ? user.email : 'no user'}</div>
        <button onClick={logout}>logout</button>
      </>
    )
  }

  render(<AuthProvider><LogoutTrigger /></AuthProvider>)
  await waitFor(() => expect(screen.getByText('admin@example.com')).toBeInTheDocument())

  await act(async () => screen.getByRole('button').click())

  await waitFor(() => expect(screen.getByText('no user')).toBeInTheDocument())
})
