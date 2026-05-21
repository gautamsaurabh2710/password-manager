import { useEffect, useMemo, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const emptyAuth = {
  name: "",
  email: "",
  password: "",
  otp: "",
  resetToken: "",
  newPassword: "",
};

const emptyPassword = {
  website: "",
  username: "",
  password: "",
};

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(data.message || data.error || "Request failed");
  }

  return data;
}

function App() {
  const [mode, setMode] = useState("login");
  const [auth, setAuth] = useState(emptyAuth);
  const [token, setToken] = useState(() => localStorage.getItem("pm_token") || "");
  const [sessionEmail, setSessionEmail] = useState(() => localStorage.getItem("pm_email") || "");
  const [passwordForm, setPasswordForm] = useState(emptyPassword);
  const [passwords, setPasswords] = useState([]);
  const [query, setQuery] = useState("");
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const signedIn = Boolean(token);

  const filteredPasswords = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return passwords;

    return passwords.filter((item) =>
      [item.website, item.username].some((value) =>
        String(value || "").toLowerCase().includes(needle),
      ),
    );
  }, [passwords, query]);

  useEffect(() => {
    if (token) {
      localStorage.setItem("pm_token", token);
      if (sessionEmail) localStorage.setItem("pm_email", sessionEmail);
      loadPasswords(token);
    } else {
      localStorage.removeItem("pm_token");
      setPasswords([]);
    }
  }, [token, sessionEmail]);

  function updateAuth(field, value) {
    setAuth((current) => ({ ...current, [field]: value }));
  }

  function updatePassword(field, value) {
    setPasswordForm((current) => ({ ...current, [field]: value }));
  }

  function showMessage(text) {
    setError("");
    setMessage(text);
  }

  function showError(err) {
    setMessage("");
    setError(err.message || "Something went wrong");
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setLoading(true);

    try {
      if (mode === "register") {
        await apiRequest("/api/auth/register", {
          method: "POST",
          body: JSON.stringify({
            name: auth.name,
            email: auth.email,
            password: auth.password,
          }),
        });
        setSessionEmail(auth.email);
        setMode("verify");
        showMessage("OTP sent. Check your email and verify your account.");
      }

      if (mode === "login") {
        await apiRequest("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({
            email: auth.email,
            password: auth.password,
          }),
        });
        setSessionEmail(auth.email);
        setMode("verify");
        showMessage("OTP sent. Enter it to open your vault.");
      }

      if (mode === "verify") {
        const data = await apiRequest("/api/auth/verify-otp", {
          method: "POST",
          body: JSON.stringify({
            email: auth.email || sessionEmail,
            otp: auth.otp,
          }),
        });
        setToken(data.token);
        setAuth(emptyAuth);
        showMessage("Vault unlocked.");
      }

      if (mode === "forgot") {
        const data = await apiRequest("/api/auth/forgot-password", {
          method: "POST",
          body: JSON.stringify({ email: auth.email }),
        });
        updateAuth("resetToken", data.resetToken || "");
        showMessage("Reset token generated. Paste it below with a new password.");
        setMode("reset");
      }

      if (mode === "reset") {
        await apiRequest("/api/auth/reset-password", {
          method: "POST",
          body: JSON.stringify({
            token: auth.resetToken,
            password: auth.newPassword,
          }),
        });
        setAuth(emptyAuth);
        setMode("login");
        showMessage("Password reset. You can sign in now.");
      }
    } catch (err) {
      showError(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadPasswords(activeToken = token) {
    if (!activeToken) return;

    try {
      const data = await apiRequest("/api/passwords", {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      setPasswords(Array.isArray(data) ? data : []);
    } catch (err) {
      showError(err);
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    setLoading(true);

    try {
      await apiRequest("/api/passwords", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(passwordForm),
      });
      setPasswordForm(emptyPassword);
      await loadPasswords();
      showMessage("Password saved.");
    } catch (err) {
      showError(err);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    setToken("");
    localStorage.removeItem("pm_email");
    setSessionEmail("");
    setAuth(emptyAuth);
    setMode("login");
    showMessage("Signed out.");
  }

  function copyValue(value) {
    navigator.clipboard.writeText(value || "");
    showMessage("Copied.");
  }

  const activeEmail = auth.email || sessionEmail;

  return (
    <main className="shell">
      <section className="topbar">
        <div>
          <p className="eyebrow">Local vault</p>
          <h1>Cipher Safe</h1>
        </div>
        <div className="server-pill" title="Backend API URL">
          <span className="dot" />
          {API_URL}
        </div>
      </section>

      {message && <div className="notice success">{message}</div>}
      {error && <div className="notice error">{error}</div>}

      {!signedIn ? (
        <section className="auth-layout">
          <div className="auth-panel">
            <div className="tabs" role="tablist" aria-label="Authentication mode">
              <button
                className={mode === "login" ? "active" : ""}
                onClick={() => setMode("login")}
                type="button"
              >
                Login
              </button>
              <button
                className={mode === "register" ? "active" : ""}
                onClick={() => setMode("register")}
                type="button"
              >
                Register
              </button>
              <button
                className={mode === "forgot" || mode === "reset" ? "active" : ""}
                onClick={() => setMode("forgot")}
                type="button"
              >
                Reset
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="form-grid">
              {mode === "register" && (
                <label>
                  Name
                  <input
                    value={auth.name}
                    onChange={(event) => updateAuth("name", event.target.value)}
                    placeholder="Aarav Sharma"
                    autoComplete="name"
                    required
                  />
                </label>
              )}

              {(mode === "login" || mode === "register" || mode === "forgot") && (
                <label>
                  Email
                  <input
                    value={auth.email}
                    onChange={(event) => updateAuth("email", event.target.value)}
                    placeholder="you@example.com"
                    type="email"
                    autoComplete="email"
                    required
                  />
                </label>
              )}

              {(mode === "login" || mode === "register") && (
                <label>
                  Password
                  <input
                    value={auth.password}
                    onChange={(event) => updateAuth("password", event.target.value)}
                    placeholder="Your password"
                    type="password"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    required
                  />
                </label>
              )}

              {mode === "verify" && (
                <>
                  <label>
                    Email
                    <input
                      value={activeEmail}
                      onChange={(event) => updateAuth("email", event.target.value)}
                      placeholder="you@example.com"
                      type="email"
                      required
                    />
                  </label>
                  <label>
                    OTP
                    <input
                      value={auth.otp}
                      onChange={(event) => updateAuth("otp", event.target.value)}
                      placeholder="6 digit code"
                      inputMode="numeric"
                      required
                    />
                  </label>
                </>
              )}

              {mode === "reset" && (
                <>
                  <label>
                    Reset token
                    <textarea
                      value={auth.resetToken}
                      onChange={(event) => updateAuth("resetToken", event.target.value)}
                      placeholder="Paste reset token"
                      rows="3"
                      required
                    />
                  </label>
                  <label>
                    New password
                    <input
                      value={auth.newPassword}
                      onChange={(event) => updateAuth("newPassword", event.target.value)}
                      placeholder="New password"
                      type="password"
                      autoComplete="new-password"
                      required
                    />
                  </label>
                </>
              )}

              <button className="primary-button" disabled={loading} type="submit">
                {loading ? "Working..." : authActionLabel(mode)}
              </button>
            </form>
          </div>

          <aside className="status-panel">
            <div className="metric">
              <span>API</span>
              <strong>Connected</strong>
            </div>
            <div className="metric">
              <span>Flow</span>
              <strong>{mode === "verify" ? "OTP required" : "Email secured"}</strong>
            </div>
            <div className="metric">
              <span>Storage</span>
              <strong>Encrypted backend</strong>
            </div>
          </aside>
        </section>
      ) : (
        <section className="vault-layout">
          <aside className="vault-sidebar">
            <div>
              <p className="eyebrow">Signed in</p>
              <h2>{sessionEmail || "Vault user"}</h2>
            </div>
            <button className="ghost-button" onClick={logout} type="button">
              Sign out
            </button>
          </aside>

          <section className="vault-main">
            <form className="password-form" onSubmit={handlePasswordSubmit}>
              <label>
                Website
                <input
                  value={passwordForm.website}
                  onChange={(event) => updatePassword("website", event.target.value)}
                  placeholder="github.com"
                  required
                />
              </label>
              <label>
                Username
                <input
                  value={passwordForm.username}
                  onChange={(event) => updatePassword("username", event.target.value)}
                  placeholder="username or email"
                  required
                />
              </label>
              <label>
                Password
                <input
                  value={passwordForm.password}
                  onChange={(event) => updatePassword("password", event.target.value)}
                  placeholder="password"
                  type="password"
                  required
                />
              </label>
              <button className="primary-button" disabled={loading} type="submit">
                Save
              </button>
            </form>

            <div className="vault-tools">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search vault"
                aria-label="Search vault"
              />
              <button className="ghost-button" onClick={() => loadPasswords()} type="button">
                Refresh
              </button>
            </div>

            <div className="password-list">
              {filteredPasswords.length === 0 ? (
                <div className="empty-state">No saved passwords found.</div>
              ) : (
                filteredPasswords.map((item) => {
                  const id = item._id || `${item.website}-${item.username}`;
                  const passwordText = item.decryptedPassword || "";
                  const revealed = Boolean(visiblePasswords[id]);

                  return (
                    <article className="password-card" key={id}>
                      <div>
                        <h3>{item.website}</h3>
                        <p>{item.username}</p>
                      </div>
                      <div className="secret-row">
                        <code>{revealed ? passwordText : "••••••••••••"}</code>
                        <button
                          className="icon-button"
                          onClick={() =>
                            setVisiblePasswords((current) => ({
                              ...current,
                              [id]: !revealed,
                            }))
                          }
                          title={revealed ? "Hide password" : "Show password"}
                          type="button"
                        >
                          {revealed ? "Hide" : "Show"}
                        </button>
                        <button
                          className="icon-button"
                          onClick={() => copyValue(passwordText)}
                          title="Copy password"
                          type="button"
                        >
                          Copy
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        </section>
      )}
    </main>
  );
}

function authActionLabel(mode) {
  if (mode === "register") return "Create account";
  if (mode === "verify") return "Verify OTP";
  if (mode === "forgot") return "Get reset token";
  if (mode === "reset") return "Set new password";
  return "Send OTP";
}

export default App;
