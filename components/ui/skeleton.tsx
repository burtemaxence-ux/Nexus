export function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-md ${className}`}
      style={{ backgroundColor: 'var(--border)', ...style }}
    />
  )
}
