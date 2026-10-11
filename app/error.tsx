'use client';
import {useEffect} from 'react';
import Link from 'next/link';
import {AlertTriangle,RefreshCw,ArrowRight} from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Lỗi ứng dụng:', error);
  }, [error]);

  const isConfigError =
    error.message?.includes('RND_ALLOW_PUBLIC_ACCESS') ||
    error.message?.includes('credentials') ||
    error.message?.includes('Supabase');

  return (
    <div style={{
      maxWidth: '720px',
      margin: '48px auto',
      padding: '32px',
      backgroundColor: '#ffffff',
      borderRadius: '16px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#1a2a32',
      border: '1px solid #e2e8f0'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#c53030', marginBottom: '16px' }}>
        <AlertTriangle size={32} />
        <h2 style={{ margin: 0, fontSize: '22px' }}>Chưa hoàn tất cấu hình triển khai</h2>
      </div>

      <div style={{
        backgroundColor: '#fff5f5',
        border: '1px solid #fed7d7',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '20px',
        fontSize: '14px',
        color: '#9b2c2c'
      }}>
        <strong>Nguyên nhân:</strong> {error.message || 'Thiếu biến môi trường cấu hình Supabase trên Vercel.'}
        {error.digest && <div style={{ fontSize: '12px', color: '#718096', marginTop: '4px' }}>Mã lỗi Digest: {error.digest}</div>}
      </div>

      {isConfigError && (
        <div style={{ fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
          <p>Trên môi trường Production của <strong>Vercel</strong>, bạn cần thêm các biến môi trường sau vào <strong>Project Settings → Environment Variables</strong>:</p>
          <div style={{
            backgroundColor: '#1e293b',
            color: '#f8fafc',
            padding: '14px 16px',
            borderRadius: '8px',
            fontFamily: 'monospace',
            fontSize: '13px',
            marginBottom: '16px'
          }}>
            <div>NEXT_PUBLIC_SUPABASE_URL = https://your-project.supabase.co</div>
            <div>SUPABASE_SERVICE_ROLE_KEY = your-service-role-key</div>
            <div>RND_ALLOW_PUBLIC_ACCESS = true</div>
          </div>
          <p style={{ color: '#4a5568' }}>
            <em>* Lưu ý: Biến <code>RND_ALLOW_PUBLIC_ACCESS=true</code> là bắt buộc để mở chế độ dùng thử trực tiếp (không cần tài khoản đăng nhập) trên Vercel. Sau khi thêm biến môi trường, hãy bấm <strong>Redeploy</strong> lại dự án trên Vercel.</em>
          </p>
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          onClick={() => reset()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#0a7861',
            color: '#ffffff',
            padding: '10px 18px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '14px'
          }}
        >
          <RefreshCw size={16} /> Thử tải lại trang
        </button>

        <Link
          href="/demo"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#edf2f7',
            color: '#2d3748',
            padding: '10px 18px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '14px'
          }}
        >
          Trải nghiệm trang Demo độc lập <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
