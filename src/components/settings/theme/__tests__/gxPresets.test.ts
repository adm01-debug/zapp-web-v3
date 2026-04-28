/**
 * Bateria abrangente para os 9 skins inspirados no Opera GX.
 * Cobre: registry, surface palette dark roxa (#251F33), boost de glow,
 * transparência do glass, borderRadius angular, tipografia geométrica
 * (Rajdhani), e imunidade dos skins não-GX a esses overrides.
 */

import { describe, it, expect } from 'vitest';
import {
  PRESETS,
  CSS_VARS_TO_APPLY,
  STORAGE_KEY,
  DEFAULT_PRESET_ID,
  normalizeStoredPresetId,
  type ThemePreset,
  type ThemeModeColors,
} from '../presets';

const GX_IDS = [
  'gx-classic',
  'gx-pink-addiction',
  'gx-purple-haze',
  'gx-rose-quartz',
  'gx-ultraviolet',
  'gx-hackerman',
  'gx-frutti-di-mare',
  'gx-cyberpunk',
  'gx-razer',
] as const;

const NON_GX_IDS = [
  'corporate',
  'purpure',
  'emerald',
  'sunset',
  'rose',
  'minimal',
  'ocean',
  'amber',
  'cyber',
  'diversity',
] as const;

const gxPresets = (): ThemePreset[] =>
  GX_IDS.map((id) => PRESETS.find((p) => p.id === id)!);
const nonGxPresets = (): ThemePreset[] =>
  NON_GX_IDS.map((id) => PRESETS.find((p) => p.id === id)!);

const parseAlphaFromShadow = (shadow: string): number | null => {
  const match = shadow.match(/\/\s*([0-9.]+)\s*\)/);
  return match ? Number(match[1]) : null;
};

const parseHslAlpha = (val: string): number | null => {
  // ex: '265 22% 12% / 0.55'  →  0.55
  const m = val.match(/\/\s*([0-9.]+)\s*$/);
  return m ? Number(m[1]) : null;
};

const parseHslHue = (val: string): number | null => {
  // ex: '265 22% 12% / 0.55'  →  265
  const m = val.match(/^\s*(-?\d+(?:\.\d+)?)\b/);
  return m ? Number(m[1]) : null;
};

// ────────────────────────────────────────────────────────────────────
describe('PRESETS registry', () => {
  it('contém 19 skins no total', () => {
    expect(PRESETS).toHaveLength(19);
  });

  it('contém todos os 9 skins gx-*', () => {
    for (const id of GX_IDS) {
      expect(PRESETS.find((p) => p.id === id)).toBeDefined();
    }
  });

  it('mantém os 10 skins originais intactos no registry', () => {
    for (const id of NON_GX_IDS) {
      expect(PRESETS.find((p) => p.id === id)).toBeDefined();
    }
  });

  it('preserva unicidade de IDs', () => {
    const ids = PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cada preset expõe campos obrigatórios (id, name, description, emoji, swatches, light, dark)', () => {
    for (const p of PRESETS) {
      expect(typeof p.id).toBe('string');
      expect(p.id.length).toBeGreaterThan(0);
      expect(typeof p.name).toBe('string');
      expect(typeof p.description).toBe('string');
      expect(typeof p.emoji).toBe('string');
      expect(p.swatches).toHaveLength(4);
      expect(p.light).toBeDefined();
      expect(p.dark).toBeDefined();
    }
  });

  it('toda variável de CSS_VARS_TO_APPLY existe em light e dark de todo preset', () => {
    for (const p of PRESETS) {
      for (const key of CSS_VARS_TO_APPLY) {
        expect(
          p.light[key as keyof ThemeModeColors],
          `${p.id}.light.${key}`,
        ).toBeTruthy();
        expect(
          p.dark[key as keyof ThemeModeColors],
          `${p.id}.dark.${key}`,
        ).toBeTruthy();
      }
    }
  });
});

// ────────────────────────────────────────────────────────────────────
describe('Passo A — surface palette dark roxa (#251F33) nos GX', () => {
  // Hex #251F33 ≈ HSL(265, 24%, 16%); usamos família em torno do hue 265.
  const expectations = {
    background: '265 22% 8%',
    card: '265 22% 12%',
    'card-elevated': '265 18% 17%',
    popover: '265 22% 14%',
    muted: '265 18% 17%',
    input: '265 18% 17%',
    border: '265 18% 22%',
    'sidebar-background': '265 24% 10%',
    'sidebar-border': '265 18% 20%',
    'chat-header': '265 22% 12%',
    'chat-input-bg': '265 22% 14%',
    'chat-bubble-received': '265 18% 17%',
    elevated: '265 18% 17%',
    'elevated-hover': '265 18% 22%',
  } as const;

  it.each(GX_IDS)('aplica todas as cores de superfície dark roxas em "%s"', (id) => {
    const p = PRESETS.find((x) => x.id === id)!;
    for (const [key, expected] of Object.entries(expectations)) {
      expect(p.dark[key as keyof ThemeModeColors]).toBe(expected);
    }
  });

  it.each(GX_IDS)('substitui o gradient-surface dark por gradient roxo em "%s"', (id) => {
    const p = PRESETS.find((x) => x.id === id)!;
    expect(p.dark['gradient-surface']).toBe(
      'linear-gradient(180deg, hsl(265 22% 12%), hsl(265 24% 8%))',
    );
  });

  it('NÃO aplica surface palette roxa nos skins não-GX', () => {
    for (const p of nonGxPresets()) {
      // Skins não-GX usam famílias 240/220 etc. — nenhum deles tem 265 22% 8%
      expect(p.dark.background).not.toBe('265 22% 8%');
    }
  });
});

// ────────────────────────────────────────────────────────────────────
describe('Passo B — neon glow boost nos GX', () => {
  // Alphas alvo definidos no helper applyGxNeonGlow:
  // dark:   primary 0.7  | secondary 0.65 | accent 0.65 | purple 0.75
  // light:  primary 0.45 | secondary 0.4  | accent 0.45 | purple 0.5
  const darkAlphas = {
    'shadow-glow-primary': 0.7,
    'shadow-glow-secondary': 0.65,
    'shadow-glow-accent': 0.65,
    'shadow-glow-purple': 0.75,
  };
  const lightAlphas = {
    'shadow-glow-primary': 0.45,
    'shadow-glow-secondary': 0.4,
    'shadow-glow-accent': 0.45,
    'shadow-glow-purple': 0.5,
  };

  it.each(GX_IDS)('eleva alpha das sombras dark em "%s"', (id) => {
    const p = PRESETS.find((x) => x.id === id)!;
    for (const [key, expected] of Object.entries(darkAlphas)) {
      const actual = parseAlphaFromShadow(p.dark[key as keyof ThemeModeColors]);
      expect(actual).toBe(expected);
    }
  });

  it.each(GX_IDS)('eleva alpha das sombras light em "%s"', (id) => {
    const p = PRESETS.find((x) => x.id === id)!;
    for (const [key, expected] of Object.entries(lightAlphas)) {
      const actual = parseAlphaFromShadow(p.light[key as keyof ThemeModeColors]);
      expect(actual).toBe(expected);
    }
  });

  it('preserva offset/blur dos shadows ao trocar apenas o alpha', () => {
    const gx = PRESETS.find((p) => p.id === 'gx-classic')!;
    expect(gx.dark['shadow-glow-primary']).toMatch(/^0 4px 24px hsl\(/);
    expect(gx.light['shadow-glow-primary']).toMatch(/^0 4px 24px hsl\(/);
  });

  it('NÃO altera alpha dos shadows nos skins não-GX', () => {
    // Em buildPreset, dark.shadow-glow-primary usa /0.45, light usa /0.25
    for (const p of nonGxPresets()) {
      if (p.id === 'diversity') continue; // diversity tem overrides próprios
      expect(parseAlphaFromShadow(p.dark['shadow-glow-primary'])).toBe(0.45);
      expect(parseAlphaFromShadow(p.light['shadow-glow-primary'])).toBe(0.25);
    }
  });
});

// ────────────────────────────────────────────────────────────────────
describe('Passo C — glass translúcido tingido pela primária', () => {
  it.each(GX_IDS)('seta glass-bg dark em 0.55 em "%s"', (id) => {
    const p = PRESETS.find((x) => x.id === id)!;
    expect(p.dark['glass-bg']).toBe('265 22% 12% / 0.55');
    expect(parseHslAlpha(p.dark['glass-bg'])).toBe(0.55);
  });

  it.each(GX_IDS)('seta glass-bg light em 0.55 em "%s"', (id) => {
    const p = PRESETS.find((x) => x.id === id)!;
    expect(p.light['glass-bg']).toBe('0 0% 100% / 0.55');
  });

  it.each(GX_IDS)('tinge glass-border dark com a cor primária do skin "%s"', (id) => {
    const p = PRESETS.find((x) => x.id === id)!;
    const primaryHue = parseHslHue(p.dark.primary);
    const borderHue = parseHslHue(p.dark['glass-border']);
    expect(borderHue).toBe(primaryHue);
    // alpha 0.5 em dark
    expect(parseHslAlpha(p.dark['glass-border'])).toBe(0.5);
  });

  it.each(GX_IDS)('tinge glass-border light com a cor primária do skin "%s"', (id) => {
    const p = PRESETS.find((x) => x.id === id)!;
    const primaryHue = parseHslHue(p.light.primary);
    const borderHue = parseHslHue(p.light['glass-border']);
    expect(borderHue).toBe(primaryHue);
    expect(parseHslAlpha(p.light['glass-border'])).toBe(0.35);
  });

  it('NÃO mexe no glass dos skins não-GX (que tem alpha 1)', () => {
    for (const p of nonGxPresets()) {
      if (p.id === 'diversity') continue; // diversity faz overrides próprios
      expect(parseHslAlpha(p.dark['glass-bg'])).toBe(1);
    }
  });
});

// ────────────────────────────────────────────────────────────────────
describe('Passo D — borderRadius por preset (cantos retos nos GX)', () => {
  it.each(GX_IDS)('seta borderRadius=4 em "%s"', (id) => {
    const p = PRESETS.find((x) => x.id === id)!;
    expect(p.borderRadius).toBe(4);
  });

  it('skins não-GX não definem borderRadius (deixa o radius global do usuário)', () => {
    for (const p of nonGxPresets()) {
      expect(p.borderRadius).toBeUndefined();
    }
  });
});

// ────────────────────────────────────────────────────────────────────
describe('Passo E — tipografia geométrica (Rajdhani)', () => {
  it.each(GX_IDS)('seta font com Rajdhani em "%s"', (id) => {
    const p = PRESETS.find((x) => x.id === id)!;
    expect(p.font).toBeDefined();
    expect(p.font).toMatch(/Rajdhani/);
    // Mantém Outfit como fallback antes de system-ui
    expect(p.font).toMatch(/Outfit/);
    expect(p.font).toMatch(/system-ui/);
  });

  it.each(GX_IDS)('a font de "%s" é a mesma string compartilhada (single source of truth)', (id) => {
    const p = PRESETS.find((x) => x.id === id)!;
    expect(p.font).toBe(PRESETS.find((x) => x.id === 'gx-classic')!.font);
  });

  it('skins não-GX não definem font (usam o default global)', () => {
    for (const p of nonGxPresets()) {
      expect(p.font).toBeUndefined();
    }
  });
});

// ────────────────────────────────────────────────────────────────────
describe('Identidade de cor de cada skin GX', () => {
  // Cada skin GX precisa preservar a cor primária do tema oficial.
  const expectedHues: Record<string, number> = {
    'gx-classic': 347, // vermelho-rosa neon
    'gx-pink-addiction': 330,
    'gx-purple-haze': 265,
    'gx-rose-quartz': 345,
    'gx-ultraviolet': 271,
    'gx-hackerman': 127,
    'gx-frutti-di-mare': 182,
    'gx-cyberpunk': 55,
    'gx-razer': 113,
  };

  it.each(GX_IDS)('hue da cor primária de "%s" bate com o tema oficial', (id) => {
    const p = PRESETS.find((x) => x.id === id)!;
    expect(parseHslHue(p.light.primary)).toBe(expectedHues[id]);
    expect(parseHslHue(p.dark.primary)).toBe(expectedHues[id]);
  });

  it.each(GX_IDS)('preset "%s" gera 4 swatches únicos', (id) => {
    const p = PRESETS.find((x) => x.id === id)!;
    expect(p.swatches).toHaveLength(4);
    expect(new Set(p.swatches).size).toBe(4);
  });
});

// ────────────────────────────────────────────────────────────────────
describe('Imunidade total dos skins não-GX', () => {
  it('foreground dark dos skins não-GX permanece em #f7f7f8 (~0 0% 97%)', () => {
    for (const p of nonGxPresets()) {
      expect(p.dark.foreground).toBe('0 0% 97%');
    }
  });

  it('skins não-GX não recebem o gradient-surface roxo dos GX', () => {
    for (const p of nonGxPresets()) {
      expect(p.dark['gradient-surface']).not.toContain('265 22% 12%');
    }
  });
});

// ────────────────────────────────────────────────────────────────────
describe('Storage normalization', () => {
  it('um GX ID válido é preservado', () => {
    expect(normalizeStoredPresetId('gx-classic')).toBe('gx-classic');
    expect(normalizeStoredPresetId('gx-hackerman')).toBe('gx-hackerman');
  });

  it('null/undefined → default corporate', () => {
    expect(normalizeStoredPresetId(null)).toBe(DEFAULT_PRESET_ID);
    expect(normalizeStoredPresetId(undefined)).toBe(DEFAULT_PRESET_ID);
  });

  it('IDs deprecated (default, purpure) → corporate', () => {
    expect(normalizeStoredPresetId('default')).toBe(DEFAULT_PRESET_ID);
    expect(normalizeStoredPresetId('purpure')).toBe(DEFAULT_PRESET_ID);
  });

  it('ID desconhecido → corporate', () => {
    expect(normalizeStoredPresetId('does-not-exist')).toBe(DEFAULT_PRESET_ID);
  });

  it('STORAGE_KEY estável', () => {
    expect(STORAGE_KEY).toBe('theme-custom-colors');
  });
});
