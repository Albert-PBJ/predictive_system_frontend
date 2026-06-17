import { BrowserRouter as Router, Routes, Route } from "react-router";
import SignIn from "./pages/AuthPages/SignIn";
import ForgotPassword from "./pages/AuthPages/ForgotPassword";
import ResetPassword from "./pages/AuthPages/ResetPassword";
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
import QuotesList from "./pages/Quotes/QuotesList";
import CreateQuote from "./pages/Quotes/CreateQuote";
import CustomersManage from "./pages/Customers/CustomersManage";
import StockControl from "./pages/Inventory/StockControl";
import ProductsCatalog from "./pages/Products/ProductsCatalog";
import PredictionsOverview from "./pages/Predictions/PredictionsOverview";
import DemandForecast from "./pages/Predictions/DemandForecast";
import SalesForecast from "./pages/Predictions/SalesForecast";
import ProfitForecast from "./pages/Predictions/ProfitForecast";
import ExchangeRateForecast from "./pages/Predictions/ExchangeRateForecast";
import ProductPriceForecast from "./pages/Predictions/ProductPriceForecast";
import InventoryForecast from "./pages/Predictions/InventoryForecast";
import QuoteConversionForecast from "./pages/Predictions/QuoteConversionForecast";
import BenchmarkingComparison from "./pages/Benchmarking/BenchmarkingComparison";
import BenchmarkingForecast from "./pages/Benchmarking/BenchmarkingForecast";
import CustomersStats from "./pages/Statistics/CustomersStats";
import ProductsStats from "./pages/Statistics/ProductsStats";
import SalesStats from "./pages/Statistics/SalesStats";
import QuotesStats from "./pages/Statistics/QuotesStats";
import SystemSettings from "./pages/Settings/SystemSettings";
import SystemLogs from "./pages/Audit/SystemLogs";
import {
  CAN_MANAGE_PRODUCTS,
  CAN_REGISTER_SALES,
  CAN_VIEW_ANALYTICS,
  CAN_VIEW_FORECASTS,
  OPERATIONAL_ROLES,
} from "./services/types";

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

                {/* Registrar venta — solo quien puede vender (no inventario) */}
                <Route
                  path="/ventas/registrar"
                  element={
                    <ProtectedRoute roles={CAN_REGISTER_SALES}>
                      <RegisterSale />
                    </ProtectedRoute>
                  }
                />
                {/* Historial de ventas — operativo (el encargado de inventario también lo ve) */}
                <Route
                  path="/ventas/historial"
                  element={
                    <ProtectedRoute roles={OPERATIONAL_ROLES}>
                      <SalesHistory />
                    </ProtectedRoute>
                  }
                />
                {/* Presupuestos — listar/crear/descargar PDF (vendedor o superior) */}
                <Route
                  path="/ventas/presupuestos"
                  element={
                    <ProtectedRoute roles={CAN_REGISTER_SALES}>
                      <QuotesList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/ventas/presupuestos/nuevo"
                  element={
                    <ProtectedRoute roles={CAN_REGISTER_SALES}>
                      <CreateQuote />
                    </ProtectedRoute>
                  }
                />
                {/* Clientes — gestión (alta, edición, activar/desactivar) */}
                <Route
                  path="/ventas/clientes"
                  element={
                    <ProtectedRoute roles={CAN_REGISTER_SALES}>
                      <CustomersManage />
                    </ProtectedRoute>
                  }
                />

                {/* Inventario — operativo (vendedores consultan; inventario/gerente gestionan) */}
                <Route
                  path="/inventario"
                  element={
                    <ProtectedRoute roles={OPERATIONAL_ROLES}>
                      <StockControl />
                    </ProtectedRoute>
                  }
                />

                {/* Productos — gestión del catálogo (Gerente o superior) */}
                <Route
                  path="/productos"
                  element={
                    <ProtectedRoute roles={CAN_MANAGE_PRODUCTS}>
                      <ProductsCatalog />
                    </ProtectedRoute>
                  }
                />

                {/* Módulo predictivo — Gerente o Administrador */}
                <Route
                  path="/predicciones"
                  element={
                    <ProtectedRoute roles={CAN_VIEW_FORECASTS}>
                      <PredictionsOverview />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/predicciones/demanda"
                  element={
                    <ProtectedRoute roles={CAN_VIEW_FORECASTS}>
                      <DemandForecast />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/predicciones/ventas"
                  element={
                    <ProtectedRoute roles={CAN_VIEW_FORECASTS}>
                      <SalesForecast />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/predicciones/utilidad"
                  element={
                    <ProtectedRoute roles={CAN_VIEW_FORECASTS}>
                      <ProfitForecast />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/predicciones/tasa-cambio"
                  element={
                    <ProtectedRoute roles={CAN_VIEW_FORECASTS}>
                      <ExchangeRateForecast />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/predicciones/precios"
                  element={
                    <ProtectedRoute roles={CAN_VIEW_FORECASTS}>
                      <ProductPriceForecast />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/predicciones/inventario"
                  element={
                    <ProtectedRoute roles={CAN_VIEW_FORECASTS}>
                      <InventoryForecast />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/predicciones/presupuestos"
                  element={
                    <ProtectedRoute roles={CAN_VIEW_FORECASTS}>
                      <QuoteConversionForecast />
                    </ProtectedRoute>
                  }
                />

                {/* Benchmarking Competitivo — Gerente o Administrador */}
                <Route
                  path="/benchmarking/comparaciones"
                  element={
                    <ProtectedRoute roles={CAN_VIEW_FORECASTS}>
                      <BenchmarkingComparison />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/benchmarking/predicciones"
                  element={
                    <ProtectedRoute roles={CAN_VIEW_FORECASTS}>
                      <BenchmarkingForecast />
                    </ProtectedRoute>
                  }
                />

                {/* Estadísticas (paneles de situación) — Gerente o Administrador */}
                <Route
                  path="/estadisticas/clientes"
                  element={
                    <ProtectedRoute roles={CAN_VIEW_ANALYTICS}>
                      <CustomersStats />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/estadisticas/productos"
                  element={
                    <ProtectedRoute roles={CAN_VIEW_ANALYTICS}>
                      <ProductsStats />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/estadisticas/ventas"
                  element={
                    <ProtectedRoute roles={CAN_VIEW_ANALYTICS}>
                      <SalesStats />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/estadisticas/presupuestos"
                  element={
                    <ProtectedRoute roles={CAN_VIEW_ANALYTICS}>
                      <QuotesStats />
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

                {/* Configuración del sistema — solo ADMIN */}
                <Route
                  path="/configuracion"
                  element={
                    <ProtectedRoute roles={["ADMIN"]}>
                      <SystemSettings />
                    </ProtectedRoute>
                  }
                />

                {/* Registro de actividad (auditoría) — solo ADMIN */}
                <Route
                  path="/auditoria"
                  element={
                    <ProtectedRoute roles={["ADMIN"]}>
                      <SystemLogs />
                    </ProtectedRoute>
                  }
                />
              </Route>

              {/* Auth Layout — público */}
              <Route path="/signin" element={<SignIn />} />
              <Route path="/recuperar-contrasena" element={<ForgotPassword />} />
              <Route path="/restablecer-contrasena" element={<ResetPassword />} />

              {/* Fallback Route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ScraperProvider>
        </AuthProvider>
      </Router>
    </>
  );
}
