import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { Search, Filter, ChevronDown } from 'lucide-react';

// Import các components
import AttendanceChart from '@/components/report/AttendanceChart';
import Statistics from '@/components/report/Statistics';
import AssignmentTable from '@/components/report/AssignmentTable';

export default function Report() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const loggedInUser = localStorage.getItem("user");
    let userData = null;

    if (loggedInUser) {
      try {
        userData = JSON.parse(loggedInUser);
        setUser(userData);
      } catch (error) {
        console.error("Error parsing user data from localStorage:", error);
      }
    }

    if (status === "authenticated" && session?.user) {
      const sessionUser = {
        userId: session.user.userId || session.user.id || session.user.email,
        name: session.user.name,
        email: session.user.email,
        avatar: session.user.avatar || session.user.image,
        roles: session.user.roles || ["Student"],
      };

      localStorage.setItem("user", JSON.stringify(sessionUser));
      setUser(sessionUser);
    }

    if (!userData && status !== "loading" && status !== "authenticated") {
      router.push("/login");
    }
  }, [router, session, status]);

  if (status === "loading" || (!user && status === "authenticated")) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse flex space-x-2">
          <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
          <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
          <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
        </div>
      </div>
    );
  }

  if (!user && status !== "authenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 overflow-auto">
      {/* Report Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 md:mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">Report</h1>
        <button className="flex items-center gap-1 text-sm text-gray-600 bg-white px-3 py-1.5 rounded-lg border shadow-sm hover:bg-gray-50 transition-colors">
          Share
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z"></path>
          </svg>
        </button>
      </div>

      {/* Learning Time Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
        {/* Learning Time Chart - Takes 2/3 of width on large screens */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-100 p-4 md:p-6">
          <div className="h-full min-h-[300px]">
            <AttendanceChart year={currentYear} />
          </div>
        </div>

        {/* Learning Statistics - Takes 1/3 of width on large screens */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 md:p-6">
          <div className="h-full">
            <Statistics />
          </div>
        </div>
      </div>

      {/* Assignments and Exams Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 md:p-6 mb-6">
        <AssignmentTable />
      </div>
    </div>
  );
}