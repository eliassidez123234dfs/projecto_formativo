import { Header } from './Header'
import { Breadcrumbs } from './Breadcrumbs'

export const PublicLayout = ({ children, floating, pageTitle }) => (
  <div className="public-layout">
    <Header floating={floating} />
    <main className="public-main">
      {!floating && <Breadcrumbs pageTitle={pageTitle} />}
      {children}
    </main>
    <footer className="public-footer">
      <p>&copy; {new Date().getFullYear()} RED. Todos los derechos reservados.</p>
    </footer>
    <style>{`
      .public-layout {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
      }
      .public-main {
        flex: 1;
      }
      .public-footer {
        text-align: center;
        padding: 16px 24px;
        font-size: 0.8rem;
        color: var(--color-text-muted, #9CA3AF);
        border-top: 1px solid var(--color-border, #E5E7EB);
      }
    `}</style>
  </div>
)
