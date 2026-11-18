# Play Console listing draft — 课猫 Echo

Draft for the owner to paste into Play Console. Nothing in this file was submitted. Do not create a merchant profile from this draft.

Package name stays `com.ayk.echo`. Version for this first upload, unless you bump it first: `versionCode` **6**, `versionName` **1.0.5**. Play has not hosted this package, so that version is accepted. `main` is ahead of the sideload tag `android-1.0.5` (word decks, class sets, the 天 family). An installed sideload 1.0.5 will not upgrade to this bundle until `versionCode` is higher, and only if Play signs with the same certificate. See the questions at the end.

## App identity

| Field | Value |
| --- | --- |
| App name | 课猫 Echo |
| Name length | 7 characters. Play’s limit is 30. |
| Package / applicationId | `com.ayk.echo` |
| Default language | English (United States). A 中文 listing is below if you add zh-CN. |
| App or game | App |
| Free or paid | Free. No in-app products. |
| Category | Education |
| Tags | Pick what the console offers. Closest fits: language learning, education. Do not add a tag the form does not list. |
| Contact email | dsarangi7@gmail.com |
| Privacy policy | https://dsarangi7.github.io/Echo/privacy/ |
| Delete data URL | https://dsarangi7.github.io/Echo/delete-data/ |
| Store website | https://dsarangi7.github.io/Echo/ |
| Developer name (already on the account) | Physicist_who_develops |
| Developer site (already on the account) | https://dibya-portfolio-jet.vercel.app/ |

The account phone is already on the Play Console account. This draft does not copy it into the public listing or the privacy policy.

The privacy page is `public/privacy/index.html`. GitHub Pages publishes it only after this change is on `main` (the Pages workflow). The same file is also at https://echo-psi-ashen.vercel.app/privacy/ after Vercel deploys that commit. Paste a URL into Play only after it loads. Until then the page is in the repo at that path.

Play’s Delete data URL is https://dsarangi7.github.io/Echo/delete-data/ (`public/delete-data/index.html`). After Vercel deploys the same commit it is also at https://echo-psi-ashen.vercel.app/delete-data/. Use the github.io URL in Play. A `mailto:` address is not a valid Delete data URL. Paste it only after the page loads.

## Short description

80 characters maximum. Count letters, spaces, and punctuation. Each Chinese character counts as one.

English (72):

```text
Hear it and Say it. Practice English and Chinese out loud on your phone.
```

中文 (22):

```text
听一句，说一句。在这台手机上练习英语和中文。
```

## Full description

English (United States):

```text
课猫 Echo is speaking practice for English and Chinese. One card at a time. Hear the line, then say it.

Hear it plays a recording of the sentence. Say it listens with the microphone and marks the words or syllables you matched. Scoring is a count of those matches, not an accent grade. The speech model runs on your phone. Practice audio is not uploaded.

English cards are office lines: meetings, email, the factory, quality, and orders. Chinese cards are work lines, plus Meituan delivery, taxi rides, and class sets for a tea house, online shopping, a shop, and the supermarket. Chinese cards show tone-marked pinyin.

Word decks sit in the top bar. English has an Office words deck: five words each Shanghai day, with the meaning, one example, Hear it, and Say it. Chinese has a 天 family timeline.

Translate is optional and needs a network. The sentence you type, or the text of a line you speak, is sent to MyMemory for the translation. Practice itself does not send that sentence. There is no account.

A daily reminder and a Monday streak summary can ring at the time you pick, on this phone. The streak is counted in the Asia/Shanghai calendar. Reminders stay off until you turn them on and allow notifications. On Android 12 and later, Alarms & reminders must also be allowed.

Settings holds the reminder, light or dark theme, a microphone note, the feedback address, and the privacy policy.

课猫 Echo is free. No ads. No sign-in.
```

中文 (zh-CN), if you add a translation:

```text
课猫 Echo 用来练习英语和中文口语。一次一张卡片。先听，再说。

「听一听」播放这一句的录音。「说一说」用麦克风听你读，并标出对上的词或音节。分数是对上的个数，不是口音打分。语音模型在你的手机上运行。练习录音不会上传。

英语卡片是办公室用语：会议、邮件、工厂、质量和订单。中文卡片是工作用语，加上美团外卖、打车，以及茶馆、网购、商店和超市的课堂句子。中文卡片显示带声调的拼音。

单词卡在顶栏。英语有办公词汇：每个上海日五张，带中文意思、一个例句、听一听和说一说。中文有「天」字族时间线。

翻译是可选的，需要网络。你打出的句子，或说完后转成的文字，会发给 MyMemory 做翻译。练习本身不发送这句话。没有账号。

可以在你选定的时间响每日提醒，并在周一做连续天数小结。连续天数按亚洲/上海日历计算。你打开提醒并允许通知之后才会响。Android 12 及以后还要允许「闹钟和提醒」。

设置里有提醒、深色或浅色、麦克风说明、反馈邮箱和隐私政策。

课猫 Echo 免费。没有广告。不用登录。
```

## Graphics

Play’s rules, from [Add preview assets](https://support.google.com/googleplay/android-developer/answer/9866151):

| Asset | Spec | What to upload |
| --- | --- | --- |
| Hi-res icon | 512×512 PNG, 32-bit (alpha), sRGB, up to 1024 KB. Full square. No rounded mask, no drop shadow baked as a fake icon shape. | `docs/play-store/hi-res-icon-512.png`. Same pixels as `public/icons/icon-512.png`, with an opaque alpha channel added so the file is 32-bit. The source icon is 24-bit RGB. `public/icons/icon-maskable-512.png` is the maskable PWA icon, not the store icon. |
| Feature graphic | Exactly 1024×500, JPEG or 24-bit PNG, no alpha. Required to publish. | `docs/play-store/feature-graphic-1024x500.png`, cropped from the existing `public/og.png` (1200×630). It is the same cat, name, and “Hear it · Say it” line. It is not a screenshot of a screen the app does not have. |
| Phone screenshots | At least 2, up to 8. JPEG or 24-bit PNG, no alpha. Each side 320–3840 px. The long side at most twice the short side. For recommendation slots, provide at least 4 at 1080×1920 (9:16) or larger. | Six real UI captures, 1080×1920, in `docs/play-store/phone/`. No device frame and no marketing caption were added. |
| 7-inch and 10-inch tablets | Optional for a first publish if you only fill phone screenshots (Play asks for at least two screenshots in total). Large-screen slots want 9:16 or 16:9, from 1080 px. Minimum 4 if you choose to fill a tablet or Chromebook section. | Not required for the phone listing. The same UI can be captured later at a wide window if you turn those form factors on. |
| Promo video | Optional. | None. Do not invent one. |

Phone files, in this order:

1. `docs/play-store/phone/01-landing.png` — cat landing, Start.
2. `docs/play-store/phone/02-practice-en.png` — English practice card.
3. `docs/play-store/phone/03-practice-zh.png` — Chinese practice card with pinyin.
4. `docs/play-store/phone/04-translate.png` — Translate.
5. `docs/play-store/phone/05-word-deck.png` — Office words deck.
6. `docs/play-store/phone/06-settings.png` — Settings: daily reminder, theme, and the start of Help. The privacy link is the next row in that sheet.

They were taken from the running web UI at a 360×640 CSS viewport (the phone layout) and a scale of 3, so the PNG is 1080×1920. The model-download card was dismissed with Hear it first when it appeared. That card is a real screen; it is not in this set because the practice card is the core loop.

## Data safety

Answers below match the code and the manifest in this repo. They are conservative. If a Play checkbox uses different wording, use the finding, not a looser reading.

Does the app collect or share any of the required user data types? **Yes.** Translate sends a sentence off the device. On-device practice data can also leave the phone if the user has Android backup on.

Is all of the user data collected by your app encrypted in transit? **Yes.** Translate uses HTTPS. Android backup uses Google’s transport.

Do you provide a way for users to request that their data is deleted? **Yes.** Delete data URL: https://dsarangi7.github.io/Echo/delete-data/ (https page, not a mailto). There is no account. Uninstalling, or clearing site data, deletes what the app stored. The page also lists dsarangi7@gmail.com as a contact for help. Sentences already sent to MyMemory are not held by the developer; MyMemory’s terms describe their own retention.

Do you want to add a privacy policy? **Yes.** URL above. The in-app link is Settings → Privacy.

### Data types to declare

**App activity → Other user-generated content** (the Translate sentence)

- Collected: yes. Shared: yes, with MyMemory / Translated (`api.mymemory.translated.net`).
- Processed ephemerally: no. Their terms say submitted segments can be stored long term. The app does not keep a copy.
- Optional: yes. Practice and word decks never send it. The user can ignore Translate.
- Purpose: App functionality only. Not advertising, not analytics, not tracking.
- What is sent: the sentence (max 500 characters) and `langpair` (`en|zh-CN` or `zh-CN|en`). No cookies. No MyMemory account. The optional `de` developer email is not set in the current public website bundle or in the Android build.

**App activity → App info and performance, or the practice records** (streak, reminder time, card index, word-deck progress, language, theme)

- These live in `localStorage`, `sessionStorage`, and IndexedDB on the device. The developer has no server that receives them.
- Declare them as collected **because** `android:allowBackup="true"` lets Android backup copy WebView data to the user’s Google account. Shared with the developer: no. Shared with Google only as that user’s backup.
- Purpose: App functionality. Optional in the sense that the user controls Android backup.
- If the form’s “ephemeral” or “users can choose” wording does not fit backup, still declare the backup rather than answering that no data leaves the device.

**Audio**

- Do **not** declare audio as collected. Microphone samples are transcribed on device by Whisper tiny and are not written to a file or uploaded. That is ephemeral processing for the request the user just started.
- Still declare the microphone permission where Play asks why the app uses it: speaking practice and the optional Speak button on Translate.

**Device or other IDs**

- Do not declare. The app does not read the advertising ID (`AD_ID` is removed from the merged manifest). It does not use a Firebase or analytics installation ID.
- MyMemory sees the connection IP as part of HTTPS. The app does not use that IP. Play’s guidance does not require disclosing an IP that is only part of ordinary network traffic and is not used for tracking.

**Not collected, not shared**

- Name, email address, user IDs, address, phone, photos, videos, files, calendar, contacts, location, web browsing history, SMS, crash logs, diagnostics, financial info, health info.
- The feedback address `dsarangi7@gmail.com` is a `mailto:` link. A message exists only if the user sends mail with their own email app.
- Copy uses the clipboard only when the user taps Copy. That is not collection.

**Ads and tracking**

- No ads. Advertising ID declaration: **No**, the app does not use the advertising ID.
- No data is sold. No data is used for tracking across apps.

## Permissions declaration

| Permission in the merged manifest | Play answer |
| --- | --- |
| `INTERNET` | Translate, and (on the website) loading this site’s own model files. |
| `RECORD_AUDIO` | User-initiated speech practice. Microphone hardware is `required=false`. |
| `MODIFY_AUDIO_SETTINGS` | Playback versus recording for Hear it and Say it. Not call recording. |
| `POST_NOTIFICATIONS` | Optional practice reminder. Runtime prompt on Android 13+. |
| `SCHEDULE_EXACT_ALARM` | The reminder the user set should fire at that minute. User grants Alarms & reminders. Justification you can paste: “The user can turn on a daily practice reminder and a Monday streak summary at a clock time they choose. The app uses SCHEDULE_EXACT_ALARM so that notification is not delayed by Doze. The switch stays off until notifications and exact alarms are allowed. USE_EXACT_ALARM is not declared.” |
| `USE_EXACT_ALARM` | **Not declared.** Play allows this auto-granted permission only for alarm-clock and calendar apps. A `tools:node="remove"` entry keeps a library from merging it back in. |
| `RECEIVE_BOOT_COMPLETED` | Reschedule a reminder the user already enabled, after reboot. |
| `WAKE_LOCK` | Deliver that local notification while idle. From the notifications plugin. |
| `VIBRATE` | Reminder channel may vibrate. |
| `AD_ID` | Removed. |

There is no photo, video, SMS, or call-log permission, so those declaration forms should be “No” / not applicable.

`google-services.json` is not in the repo and must not be added for this upload. The app does not use Firebase Cloud Messaging.

## Content rating

Complete the IARC questionnaire from the app as it is. Recommended answers:

- Category: reference, education, or the utility/education path the form offers. Not a game.
- Violence, sexual content, language (profanity), controlled substances, gambling: none in the shipped packs (office, shopping, taxi, class phrases).
- Users cannot communicate with other users. No public profile, no sharing of location, no digital purchases.
- The WebView loads this app. It is not a general browser.
- Ads: no.
- Do not opt into Designed for Families unless you intend to. Recommended target age: **18 and older**, or 13 and older if you want teenagers included. Do not tick under 13 unless you are ready for the Families policy. The app is not directed at young children.
- Expected rating if those answers hold: Everyone / PEGI 3 / USK 0. Confirm whatever IARC returns. Do not override it.

News app: no. Government app: no. Financial features: no. Health: no.

## App access

All functions are available without a login. No demo account. No special access code. Say it needs a microphone the reviewer can allow. Translate needs a network.

## Closed testing

A personal Play Console account created after 13 November 2023 must run a closed test with at least **12 testers opted in continuously for 14 days** before you can apply for production access. Do not apply for production in this pass.

Suggested setup when you are ready:

1. Testing → Closed testing → create a track (for example Alpha).
2. Create a release and upload the **signed** AAB. Release name `1.0.5 (6)`.
3. Add a tester list or a Google Group you control. Testers must opt in from the link and install from Play, not only sideload the old APK.
4. Roll out the closed release. Leave it running until 12 testers have stayed opted in for 14 days.
5. Only then use “Apply for production”.

This draft does not create the track or add testers.

## Merchant profile

A merchant profile is still required before the app can charge money (a price, or in-app products). Do not create one now. This app has no billing library and no products. Publish it as free. You can add a merchant profile later if you decide to charge.

## Build the AAB

From the repo root, with Node 22, JDK 21, and Android SDK platform 36:

```bash
npm ci
npm run android:bundle
```

`npm run android:bundle` builds the web app with `CAPACITOR=1`, syncs it, and runs `./gradlew bundleRelease`.

Without `ECHO_KEYSTORE_PASSWORD` and `ECHO_KEY_PASSWORD` (and without `android/keystore/keystore.properties`), the bundle is **unsigned**:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

Check:

```bash
jarsigner -verify android/app/build/outputs/bundle/release/app-release.aab
```

Unsigned prints that the jar is unsigned. Play will reject it. Sign with the existing keystore (alias `echo`, certificate SHA-256 `9E:AA:B4:7F:55:B6:83:5B:92:68:14:FF:3D:F2:3A:D0:ED:85:3C:34:10:EB:FD:1C:3F:CD:D1:31:1D:64:C4:AF`). Do not generate a new key.

On the machine that has the keystore:

```bash
export ECHO_KEYSTORE_FILE=keystore/echo-release.keystore
export ECHO_KEYSTORE_PASSWORD='(store password, not stored in git)'
export ECHO_KEY_ALIAS=echo
export ECHO_KEY_PASSWORD='(same password for this PKCS12 keystore)'
npm run android:bundle
```

Or sign the unsigned file in place:

```bash
jarsigner -sigalg SHA256withRSA -digestalg SHA-256 \
  -keystore /path/to/echo-release.keystore \
  android/app/build/outputs/bundle/release/app-release.aab echo
```

Confirm `applicationId` after a build:

```bash
./android/gradlew -p android :app:properties | grep -E 'applicationId|versionCode|versionName'
```

The Gradle file sets `applicationId "com.ayk.echo"`, `versionCode 6`, `versionName "1.0.5"`.

More signing notes: [android.md](android.md).

## Upload steps

Do these in Play Console yourself. This repository change does not call the Play API.

1. Open https://play.google.com/console and select the verified account (Physicist_who_develops).
2. **Create app**. Name: `课猫 Echo`. Default language: English (United States). App. Free. Accept the declarations. Do not set a price.
3. Dashboard → **Set privacy policy**. Enter https://dsarangi7.github.io/Echo/privacy/ after that URL returns the policy. Also set the store contact email to dsarangi7@gmail.com if it is not already.
4. **App access**: all functionality is available without special access.
5. **Ads**: No.
6. **Content rating**: start the questionnaire and use the notes in this file. Save the email certificate Play gives you.
7. **Target audience**: 18 and older, unless you choose otherwise. Not Designed for Families.
8. **News**: No. **COVID-19 contact tracing** if still shown: No. **Data safety**: enter the answers in this file. Delete data URL: https://dsarangi7.github.io/Echo/delete-data/ . **Government**: No. **Financial features**: No. **Health**: No if asked.
9. **Advertising ID**: No.
10. **Store settings**: App, Education, email dsarangi7@gmail.com. Website https://dsarangi7.github.io/Echo/ .
11. **Main store listing**: paste the name, short description, and full description. Upload `public/icons/icon-512.png`, `docs/play-store/feature-graphic-1024x500.png`, and the six phone screenshots. Add the zh-CN listing if you want it.
12. **App signing**: enroll in Play App Signing. New apps must. Prefer uploading the **existing** `echo` key so Play’s app signing certificate stays `9E:AA:B4:7F:…` and sideload installs can update later. Letting Google generate a new app signing key means everyone who installed the sideload APK must uninstall before they can install from Play. Do not create a second keystore for this.
13. **Closed testing** → Create track → Create release → Upload the **signed** AAB. Release name `1.0.5 (6)`. Add release notes if you want. Save. Review the release. Start rollout to the closed track only.
14. Invite testers. For a personal account created after 13 November 2023, keep at least 12 testers opted in for 14 continuous days before you apply for production.
15. Do not open Production and do not submit the app for production review in this pass.
16. Do not create a merchant profile.

After upload, Play Console → the release → App bundle explorer should show package `com.ayk.echo`, version code 6, version name 1.0.5.

## Questions for the owner

1. Bump `versionCode` above 6 before the signed upload if sideload 1.0.5 users should receive the word-deck and class-set work that landed after tag `android-1.0.5`. This draft does not bump it.
2. On the Play App Signing screen, upload the existing key as the app signing key, or accept a Google-generated key and lose in-place updates from the sideload APK?
3. Target age: 18+ as written, or include younger learners?
4. Default store language: English, or 中文?
5. Confirm the privacy URL and https://dsarangi7.github.io/Echo/delete-data/ both load after merge before you paste them into Play.
