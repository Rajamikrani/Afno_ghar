const Button = ({ children, type = "button", loading }) => {
  return (
    <button
      type={type}
      disabled={loading}
      className="w-full rounded-lg bg-indigo-600 py-2 text-white font-semibold hover:bg-indigo-700 transition disabled:opacity-60"
    >
      {loading ? "Creating account..." : children}
    </button>
  );
};

export default Button;
