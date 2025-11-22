import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useApi } from "../hooks/useApi";
import logo from "../assets/zerowaste-logo.svg";

function Login() {
  const navigate = useNavigate();
  const api = useApi();
  const { t } = useTranslation("auth");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setError(null);
    setMessage(null);
    setIsSubmitting(true);
    try {
      const { data } = await api.post("/users/login", {
        phoneNumber: phoneNumber.trim(),
      });
      if (data?.fullName) {
        localStorage.setItem("nowasteUserName", data.fullName);
      }
      if (data?.userId) {
        localStorage.setItem("nowasteUserId", data.userId);
        api.defaults.headers.common["x-user-id"] = data.userId;
      }
      if (data?.role) {
        localStorage.setItem("nowasteUserRole", data.role);
      }
      window.dispatchEvent(new Event("nowaste-auth-changed"));
      setMessage(t("login.successMessage"));
      const redirectPath = data?.role === "admin" ? "/admin" : "/dashboard";
      setTimeout(() => navigate(redirectPath), 800);
    } catch (err) {
      console.error(err);
      setError(t("login.errorMessage"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-orange-50 px-4 py-8 sm:py-12">
      <div className="w-full max-w-md space-y-6 sm:space-y-8 rounded-2xl sm:rounded-3xl border border-orange-100 bg-white p-6 sm:p-8 shadow-xl shadow-orange-200/50">
        <div className="space-y-3 text-center">
          <Link to="/" className="inline-flex flex-col items-center gap-2">
            <img src={logo} alt="Zerovaste logo" className="h-10 w-10" />
            <span className="text-xl font-bold">
              <span className="text-brand-600">Zero</span>
              <span className="text-slate-900">vaste</span>
            </span>
          </Link>
          <h1 className="text-2xl font-semibold text-slate-900">
            {t("login.title")}
          </h1>
          <p className="text-sm text-slate-500">
            {t("login.subtitle")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <label className="block space-y-2 text-sm font-medium text-slate-700">
            {t("login.mobileLabel") || "Mobile Number"}
            <input
              type="tel"
              inputMode="tel"
              required
              value={phoneNumber}
              onChange={(event) => {
                // Allow only digits, spaces, dashes, and parentheses (no country code)
                const cleaned = event.target.value.replace(/[^\d\s\-\(\)]/g, "");
                setPhoneNumber(cleaned);
              }}
              autoComplete="tel"
              className="w-full rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200"
              placeholder={t("login.mobilePlaceholder") || "Enter mobile number"}
            />
            <p className="text-xs text-slate-500 mt-1">Enter your registered mobile number</p>
          </label>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-brand-500 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSubmitting ? t("login.submitting") : t("login.submit")}
          </button>
        </form>

        {message && (
          <p className="rounded-md bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700">
            {message}
          </p>
        )}
        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
            {error}
          </p>
        )}

        <p className="text-center text-xs text-slate-500">
          {t("login.signupPrompt")} {" "}
          <Link to="/signup" className="font-semibold text-brand-600">
            {t("login.signupLink")}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;

