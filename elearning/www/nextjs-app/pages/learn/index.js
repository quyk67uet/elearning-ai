import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import TopicsList from "@/components/learn/TopicsList";
import { useTopics } from "@/hooks/useTopics";

export default function Learn() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [user, setUser] = useState(null);
  
  // Use the topics hook
  const { topics, loading, error } = useTopics();

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
    <DashboardLayout user={user}>
      <div className="p-4 md:p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">Learn</h1>
          <p className="text-sm md:text-base text-gray-600">
            Select a topic to start learning with flashcards.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-40 md:h-64">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 p-4 rounded-lg text-sm md:text-base text-red-600">{error}</div>
        ) : (
          <TopicsList topics={topics} />
        )}
      </div>
    </DashboardLayout>
  );
}
