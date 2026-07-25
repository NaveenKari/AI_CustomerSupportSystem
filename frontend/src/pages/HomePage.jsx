import Navbar from '../components/Navbar'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-2xl mx-auto mt-12 sm:mt-20 px-4 sm:px-6 text-center">
        <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800 mb-2">Welcome back</h2>
        <p className="text-gray-400 text-sm">Select a section from the navigation above.</p>
      </main>
    </div>
  )
}
