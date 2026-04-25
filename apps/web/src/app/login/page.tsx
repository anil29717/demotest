"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle,
  ChevronDown,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api";
import { httpStatusFromError } from "@/lib/nri-ui";

const DEMO_ROLES = [
  { role: "ADMIN", label: "Admin" },
  { role: "BROKER", label: "Broker" },
  { role: "BUYER", label: "Buyer" },
  { role: "SELLER", label: "Seller" },
  { role: "NRI", label: "NRI" },
  { role: "HNI", label: "HNI" },
  { role: "INSTITUTIONAL_BUYER", label: "Inst. buyer" },
  { role: "INSTITUTIONAL_SELLER", label: "Inst. seller" },
] as const;

function normalizePhoneDigits(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 10);
}

function phoneValid(digits: string): boolean {
  return /^[6-9]\d{9}$/.test(digits);
}

export default function LoginPage() {
  const router = useRouter();
  const { setToken, refreshProfile } = useAuth();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendSec, setResendSec] = useState(0);
  const [otpError, setOtpError] = useState(false);
  const [otpMsg, setOtpMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [demoRoleLoading, setDemoRoleLoading] = useState<string | null>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const lastVerifyCode = useRef<string>("");

  const digitsOk = phoneValid(phoneDigits);

  useEffect(() => {
    if (step !== "otp" || resendSec <= 0) return;
    const t = setInterval(() => setResendSec((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(t);
  }, [step, resendSec]);

  useEffect(() => {
    if (step === "otp") {
      requestAnimationFrame(() => otpRefs.current[0]?.focus());
    }
  }, [step]);

  const sendOtp = useCallback(async () => {
    if (!digitsOk) return;
    setSending(true);
    setOtpMsg(null);
    try {
      await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ phone: phoneDigits }),
      });
      setStep("otp");
      setOtp(["", "", "", "", "", ""]);
      setResendSec(60);
      setOtpError(false);
      lastVerifyCode.current = "";
    } catch (e) {
      const st = httpStatusFromError(e);
      if (st != null && st >= 500) toast.error("Something went wrong. Try again shortly.");
      else setOtpMsg("Could not send code. Check the number and try again.");
    } finally {
      setSending(false);
    }
  }, [digitsOk, phoneDigits]);

  const verifyOtp = useCallback(
    async (code: string) => {
      if (code.length !== 6) return;
      setVerifying(true);
      setOtpError(false);
      setOtpMsg(null);
      try {
        const res = await apiFetch<{ accessToken: string }>("/auth/verify-otp", {
          method: "POST",
          body: JSON.stringify({ phone: phoneDigits, otp: code }),
        });
        setToken(res.accessToken);
        await refreshProfile();
        setSuccess(true);
        setTimeout(() => {
          router.replace("/dashboard");
        }, 900);
      } catch {
        lastVerifyCode.current = "";
        setOtpError(true);
        setOtpMsg("Incorrect OTP. Try again.");
      } finally {
        setVerifying(false);
      }
    },
    [phoneDigits, refreshProfile, router, setToken],
  );

  useEffect(() => {
    const code = otp.join("");
    if (code.length === 6 && !verifying && !success && step === "otp") {
      void verifyOtp(code);
    }
  }, [otp, verifying, success, step, verifyOtp]);

  async function demoLoginAs(roleParam: (typeof DEMO_ROLES)[number]["role"]) {
    setOtpMsg(null);
    setDemoRoleLoading(roleParam);
    try {
      const res = await apiFetch<{ accessToken: string }>("/auth/dev-login", {
        method: "POST",
        body: JSON.stringify({ role: roleParam }),
      });
      setToken(res.accessToken);
      await refreshProfile();
      router.replace("/dashboard");
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      if (
        raw.includes("Failed to fetch") ||
        raw.includes("Load failed") ||
        raw.toLowerCase().includes("networkerror")
      ) {
        toast.error("Cannot reach the server. Check your connection and try again.");
        return;
      }
      let forbidden = raw.includes("403") || raw.toLowerCase().includes("forbidden");
      try {
        const j = JSON.parse(raw) as { statusCode?: number };
        if (j.statusCode === 403) forbidden = true;
      } catch {
        /* not JSON */
      }
      if (forbidden) setOtpMsg("Demo access is not available.");
      else setOtpMsg(raw || "Demo sign-in failed.");
    } finally {
      setDemoRoleLoading(null);
    }
  }

  function onOtpChange(i: number, v: string) {
    const d = v.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[i] = d;
    setOtp(next);
    if (d && i < 5) otpRefs.current[i + 1]?.focus();
  }

  function onOtpKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otp[i] && i > 0) {
      otpRefs.current[i - 1]?.focus();
      const next = [...otp];
      next[i - 1] = "";
      setOtp(next);
    }
  }

  function onOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    const next = ["", "", "", "", "", ""];
    for (let k = 0; k < text.length; k++) next[k] = text[k]!;
    setOtp(next);
    otpRefs.current[Math.min(text.length, 5)]?.focus();
  }

  function maskPhone(): string {
    if (phoneDigits.length < 4) return "+91 ··········";
    const last = phoneDigits.slice(-4);
    return `+91 ······${last}`;
  }

  const demo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-4 text-zinc-100">
      <div className="mx-auto max-w-[420px] pt-[calc(50vh-280px)] pb-16">
        <div
          className="rounded-2xl border border-[#1a1a1a] bg-[#111111] p-8 shadow-[0_24px_64px_rgba(0,0,0,0.6)]"
          style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.6)" }}
        >
          <div className="flex flex-col items-center text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#00C49A] text-sm font-bold text-black">
              AR
            </div>
            <p className="mt-3 text-lg font-semibold text-white">AR Buildwel</p>
            <p className="mt-1 text-xs text-[#555555]">Real Estate Transaction OS</p>
          </div>

          <AnimatePresence mode="wait">
            {step === "phone" ? (
              <motion.div
                key="phone"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="mt-6 text-xl font-semibold text-white">Welcome back</h2>
                <p className="mt-1 text-[13px] text-[#888888]">Enter your mobile number to continue</p>

                <div className="mt-6">
                  <label className="mb-1.5 block text-xs text-[#888888]">Mobile number</label>
                  <div className="group flex">
                    <div className="flex h-12 shrink-0 items-center gap-1 rounded-l-lg border border-r-0 border-[#1a1a1a] bg-[#1a1a1a] px-3 text-sm text-[#cccccc] group-focus-within:border-[#00C49A]">
                      <span aria-hidden>🇮🇳</span>
                      <span>+91</span>
                      <ChevronDown className="h-3 w-3 text-[#555555]" aria-hidden />
                    </div>
                    <input
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      pattern="[0-9]*"
                      maxLength={10}
                      placeholder="9876543210"
                      value={phoneDigits}
                      onChange={(e) => setPhoneDigits(normalizePhoneDigits(e.target.value))}
                      className="h-12 min-w-0 flex-1 rounded-r-lg border border-[#1a1a1a] border-l-0 bg-[#0d0d0d] px-4 text-base text-white outline-none transition placeholder:text-[#444444] focus:border-[#00C49A]"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!digitsOk || sending}
                  onClick={() => void sendOtp()}
                  className={`mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold transition ${
                    !digitsOk || sending
                      ? "cursor-not-allowed bg-[#1a1a1a] text-[#444444]"
                      : "bg-[#00C49A] text-black hover:brightness-95"
                  } ${sending ? "bg-[#00A882]" : ""}`}
                >
                  {sending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                      Sending…
                    </>
                  ) : (
                    <>
                      Send OTP
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <p className="mt-5 text-center text-xs text-[#555555]">
                  By continuing, you agree to our{" "}
                  <Link href="/" className="text-[#00C49A] hover:underline">
                    Terms
                  </Link>{" "}
                  &{" "}
                  <Link href="/" className="text-[#00C49A] hover:underline">
                    Privacy Policy
                  </Link>
                </p>

                {otpMsg && step === "phone" ? <p className="mt-3 text-center text-xs text-red-400">{otpMsg}</p> : null}

                {demo ? (
                  <div className="mt-6">
                    <p className="text-center text-[11px] text-[#333333]">— Demo access —</p>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {DEMO_ROLES.map(({ role: r, label }) => (
                        <button
                          key={r}
                          type="button"
                          disabled={demoRoleLoading !== null}
                          onClick={() => void demoLoginAs(r)}
                          className="rounded-lg border border-[#1f1f1f] bg-[#1a1a1a] px-3 py-2 text-xs text-[#888888] transition hover:border-[#00C49A] hover:text-[#00C49A] disabled:opacity-50"
                        >
                          {demoRoleLoading === r ? "…" : label}
                        </button>
                      ))}
                    </div>
                    <p className="mt-3 text-center text-[10px] text-[#333333]">Requires demo sign-in enabled on the server.</p>
                  </div>
                ) : null}
              </motion.div>
            ) : (
              <motion.div
                key="otp"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                {success ? (
                  <div className="mt-8 flex flex-col items-center py-6">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18 }}>
                      <CheckCircle className="h-14 w-14 text-[#00C49A]" />
                    </motion.div>
                    <p className="mt-4 text-sm font-medium text-white">Login successful!</p>
                  </div>
                ) : (
                  <>
                    <h2 className="mt-6 text-xl font-semibold text-white">Check your phone</h2>
                    <p className="mt-1 text-[13px] text-[#888888]">We sent a 6-digit code to</p>
                    <p className="text-[13px] font-medium text-white">{maskPhone()}</p>

                    <motion.div
                      animate={otpError ? { x: [0, -8, 8, -8, 8, 0] } : false}
                      transition={{ duration: 0.45 }}
                      className="mt-6 flex justify-center gap-2"
                    >
                      {otp.map((cell, i) => (
                        <input
                          key={`otp-${i}`}
                          ref={(el) => {
                            otpRefs.current[i] = el;
                          }}
                          inputMode="numeric"
                          maxLength={1}
                          value={cell}
                          onChange={(e) => onOtpChange(i, e.target.value)}
                          onKeyDown={(e) => onOtpKeyDown(i, e)}
                          onPaste={i === 0 ? onOtpPaste : undefined}
                          className={`h-14 w-12 rounded-lg border bg-[#0d0d0d] text-center text-2xl font-semibold text-white outline-none transition ${
                            otpError ? "border-[#FF4444]" : cell ? "border-[#1a1a1a] bg-[#111111]" : "border-[#1a1a1a]"
                          } focus:border-[#00C49A] focus:bg-[#00C49A08]`}
                        />
                      ))}
                    </motion.div>

                    {otpMsg ? <p className="mt-3 text-center text-xs text-red-400">{otpMsg}</p> : null}

                    <button
                      type="button"
                      disabled={verifying || otp.join("").length !== 6}
                      onClick={() => void verifyOtp(otp.join(""))}
                      className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#00C49A] text-sm font-semibold text-black disabled:opacity-60"
                    >
                      {verifying ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Verifying…
                        </>
                      ) : (
                        <>
                          Verify &amp; login
                          <ShieldCheck className="h-4 w-4" />
                        </>
                      )}
                    </button>

                    <p className="mt-4 text-center text-xs text-[#555555]">
                      {resendSec > 0 ? (
                        <span className="text-[#555555]">
                          Resend in 0:{String(resendSec).padStart(2, "0")}
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="text-[#00C49A] hover:underline"
                          onClick={() => {
                            setOtp(["", "", "", "", "", ""]);
                            setOtpError(false);
                            setOtpMsg(null);
                            void sendOtp();
                          }}
                        >
                          Resend OTP
                        </button>
                      )}
                    </p>

                    <button
                      type="button"
                      className="mt-4 w-full text-center text-xs text-[#555555] transition hover:text-[#00C49A]"
                      onClick={() => {
                        setStep("phone");
                        setOtp(["", "", "", "", "", ""]);
                        setOtpError(false);
                        setOtpMsg(null);
                        setResendSec(0);
                      }}
                    >
                      ← Change number
                    </button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
