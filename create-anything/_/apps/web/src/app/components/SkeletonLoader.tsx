import React from 'react';

interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '20px',
  borderRadius = '4px',
  className = '',
  style = {},
}) => {
  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] ${className}`}
      style={{
        width,
        height,
        borderRadius,
        animation: 'shimmer 2s infinite',
        ...style,
      }}
    />
  );
};

export const DiscoveryCardSkeleton: React.FC = () => {
  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: '24px',
        overflow: 'hidden',
        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
        maxWidth: '500px',
        margin: '0 auto',
      }}
    >
      <Skeleton height="500px" borderRadius="0" />
      
      <div style={{ padding: '1.5rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <Skeleton width="60%" height="28px" />
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <Skeleton width="40%" height="20px" />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <Skeleton width="80%" height="16px" />
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <Skeleton width="80px" height="32px" borderRadius="16px" />
          <Skeleton width="100px" height="32px" borderRadius="16px" />
          <Skeleton width="90px" height="32px" borderRadius="16px" />
        </div>
      </div>
      
      <div
        style={{
          padding: '1rem',
          textAlign: 'center',
          borderTop: '1px solid #F3F4F6',
        }}
      >
        <Skeleton width="200px" height="16px" style={{ margin: '0 auto' }} />
      </div>
    </div>
  );
};

export const ProfileSkeleton: React.FC = () => {
  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        <Skeleton
          width="120px"
          height="120px"
          borderRadius="50%"
          style={{ margin: '0 auto 1rem' }}
        />
        <Skeleton width="200px" height="32px" style={{ margin: '0 auto 0.5rem' }} />
        <Skeleton width="150px" height="20px" style={{ margin: '0 auto' }} />
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <Skeleton width="120px" height="24px" style={{ marginBottom: '0.75rem' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
          <Skeleton height="140px" borderRadius="12px" />
          <Skeleton height="140px" borderRadius="12px" />
          <Skeleton height="140px" borderRadius="12px" />
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <Skeleton width="100px" height="24px" style={{ marginBottom: '0.75rem' }} />
        <Skeleton width="100%" height="100px" borderRadius="12px" />
      </div>

      <div>
        <Skeleton width="140px" height="24px" style={{ marginBottom: '0.75rem' }} />
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Skeleton width="100px" height="32px" borderRadius="16px" />
          <Skeleton width="120px" height="32px" borderRadius="16px" />
          <Skeleton width="90px" height="32px" borderRadius="16px" />
          <Skeleton width="110px" height="32px" borderRadius="16px" />
        </div>
      </div>
    </div>
  );
};

// Add the shimmer animation to global styles
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shimmer {
      0% {
        background-position: -200% 0;
      }
      100% {
        background-position: 200% 0;
      }
    }
  `;
  document.head.appendChild(style);
}
