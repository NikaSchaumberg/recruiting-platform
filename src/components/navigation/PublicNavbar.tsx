import Link from 'next/link'

export function PublicNavbar() {
  return (
    <nav style={{
      backgroundColor: '#FFFFFF',
      borderBottom: '1px solid #E8E2D8',
      position: 'sticky',
      top: 0,
      zIndex: 10,
    }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
          <Link href="/careers">
            <img src="/Exxir_6Logo.svg" alt="Exxir" style={{ height: '36px', width: 'auto', display: 'block' }} />
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
            <Link
              href="/careers"
              className="font-serif-display hover:opacity-60 transition-opacity"
              style={{ color: '#1C1917', fontSize: '15px', fontWeight: 600 }}
            >
              Open Positions
            </Link>
            <Link
              href="/login"
              className="font-serif-display hover:opacity-70 transition-opacity"
              style={{ color: '#A8845E', fontSize: '15px', fontWeight: 600 }}
            >
              HR Login
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
