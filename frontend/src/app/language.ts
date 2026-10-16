import { isLang, language, languages, onLanguage, setLanguage, startLanguage } from '../lib/i18n';

/** Loads the saved language before the shell is revealed, and fills the Language picker in Preferences. */
export function bindLanguage(): void {
  const select = document.getElementById('language-select') as HTMLSelectElement | null;
  if (select) {
    for (const [code, name] of languages()) {
      const option = document.createElement('option');
      option.value = code;
      option.textContent = name;
      select.append(option);
    }
    select.value = language();
    select.addEventListener('change', () => { if (isLang(select.value)) void setLanguage(select.value); });
    onLanguage(() => { if (select.value !== language()) select.value = language(); });
  }
  void startLanguage().finally(() => document.documentElement.classList.add('shell-ready'));
}
