import Navbar from '../components/Navbar'

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-2xl mx-auto mt-20 px-6 text-center">
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">Dashboard</h2>
        <p className="text-gray-400 text-sm">Coming soon</p>
      </main>
    </div>
  )
}
