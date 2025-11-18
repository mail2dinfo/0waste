import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useApi } from "../hooks/useApi";

function Signup() {
  const navigate = useNavigate();
  const api = useApi();
  const { t } = useTranslation("auth");
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);
    try {
      await api.post("/users", {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phoneNumber: form.phone.trim(),
        password: form.password,
      });
      setSuccess(t("signup.successMessage"));
      localStorage.setItem("nowasteUserName", form.fullName.trim());
      setTimeout(() => navigate("/login"), 800);
    } catch (err: unknown) {
      console.error(err);
      if (
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        (err as any).response?.data?.message
      ) {
        setError((err as any).response.data.message);
      } else {
        setError(t("signup.errorMessage"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-orange-50 px-4 py-12">
      <div className="w-full max-w-2xl rounded-3xl border border-orange-100 bg-white p-10 shadow-xl shadow-orange-200/50">
        <div className="mb-8 space-y-3 text-center">
          <div className="flex items-center justify-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full bg-brand-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-brand-600 transition hover:bg-brand-500/20"
            >
              {t("signup.homeBadge")}
            </Link>
          </div>
          <h1 className="text-3xl font-semibold text-slate-900">
            {t("signup.title")}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {t("signup.subtitle")}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="grid gap-6 sm:grid-cols-2 sm:gap-8">
          <label className="space-y-2 text-sm font-medium text-slate-700">
            {t("signup.fullNameLabel")}
            <input
              required
              value={form.fullName}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, fullName: event.target.value }))
              }
              className="w-full rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200"
              placeholder={t("signup.fullNamePlaceholder")}
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            {t("signup.emailLabel")}
            <input
              type="email"
              required
              value={form.email}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, email: event.target.value }))
              }
              className="w-full rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200"
              placeholder={t("signup.emailPlaceholder")}
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            {t("signup.phoneLabel")}
            <input
              type="tel"
              required
              value={form.phone}
              onChange={(event) => {
                const digitsOnly = event.target.value.replace(/\D/g, "");
                const trimmed = digitsOnly.length > 10 ? digitsOnly.slice(-10) : digitsOnly;
                setForm((prev) => ({ ...prev, phone: trimmed }));
              }}
              className="w-full rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200"
              placeholder={t("signup.phonePlaceholder")}
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            {t("signup.passwordLabel")}
            <input
              type="password"
              required
              value={form.password}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, password: event.target.value }))
              }
              className="w-full rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200"
              placeholder={t("signup.passwordPlaceholder")}
            />
          </label>
          <div className="sm:col-span-2">
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

