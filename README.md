# Coach Core AI

A comprehensive AI-powered coaching platform built with React, TypeScript, and Firebase. Coach Core AI provides intelligent practice planning, team management, and analytics for sports coaches.

## 🚀 Features

### AI-Powered Practice Planning
- **Smart Practice Generator**: AI-driven practice plan creation based on team performance data
- **Drill Library**: Extensive collection of drills with difficulty ratings and skill focus
- **Adaptive Planning**: Plans that adjust based on player progress and team needs

### Team Management
- **Roster Management**: Complete player database with performance tracking
- **Attendance Tracking**: Automated check-in system with analytics
- **Player Profiles**: Individual player statistics and progress monitoring

### Smart Playbook
- **Interactive Play Designer**: Visual play creation with drag-and-drop interface
- **Formation Templates**: Pre-built formations for various sports
- **Route Editor**: Custom route creation and editing tools
- **Play Library**: Organized collection of plays with search and filtering

### Analytics Dashboard
- **Performance Metrics**: Real-time team and individual performance tracking
- **Progress Analytics**: Visual charts and graphs for data analysis
- **AI Insights**: Intelligent recommendations based on performance data

### AI Assistant
- **Natural Language Interface**: Chat with AI for coaching advice and insights
- **Practice Suggestions**: AI-generated recommendations for drills and exercises
- **Performance Analysis**: Automated analysis of team and player data

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Firebase (Firestore, Authentication, Functions)
- **AI/ML**: OpenAI GPT-4, Custom AI models
- **Deployment**: Firebase Hosting, Vercel
- **State Management**: React Context, Custom hooks
- **UI Components**: Custom component library with Storybook

## 📁 Project Structure

```
src/
├── ai-brain/           # AI core functionality
├── components/         # Reusable UI components
├── contexts/          # React contexts
├── features/          # Feature-specific components
├── hooks/             # Custom React hooks
├── services/          # API and external services
├── types/             # TypeScript type definitions
└── utils/             # Utility functions
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Firebase account
- OpenAI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/coach-core-ai.git
   cd coach-core-ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.production.example .env.local
   ```
   
   Edit `.env.local` with your configuration:
   ```env
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_OPENAI_API_KEY=your_openai_api_key
   ```

4. **Set up Firebase**
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init
   ```

5. **Start the development server**
   ```bash
   npm start
   ```

## 🔧 Configuration

### Firebase Setup

1. Create a new Firebase project
2. Enable Authentication, Firestore, and Functions
3. Update `firebase.json` and `firestore.rules` as needed
4. Deploy Firebase configuration:
   ```bash
   firebase deploy
   ```

### AI Configuration

1. Set up OpenAI API key in environment variables
2. Configure AI models in `src/ai-brain/core/AIBrain.ts`
3. Test AI functionality with `npm run test:ai`

## 📦 Available Scripts

- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run tests
- `npm run deploy` - Deploy to Firebase
- `npm run storybook` - Start Storybook
- `npm run test:ai` - Test AI functionality

## 🚀 Deployment

### Firebase Hosting

```bash
npm run build
firebase deploy
```

### Vercel

```bash
npm run build
vercel --prod
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email support@coachcoreai.com or join our Slack channel.

## 🔮 Roadmap

- [ ] Mobile app development
- [ ] Advanced AI analytics
- [ ] Multi-sport support
- [ ] Integration with wearable devices
- [ ] Video analysis features
- [ ] Social features for coaches

## 🙏 Acknowledgments

- OpenAI for GPT-4 integration
- Firebase team for the excellent backend services
- React team for the amazing framework
- All contributors and beta testers

---

**Coach Core AI** - Empowering coaches with intelligent tools for better team performance. 