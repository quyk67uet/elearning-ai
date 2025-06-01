/**
 * API route for user registration
 *
 * Kết hợp việc đăng ký với Frappe và NextAuth
 */

import axios from "axios";
import { setCookie } from "nookies";
import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { first_name, last_name, age_level, email, password } = req.body;

    // Validate required fields
    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Set redirect URL for after verification
    const redirectTo = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/auth/verify-email?status=success&email=${encodeURIComponent(email)}`;

    // Forward request to Frappe backend
    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_FRAPPE_URL}/api/method/elearning.api.auth.custom_user_signup`,
      {
        first_name,
        last_name,
        age_level,
        email,
        password,
        redirect_to: redirectTo
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    // Frappe wraps responses in a message object
    const result = response.data.message || response.data;

    // Store email in cookies for verification page
    // This allows the verification page to show the email
    setCookie({ res }, "userEmail", email, {
      maxAge: 30 * 60, // 30 minutes
      path: "/",
    });

    // Return success response
    return res.status(200).json({
      success: true,
      message: "Signup successful, please verify your email",
      email: email,
    });
  } catch (error) {
    console.error("Signup error:", error.response?.data || error.message);

    // Handle specific error cases from Frappe
    if (error.response?.data?.message) {
      return res.status(error.response.status || 400).json({
        message: error.response.data.message,
      });
    } else if (error.response?.data?._server_messages) {
      try {
        // Frappe sometimes returns errors in _server_messages as JSON string array
        const serverMessages = JSON.parse(error.response.data._server_messages);
        const errorMessage = JSON.parse(serverMessages[0]).message || "Registration failed";
        return res.status(400).json({ message: errorMessage });
      } catch (e) {
        // If parsing fails, return generic error
      }
    }

    return res
      .status(500)
      .json({ message: "An error occurred during registration" });
  }
}
