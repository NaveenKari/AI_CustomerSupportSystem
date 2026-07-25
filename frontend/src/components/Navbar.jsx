import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const linkClass = ({ isActive }) =>
    `block text-sm px-3 py-2 rounded-lg transition-colors ${
      isActive
        ? 'bg-blue-50 text-blue-600 font-medium'
        : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
    }`

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Brand */}
        <span className="text-gray-800 font-semibold text-sm sm:text-base truncate">
          Customer Support
        </span>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>
          <NavLink to="/tickets"   className={linkClass}>Tickets</NavLink>
        </div>

        {/* Desktop user */}
        <div className="hidden md:flex items-center gap-4">
          <span className="text-sm text-gray-400 truncate max-w-[180px]">{user?.email}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            Logout
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(o => !o)}
          className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          aria-label="Toggle menu"
        >
          {menuOpen ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 px-4 py-3 space-y-1 bg-white">
          <NavLink to="/dashboard" className={linkClass} onClick={() => setMenuOpen(false)}>
            Dashboard
          </NavLink>
          <NavLink to="/tickets" className={linkClass} onClick={() => setMenuOpen(false)}>
            Tickets
          </NavLink>
          <div className="pt-2 mt-2 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400 truncate max-w-[200px]">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-red-500 hover:text-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}
