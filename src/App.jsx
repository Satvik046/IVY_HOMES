import { useEffect, useState } from "react";

const API = "http://localhost:3001";

function App() {
  const [email, setEmail] = useState("demo1@ivy.homes");
  const [password, setPassword] = useState("");
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingListings, setLoadingListings] = useState(false);
  const [error, setError] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
  async function checkSession() {
    try {
      const response = await fetch(`${API}/api/auth/session`, {
        credentials: "include",
      });

      if (response.ok) {
        setLoggedIn(true);
        await loadListings();
      }
    } catch (err) {
      console.error("Session check failed:", err);
    }
  }

  checkSession();
}, []);

  async function loadListings() {
    setLoadingListings(true);
    setError("");

    try {
      const response = await fetch(
        `${API}/api/listings?limit=50&offset=0`,
        {
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || data.error || "Failed to load listings"
        );
      }

      setListings(data.results || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingListings(false);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || data.error || "Login failed"
        );
      }

      setLoggedIn(true);
      setPassword("");

      await loadListings();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!loggedIn) {
    return (
      <div style={styles.loginPage}>
        <div style={styles.loginCard}>
          <h1 style={styles.logo}>Ivy Homes</h1>
          <p style={styles.subtitle}>
            Find your next home
          </p>

          <form onSubmit={handleLogin}>
            <label style={styles.label}>Email</label>

            <input
              style={styles.input}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            <label style={styles.label}>Password</label>

            <input
              style={styles.input}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />

            <button
              style={styles.primaryButton}
              type="submit"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          {error && <p style={styles.error}>{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.logo}>Ivy Homes</div>

        <nav style={styles.nav}>
          <span style={styles.activeNav}>Listings</span>
          <span>Favourites</span>
          <span>Rentals</span>
          <span>Projects</span>
          <span>Insights</span>
        </nav>
      </header>

      <main style={styles.main}>
        <div style={styles.pageHeader}>
          <div>
            <h1 style={styles.title}>Property Listings</h1>
            <p style={styles.subtitle}>
              Explore available properties
            </p>
          </div>

          <div style={styles.count}>
            {listings.length} listings
          </div>
        </div>

        {loadingListings && (
          <p>Loading listings...</p>
        )}

        {error && (
          <p style={styles.error}>{error}</p>
        )}

        {!loadingListings && !error && (
          <div style={styles.grid}>
            {listings.map((listing) => (
              <div
                key={listing.listing_id}
                style={styles.card}
              >
                <div style={styles.cardTop}>
                  <span style={styles.badge}>
                    {listing.property_type ||
                      "Property"}
                  </span>

                  <span style={styles.listingId}>
                    #{listing.listing_id}
                  </span>
                </div>

                <h2 style={styles.cardTitle}>
  {listing.apartment_name || "Property"}
</h2>

<p style={styles.locality}>
  {listing.locality || "Location unavailable"}
</p>

<div style={styles.details}>
  {listing.bedroom && (
    <span>{listing.bedroom} BHK</span>
  )}

  {listing.bathroom && (
    <span>{listing.bathroom} Bath</span>
  )}

  {listing.carpet_area && (
    <span>{listing.carpet_area} sq ft carpet</span>
  )}

  {listing.furnishing && (
    <span>{listing.furnishing}</span>
  )}
</div>

                {(listing.price ||
                  listing.monthly_rent) && (
                  <div style={styles.price}>
                    ₹
                    {(
                      listing.price ||
                      listing.monthly_rent
                    ).toLocaleString?.() ||
                      listing.price ||
                      listing.monthly_rent}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  app: {
    minHeight: "100vh",
    background: "#f6f7f9",
    color: "#171717",
    fontFamily:
      "Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  },

  header: {
    height: "64px",
    background: "#ffffff",
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 40px",
  },

  logo: {
    fontSize: "22px",
    fontWeight: "700",
  },

  nav: {
    display: "flex",
    gap: "28px",
    fontSize: "14px",
    color: "#666",
  },

  activeNav: {
    color: "#111",
    fontWeight: "600",
  },

  main: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "40px 24px",
  },

  pageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "end",
    marginBottom: "28px",
  },

  title: {
    margin: 0,
    fontSize: "32px",
  },

  subtitle: {
    marginTop: "8px",
    color: "#777",
  },

  count: {
    background: "#ffffff",
    padding: "10px 16px",
    borderRadius: "8px",
    border: "1px solid #e5e7eb",
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "20px",
  },

  card: {
    background: "#ffffff",
    borderRadius: "12px",
    padding: "20px",
    border: "1px solid #e5e7eb",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },

  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  badge: {
    background: "#f0f0f0",
    padding: "5px 9px",
    borderRadius: "6px",
    fontSize: "12px",
  },

  listingId: {
    fontSize: "11px",
    color: "#999",
  },

  cardTitle: {
    fontSize: "18px",
    margin: "18px 0 6px",
  },

  locality: {
    color: "#666",
    margin: "0 0 18px",
  },

  details: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    fontSize: "13px",
    color: "#555",
  },

  price: {
    marginTop: "20px",
    fontSize: "20px",
    fontWeight: "700",
  },

  loginPage: {
    minHeight: "100vh",
    background: "#f6f7f9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily:
      "Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  },

  loginCard: {
    width: "360px",
    background: "#ffffff",
    padding: "36px",
    borderRadius: "14px",
    border: "1px solid #e5e7eb",
    boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
  },

  label: {
    display: "block",
    marginBottom: "7px",
    marginTop: "18px",
    fontSize: "14px",
    fontWeight: "600",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 12px",
    border: "1px solid #d1d5db",
    borderRadius: "7px",
    fontSize: "14px",
  },

  primaryButton: {
    width: "100%",
    marginTop: "24px",
    padding: "12px",
    border: "none",
    borderRadius: "7px",
    background: "#111",
    color: "#fff",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },

  error: {
    color: "#c62828",
    marginTop: "16px",
  },
};

export default App;