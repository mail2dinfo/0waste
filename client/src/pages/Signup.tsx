import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useApi } from "../hooks/useApi";
import logo from "../assets/zerowaste-logo.svg";

function Signup() {
  const navigate = useNavigate();
  const api = useApi();
  const { t } = useTranslation("auth");
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setError(null);
    setSuccess(null);
    
    // Normalize phone number (remove non-digits but keep all digits)
    const phoneDigits = form.phone.replace(/\D/g, "");
    if (phoneDigits.length < 5) {
      setError("Please enter a valid phone number.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await api.post("/users", {
        fullName: form.fullName.trim(),
        phoneNumber: phoneDigits,
      });
      setSuccess(t("signup.successMessage"));
      localStorage.setItem("nowasteUserName", form.fullName.trim());
      setTimeout(() => navigate("/login"), 800);
    } catch (err: unknown) {
      console.error("Signup error:", err);
      if (
        typeof err === "object" &&
        err !== null &&
        "response" in err
      ) {
        const axiosError = err as any;
        if (axiosError.response?.data?.message) {
          setError(axiosError.response.data.message);
        } else if (axiosError.response?.status === 409) {
          setError("Phone number is already registered. Please login instead.");
        } else if (axiosError.response?.status === 400) {
          setError(axiosError.response.data?.message || "Please check all fields are filled correctly.");
        } else {
          setError(axiosError.response?.statusText || t("signup.errorMessage"));
        }
      } else {
        setError(t("signup.errorMessage"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-orange-50 px-4 py-8 sm:py-12">
      <div className="w-full max-w-2xl rounded-2xl sm:rounded-3xl border border-orange-100 bg-white p-6 sm:p-8 lg:p-10 shadow-xl shadow-orange-200/50">
        <div className="mb-6 sm:mb-8 space-y-3 text-center">
          <Link to="/" className="inline-flex flex-col items-center gap-2">
            <img src={logo} alt="Zerovaste logo" className="h-10 w-10" />
            <span className="text-xl font-bold">
              <span className="text-brand-600">Zero</span>
              <span className="text-slate-900">vaste</span>
            </span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">
            {t("signup.title")}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {t("signup.subtitle")}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <label className="block space-y-2 text-sm font-medium text-slate-700">
            {t("signup.fullNameLabel")}
            <input
              required
              value={form.fullName}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, fullName: event.target.value }))
              }
              className="w-full rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200"
              placeholder={t("signup.fullNamePlaceholder") || "Enter your full name"}
            />
          </label>
          <label className="block space-y-2 text-sm font-medium text-slate-700">
            {t("signup.phoneLabel") || "Mobile Number"}
            <div className="relative">
              <input
                type="tel"
                inputMode="tel"
                required
                value={form.phone}
                onChange={(event) => {
                  // Allow only digits, spaces, dashes, and parentheses (no country code)
                  const cleaned = event.target.value.replace(/[^\d\s\-\(\)]/g, "");
                  setForm((prev) => ({ ...prev, phone: cleaned }));
                }}
                autoComplete="tel"
                className="w-full rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200"
                placeholder="Enter mobile number (e.g., 9876543210)"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">Enter your mobile number without country code</p>
          </label>
          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-brand-500 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSubmitting ? t("signup.submitting") : t("signup.submit")}
            </button>
          </div>
        </form>
        {success && (
          <p className="mt-4 rounded-md bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-600">
            {success}
          </p>
        )}
        {error && (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
            {error}
          </p>
        )}
        <p className="mt-6 text-center text-xs text-slate-500">
          {t("signup.loginPrompt")}{" "}
          <Link to="/login" className="font-semibold text-brand-600">
            {t("signup.loginLink")}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Signup;

