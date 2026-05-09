import { Route, Routes } from 'react-router';
import { Layout } from './ui/components/layout/Layout/Layout';
import { DashboardPage } from './ui/pages/dashboard/DashboardPage/DashboardPage';

function App() {
    return (
        <Routes>
            <Route path="/" element={<Layout />}>
                <Route index element={<DashboardPage />} />
            </Route>
        </Routes>
    );
}

export default App;
