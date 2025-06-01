import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import CredentialsProvider from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "../../../lib/mongodb";
import axios from "axios";

export default NextAuth({
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: process.env.EMAIL_SERVER_PORT,
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          // Use our new JWT-based login endpoint instead of the standard Frappe login
          const loginResponse = await axios.post(
            `${process.env.NEXT_PUBLIC_FRAPPE_URL}/api/method/elearning.api.jwt_auth.jwt_login`,
            {
              email: credentials.email,
              password: credentials.password,
            },
            {
              headers: {
                "Content-Type": "application/json",
              }
            }
          );

          // Check if the response is valid - Frappe wraps response in message object
          const responseData = loginResponse.data?.message || loginResponse.data;
          
          if (!responseData || !responseData.access_token) {
            console.error("JWT Login response missing access_token:", responseData);
            return null;
          }

          // Create user object with JWT token and user information
          const { access_token, user } = responseData;
          
          // Create standardized user object for NextAuth
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            roles: user.roles,
            accessToken: access_token,
            provider: "credentials"
          };
        } catch (error) {
          console.error("JWT Login error:", error.response?.data || error.message);
          return null;
        }
      }
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        try {
          // Social login with Frappe (should be updated to use JWT if needed)
          const response = await axios.post(
            `${
              process.env.NEXT_PUBLIC_FRAPPE_URL || "http://localhost:8000"
            }/api/method/elearning.api.auth.social_login_handler`,
            {
              provider: "google",
              user_id: profile.sub,
              email: profile.email,
              full_name: profile.name,
              picture: profile.picture,
              access_token: account.access_token,
            },
            {
              headers: {
                "Content-Type": "application/json",
              },
            }
          );

          if (response.data && response.data.message) {
            // Store information in the user object
            user.name = profile.name;
            user.email = profile.email;
            user.image = profile.picture;
            user.provider = "google";
            return true;
          }

          return false;
        } catch (error) {
          console.error("Frappe social login error:", error);
          return false;
        }
      }
      return true;
    },
    async session({ session, token, user }) {
      // Pass JWT token and user info to client
      session.accessToken = token.accessToken || null;
      
      // Additional user info
      session.user = {
        ...session.user,
        userId: token.id || token.sub || null,
        name: token.name || session.user.name,
        email: token.email || session.user.email,
        image: token.picture || token.image || session.user.image,
        provider: token.provider || "default",
        roles: token.roles || [],
      };

      return session;
    },
    async jwt({ token, user, account, profile }) {
      // Store JWT token and user info in the NextAuth token
      if (user) {
        token.accessToken = user.accessToken;
        token.id = user.id;
        token.provider = user.provider;
        token.roles = user.roles;
        
        // Store user info
        token.name = user.name;
        token.email = user.email;
        token.image = user.image;
      }

      // Store profile info if available
      if (profile) {
        token.name = profile.name;
        token.email = profile.email;
        token.picture = profile.picture;
      }

      return token;
    },
    async redirect({ url, baseUrl }) {
      // Always redirect to dashboard after successful sign in
      return `${baseUrl}/dashboard`;
    },
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET || "elearning-secret-key",
});
