# 🤖 Cline Agent Integration Guide

## 🎯 **Welcome to Coach Core AI!**

You're now part of a collaborative development team working on a production-ready React application. This guide will help you get started efficiently.

## 📊 **Current Project Status**

### **✅ What's Working**
- **Production App**: https://coach-core-ai.web.app (LIVE)
- **Development Server**: http://localhost:3000 (STABLE)
- **Build System**: Vite + TypeScript (OPTIMIZED)
- **Deployment**: Firebase Hosting (ACTIVE)
- **Core Features**: Authentication, Landing Page, Waitlist (FUNCTIONAL)

### **🔧 Tech Stack**
- **Frontend**: React 18 + TypeScript + Vite
- **UI Library**: Chakra UI
- **State Management**: Zustand
- **Backend**: Firebase (Auth, Firestore, Hosting)
- **Testing**: Vitest + React Testing Library
- **Deployment**: Firebase Hosting

## 🚀 **Getting Started**

### **1. Environment Setup**
```bash
# Clone and setup (if not already done)
git clone <repository-url>
cd coach-core-ai
npm install

# Start development server
npm run dev
```

### **2. MCP Configuration**
Set up your MCPs for:
- **Firebase Firestore** - Database operations
- **External APIs** - Third-party integrations
- **File System** - Data exports and imports
- **WebSocket** - Real-time features
- **Email Services** - Notifications

### **3. Branch Strategy**
```bash
# Create your feature branch
git checkout -b feature/your-feature-name

# Work on your features
# Commit frequently with clear messages
git add .
git commit -m "feat: add user dashboard using MCPs"

# Push and create PR
git push origin feature/your-feature-name
```

## 📁 **Project Structure**

```
src/
├── components/           # React components
│   ├── auth/            # Authentication components
│   ├── Landing/         # Landing page components
│   ├── navigation/      # Navigation components
│   └── ui/              # Reusable UI components
├── features/            # Feature-specific code
├── services/            # Business logic and APIs
│   ├── analytics/       # Analytics services
│   ├── firebase/        # Firebase services
│   └── monitoring/      # Error monitoring
├── hooks/               # Custom React hooks
├── utils/               # Utility functions
└── types/               # TypeScript type definitions
```

## 🎯 **Your Focus Areas**

### **Priority 1: User Dashboard**
- Create `src/components/dashboard/`
- Implement real-time data display
- Use MCPs for data fetching
- Responsive design with Chakra UI

### **Priority 2: Advanced Analytics**
- Enhance `src/services/analytics/`
- Real-time metrics dashboard
- User behavior tracking
- Data visualization components

### **Priority 3: Real-time Notifications**
- Create `src/services/notifications/`
- WebSocket integration via MCPs
- Push notifications
- In-app notification system

### **Priority 4: Database Optimization**
- MCP-based Firestore operations
- Data caching strategies
- Offline synchronization
- Query optimization

## 🔧 **Development Guidelines**

### **Code Standards**
- **TypeScript**: Strict mode enabled
- **ESLint**: Follow existing rules
- **Prettier**: Consistent formatting
- **Naming**: camelCase for variables, PascalCase for components

### **Component Patterns**
```typescript
// Use this pattern for new components
import React from 'react';
import { Box, Text } from '@chakra-ui/react';

interface ComponentProps {
  // Define props clearly
}

export const Component: React.FC<ComponentProps> = ({ prop1, prop2 }) => {
  return (
    <Box>
      <Text>{prop1}</Text>
    </Box>
  );
};
```

### **Service Patterns**
```typescript
// Use this pattern for new services
export class ServiceName {
  private mcpClient: MCPClient;

  constructor() {
    this.mcpClient = new MCPClient();
  }

  async methodName(): Promise<ReturnType> {
    try {
      // Use MCPs for operations
      const result = await this.mcpClient.operation();
      return result;
    } catch (error) {
      console.error('Service error:', error);
      throw error;
    }
  }
}
```

## 🧪 **Testing Requirements**

### **Unit Tests**
- Test all new components
- Test service methods
- Test custom hooks
- Aim for >80% coverage

### **Integration Tests**
- Test MCP integrations
- Test Firebase operations
- Test real-time features
- Test error handling

### **Running Tests**
```bash
# Run all tests
npm test

# Run specific test file
npm test src/components/dashboard/UserDashboard.test.tsx

# Run tests in watch mode
npm run test:watch
```

## 📊 **Performance Guidelines**

### **Bundle Size**
- Lazy load dashboard components
- Use dynamic imports for heavy features
- Optimize images and assets
- Monitor bundle size with `npm run build`

### **Runtime Performance**
- Implement proper memoization
- Use React.memo for expensive components
- Optimize re-renders
- Use efficient data fetching patterns

### **Memory Management**
- Clean up subscriptions
- Avoid memory leaks
- Use proper cleanup in useEffect
- Monitor memory usage

## 🔄 **Coordination with Primary Agent**

### **Daily Workflow**
1. **Check DEVELOPMENT_STATUS.md** for updates
2. **Pull latest changes** from main branch
3. **Work on assigned features**
4. **Commit frequently** with clear messages
5. **Update progress** in coordination documents

### **Communication Protocol**
- **Git commits**: Use descriptive messages
- **Branch names**: `feature/description` format
- **PR descriptions**: Detailed change explanations
- **Issue reporting**: Use DEVELOPMENT_STATUS.md

### **Conflict Resolution**
1. **Stop working** on conflicting files
2. **Communicate** via git commit messages
3. **Coordinate** via DEVELOPMENT_STATUS.md
4. **Resolve** conflicts together
5. **Test** before merging

## 🚨 **Emergency Procedures**

### **If Production Issues**
1. **Stop development** immediately
2. **Switch to main branch**
3. **Check production status**
4. **Report to Primary Agent**
5. **Wait for resolution**

### **If Build Failures**
1. **Check TypeScript errors**
2. **Fix linting issues**
3. **Run tests locally**
4. **Commit fixes**
5. **Retry build**

### **If MCP Issues**
1. **Check MCP configuration**
2. **Verify permissions**
3. **Test connectivity**
4. **Report in DEVELOPMENT_STATUS.md**
5. **Request help if needed**

## 📈 **Success Metrics**

### **Functionality**
- ✅ Features work without errors
- ✅ MCPs properly integrated
- ✅ Real-time updates working
- ✅ Mobile responsive design

### **Performance**
- ✅ Dashboard loads in <2 seconds
- ✅ Analytics update in real-time
- ✅ Notifications delivered instantly
- ✅ No memory leaks

### **Code Quality**
- ✅ TypeScript errors: 0
- ✅ ESLint warnings: <10
- ✅ Test coverage: >80%
- ✅ Code review approved

## 🎉 **Getting Started Checklist**

- [ ] Read this guide completely
- [ ] Set up MCP configuration
- [ ] Create feature branch
- [ ] Review existing codebase
- [ ] Start with Priority 1 tasks
- [ ] Update DEVELOPMENT_STATUS.md
- [ ] Begin feature development

## 📞 **Support & Resources**

### **Documentation**
- [React Documentation](https://react.dev/)
- [Chakra UI Documentation](https://chakra-ui.com/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

### **Project Files**
- `DEVELOPMENT_STATUS.md` - Current status and coordination
- `CLINE_TASKS.md` - Your specific tasks
- `package.json` - Dependencies and scripts
- `vite.config.ts` - Build configuration

### **Getting Help**
- Update DEVELOPMENT_STATUS.md with questions
- Use git commit messages for communication
- Create issue branches for debugging
- Coordinate with Primary Agent via git

---

**Welcome to the team! Let's build something amazing together! 🚀**

**Last Updated**: 2025-01-21 by Primary Agent
**Status**: Ready for Cline Agent
