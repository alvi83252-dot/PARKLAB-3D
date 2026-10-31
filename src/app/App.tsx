import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { HomeScreen } from '../components/screens/HomeScreen';
import { VehicleSelection } from '../components/screens/VehicleSelection';
import { ChallengeSelection } from '../components/screens/ChallengeSelection';
import { SimulationScreen } from '../components/screens/SimulationScreen';
import { APP_ROUTES } from '../constants/routes';
import './App.css';

export function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path={APP_ROUTES.HOME} element={<HomeScreen />} />
          <Route path={APP_ROUTES.VEHICLES} element={<VehicleSelection />} />
          <Route path={APP_ROUTES.CHALLENGES} element={<ChallengeSelection />} />
          <Route path={APP_ROUTES.SIMULATION} element={<SimulationScreen />} />
          <Route path="*" element={<Navigate to={APP_ROUTES.HOME} replace />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}

export default App;
