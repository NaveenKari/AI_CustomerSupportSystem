import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import ProtectedRoute from '../components/ProtectedRoute'
import LoginPage from '../pages/LoginPage'
import HomePage from '../pages/HomePage'
import DashboardPage from '../pages/DashboardPage'
import TicketsPage from '../pages/TicketsPage'

function App({ initialPath = '/' }) {
  return (
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/tickets" element={<ProtectedRoute><TicketsPage /></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  )
}

beforeEach(() => vi.stubGlobal('fetch', vi.fn()))
afterEach(() => vi.unstubAllGlobals())

test('unauthenticated user is redirected to /login', async () => {
  fetch.mockResolvedValue({ ok: false })

  render(<App initialPath="/" />)

  await waitFor(() => expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument())
})

test('authenticated user sees home page', async () => {
  fetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ email: 'admin@example.com' }),
  })

  render(<App initialPath="/" />)

  await waitFor(() => expect(screen.getByText('Welcome back')).toBeInTheDocument())
})

test('login then navigate to dashboard via navbar', async () => {
  fetch
    .mockResolvedValueOnce({ ok: false })
    .mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ email: 'admin@example.com' }),
    })

  render(<App initialPath="/login" />)
  await waitFor(() => screen.getByPlaceholderText('admin@example.com'))

  await userEvent.type(screen.getByPlaceholderText('admin@example.com'), 'admin@example.com')
  await userEvent.type(screen.getByPlaceholderText('••••••••'), 'changeme')
  await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

  await waitFor(() => expect(screen.getByText('Welcome back')).toBeInTheDocument())

  await userEvent.click(screen.getByRole('link', { name: /dashboard/i }))
  await waitFor(() => expect(screen.getByText('Coming soon')).toBeInTheDocument())
})

test('logout redirects back to login', async () => {
  fetch
    .mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ email: 'admin@example.com' }),
    })
    .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })

  render(<App initialPath="/" />)
  await waitFor(() => expect(screen.getByText('Welcome back')).toBeInTheDocument())

  await userEvent.click(screen.getByRole('button', { name: /logout/i }))

  await waitFor(() => expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument())
})
