import { BrowserRouter as Router, Routes, Route } from "react-router";
import SignIn from "./pages/AuthPages/SignIn";
import NotFound from "./pages/OtherPage/NotFound";
import UserProfiles from "./pages/UserProfiles";
import Blank from "./pages/Blank";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";

export default function App() {
  return (
    <>
      <Router>
        <AuthProvider>
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
            </Route>

            {/* Auth Layout */}
            <Route path="/signin" element={<SignIn />} />

            {/* Fallback Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </Router>
    </>
  );
}
