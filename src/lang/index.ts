import Translate from 'i18n';
import path from 'path';
import env from '@config/env.config';

Translate.configure({
  locales: ['en', 'id'],
  defaultLocale: env.appLang,
  directory: path.join(__dirname, 'locales'),
});

export default Translate;
