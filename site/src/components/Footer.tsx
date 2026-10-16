import { m } from '../i18n';

export function Footer({ commit }: { commit: string | null }) {
  return (
    <footer className="site-footer">
      <div className="container footer-row">
        <a href="#/">{m.nav.browse}</a>
        <a href="#/new">{m.nav.whatsNew}</a>
        <a href="#/start">{m.nav.start}</a>
        <a href="feed.xml">{m.footer.atomFeed}</a>
        <span className="footer-meta">{m.footer.meta(commit)}</span>
      </div>
    </footer>
  );
}
