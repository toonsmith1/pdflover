import React from 'react';
import { useI18n } from '../i18n/LanguageContext';

export default function Footer() {
  const { t } = useI18n();

  return (
    <footer>
      <span>{t('footer.tagline')}</span>
      <span>{t('footer.brand')}</span>
    </footer>
  );
}
