import React from 'react';
import { getBadgeBackgroundColor } from '../utils/chatUtils.jsx';

const Badge = ({ badge }) => {
  const isSubscriber = badge.name.toLowerCase().includes('subscriber');
  return isSubscriber ? (
    <img src={badge.url} alt={badge.name} className="w-6 h-6 inline-block align-middle mr-1" />
  ) : (
    <span
      className="inline-flex items-center gap-1.5 p-1 rounded-bubble mr-1 align-middle"
      style={{ backgroundColor: getBadgeBackgroundColor(badge) }}
    >
      <img src={badge.url} alt={badge.name} className="w-3 h-3" />
    </span>
  );
};

export default Badge;