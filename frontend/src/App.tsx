import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { DiariesProvider } from './context/DiariesContext'
import { Layout } from './components/Layout'
import { SearchPage } from './pages/SearchPage'
import { WritePage } from './pages/WritePage'
import { ReadPage } from './pages/ReadPage'
import { InsightPage } from './pages/InsightPage'

function App() {
  return (
    <DiariesProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/search" element={<SearchPage />} />
            <Route path="/write" element={<WritePage />} />
            <Route path="/read" element={<ReadPage />} />
            <Route path="/insight" element={<InsightPage />} />
          </Route>
          <Route path="/" element={<Navigate to="/search" replace />} />
          <Route path="*" element={<Navigate to="/search" replace />} />
        </Routes>
      </BrowserRouter>
    </DiariesProvider>
  )
}

export default App
