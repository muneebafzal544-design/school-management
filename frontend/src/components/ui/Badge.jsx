import { STATUS_STYLES, GENDER_STYLES } from '../../constants';

/**
 * Generic badge.
 * @param {'status'|'gender'|'custom'} type
 */
export default function Badge({ children, type = 'custom', value, className = '' }) {
  let styles = '';

  if (type === 'status') {
    styles = STATUS_STYLES[value] || STATUS_STYLES.inactive;
  } else if (type === 'gender') {
    styles = GENDER_STYLES[value] || '';
  }

  return (
    <span
      className={[
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border capitalize',
        styles,
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}
