# GSD — GaganStudioDownloads

GSD is an internet media downloader built with HTML, CSS, JavaScript, Node.js, Express, `yt-dlp`, and FFmpeg. It provides a browser-based interface and a Windows desktop app built with Electron.

## 📱 Supported Platforms

* **Windows:** Run GSD in a web browser or use the Electron desktop application.
* **Android:** Access GSD through Chrome or another supported browser.
* **iPhone / iPad:** Access GSD through Safari or another supported browser.

> **Important:** Android and iPhone do not have standalone native apps included in this repository. Mobile devices can use the browser interface when the GSD backend is running and reachable.

## 🖥️ Windows Setup

### Requirements

* Windows 10 or later
* [Node.js](https://nodejs.org/)
* [yt-dlp](https://github.com/yt-dlp/yt-dlp)
* [FFmpeg](https://ffmpeg.org/)

### Installation

1. Download or clone this repository.

2. Install Node.js.

3. Open the project folder in VS Code or PowerShell.

4. Download the Windows versions of `yt-dlp` and FFmpeg.

5. Place the executables in the following directory:

   ```text
   backend/
   └── binaries/
       ├── yt-dlp.exe
       └── ffmpeg.exe
   ```

6. Open a terminal in the project root directory.

7. Install the project dependencies:

   ```bash
   npm install
   ```

8. Start GSD:

   ```bash
   npm run dev
   ```

9. Open the following address in your browser:

   http://localhost:3000

### Windows Desktop Application

To launch the Electron desktop version after installing the dependencies and required binaries, run:

```bash
npm run desktop
```

To build the Windows installer, run:

```bash
npm run build
```

The generated build output is placed in the `dist` directory.

## 🤖 Android Setup

GSD can be accessed on Android using Chrome or another compatible browser.

### Option 1: Use GSD on the Same Wi-Fi Network

1. Start the GSD backend on your Windows computer using `npm run dev`.

2. Find your computer's local IPv4 address. On Windows, run:

   ```bash
   ipconfig
   ```

3. Look for the IPv4 address of your active Wi-Fi adapter, for example `192.168.1.10`.

4. Connect your Android phone to the same Wi-Fi network.

5. Open Chrome and enter:

   ```text
   http://192.168.1.10:3000
   ```

   Replace the example IP address with your computer's actual local IP address.

6. Paste a supported media URL into GSD and use the available download options.

If the page does not open, check your Windows firewall settings, network connection, and whether the backend is running.

## 🍎 iPhone and iPad Setup

GSD can be accessed through Safari when your computer is running the backend.

### Option 1: Use GSD on the Same Wi-Fi Network

1. Start GSD on your Windows computer:

   ```bash
   npm run dev
   ```

2. Find your computer's local IPv4 address using `ipconfig`.

3. Connect your iPhone or iPad to the same Wi-Fi network.

4. Open Safari.

5. Enter your computer's local address, using port `3000`:

   ```text
   http://192.168.1.10:3000
   ```

6. Replace the example IP address with your computer's actual IP address.

7. Paste a supported media URL and follow the download prompts.

Downloaded files may appear in Safari's download list or the Files app, depending on the file type and iOS settings.

## 🌐 Access GSD From Anywhere

To use GSD without keeping your Windows computer running, the backend must be deployed on a server that supports Node.js and can run the required media-processing tools.

**GitHub Pages alone is not sufficient** because it hosts static files and does not run the GSD Express backend.

A publicly accessible deployment must also use a secure configuration, including HTTPS, appropriate access controls, and protection against unauthorized use.

## ⚠️ Important Notes

* The GSD backend must be running for media information retrieval and downloading to work.
* The mobile instructions above require the computer and mobile device to be on the same Wi-Fi network.
* Do not expose your local backend directly to the public internet without appropriate security protections.
* Media availability depends on the source platform, network access, and the installed versions of `yt-dlp` and FFmpeg.
* Respect copyright, platform terms, and applicable laws. Download only media you own or are authorized to download.

## 📄 License

See the repository's license information for the applicable terms of use.
