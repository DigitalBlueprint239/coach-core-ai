# Coach Core Design System

A comprehensive design system for the Coach Core AI-powered coaching platform, built with Chakra UI and Storybook.

## 🎨 Theme

The design system uses a custom Chakra UI theme with:

### Colors
- **Brand Colors**: Blue-based primary palette (#0084ff)
- **Sports Colors**: Field green, court orange, track gold
- **Semantic Colors**: Success green, warning orange, error red

### Typography
- **Font Family**: Inter (system fallback)
- **Font Weights**: 400 (normal), 500 (medium), 600 (semibold), 700 (bold)
- **Font Sizes**: xs, sm, md, lg, xl, 2xl, 3xl, 4xl, 5xl, 6xl

### Spacing
- Consistent spacing scale from 0.125rem to 24rem
- Responsive breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)

## 🧩 Core Components

### Button
Reusable button component with multiple variants and states.

```jsx
import { Button } from './components/ui';

<Button variant="solid" size="md" onClick={handleClick}>
  Click Me
</Button>
```

**Variants**: `solid`, `outline`, `ghost`
**Sizes**: `sm`, `md`, `lg`
**States**: `isLoading`, `isDisabled`

### Card
Flexible card component for content containers.

```jsx
import { Card } from './components/ui';

<Card shadow="lg" padding={6}>
  <h2>Card Title</h2>
  <p>Card content goes here</p>
</Card>
```

### Input
Form input with built-in validation and accessibility.

```jsx
import { Input } from './components/ui';

<Input 
  label="Email"
  placeholder="Enter your email"
  isRequired
  error={errors.email}
/>
```

### Modal
Accessible modal dialog component.

```jsx
import { Modal } from './components/ui';

<Modal isOpen={isOpen} onClose={onClose} title="Confirmation">
  <p>Are you sure you want to proceed?</p>
</Modal>
```

## 🏃‍♂️ Sports-Specific Components

### CoachCard
Displays coach information with profile, ratings, and contact options.

```jsx
import { CoachCard } from './components/ui';

<CoachCard 
  coach={{
    name: 'Sarah Johnson',
    sport: 'Soccer',
    experience: 8,
    rating: 4.8,
    isOnline: true,
    specialties: ['Youth Development', 'Tactics']
  }}
  onViewProfile={handleViewProfile}
  onContact={handleContact}
/>
```

### ProgressCard
Shows progress towards goals with visual indicators.

```jsx
import { ProgressCard } from './components/ui';

<ProgressCard 
  title="Practice Sessions"
  currentValue={15}
  maxValue={20}
  unit=" sessions"
  progressColor="blue"
  badgeText="On Track"
  description="Complete 5 more sessions to reach your monthly goal"
/>
```

## 🎯 Usage Guidelines

### Accessibility
- All components include proper ARIA labels and keyboard navigation
- Color contrast meets WCAG 2.1 AA standards
- Screen reader friendly with semantic HTML

### Responsive Design
- Mobile-first approach
- Components adapt to different screen sizes
- Touch-friendly interactions on mobile devices

### Consistency
- Use theme tokens for colors, spacing, and typography
- Maintain consistent component APIs
- Follow established patterns for similar functionality

## 🚀 Getting Started

### Installation
```bash
npm install
```

### Running Storybook
```bash
npm run storybook
```

### Using Components
```jsx
import { Button, Card, Input } from './components/ui';

function MyComponent() {
  return (
    <Card>
      <Input label="Name" placeholder="Enter your name" />
      <Button variant="solid">Submit</Button>
    </Card>
  );
}
```

### Theme Customization
```jsx
import { extendTheme } from '@chakra-ui/react';
import baseTheme from './theme';

const customTheme = extendTheme({
  ...baseTheme,
  colors: {
    ...baseTheme.colors,
    custom: {
      500: '#your-color'
    }
  }
});
```

## 📚 Storybook

The design system includes comprehensive Storybook documentation:

- **Component Stories**: Interactive examples of all components
- **Accessibility Testing**: Built-in a11y addon for testing
- **Visual Testing**: Component variations and states
- **Documentation**: Usage guidelines and best practices

### Running Stories
```bash
npm run storybook
```

Visit `http://localhost:6006` to view the component library.

## 🎨 Design Tokens

### Color Palette
```css
/* Brand Colors */
--brand-50: #e6f7ff
--brand-500: #0084ff
--brand-900: #000a33

/* Sports Colors */
--sports-field: #2d5016
--sports-court: #ff6b35
--sports-track: #ffd700

/* Semantic Colors */
--success-500: #22c55e
--warning-500: #f59e0b
--error-500: #ef4444
```

### Spacing Scale
```css
--space-1: 0.25rem
--space-2: 0.5rem
--space-4: 1rem
--space-6: 1.5rem
--space-8: 2rem
--space-12: 3rem
```

### Typography Scale
```css
--font-size-xs: 0.75rem
--font-size-sm: 0.875rem
--font-size-md: 1rem
--font-size-lg: 1.125rem
--font-size-xl: 1.25rem
```

## 🔧 Development

### Adding New Components
1. Create component file in `src/components/ui/`
2. Add Storybook stories in `src/components/ui/[Component].stories.js`
3. Export from `src/components/ui/index.js`
4. Update this documentation

### Theme Updates
1. Modify `src/theme/index.js`
2. Test changes in Storybook
3. Update component stories if needed
4. Document changes in this file

## 📱 Mobile Considerations

- Touch targets minimum 44px
- Adequate spacing between interactive elements
- Responsive typography scaling
- Optimized for one-handed use

## 🌐 Browser Support

- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

## 📄 License

This design system is part of the Coach Core platform and follows the same licensing terms. 