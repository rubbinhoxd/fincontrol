import type { ReactNode } from 'react';

interface Props {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}

export default function PageContainer({ title, children, action }: Props) {
  return (
    <div className="flex-1 p-8" style={{ backgroundColor: 'var(--color-midnight-canvas)', minHeight: '100vh' }}>
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <h2
          className="text-3xl"
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 500,
            letterSpacing: '-0.02em',
            color: 'var(--color-paper-white)',
          }}
        >
          {title}
        </h2>
        {action}
      </div>
      {children}
    </div>
  );
}
