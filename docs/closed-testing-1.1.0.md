# 课猫 Echo 1.1.0 — closed testing checklist

`versionCode` 8 · `versionName` 1.1.0 · package `com.ayk.echo`

## Build the bundle (on your machine — needs the Android SDK and the `echo` keystore)

```bash
npm ci
npm run android:bundle
```

The AAB is `android/app/build/outputs/bundle/release/app-release.aab`. 1.1.0 bundles Whisper tiny (~41 MB) **and** Whisper base (~77 MB), so expect the download to be about 80 MB larger than 1.0.6. Play's limit for the base module is 200 MB.

## Play Console

1. Testing → Closed testing → create a track (for example “Friends in China”).
2. Testers: an email list or a Google Group. **A new personal developer account needs at least 12 testers opted in for 14 days in a row** before it can apply for production.
3. Upload the AAB. Release name `1.1.0 (8)`. Paste the release notes below.
4. Store listing → upload the new graphics: `docs/play-store/hi-res-icon-512.png`, `docs/play-store/feature-graphic-1024x500.png`, and the phone screenshots in `docs/play-store/phone/` (1080×2160).
5. Data safety: unchanged. Speech still never leaves the phone. The new haptics plugin adds the normal `VIBRATE` permission only.
6. Send testers the opt-in link. Testers in mainland China need Google Play working on their phone (usually a VPN).

## Release notes (paste into Play, under 500 characters each)

en-US:

```text
A new look: ink on rice paper, one red seal.
• Echo the cat now reacts — listens, thinks, cheers, naps, and dresses up for the festivals.
• A 很好 seal stamps the card when you say a line clearly.
• Tone colors on pinyin (Settings).
• Better Chinese scoring: traditional characters and sound-alikes now count.
• Accurate voice model (Whisper base) on the phone. Switch to Fast in Settings if it feels slow.
```

zh-CN:

```text
全新外观：宣纸、墨色和一枚红印章。
• 课猫会听、会想、会欢呼、会打盹，节日还会换装。
• 说清楚一句，卡片上会盖一个「很好」章。
• 拼音声调颜色（设置里可关）。
• 中文评分更准：繁体字和同音字也算对。
• 手机上用更准确的语音模型（Whisper base）；如果慢，可在设置里换成「快速」。
```

## What testers should try (and report)

| Check | What good looks like |
| --- | --- |
| First launch | Splash is the red seal cat on paper. Landing cat blinks and wags. |
| Say it, Chinese | Cat's ears perk up while listening, “…” while thinking, then a 很好 / 加油 stamp with a thud and a buzz. |
| Speed | Time from tapping Stop to the score. Over ~8 s on Accurate shows a one-time “Use Fast” hint — note the phone model. |
| Settings → Voice model | Fast and Accurate both work after switching. |
| Tone colors / Sounds & vibration | Each switch turns its feature off. |
| Dark theme | Settings → Theme → Dark. Everything readable. |
| Daily reminder | Still meows at the chosen time. |
| Leave the app idle ~40 s | The cat dozes (z z). Tapping it wakes it and plays the line. |
