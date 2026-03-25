import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../service/api";

const LoginForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ identifier: "", password: "" });
  const [loading, setLoading]   = useState(false);
  const [error,   setError]     = useState("");
  const [success, setSuccess]   = useState("");

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.identifier || !formData.password) {
      setError("All fields are required.");
      return;
    }

    const payload = { password: formData.password };
    if (formData.identifier.includes("@")) {
      payload.email    = formData.identifier.toLowerCase();
    } else {
      payload.username = formData.identifier.toLowerCase();
    }

    try {
      setLoading(true);
      const res = await loginUser(payload);

      // Backend returns: { statusCode, data: { user, accessToken, refreshToken }, message }
      const { user, accessToken } = res.data.data;

      // ✅ Save to localStorage so ListingDetail (and any other page) can read it
      localStorage.setItem("user",        JSON.stringify(user));
      localStorage.setItem("accessToken", accessToken);

      setSuccess("Login successful!");
      setFormData({ identifier: "", password: "" });

      // Redirect based on role
      if (user.role === "host") navigate("/host-panel");
      else navigate("/");

    } catch (err) {
      setError(
        err.response?.data?.message || "Invalid credentials or server error."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-xl shadow-md border">
      <h2 className="text-2xl font-semibold mb-6 text-center">Login</h2>

      {error   && <p className="text-red-500 mb-4 text-sm">{error}</p>}
      {success && <p className="text-green-500 mb-4 text-sm">{success}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1 font-medium text-sm">Email or Username</label>
          <input
            type="text" name="identifier" value={formData.identifier}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-400 text-sm"
            placeholder="Enter email or username"
          />
        </div>
        <div>
          <label className="block mb-1 font-medium text-sm">Password</label>
          <input
            type="password" name="password" value={formData.password}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-400 text-sm"
            placeholder="Enter password"
          />
        </div>
        <button type="submit" disabled={loading}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded-lg disabled:opacity-60 transition">
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
};

export default LoginForm;