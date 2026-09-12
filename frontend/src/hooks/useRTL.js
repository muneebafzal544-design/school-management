import { useEffect } from 'react';

const RTL_LANGS = ['ar', 'ur', 'he', 'fa', 'ps'];

/**
 * Applies `dir="rtl"` to `<html>` and a `rtl` class to `<body>` when
 * the active locale is a right-to-left language (Arabic, Urdu, etc.).
 *
 * Usage:
 *   useRTL(currentLocale);   // e.g. 'ur', 'en', 'ar'
 */
export function useRTL(locale = 'en') {
  const isRTL = RTL_LANGS.includes(locale?.toLowerCase?.()?.slice(0, 2));

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    if (isRTL) {
      html.setAttribute('dir', 'rtl');
      html.setAttribute('lang', locale);
      body.classList.add('rtl');
    } else {
      html.setAttribute('dir', 'ltr');
      html.setAttribute('lang', locale || 'en');
      body.classList.remove('rtl');
    }
  }, [locale, isRTL]);

  return isRTL;
}

export default useRTL;
