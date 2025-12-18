import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <Link className="font-bold text-lg text-slate-900" to="/">
          ShiftReady
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/pricing"
            className="px-3 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            Pricing
          </Link>
          {user ? (
            <>
              <Link
                to="/dashboard"
                className="px-3 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Dashboard
              </Link>
              <button
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                onClick={handleLogout}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="px-3 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

