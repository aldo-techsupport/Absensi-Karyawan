<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Website Dihentikan</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.12.2/lottie.min.js"></script>
  <style>
    *, *::before, *::after {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    :root {
      --bg: #0a0a0f;
      --surface: #111118;
      --border: rgba(255,255,255,0.06);
      --accent: #ff4d4d;
      --accent-dim: rgba(255, 77, 77, 0.12);
      --accent-glow: rgba(255, 77, 77, 0.3);
      --text-primary: #f0f0f5;
      --text-secondary: #8888a0;
      --text-muted: #444458;
    }

    html, body {
      height: 100%;
      background: var(--bg);
      color: var(--text-primary);
      font-family: 'Plus Jakarta Sans', sans-serif;
      overflow-x: hidden;
      overflow-y: auto;
    }

    /* Noise texture overlay */
    body::before {
      content: '';
      position: fixed;
      inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
      pointer-events: none;
      z-index: 0;
      opacity: 0.4;
    }

    /* Radial gradient bg */
    body::after {
      content: '';
      position: fixed;
      inset: 0;
      background: 
        radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,77,77,0.08) 0%, transparent 70%),
        radial-gradient(ellipse 60% 40% at 100% 100%, rgba(100,60,200,0.06) 0%, transparent 60%);
      pointer-events: none;
      z-index: 0;
    }

    .container {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 6rem 2rem 3rem;
      gap: 1.5rem;
    }

    /* Top bar */
    .topbar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 2rem;
      border-bottom: 1px solid var(--border);
      backdrop-filter: blur(20px);
      background: rgba(10, 10, 15, 0.8);
      z-index: 10;
      animation: slideDown 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    .logo-mark {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    .logo-icon {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: linear-gradient(135deg, #ff4d4d, #c0392b);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .logo-icon svg {
      width: 16px;
      height: 16px;
      fill: white;
    }

    .logo-text {
      font-family: 'Space Mono', monospace;
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: var(--text-secondary);
      text-transform: uppercase;
    }

    .status-pill {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--accent-dim);
      border: 1px solid rgba(255, 77, 77, 0.25);
      border-radius: 100px;
      padding: 0.35rem 0.9rem;
      font-size: 0.72rem;
      font-weight: 600;
      color: var(--accent);
      letter-spacing: 0.05em;
      font-family: 'Space Mono', monospace;
    }

    .status-dot {
      width: 6px;
      height: 6px;
      background: var(--accent);
      border-radius: 50%;
      animation: pulse 1.8s ease-in-out infinite;
    }

    /* Main content */
    .card {
      width: 100%;
      max-width: 520px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 3rem 2.5rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.5rem;
      animation: fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both;
      box-shadow: 
        0 0 0 1px rgba(255,255,255,0.03),
        0 32px 80px rgba(0,0,0,0.5),
        0 0 80px var(--accent-glow);
      position: relative;
      overflow: hidden;
    }

    .card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 60%;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(255,77,77,0.5), transparent);
    }

    /* Lottie container */
    #lottie-container {
      width: 180px;
      height: 180px;
      margin: -1rem 0 -0.5rem;
    }

    .error-code {
      font-family: 'Space Mono', monospace;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.15em;
      color: var(--accent);
      text-transform: uppercase;
      background: var(--accent-dim);
      border: 1px solid rgba(255,77,77,0.2);
      padding: 0.3rem 0.8rem;
      border-radius: 6px;
    }

    .title {
      font-size: 1.85rem;
      font-weight: 800;
      text-align: center;
      line-height: 1.2;
      letter-spacing: -0.02em;
      color: var(--text-primary);
    }

    .title span {
      background: linear-gradient(135deg, #ff4d4d, #ff8080);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .description {
      font-size: 0.95rem;
      line-height: 1.7;
      color: var(--text-secondary);
      text-align: center;
      max-width: 360px;
    }

    /* Info rows */
    .info-block {
      width: 100%;
      border: 1px solid var(--border);
      border-radius: 14px;
      overflow: hidden;
    }

    .info-row {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.9rem 1.2rem;
      border-bottom: 1px solid var(--border);
      transition: background 0.2s;
    }

    .info-row:last-child {
      border-bottom: none;
    }

    .info-row:hover {
      background: rgba(255,255,255,0.02);
    }

    .info-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: rgba(255,255,255,0.05);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-size: 0.9rem;
    }

    .info-content {
      flex: 1;
    }

    .info-label {
      font-size: 0.7rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-family: 'Space Mono', monospace;
    }

    .info-value {
      font-size: 0.88rem;
      font-weight: 500;
      color: var(--text-secondary);
      margin-top: 0.1rem;
    }

    /* Button */
    .btn-contact {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      background: var(--accent);
      color: white;
      border: none;
      border-radius: 12px;
      padding: 0.85rem 1.8rem;
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 0.9rem;
      font-weight: 700;
      cursor: pointer;
      width: 100%;
      justify-content: center;
      transition: all 0.2s;
      box-shadow: 0 8px 24px rgba(255, 77, 77, 0.3);
      letter-spacing: 0.01em;
    }

    .btn-contact:hover {
      background: #ff3333;
      transform: translateY(-1px);
      box-shadow: 0 12px 32px rgba(255, 77, 77, 0.4);
    }

    .btn-contact:active {
      transform: translateY(0);
    }

    /* Footer */
    .footer-note {
      font-size: 0.75rem;
      color: var(--text-muted);
      text-align: center;
      font-family: 'Space Mono', monospace;
      animation: fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.5s both;
    }

    /* Grid lines bg decoration */
    .grid-bg {
      position: fixed;
      inset: 0;
      background-image: 
        linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
      background-size: 48px 48px;
      z-index: 0;
      mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black, transparent);
    }

    /* Animations */
    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-16px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(24px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.7); }
    }

    @keyframes shimmer {
      0% { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
  </style>
</head>
<body>

  <div class="grid-bg"></div>

  <!-- Top Bar -->
  <header class="topbar">
    <div class="logo-mark">
      <div class="logo-icon">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      </div>
      <span class="logo-text">System Status</span>
    </div>
    <div class="status-pill">
      <span class="status-dot"></span>
      OFFLINE
    </div>
  </header>

  <main class="container">
    <div class="card">
      <!-- Lottie Animation -->
      <div id="lottie-container"></div>

      <div class="error-code">ERROR · 503 · SERVICE UNAVAILABLE</div>

      <h1 class="title">Website <span>Dihentikan</span></h1>

      <p class="description">
        Maaf, situs ini telah dihentikan sementara oleh administrator, 
        Silahkan Lakukan Pembayaran server karena masa berlaku sudah habis. 
        Hubungi administrator untuk informasi lebih lanjut.
      </p>

      <!-- Info block -->
      <div class="info-block">
        <div class="info-row">
          <div class="info-icon">🔒</div>
          <div class="info-content">
            <div class="info-label">Status</div>
            <div class="info-value">Dihentikan oleh Administrator</div>
          </div>
        </div>
        <div class="info-row">
          <div class="info-icon">⚠️</div>
          <div class="info-content">
            <div class="info-label">Alasan</div>
            <div class="info-value">Penangguhan akun / Pelanggaran kebijakan</div>
          </div>
        </div>
        <div class="info-row">
          <div class="info-icon">🛠️</div>
          <div class="info-content">
            <div class="info-label">Tindakan</div>
            <div class="info-value">Hubungi tim dukungan untuk pemulihan</div>
          </div>
        </div>
      </div>

      <button class="btn-contact" onclick="window.open('https://wa.me/6285155321894', '_blank')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.849L0 24l6.335-1.505A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.882a9.88 9.88 0 01-5.031-1.375l-.361-.214-3.741.981.999-3.648-.235-.374A9.859 9.859 0 012.118 12C2.118 6.533 6.533 2.118 12 2.118c5.467 0 9.882 4.415 9.882 9.882 0 5.467-4.415 9.882-9.882 9.882z"/>
        </svg>
        Hubungi Administrator
      </button>
    </div>

    <p class="footer-note">© 2025 &nbsp;·&nbsp; Semua hak dilindungi &nbsp;·&nbsp; Powered by hosting platform</p>
  </main>

  <script>
    // Load Lottie animation from LottieFiles CDN (warning/error themed)
    const animation = lottie.loadAnimation({
      container: document.getElementById('lottie-container'),
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: 'https://assets2.lottiefiles.com/packages/lf20_qh5z3dxe.json'
    });

    // Fallback: if that fails, load another one
    animation.addEventListener('data_failed', function() {
      lottie.loadAnimation({
        container: document.getElementById('lottie-container'),
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: 'https://assets9.lottiefiles.com/packages/lf20_tnrzlN.json'
      });
    });
  </script>
</body>
</html>