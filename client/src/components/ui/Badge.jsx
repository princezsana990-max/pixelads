import React from 'react';

const variantMap = {
  pending:   'badge-yellow',
  assigned:  'badge-blue',
  in_review: 'badge-orange',
  revision:  'badge-red',
  completed: 'badge-green',
  active:    'badge-green',
  blocked:   'badge-red',
  paid:      'badge-green',
  partial:   'badge-yellow',
  unpaid:    'badge-red',
  draft:     'badge-gray',
  admin:     'badge-orange',
  order_taker: 'badge-blue',
  editor:    'badge-green',
  present:   'badge-green',
  absent:    'badge-red',
  default:   'badge-gray',
};

export const Badge = ({ children, variant, className = '' }) => {
  const cls = variantMap[variant] || variantMap.default;
  return (
    <span className={`badge ${cls} ${className}`}>
      {String(children).replace(/_/g, ' ')}
    </span>
  );
};
