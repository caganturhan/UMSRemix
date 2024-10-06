import { Link } from "@remix-run/react";
import { useOptionalUser } from "~/utils/hooks";

export default function Index() {
  const user = useOptionalUser();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <h1 className="text-6xl font-bold mb-8">User Management System</h1>
      {user ? (
        <div className="space-y-4">
          <p className="text-xl">Welcome, {user.name}!</p>
          <Link to="/users" className="text-blue-500 hover:underline">
            View User List
          </Link>
          <br />
          <Link to="/logout" className="text-red-500 hover:underline">
            Logout
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <Link to="/login" className="text-blue-500 hover:underline">
            Login
          </Link>
          <br />
          <Link to="/register" className="text-green-500 hover:underline">
            Register
          </Link>
        </div>
      )}
    </div>
  );
}