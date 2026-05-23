import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import LoginPage from '../pages/LoginPage'

function setup() {
  render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<div>home</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
  // /me → 401 so the user is treated as logged out
  fetch.mockResolvedValue({ ok: false })
})

afterEach(() => vi.unstubAllGlobals())

test('renders email and password fields', async () => {
  setup()
  await waitFor(() => expect(screen.getByPlaceholderText('admin@example.com')).toBeInTheDocument())
  expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
})

test('successful login redirects to home', async () => {
  fetch
    .mockResolvedValueOnce({ ok: false }) // /me on mount
    .mockResolvedValueOnce({              // /login
      ok: true,
      json: () => Promise.resolve({ email: 'admin@example.com' }),
    })

  setup()
  await waitFor(() => screen.getByPlaceholderText('admin@example.com'))

  await userEvent.type(screen.getByPlaceholderText('admin@example.com'), 'admin@example.com')
  await userEvent.type(screen.getByPlaceholderText('••••••••'), 'changeme')
  await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

  await waitFor(() => expect(screen.getByText('home')).toBeInTheDocument())
})

test('failed login shows error message', async () => {
  fetch
    .mockResolvedValueOnce({ ok: false }) // /me on mount
    .mockResolvedValueOnce({ ok: false }) // /login

  setup()
  await waitFor(() => screen.getByPlaceholderText('admin@example.com'))

  await userEvent.type(screen.getByPlaceholderText('admin@example.com'), 'admin@example.com')
  await userEvent.type(screen.getByPlaceholderText('••••••••'), 'wrong')
  await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

  await waitFor(() => expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument())
})
