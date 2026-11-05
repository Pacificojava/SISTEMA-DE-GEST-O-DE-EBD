const LOGO_PATHS = {
  igreja: '/public/assets/logos/logo-igreja.png',
  educacaoCrista: '/public/assets/logos/logo-educacao-crista.png',
  ebd: '/public/assets/logos/logo-ebd.png',
};

const LOGO_CONFIG = Object.freeze({
  igreja: {
    src: LOGO_PATHS.igreja,
    alt: 'Logo da Igreja',
    label: 'Igreja',
  },
  church: {
    src: LOGO_PATHS.ebd,
    alt: 'Logo principal da EBD',
    label: 'EBD',
  },
  educacaoCrista: {
    src: LOGO_PATHS.educacaoCrista,
    alt: 'Logo da Educação Cristã',
    label: 'Educação Cristã',
  },
  ebd: {
    src: LOGO_PATHS.ebd,
    alt: 'Logo principal da EBD',
    label: 'EBD',
  },
});

export { LOGO_CONFIG };

export function getLogoConfig(key) {
  return LOGO_CONFIG[key] ?? LOGO_CONFIG.ebd;
}

export function createLogoMarkup(key, className = 'report-logo') {
  const config = getLogoConfig(key);

  return `
    <div class="logo-tile ${className}" title="${config.label}">
      <img src="${config.src}" alt="${config.alt}" loading="eager" />
    </div>
  `;
}
