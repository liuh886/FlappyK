from pathlib import Path
import subprocess

MERGE_SHA = "d38f646303d81124dcac018b74e825a75ec5cc44"
BRANCH = "agent/revert-home-market-v2"


def run(*args: str) -> None:
    subprocess.run(args, check=True)


run("git", "config", "user.name", "github-actions[bot]")
run("git", "config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com")
run("git", "revert", "--no-commit", MERGE_SHA)

# Keep only one proven, non-visual hardening from the reverted work:
# reuse an already-linked stylesheet by href instead of injecting a duplicate.
pwa_path = Path("pwa.js")
pwa = pwa_path.read_text()
old_block = """    function ensureStylesheet(id, href) {\n        if (document.getElementById(id)) return;\n        const link = document.createElement('link');\n        link.id = id;\n        link.rel = 'stylesheet';\n        link.href = href;\n        document.head.appendChild(link);\n    }\n"""
new_block = """    function normalizeStylesheetPath(href) {\n        return href.replace(/^\\.\\//, '');\n    }\n\n    function findStylesheet(href) {\n        const suffix = `/${normalizeStylesheetPath(href)}`;\n        return Array.from(document.querySelectorAll('link[rel=\"stylesheet\"]'))\n            .find((link) => {\n                try {\n                    return new URL(link.href, window.location.href).pathname.endsWith(suffix);\n                } catch {\n                    return false;\n                }\n            }) || null;\n    }\n\n    function ensureStylesheet(id, href) {\n        let link = document.getElementById(id) || findStylesheet(href);\n        if (!link) {\n            link = document.createElement('link');\n            link.rel = 'stylesheet';\n            link.href = href;\n        }\n        link.id = id;\n        document.head.appendChild(link);\n        return link;\n    }\n"""
if old_block not in pwa:
    raise RuntimeError("Expected pre-merge ensureStylesheet block was not restored")
pwa_path.write_text(pwa.replace(old_block, new_block))

# Force existing PWA installs to refresh the restored shell instead of continuing
# to serve the rejected v22 homepage assets.
sw_path = Path("sw.js")
sw = sw_path.read_text()
sw = sw.replace("flappyk-app-v20", "flappyk-app-v23")
sw = sw.replace("flappyk-runtime-v20", "flappyk-runtime-v23")
if "home-market" in sw:
    raise RuntimeError("Rejected home-market assets remain in the rollback service worker")
sw_path.write_text(sw)

# Keep static validation aligned with the cache bump and assert the retained hardening.
test_path = Path("tests/pwa.test.js")
test_source = test_path.read_text()
test_source = test_source.replace("flappyk-app-v20", "flappyk-app-v23")
test_source = test_source.replace("flappyk-runtime-v20", "flappyk-runtime-v23")
test_source = test_source.replace("v20 offline cache checks passed", "v23 rollback cache checks passed")
anchor = "assert.ok(pwaSource.includes(\"ensureStylesheet('flappyk-market-weather-styles', './market-weather.css')\"));\n"
extra = (
    "assert.ok(pwaSource.includes('function normalizeStylesheetPath(href)'));\n"
    "assert.ok(pwaSource.includes('function findStylesheet(href)'));\n"
)
if anchor not in test_source:
    raise RuntimeError("Expected PWA validation anchor was not restored")
test_source = test_source.replace(anchor, extra + anchor)
test_path.write_text(test_source)

# The helper is intentionally one-shot and leaves no migration/fallback machinery behind.
Path("scripts/apply-home-rollback.py").unlink()
Path(".github/workflows/apply-home-rollback.yml").unlink()

run("git", "add", "-A")
run("git", "commit", "-m", "revert: restore previous FlappyK home")
run("git", "push", "origin", f"HEAD:{BRANCH}")
