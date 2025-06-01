import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AuthLayout from '../../components/AuthLayout';
import { Eye, EyeOff } from 'react-feather';
import { signIn } from 'next-auth/react';
import { FcGoogle } from 'react-icons/fc';

const Login = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoginLoading(true);
      setError('');
      
      // Sử dụng NextAuth để đăng nhập với credentials
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false
      });
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      if (result.ok) {
        // Điều hướng đến trang dashboard sau khi đăng nhập
        router.push('/dashboard');
      }
      
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      setError('');
      
      // Sử dụng NextAuth để đăng nhập với Google
      const result = await signIn('google', { 
        callbackUrl: '/dashboard',
        redirect: true
      });
      
      // Note: With redirect: true, the following code won't execute
      // since the browser will be redirected by NextAuth
      if (result?.error) {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to connect with Google');
      setGoogleLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    try {
      window.location.href = '/api/auth/apple';
    } catch (err) {
      setError('Failed to connect with Apple');
    }
  };

  return (
    <AuthLayout title="Login">
      <h1 className="text-3xl font-semibold mb-2">Welcome Back</h1>
      <p className="text-gray-600 mb-6">
        Don't have an account? <Link href="/auth/signup" className="text-indigo-600 hover:text-indigo-800">Sign Up</Link>
      </p>
      
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <input
            type="email"
            name="email"
            placeholder="Email"
            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="mb-4 relative">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Password"
            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <button 
            type="button"
            className="absolute right-3 top-3 text-gray-400"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        
        <div className="flex justify-end mb-6">
          <Link href="/auth/forgot-password" className="text-indigo-600 text-sm hover:text-indigo-800">
            Forgot Password
          </Link>
        </div>
        
        <button
          type="submit"
          disabled={loginLoading}
          className="w-full bg-indigo-600 text-white p-3 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 transition-colors"
        >
          {loginLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      
      <div className="my-6 flex items-center justify-center">
        <div className="flex-grow border-t border-gray-200"></div>
        <span className="mx-4 text-gray-500">or</span>
        <div className="flex-grow border-t border-gray-200"></div>
      </div>
      
      <button 
        type="button"
        className="w-full flex items-center justify-center gap-2 p-3 border border-gray-300 rounded-md hover:bg-gray-50 mb-3"
        onClick={handleGoogleLogin}
        disabled={googleLoading}
      >
        <FcGoogle className="text-xl" />
        {googleLoading ? 'Connecting...' : 'Continue with Google'}
      </button>
      
      <button
        type="button"
        onClick={handleAppleLogin}
        className="w-full flex items-center justify-center p-3 border border-gray-300 rounded-md hover:bg-gray-50"
      >
        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701z" />
        </svg>
        Continue with Apple
      </button>
    </AuthLayout>
  );
};

export default Login; 