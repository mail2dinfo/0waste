import { useEffect, useState, FormEvent } from "react";
import { useApi } from "../hooks/useApi";
import { QRCodeSVG } from "qrcode.react";

type UpiSettings = {
  upiId: string;
  upiName: string;
  qrCodeImage?: string | null;
};

function AdminUpiSettings() {
  const api = useApi();
  const [settings, setSettings] = useState<UpiSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState<UpiSettings>({
    upiId: "",
    upiName: "",
    qrCodeImage: null,
  });
  const [qrCodeFile, setQrCodeFile] = useState<File | null>(null);
  const [qrCodePreview, setQrCodePreview] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get<UpiSettings>("/admin/settings/upi");
        setSettings(response.data);
        setFormData(response.data);
        if (response.data.qrCodeImage) {
          setQrCodePreview(response.data.qrCodeImage);
        }
      } catch (err) {
        console.error("Failed to fetch UPI settings:", err);
        setError("Failed to load UPI settings. Please refresh.");
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [api]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (PNG, JPG, etc.)");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError("Image size should be less than 2MB");
      return;
    }

    setQrCodeFile(file);
    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setQrCodePreview(base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveQrCode = () => {
    setQrCodeFile(null);
    setQrCodePreview(null);
    setFormData((prev) => ({ ...prev, qrCodeImage: null }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload: UpiSettings & { qrCodeImage?: string | null } = {
        ...formData,
        qrCodeImage: qrCodePreview || formData.qrCodeImage || null,
      };

      const response = await api.put<UpiSettings>("/admin/settings/upi", payload);
      setSettings(response.data);
      setQrCodeFile(null);
      setSuccess("UPI settings updated successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error("Failed to update UPI settings:", err);
      setError(
        err?.response?.data?.message || "Failed to update UPI settings. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-600">Loading UPI settings...</p>
      </div>
    );
  }

  const qrCodeValue = `upi://pay?pa=${formData.upiId}&pn=${encodeURIComponent(formData.upiName)}&am=0&cu=INR&tn=Event Report Payment`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">UPI Payment Settings</h1>
        <p className="mt-2 text-slate-600">
          Manage UPI ID and QR code for payment collection
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-600">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
          {success}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Settings Form */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Update UPI Settings</h2>
          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                UPI ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.upiId}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, upiId: e.target.value }))
                }
                placeholder="zerowaste@upi"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
              <p className="mt-1 text-xs text-slate-500">
                Format: username@bankname (e.g., zerowaste@upi, zerowaste@paytm)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                UPI Display Name
              </label>
              <input
                type="text"
                value={formData.upiName}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, upiName: e.target.value }))
                }
                placeholder="Zerowaste"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
              <p className="mt-1 text-xs text-slate-500">
                Name shown to users when they pay via UPI
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Upload QR Code Image
              </label>
              <div className="mt-2 space-y-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-brand-500 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-600"
                />
                <p className="text-xs text-slate-500">
                  Upload a custom QR code image (PNG, JPG - max 2MB). If not uploaded, a QR code will be auto-generated from the UPI ID.
                </p>
                {qrCodePreview && (
                  <div className="relative">
                    <img
                      src={qrCodePreview}
                      alt="QR Code preview"
                      className="h-48 w-48 rounded-lg border-2 border-slate-200 object-contain"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveQrCode}
                      className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600"
                      aria-label="Remove QR code"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {saving ? "Saving..." : "Update UPI Settings"}
            </button>
          </form>
        </div>

        {/* QR Code Preview */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">QR Code Preview</h2>
          <p className="mt-2 text-sm text-slate-600">
            This QR code will be shown to users for payment
          </p>

          <div className="mt-6 flex flex-col items-center space-y-4">
            {qrCodePreview ? (
              <div className="rounded-xl border-2 border-slate-200 bg-white p-4 shadow-sm">
                <img
                  src={qrCodePreview}
                  alt="Uploaded QR Code"
                  className="h-60 w-60 object-contain"
                />
                <p className="mt-2 text-center text-xs text-slate-500">Uploaded QR Code</p>
              </div>
            ) : (
              <div className="rounded-xl border-2 border-slate-200 bg-white p-4 shadow-sm">
                <QRCodeSVG
                  value={qrCodeValue}
                  size={240}
                  fgColor="#1f2937"
                  bgColor="#ffffff"
                  level="M"
                  includeMargin
                />
                <p className="mt-2 text-center text-xs text-slate-500">Auto-generated QR Code</p>
              </div>
            )}

            <div className="w-full space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
              <p className="text-xs font-medium text-slate-600">UPI ID</p>
              <p className="text-lg font-bold text-brand-600">
                {formData.upiId || "Not set"}
              </p>
              {formData.upiName && (
                <>
                  <p className="text-xs font-medium text-slate-600">Display Name</p>
                  <p className="text-sm font-semibold text-slate-700">
                    {formData.upiName}
                  </p>
                </>
              )}
            </div>

            <p className="text-xs text-slate-500">
              Users can scan this QR code with any UPI app (GPay, PhonePe, Paytm) to make
              payments
            </p>
          </div>
        </div>
      </div>

      {/* Current Settings Info */}
      {settings && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
          <h3 className="text-sm font-semibold text-blue-900">Current Active Settings</h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-blue-700">UPI ID</p>
              <p className="mt-1 text-sm font-semibold text-blue-900">{settings.upiId}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-blue-700">Display Name</p>
              <p className="mt-1 text-sm font-semibold text-blue-900">{settings.upiName}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminUpiSettings;

