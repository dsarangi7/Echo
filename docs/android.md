# 课猫 Echo for Android

A Capacitor shell around the same Vite build as the website. Application id: `com.ayk.echo`.

The shell is Android-only. There is no iOS project in this change.

Colleagues install a release-signed APK (sideload or an internal share). Version **1.0.1** (`versionCode` 2). The phone delivers local notifications while the app is closed:

- **Test meow** about one minute after the reminder is turned on, so a new install can be checked immediately.
- **Daily reminder** at the saved **phone-local** time. Title `课猫 Echo`, body `Time to practice. 该练一句了。`
- **Monday streak summary** on the phone's Monday at that same local time. Body `You practiced N days this week — keep the streak.` plus `这周你练了 N 天——保持连续打卡。`

`time` in `echo-practice-reminder` is 24-hour `HH:MM` on the device clock. Capacitor schedules it with `on: { hour, minute }`, which is already device-local. The app does **not** convert that clock to Asia/Shanghai. A phone set to China time still matches Shanghai wall time. A phone in another timezone rings at the time on that phone.

The **day count** is always the `Asia/Shanghai` calendar. The Monday sentence uses the Shanghai week that will have just ended when that local Monday alarm fires. Opening the app, or getting a Clear or Partial Say-it, rewrites that sentence.

The channel is `echo-practice-v2` (`IMPORTANCE_HIGH`, public visibility). 1.0.0 created `echo-practice` without a custom sound; Android will not change a channel's sound after it exists, so 1.0.1 uses a new channel. The sound is an original one-second meow, `res/raw/echo_meow.wav` (see `scripts/echo-meow.py`). Alarms set `allowWhileIdle` and require an exact alarm.

## Why 1.0.0 stayed silent

The 1.0.0 card saved `enabled: true` before `LocalNotifications.schedule` finished. If notification permission was missing, or Android 12+ refused exact alarms, `schedule` threw or fell back to an inexact alarm and the `catch` reported `"off"`. The card only turned the switch off for `"denied"`, so the reminder looked on and nothing rang. The manifest also did not declare `POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM`, or `USE_EXACT_ALARM` on the app itself (the plugin manifest is not a substitute when the schedule call is swallowed).

1.0.1 asks for notification permission first. On Android 12+ it checks exact alarms and opens the system page when they are off. If either is denied, the switch stays **off** and the card says so in English and 中文, including where to turn it back on. Only a successful schedule sets `enabled: true`.

## Install check

1. This 1.0.1 APK is signed with the same `echo` certificate as 1.0.0 (`SHA-256` `9E:AA:B4:7F:55:B6:83:5B:92:68:14:FF:3D:F2:3A:D0:ED:85:3C:34:10:EB:FD:1C:3F:CD:D1:31:1D:64:C4:AF`). Install over the existing app; do not uninstall first, or the reminder settings stored in the app are wiped.
2. Open Reminders and turn the daily reminder on. Allow notifications when Android asks.
3. On Android 12+, if Alarms & reminders is off, the system page opens. Allow it, then turn the switch on again. The card stays off and explains this until that grant exists.
4. About one minute later, a notification should meow: `Reminder is on. 提醒已打开。`
5. `adb` checks, with the phone connected:

```bash
adb install -r echo-release.apk
adb shell dumpsys package com.ayk.echo | grep -E 'versionName|versionCode|POST_NOTIFICATIONS|SCHEDULE_EXACT_ALARM|USE_EXACT_ALARM'
adb shell appops get com.ayk.echo SCHEDULE_EXACT_ALARM
adb shell dumpsys notification --noredact | grep -A 20 com.ayk.echo
```

`versionName` should be `1.0.1` and `versionCode` `2`. After the switch is on, a pending notification with id `91003` (the test), `91001` (daily), and `91002` (Monday) should be listed. If the meow never arrives, set Battery to Unrestricted for 课猫 Echo. Some OEM skins kill exact alarms otherwise.

The weekly alert repeats on the phone's Monday at that same time. Its count is the Shanghai week that will have just ended. The words are the same ones the website uses (`dailyNudgeCopy` / `weeklyNudgeCopy`).

## Streak

A Shanghai calendar day counts when that day has **at least one Clear or Partial Say-it**. A miss does not count. Mic unsure (`recognition_fail`) does not count.

The week is Monday 00:00 through Sunday 23:59 in `Asia/Shanghai`. The streak is the run of counted days ending today, or ending yesterday if today has no counted Say-it yet. It breaks after one full missed Shanghai day.

This is separate from the visit stars in the session strip (`echo-session-tally` in `sessionStorage`). Those reset when the tab closes and only move on Clear.

## Storage keys

The shell reads and writes the website’s keys. Chrome on the phone and the installed app still have separate WebView storage. The names and JSON match, so Chan UI uses one code path.

### `echo-practice-streak`

```json
{ "current": 2, "best": 4, "lastPracticeDay": "2026-10-07", "practiceDays": ["2026-10-06", "2026-10-07"] }
```

Code: `src/practice/streak.ts`. Say-it calls `recordPracticeClearOrPartial`.

### `echo-practice-reminder`

```json
{ "enabled": true, "time": "20:00", "lastDailyDay": null, "lastWeeklyWeekStart": "2026-09-28" }
```

`time` is 24-hour `HH:MM` on the device clock. It is not an Asia/Shanghai wall time. One switch covers the daily nudge and the Monday summary. Code: `src/practice/reminder.ts` and `src/native/reminderPlan.ts`. The Reminders card calls `armNativeReminder` on Android, which requests notification permission and exact alarms before `saveReminderSettings` sets `enabled: true`. The website still uses `enableDailyReminder` / `disableDailyReminder`.

An earlier Android build wrote `echo-practice-days` and `echo-reminder-prefs`. If those are present and the web keys are still empty, the shell copies them once and deletes the old keys. A web record that is already there is left as-is.

Notification ids: daily `91001`, Monday `91002`, one-minute test `91003`. Channel `echo-practice-v2` (1.0.0's `echo-practice` is deleted on the next schedule). The test-meow flag is `echo-reminder-test-fired`.

## Build a release APK

Requirements: Node 22, JDK 21, Android SDK platform 36 and build-tools. `JAVA_HOME` must point at JDK 21. `ANDROID_HOME` must point at the SDK.

From the repo root:

```bash
npm ci
```

Put the release keystore at `android/keystore/echo-release.keystore` and either:

- copy `android/keystore/keystore.properties.example` to `android/keystore/keystore.properties` and fill the passwords, or
- export the variables in the next section (they override the properties file).

Then:

```bash
npm run android:release
```

That command builds the web app with `CAPACITOR=1` (base `/`, no service worker), syncs it into the Android project, and runs `./gradlew assembleRelease`.

The signed APK is:

```text
android/app/build/outputs/apk/release/app-release.apk
```

`CAPACITOR=1` is what selects base `/`. GitHub Pages stays `/Echo/` because that workflow sets `VITE_BASE=/Echo/` and does not set `CAPACITOR`. An explicit `VITE_BASE` still wins over `CAPACITOR`.

Install on a device: copy the APK over, allow install from that source, open the file. Android will ask for notifications and, on Android 12+, for exact alarms the first time a reminder is turned on. Say-it asks for the microphone.

`npm test` and `npm run build` stay the website checks. They do not need the Android SDK.

## Keystore backup (Dibya)

Sign every release with the **same** keystore. A new key cannot update an install of `com.ayk.echo`; people would have to uninstall first.

| Item | Value |
| --- | --- |
| File name | `echo-release.keystore` |
| Format | PKCS12 (one password for the store and the key) |
| Alias | `echo` |
| Key | RSA 2048, validity 10000 days |
| Certificate subject | `CN=AYK Echo, OU=AYK, O=AYK, L=Shanghai, ST=Shanghai, C=CN` |
| SHA256 fingerprint | `9E:AA:B4:7F:55:B6:83:5B:92:68:14:FF:3D:F2:3A:D0:ED:85:3C:34:10:EB:FD:1C:3F:CD:D1:31:1D:64:C4:AF` |
| Gitignored path | `android/keystore/echo-release.keystore` |
| Gitignored passwords | `android/keystore/keystore.properties` |
| Example (no secrets) | `android/keystore/keystore.properties.example` |

Passwords are not in git. PKCS12 keeps a single password; set `ECHO_KEYSTORE_PASSWORD` and `ECHO_KEY_PASSWORD` to that same value. Gradle reads the environment when those variables are set, otherwise `keystore.properties`:

| Variable | Properties field |
| --- | --- |
| `ECHO_KEYSTORE_FILE` | `storeFile` (default `keystore/echo-release.keystore`, relative to `android/`) |
| `ECHO_KEYSTORE_PASSWORD` | `storePassword` |
| `ECHO_KEY_ALIAS` | `keyAlias` (default `echo`) |
| `ECHO_KEY_PASSWORD` | `keyPassword` |

Vault **both** the keystore file and the two passwords. The agent run that created the first keystore also left copies for that handoff:

- `echo-release.keystore` in the run artifacts
- `KEYSTORE-VAULT.txt` in the run artifacts (passwords; not linked from the public PR)

Store those in the vault, then delete extra copies you do not need. Do not commit either file.

1.0.1 is signed with that same key. The published APK certificate SHA-256 is `9E:AA:B4:7F:55:B6:83:5B:92:68:14:FF:3D:F2:3A:D0:ED:85:3C:34:10:EB:FD:1C:3F:CD:D1:31:1D:64:C4:AF`, so an installed 1.0.0 updates in place.

Confirm a backup before you rely on it:

```bash
keytool -list -keystore android/keystore/echo-release.keystore -alias echo
```

`keytool` asks for the store password and prints the certificate fingerprint. Write that fingerprint down next to the vault entry so a later file can be checked against it.

### If the keystore is lost

Installed apps cannot take an update signed with a different key. Generate a replacement only when you accept that colleagues must uninstall `com.ayk.echo` first:

```bash
mkdir -p android/keystore
keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore android/keystore/echo-release.keystore \
  -alias echo \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass "$ECHO_KEYSTORE_PASSWORD" \
  -keypass "$ECHO_KEY_PASSWORD" \
  -dname "CN=AYK Echo, OU=AYK, O=AYK, L=Shanghai, ST=Shanghai, C=CN"
```

Pick new passwords, put them in the vault, and write `keystore.properties` from the example (or export the variables). Then run `npm run android:release` again.

## What the APK does not do

It does not ship an iOS build. It does not sync practice days with the browser on the same phone. It does not run a background job that recomputes the weekly sentence while the app stays closed; the sentence updates the next time Echo opens or a Clear / Partial is saved.
