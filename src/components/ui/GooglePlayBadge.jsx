/** Official-style Google Play store badge (GET IT ON Google Play). */
const BADGE_SRC = '/badges/google-play-badge.png';

export default function GooglePlayBadge({ className = '', size = 'md' }) {
  const height = size === 'sm' ? 40 : 48;

  return (
    <img
      src={BADGE_SRC}
      alt="Get it on Google Play"
      height={height}
      className={`inline-block w-auto object-contain transition-transform duration-200 hover:scale-[1.03] ${className}`}
      style={{ height, maxWidth: '100%' }}
      draggable={false}
    />
  );
}
