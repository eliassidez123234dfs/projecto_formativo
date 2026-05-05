import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Dashboard } from './pages/Dashboard'
import { Email } from './pages/Email'
import { Password } from './pages/Password'

function App() {
  return (
    <BrowserRouter>
      <nav>
        {/* Navegación básica para probar */}
        <Link to="/">Inicio</Link> | 
        <Link to="/login">Login</Link> | 
        <Link to="/register">Registro</Link> | 
        <Link to="/dashboard">Dashboard</Link>
      </nav>

      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/email" element={<Email />} />
        <Route path="/password" element={<Password />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App