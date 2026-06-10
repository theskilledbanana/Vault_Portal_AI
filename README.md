# 🐻 Bear's AI

An **epic, smart, and funny** AI companion built with **React**, **Vite**, **Express**, and **Tailwind CSS**. Powered by **Gemini 3.5 Flash**, it features a witty "bear-sized" personality and a cinematic high-contrast theme.

## 🚀 Epic Features

- **User Accounts**: Secure login with Google using Firebase Authentication.
- **Personalization**: Name your own chatbot and save your settings to the cloud.
- **Vibe Selector**: Easily toggle between **Chill**, **Hyped**, and **Grumpy** modes.
- **Pure JavaScript**: Built explicitly with standard JavaScript for maximum compatibility.
- **Quantum Fast**: Uses Gemini 1.5 Flash for near-instant responses.

## Getting Started

### Prerequisites

- Node.js (v18+)
- A Gemini API Key from [Google AI Studio](https://aistudio.google.com/)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables:
   - Create a `.env` file in the root directory.
   - Add your Gemini API key:
     ```env
     GEMINI_API_KEY=your_api_key_here
     ```

### Running the App

To start the development server:
```bash
npm run dev
```

To build for production:
```bash
npm run build
npm start
```

## Technologies Used

- **Frontend**: React 19, Vite, Tailwind CSS, Lucide React, Motion
- **Backend**: Express (Node.js), @google/genai SDK
- **Development**: TypeScript, tsx, esbuild
