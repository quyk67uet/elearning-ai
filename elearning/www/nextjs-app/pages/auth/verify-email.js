// Ví dụ: pages/auth/verify-email.js (ĐÃ SỬA ĐỔI)
import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from 'next/link';
import AuthLayout from "../../components/AuthLayout"; // Bạn có thể giữ lại nếu muốn
import Image from "next/image"; // Giữ lại nếu EmailVerifiedLayout dùng
import { parseCookies } from "nookies";
// Component EmailVerifiedLayout có thể giữ nguyên nếu bạn thích giao diện đó
const EmailVerifiedLayout = ({ children }) => { /* ... code layout của bạn ... */ };

const VerifyEmailPage = () => {
  const router = useRouter();
  const [status, setStatus] = useState(""); // 'success', 'error', hoặc 'verifying' (ban đầu)
  const [message, setMessage] = useState("Verifying your email, please wait...");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    // Lấy query parameters từ URL mà Frappe đã redirect đến
    const { status: queryStatus, error: queryError, email: queryEmail } = router.query;

    if (queryStatus === "success") {
      setStatus("success");
      setMessage("Your email has been verified successfully! Redirecting to login...");
      setUserEmail(queryEmail || "");
      // Tự động redirect đến trang đăng nhập sau vài giây
      const timer = setTimeout(() => {
        router.push("/auth/login"); // Hoặc trang đăng nhập của bạn
      }, 3000);
      return () => clearTimeout(timer);
    } else if (queryError) {
      setStatus("error");
      // Hiển thị thông báo lỗi thân thiện hơn dựa trên queryError
      // Ví dụ:
      if (queryError === "invalid_or_used_token") {
        setMessage("The verification link is invalid or has already been used.");
      } else if (queryError === "expired_token") {
        setMessage("The verification link has expired. Please request a new one.");
      } else if (queryError === "user_not_found") {
        setMessage("User not found. Please try signing up again.");
      } else {
        setMessage("An error occurred during email verification. Please try again later.");
      }
    } else if (Object.keys(router.query).length > 0 && !queryStatus && !queryError) {
        // Có query params nhưng không phải status hay error cụ thể, có thể là đang chờ
        // Hoặc nếu bạn muốn trang này cũng xử lý việc gửi lại email nếu người dùng vào trực tiếp
    } else if (Object.keys(router.query).length === 0 && !status) {
        // Người dùng có thể vào trang này mà không có query params, ví dụ từ bookmark
        // Hiển thị thông báo chung hoặc form để gửi lại email
        setMessage("Please check your email for the verification link. If you haven't received it, you can request to resend.");
        // Lấy email từ cookie để điền sẵn cho form resend
        const cookies = parseCookies();
        if (cookies.userEmail) {
          setUserEmail(cookies.userEmail);
        }
    }
  }, [router.query, router, status]); // Thêm status vào dependency array

  const handleResendEmail = async () => {
    // Logic gửi lại email (gọi API route /api/auth/resend-verification của Next.js)
    // API route này của Next.js sẽ gọi API Frappe resend_verification_email_api
    if (!userEmail) {
        setMessage("Please enter your email to resend the verification link.");
        return;
    }
    try {
        // setLoading(true); // Bạn cần thêm state loading nếu muốn
        const response = await fetch("/api/auth/resend-verification", { // API route của Next.js
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: userEmail }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Failed to resend.");
        setMessage("A new verification email has been sent. Please check your inbox (and spam folder).");
    } catch (err) {
        setMessage(err.message || "Error resending email.");
    } finally {
        // setLoading(false);
    }
  };
  
  // Mask email for display
  const maskEmail = (emailAddr) => { /* ... code maskEmail của bạn ... */ };


  if (status === "success") {
    return (
      <EmailVerifiedLayout>
        <div className="text-center">
          <h1 className="text-3xl font-semibold mb-4">Email Verified!</h1>
          <p className="text-green-600 mb-8">{message}</p>
          {userEmail && <p>Email: {maskEmail(userEmail)}</p>}
        </div>
      </EmailVerifiedLayout>
    );
  }

  if (status === "error") {
     return (
      <EmailVerifiedLayout> {/* Hoặc AuthLayout nếu bạn muốn có nút Back to Home */}
        <div className="text-center">
          <h1 className="text-3xl font-semibold mb-4 text-red-600">Verification Failed</h1>
          <p className="text-gray-700 mb-8">{message}</p>
          <Link href="/auth/signup" className="text-indigo-600 hover:text-indigo-800">
            Try signing up again
          </Link>
          {/* Hoặc nút Resend nếu lỗi là token hết hạn */}
        </div>
      </EmailVerifiedLayout>
    );
  }
  
  // Giao diện mặc định khi đang chờ hoặc người dùng vào trực tiếp
  return (
    <AuthLayout title="Verify Your Email"> {/* Hoặc EmailVerifiedLayout nếu không muốn nút back */}
        <h1 className="text-3xl font-semibold mb-4">Verify Your Email</h1>
        <p className="text-gray-600 mb-8">{message}</p>
        {userEmail && (
            <div className="mb-4">
                <label htmlFor="emailResend" className="block text-sm font-medium text-gray-700">Your Email</label>
                <input 
                    type="email" 
                    id="emailResend" 
                    value={userEmail} 
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Enter your email"
                />
            </div>
        )}
        <button
            type="button"
            onClick={handleResendEmail}
            // disabled={loading} // Thêm state loading
            className="w-full bg-indigo-600 text-white p-3 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 transition-colors"
        >
            {/* {loading ? "Sending..." : "Resend Verification Email"} */}
            Resend Verification Email
        </button>
    </AuthLayout>
  );
};

export default VerifyEmailPage; // Đổi tên component cho rõ ràng