export const formatCurrency = (amount) => {
  const num = Number(amount || 0);
  return `Rs. ${num.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatDate = (dateString) => {
  if (!dateString) return '-';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const formatTime = (dateString) => {
  if (!dateString) return '-';
  const d = new Date(dateString);
  return d.toLocaleTimeString('en-PK', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatDateTime = (dateString) => {
  if (!dateString) return '-';
  return `${formatDate(dateString)} at ${formatTime(dateString)}`;
};

export const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

/**
 * Strips internal system markers (e.g. <!--AD_TRACKING:...--> and <!--ORDER_TYPE:...-->)
 * from notes so users only see clean, human-readable remarks.
 */
export const formatCleanNotes = (notes) => {
  if (!notes || typeof notes !== 'string') return '';
  if (notes === '__DELETED_ARCHIVE__') return '';
  return notes
    .replace(/<!--AD_TRACKING:(\{.*?\})-->/g, '')
    .replace(/<!--ORDER_TYPE:(.*?)-->/g, '')
    .trim();
};

/**
 * Human-friendly label for order types
 */
export const formatOrderType = (type) => {
  const map = {
    video_editing: 'Video Editing',
    graphic_design: 'Graphic Design',
    motion_graphics: 'Motion Graphics',
    social_media_ads: 'Social Media Ads',
    reels_tiktok: 'Reels / Shorts / TikTok',
    youtube_video: 'YouTube Full Video',
    voiceover_audio: 'Voiceover & Audio',
    other: 'Custom / Other'
  };
  return map[type] || (type ? type.replace(/_/g, ' ') : 'Video Editing');
};
