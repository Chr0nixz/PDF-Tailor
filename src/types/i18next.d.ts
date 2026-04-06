import 'i18next';
import type zh from '../i18n/locales/zh.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: typeof zh;
    };
  }
}
