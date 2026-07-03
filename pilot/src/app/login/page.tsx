import { sendMagicLink, signIn } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="logo"><span>K</span>Kodi<strong>Flow</strong></div>
        <p className="eyebrow">PRIVATE PILOT</p>
        <h1>Welcome back.</h1>
        <p className="muted">Secure access for KodiFlow landlords and platform administrators.</p>
        {params.error && <div className="alert">{params.error}</div>}
        {params.sent && <div className="success">Check your email for a secure sign-in link.</div>}
        <form className="auth-form">
          <label>Email address<input name="email" type="email" required placeholder="you@example.com" /></label>
          <label>Password<input name="password" type="password" minLength={8} placeholder="••••••••" /></label>
          <button formAction={signIn}>Sign in securely</button>
          <button className="secondary" formAction={sendMagicLink}>Email me a magic link</button>
        </form>
        <small>Admin contact: antonymugo66@gmail.com</small>
      </section>
      <aside className="login-story">
        <p className="eyebrow">RENT MANAGEMENT, MADE SIMPLE</p>
        <h2>One secure home for every property, payment, and tenant.</h2>
        <ul><li>Landlord data isolation</li><li>Automatic M-Pesa reconciliation</li><li>Real-time arrears and reporting</li></ul>
      </aside>
    </main>
  );
}
