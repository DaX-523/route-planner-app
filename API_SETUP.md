# API Key Setup

## Security Notice
The Google API key has been removed from the source code for security reasons.

## Setup Instructions

1. **Copy the environment file:**
   ```bash
   cp env.example .env
   ```

2. **Get your Google API Key:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Create a new project or select an existing one
   - Enable the following APIs:
     - Maps SDK for Android
     - Maps SDK for iOS
     - Places API
     - Geocoding API
   - Create credentials (API Key)
   - Add API key restrictions for security

3. **Update your .env file:**
   ```bash
   EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=your_actual_api_key_here
   GOOGLE_MAPS_API_KEY=your_actual_api_key_here
   ```

4. **Rebuild the app:**
   ```bash
   # For development builds
   npx expo prebuild --clean
   
   # For EAS builds
   eas build --platform all
   ```

## Important Security Notes

- Never commit the `.env` file to version control
- Use different API keys for development/production if possible
- Set up API key restrictions in Google Cloud Console
- Consider using EAS Secrets for production builds

## API Key Restrictions (Recommended)

In Google Cloud Console, restrict your API key:
- **Application restrictions:** Restrict to your app's package name
- **API restrictions:** Only enable the APIs you need
- **Referrer restrictions:** Set appropriate referrer restrictions for web usage
