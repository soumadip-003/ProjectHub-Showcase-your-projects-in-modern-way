import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Home from "./pages/Home";
import SubmitProject from "./SubmitProject";

import AdminLogin from "./pages/AdminLogin";
import AdminRoute from "./pages/AdminRoute";
import AdminDashboard from "./pages/AdminDashboard";

import InstitutionSignup from "./pages/InstitutionSignup";
import InstitutionLogin from "./pages/InstitutionLogin";
import InstitutionDashboard from "./pages/InstitutionDashboard";
import StudentAuth from "./pages/StudentAuth";
import StudentDashboard from "./pages/StudentDashboard";
import StudentRoute from "./pages/StudentRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Home */}
        <Route path="/" element={<Home />} />

        {/* Student authentication */}
        <Route path="/student/login" element={<StudentAuth />} />
        <Route
          path="/student/signup"
          element={<StudentAuth mode="register" />}
        />
        <Route element={<StudentRoute />}>
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/submit" element={<SubmitProject />} />
        </Route>

        {/* Admin */}
        <Route path="/admin/login" element={<AdminLogin />} />

        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>

        {/* Institution Signup */}
        <Route
          path="/institute/signup"
          element={<InstitutionSignup />}
        />

        {/* Institution Login */}
        <Route
          path="/institute/login"
          element={<InstitutionLogin />}
        />

        {/* Institution Dashboard */}
        <Route
          path="/institute/dashboard"
          element={<InstitutionDashboard />}
        />

        {/* Unknown URL */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
