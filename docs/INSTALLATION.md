# Installation Guide

## Quick Setup (5 minutes)

### 1. Prerequisites Check
```bash
# Check Node.js version (should be 16+)
node --version

# Check if you have npm
npm --version

# Install Expo CLI globally
npm install -g @expo/cli
```

### 2. Project Setup
```bash
# Clone and navigate to project
git clone <your-repository-url>
cd route-planner

# Install dependencies
npm install

# Copy environment template
cp env.example .env
```

### 3. Google API Setup (Required)

1. **Go to [Google Cloud Console](https://console.cloud.google.com/)**

2. **Create or select a project**

3. **Enable APIs** (click "Enable" for each):
   - [Maps SDK for Android](https://console.cloud.google.com/apis/library/maps-android-backend.googleapis.com)
   - [Maps SDK for iOS](https://console.cloud.google.com/apis/library/maps-ios-backend.googleapis.com)  
   - [Places API](https://console.cloud.google.com/apis/library/places-backend.googleapis.com)
   - [Geocoding API](https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com)

4. **Create API Key**:
   - Go to [Credentials](https://console.cloud.google.com/apis/credentials)
   - Click "Create Credentials" → "API Key"
   - Copy the key

5. **Update .env file**:
   ```bash
   EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=your_api_key_here
   GOOGLE_MAPS_API_KEY=your_api_key_here
   ```

### 4. Run the App
```bash
# Start development server
npx expo start

# Then choose your platform:
# - Press 'i' for iOS simulator
# - Press 'a' for Android emulator
# - Scan QR code for physical device (Expo Go app)
```

## Development Builds (Recommended)

For full feature access including native maps:

```bash
# Create development build
npx expo prebuild
npx expo run:android  # or run:ios
```

## Troubleshooting

### Common Issues

**"Google Maps not loading"**
- Check API key is correct
- Verify billing is enabled in Google Cloud
- Ensure Maps SDK is enabled

**"Metro bundler issues"**
```bash
npx expo start --clear
# or
rm -rf node_modules package-lock.json
npm install
```

**"Build errors"**
```bash
npx expo prebuild --clean
```

### Getting Help

- Check the main [README.md](../README.md) for detailed documentation
- Review [API_SETUP.md](../API_SETUP.md) for API configuration help
- Submit issues on GitHub if problems persist

## Next Steps

After successful installation:

1. **Test the app** by adding a few destinations
2. **Try route optimization** with the 2-opt toggle
3. **Check recent trips** functionality
4. **Review the codebase** structure in `/app` and `/lib/utils`

