from pathlib import Path
import subprocess

BRANCH = "agent/revert-home-market-v2"
FILES = [
    "tests/home-story-contract.test.js",
    "tests/market-weather-contract.test.js",
    "tests/membership-contract.test.js",
    "tests/indicator-cards.test.js",
    "tests/web-composition-contract.test.js",
]

for name in FILES:
    path = Path(name)
    source = path.read_text()
    source = source.replace("flappyk-app-v20", "flappyk-app-v23")
    source = source.replace("flappyk-runtime-v20", "flappyk-runtime-v23")
    source = source.replace("PWA v20", "PWA v23")
    source = source.replace("v20 contracts passed", "v23 rollback contracts passed")
    source = source.replace("v20 cache contracts passed", "v23 rollback cache contracts passed")
    source = source.replace("v20 contracts validated", "v23 rollback contracts validated")
    path.write_text(source)

Path("scripts/fix-rollback-contracts.py").unlink()
Path(".github/workflows/fix-rollback-contracts.yml").unlink()

subprocess.run(["git", "config", "user.name", "github-actions[bot]"], check=True)
subprocess.run(["git", "config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"], check=True)
subprocess.run(["git", "add", "-A"], check=True)
subprocess.run(["git", "commit", "-m", "test: align restored home contracts with PWA v23"], check=True)
subprocess.run(["git", "push", "origin", f"HEAD:{BRANCH}"], check=True)
