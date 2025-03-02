# Twitch Chat Widget

A customizable React widget to display Twitch chat messages with animations, emotes support, and badges. Perfect for streamers who want to show their chat on stream or create chat overlays.

## Features

- 🎨 Customizable chat appearance (normal and small size)
- 💬 Real-time Twitch chat integration
- 😄 Support for Twitch and 7TV emotes
- 🏅 Display Twitch badges (moderator, subscriber, etc.)
- 🔄 Smooth animations for messages
- 🤖 Bot message filtering
- 🧪 Demo mode for testing
- 📱 Responsive design
- 🎯 Message timeout control

## Installation

1. Clone the repository:
```bash
git clone https://github.com/zhanth/twitch-chat-widget.git
cd twitch-chat-widget
```
2. Install dependencies:
```bash
npm install
```

3. Create a .env file based on .env.example:

```bash
VITE_TWITCH_CHANNEL=your_channel
VITE_TWITCH_CLIENT_ID=your_client_id
VITE_TWITCH_SECRET_ID=your_secret_id
VITE_TWITCH_ACCESS_TOKEN=your_access_token
VITE_TWITCH_REFRESH_TOKEN=your_refresh_token
```

## Usage
### Development

```bash
npm run dev
````

### Production
```bash
npm run build
```

## URL Parameters
The widget can be customized using URL parameters:
- size: Set the widget size (normal or small).
- permanent: Keep messages permanently (true or false).
- mode: Enable demo mode (demo).

Example:

```bash
http://localhost:5173/?size=small&permanent=true&mode=demo
```

## Technologies
- React + Vite
- Tailwind CSS
- Framer Motion
- Twurple (Twitch API)

## Dependencies
### Main Dependencies
- @twurple/api, @twurple/auth, @twurple/chat: Twitch integration
- framer-motion: Animation library
- react, react-dom: React core libraries
- dotenv: Environment variables management
- react-icons: Icon library

### Development Dependencies
- vite: Build tool and development server
- eslint and plugins: Code linting
- tailwindcss, postcss, autoprefixer: Styling tools
- TypeScript definitions for React