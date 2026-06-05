import { BrowserRouter as Router, Routes, Route } from "react-router";
import SignIn from "./pages/AuthPages/SignIn";
import NotFound from "./pages/OtherPage/NotFound";
import UserProfiles from "./pages/UserProfiles";
import Blank from "./pages/Blank";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import { AuthProvider } from "./context/AuthContext";
import { ScraperProvider } from "./context/ScraperContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import ScraperPage from "./pages/ExternalData/ScraperPage";
import RegisterSale from "./pages/Sales/RegisterSale";
import SalesHistory from "./pages/Sales/SalesHistory";
import StockControl from "./pages/Inventory/StockControl";
import { SELLER_AND_ABOVE } from "./services/types";

export default function App() {
  return (
    <>
      <Router>
        <AuthProvider>
          <ScraperProvider>
            <ScrollToTop />
            <Routes>
              {/* Dashboard Layout — requiere sesión iniciada */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index path="/" element={<Home />} />

                {/* Others Page */}
                <Route path="/profile" element={<UserProfiles />} />
                <Route path="/blank" element={<Blank />} />

                {/* Ventas — Vendedor o superior */}
                <Route
                  path="/ventas/registrar"
                  element={
                    <ProtectedRoute roles={SELLER_AND_ABOVE}>
                      <RegisterSale />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/ventas/historial"
                  element={
                    <ProtectedRoute roles={SELLER_AND_ABOVE}>
                      <SalesHistory />
                    </ProtectedRoute>
                  }
                />

                {/* Inventario — Vendedor o superior */}
                <Route
                  path="/inventario"
                  element={
                    <ProtectedRoute roles={SELLER_AND_ABOVE}>
                      <StockControl />
                    </ProtectedRoute>
                  }
                />

                {/* Datos externos (scrapers) — solo ADMIN */}
                <Route
                  path="/datos-externos/instagram"
                  element={
                    <ProtectedRoute roles={["ADMIN"]}>
                      <ScraperPage source="instagram" />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/datos-externos/facebook"
                  element={
                    <ProtectedRoute roles={["ADMIN"]}>
                      <ScraperPage source="facebook" />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/datos-externos/web"
                  element={
                    <ProtectedRoute roles={["ADMIN"]}>
                      <ScraperPage source="website" />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/datos-externos/mercadolibre"
                  element={
                    <ProtectedRoute roles={["ADMIN"]}>
                      <ScraperPage source="mercadolibre" />
                    </ProtectedRoute>
                  }
                />
              </Route>

              {/* Auth Layout */}
              <Route path="/signin" element={<SignIn />} />

              {/* Fallback Route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ScraperProvider>
        </AuthProvider>
      </Router>
    </>
  );
}
