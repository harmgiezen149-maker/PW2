# Minimalist Launcher

A dumb-phone style Android launcher with an app blocker and screen time
control. Turn your phone into a distraction-free device: a text-only home
screen, blocked apps, daily time limits, blocking schedules, notification
filtering and grayscale themes.

Everything runs on-device. No accounts, no backend, no analytics. The
accessibility service is used only for in-app reminders and blocking; no
personal information from accessibility events is collected or stored.

## Features

- **Minimalist launcher** — text-only favorites list with clock and date,
  app drawer with search. No icons, no dopamine.
- **Hide & rename apps** — long-press any app in the drawer.
- **App blocker** — put distracting apps on a block list; a focus screen
  steps in when you open them.
- **Focus mode** — one toggle to enforce the block list right now.
- **Blocking schedules** — automatically block during chosen windows
  (e.g. Mon–Fri 09:00–17:00; overnight windows supported).
- **Daily time limits** — per-app minutes budget; blocked for the rest of
  the day once reached.
- **Screen time dashboard** — today's usage per app and in total.
- **In-app time reminders** — a gentle notification after N minutes in
  the same app.
- **Notification filter** — mute chosen apps; filtered notifications are
  counted on the stats screen.
- **Themes** — monochrome Light / Dark / OLED-black, plus a large-font
  option and an optional system-wide grayscale toggle.

## Install on your phone

1. Open the repository's **Actions** tab on GitHub and pick the latest
   green **Android APK** run.
2. Download the `minimalist-launcher-debug-apk` artifact, unzip it, and
   copy `app-debug.apk` to your phone (or download it on the phone).
3. Open the APK. Allow "install unknown apps" for your browser/file
   manager when Android asks.
4. Launch **Minimalist Launcher** and walk through the permission
   checklist. Every permission is optional; each one unlocks the feature
   listed next to it.

Updates: install a newer APK straight over the old one — all builds are
signed with the same (throwaway, committed) key, so settings survive.

To go back to your old home screen: Settings › Apps › Default apps ›
Home app, or simply uninstall Minimalist Launcher.

### System-wide grayscale (optional, power users)

The in-app themes are already monochrome. To make the *entire phone*
grayscale, grant one extra permission over USB debugging:

```
adb shell pm grant io.github.minilauncher android.permission.WRITE_SECURE_SETTINGS
```

Then use Settings › System grayscale inside the app.

## How blocking works

The launcher's accessibility service watches window changes. When a
blocked or over-limit app comes to the foreground it jumps back to the
home screen (this launcher *is* the home screen, which makes that
reliable) and shows a full-screen focus page with the reason and today's
usage — optionally with an "Allow 5 more minutes" escape hatch that you
can disable for hard mode.

Screen time is measured with Android's UsageStatsManager; nothing is
persisted, it is recomputed from the system on demand.

## Building

CI (`.github/workflows/android-build.yml`) builds with Gradle 8.14.3 /
JDK 17 on every push that touches `minimalist-launcher/`. Locally:

```
cd minimalist-launcher
gradle testDebugUnitTest assembleDebug   # needs Android SDK 34
```

## On-device test checklist

- Set as default home; press Home from another app → lands on launcher.
- Add favorites, rename one, hide one (recover via Settings › Hidden apps).
- Block an app, enable Focus mode, open it → focus screen appears.
- Create a schedule crossing the current time → app blocks; cross the end
  boundary → unblocks.
- Set a 1-minute limit on an app, use it past the limit → blocked until
  midnight.
- Mute an app's notifications and trigger one → it disappears; count shows
  on the stats screen.
- Reboot → blocker and notification filter still work (services rebind).
