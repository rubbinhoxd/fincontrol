import type { ReactNode } from 'react';

interface Props {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}

export default function PageContainer({ title, children, action }: Props) {
  return (
    <div className="flex-1 p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}
