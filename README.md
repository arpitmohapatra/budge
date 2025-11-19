# Budge - Budget & Subscription Tracker PWA

A modern Progressive Web App for tracking your budget and managing subscriptions. Built with React, TypeScript, and Tailwind CSS.

## Features

- **Budget Tracking**: Keep track of your current balance
- **Subscription Management**: Add, edit, and manage all your subscriptions
- **Smart Reminders**: Get in-app alerts for upcoming payments (3 days before)
- **Offline Support**: Works completely offline with IndexedDB storage
- **Responsive Design**: Optimized for iOS, Android, and web
- **Dark Mode**: System-aware dark mode with manual toggle
- **Privacy First**: All data stored locally on your device

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Storage**: IndexedDB (via idb)
- **PWA**: Workbox (via vite-plugin-pwa)
- **Date Management**: date-fns
- **Deployment**: GitHub Pages

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/budge.git
cd budge
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:5173](http://localhost:5173) in your browser

## Building for Production

```bash
npm run build
```

The production build will be created in the `dist` directory.

## Deployment to GitHub Pages

### Automatic Deployment (Recommended)

This project is configured for automatic deployment to GitHub Pages:

1. **Enable GitHub Pages**:
   - Go to your repository Settings
   - Navigate to Pages (in the sidebar)
   - Under "Build and deployment", select "GitHub Actions" as the source

2. **Push to main branch**:
   - Every push to the `main` branch will automatically trigger a deployment
   - The GitHub Action workflow will build and deploy your app

3. **Access your app**:
   - Your app will be available at: `https://YOUR_USERNAME.github.io/budge/`

### Manual Deployment

Alternatively, you can deploy manually:

```bash
npm run deploy
```

## Project Structure

```
budge/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions workflow
├── favicon/                     # PWA icons and manifest
├── src/
│   ├── components/             # React components
│   │   ├── Onboarding.tsx     # First-time setup
│   │   ├── Dashboard.tsx      # Main dashboard view
│   │   ├── SubscriptionList.tsx
│   │   ├── SubscriptionForm.tsx
│   │   ├── Header.tsx         # App header with dark mode
│   │   └── BottomNav.tsx      # Bottom navigation
│   ├── hooks/                  # Custom React hooks
│   │   ├── useProfile.ts      # User profile management
│   │   ├── useSubscriptions.ts # Subscription CRUD
│   │   └── useAlerts.ts       # Reminder system
│   ├── db.ts                   # IndexedDB operations
│   ├── types.ts               # TypeScript types
│   ├── App.tsx                # Main app component
│   ├── main.tsx               # App entry point
│   └── index.css              # Global styles with Tailwind
├── index.html                  # HTML template
├── vite.config.ts             # Vite + PWA configuration
├── tailwind.config.js         # Tailwind configuration
└── package.json

```

## Features in Detail

### Onboarding Flow
- First-time users are prompted to enter their name, preferred currency, and current balance
- All data is stored locally using IndexedDB

### Dashboard
- Current balance display
- Upcoming payment alerts (within 3 days)
- Quick stats (active subscriptions, monthly spend)
- Next 30 days preview

### Subscription Management
- Add/Edit/Delete subscriptions
- Support for daily, weekly, monthly, and yearly billing cycles
- Category organization
- Mark as paid functionality (updates next payment date automatically)

### Reminder System
- Daily check on app open
- In-app alerts for payments due within 3 days
- Color-coded urgency (red: today, yellow: tomorrow, blue: 2-3 days)
- Dismissible alerts

### Dark Mode
- System preference detection
- Manual toggle in header
- Persistent across sessions

## PWA Features

- **Installable**: Add to home screen on iOS and Android
- **Offline**: Works without internet connection
- **Fast**: Optimized loading with service worker caching
- **App-like**: Standalone display mode

### Installing on Devices

**iOS (Safari)**:
1. Tap the Share button
2. Scroll down and tap "Add to Home Screen"
3. Tap "Add"

**Android (Chrome)**:
1. Tap the menu (three dots)
2. Tap "Install app" or "Add to Home screen"

**Desktop (Chrome)**:
1. Click the install icon in the address bar
2. Click "Install"

## Browser Support

- Chrome/Edge 90+
- Safari 15+
- Firefox 90+
- iOS Safari 15+
- Chrome Android 90+

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Privacy

Budge respects your privacy:
- All data is stored locally on your device using IndexedDB
- No data is sent to any server
- No tracking or analytics
- Works completely offline

## Support

If you encounter any issues or have questions, please [open an issue](https://github.com/YOUR_USERNAME/budge/issues) on GitHub.
