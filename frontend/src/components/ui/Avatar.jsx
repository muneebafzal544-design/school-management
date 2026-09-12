import { getInitials, pickGradient } from '../../utils';
import { AVATAR_GRADIENTS } from '../../constants';

/**
 * Avatar with gradient background derived from entity id.
 * @param {string}         name
 * @param {number}         id
 * @param {'sm'|'md'|'lg'} size
 */
export default function Avatar({ name, id, size = 'md' }) {
  const initials = getInitials(name);
  const [from, to] = pickGradient(id, AVATAR_GRADIENTS);

  const sz = {
    sm: 'w-7 h-7 text-[10px]',
    md: 'w-9 h-9 text-xs',
    lg: 'w-11 h-11 text-sm',
    xl: 'w-14 h-14 text-base',
  }[size];

  return (
    <div
      className={`${sz} rounded-xl font-bold text-white flex items-center justify-center shrink-0 shadow-sm`}
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      {initials}
    </div>
  );
}
