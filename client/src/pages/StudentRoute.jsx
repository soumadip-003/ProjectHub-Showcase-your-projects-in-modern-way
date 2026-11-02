import { Navigate, Outlet } from "react-router-dom";

function StudentRoute() {
  const token = localStorage.getItem("studentToken");

  if (!token) {
    return <Navigate to="/student/login" replace />;
  }

  return <Outlet />;
}

export default StudentRoute;
