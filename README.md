# Vibrato
Desktop player: YT Music source, queue, 8-band EQ, waveform/bars visualiser, custom colours.
Writes the current track to `nowplaying.txt` in the app's data folder (handy for OBS).

**Run:** put `yt-dlp.exe` in `bin/`, then `npm install` and `npm start`.
**Build exe:** `npm run dist` (needs `bin/yt-dlp.exe`) -> `dist/`. Or push to GitHub: the Actions workflow builds it for you (Actions tab -> Build exe -> artifact).
