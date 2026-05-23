import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-8">
        <span className="text-gray-800 font-semibold">Customer Support System</span>
        <div className="flex items-center gap-1">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `text-sm px-3 py-1.5 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
              }`
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/tickets"
            className={({ isActive }) =>
              `text-sm px-3 py-1.5 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
              }`
            }
          >
            Tickets
          </NavLink>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-400">{user?.email}</span>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          Logout
        </button>
      </div>
    </nav>
  )
}
