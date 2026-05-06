import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { Landing } from './pages/Landing'
import { Auth } from './pages/Auth'
import { Dashboard } from './pages/Dashboard'
import { VerificarEmail } from './pages/Email'          // ← nombre correcto
import { RecuperarPassword } from './pages/Password'    // ← nombre correcto

function App() {
  return (
    <BrowserRouter>
      <nav>
        <Link to="/">Inicio</Link> | 
        <Link to="/auth">Autenticación</Link> | 
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/email">Verificar Email</Link> | 
        <Link to="/password">Recuperar Contraseña</Link>
      </nav>

      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/login" element={<Auth />} />
        <Route path="/register" element={<Auth />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/email" element={<VerificarEmail />} />
        <Route path="/password" element={<RecuperarPassword />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App