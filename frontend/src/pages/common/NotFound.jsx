import { useEffect, useState } from "react";
import notFoundImage from "../../assets/notfound.png"
import { useNavigate } from "react-router-dom"

const HomeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
    <path d="M9 21V12h6v9" />
  </svg>
);

const LoginIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
    <polyline points="10 17 15 12 10 7" />
    <line x1="15" y1="12" x2="3" y2="12" />
  </svg>
);

const ContactIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

export default function NotFound() {
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');

        .nf-root {
          font-family: 'DM Sans', sans-serif;
          min-height: 100vh;
          width: 100%;
          background: #ffffff;
          background-image:
            radial-gradient(circle at 10% 90%, rgba(232,25,44,0.055) 0%, transparent 48%),
            radial-gradient(circle at 90% 8%,  rgba(232,25,44,0.04)  0%, transparent 42%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          padding: 4rem 1.5rem;
        }

        /* faint grid */
        .nf-root::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(#f0f0f0 1px, transparent 1px),
            linear-gradient(90deg, #f0f0f0 1px, transparent 1px);
          background-size: 52px 52px;
          pointer-events: none;
          z-index: 0;
        }

        .nf-inner {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 1080px;
          display: flex;
          flex-direction: column-reverse;
          align-items: center;
          justify-content: center;
          gap: 2.5rem;
        }

        @media (min-width: 1024px) {
          .nf-inner {
            flex-direction: row;
            gap: 5rem;
          }
          .nf-text { align-items: flex-start; text-align: left; }
          .nf-btns { justify-content: flex-start; }
        }

        .nf-text {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          max-width: 420px;
        }

        .nf-404 {
          font-family: 'Bebas Neue', Impact, sans-serif;
          font-size: clamp(110px, 17vw, 190px);
          line-height: 1;
          color: #E8192C;
          letter-spacing: 6px;
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.55s ease, transform 0.55s ease;
        }
        .nf-404.show { opacity: 1; transform: translateY(0); }

        .nf-divider {
          width: 44px;
          height: 3px;
          background: #E8192C;
          border-radius: 99px;
          margin: 6px 0 14px;
          opacity: 0;
          transform: scaleX(0);
          transform-origin: left;
          transition: opacity 0.45s 0.12s ease, transform 0.45s 0.12s ease;
        }
        .nf-divider.show { opacity: 1; transform: scaleX(1); }

        .nf-heading {
          font-size: 1.35rem;
          font-weight: 600;
          color: #111;
          letter-spacing: -0.02em;
          margin-bottom: 10px;
          opacity: 0;
          transform: translateY(16px);
          transition: opacity 0.5s 0.18s ease, transform 0.5s 0.18s ease;
        }
        .nf-heading.show { opacity: 1; transform: translateY(0); }

        .nf-desc {
          font-size: 0.875rem;
          font-weight: 300;
          color: #9ca3af;
          line-height: 1.75;
          margin-bottom: 2.25rem;
          max-width: 300px;
          opacity: 0;
          transform: translateY(14px);
          transition: opacity 0.5s 0.26s ease, transform 0.5s 0.26s ease;
        }
        .nf-desc.show { opacity: 1; transform: translateY(0); }

        .nf-btns {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          justify-content: center;
          opacity: 0;
          transform: translateY(12px);
          transition: opacity 0.5s 0.34s ease, transform 0.5s 0.34s ease;
        }
        .nf-btns.show { opacity: 1; transform: translateY(0); }

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 10px 22px;
          border-radius: 9999px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.8125rem;
          font-weight: 500;
          letter-spacing: 0.02em;
          cursor: pointer;
          border: 1.5px solid transparent;
          transition: background 0.2s, border-color 0.2s, transform 0.2s, box-shadow 0.2s;
        }
        .btn:hover { transform: translateY(-2px); }

        .btn-home {
          background: #111;
          color: #fff;
          border-color: #111;
        }
        .btn-home:hover { background: #2a2a2a; box-shadow: 0 8px 24px rgba(0,0,0,0.14); }

        .btn-login {
          background: transparent;
          color: #222;
          border-color: #d1d5db;
        }
        .btn-login:hover { border-color: #888; box-shadow: 0 6px 18px rgba(0,0,0,0.07); }

        .btn-contact {
          background: transparent;
          color: #E8192C;
          border-color: rgba(232,25,44,0.28);
        }
        .btn-contact:hover { background: rgba(232,25,44,0.05); border-color: #E8192C; }

        .nf-hint {
          margin-top: 2.5rem;
          font-size: 0.7rem;
          color: #d1d5db;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          opacity: 0;
          transition: opacity 0.5s 0.44s ease;
        }
        .nf-hint.show { opacity: 1; }

        /* Image side */
        .nf-img-wrap {
          flex-shrink: 0;
          width: min(320px, 88vw);
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.65s 0.08s ease, transform 0.65s 0.08s ease;
          animation: none;
        }
        .nf-img-wrap.show {
          opacity: 1;
          transform: translateY(0);
          animation: imgFloat 5s 0.7s ease-in-out infinite;
        }

        @media (min-width: 1024px) {
          .nf-img-wrap { width: min(460px, 44vw); }
        }

        @keyframes imgFloat {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-14px); }
        }

        /* corner labels */
        .corner-label {
          position: absolute;
          font-size: 0.65rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #d1d5db;
          display: flex;
          align-items: center;
          gap: 6px;
          z-index: 1;
          user-select: none;
        }
        .corner-dot { width: 6px; height: 6px; border-radius: 50%; background: #E8192C; }
      `}</style>

      <div className="nf-root">

        {/* Corner labels */}
        <div className="corner-label" style={{ top: "1.8rem", left: "2rem" }}>
          <span className="corner-dot" /> Error
        </div>
        <div className="corner-label" style={{ top: "1.8rem", right: "2rem" }}>
          404 / not-found
        </div>

        <div className="nf-inner">

          {/* ── Text Side ── */}
          <div className="nf-text">
            <div className={`nf-404 ${visible ? "show" : ""}`}>404</div>
            <div className={`nf-divider ${visible ? "show" : ""}`} />
            <h1 className={`nf-heading ${visible ? "show" : ""}`}>Page Not Found</h1>
            <p className={`nf-desc ${visible ? "show" : ""}`}>
              Looks like you've followed a broken link or entered a URL that doesn't exist on this site.
            </p>

            <div className={`nf-btns ${visible ? "show" : ""}`}>
              <button onClick={() => navigate("/")} className="btn btn-home">
                <HomeIcon /> Home
              </button>
              <button onClick={() => navigate("/login")} className="btn btn-login">
                <LoginIcon /> Login
              </button>
              <button onClick={() => navigate("/contact-us")} className="btn btn-contact">
                <ContactIcon /> Contact
              </button>
            </div>

            <p className={`nf-hint ${visible ? "show" : ""}`}>
              HTTP 404 · Resource not available
            </p>
          </div>

          {/* ── Image Side ── */}
          <div className={`nf-img-wrap ${visible ? "show" : ""}`}>
            <img
              src={notFoundImage}
              alt="404 Not Found"
              style={{ width: "100%", height: "auto", objectFit: "contain", display: "block" }}
              draggable={false}
            />
          </div>

        </div>

        {/* Bottom footer */}
        <div style={{
          position: "absolute", bottom: "1.6rem", left: 0, right: 0,
          display: "flex", justifyContent: "center", zIndex: 1
        }}>
          <p style={{ fontSize: "0.65rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "#e5e7eb", userSelect: "none" }}>
            © {new Date().getFullYear()} · All rights reserved
          </p>
        </div>

      </div>
    </>
  );
}