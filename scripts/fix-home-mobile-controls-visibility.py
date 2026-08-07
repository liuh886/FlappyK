from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
css_path = ROOT / 'premium-ui-refinement.css'
css = css_path.read_text()
marker = '@media (prefers-reduced-motion: reduce) {'
rule = """/* Home never exposes gameplay controls, regardless of later gameplay/mobile rules. */
html[data-ui-state='home'] body #game-container #mobile-controls,
html[data-ui-state='home'] body #game-container #mobile-controls:not([hidden]),
html[data-ui-state='home'] body #game-container .controls-hint,
html[data-ui-state='home'] body #game-container #game-top-controls {
    display: none !important;
}

"""
if rule not in css:
    if marker not in css:
        raise RuntimeError('reduced-motion insertion marker missing')
    css = css.replace(marker, rule + marker, 1)
    css_path.write_text(css)

print('Locked gameplay controls out of the home state.')
