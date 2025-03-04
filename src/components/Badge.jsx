import React from 'react';
import { getBadgeBackgroundColor } from '../utils/chatUtils.jsx';

const Badge = ({ badge, size }) => {
  const isSubscriber = badge.name.toLowerCase().includes('subscriber');
  return isSubscriber ? (
    <img src={badge.url} alt={badge.name} className={`${size === 'big' ? 'w-7 h-7' : 'w-6 h-6'} inline-block align-middle mr-1`} />
  ) : (
    <span
      className={`inline-flex items-center gap-1.5 p-1 rounded-bubble mr-1 align-middle`}
      style={{ backgroundColor: getBadgeBackgroundColor(badge) }}
    >
      <img src={badge.url} alt={badge.name} className={`${size === 'big' ? 'w-5 h-5' : 'w-3 h-3'}`} />
    </span>
  );
};

export default Badge;