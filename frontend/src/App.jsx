import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Dashboard } from './pages/Dashboard'
import { VerificarEmail } from './pages/Email'          // ← nombre correcto
import { RecuperarPassword } from './pages/Password'    // ← nombre correcto

function App() {
  return (
    <BrowserRouter>
      <nav>
        <Link to="/">Inicio</Link> | 
        <Link to="/login">Login</Link> | 
        <Link to="/register">Registro</Link> | 
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/email">Verificar Email</Link> | 
        <Link to="/password">Recuperar Contraseña</Link>
      </nav>

      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/email" element={<VerificarEmail />} />
        <Route path="/password" element={<RecuperarPassword />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App