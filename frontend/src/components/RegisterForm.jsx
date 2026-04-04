import { useState } from "react";
import { registerUser } from "../service/api";
import { useNavigate, Link } from "react-router-dom";

const RegisterForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "", email: "", fullname: "", password: "",
    confirmPassword: "", avatar: null, bio: "",
    role: "guest", country: "", state: "", city: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    if (e.target.name === "avatar") {
      setFormData({ ...formData, avatar: e.target.files[0] });
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    try {
      setLoading(true);
      const data = new FormData();
      data.append("fullname", formData.fullname);
      data.append("username", formData.username);
      data.append("email", formData.email);
      data.append("password", formData.password);
      data.append("role", formData.role);
      data.append("bio", formData.bio);
      data.append("avatar", formData.avatar);
      data.append("address[country]", formData.country);
      data.append("address[state]", formData.state);
      data.append("address[city]", formData.city);
      await registerUser(data);
      navigate("/login");
    } catch (err) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inp = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-md p-6 sm:p-8">

        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1">Create account</h2>
        <p className="text-sm text-gray-400 mb-5">Fill in the details below to get started</p>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">

          {/* Row 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
              <input type="text" name="fullname" value={formData.fullname} onChange={handleChange} required placeholder="John Doe" className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Username</label>
              <input type="text" name="username" value={formData.username} onChange={handleChange} required placeholder="johndoe" className={inp} />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="john@example.com" className={inp} />
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
              <input type="password" name="password" value={formData.password} onChange={handleChange} required placeholder="••••••••" className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Confirm Password</label>
              <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required placeholder="••••••••" className={inp} />
            </div>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
              <select name="role" value={formData.role} onChange={handleChange} className={inp}>
                <option value="guest">Guest</option>
                <option value="host">Host</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Avatar</label>
              <input type="file" name="avatar" accept="image/*" onChange={handleChange} required className={`${inp} text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-blue-50 file:text-blue-600`} />
            </div>
          </div>

          {/* Row 4 — Location */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Country</label>
              <input type="text" name="country" value={formData.country} onChange={handleChange} required placeholder="Nepal" className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">State</label>
              <input type="text" name="state" value={formData.state} onChange={handleChange} placeholder="Bagmati" className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
              <input type="text" name="city" value={formData.city} onChange={handleChange} placeholder="Kathmandu" className={inp} />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Bio</label>
            <textarea name="bio" value={formData.bio} onChange={handleChange} maxLength={1000} rows={2} placeholder="Tell us about yourself..." className={`${inp} resize-none`} />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors mt-1"
          >
            {loading ? "Creating account..." : "Register"}
          </button>

          <p className="text-center text-xs text-gray-400">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-600 hover:underline font-medium">Sign in</Link>
          </p>

        </form>
      </div>
    </div>
  );
};

export default RegisterForm;