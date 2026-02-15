export default function Footer() {
  return (
    <footer className="siteFooter">
      <div className="footerInner">
        {/* Brand + About */}
        <div className="footerCol">
          <div className="footerBrand">
            <span className="brandMark">◆</span> LebanonConnect
          </div>
          <p className="footerAbout">
            Lebanon's trusted marketplace for verified service providers.
            Find, chat, and hire — all inside the platform.
          </p>
          <div className="footerSocials">
            <a
              href="https://www.instagram.com/ali._.dana1"
              target="_blank"
              rel="noopener noreferrer"
              className="footerSocialLink"
              aria-label="Instagram"
            >
              {/* Instagram SVG icon */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
              </svg>
            </a>
            <a
              href="http://www.linkedin.com/in/alii-dana"
              target="_blank"
              rel="noopener noreferrer"
              className="footerSocialLink"
              aria-label="LinkedIn"
            >
              {/* LinkedIn SVG icon */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
                <rect x="2" y="9" width="4" height="12"/>
                <circle cx="4" cy="4" r="2"/>
              </svg>
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div className="footerCol">
          <div className="footerColTitle">Quick Links</div>
          <a href="/" className="footerLink">Explore Providers</a>
          <a href="/login" className="footerLink">Login</a>
          <a href="/register" className="footerLink">Create Account</a>
          <a href="/dashboard" className="footerLink">Dashboard</a>
        </div>

        {/* Contact Info */}
        <div className="footerCol">
          <div className="footerColTitle">Contact</div>
          <div className="footerContactRow">
            {/* Email SVG */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            <a href="mailto:alexmoren134@gmail.com" className="footerLink">
              alexmoren134@gmail.com
            </a>
          </div>
          <div className="footerContactRow">
            {/* Phone SVG */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
            <a href="tel:+96178849025" className="footerLink">
              +961 78 849 025
            </a>
          </div>
          <div className="footerContactRow">
            {/* Location SVG */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <span className="footerText">
              Alemeh Street, Tayouneh, Beirut, Lebanon
            </span>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="footerBottom">
        <span>© 2026 LebanonConnect. All rights reserved.</span>
      </div>
    </footer>
  );
}
