# Silent Bell - PWA Meditation Timer

A minimalist meditation timer with offline audio support for iOS, Android, and desktop browsers.

## Version 2.2.0

## Features

- **Timer**: Set custom meditation duration with drag or arrow controls
- **Sounds**: Choose from Bell, High Bell, or Chugpi (죽비) sounds
- **Interval Bells**: Optional interval bells during meditation
- **Preparation Countdown**: Configurable countdown before session starts
- **Session Log**: Track and export your meditation sessions
- **Offline Support**: Works without internet connection
- **PWA**: Install as a standalone app on mobile devices

## Installation

### iOS (Safari)
1. Open the app in Safari
2. Tap the Share button
3. Select "Add to Home Screen"
4. The app will appear on your home screen

### Android (Chrome)
1. Open the app in Chrome
2. Tap the menu (three dots)
3. Select "Add to Home Screen"
4. The app will appear on your home screen

## File Structure

```
silent-bell/
├── index.html          # Main HTML file
├── app.js              # Main application entry point
├── style.css           # Stylesheet
├── manifest.json       # PWA manifest
├── sw.js               # Service Worker for offline support
├── NoSleep.min.js      # Screen wake lock library
├── icon-192.png        # App icon (192x192)
├── icon-512.png        # App icon (512x512)
├── sounds/             # Audio files
│   ├── sequence_bell_start.mp3
│   ├── sequence_bell_interval.mp3
│   ├── sequence_bell_end.mp3
│   ├── sequence_bell_high_start.mp3
│   ├── sequence_bell_high_interval.mp3
│   ├── sequence_bell_high_end.mp3
│   ├── sequence_chugpi_start.mp3
│   ├── sequence_chugpi_interval.mp3
│   ├── sequence_chugpi_end.mp3
│   ├── chugpi.mp3
│   ├── temple_bell_standard.mp3
│   ├── temple_bell_high.mp3
│   ├── singing_bowl_edge.mp3
│   └── singing_bowl_edge_high.mp3
└── modules/            # JavaScript modules
    ├── state.js        # Central state management
    ├── storage.js      # LocalStorage wrapper
    ├── i18n.js         # Internationalization
    ├── audio-context.js # Audio context management
    ├── audio.js        # Audio engine (Web Audio + HTML5 Audio)
    ├── silent-loop.js  # Silent audio loop for locked screen
    ├── timer.js        # Timer logic
    ├── wakelock.js     # Screen wake lock
    ├── log.js          # Session logging
    ├── settings.js     # Settings management
    └── debounced-drag.js # Drag handler
```

## Audio System

The app uses a hybrid audio system:

- **iOS & Android**: HTML5 Audio with MP3 files for locked-screen playback
- **Desktop**: Web Audio API for synthesized sounds

## Keyboard Shortcuts

- **Space**: Start/Stop timer
- **Escape**: Stop timer during session

## Browser Compatibility

- iOS Safari 11+
- Android Chrome 60+
- Desktop Chrome, Firefox, Safari, Edge

## Known Limitations

### iOS
- Audio cannot play if the user manually turns off the screen (iOS system restriction)
- Screen must stay on (can dim) for audio to work

### Android
- Some OEM skins may have aggressive battery optimization
- Users may need to disable battery optimization for the app in system settings

## Development

### Debug Console

Open browser console to see debug logs:
- `[App]` - Main application logs
- `[Audio]` - Audio system logs
- `[Timer]` - Timer logs
- `[WakeLock]` - Wake lock logs
- `[SilentLoop]` - Silent loop logs

### Debug Object

```javascript
window.SilentBell = {
  getWakeLockInfo(),
  isTimerRunning(),
  saveToStorage(),
  loadFromStorage(),
  getAudioMode(),
  preloadSoundSet(type)
}
```

## License

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

## Credits

- Uses NoSleep.js for screen wake lock
- Web Audio API for synthesized sounds
- MP3 files for mobile locked-screen playback
