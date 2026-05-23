import { useState, useEffect } from 'react'

const BACKEND_URL = 'http://localhost:8080'

function App() {
  const [health, setHealth] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/health`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(data => { setHealth(data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-md p-10 w-full max-w-md text-center">
        <h1 className="text-2xl font-semibold text-gray-800 mb-6">
          Customer Support System
        </h1>

        {loading && (
          <p className="text-gray-400 text-sm">Checking backend...</p>
        )}

        {!loading && error && (
          <div className="flex items-center justify-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
            <span className="text-red-600 text-sm font-medium">Backend unreachable — {error}</span>
          </div>
        )}

        {!loading && health && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span>
              <span className="text-green-700 text-sm font-medium">Backend is {health.status}</span>
            </div>
            <div className="text-left bg-gray-50 rounded-lg px-4 py-3 space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span className="text-gray-400">Service</span>
                <span className="font-medium text-gray-700">{health.service}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Timestamp</span>
                <span className="font-medium text-gray-700">
                  {new Date(health.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">URL</span>
                <span className="font-medium text-gray-700">{BACKEND_URL}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
