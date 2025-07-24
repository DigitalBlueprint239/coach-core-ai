# Development Environment Setup

## Prerequisites
This project requires internet access for the first-time installation of dependencies.
You will need Node.js (18 or later) and npm. Python 3 is required for some optional tests and scripts.

## Required Dependencies
### Node.js Dependencies
```bash
# Core React scripts (required for testing and building)
npm install react-scripts --save-dev

# Testing libraries
npm install @testing-library/react @testing-library/jest-dom --save-dev

# Install all dependencies
yarn install # or npm install
```

### Python Dependencies (if applicable)
```bash
pip install numpy
# or
pip install -r requirements.txt
```

## Verification
After installing dependencies, verify the setup works:
```bash
npm test -- --watchAll=false
npm run build
```

## Troubleshooting
- **react-scripts not found**: run `npm install react-scripts --save-dev`.
- **Tests fail to run**: ensure all testing libraries are installed.
- **403 Forbidden errors**: check your network connection and npm registry settings.

## Docker Development
A basic Dockerfile is provided for an isolated development environment:
```bash
docker build -t coach-core-ai .
docker run --rm -it -p 3000:3000 coach-core-ai
```

