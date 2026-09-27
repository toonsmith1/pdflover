import React from 'react';
import * as Icons from 'lucide-react';

export default function Icon({ name, size = 20, className = '', strokeWidth = 1.75 }) {
  const Component = Icons[name] || Icons.FileText;
  return <Component size={size} className={className} strokeWidth={strokeWidth} />;
}
