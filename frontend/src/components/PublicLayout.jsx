import { Header } from './Header'
import { Breadcrumbs } from './Breadcrumbs'
import { Footer } from './Footer'

export const PublicLayout = ({ children, floating, pageTitle }) => (
  <div className="public-layout">
    <Header floating={floating} />
    <main className="public-main">
      {!floating && <Breadcrumbs pageTitle={pageTitle} />}
      {children}
    </main>
    <Footer />
    <style>{`
      .public-layout {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
      }
      .public-main {
        flex: 1;
      }
    `}</style>
  </div>
)