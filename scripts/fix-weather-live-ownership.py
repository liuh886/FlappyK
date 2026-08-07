from pathlib import Path
import subprocess

BRANCH = "agent/revert-home-market-v2"
path = Path("scripts/market-weather.js")
source = path.read_text()
old = """    function applyMetrics(metrics, options = {}) {\n        if (options.silent) clearWeatherEvent();\n"""
new = """    function applyMetrics(metrics, options = {}) {\n        if (options.source === 'live' && clockNow() < explicitWeatherUntil) {\n            return requestedWeather;\n        }\n        if (options.silent) clearWeatherEvent();\n"""
if old not in source:
    raise RuntimeError("Expected restored applyMetrics block not found")
path.write_text(source.replace(old, new, 1))

Path("scripts/fix-weather-live-ownership.py").unlink()
Path(".github/workflows/fix-weather-live-ownership.yml").unlink()

subprocess.run(["git", "config", "user.name", "github-actions[bot]"], check=True)
subprocess.run(["git", "config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"], check=True)
subprocess.run(["git", "add", "-A"], check=True)
subprocess.run(["git", "commit", "-m", "fix: preserve explicit weather boundary events"], check=True)
subprocess.run(["git", "push", "origin", f"HEAD:{BRANCH}"], check=True)
