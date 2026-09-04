// ---------------------------------------------------------------
// Footer.jsx  —  Footer público compartido
// Usado por PublicLayout para que todas las vistas públicas tengan
// el mismo pie de página (consistencia de identidad de marca).
// ---------------------------------------------------------------
export const Footer = () => (
  <footer className="footer">
    <div className="container">
      <div className="footer-content">
        <div className="footer-section">
          <h3>Sobre Nosotros</h3>
          <a href="#about">Acerca de</a>
          <a href="#blog">Blog</a>
        </div>
        <div className="footer-section">
          <h3>Soporte</h3>
          <a href="#faq">FAQ</a>
          <a href="#contact">Contacto</a>
        </div>
        <div className="footer-section">
          <h3>Legal</h3>
          <a href="#privacy">Privacidad</a>
          <a href="#terms">Términos</a>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} RED. Todos los derechos reservados.</p>
      </div>
    </div>
  </footer>
)