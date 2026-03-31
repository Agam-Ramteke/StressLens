# StressLens Mobile App 📱

This is the React Native (Expo) front-end for the StressLens wellness analytics app.

## 🚀 Getting Started

1.  **Install dependencies**:
    ```bash
    npm install
    ```
2.  **Initialize Expo**:
    If this is a new project, you can initialize a blank Expo template:
    ```bash
    npx create-expo-app@latest . --template blank-typescript
    ```
3.  **Run the application**:
    ```bash
    npm run start
    ```

## 🏗 Directory Structure

- `src/components/`: Reusable UI elements (ProgressCircle, PredictionCard, RecommendationBox).
- `src/screens/`: Main application screens (Dashboard, MetricsInput, Profile).
- `src/services/`: API integration with the Python backend.
- `src/theme/`: Shared styling, colors (vibrant wellness palette), and fonts.

## 🛠 Planned Features

- **Daily Metrics Form**: Capture screen time, caffeine intake, sleep hours, etc.
- **SHAP Visualization**: Beautiful charts showing how factors like screen time drive stress/sleep scores.
- **AI Recommendations**: Real-time push notifications or in-app guidance based on XAI insights.
- **Offline Syncing**: Sync wellness data when online.

---
*Created for the StressLens vision.*
