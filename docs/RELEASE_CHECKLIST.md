# FlappyK v0.1.0 Release Checklist

## Release identity

- **Tag:** `v0.1.0`
- **Title:** `FlappyK v0.1.0 — First Playable Release`
- **Target branch:** `master`
- **Release type:** normal release
- **Build artifacts:** none; GitHub source archives are sufficient

## Required smoke tests

### Desktop

- [ ] Start the game in current Chrome or Edge.
- [ ] Buy, sell, and change speed with the arrow keys.
- [ ] Complete a level and verify Level Return, Total Return, Max DD, and Excess.
- [ ] Confirm `EXCESS = Level Return - underlying interval return`.
- [ ] Save a Profit Card and inspect the PNG.
- [ ] Complete all three markets and save the horizontal Legend image.

### Mobile

- [ ] Start the game in iOS Safari or Android Chrome.
- [ ] Verify BUY, SELL, slow, and speed-up controls.
- [ ] Confirm the settlement card fits the screen without clipping.
- [ ] Generate a Profit Card from a phone.
- [ ] Generate the vertical three-card Legend image.
- [ ] If the button changes to `TAP TO SHARE`, tap again and confirm the system share sheet opens.
- [ ] Cancel sharing once and confirm the button recovers correctly.

## Repository checks

- [x] README includes gameplay and local-run instructions.
- [x] Changelog includes the first public version.
- [x] Result metrics are defined.
- [x] Data sources and limitations are disclosed.
- [x] No build process or binary artifacts are required.
- [ ] Choose an open-source license, or intentionally publish without one.
- [ ] Confirm the bundled data may remain in the public release under applicable upstream terms.

## Suggested release notes

### FlappyK v0.1.0 — First Playable Release

FlappyK is a pixel-style blind-market arcade game. Trade an unidentified historical K-line, beat each cumulative-return checkpoint, and progress through Crypto, A-Shares, and US Stocks.

#### Highlights

- Complete three-market game loop
- Keyboard and mobile controls
- Profit Card and Market Legend exports
- Stable mobile PNG generation and native share support
- Level Return, Total Return, Max DD, and Excess metrics
- Excess measured against the underlying asset's natural move over the same interval

#### Notes

- Historical data is bundled for gameplay and is not a real-time feed.
- The project is not intended for investment decisions.
- Mobile share-sheet behavior varies by browser and operating system.
- No open-source license has been selected yet.

## Publish sequence

1. Merge the release-prep PR into `master`.
2. Run the desktop and mobile smoke tests above.
3. Open GitHub **Releases** and choose **Draft a new release**.
4. Create tag `v0.1.0` from the latest `master` commit.
5. Use the release title and notes above.
6. Verify the generated source-code ZIP contains `README.md`, `CHANGELOG.md`, `index.html`, and the game assets.
7. Publish the release.
