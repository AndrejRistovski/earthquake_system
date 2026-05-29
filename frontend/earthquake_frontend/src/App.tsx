import { Route, Routes } from 'react-router';
import { ErrorBoundary } from 'react-error-boundary';
import { Layout } from './ui/components/layout/Layout/Layout.tsx';
import { DashboardPage } from './ui/pages/dashboard/DashboardPage/DashboardPage.tsx';
import { RootErrorFallback } from './ui/components/common/RootErrorFallback/RootErrorFallback.tsx';

function App() {
    return (
        <ErrorBoundary FallbackComponent={RootErrorFallback}>
            <Routes>
                <Route path="/" element={<Layout />}>
                    <Route index element={<DashboardPage />} />
                </Route>
            </Routes>
        </ErrorBoundary>
    );
}

export default App;
