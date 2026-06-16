import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { appearBtn } from './lib/animate.js';
import './navbar.css';

function NavScrollExample({ onSearch }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const location = useLocation();
  const navLinksRef = useRef([]);
  const searchBtnRef = useRef(null);

  const handleSearch = (e) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchTerm);
    }
  };

  useEffect(() => {
    async function loadUser() {
      try {
        const response = await fetch("/api/profile", {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setUser(data.user);
          }
        }
      } catch (err) {
        console.error("Error loading user:", err);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  // Scroll detection
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Entrance animations for nav links (staggered)
  useEffect(() => {
    if (!loading) {
      navLinksRef.current.forEach((el, i) => {
        if (el) appearBtn(el, i * 60);
      });
      if (searchBtnRef.current) appearBtn(searchBtnRef.current, navLinksRef.current.length * 60);
    }
  }, [loading]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Helper to check if a path is active
  const isActive = (path) => location.pathname === path;

  // Collect ref for nav links
  const setNavRef = (index) => (el) => {
    navLinksRef.current[index] = el;
  };

  return (
    <>
      <nav className={`navbar${scrolled ? ' scrolled' : ''}`}>
        {/* Brand */}
        <Link to="/" className="navbar-brand">Live PM</Link>

        {/* Mobile toggle */}
        <button
          className="navbar-toggle"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {mobileOpen ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>

        {/* Collapsible content */}
        <div className={`navbar-collapse${mobileOpen ? ' open' : ''}`}>
          <div className="navbar-right">
            <ul className="nav-links">
              <li>
                <Link
                  to="/profile"
                  className={`nav-link${isActive('/profile') ? ' active' : ''}`}
                  ref={setNavRef(0)}
                >
                  Profile
                </Link>
              </li>
              {!loading && user?.typeofuser !== "staff" && (
                <li>
                  <Link
                    to="/status"
                    className={`nav-link${isActive('/status') ? ' active' : ''}`}
                    ref={setNavRef(1)}
                  >
                    Status
                  </Link>
                </li>
              )}
              {!loading && user?.typeofuser === "staff" && (
                <li>
                  <Link
                    to="/applications"
                    className={`nav-link${isActive('/applications') ? ' active' : ''}`}
                    ref={setNavRef(1)}
                  >
                    Applications
                  </Link>
                </li>
              )}
            </ul>

            <form className="search-form-custom" onSubmit={handleSearch}>
              <div className="search-input-wrapper">
                <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                </svg>
                <input
                  type="search"
                  placeholder="Search projects…"
                  className="custom-search-input"
                  aria-label="Search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button
                  className="search-btn-custom"
                  type="submit"
                  ref={searchBtnRef}
                >
                  <span className="btn-label">Search</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </nav>

      {/* Spacer to push content below fixed navbar */}
      <div className="navbar-spacer" />
    </>
  );
}

export default NavScrollExample;