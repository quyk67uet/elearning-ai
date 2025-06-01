import { useRouter } from "next/router";
import { BookOpen } from "lucide-react";

export default function TopicsList({ topics }) {
  const router = useRouter();
  console.log("TopicsList - Received topics:", topics);

  if (!topics || topics.length === 0) {
    return (
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm text-center">
        <p className="text-sm md:text-base text-gray-600">No topics available. Please check back later.</p>
      </div>
    );
  }

  const handleTopicClick = (topicId) => {
    console.log("Navigating to topic:", topicId);
    router.push(`/learn/${topicId}`);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {topics.map((topic) => (
        <div
          key={topic.name}
          className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition duration-200 cursor-pointer"
          onClick={() => handleTopicClick(topic.name)}
        >
          <div className="p-4 md:p-5">
            <div className="flex items-center mb-3">
              <div className="bg-indigo-50 p-2 rounded-lg mr-3">
                <BookOpen className="h-5 w-5 md:h-6 md:w-6 text-indigo-600" />
              </div>
              <h3 className="text-base md:text-lg font-semibold text-gray-800 line-clamp-1">
                {topic.topic_name}
              </h3>
            </div>
            <p className="text-xs md:text-sm text-gray-600 line-clamp-2 mb-3 md:mb-4 min-h-[2.5rem]">
              {topic.description}
            </p>
            <div className="flex justify-between items-center">
              <span className="text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full">
                {`Chapter ${topic.name}`}
              </span>
              <span className="text-indigo-600 text-xs md:text-sm font-medium">
                View Cards →
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 