import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      maxWidth: '600px',
      margin: '80px auto',
      textAlign: 'center',
      fontFamily: 'system-ui, sans-serif',
      padding: '24px'
    }}>
      <h1 style={{ fontSize: '48px', margin: '0 0 16px', color: '#0a7861' }}>404</h1>
      <h2 style={{ fontSize: '20px', margin: '0 0 12px', color: '#1a2a32' }}>Trang không tồn tại</h2>
      <p style={{ color: '#64748b', marginBottom: '24px' }}>Địa chỉ bạn truy cập không tồn tại hoặc đã được di chuyển.</p>
      <Link
        href="/"
        style={{
          display: 'inline-block',
          backgroundColor: '#0a7861',
          color: '#ffffff',
          padding: '10px 20px',
          borderRadius: '8px',
          textDecoration: 'none',
          fontWeight: 600
        }}
      >
        Về trang chủ
      </Link>
    </div>
  );
}
