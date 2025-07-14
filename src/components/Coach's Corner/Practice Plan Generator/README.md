# Practice Plan Generator

A comprehensive React-based practice plan generator for the Coach Core AI application, designed to help coaches create, edit, and share practice plans with AI assistance.

## Features

### 🎯 Core Functionality
- **AI-Powered Suggestions**: Describe practice goals and get AI-generated drill recommendations
- **Timeline Grid**: 15-minute interval timeline with drag-and-drop drill scheduling
- **Comprehensive Drill Library**: 29+ pre-built drills across 6 categories
- **Custom Drill Creation**: Add and save your own drills
- **Practice Periods**: Organize practice into structured periods
- **Safety Monitoring**: Automatic alerts for overuse and hydration reminders

### 📱 User Experience
- **Mobile-First Design**: Responsive interface optimized for all devices
- **Tabbed Navigation**: Intuitive organization of features
- **Real-time Feedback**: Instant validation and suggestions
- **Visual Indicators**: Color-coded drills by category and intensity
- **Drag & Drop**: Easy drill scheduling and reordering

### 🔄 Data Management
- **LocalStorage Integration**: Save and load practice plans locally
- **Export Options**: PDF, shareable links, email, SMS, JSON, CSV
- **Feedback System**: Rate drills and leave notes after practice
- **Favorites**: Save frequently used drills

### 🛡️ Safety Features
- **Duration Monitoring**: Alerts for practices exceeding 2 hours
- **Intensity Balancing**: Warnings for too many high-intensity drills
- **Hydration Reminders**: Automatic water break scheduling
- **Warmup Validation**: Ensures proper warmup inclusion

## Components

### Main Components
- **PracticePlanGenerator**: Main container component
- **Timeline**: 15-minute grid with drag-and-drop functionality
- **CopilotInput**: AI-powered practice plan suggestions
- **DrillLibrary**: Filterable drill database with custom drill creation
- **ExportPanel**: Multiple export and sharing options
- **FeedbackPanel**: Drill rating and feedback system

### Supporting Files
- **planUtils.js**: Drill library, templates, and utility functions
- **README.md**: This documentation

## Installation & Setup

### Prerequisites
- React 16.8+ (for hooks)
- Tailwind CSS
- Modern browser with localStorage support

### Basic Usage
```jsx
import PracticePlanGenerator from './PracticePlanGenerator';

function App() {
  return (
    <PracticePlanGenerator
      userRole="coach"
      sportProgram="Football"
      rosterDetails={[
        { name: "John Doe", position: "QB" },
        { name: "Jane Smith", position: "WR" }
      ]}
      practiceSchedule={[
        { date: "2024-01-15", time: "3:00 PM" }
      ]}
    />
  );
}
```

## Drill Categories

### 🏃‍♂️ Warmup (4 drills)
- Dynamic Stretching
- Light Jogging
- Position-Specific Warmup
- Agility Ladder

### 💪 Conditioning (4 drills)
- Suicide Runs
- Hill Sprints
- Interval Training
- Circuit Training

### 🎯 Skills (6 drills)
- Passing Drills
- Catching Practice
- Route Running
- Tackling Technique
- Blocking Drills
- Ball Security

### 👥 Team (6 drills)
- 7-on-7 Scrimmage
- 11-on-11 Scrimmage
- Red Zone Offense
- Two-Minute Drill
- Goal Line Defense
- Situational Football

### ⚡ Special Teams (5 drills)
- Field Goal Practice
- Punt Coverage
- Kickoff Return
- Punt Return
- Onside Kick

### 🧘 Recovery (4 drills)
- Static Stretching
- Ice Bath Rotation
- Light Walk
- Team Meeting

## Templates

### Pre-built Templates
1. **Standard Practice**: 75-minute balanced practice
2. **Short Practice**: 40-minute condensed session
3. **Game Day Prep**: 50-minute pre-game routine
4. **Conditioning Focus**: 60-minute fitness-focused practice

## AI Integration

### Copilot Features
- **Natural Language Input**: Describe practice goals in plain English
- **Context Awareness**: Considers sport program, roster, and schedule
- **Smart Suggestions**: Recommends appropriate drills and durations
- **Quick Prompts**: Pre-built common practice scenarios

### Example AI Prompts
- "Focus on passing and receiving skills"
- "High-intensity conditioning workout"
- "Team defense and tackling practice"
- "Special teams and kicking practice"

## Export Options

### 📄 PDF Export
- Professional formatting
- Complete practice plan details
- Drill descriptions and timing
- Safety reminders included

### 🔗 Shareable Links
- Cloud-based plan sharing
- Real-time collaboration
- Access control options
- Mobile-friendly viewing

### 📧 Email Sharing
- Custom message support
- Professional formatting
- Direct delivery to recipients
- Tracking capabilities

### 📱 SMS Summary
- Condensed practice overview
- Key drill highlights
- Duration and intensity summary
- Quick reference format

### 💾 Data Export
- **JSON**: Complete data structure
- **CSV**: Spreadsheet-compatible format
- **Text**: Plain text version
- **Print**: Browser print functionality

## Safety & Monitoring

### Automatic Alerts
- **Duration Warnings**: Practices over 2 hours
- **Intensity Balance**: Too many high-intensity drills
- **Warmup Validation**: Missing warmup activities
- **Hydration Reminders**: Water break scheduling

### Best Practices
- Include proper warmup and cooldown
- Balance high and low-intensity drills
- Schedule regular water breaks
- Monitor total practice duration

## Customization

### Adding Custom Drills
1. Navigate to Drill Library tab
2. Click "Add Custom Drill"
3. Fill in drill details:
   - Name and description
   - Category and intensity
   - Duration
4. Save to personal library

### Creating Templates
```javascript
const customTemplate = {
  name: "My Custom Template",
  periods: [
    { name: "Custom Warmup", minutes: 15 },
    { name: "Skill Work", minutes: 25 },
    { name: "Team Time", minutes: 20 }
  ]
};
```

## Data Storage

### LocalStorage Structure
```javascript
// Practice Plans
localStorage.setItem("practicePlans", JSON.stringify([
  {
    name: "Plan Name",
    periods: [...],
    drills: [...],
    timestamp: "2024-01-15T10:30:00Z",
    sportProgram: "Football",
    rosterDetails: [...]
  }
]));

// Drill Favorites
localStorage.setItem("drillFavorites", JSON.stringify([1, 5, 12]));

// Custom Drills
localStorage.setItem("customDrills", JSON.stringify([
  {
    id: 1001,
    name: "Custom Drill",
    category: "skills",
    intensity: "moderate",
    duration: 20,
    isCustom: true,
    createdBy: "coach"
  }
]));
```

## Future Enhancements

### Planned Features
- **Voice Summary**: Audio practice plan summaries
- **Emoji Feedback**: Visual drill rating system
- **Athlete View**: Simplified view for players
- **Backend Integration**: Cloud storage and sync
- **Analytics Dashboard**: Practice performance metrics
- **Team Collaboration**: Multi-coach plan sharing

### Technical Improvements
- **Real AI Integration**: Connect to actual AI services
- **Database Storage**: Replace localStorage with proper backend
- **Real-time Sync**: Live collaboration features
- **Mobile App**: Native mobile application
- **API Integration**: Connect with existing coach tools

## Contributing

### Development Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Start development server: `npm start`
4. Run tests: `npm test`

### Code Style
- Use functional components with hooks
- Follow React best practices
- Maintain consistent Tailwind CSS classes
- Add proper TypeScript types (future)

## Support

For questions or issues:
- Check the documentation
- Review the code examples
- Submit an issue on GitHub
- Contact the development team

## License

This project is part of the Coach Core AI application and follows the same licensing terms. 